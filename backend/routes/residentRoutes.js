const { requireScope, requireResourceScope } = require('../utils/accessScope');
// backend/routes/residentRoutes.js
const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/auth');
const { requireResidentSelf } = require('../utils/accessScope');
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
router.get('/', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'), residentController.getResidents);
// Static routes must precede /:id so they are never parsed as an ID.
router.get('/birthdays', authMiddleware, requireScope('RESIDENT'), checkPermission('RESIDENT_VIEW_ALL'), residentController.getResidentsByBirthday);
router.get('/export', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_EXPORT', 'RESIDENT_VIEW_ALL'), residentController.exportResidents);

router.post('/', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_CREATE'), residentController.createResident);

// ============================================
// 🔥 CCCD / HỒ SƠ
// ============================================
router.get('/:id/identity', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'), requireResidentSelf, residentController.getResidentIdentity);
router.put('/:id/identity', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_UPDATE'), requireResidentSelf, residentController.updateResidentIdentity);
router.post('/:id/identity/upload', 
    authMiddleware, 
    checkPermission('RESIDENT_UPDATE'),
    requireScope('RESIDENT', { allOnly: true }),
    requireResidentSelf,
    upload.single('image'),
    residentController.uploadIdentityImage
);

// ============================================
// 🔥 THÀNH VIÊN HỘ GIA ĐÌNH
// ============================================
router.get('/:id/family', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'), requireResidentSelf, residentController.getFamilyMembersDetail);
router.post('/:id/family', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_CREATE'), requireResidentSelf, residentController.addFamilyMember);
router.put('/:id/family/:memberId', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_UPDATE'), requireResidentSelf, residentController.updateFamilyMember);
router.delete('/:id/family/:memberId', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_DELETE'), requireResidentSelf, residentController.removeFamilyMember);

// ============================================
// 🔥 LỊCH SỬ CƯ TRÚ
// ============================================
router.get('/:id/residence-history', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'), requireResidentSelf, residentController.getResidenceHistoryDetail);

router.get('/:id', authMiddleware, requireScope('RESIDENT'), checkAnyPermission('RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'), requireResidentSelf, residentController.getResidentById);
router.put('/:id', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_UPDATE'), requireResidentSelf, residentController.updateResident);
router.delete('/:id', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_DELETE'), requireResidentSelf, residentController.deleteResident);
router.delete('/:id/permanent', authMiddleware, requireScope('RESIDENT', { allOnly: true }), checkPermission('RESIDENT_DELETE'), requireResidentSelf, residentController.permanentDeleteResident);

module.exports = router;
