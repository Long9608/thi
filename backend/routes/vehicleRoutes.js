const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, vehicleController.getAllVehicles);
router.get('/types', authMiddleware, vehicleController.getVehicleTypes);
router.get('/parking-slots', authMiddleware, vehicleController.getParkingSlots);
router.get('/history', authMiddleware, vehicleController.getParkingHistory);
router.get('/:id', authMiddleware, vehicleController.getVehicleById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('VEHICLE_CREATE'), vehicleController.createVehicle);
router.put('/:id', authMiddleware, checkPermission('VEHICLE_UPDATE'), vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, checkPermission('VEHICLE_DELETE'), vehicleController.deleteVehicle);

module.exports = router;