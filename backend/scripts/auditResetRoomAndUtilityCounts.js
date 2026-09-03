require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Building) AS Buildings,
      (SELECT COUNT(*) FROM dbo.Floor) AS Floors,
      (SELECT COUNT(*) FROM dbo.Apartment) AS Apartments,
      (SELECT COUNT(*) FROM dbo.Apartment WHERE StatusID <> 1) AS NonVacantApartments,
      (SELECT COUNT(*) FROM dbo.Contract) AS Contracts,
      (SELECT COUNT(*) FROM dbo.Resident) AS Residents,
      (SELECT COUNT(*) FROM dbo.MeterReading) AS MeterReadings,
      CASE WHEN OBJECT_ID('dbo.SmartMeter', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeter) END AS SmartMeters,
      CASE WHEN OBJECT_ID('dbo.SmartMeterLog', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeterLog) END AS SmartMeterLogs;

    SELECT b.BuildingName, COUNT(DISTINCT f.FloorID) AS Floors, COUNT(a.ApartmentID) AS Apartments
    FROM dbo.Building b
    LEFT JOIN dbo.Floor f ON f.BuildingID = b.BuildingID
    LEFT JOIN dbo.Apartment a ON a.FloorID = f.FloorID
    GROUP BY b.BuildingName
    ORDER BY b.BuildingName;
  `);

  console.log('TOTALS');
  console.table(result.recordsets[0]);
  console.log('BY_BUILDING');
  console.table(result.recordsets[1]);
  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
