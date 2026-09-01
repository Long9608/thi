require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
    const pool = await getPool();

    const apartmentCode = process.argv[2] || 'Tòa A-T5-P4';

    const apartment = await pool.request()
        .input('ApartmentCode', apartmentCode)
        .query(`
            SELECT
                a.ApartmentID,
                a.ApartmentCode,
                a.StatusID,
                rs.StatusName AS ApartmentStatus,
                a.Area,
                c.ContractID,
                c.ContractNumber,
                c.StatusID AS ContractStatusID,
                cs.StatusName AS ContractStatus,
                c.OwnerID,
                r.FullName AS OwnerName,
                c.StartDate,
                c.EndDate,
                c.Rent,
                CAST(GETDATE() AS DATE) AS Today,
                CASE
                    WHEN c.StatusID = 2
                     AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                    THEN 1 ELSE 0
                END AS IsActiveNow
            FROM Apartment a
            JOIN RoomStatus rs ON rs.StatusID = a.StatusID
            LEFT JOIN Contract c ON c.ApartmentID = a.ApartmentID
            LEFT JOIN ContractStatus cs ON cs.StatusID = c.StatusID
            LEFT JOIN Resident r ON r.ResidentID = c.OwnerID
            WHERE a.ApartmentCode = @ApartmentCode
            ORDER BY c.ContractID DESC;
        `);

    console.log('APARTMENT_CONTRACTS');
    console.table(apartment.recordset);

    const buildings = await pool.request().query(`
        SELECT
            ar.AreaID,
            ar.AreaName,
            b.BuildingID,
            b.BuildingName,
            COUNT(DISTINCT f.FloorID) AS Floors,
            COUNT(DISTINCT a.ApartmentID) AS Apartments
        FROM ApartmentArea ar
        LEFT JOIN Building b ON b.AreaID = ar.AreaID
        LEFT JOIN Floor f ON f.BuildingID = b.BuildingID
        LEFT JOIN Apartment a ON a.FloorID = f.FloorID
        GROUP BY ar.AreaID, ar.AreaName, b.BuildingID, b.BuildingName
        ORDER BY ar.AreaID, b.BuildingID;
    `);

    console.log('AREAS_BUILDINGS');
    console.table(buildings.recordset);

    const autos = await pool.request().query(`
        SELECT
            a.ApartmentCode,
            c.ContractID,
            c.ContractNumber,
            c.StatusID,
            cs.StatusName AS ContractStatus,
            c.StartDate,
            c.EndDate,
            c.Rent,
            r.FullName AS OwnerName
        FROM Contract c
        JOIN Apartment a ON a.ApartmentID = c.ApartmentID
        JOIN ContractStatus cs ON cs.StatusID = c.StatusID
        JOIN Resident r ON r.ResidentID = c.OwnerID
        WHERE c.ContractNumber LIKE 'HD-AUTO-%'
        ORDER BY a.ApartmentCode;
    `);

    console.log('AUTO_CONTRACTS');
    console.table(autos.recordset);

    await closePool();
}

main().catch(async (error) => {
    console.error(error);
    await closePool();
    process.exit(1);
});
