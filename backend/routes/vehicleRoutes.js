const { requireScope, requireResourceScope } = require('../utils/accessScope');
// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const parkingController = require('../controllers/parkingController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');

// ============================================
// ⚠️ QUAN TRỌNG: Thứ tự routes phải đúng!
// ============================================

// 1. Các route cụ thể (không có tham số động) PHẢI ĐẶT TRƯỚC
router.get('/types', authMiddleware, requireScope('VEHICLE'), vehicleController.getVehicleTypes);
router.get('/eligible-residents', authMiddleware, requireScope('VEHICLE',{allOnly:true}), checkPermission('VEHICLE_CREATE'), async(req,res,next)=>{
    try { const pool=await require('../config/db').getPool(); res.json({success:true,data:(await pool.request().query('SELECT ResidentID,FullName FROM Resident WHERE Status=1 ORDER BY FullName,ResidentID')).recordset}); }
    catch(error){next(error);}
});
router.get('/parking-areas', authMiddleware, requireScope('PARKING', { allOnly: true }), async (req,res,next) => {
    try { res.json({ success:true, data:(await (await require('../config/db').getPool()).request().query('SELECT AreaID,AreaName FROM ApartmentArea ORDER BY AreaName')).recordset }); }
    catch(error){next(error);}
});
router.get('/cards', authMiddleware, requireScope('PARKING'), checkAnyPermission('PARKING_VIEW_ALL', 'PARKING_VIEW_OWN', 'PARKING_VIEW'), parkingController.getParkingCards);
router.get('/parking-slots', authMiddleware, requireScope('PARKING'), checkAnyPermission('PARKING_VIEW_ALL', 'PARKING_VIEW_OWN', 'PARKING_VIEW'), parkingController.getParkingSlots);
router.get('/history', authMiddleware, requireScope('PARKING'), checkAnyPermission('PARKING_VIEW_ALL', 'PARKING_VIEW_OWN', 'PARKING_HISTORY'), parkingController.getParkingHistory);
router.post('/access-events', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('PARKING_ACCESS_CREATE'), parkingController.recordAccessEvent);

// 2. Parking slot CRUD
router.post('/parking-slots', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('PARKING_SLOT_MANAGE'), parkingController.createParkingSlot);
router.put('/parking-slots/:slotId', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('PARKING_SLOT_MANAGE'), parkingController.updateParkingSlot);
router.delete('/parking-slots/:slotId', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('PARKING_SLOT_MANAGE'), parkingController.deleteParkingSlot);

// 3. Card management (các route có tham số động nhưng tên khác)
router.post('/:vehicleId/card', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('CARD_CREATE'), parkingController.createOrActivateCardAndSubscription);
router.put('/cards/:cardId', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('CARD_UPDATE'), parkingController.updateCardAndSubscription);
router.delete('/cards/:cardId', authMiddleware, requireScope('PARKING', { allOnly: true }), checkPermission('CARD_UPDATE'), parkingController.endCardAndSubscription);

// 4. Các route GET/POST/PUT/DELETE chung (động /:id) PHẢI ĐẶT SAU CÙNG
router.get('/', authMiddleware, requireScope('VEHICLE'), checkAnyPermission('VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW'), vehicleController.getAllVehicles);
router.post('/', authMiddleware, requireScope('VEHICLE'), checkPermission('VEHICLE_CREATE'), vehicleController.createVehicle);
router.get('/:id', authMiddleware, requireScope('VEHICLE'), checkAnyPermission('VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW'), vehicleController.getVehicleById);
router.put('/:id', authMiddleware, requireScope('VEHICLE'), checkPermission('VEHICLE_UPDATE'), vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, requireScope('VEHICLE'), checkPermission('VEHICLE_DELETE'), vehicleController.deleteVehicle);

module.exports = router;
