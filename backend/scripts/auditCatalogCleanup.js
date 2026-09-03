require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function count(pool, table) {
  const result = await pool.request().query(`SELECT COUNT(*) AS Total FROM dbo.${table};`);
  return result.recordset[0].Total;
}

async function main() {
  const pool = await getPool();
  const tables = ['Service', 'ServiceCategory', 'UtilityType', 'UtilityPriceTier', 'ParkingSlot', 'VehicleType'];
  const rows = [];

  for (const table of tables) {
    rows.push({ Table: table, Total: await count(pool, table) });
  }

  console.table(rows);
  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
