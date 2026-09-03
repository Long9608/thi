// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const parkingController = require('../controllers/parkingController');
const { authMiddleware, checkPermission } = require('../middlewares/auth');

// ============================================
// ⚠️ QUAN TRỌNG: Thứ tự routes phải đúng!
// ============================================

// 1. Các route cụ thể (không có tham số động) PHẢI ĐẶT TRƯỚC
router.get('/types', authMiddleware, vehicleController.getVehicleTypes);
router.get('/cards', authMiddleware, checkPermission('PARKING_VIEW'), parkingController.getParkingCards);
router.get('/parking-slots', authMiddleware, checkPermission('PARKING_VIEW'), parkingController.getParkingSlots);
router.get('/history', authMiddleware, checkPermission('PARKING_HISTORY'), parkingController.getParkingHistory);
router.post('/access-events', authMiddleware, checkPermission('PARKING_ACCESS_CREATE'), parkingController.recordAccessEvent);

// 2. Parking slot CRUD
router.post('/parking-slots', authMiddleware, checkPermission('PARKING_SLOT_MANAGE'), parkingController.createParkingSlot);
router.put('/parking-slots/:slotId', authMiddleware, checkPermission('PARKING_SLOT_MANAGE'), parkingController.updateParkingSlot);
router.delete('/parking-slots/:slotId', authMiddleware, checkPermission('PARKING_SLOT_MANAGE'), parkingController.deleteParkingSlot);

// 3. Card management (các route có tham số động nhưng tên khác)
router.post('/:vehicleId/card', authMiddleware, checkPermission('CARD_CREATE'), parkingController.createOrActivateCardAndSubscription);
router.put('/cards/:cardId', authMiddleware, checkPermission('CARD_UPDATE'), parkingController.updateCardAndSubscription);
router.delete('/cards/:cardId', authMiddleware, checkPermission('CARD_UPDATE'), parkingController.endCardAndSubscription);

// 4. Các route GET/POST/PUT/DELETE chung (động /:id) PHẢI ĐẶT SAU CÙNG
router.get('/', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getAllVehicles);
router.post('/', authMiddleware, checkPermission('VEHICLE_CREATE'), vehicleController.createVehicle);
router.get('/:id', authMiddleware, checkPermission('PARKING_VIEW'), vehicleController.getVehicleById);
router.put('/:id', authMiddleware, checkPermission('VEHICLE_UPDATE'), vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, checkPermission('VEHICLE_DELETE'), vehicleController.deleteVehicle);

module.exports = router;