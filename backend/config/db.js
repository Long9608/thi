// backend/config/db.js
const sql = require('mssql');
require('dotenv').config();

const rawServer = process.env.DB_SERVER || '127.0.0.1';
const isAzure = rawServer.endsWith('.database.windows.net');
const hasInstance = !isAzure && rawServer.includes('\\');

const [serverHost, instanceName] = hasInstance
    ? rawServer.split('\\')
    : [rawServer, null];

console.log('========================================');
console.log('📡 DATABASE CONFIG:');
console.log(`   Server: ${rawServer}`);
console.log(`   Database: ${process.env.DB_DATABASE}`);
console.log(`   User: ${process.env.DB_USER}`);
console.log(`   Environment: ${isAzure ? 'Azure SQL' : 'Local SQL Server'}`);
console.log('========================================');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverHost,
    database: process.env.DB_DATABASE,

    // Azure SQL dùng cổng 1433.
    // SQL Server Express sử dụng instanceName nên không đặt port.
    ...(hasInstance ? {} : { port: 1433 }),

    connectionTimeout: 120000,
    requestTimeout: 60000,

    options: {
        encrypt: isAzure,
        trustServerCertificate: !isAzure,
        enableArithAbort: true,
        ...(hasInstance ? { instanceName } : {})
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    try {
        if (pool) {
            try {
                await pool.request().query('SELECT 1');
                return pool;
            } catch (error) {
                console.log('🔄 Pool connection lost, reconnecting...');
                await pool.close().catch(() => {});
                pool = null;
            }
        }

        console.log('📡 Connecting to SQL Server...');
        console.log(`   Server: ${rawServer}`);
        console.log(`   Database: ${config.database}`);

        pool = await new sql.ConnectionPool(config).connect();

        console.log('✅ Database connected successfully!');

        const testResult = await pool.request().query(`
            SELECT
                @@VERSION AS version,
                GETDATE() AS currentTime
        `);

        console.log('📊 Database info:');
        console.log(
            `   Version: ${testResult.recordset[0].version.split(',')[0]}`
        );
        console.log(
            `   Current Time: ${testResult.recordset[0].currentTime}`
        );

        return pool;
    } catch (error) {
        console.error('❌ Database connection failed!');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);

        if (pool) {
            await pool.close().catch(() => {});
            pool = null;
        }

        throw error;
    }
}

async function closePool() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('📴 Database connection closed');
        }
    } catch (error) {
        console.error('Error closing database pool:', error);
    }
}

module.exports = {
    getPool,
    closePool,
    sql
};