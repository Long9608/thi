require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT b.BuildingID, b.BuildingName, f.FloorID, f.FloorNumber,
           a.ApartmentID, a.ApartmentCode, a.StatusID
    FROM dbo.Building b
    JOIN dbo.Floor f ON f.BuildingID = b.BuildingID
    JOIN dbo.Apartment a ON a.FloorID = f.FloorID
    ORDER BY b.BuildingID, f.FloorNumber, a.ApartmentID;
  `);
  console.table(result.recordset);
  await closePool();
}
main().catch(async (e) => { console.error(e); await closePool(); process.exit(1); });
