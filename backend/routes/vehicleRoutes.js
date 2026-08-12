// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authMiddleware, checkPermission } = require('../middlewares/auth');

// ============================================
// ⚠️ QUAN TRỌNG: Thứ tự routes phải đúng!
// ============================================

// 1. Các route cụ thể (không có tham số động) PHẢI ĐẶT TRƯỚC
router.get('/types', authMiddleware, vehicleController.getVehicleTypes);
router.get('/cards', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getParkingCards);
router.get('/parking-slots', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getParkingSlots);
router.get('/history', authMiddleware, checkPermission('PARKING_HISTORY'), vehicleController.getParkingHistory);

// 2. Route có tham số động (có :id) PHẢI ĐẶT SAU
router.get('/', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getAllVehicles);
router.get('/:id', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getVehicleById);

// 3. Các route POST/PUT/DELETE
router.post('/', authMiddleware, checkPermission('VEHICLE_CREATE'), vehicleController.createVehicle);
router.post('/:vehicleId/card', authMiddleware, checkPermission('VEHICLE_UPDATE'), vehicleController.createParkingCard);
router.put('/:id', authMiddleware, checkPermission('VEHICLE_UPDATE'), vehicleController.updateVehicle);
router.put('/cards/:cardId', authMiddleware, checkPermission('VEHICLE_UPDATE'), vehicleController.updateParkingCard);
router.delete('/:id', authMiddleware, checkPermission('VEHICLE_DELETE'), vehicleController.deleteVehicle);
router.delete('/cards/:cardId', authMiddleware, checkPermission('VEHICLE_DELETE'), vehicleController.deleteParkingCard);

// 4. Parking slot CRUD
router.post('/parking-slots', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.createParkingSlot);
router.put('/parking-slots/:id', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.updateParkingSlot);
router.delete('/parking-slots/:id', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.deleteParkingSlot);

module.exports = router;