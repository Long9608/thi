const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/stats', authMiddleware, dashboardController.getDashboardStats);
router.get('/activities', authMiddleware, dashboardController.getRecentActivities);

// Dashboard financial chỉ dành cho người có permission
router.get('/financial', authMiddleware, checkPermission('INVOICE_VIEW'), dashboardController.getFinancialSummary);

module.exports = router;