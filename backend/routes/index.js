// backend/routes/index.js
const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./authRoutes');
const apartmentRoutes = require('./apartmentRoutes');
const contractRoutes = require('./contractRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const notificationRoutes = require('./notificationRoutes');
const residentRoutes = require('./residentRoutes');
const serviceRoutes = require('./serviceRoutes');
const ticketRoutes = require('./ticketRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const utilityRoutes = require('./utilityRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const { authMiddleware } = require('../middlewares/auth');

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/apartments', apartmentRoutes);
router.use('/contracts', contractRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/residents', residentRoutes);
router.use('/services', serviceRoutes);
router.use('/tickets', ticketRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/utilities', utilityRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);

// Route kiểm tra quyền ✅ SỬA
router.get('/permissions', authMiddleware, (req, res) => {
    res.json({
        success: true,
        data: {
            userId: req.userId,
            username: req.user?.Username,
            roles: req.user?.RoleNames || [],
            permissions: req.user?.Permissions || []
        }
    });
});

module.exports = router;