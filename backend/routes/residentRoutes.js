// backend/routes/residentRoutes.js
const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { authMiddleware, checkPermission } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, '../uploads/identity');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, req.params.id + '-' + req.body.type + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// ============================================
// RESIDENT CRUD
// ============================================
router.get('/', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.getResidents);
router.get('/:id', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.getResidentById);
router.post('/', authMiddleware, checkPermission('RESIDENT_CREATE'), residentController.createResident);
router.put('/:id', authMiddleware, checkPermission('RESIDENT_UPDATE'), residentController.updateResident);
router.delete('/:id', authMiddleware, checkPermission('RESIDENT_DELETE'), residentController.deleteResident);

// ============================================
// 🔥 CCCD / HỒ SƠ
// ============================================
router.get('/:id/identity', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.getResidentIdentity);
router.put('/:id/identity', authMiddleware, checkPermission('RESIDENT_UPDATE'), residentController.updateResidentIdentity);
router.post('/:id/identity/upload', 
    authMiddleware, 
    checkPermission('RESIDENT_UPDATE'),
    upload.single('image'),
    residentController.uploadIdentityImage
);

// ============================================
// 🔥 THÀNH VIÊN HỘ GIA ĐÌNH
// ============================================
router.get('/:id/family-members', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.getFamilyMembersDetail);
router.post('/:id/family', authMiddleware, checkPermission('RESIDENT_CREATE'), residentController.addFamilyMember);
router.put('/:id/family/:memberId', authMiddleware, checkPermission('RESIDENT_UPDATE'), residentController.updateFamilyMember);
router.delete('/:id/family/:memberId', authMiddleware, checkPermission('RESIDENT_DELETE'), residentController.removeFamilyMember);

// ============================================
// 🔥 LỊCH SỬ CƯ TRÚ
// ============================================
router.get('/:id/residence-history', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.getResidenceHistoryDetail);

// ============================================
// OTHER
// ============================================
router.get('/birthdays', authMiddleware, residentController.getResidentsByBirthday);
router.get('/export', authMiddleware, checkPermission('RESIDENT_VIEW'), residentController.exportResidents);

module.exports = router;