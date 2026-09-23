require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getPool, closePool } = require('../config/db');

async function main() {
  const pool = await getPool();
  const residents = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Resident WHERE UserID IS NOT NULL) AS ResidentsWithUsers,
      (SELECT COUNT(*)
       FROM dbo.Users u
       JOIN dbo.UserRole ur ON ur.UserID = u.UserID
       JOIN dbo.Role r ON r.RoleID = ur.RoleID
       WHERE r.RoleCode = 'RESIDENT') AS ResidentRoleUsers;

    SELECT TOP 20
      u.UserID,
      u.Username,
      r.RoleCode,
      res.ResidentID
    FROM dbo.Users u
    JOIN dbo.UserRole ur ON ur.UserID = u.UserID
    JOIN dbo.Role r ON r.RoleID = ur.RoleID
    LEFT JOIN dbo.Resident res ON res.UserID = u.UserID
    WHERE r.RoleCode = 'RESIDENT' AND u.Status = 1
    ORDER BY u.UserID;
  `);

  const permissions = await pool.request().query(`
    SELECT r.RoleCode, p.PermissionCode, rp.IsGranted
    FROM dbo.Role r
    JOIN dbo.RolePermission rp ON rp.RoleID = r.RoleID
    JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
    WHERE r.RoleCode IN ('RESIDENT', 'ADMIN', 'MANAGER')
      AND (p.PermissionCode LIKE '%VIEW_%' OR p.PermissionCode = 'RESIDENT_EXPORT')
    ORDER BY r.RoleCode, p.PermissionCode;
  `);

  console.log('RESIDENT_ACCOUNT_COUNTS');
  console.table(residents.recordsets[0]);
  console.log('RESIDENT_ACCOUNTS');
  console.table(residents.recordsets[1]);
  console.log('RBAC_SCOPED_PERMISSIONS');
  console.table(permissions.recordset);
  await closePool();
}

main().catch(async (error) => {
  console.error('READONLY_AUDIT_FAILED:', error.message);
  await closePool();
  process.exitCode = 1;
});
