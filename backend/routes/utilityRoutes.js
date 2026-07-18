const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/types', authMiddleware, utilityController.getUtilityTypes);
router.get('/:utilityTypeId/tiers', authMiddleware, utilityController.getPriceTiers);
router.get('/readings', authMiddleware, utilityController.getMeterReadings);

// Dùng checkPermission
router.post('/readings', authMiddleware, checkPermission('METER_READING_CREATE'), utilityController.createMeterReading);

module.exports = router;