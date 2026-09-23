const { sql } = require('../config/db');

const getPermissionSet = (req) => {
    const permissions = new Set((req.user?.Permissions || []).map(permission => String(permission).toUpperCase()));
    // SERVICE_VIEW predates scoped permissions. Preserve it only when no explicit scope exists.
    if (permissions.has('SERVICE_VIEW') && !permissions.has('SERVICE_VIEW_ALL') && !permissions.has('SERVICE_VIEW_OWN')) {
        permissions.add(isResidentAccount(req) ? 'SERVICE_VIEW_OWN' : 'SERVICE_VIEW_ALL');
    }
    return permissions;
};

const isResidentAccount = (req) => (req.user?.RoleCodes || []).some(code => String(code).toUpperCase() === 'RESIDENT');

const hasAnyPermission = (req, ...permissionCodes) => {
    if (!req?.user) return false;
    const permissions = getPermissionSet(req);
    return permissionCodes.some((code) => permissions.has(String(code).toUpperCase()));
};

const getAccessScope = (req, { viewAll, viewOwn, legacy = [] } = {}) => {
    const permissions = getPermissionSet(req);
    const viewAllCodes = [viewAll].filter(Boolean).map((code) => String(code).toUpperCase());
    const viewOwnCodes = [viewOwn].filter(Boolean).map((code) => String(code).toUpperCase());

    // A resident identity never becomes a global data reader through an accidental grant.
    if (isResidentAccount(req)) return viewOwnCodes.some(code => permissions.has(code)) ? 'own' : 'none';
    if (viewAllCodes.some((code) => permissions.has(code))) return 'all';
    if (viewOwnCodes.some((code) => permissions.has(code))) return 'own';
    return 'none';
};

async function getCurrentResidentId(pool, userId) {
    const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT ResidentID FROM Resident WHERE UserID = @UserID AND Status = 1');
    return result.recordset.length === 1 ? result.recordset[0].ResidentID : null;
}

// SQL fragments below accept developer-owned aliases only; IDs are always parameters.
const activeContractSql = (alias = 'c') => `${alias}.StatusID IN (2, 5)
    AND CAST(GETDATE() AS date) BETWEEN ${alias}.StartDate AND ${alias}.EndDate`;
const contractOwnershipSql = (alias = 'c', parameter = 'CurrentResidentID') => `(
    ${alias}.OwnerID = @${parameter} OR EXISTS (
        SELECT 1 FROM ContractResident scope_cr
        WHERE scope_cr.ContractID = ${alias}.ContractID AND scope_cr.ResidentID = @${parameter}
          AND (scope_cr.MoveInDate IS NULL OR scope_cr.MoveInDate <= CAST(GETDATE() AS date))
          AND (scope_cr.MoveOutDate IS NULL OR scope_cr.MoveOutDate >= CAST(GETDATE() AS date))
    ))`;
const apartmentOwnershipSql = (column = 'a.ApartmentID', parameter = 'CurrentResidentID') => `EXISTS (
    SELECT 1 FROM Contract scope_c WHERE scope_c.ApartmentID = ${column}
      AND ${activeContractSql('scope_c')} AND ${contractOwnershipSql('scope_c', parameter)}
)`;

