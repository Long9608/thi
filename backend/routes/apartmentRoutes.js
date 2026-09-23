const { requireScope, requireResourceScope } = require('../utils/accessScope');
// backend/routes/apartmentRoutes.js
const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');

// Statuses & Areas
router.get('/statuses', authMiddleware, requireScope('APARTMENT'), apartmentController.getApartmentStatuses);
router.get('/areas', authMiddleware, requireScope('APARTMENT'), apartmentController.getAreas);
router.get('/stats', authMiddleware, requireScope('APARTMENT'), apartmentController.getApartmentStats);
router.get('/equipment', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('DEVICE_MANAGE'), apartmentController.getEquipment);
router.put('/equipment/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('DEVICE_MANAGE'), checkPermission('EQUIPMENT_UPDATE'), apartmentController.updateEquipment);

// Buildings
router.get('/buildings', authMiddleware, requireScope('APARTMENT'), apartmentController.getBuildings);
router.post('/buildings', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_CREATE'), apartmentController.createBuilding);
router.put('/buildings/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_UPDATE'), apartmentController.updateBuilding);
router.delete('/buildings/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_DELETE'), apartmentController.deleteBuilding);

// Floors
router.get('/floors', authMiddleware, requireScope('APARTMENT'), apartmentController.getFloors);
router.post('/floors', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_CREATE'), apartmentController.createFloor);
router.delete('/floors/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_DELETE'), apartmentController.deleteFloor);

// Apartments
router.get('/', authMiddleware, requireScope('APARTMENT'), checkAnyPermission('APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN', 'APARTMENT_VIEW'), apartmentController.getApartments);
router.get('/:id', authMiddleware, requireScope('APARTMENT'), checkAnyPermission('APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN', 'APARTMENT_VIEW'), apartmentController.getApartmentById);
router.post('/', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_CREATE'), apartmentController.createApartment);
router.put('/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_UPDATE'), apartmentController.updateApartment);
router.delete('/:id', authMiddleware, requireScope('APARTMENT', { allOnly: true }), checkPermission('APARTMENT_DELETE'), apartmentController.deleteApartment);

module.exports = router;
