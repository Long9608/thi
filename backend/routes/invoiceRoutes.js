const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const paymentWorkflow = require('../controllers/paymentWorkflowController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, requireScope('INVOICE'), invoiceController.getAllInvoices);
router.get('/statuses', authMiddleware, requireScope('INVOICE'), invoiceController.getInvoiceStatuses);
router.get('/payment-methods', authMiddleware, requireScope('INVOICE'), invoiceController.getPaymentMethods);
router.get('/payment-config', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('SYSTEM_SETTING'), paymentWorkflow.getConfig);
router.put('/payment-config', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('SYSTEM_SETTING'), paymentWorkflow.saveConfig);
router.get('/:id/payment-info', authMiddleware, requireScope('INVOICE'), paymentWorkflow.getPaymentInfo);
router.post('/:id/payment-submission', authMiddleware, requireScope('INVOICE'), paymentWorkflow.submitPayment);
router.post('/:id/confirm-payment', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('PAYMENT_CREATE'), paymentWorkflow.confirmPayment);
router.get('/current/apartment/:apartmentId', authMiddleware, requireScope('INVOICE'), invoiceController.getApartmentCurrentInvoice);
router.get('/preview-monthly', authMiddleware, requireScope('INVOICE'), requireResourceScope('INVOICE', 'contract', req => req.query.contractId), invoiceController.previewMonthlyInvoice);
router.get('/:id', authMiddleware, requireScope('INVOICE'), invoiceController.getInvoiceById);

// Dùng checkPermission
router.post('/generate', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('INVOICE_CREATE'), invoiceController.generateInvoice);
router.post('/generate-monthly', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('INVOICE_CREATE'), invoiceController.generateMonthlyInvoice);
router.post('/current/apartment/:apartmentId/meter-readings', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('INVOICE_CREATE'), invoiceController.updateApartmentCurrentMeterReadings);
router.post('/current/apartment/:apartmentId/finalize', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('INVOICE_CREATE'), invoiceController.finalizeApartmentCurrentInvoice);
router.post('/current/apartment/:apartmentId/pay', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('PAYMENT_CREATE'), invoiceController.payApartmentCurrentInvoice);
router.put('/:id/status', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('INVOICE_UPDATE'), invoiceController.updateInvoiceStatus);
router.post('/payment', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('PAYMENT_CREATE'), invoiceController.processPayment);

module.exports = router;
