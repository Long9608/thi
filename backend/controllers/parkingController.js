// backend/controllers/parkingController.js
const parkingService = require('../services/parkingService');
const { getPool } = require('../config/db');
const { getAccessScope, getCurrentResidentId } = require('../utils/accessScope');

// =============================================
//  Helper xử lý lỗi
// =============================================
const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500
    ? 'Internal server error'
    : error.message || 'Something went wrong';
  res.status(statusCode).json({
    success: false,
    message
  });
};

// =============================================
//  1. Danh sách thẻ
// =============================================
exports.getParkingCards = async (req, res) => {
  try {
    const accessScope = getAccessScope(req, {
      viewAll: 'PARKING_VIEW_ALL',
      viewOwn: 'PARKING_VIEW_OWN',
      legacy: ['PARKING_VIEW']
    });
    if (accessScope === 'none') return res.status(403).json({ success: false, message: 'Bạn không có quyền xem bãi xe' });
    const filters = { ...req.query };
    if (accessScope === 'own') {
      filters.residentId = await getCurrentResidentId(await getPool(), req.userId);
      if (!filters.residentId) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tài khoản chưa liên kết cư dân' });
      }
    }
    const result = await parkingService.getParkingCards(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  2. Tạo / kích hoạt thẻ + đăng ký
// =============================================
exports.createOrActivateCardAndSubscription = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const result = await parkingService.createOrActivateCardAndSubscription(
      vehicleId,
      req.body,
      req.userId
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  3. Cập nhật thẻ + đăng ký
// =============================================
exports.updateCardAndSubscription = async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await parkingService.updateCardAndSubscription(
      cardId,
      req.body,
      req.userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  4. Kết thúc thẻ + đăng ký
// =============================================
exports.endCardAndSubscription = async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await parkingService.endCardAndSubscription(cardId, req.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  5. Danh sách vị trí đỗ
// =============================================
exports.getParkingSlots = async (req, res) => {
  try {
    const accessScope = getAccessScope(req, {
      viewAll: 'PARKING_VIEW_ALL',
      viewOwn: 'PARKING_VIEW_OWN',
      legacy: ['PARKING_VIEW']
    });
    if (accessScope === 'none') return res.status(403).json({ success: false, message: 'Bạn không có quyền xem bãi xe' });
    const filters = { ...req.query };
    if (accessScope === 'own') {
      filters.residentId = await getCurrentResidentId(await getPool(), req.userId);
      if (!filters.residentId) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tài khoản chưa liên kết cư dân' });
      }
    }
    const result = await parkingService.getParkingSlots(filters);
    res.json({ success: true, data: result.data });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  6. Tạo vị trí đỗ
// =============================================
exports.createParkingSlot = async (req, res) => {
  try {
    const result = await parkingService.createParkingSlot(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  7. Cập nhật vị trí đỗ
// =============================================
exports.updateParkingSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await parkingService.updateParkingSlot(slotId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  8. Xóa vị trí đỗ
// =============================================
exports.deleteParkingSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await parkingService.deleteParkingSlot(slotId);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  9. Ghi nhận sự kiện ra/vào
// =============================================
exports.recordAccessEvent = async (req, res) => {
  try {
    const result = await parkingService.recordAccessEvent(req.body, req.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error);
  }
};

// =============================================
//  10. Lịch sử ra/vào
// =============================================
exports.getParkingHistory = async (req, res) => {
  try {
    const accessScope = getAccessScope(req, {
      viewAll: 'PARKING_VIEW_ALL',
      viewOwn: 'PARKING_VIEW_OWN',
      legacy: ['PARKING_HISTORY']
    });
    if (accessScope === 'none') return res.status(403).json({ success: false, message: 'Bạn không có quyền xem bãi xe' });
    const filters = { ...req.query };
    if (accessScope === 'own') {
      filters.residentId = await getCurrentResidentId(await getPool(), req.userId);
      if (!filters.residentId) {
        return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tài khoản chưa liên kết cư dân' });
      }
    }
    const result = await parkingService.getParkingHistory(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
};