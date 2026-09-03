const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authMiddleware, checkRole, checkPermission } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/contracts');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `contract-${req.params.id}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

router.get('/', authMiddleware, contractController.getAllContracts);
router.get('/statuses', authMiddleware, contractController.getContractStatuses);
router.get('/:id', authMiddleware, contractController.getContractById);

// Dùng checkPermission
router.post('/', authMiddleware, checkPermission('CONTRACT_CREATE'), contractController.createContract);
router.post('/:id/signed-image', authMiddleware, checkPermission('CONTRACT_UPDATE'), upload.single('image'), contractController.uploadSignedContractImage);
router.put('/:id', authMiddleware, checkPermission('CONTRACT_UPDATE'), contractController.updateContract);
router.delete('/:id', authMiddleware, checkPermission('CONTRACT_DELETE'), contractController.deleteContract);

module.exports = router;
