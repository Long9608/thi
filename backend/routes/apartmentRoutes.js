// backend/routes/apartmentRoutes.js
const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { authMiddleware, checkPermission } = require('../middlewares/auth');

// Statuses & Areas
router.get('/statuses', authMiddleware, apartmentController.getApartmentStatuses);
router.get('/areas', authMiddleware, apartmentController.getAreas);
router.get('/stats', authMiddleware, apartmentController.getApartmentStats);

// Buildings
router.get('/buildings', authMiddleware, apartmentController.getBuildings);
router.post('/buildings', authMiddleware, checkPermission('APARTMENT_CREATE'), apartmentController.createBuilding);
router.put('/buildings/:id', authMiddleware, checkPermission('APARTMENT_UPDATE'), apartmentController.updateBuilding);
router.delete('/buildings/:id', authMiddleware, checkPermission('APARTMENT_DELETE'), apartmentController.deleteBuilding);

// Floors
router.get('/floors', authMiddleware, apartmentController.getFloors);
router.post('/floors', authMiddleware, checkPermission('APARTMENT_CREATE'), apartmentController.createFloor);
router.delete('/floors/:id', authMiddleware, checkPermission('APARTMENT_DELETE'), apartmentController.deleteFloor);

// Apartments
router.get('/', authMiddleware, checkPermission('APARTMENT_VIEW'), apartmentController.getApartments);
router.get('/:id', authMiddleware, checkPermission('APARTMENT_VIEW'), apartmentController.getApartmentById);
router.post('/', authMiddleware, checkPermission('APARTMENT_CREATE'), apartmentController.createApartment);
router.put('/:id', authMiddleware, checkPermission('APARTMENT_UPDATE'), apartmentController.updateApartment);
router.delete('/:id', authMiddleware, checkPermission('APARTMENT_DELETE'), apartmentController.deleteApartment);

module.exports = router;