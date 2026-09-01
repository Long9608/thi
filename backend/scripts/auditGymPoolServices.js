require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
    const pool = await getPool();

    const services = await pool.request().query(`
        SELECT ServiceID, ServiceName, Price, Status
        FROM Service
        WHERE ServiceName LIKE N'%Gym%'
           OR ServiceName LIKE N'%bơi%'
           OR ServiceName LIKE N'%quản lý%'
           OR ServiceName LIKE N'%vận hành%'
        ORDER BY ServiceID;
    `);

    const registrations = await pool.request().query(`
        SELECT TOP 50
            a.ApartmentCode,
            c.ContractID,
            c.ContractNumber,
            s.ServiceName,
            sr.Status,
            sr.Quantity,
            sr.RegisterDate,
            sr.EndDate
        FROM ServiceRegistration sr
        JOIN Service s ON s.ServiceID = sr.ServiceID
        JOIN Contract c ON c.ContractID = sr.ContractID
        JOIN Apartment a ON a.ApartmentID = c.ApartmentID
        WHERE s.ServiceName LIKE N'%Gym%'
           OR s.ServiceName LIKE N'%bơi%'
        ORDER BY c.ContractID DESC, s.ServiceName;
    `);

    const target = await pool.request()
        .input('ApartmentCode', 'Tòa C-T1-P1')
        .query(`
            SELECT
                a.ApartmentID,
                a.ApartmentCode,
                c.ContractID,
                c.ContractNumber,
                c.StatusID AS ContractStatusID,
                cs.StatusName AS ContractStatus
            FROM Apartment a
            LEFT JOIN Contract c ON c.ApartmentID = a.ApartmentID
            LEFT JOIN ContractStatus cs ON cs.StatusID = c.StatusID
            WHERE a.ApartmentCode = @ApartmentCode
            ORDER BY c.ContractID DESC;
        `);

    console.log('SERVICES');
    console.table(services.recordset);
    console.log('REGISTRATIONS');
    console.table(registrations.recordset);
    console.log('TARGET_APARTMENT');
    console.table(target.recordset);

    await closePool();
}

main().catch(async (error) => {
    console.error(error);
    await closePool();
    process.exit(1);
});
