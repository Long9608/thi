// backend/config/db.js
const sql = require('mssql');
require('dotenv').config();

console.log('========================================');
console.log('📡 DATABASE CONFIG:');
console.log(`   Server: ${process.env.DB_SERVER}`);
console.log(`   Database: ${process.env.DB_DATABASE}`);
console.log(`   User: ${process.env.DB_USER}`);
console.log('========================================');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1',
    port: 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 60000, // Tăng timeout lên 60s
        requestTimeout: 60000,
        instanceName: 'SQLEXPRESS' // Thêm instance name
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
                pool = null;
            }
        }
        
        console.log('📡 Connecting to SQL Server...');
        console.log(`   Connection: ${config.server}\\SQLEXPRESS, port ${config.port}`);
        console.log(`   Database: ${config.database}`);
        
        pool = await sql.connect(config);
        console.log('✅ Database connected successfully!');
        
        // Test query
        const testResult = await pool.request().query('SELECT @@VERSION as version, GETDATE() as currentTime');
        console.log('📊 Database info:');
        console.log(`   Version: ${testResult.recordset[0].version.split(',')[0]}`);
        console.log(`   Current Time: ${testResult.recordset[0].currentTime}`);
        
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed!');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
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