require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
    const pool = await getPool();

    const tables = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME;
    `);

    const authTables = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE '%User%'
           OR TABLE_NAME LIKE '%Account%'
           OR TABLE_NAME LIKE '%Employee%'
           OR TABLE_NAME LIKE '%Role%'
        ORDER BY TABLE_NAME;
    `);

    const users = await pool.request().query(`
        IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
        BEGIN
            SELECT TOP 50
                u.UserID,
                u.Username,
                u.Status,
                STRING_AGG(r.RoleName, ', ') AS Roles,
                e.EmployeeID,
                e.FullName AS EmployeeName
            FROM dbo.Users u
            LEFT JOIN dbo.UserRole ur ON ur.UserID = u.UserID
            LEFT JOIN dbo.Role r ON r.RoleID = ur.RoleID
            LEFT JOIN dbo.Employee e ON e.UserID = u.UserID
            GROUP BY u.UserID, u.Username, u.Status, e.EmployeeID, e.FullName
            ORDER BY u.UserID;
        END
        ELSE
        BEGIN
            SELECT CAST(NULL AS INT) AS UserID, CAST(NULL AS NVARCHAR(100)) AS Username
            WHERE 1 = 0;
        END
    `);

    const counts = await pool.request().query(`
        SELECT 'ApartmentArea' AS TableName, COUNT(*) AS Total FROM dbo.ApartmentArea
        UNION ALL SELECT 'Building', COUNT(*) FROM dbo.Building
        UNION ALL SELECT 'Floor', COUNT(*) FROM dbo.Floor
        UNION ALL SELECT 'Apartment', COUNT(*) FROM dbo.Apartment
        UNION ALL SELECT 'Contract', COUNT(*) FROM dbo.Contract
        UNION ALL SELECT 'ContractResident', COUNT(*) FROM dbo.ContractResident
        UNION ALL SELECT 'Resident', COUNT(*) FROM dbo.Resident
        UNION ALL SELECT 'Invoice', COUNT(*) FROM dbo.Invoice
        UNION ALL SELECT 'Payment', COUNT(*) FROM dbo.Payment
        UNION ALL SELECT 'Vehicle', COUNT(*) FROM dbo.Vehicle
        UNION ALL SELECT 'ParkingCard', COUNT(*) FROM dbo.ParkingCard
        UNION ALL SELECT 'ServiceRegistration', COUNT(*) FROM dbo.ServiceRegistration
        UNION ALL SELECT 'MeterReading', COUNT(*) FROM dbo.MeterReading;
    `);

    console.log('TABLES');
    console.table(tables.recordset);
    console.log('AUTH_TABLES');
    console.table(authTables.recordset);
    console.log('USERS');
    console.table(users.recordset);
    console.log('COUNTS');
    console.table(counts.recordset);

    await closePool();
}

main().catch(async (error) => {
    console.error(error);
    await closePool();
    process.exit(1);
});
