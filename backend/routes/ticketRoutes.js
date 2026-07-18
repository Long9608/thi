const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, checkPermission('TICKET_VIEW'), ticketController.getAllTickets);
router.get('/my-tickets', authMiddleware, ticketController.getMyTickets);
router.get('/statuses', authMiddleware, ticketController.getTicketStatuses);
router.get('/:id', authMiddleware, ticketController.getTicketById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('TICKET_CREATE'), ticketController.createTicket);
router.put('/:id', authMiddleware, checkPermission('MAINTENANCE_UPDATE'), ticketController.updateTicket);
router.delete('/:id', authMiddleware, checkPermission('TICKET_DELETE'), ticketController.deleteTicket);

module.exports = router;