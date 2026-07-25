// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getPool, closePool } = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, 'uploads');
const identityDir = path.join(uploadsDir, 'identity');
const tempDir = path.join(uploadsDir, 'temp');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}
if (!fs.existsSync(identityDir)) {
    fs.mkdirSync(identityDir, { recursive: true });
    console.log('📁 Created identity directory');
}
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Created temp directory');
}

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: process.env.DB_DATABASE,
        uploads: {
            path: uploadsDir,
            identity: identityDir
        }
    });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT GETDATE() as currentTime, @@VERSION as version');
        res.json({
            success: true,
            data: {
                currentTime: result.recordset[0].currentTime,
                version: result.recordset[0].version.split(',')[0]
            }
        });
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        res.status(500).json({
            success: false,
            message: error.message,
            details: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Start server
const server = app.listen(PORT, async () => {
    console.log('========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🖼️  Identity images: ${identityDir}`);
    console.log('========================================');
    
    // Test database connection on startup
    try {
        await getPool();
        console.log(`✅ Kết nối CSDL [${process.env.DB_DATABASE}] thành công!`);
        console.log('========================================');
    } catch (error) {
        console.error('❌ Không thể kết nối database!');
        console.error('   Chi tiết:', error.message);
        console.error('   Vui lòng kiểm tra:');
        console.error(`   - Server: ${process.env.DB_SERVER}`);
        console.error(`   - Database: ${process.env.DB_DATABASE}`);
        console.error(`   - User: ${process.env.DB_USER}`);
        console.error('========================================');
    }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async (err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }
        console.log('✅ Server closed');
        await closePool();
        console.log('✅ Database connection closed');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('   Reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('   Stack:', error.stack);
    // Graceful shutdown on uncaught exception
    gracefulShutdown('uncaughtException');
});

module.exports = app;