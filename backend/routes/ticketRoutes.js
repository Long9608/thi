const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, requireScope('TICKET'), checkAnyPermission('TICKET_VIEW_ALL', 'TICKET_VIEW_OWN'), ticketController.getAllTickets);
router.get('/my-tickets', authMiddleware, requireScope('TICKET'), checkAnyPermission('TICKET_VIEW_ALL', 'TICKET_VIEW_OWN'), ticketController.getMyTickets);
router.get('/statuses', authMiddleware, requireScope('TICKET'), checkAnyPermission('TICKET_VIEW_ALL', 'TICKET_VIEW_OWN'), ticketController.getTicketStatuses);
router.get('/:id', authMiddleware, requireScope('TICKET'), checkAnyPermission('TICKET_VIEW_ALL', 'TICKET_VIEW_OWN'), ticketController.getTicketById);

// Dùng checkPermission
router.post('/', authMiddleware, requireScope('TICKET'), checkPermission('TICKET_CREATE'), ticketController.createTicket);
router.put('/:id', authMiddleware, requireScope('TICKET'), checkPermission('MAINTENANCE_UPDATE'), ticketController.updateTicket);
router.delete('/:id', authMiddleware, requireScope('TICKET', { allOnly: true }), checkPermission('TICKET_DELETE'), ticketController.deleteTicket);

module.exports = router;