async function resolveScope(req, pool, module) {
    const scope = getAccessScope(req, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` });
    if (scope === 'none') throw Object.assign(new Error('Bạn không có quyền truy cập dữ liệu này'), { statusCode: 403 });
    if (scope === 'all') return { scope, residentId: null };
    // Notifications belong to Users, including employees without a Resident record.
    if (module === 'NOTIFICATION') return { scope, residentId: null, userId: req.user.UserID };
    const residentId = await getCurrentResidentId(pool, req.user.UserID);
    if (!residentId && module === 'TICKET' && !isResidentAccount(req)) {
        const employee = await pool.request().input('UserID', sql.Int, req.user.UserID)
            .query('SELECT EmployeeID FROM Employee WHERE UserID=@UserID AND Status=1');
        if (employee.recordset.length === 1) return { scope, residentId: null, employeeId: employee.recordset[0].EmployeeID };
    }
    if (!residentId) throw Object.assign(new Error('Tài khoản chưa liên kết hồ sơ cư dân đang hoạt động.'), { statusCode: 403 });
    return { scope, residentId };
}

function requireScope(module, { allOnly = false } = {}) {
    return async (req, res, next) => {
        try {
            const scope = getAccessScope(req, { viewAll: `${module}_VIEW_ALL`, viewOwn: `${module}_VIEW_OWN` });
            if (scope === 'none' || (allOnly && scope !== 'all')) return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
            if (scope === 'own') await resolveScope(req, await require('../config/db').getPool(), module);
            next();
        } catch (error) { next(error); }
    };
}

async function assertResourceScope(req, pool, module, resource, id) {
    const { scope, residentId } = await resolveScope(req, pool, module);
    if (scope === 'all') return;
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) throw Object.assign(new Error('ID không hợp lệ'), { statusCode: 400 });
    const queries = {
        apartment: `SELECT 1 FROM Apartment a WHERE a.ApartmentID = @ResourceID AND ${apartmentOwnershipSql()}`,
        contract: `SELECT 1 FROM Contract c WHERE c.ContractID = @ResourceID AND ${contractOwnershipSql()}`,
        invoice: `SELECT 1 FROM Invoice i JOIN Contract c ON c.ContractID=i.ContractID WHERE i.InvoiceID=@ResourceID AND ${contractOwnershipSql()}`,
        registration: `SELECT 1 FROM ServiceRegistration sr JOIN Contract c ON c.ContractID=sr.ContractID WHERE sr.RegistrationID=@ResourceID AND ${contractOwnershipSql()}`,
        vehicle: 'SELECT 1 FROM Vehicle WHERE VehicleID=@ResourceID AND ResidentID=@CurrentResidentID',
        card: 'SELECT 1 FROM ParkingCard pc JOIN Vehicle v ON v.VehicleID=pc.VehicleID WHERE pc.CardID=@ResourceID AND v.ResidentID=@CurrentResidentID'
    };
    if (!queries[resource]) throw new Error('Unknown scoped resource');
    const result = await pool.request().input('ResourceID', sql.Int, Number(id))
        .input('CurrentResidentID', sql.Int, residentId).query(queries[resource]);
    if (!result.recordset.length) throw Object.assign(new Error('Không tìm thấy dữ liệu trong phạm vi của bạn'), { statusCode: 404 });
}

function requireResourceScope(module, resource, getId) {
    return async (req, res, next) => {
        try { await assertResourceScope(req, await require('../config/db').getPool(), module, resource, getId(req)); next(); }
        catch (error) { next(error); }
    };
}

async function requireResidentSelf(req, res, next) {
    const permissions = getPermissionSet(req);
    if (getAccessScope(req, { viewAll: 'RESIDENT_VIEW_ALL', viewOwn: 'RESIDENT_VIEW_OWN' }) === 'all') return next();
    if (!permissions.has('RESIDENT_VIEW_OWN')) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập hồ sơ cư dân' });
    }

    const residentId = Number(req.params.id || req.params.residentId);
    if (!Number.isInteger(residentId) || residentId <= 0) {
        return res.status(400).json({ success: false, code: 'INVALID_RESIDENT_ID', message: 'Resident ID không hợp lệ' });
    }

    try {
        const pool = await require('../config/db').getPool();
        const currentResidentId = await getCurrentResidentId(pool, req.userId);
        if (currentResidentId !== residentId) {
            return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Bạn chỉ có thể truy cập hồ sơ của mình' });
        }
        req.currentResidentId = currentResidentId;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    activeContractSql, contractOwnershipSql, apartmentOwnershipSql,
    resolveScope, requireScope, assertResourceScope, requireResourceScope,
    isResidentAccount,
    getCurrentResidentId,
    requireResidentSelf,
    getPermissionSet,
    hasAnyPermission,
    getAccessScope
};
