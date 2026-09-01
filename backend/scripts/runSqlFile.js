require('dotenv').config({ path: 'backend/.env' });

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/db');

async function main() {
    const fileArg = process.argv[2];
    if (!fileArg) {
        throw new Error('Usage: node backend/scripts/runSqlFile.js <sql-file>');
    }

    const sqlPath = path.resolve(fileArg);
    const content = fs.readFileSync(sqlPath, 'utf8');
    const batches = content
        .split(/^\s*GO\s*$/gim)
        .map((batch) => batch.trim())
        .filter(Boolean);

    const pool = await getPool();
    for (const batch of batches) {
        await pool.request().batch(batch);
    }

    console.log(`Executed SQL file: ${sqlPath}`);
    await closePool();
}

main().catch(async (error) => {
    console.error('Run SQL file failed:', error);
    await closePool();
    process.exit(1);
});
