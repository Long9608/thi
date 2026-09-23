const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');
const {requireScope}=require('../utils/accessScope');
router.get('/revenue',authMiddleware,requireScope('INVOICE',{allOnly:true}),checkPermission('REPORT_VIEW'),dashboardController.getRevenueReport);

router.get('/stats', authMiddleware, checkAnyPermission('DASHBOARD_VIEW', 'REPORT_VIEW', 'RESIDENT_VIEW_OWN'), dashboardController.getDashboardStats);
router.get('/activities', authMiddleware, checkAnyPermission('DASHBOARD_VIEW', 'REPORT_VIEW', 'RESIDENT_VIEW_OWN'), dashboardController.getRecentActivities);

// Dashboard financial chỉ dành cho người có permission
router.get('/financial', authMiddleware, checkAnyPermission('INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN'), dashboardController.getFinancialSummary);

module.exports = router;
