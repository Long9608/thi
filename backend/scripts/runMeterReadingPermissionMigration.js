const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/db');

async function run() {
    const pool = await getPool();

    for (const migrationName of [
        '20260809_add_meter_reading_permission.sql',
        '20260810_add_individual_menu_view_permissions.sql'
    ]) {
        const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', migrationName), 'utf8');
        await pool.request().batch(migration);
    }

    const result = await pool.request().query(`
        SELECT p.PermissionCode, r.RoleCode
        FROM Permission p
        LEFT JOIN RolePermission rp ON rp.PermissionID = p.PermissionID AND rp.IsGranted = 1
        LEFT JOIN Role r ON r.RoleID = rp.RoleID
        WHERE p.PermissionCode = 'METER_READING_CREATE'
        ORDER BY r.RoleCode
    `);

    console.log('Meter-reading permission migration applied:', result.recordset);
}

run()
    .catch((error) => {
        console.error('Failed to apply meter-reading permission migration:', error);
        process.exitCode = 1;
    })
    .finally(closePool);
