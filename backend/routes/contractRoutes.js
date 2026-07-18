const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');

router.get('/', authMiddleware, contractController.getAllContracts);
router.get('/statuses', authMiddleware, contractController.getContractStatuses);
router.get('/:id', authMiddleware, contractController.getContractById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('CONTRACT_CREATE'), contractController.createContract);
router.put('/:id', authMiddleware, checkPermission('CONTRACT_UPDATE'), contractController.updateContract);
router.delete('/:id', authMiddleware, checkPermission('CONTRACT_DELETE'), contractController.deleteContract);

module.exports = router;