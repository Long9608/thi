const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, checkPermission } = require('../middlewares/auth');

// ============================================
// QUẢN LÝ NHÂN VIÊN
// ============================================
router.get('/employees', authMiddleware, checkPermission('EMPLOYEE_VIEW'), userController.getEmployees);
router.get('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_VIEW'), userController.getEmployeeById);
router.post('/employees', authMiddleware, checkPermission('EMPLOYEE_CREATE'), userController.createEmployee);
router.put('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_UPDATE'), userController.updateEmployee);
router.delete('/employees/:id', authMiddleware, checkPermission('EMPLOYEE_DELETE'), userController.deleteEmployee);

// ============================================
// QUẢN LÝ VAI TRÒ (ROLE)
// ============================================
router.get('/roles', authMiddleware, checkPermission('ROLE_MANAGE'), userController.getRoles);
router.get('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), userController.getRoleById);
router.post('/roles', authMiddleware, checkPermission('ROLE_MANAGE'), userController.createRole);
router.put('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), userController.updateRole);
router.delete('/roles/:id', authMiddleware, checkPermission('ROLE_MANAGE'), userController.deleteRole);
router.get('/roles/:roleId/permissions', authMiddleware, userController.getRolePermissions);

// ============================================
// QUẢN LÝ PERMISSION
// ============================================
router.get('/permissions', authMiddleware, checkPermission('PERMISSION_MANAGE'), userController.getPermissions);
router.get('/modules', authMiddleware, checkPermission('PERMISSION_MANAGE'), userController.getModules);
router.put('/roles/:roleId/permissions', authMiddleware, checkPermission('PERMISSION_MANAGE'), userController.updateRolePermissions);

// ============================================
// NHẬT KÝ HỆ THỐNG
// ============================================
router.get('/audit-logs', authMiddleware, checkPermission('SYSTEM_SETTING'), userController.getAuditLogs);

module.exports = router;