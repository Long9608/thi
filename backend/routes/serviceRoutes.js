const { requireScope, requireResourceScope } = require('../utils/accessScope');
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const registrationController = require('../controllers/serviceRegistrationController');
const { authMiddleware, checkRole, checkPermission, checkAnyPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, requireScope('SERVICE'), serviceController.getAllServices);
router.get('/categories', authMiddleware, requireScope('SERVICE'), serviceController.getServiceCategories);
router.get('/gym/members', authMiddleware, requireScope('SERVICE'), checkAnyPermission('SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'), serviceController.getGymMembers);
router.put('/gym/members/:id', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_UPDATE'), serviceController.updateGymMember);
router.get('/pool/members', authMiddleware, requireScope('SERVICE'), checkAnyPermission('SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'), serviceController.getPoolMembers);
router.put('/pool/members/:id', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_UPDATE'), serviceController.updatePoolMember);
router.get('/wifi/members', authMiddleware, requireScope('SERVICE'), checkAnyPermission('SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'), serviceController.getWifiMembers);
router.put('/wifi/members/:id', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_UPDATE'), serviceController.updateWifiMember);
router.get('/:id', authMiddleware, requireScope('SERVICE'), serviceController.getServiceById);

// Dùng checkPermission
router.post('/', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_CREATE'), serviceController.createService);
router.put('/:id', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_UPDATE'), serviceController.updateService);
router.delete('/:id', authMiddleware, requireScope('SERVICE', { allOnly: true }), checkPermission('SERVICE_DELETE'), serviceController.deleteService);
router.post('/register', authMiddleware, requireScope('SERVICE'), checkAnyPermission('SERVICE_CREATE', 'SERVICE_REGISTRATION_CREATE'), requireResourceScope('SERVICE', 'contract', req => req.body.contractId), registrationController.registerService);
router.put('/unregister/:id', authMiddleware, requireScope('SERVICE'), checkAnyPermission('SERVICE_UPDATE', 'SERVICE_REGISTRATION_UPDATE'), requireResourceScope('SERVICE', 'registration', req => req.params.id), registrationController.unregisterService);

module.exports = router;
