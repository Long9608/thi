const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, serviceController.getAllServices);
router.get('/categories', authMiddleware, serviceController.getServiceCategories);
router.get('/:id', authMiddleware, serviceController.getServiceById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('SERVICE_CREATE'), serviceController.createService);
router.put('/:id', authMiddleware, checkPermission('SERVICE_UPDATE'), serviceController.updateService);
router.delete('/:id', authMiddleware, checkPermission('SERVICE_DELETE'), serviceController.deleteService);
router.post('/register', authMiddleware, checkPermission('SERVICE_VIEW'), serviceController.registerService);
router.put('/unregister/:id', authMiddleware, checkPermission('SERVICE_VIEW'), serviceController.unregisterService);

module.exports = router;