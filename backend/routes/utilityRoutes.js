const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/types', authMiddleware, requireScope('INVOICE'), utilityController.getUtilityTypes);
router.get('/meters', authMiddleware, requireScope('INVOICE'), utilityController.getSmartMeters);
router.post('/meters/demo-tick', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('METER_READING_CREATE'), utilityController.demoTickMeters);
router.get('/readings', authMiddleware, requireScope('INVOICE'), utilityController.getMeterReadings);
router.get('/:utilityTypeId/tiers', authMiddleware, requireScope('INVOICE'), utilityController.getPriceTiers);

// Dùng checkPermission
router.post('/readings', authMiddleware, requireScope('INVOICE', { allOnly: true }), checkPermission('METER_READING_CREATE'), utilityController.createMeterReading);

module.exports = router;
