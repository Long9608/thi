const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, notificationController.getAllNotifications);
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);
router.get('/:id', authMiddleware, notificationController.getNotificationById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('NOTIFICATION_SEND'), notificationController.createNotification);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/:id', authMiddleware, checkPermission('NOTIFICATION_DELETE'), notificationController.deleteNotification);

module.exports = router;