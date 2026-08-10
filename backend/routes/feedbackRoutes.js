const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, feedbackController.getAllFeedbacks);
router.put('/:id/reply', authMiddleware, feedbackController.updateFeedbackReply);

module.exports = router;
