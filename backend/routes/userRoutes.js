// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const roleController = require('../controllers/roleController');
const accountController = require('../controllers/accountController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');
const { isResidentAccount } = require('../utils/accessScope');
router.use(authMiddleware, (req, res, next) => isResidentAccount(req) ? res.status(403).json({ success: false, message: 'Cư dân không có quyền quản lý tài khoản và vai trò' }) : next());

// ============================================
// QUẢN LÝ NHÂN VIÊN
// ============================================
router.get('/employees', authMiddleware, checkPermission('EMPLOYEE_VIEW'), userController.getEmployees);
router.put('/accounts/:id', checkPermission('EMPLOYEE_UPDATE'), accountController.updateAccount);
router.get('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_VIEW'), userController.getEmployeeById);
router.post('/employees', authMiddleware, checkPermission('EMPLOYEE_CREATE'), userController.createEmployee);
router.put('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_UPDATE'), userController.updateEmployee);
router.delete('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_DELETE'), userController.deleteEmployee);

// ============================================
// QUẢN LÝ VAI TRÒ (ROLE)
// ============================================
router.get('/employee-roles', authMiddleware, checkPermission('EMPLOYEE_VIEW'), userController.getEmployeeRoles);
router.get('/roles', authMiddleware, checkAnyPermission('ROLE_MANAGE','PERMISSION_MANAGE'), userController.getRoles);
router.get('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), userController.getRoleById);
router.post('/roles', authMiddleware, checkPermission('ROLE_MANAGE'), roleController.createRole);
router.put('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), roleController.updateRole);
router.delete('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), roleController.deleteRole);
router.get('/roles/:roleId/permissions', authMiddleware, checkAnyPermission('ROLE_MANAGE','PERMISSION_MANAGE'), userController.getRolePermissions);

// ============================================
// QUẢN LÝ PERMISSION
// ============================================
router.get('/permissions', authMiddleware, checkPermission('PERMISSION_MANAGE'), userController.getPermissions);
router.get('/modules', authMiddleware, checkPermission('PERMISSION_MANAGE'), userController.getModules);
router.put('/roles/:roleId/permissions', authMiddleware, checkPermission('PERMISSION_MANAGE'), roleController.updateRolePermissions);

// ============================================
// NHẬT KÝ HỆ THỐNG
// ============================================
router.get('/audit-logs', authMiddleware, checkPermission('SYSTEM_SETTING'), userController.getAuditLogs);

// ============================================
// 🔥 THÔNG TIN HỆ THỐNG (MỚI)
// ============================================
router.get('/system-info', authMiddleware, checkPermission('SYSTEM_SETTING'), userController.getSystemInfo);

module.exports = router;
