const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

// Public routes (cần auth)
router.get('/', authMiddleware, apartmentController.getAllApartments);
router.get('/statuses', authMiddleware, apartmentController.getApartmentStatuses);
router.get('/areas', authMiddleware, apartmentController.getApartmentAreas);
router.get('/buildings', authMiddleware, apartmentController.getApartmentBuildings);
router.get('/:id', authMiddleware, apartmentController.getApartmentById);

// Admin/Manager routes (dùng checkPermission)
router.post('/', authMiddleware, checkPermission('APARTMENT_CREATE'), apartmentController.createApartment);
router.put('/:id', authMiddleware, checkPermission('APARTMENT_UPDATE'), apartmentController.updateApartment);
router.delete('/:id', authMiddleware, checkPermission('APARTMENT_DELETE'), apartmentController.deleteApartment);

module.exports = router;