const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, residentController.getAllResidents);
router.get('/:id', authMiddleware, residentController.getResidentById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('RESIDENT_CREATE'), residentController.createResident);
router.put('/:id', authMiddleware, checkPermission('RESIDENT_UPDATE'), residentController.updateResident);
router.delete('/:id', authMiddleware, checkPermission('RESIDENT_DELETE'), residentController.deleteResident);

module.exports = router;