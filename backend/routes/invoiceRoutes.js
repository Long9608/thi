const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, invoiceController.getAllInvoices);
router.get('/statuses', authMiddleware, invoiceController.getInvoiceStatuses);
router.get('/payment-methods', authMiddleware, invoiceController.getPaymentMethods);
router.get('/:id', authMiddleware, invoiceController.getInvoiceById);

// Dùng checkPermission
router.post('/generate', authMiddleware, checkPermission('INVOICE_CREATE'), invoiceController.generateInvoice);
router.put('/:id/status', authMiddleware, checkPermission('INVOICE_UPDATE'), invoiceController.updateInvoiceStatus);
router.post('/payment', authMiddleware, checkPermission('PAYMENT_CREATE'), invoiceController.processPayment);

module.exports = router;