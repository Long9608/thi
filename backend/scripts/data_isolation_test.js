// HTTP tests against configured SQL Server; optional fixtures are ALWAYS rolled back.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { getPool, closePool } = require('../config/db');
const { getAccessScope, apartmentOwnershipSql, contractOwnershipSql } = require('../utils/accessScope');

async function main() {
    const realPool = await getPool();
    let transaction;
    let pool = realPool;
    if (process.argv.includes('--transaction-fixtures')) {
        const db = require('../config/db');
        transaction = new db.sql.Transaction(realPool);
        await transaction.begin();
        pool = { request: () => new db.sql.Request(transaction), query: text => new db.sql.Request(transaction).query(text) };
        db.getPool = async () => pool;
        try {
            await pool.request().query(`
                DECLARE @A int, @B int, @ApartmentA int, @ApartmentB int, @ContractB int;
                SELECT @A=MIN(ResidentID), @B=MAX(ResidentID) FROM Resident WHERE UserID IS NOT NULL AND Status=1;
                SELECT TOP 1 @ApartmentA=ApartmentID FROM Contract WHERE OwnerID=@A AND StatusID IN (2,5);
                SELECT TOP 1 @ApartmentB=a.ApartmentID FROM Apartment a WHERE NOT EXISTS (SELECT 1 FROM Contract c WHERE c.ApartmentID=a.ApartmentID) ORDER BY a.ApartmentID;
                IF @ApartmentA IS NULL OR @ApartmentB IS NULL THROW 50001, 'Missing apartment fixture', 1;
                INSERT INTO Contract(ApartmentID,OwnerID,ContractNumber,SignDate,StartDate,EndDate,Rent,StatusID,PaymentCycleMonths,MonthlyBillingDay)
                VALUES(@ApartmentB,@B,CONCAT('SCOPE-TEST-',NEWID()),GETDATE(),DATEADD(day,-1,GETDATE()),DATEADD(year,1,GETDATE()),100,2,1,10);
                SET @ContractB=SCOPE_IDENTITY();
                INSERT INTO Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus)
                VALUES(@ContractB,MONTH(GETDATE()),YEAR(GETDATE()),GETDATE(),DATEADD(day,10,GETDATE()),100,1,'WAITING_PAYMENT');
                INSERT INTO Feedback(ResidentID,Title,Content,Rating,CreatedDate) VALUES(@A,N'Scope A',N'Transaction test',5,GETDATE()),(@B,N'Scope B',N'Transaction test',5,GETDATE());
                INSERT INTO MaintenanceRequest(ResidentID,ApartmentID,Title,RequestDate,StatusID) VALUES(@A,@ApartmentA,N'Scope A',GETDATE(),1),(@B,@ApartmentB,N'Scope B',GETDATE(),1);
            `);
        } catch (error) { await transaction.rollback(); throw error; }
    }
    const { authMiddleware } = require('../middlewares/auth');
    const fixtures = await pool.request().query(`
        SELECT r.ResidentID, u.UserID FROM Resident r JOIN Users u ON u.UserID=r.UserID
        WHERE r.Status=1 AND u.Status=1 AND EXISTS (SELECT 1 FROM UserRole ur JOIN Role role ON role.RoleID=ur.RoleID WHERE ur.UserID=u.UserID AND role.RoleCode='RESIDENT') ORDER BY r.ResidentID;
        SELECT ApartmentID AS ID FROM Apartment;
        SELECT VehicleID AS ID, ResidentID FROM Vehicle;
        SELECT InvoiceID AS ID, ContractID FROM Invoice;
        SELECT FeedbackID AS ID, ResidentID FROM Feedback;
        SELECT RequestID AS ID, ResidentID FROM MaintenanceRequest;
        SELECT ContractID AS ID FROM Contract;
    `);
    const residents = fixtures.recordsets[0];
    assert(residents.length >= 2, 'Need two real linked resident accounts');
    const [a, b] = residents;
    const modules = ['APARTMENT', 'VEHICLE', 'INVOICE', 'FEEDBACK', 'TICKET', 'CONTRACT', 'RESIDENT', 'PARKING', 'NOTIFICATION', 'SERVICE'];
    const ownPermissions = modules.map(m => `${m}_VIEW_OWN`);
    const allPermissions = modules.map(m => `${m}_VIEW_ALL`);
    for (const module of modules) {
        assert.equal(getAccessScope({ user: { RoleCodes: ['RESIDENT'], Permissions: [`${module}_VIEW_ALL`, `${module}_VIEW_OWN`] } }, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` }), 'own');
        assert.equal(getAccessScope({ user: { RoleCodes: ['STAFF'], Permissions: [`${module}_VIEW_ALL`] } }, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` }), 'all');
        assert.equal(getAccessScope({ user: { Permissions: [] } }, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` }), 'none');
    }
    // Only this test server can override permissions; production middleware remains unchanged.
    const app = express(); app.use(express.json());
    app.use('/api', authMiddleware, (req, res, next) => {
        const mode = req.header('X-Test-Principal');
        if (mode) {
            req.user.RoleCodes = mode === 'resident' ? ['RESIDENT'] : [mode.toUpperCase()];
            req.user.Permissions = mode === 'none' ? [] : mode === 'resident' || mode === 'own' ? ownPermissions : allPermissions;
            req.user.Permissions.push(...(mode === 'none' ? [] : ['DASHBOARD_VIEW', 'SERVICE_VIEW']));
            // Routes re-run authMiddleware; override only through its test replacement below.
        }
        req.testPrincipal = mode;
        next();
    });
    const auth = require('../middlewares/auth');
    auth.authMiddleware = (req, res, next) => req.user ? next() : authMiddleware(req, res, next);
    app.use('/api', require('../routes'));
    app.use('/uploads', auth.authMiddleware, require('../middlewares/uploadAccess'));
    app.use(require('../middlewares/errorHandler'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const results = [];
    const call = async (path, expected, mode = 'resident', method = 'GET', body, user = a) => {
        const headers = { Authorization: `Bearer ${jwt.sign({ userId: user.UserID }, process.env.JWT_SECRET, { expiresIn: '5m' })}` };
        if (mode) headers['X-Test-Principal'] = mode;
        if (body) headers['Content-Type'] = 'application/json';
        const response = await fetch(`${base}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
        const data = await response.json();
        results.push({ mode: mode || 'real-jwt', method, path, status: response.status });
        assert([].concat(expected).includes(response.status), `${mode} ${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
        return data;
    };
    try {
        const owned = await pool.request().input('CurrentResidentID', require('../config/db').sql.Int, a.ResidentID).query(`
            SELECT a.ApartmentID AS ID FROM Apartment a WHERE ${apartmentOwnershipSql()};
            SELECT c.ContractID AS ID FROM Contract c WHERE ${contractOwnershipSql()};
        `);
        const apartmentIds = new Set(owned.recordsets[0].map(r => r.ID));
        const contractIds = new Set(owned.recordsets[1].map(r => r.ID));
        const specs = [
            ['apartments', fixtures.recordsets[1], row => apartmentIds.has(row.ID)],
            ['vehicles', fixtures.recordsets[2], row => row.ResidentID === a.ResidentID],
            ['invoices', fixtures.recordsets[3], row => contractIds.has(row.ContractID)],
            ['feedbacks', fixtures.recordsets[4], row => row.ResidentID === a.ResidentID],
            ['tickets', fixtures.recordsets[5], row => row.ResidentID === a.ResidentID],
            ['contracts', fixtures.recordsets[6], row => contractIds.has(row.ID)]
        ];
        for (const [module, rows, owns] of specs) {
            const own = rows.find(owns), other = rows.find(row => !owns(row));
            assert(own && other, `Missing real own/cross fixtures for ${module}`);
            await call(`/${module}/${own.ID}`, 200);
            await call(`/${module}/${other.ID}`, [403, 404]);
            await call(`/${module}/${own.ID}`, 200, 'admin');
            await call(`/${module}/${other.ID}`, 200, 'admin');
            await call(`/${module}/${other.ID}`, 200, 'staff');
            await call(`/${module}/${other.ID}`, 403, 'none');
            await call(`/${module}/${other.ID}`, [403, 404], 'own');
            await call(`/${module}/${own.ID}`, 200, null);
        }
        const paths = ['/apartments', '/apartments/buildings', '/apartments/floors', '/apartments/areas', '/apartments/stats', '/vehicles', '/vehicles/cards', '/vehicles/parking-slots', '/vehicles/history', '/invoices', '/contracts', '/feedbacks', '/tickets', '/residents', '/notifications', '/notifications/unread-count', '/services', '/services/gym/members', '/services/pool/members', '/services/wifi/members', '/utilities/readings', '/utilities/meters', '/dashboard/stats', '/dashboard/activities', '/dashboard/financial'];
        for (const path of paths) {
            await call(path, 200);
            await call(path, 200, 'staff');
            await call(path, 403, 'none');
        }
        // Invalid or unauthorized writes must stop before any database mutation.
        for (const [method, path, body] of [
            ['PUT', `/apartments/${fixtures.recordsets[1][0].ID}`, { area: 99 }],
            ['PUT', '/contracts/1', { ownerId: b.ResidentID }],
            ['POST', '/invoices/payment', { invoiceId: fixtures.recordsets[3][0].ID, amount: 1, methodId: 1 }],
            ['PUT', '/feedbacks/1/reply', { reply: 'test' }],
            ['PUT', '/residents/1/family/2', { fullName: 'test' }],
            ['POST', '/vehicles/1/card', { contractId: 1 }],
            ['PUT', '/services/unregister/1', {}],
            ['POST', '/notifications', { title: 'test', content: 'test', targetScope: 'ALL' }]
        ]) await call(path, 403, 'resident', method, body);
        const allA = await call('/apartments?limit=9999', 200);
        assert.equal(allA.pagination.total, apartmentIds.size, 'Multiple apartments count must match actual ownership SQL');
        for (const row of allA.data) assert(apartmentIds.has(row.ApartmentID));
        const none = await fetch(`${base}/api/apartments`); assert.equal(none.status, 401);
        console.log(JSON.stringify({ passed: results.length + modules.length * 3 + 2, results }, null, 2));
    } finally {
        await new Promise(resolve => server.close(resolve));
        if (transaction) { await transaction.rollback(); console.log('TEST FIXTURES ROLLED BACK'); }
        await closePool();
    }
}
main().catch(async error => { console.error(error); await closePool(); process.exitCode = 1; });
