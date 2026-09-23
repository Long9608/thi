const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, requireScope('FEEDBACK'), checkAnyPermission('FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'), feedbackController.getAllFeedbacks);
router.post('/', authMiddleware, requireScope('FEEDBACK'), checkPermission('FEEDBACK_CREATE'), feedbackController.createFeedback);
router.get('/:id', authMiddleware, requireScope('FEEDBACK'), checkAnyPermission('FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'), feedbackController.getFeedbackById);
router.put('/:id/reply', authMiddleware, requireScope('FEEDBACK', { allOnly: true }), checkAnyPermission('FEEDBACK_REPLY', 'TICKET_UPDATE', 'MAINTENANCE_UPDATE'), feedbackController.updateFeedbackReply);

module.exports = router;
