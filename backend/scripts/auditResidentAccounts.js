require('dotenv').config({ path: 'backend/.env' });

const { getPool, closePool } = require('../config/db');

async function main() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Resident WHERE UserID IS NOT NULL) AS ResidentsStillLinkedToUsers,
      (
        SELECT COUNT(*)
        FROM dbo.Users u
        JOIN dbo.UserRole ur ON ur.UserID = u.UserID
        JOIN dbo.Role ro ON ro.RoleID = ur.RoleID
        WHERE ro.RoleCode = 'RESIDENT'
      ) AS ResidentLoginUsersLeft,
      (SELECT COUNT(*) FROM dbo.Users WHERE Username = 'admin') AS AdminUsersLeft;
  `);

  console.table(result.recordset);
  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
