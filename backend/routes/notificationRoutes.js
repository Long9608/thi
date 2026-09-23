const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, requireScope('NOTIFICATION'), checkAnyPermission('NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'), notificationController.getAllNotifications);
router.get('/unread-count', authMiddleware, requireScope('NOTIFICATION'), checkAnyPermission('NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'), notificationController.getUnreadCount);
router.get('/:id', authMiddleware, requireScope('NOTIFICATION'), checkAnyPermission('NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'), notificationController.getNotificationById);

// Dùng checkPermission
router.post('/', authMiddleware, requireScope('NOTIFICATION', { allOnly: true }), checkPermission('NOTIFICATION_SEND'), notificationController.createNotification);
router.put('/:id/read', authMiddleware, requireScope('NOTIFICATION'), notificationController.markAsRead);
router.put('/read-all', authMiddleware, requireScope('NOTIFICATION'), notificationController.markAllAsRead);
router.delete('/:id', authMiddleware, requireScope('NOTIFICATION', { allOnly: true }), checkPermission('NOTIFICATION_DELETE'), notificationController.deleteNotification);

module.exports = router;
