// PARKING_SERVICE_FINAL_V3
// backend/services/parkingService.js
const { getPool, sql } = require('../config/db');

// =============================================
//  Helper: lỗi nghiệp vụ kèm statusCode
// =============================================
class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// =============================================
//  Helper: validate số nguyên dương
// =============================================
const validatePositiveInt = (value, name) => {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    throw new BusinessError(`${name} must be a positive integer`, 400);
  }
  return num;
};

// =============================================
//  Helper: chuẩn hóa phân trang
// =============================================
const normalizePagination = (page, limit) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  return { safePage, safeLimit, offset };
};

// =============================================
//  Helper: kiểm tra ngày hợp lệ và normalize về UTC 00:00:00
// =============================================
const validateDate = (dateStr, fieldName) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new BusinessError(`Invalid ${fieldName}`, 400);
  }
  // Normalize to UTC midnight
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// =============================================
//  Helper: chuẩn hóa ngày về UTC 00:00:00
// =============================================
const normalizeDateToUTC = (date) => {
  if (!date) return null;
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  if (isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

// =============================================
//  Helper: validate bit param (0, 1, true, false)
// =============================================
const validateBitParam = (value, name) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value ? 1 : 0;
  if (value === 'true') return 1;
  if (value === 'false') return 0;
  const num = parseInt(value);
  if (num === 0 || num === 1) return num;
  throw new BusinessError(`${name} must be 0, 1, true, or false`, 400);
};

// =============================================
//  Helper: xây dựng điều kiện WHERE và tham số
//  cho getParkingCards
// =============================================
const buildCardWhereClause = (filters, request) => {
  const { status, vehicleId, residentId, search } = filters;
  let where = ' WHERE 1=1';
  const statusVal = validateBitParam(status, 'status');
  if (statusVal !== undefined) {
    where += ' AND pc.Status = @Status';
    request.input('Status', sql.Bit, statusVal);
  }
  if (vehicleId) {
    const id = validatePositiveInt(vehicleId, 'vehicleId');
    where += ' AND pc.VehicleID = @VehicleID';
    request.input('VehicleID', sql.Int, id);
  }
  if (residentId) {
    const id = validatePositiveInt(residentId, 'residentId');
    where += ' AND v.ResidentID = @ResidentID';
    request.input('ResidentID', sql.Int, id);
  }
  if (search) {
    const pattern = `%${search}%`;
    where += ' AND (pc.CardCode LIKE @Search OR v.PlateNumber LIKE @Search OR r.FullName LIKE @Search)';
    request.input('Search', sql.NVarChar, pattern);
  }
  return where;
};

// =============================================
//  1. Lấy danh sách thẻ xe
// =============================================
exports.getParkingCards = async (filters = {}) => {
  const { page, limit } = filters;
  const { safePage, safeLimit, offset } = normalizePagination(page, limit);

  const pool = await getPool();

  // --- Query count ---
  const countReq = pool.request();
  const countWhere = buildCardWhereClause(filters, countReq);
  const countQuery = `
    SELECT COUNT(*) as total
    FROM dbo.ParkingCard pc
    INNER JOIN dbo.Vehicle v ON pc.VehicleID = v.VehicleID
    INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
    INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.ParkingSlot ps ON pc.SlotID = ps.SlotID
    LEFT JOIN dbo.ParkingSubscription sub ON sub.CardID = pc.CardID AND sub.Status = 'ACTIVE'
    LEFT JOIN dbo.Contract c ON sub.ContractID = c.ContractID
    LEFT JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
    ${countWhere}
  `;
  const countResult = await countReq.query(countQuery);
  const total = countResult.recordset[0]?.total || 0;

  // --- Query list ---
  const listReq = pool.request();
  const listWhere = buildCardWhereClause(filters, listReq);
  const listQuery = `
    SELECT
      pc.CardID,
      pc.CardCode,
      pc.IssueDate,
      pc.ExpiredDate,
      pc.Status AS CardStatus,
      v.VehicleID,
      v.PlateNumber,
      v.Brand,
      v.Color,
      vt.TypeName AS VehicleType,
      vt.MonthlyFee,
      r.ResidentID,
      r.FullName AS OwnerName,
      r.Phone AS OwnerPhone,
      c.ContractID,
      c.StartDate AS ContractStart,
      c.EndDate AS ContractEnd,
      a.ApartmentCode,
      ps.SlotID,
      ps.SlotNumber,
      ps.IsOccupied AS SlotOccupied,
      sub.ParkingSubscriptionID,
      sub.MonthlyFeeSnapshot,
      sub.StartDate AS SubStart,
      sub.EndDate AS SubEnd,
      sub.Status AS SubStatus
    FROM dbo.ParkingCard pc
    INNER JOIN dbo.Vehicle v ON pc.VehicleID = v.VehicleID
    INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
    INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.ParkingSlot ps ON pc.SlotID = ps.SlotID
    LEFT JOIN dbo.ParkingSubscription sub ON sub.CardID = pc.CardID AND sub.Status = 'ACTIVE'
    LEFT JOIN dbo.Contract c ON sub.ContractID = c.ContractID
    LEFT JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
    ${listWhere}
    ORDER BY pc.CardID DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY
  `;
  listReq.input('Offset', sql.Int, offset);
  listReq.input('Limit', sql.Int, safeLimit);

  const listResult = await listReq.query(listQuery);

  return {
    data: listResult.recordset || [],
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

// =============================================
//  2. Tạo mới / kích hoạt lại thẻ + đăng ký
// =============================================
exports.createOrActivateCardAndSubscription = async (vehicleId, payload, userId) => {
  const {
    contractId,
    cardCode,
    slotId,
    issueDate,
    expiredDate,
    startDate
  } = payload;

  // Validate các ID là số nguyên dương
  const vId = validatePositiveInt(vehicleId, 'vehicleId');
  const cId = validatePositiveInt(contractId, 'contractId');
  const sId = slotId ? validatePositiveInt(slotId, 'slotId') : null;

  // Xác định effectiveStartDate duy nhất
  const start = startDate ? validateDate(startDate, 'startDate') : null;
  const issue = issueDate ? validateDate(issueDate, 'issueDate') : null;

  if (start && issue && start.getTime() !== issue.getTime()) {
    throw new BusinessError('startDate and issueDate must be the same', 400);
  }
  let effectiveStart = start || issue || new Date();
  effectiveStart = normalizeDateToUTC(effectiveStart);

  // Xác định effectiveEnd (có thể null)
  let effectiveEnd = expiredDate ? validateDate(expiredDate, 'expiredDate') : null;
  if (effectiveEnd) effectiveEnd = normalizeDateToUTC(effectiveEnd);

  if (effectiveEnd && effectiveStart > effectiveEnd) {
    throw new BusinessError('Start date cannot be after end date', 400);
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    // 1. Lấy thông tin xe và loại xe
    const vehicleResult = await transaction.request()
      .input('VehicleID', sql.Int, vId)
      .query(`
        SELECT v.VehicleID, v.ResidentID, v.VehicleTypeID, v.Status AS VehicleStatus,
               vt.MonthlyFee
        FROM dbo.Vehicle v
        INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
        WHERE v.VehicleID = @VehicleID
      `);
    if (!vehicleResult.recordset[0]) {
      throw new BusinessError('Vehicle not found', 404);
    }
    const vehicle = vehicleResult.recordset[0];
    if (!vehicle.VehicleStatus) {
      throw new BusinessError('Vehicle is inactive', 400);
    }
    const monthlyFee = vehicle.MonthlyFee || 0;

    // 2. Kiểm tra hợp đồng và cư dân
    const contractResult = await transaction.request()
      .input('ContractID', sql.Int, cId)
      .input('ResidentID', sql.Int, vehicle.ResidentID)
      .query(`
        SELECT c.ContractID, c.StatusID, c.StartDate AS CStart, c.EndDate AS CEnd,
               cr.MoveInDate, cr.MoveOutDate
        FROM dbo.Contract c
        INNER JOIN dbo.ContractResident cr ON c.ContractID = cr.ContractID
        WHERE c.ContractID = @ContractID
          AND cr.ResidentID = @ResidentID
          AND c.StatusID IN (2, 5)
      `);
    if (!contractResult.recordset[0]) {
      throw new BusinessError('Invalid contract or resident not linked', 400);
    }
    const contract = contractResult.recordset[0];
    const cStart = normalizeDateToUTC(contract.CStart);
    const cEnd = contract.CEnd ? normalizeDateToUTC(contract.CEnd) : null;
    const moveIn = contract.MoveInDate ? normalizeDateToUTC(contract.MoveInDate) : null;
    const moveOut = contract.MoveOutDate ? normalizeDateToUTC(contract.MoveOutDate) : null;

    if (effectiveStart < cStart) throw new BusinessError('Start date before contract start', 400);
    if (cEnd && effectiveStart > cEnd) throw new BusinessError('Start date after contract end', 400);
    if (moveIn && effectiveStart < moveIn) throw new BusinessError('Start date before move-in', 400);
    if (moveOut && effectiveStart > moveOut) throw new BusinessError('Start date after move-out', 400);
    if (effectiveEnd) {
      if (effectiveEnd < cStart) throw new BusinessError('End date before contract start', 400);
      if (cEnd && effectiveEnd > cEnd) throw new BusinessError('End date after contract end', 400);
      if (moveIn && effectiveEnd < moveIn) throw new BusinessError('End date before move-in', 400);
      if (moveOut && effectiveEnd > moveOut) throw new BusinessError('End date after move-out', 400);
    }

    // 3. Kiểm tra subscription ACTIVE cho VehicleID hoặc CardID
    const activeSubVehicle = await transaction.request()
      .input('VehicleID', sql.Int, vId)
      .query(`
        SELECT ParkingSubscriptionID
        FROM dbo.ParkingSubscription WITH (UPDLOCK, HOLDLOCK)
        WHERE VehicleID = @VehicleID AND Status = 'ACTIVE'
      `);
    if (activeSubVehicle.recordset[0]) {
      throw new BusinessError('Vehicle already has an active subscription', 409);
    }

    const existingCard = await transaction.request()
      .input('VehicleID', sql.Int, vId)
      .query(`
        SELECT CardID, CardCode, Status, SlotID
        FROM dbo.ParkingCard WITH (UPDLOCK, HOLDLOCK)
        WHERE VehicleID = @VehicleID
      `);

    if (existingCard.recordset[0]) {
      const card = existingCard.recordset[0];
      const activeSubCard = await transaction.request()
        .input('CardID', sql.Int, card.CardID)
        .query(`
          SELECT ParkingSubscriptionID
          FROM dbo.ParkingSubscription WITH (UPDLOCK, HOLDLOCK)
          WHERE CardID = @CardID AND Status = 'ACTIVE'
        `);
      if (activeSubCard.recordset[0]) {
        throw new BusinessError('Card already has an active subscription', 409);
      }
    }

    // 4. Xử lý Slot (nếu có)
    let oldSlotId = null;
    if (sId) {
      const slotCheck = await transaction.request()
        .input('SlotID', sql.Int, sId)
        .input('VehicleTypeID', sql.Int, vehicle.VehicleTypeID)
        .query(`
          SELECT SlotID, IsOccupied
          FROM dbo.ParkingSlot WITH (UPDLOCK, HOLDLOCK)
          WHERE SlotID = @SlotID AND VehicleTypeID = @VehicleTypeID
        `);
      if (!slotCheck.recordset[0]) {
        throw new BusinessError('Parking slot not found or type mismatch', 400);
      }
      const slotOccupied = await transaction.request()
        .input('SlotID', sql.Int, sId)
        .query(`
          SELECT CardID
          FROM dbo.ParkingCard WITH (UPDLOCK, HOLDLOCK)
          WHERE SlotID = @SlotID AND Status = 1
        `);
      if (slotOccupied.recordset[0]) {
        throw new BusinessError('Parking slot is already occupied by another active card', 409);
      }
    }

    // 5. Xử lý thẻ
    let cardId = null;
    let finalCardCode = cardCode ? cardCode.trim().toUpperCase() : null;
    let oldCardCode = null;

    if (existingCard.recordset[0]) {
      const oldCard = existingCard.recordset[0];
      if (oldCard.Status) {
        throw new BusinessError('Vehicle already has an active card', 409);
      }
      cardId = oldCard.CardID;
      oldSlotId = oldCard.SlotID;
      oldCardCode = oldCard.CardCode;

      // Nếu không có cardCode mới, giữ card code cũ
      if (!finalCardCode) {
        finalCardCode = oldCardCode;
      }

      // Nếu có cardCode mới, kiểm tra không trùng với card khác
      if (finalCardCode && finalCardCode !== oldCardCode) {
        const dupCode = await transaction.request()
          .input('CardCode', sql.VarChar, finalCardCode)
          .input('ExcludeCardID', sql.Int, cardId)
          .query(`
            SELECT CardID
            FROM dbo.ParkingCard
            WHERE CardCode = @CardCode AND CardID != @ExcludeCardID
          `);
        if (dupCode.recordset[0]) {
          throw new BusinessError('Card code already exists', 400);
        }
      }

      // Nếu đổi slot, giải phóng slot cũ TRƯỚC
      if (oldSlotId && oldSlotId !== sId) {
        await transaction.request()
          .input('SlotID', sql.Int, oldSlotId)
          .query('UPDATE dbo.ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
      }

      // Cập nhật thẻ
      const updateFields = [];
      const req = transaction.request();
      req.input('CardID', sql.Int, cardId);

      if (finalCardCode) {
        updateFields.push('CardCode = @CardCode');
        req.input('CardCode', sql.VarChar, finalCardCode);
      }
      if (sId !== undefined) {
        updateFields.push('SlotID = @SlotID');
        req.input('SlotID', sql.Int, sId || null);
      }
      updateFields.push('IssueDate = @IssueDate');
      req.input('IssueDate', sql.Date, effectiveStart);
      updateFields.push('ExpiredDate = @ExpiredDate');
      req.input('ExpiredDate', sql.Date, effectiveEnd || null);
      updateFields.push('Status = 1');
      await req.query(`
        UPDATE dbo.ParkingCard
        SET ${updateFields.join(', ')}
        WHERE CardID = @CardID
      `);
    } else {
      // Tạo thẻ mới
      if (!finalCardCode) {
        const prefix = 'CARD';
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalCardCode = `${prefix}-${random}`;
      }
      const dupCode = await transaction.request()
        .input('CardCode', sql.VarChar, finalCardCode)
        .query('SELECT CardID FROM dbo.ParkingCard WHERE CardCode = @CardCode');
      if (dupCode.recordset[0]) {
        throw new BusinessError('Card code already exists', 400);
      }
      const insertCard = await transaction.request()
        .input('VehicleID', sql.Int, vId)
        .input('CardCode', sql.VarChar, finalCardCode)
        .input('SlotID', sql.Int, sId || null)
        .input('IssueDate', sql.Date, effectiveStart)
        .input('ExpiredDate', sql.Date, effectiveEnd || null)
        .input('Status', sql.Bit, 1)
        .query(`
          INSERT INTO dbo.ParkingCard (VehicleID, CardCode, SlotID, IssueDate, ExpiredDate, Status)
          OUTPUT INSERTED.CardID
          VALUES (@VehicleID, @CardCode, @SlotID, @IssueDate, @ExpiredDate, @Status)
        `);
      cardId = insertCard.recordset[0].CardID;
    }

    // 6. Tạo ParkingSubscription mới
    const insertSub = await transaction.request()
      .input('VehicleID', sql.Int, vId)
      .input('ContractID', sql.Int, cId)
      .input('CardID', sql.Int, cardId)
      .input('StartDate', sql.Date, effectiveStart)
      .input('EndDate', sql.Date, effectiveEnd || null)
      .input('MonthlyFeeSnapshot', sql.Decimal(18, 2), monthlyFee)
      .input('Status', sql.VarChar, 'ACTIVE')
      .input('CreatedByUserID', sql.Int, userId || null)
      .query(`
        INSERT INTO dbo.ParkingSubscription (
          VehicleID, ContractID, CardID, StartDate, EndDate,
          MonthlyFeeSnapshot, Status, CreatedByUserID, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.ParkingSubscriptionID
        VALUES (
          @VehicleID, @ContractID, @CardID, @StartDate, @EndDate,
          @MonthlyFeeSnapshot, @Status, @CreatedByUserID, SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `);
    const subscriptionId = insertSub.recordset[0].ParkingSubscriptionID;

    // 7. Cập nhật trạng thái slot mới (nếu có)
    if (sId) {
      await transaction.request()
        .input('SlotID', sql.Int, sId)
        .query('UPDATE dbo.ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
    }

    await transaction.commit();

    return {
      cardId,
      cardCode: finalCardCode,
      subscriptionId
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// =============================================
//  3. Cập nhật thẻ và đăng ký
// =============================================
exports.updateCardAndSubscription = async (cardId, payload, userId) => {
  const cId = validatePositiveInt(cardId, 'cardId');

  const hasSlot = Object.prototype.hasOwnProperty.call(payload, 'slotId');
  const hasExpired = Object.prototype.hasOwnProperty.call(payload, 'expiredDate');
  const hasIssue = Object.prototype.hasOwnProperty.call(payload, 'issueDate');

  const slotIdRaw = payload.slotId;
  const expiredDateRaw = payload.expiredDate;
  const issueDateRaw = payload.issueDate;

  const sId = hasSlot ? (slotIdRaw ? validatePositiveInt(slotIdRaw, 'slotId') : null) : undefined;

  let newIssue = null;
  let newExpired = null;

  if (hasIssue) {
    if (issueDateRaw === null || issueDateRaw === '') {
      throw new BusinessError('issueDate cannot be null or empty', 400);
    }
    newIssue = validateDate(issueDateRaw, 'issueDate');
    newIssue = normalizeDateToUTC(newIssue);
  }

  if (hasExpired) {
    if (expiredDateRaw === null || expiredDateRaw === '') {
      newExpired = null;
    } else {
      newExpired = validateDate(expiredDateRaw, 'expiredDate');
      newExpired = normalizeDateToUTC(newExpired);
    }
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    const cardResult = await transaction.request()
      .input('CardID', sql.Int, cId)
      .query(`
        SELECT CardID, VehicleID, SlotID AS OldSlot, Status
        FROM dbo.ParkingCard WITH (UPDLOCK, HOLDLOCK)
        WHERE CardID = @CardID
      `);
    if (!cardResult.recordset[0]) {
      throw new BusinessError('Parking card not found', 404);
    }
    const card = cardResult.recordset[0];
    if (!card.Status) {
      throw new BusinessError('Card is inactive, cannot update', 400);
    }

    const subResult = await transaction.request()
      .input('CardID', sql.Int, cId)
      .query(`
        SELECT ParkingSubscriptionID, ContractID, StartDate, EndDate, Status
        FROM dbo.ParkingSubscription WITH (UPDLOCK, HOLDLOCK)
        WHERE CardID = @CardID AND Status = 'ACTIVE'
      `);
    if (!subResult.recordset[0]) {
      throw new BusinessError('No active subscription for this card', 404);
    }
    const subscription = subResult.recordset[0];

    const vehicleRes = await transaction.request()
      .input('VehicleID', sql.Int, card.VehicleID)
      .query('SELECT ResidentID FROM dbo.Vehicle WHERE VehicleID = @VehicleID');
    if (!vehicleRes.recordset[0]) {
      throw new BusinessError('Vehicle not found', 404);
    }
    const residentId = vehicleRes.recordset[0].ResidentID;

    let newStart = subscription.StartDate;
    let newEnd = subscription.EndDate;
    if (hasIssue) {
      newStart = newIssue;
    }
    if (hasExpired) {
      newEnd = newExpired;
    }
    if (newStart && newEnd && newStart > newEnd) {
      throw new BusinessError('Start date cannot be after end date', 400);
    }

    const contractInfo = await transaction.request()
      .input('ContractID', sql.Int, subscription.ContractID)
      .input('ResidentID', sql.Int, residentId)
      .query(`
        SELECT c.StartDate AS CStart, c.EndDate AS CEnd,
               cr.MoveInDate, cr.MoveOutDate
        FROM dbo.Contract c
        INNER JOIN dbo.ContractResident cr ON c.ContractID = cr.ContractID
        WHERE c.ContractID = @ContractID
          AND cr.ResidentID = @ResidentID
          AND c.StatusID IN (2, 5)
      `);
    if (!contractInfo.recordset[0]) {
      throw new BusinessError('Contract not found or resident not linked', 404);
    }
    const cont = contractInfo.recordset[0];
    const cStart = normalizeDateToUTC(cont.CStart);
    const cEnd = cont.CEnd ? normalizeDateToUTC(cont.CEnd) : null;
    const moveIn = cont.MoveInDate ? normalizeDateToUTC(cont.MoveInDate) : null;
    const moveOut = cont.MoveOutDate ? normalizeDateToUTC(cont.MoveOutDate) : null;

    if (newStart < cStart) throw new BusinessError('Start date before contract start', 400);
    if (cEnd && newStart > cEnd) throw new BusinessError('Start date after contract end', 400);
    if (moveIn && newStart < moveIn) throw new BusinessError('Start date before move-in', 400);
    if (moveOut && newStart > moveOut) throw new BusinessError('Start date after move-out', 400);
    if (newEnd) {
      if (newEnd < cStart) throw new BusinessError('End date before contract start', 400);
      if (cEnd && newEnd > cEnd) throw new BusinessError('End date after contract end', 400);
      if (moveIn && newEnd < moveIn) throw new BusinessError('End date before move-in', 400);
      if (moveOut && newEnd > moveOut) throw new BusinessError('End date after move-out', 400);
    }

    let oldSlot = card.OldSlot;
    if (hasSlot && sId !== oldSlot) {
      if (sId) {
        const vType = await transaction.request()
          .input('VehicleID', sql.Int, card.VehicleID)
          .query('SELECT VehicleTypeID FROM dbo.Vehicle WHERE VehicleID = @VehicleID');
        if (!vType.recordset[0]) {
          throw new BusinessError('Vehicle not found', 404);
        }
        const vehicleTypeId = vType.recordset[0].VehicleTypeID;

        const slotCheck = await transaction.request()
          .input('SlotID', sql.Int, sId)
          .input('VehicleTypeID', sql.Int, vehicleTypeId)
          .query(`
            SELECT SlotID, IsOccupied
            FROM dbo.ParkingSlot WITH (UPDLOCK, HOLDLOCK)
            WHERE SlotID = @SlotID AND VehicleTypeID = @VehicleTypeID
          `);
        if (!slotCheck.recordset[0]) {
          throw new BusinessError('Slot not found or type mismatch', 400);
        }

        const otherCard = await transaction.request()
          .input('SlotID', sql.Int, sId)
          .input('ExcludeCardID', sql.Int, cId)
          .query(`
            SELECT CardID
            FROM dbo.ParkingCard WITH (UPDLOCK, HOLDLOCK)
            WHERE SlotID = @SlotID AND Status = 1 AND CardID != @ExcludeCardID
          `);
        if (otherCard.recordset[0]) {
          throw new BusinessError('Slot already occupied by another active card', 409);
        }
      }

      if (oldSlot) {
        await transaction.request()
          .input('SlotID', sql.Int, oldSlot)
          .query('UPDATE dbo.ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
      }

      await transaction.request()
        .input('CardID', sql.Int, cId)
        .input('SlotID', sql.Int, sId || null)
        .query('UPDATE dbo.ParkingCard SET SlotID = @SlotID WHERE CardID = @CardID');

      if (sId) {
        await transaction.request()
          .input('SlotID', sql.Int, sId)
          .query('UPDATE dbo.ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
      }
    }

    const updateCardFields = [];
    const updateSubFields = [];
    const reqCard = transaction.request();
    const reqSub = transaction.request();
    reqCard.input('CardID', sql.Int, cId);
    reqSub.input('CardID', sql.Int, cId);

    if (hasIssue) {
      updateCardFields.push('IssueDate = @IssueDate');
      reqCard.input('IssueDate', sql.Date, newStart);
      updateSubFields.push('StartDate = @StartDate');
      reqSub.input('StartDate', sql.Date, newStart);
    }
    if (hasExpired) {
      updateCardFields.push('ExpiredDate = @ExpiredDate');
      reqCard.input('ExpiredDate', sql.Date, newEnd);
      updateSubFields.push('EndDate = @EndDate');
      reqSub.input('EndDate', sql.Date, newEnd);
    }

    if (updateCardFields.length > 0) {
      await reqCard.query(`
        UPDATE dbo.ParkingCard
        SET ${updateCardFields.join(', ')}
        WHERE CardID = @CardID
      `);
    }
    if (updateSubFields.length > 0) {
      updateSubFields.push('UpdatedAt = SYSUTCDATETIME()');
      await reqSub.query(`
        UPDATE dbo.ParkingSubscription
        SET ${updateSubFields.join(', ')}
        WHERE CardID = @CardID AND Status = 'ACTIVE'
      `);
    }

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// =============================================
//  4. Kết thúc thẻ và đăng ký
// =============================================
exports.endCardAndSubscription = async (cardId, userId) => {
  const cId = validatePositiveInt(cardId, 'cardId');

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    const cardResult = await transaction.request()
      .input('CardID', sql.Int, cId)
      .query(`
        SELECT CardID, VehicleID, SlotID, Status
        FROM dbo.ParkingCard WITH (UPDLOCK, HOLDLOCK)
        WHERE CardID = @CardID
      `);
    if (!cardResult.recordset[0]) {
      throw new BusinessError('Parking card not found', 404);
    }
    const card = cardResult.recordset[0];
    if (!card.Status) {
      throw new BusinessError('Card is already inactive', 400);
    }

    const lastEvent = await transaction.request()
      .input('VehicleID', sql.Int, card.VehicleID)
      .query(`
        SELECT TOP 1 EventType
        FROM dbo.ParkingAccessLog
        WHERE VehicleID = @VehicleID
        ORDER BY EventTime DESC, AccessLogID DESC
      `);
    if (lastEvent.recordset[0] && lastEvent.recordset[0].EventType === 'IN') {
      throw new BusinessError('Vehicle is currently inside, please record OUT first', 409);
    }

    const subResult = await transaction.request()
      .input('CardID', sql.Int, cId)
      .query(`
        SELECT ParkingSubscriptionID, StartDate
        FROM dbo.ParkingSubscription WITH (UPDLOCK, HOLDLOCK)
        WHERE CardID = @CardID AND Status = 'ACTIVE'
      `);
    if (!subResult.recordset[0]) {
      throw new BusinessError('No active subscription found for this card', 404);
    }
    const sub = subResult.recordset[0];

    await transaction.request()
      .input('CardID', sql.Int, cId)
      .query('UPDATE dbo.ParkingCard SET Status = 0 WHERE CardID = @CardID');

    const now = new Date();
    const startDate = new Date(sub.StartDate);
    let endDate = now;
    if (startDate > now) {
      endDate = startDate;
    }
    await transaction.request()
      .input('CardID', sql.Int, cId)
      .input('EndDate', sql.Date, endDate)
      .query(`
        UPDATE dbo.ParkingSubscription
        SET Status = 'ENDED', EndDate = @EndDate, UpdatedAt = SYSUTCDATETIME()
        WHERE CardID = @CardID AND Status = 'ACTIVE'
      `);

    if (card.SlotID) {
      await transaction.request()
        .input('SlotID', sql.Int, card.SlotID)
        .query('UPDATE dbo.ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
    }

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// =============================================
//  5. Lấy danh sách vị trí đỗ
// =============================================
exports.getParkingSlots = async (filters = {}) => {
  const { areaId, vehicleTypeId, isOccupied } = filters;
  const pool = await getPool();
  let query = `
    SELECT
      ps.SlotID,
      ps.SlotNumber,
      ps.IsOccupied,
      ps.AreaID,
      ar.AreaName,
      vt.VehicleTypeID,
      vt.TypeName,
      v.PlateNumber,
      r.FullName AS OwnerName
    FROM dbo.ParkingSlot ps
    INNER JOIN dbo.VehicleType vt ON ps.VehicleTypeID = vt.VehicleTypeID
    INNER JOIN dbo.ApartmentArea ar ON ps.AreaID = ar.AreaID
    LEFT JOIN dbo.ParkingCard pc ON ps.SlotID = pc.SlotID AND pc.Status = 1
    LEFT JOIN dbo.Vehicle v ON pc.VehicleID = v.VehicleID
    LEFT JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    WHERE 1=1
  `;
  const request = pool.request();
  if (areaId) {
    const id = validatePositiveInt(areaId, 'areaId');
    query += ' AND ps.AreaID = @AreaID';
    request.input('AreaID', sql.Int, id);
  }
  if (vehicleTypeId) {
    const id = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
    query += ' AND ps.VehicleTypeID = @VehicleTypeID';
    request.input('VehicleTypeID', sql.Int, id);
  }
  const occVal = validateBitParam(isOccupied, 'isOccupied');
  if (occVal !== undefined) {
    query += ' AND ps.IsOccupied = @IsOccupied';
    request.input('IsOccupied', sql.Bit, occVal);
  }
  query += ' ORDER BY ps.SlotNumber';
  const result = await request.query(query);
  return { data: result.recordset || [] };
};

// =============================================
//  6. Tạo vị trí đỗ mới
// =============================================
exports.createParkingSlot = async (payload) => {
  const { areaId, slotNumber, vehicleTypeId } = payload;

  const aId = validatePositiveInt(areaId, 'areaId');
  const vtId = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
  if (!slotNumber || slotNumber.trim() === '') {
    throw new BusinessError('Slot number is required', 400);
  }
  const slotNum = slotNumber.trim().toUpperCase();

  const pool = await getPool();

  const areaCheck = await pool.request()
    .input('AreaID', sql.Int, aId)
    .query('SELECT AreaID FROM dbo.ApartmentArea WHERE AreaID = @AreaID');
  if (!areaCheck.recordset[0]) {
    throw new BusinessError('Apartment area not found', 404);
  }

  const vtCheck = await pool.request()
    .input('VehicleTypeID', sql.Int, vtId)
    .query('SELECT VehicleTypeID FROM dbo.VehicleType WHERE VehicleTypeID = @VehicleTypeID');
  if (!vtCheck.recordset[0]) {
    throw new BusinessError('Vehicle type not found', 404);
  }

  const dupCheck = await pool.request()
    .input('AreaID', sql.Int, aId)
    .input('SlotNumber', sql.VarChar, slotNum)
    .query('SELECT SlotID FROM dbo.ParkingSlot WHERE AreaID = @AreaID AND SlotNumber = @SlotNumber');
  if (dupCheck.recordset[0]) {
    throw new BusinessError('Slot number already exists in this area', 409);
  }

  const result = await pool.request()
    .input('AreaID', sql.Int, aId)
    .input('SlotNumber', sql.VarChar, slotNum)
    .input('VehicleTypeID', sql.Int, vtId)
    .input('IsOccupied', sql.Bit, 0)
    .query(`
      INSERT INTO dbo.ParkingSlot (AreaID, SlotNumber, VehicleTypeID, IsOccupied)
      OUTPUT INSERTED.SlotID
      VALUES (@AreaID, @SlotNumber, @VehicleTypeID, @IsOccupied)
    `);
  return { slotId: result.recordset[0].SlotID };
};

// =============================================
//  7. Cập nhật vị trí đỗ
// =============================================
exports.updateParkingSlot = async (slotId, payload) => {
  const { slotNumber, vehicleTypeId } = payload;

  const sId = validatePositiveInt(slotId, 'slotId');
  const pool = await getPool();

  const slotResult = await pool.request()
    .input('SlotID', sql.Int, sId)
    .query(`
      SELECT SlotID, AreaID, SlotNumber, VehicleTypeID, IsOccupied
      FROM dbo.ParkingSlot
      WHERE SlotID = @SlotID
    `);
  if (!slotResult.recordset[0]) {
    throw new BusinessError('Parking slot not found', 404);
  }
  const slot = slotResult.recordset[0];

  const updates = [];
  const request = pool.request();
  request.input('SlotID', sql.Int, sId);

  if (slotNumber) {
    const newSlotNum = slotNumber.trim().toUpperCase();
    const dupCheck = await pool.request()
      .input('AreaID', sql.Int, slot.AreaID)
      .input('SlotNumber', sql.VarChar, newSlotNum)
      .input('ExcludeSlotID', sql.Int, sId)
      .query(`
        SELECT SlotID
        FROM dbo.ParkingSlot
        WHERE AreaID = @AreaID AND SlotNumber = @SlotNumber AND SlotID != @ExcludeSlotID
      `);
    if (dupCheck.recordset[0]) {
      throw new BusinessError('Slot number already exists in this area', 409);
    }
    updates.push('SlotNumber = @SlotNumber');
    request.input('SlotNumber', sql.VarChar, newSlotNum);
  }

  if (vehicleTypeId !== undefined) {
    const vtId = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
    const activeCard = await pool.request()
      .input('SlotID', sql.Int, sId)
      .query('SELECT CardID FROM dbo.ParkingCard WHERE SlotID = @SlotID AND Status = 1');
    if (activeCard.recordset[0]) {
      throw new BusinessError('Cannot change vehicle type because slot is currently occupied', 409);
    }
    const vtCheck = await pool.request()
      .input('VehicleTypeID', sql.Int, vtId)
      .query('SELECT VehicleTypeID FROM dbo.VehicleType WHERE VehicleTypeID = @VehicleTypeID');
    if (!vtCheck.recordset[0]) {
      throw new BusinessError('Vehicle type not found', 404);
    }
    updates.push('VehicleTypeID = @VehicleTypeID');
    request.input('VehicleTypeID', sql.Int, vtId);
  }

  if (updates.length === 0) {
    throw new BusinessError('No fields to update', 400);
  }

  const result = await request.query(`
    UPDATE dbo.ParkingSlot
    SET ${updates.join(', ')}
    WHERE SlotID = @SlotID
  `);
  if (result.rowsAffected[0] === 0) {
    throw new BusinessError('Parking slot not found', 404);
  }
  return { success: true };
};

// =============================================
//  8. Xóa vị trí đỗ
// =============================================
exports.deleteParkingSlot = async (slotId) => {
  const sId = validatePositiveInt(slotId, 'slotId');
  const pool = await getPool();

  const cardRef = await pool.request()
    .input('SlotID', sql.Int, sId)
    .query('SELECT CardID FROM dbo.ParkingCard WHERE SlotID = @SlotID');
  if (cardRef.recordset[0]) {
    throw new BusinessError('Cannot delete slot because it is referenced by a parking card', 409);
  }

  const logRef = await pool.request()
    .input('SlotID', sql.Int, sId)
    .query('SELECT AccessLogID FROM dbo.ParkingAccessLog WHERE SlotID = @SlotID');
  if (logRef.recordset[0]) {
    throw new BusinessError('Cannot delete slot because it is referenced by access logs', 409);
  }

  const result = await pool.request()
    .input('SlotID', sql.Int, sId)
    .query('DELETE FROM dbo.ParkingSlot WHERE SlotID = @SlotID');
  if (result.rowsAffected[0] === 0) {
    throw new BusinessError('Parking slot not found', 404);
  }
  return { success: true };
};

// =============================================
//  9. Ghi nhận sự kiện ra/vào
// =============================================
exports.recordAccessEvent = async (payload, userId) => {
  let { cardCode, eventType, gateName, note } = payload;

  if (!cardCode) throw new BusinessError('Card code is required', 400);
  cardCode = cardCode.trim().toUpperCase();
  if (!eventType) throw new BusinessError('Event type is required', 400);
  eventType = eventType.trim().toUpperCase();
  if (!['IN', 'OUT'].includes(eventType)) {
    throw new BusinessError('Event type must be IN or OUT', 400);
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    const cardQuery = `
      SELECT
        pc.CardID,
        pc.VehicleID,
        pc.CardCode,
        pc.SlotID,
        pc.IssueDate,
        pc.ExpiredDate,
        pc.Status AS CardStatus,
        v.Status AS VehicleStatus,
        v.PlateNumber,
        v.VehicleTypeID,
        sub.ParkingSubscriptionID,
        sub.Status AS SubStatus,
        sub.StartDate AS SubStart,
        sub.EndDate AS SubEnd
      FROM dbo.ParkingCard pc WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.Vehicle v ON pc.VehicleID = v.VehicleID
      LEFT JOIN dbo.ParkingSubscription sub ON sub.CardID = pc.CardID AND sub.Status = 'ACTIVE'
      WHERE pc.CardCode = @CardCode
    `;
    const cardResult = await transaction.request()
      .input('CardCode', sql.VarChar, cardCode)
      .query(cardQuery);

    if (!cardResult.recordset[0]) {
      throw new BusinessError('Card not found', 404);
    }
    const card = cardResult.recordset[0];

    if (!card.CardStatus) {
      throw new BusinessError('Card is not active', 400);
    }
    if (!card.VehicleStatus) {
      throw new BusinessError('Vehicle is not active', 400);
    }
    if (!card.ParkingSubscriptionID) {
      throw new BusinessError('No active subscription for this card', 400);
    }
    if (card.SubStatus !== 'ACTIVE') {
      throw new BusinessError('Subscription is not active', 400);
    }

    const todaySql = await transaction.request()
      .query("SELECT CAST(SYSUTCDATETIME() AS date) AS Today");
    const today = todaySql.recordset[0].Today;

    const dateCheck = await transaction.request()
      .input('CardID', sql.Int, card.CardID)
      .input('Today', sql.Date, today)
      .query(`
        SELECT
          CASE WHEN IssueDate IS NOT NULL AND IssueDate > @Today THEN 1 ELSE 0 END AS IssueInFuture,
          CASE WHEN ExpiredDate IS NOT NULL AND ExpiredDate < @Today THEN 1 ELSE 0 END AS Expired,
          CASE WHEN sub.StartDate IS NOT NULL AND sub.StartDate > @Today THEN 1 ELSE 0 END AS SubNotStarted,
          CASE WHEN sub.EndDate IS NOT NULL AND sub.EndDate < @Today THEN 1 ELSE 0 END AS SubEnded
        FROM dbo.ParkingCard pc
        LEFT JOIN dbo.ParkingSubscription sub ON sub.CardID = pc.CardID AND sub.Status = 'ACTIVE'
        WHERE pc.CardID = @CardID
      `);
    const check = dateCheck.recordset[0];
    if (check.IssueInFuture) throw new BusinessError('Card not yet valid', 400);
    if (check.Expired) throw new BusinessError('Card has expired', 400);
    if (check.SubNotStarted) throw new BusinessError('Subscription not yet started', 400);
    if (check.SubEnded) throw new BusinessError('Subscription has expired', 400);

    const lastEventQuery = `
      SELECT TOP 1 EventType
      FROM dbo.ParkingAccessLog WITH (UPDLOCK, HOLDLOCK)
      WHERE VehicleID = @VehicleID
      ORDER BY EventTime DESC, AccessLogID DESC
    `;
    const lastResult = await transaction.request()
      .input('VehicleID', sql.Int, card.VehicleID)
      .query(lastEventQuery);
    const lastEvent = lastResult.recordset[0];

    if (!lastEvent) {
      if (eventType === 'OUT') {
        throw new BusinessError('First event must be IN', 400);
      }
    } else {
      if (lastEvent.EventType === 'IN' && eventType === 'IN') {
        throw new BusinessError('Vehicle is already inside, cannot record IN again', 409);
      }
      if (lastEvent.EventType === 'OUT' && eventType === 'OUT') {
        throw new BusinessError('Vehicle is already outside, cannot record OUT again', 409);
      }
    }

    const insertLog = await transaction.request()
      .input('ParkingSubscriptionID', sql.Int, card.ParkingSubscriptionID)
      .input('VehicleID', sql.Int, card.VehicleID)
      .input('CardID', sql.Int, card.CardID)
      .input('SlotID', sql.Int, card.SlotID || null)
      .input('EventType', sql.VarChar, eventType)
      .input('PlateNumberSnapshot', sql.VarChar, card.PlateNumber)
      .input('CardCodeSnapshot', sql.VarChar, card.CardCode)
      .input('GateName', sql.NVarChar, gateName || null)
      .input('Note', sql.NVarChar, note || null)
      .input('RecordedByUserID', sql.Int, userId || null)
      .query(`
        INSERT INTO dbo.ParkingAccessLog (
          ParkingSubscriptionID, VehicleID, CardID, SlotID,
          EventType, EventTime, PlateNumberSnapshot, CardCodeSnapshot,
          GateName, Note, RecordedByUserID
        )
        OUTPUT INSERTED.AccessLogID, INSERTED.EventTime, INSERTED.EventType,
               INSERTED.PlateNumberSnapshot, INSERTED.CardCodeSnapshot,
               INSERTED.GateName, INSERTED.Note
        VALUES (
          @ParkingSubscriptionID, @VehicleID, @CardID, @SlotID,
          @EventType, SYSUTCDATETIME(), @PlateNumberSnapshot, @CardCodeSnapshot,
          @GateName, @Note, @RecordedByUserID
        )
      `);

    const logRecord = insertLog.recordset[0];
    await transaction.commit();
    return logRecord;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// =============================================
//  10. Lấy lịch sử ra/vào
// =============================================
exports.getParkingHistory = async (filters = {}) => {
  const { search, dateFrom, dateTo, eventType, page, limit } = filters;
  const { safePage, safeLimit, offset } = normalizePagination(page, limit);

  let evtType = null;
  if (eventType) {
    evtType = eventType.trim().toUpperCase();
    if (!['IN', 'OUT'].includes(evtType)) {
      throw new BusinessError('eventType must be IN or OUT', 400);
    }
  }

  const pool = await getPool();

  const buildWhereAndParams = (req) => {
    let where = ' WHERE 1=1';
    if (search) {
      const pattern = `%${search}%`;
      where += ' AND (al.PlateNumberSnapshot LIKE @Search OR al.CardCodeSnapshot LIKE @Search OR r.FullName LIKE @Search)';
      req.input('Search', sql.NVarChar, pattern);
    }
    if (dateFrom) {
      const d = validateDate(dateFrom, 'dateFrom');
      where += ' AND al.EventTime >= @DateFrom';
      req.input('DateFrom', sql.DateTime2, d);
    }
    if (dateTo) {
      const d = validateDate(dateTo, 'dateTo');
      where += ' AND al.EventTime < DATEADD(day, 1, @DateTo)';
      req.input('DateTo', sql.Date, d);
    }
    if (evtType) {
      where += ' AND al.EventType = @EventType';
      req.input('EventType', sql.VarChar, evtType);
    }
    return where;
  };

  const listReq = pool.request();
  const listWhere = buildWhereAndParams(listReq);
  const listQuery = `
    SELECT
      al.AccessLogID,
      al.EventType,
      al.EventTime,
      al.PlateNumberSnapshot,
      al.CardCodeSnapshot,
      al.GateName,
      al.Note,
      al.RecordedByUserID,
      u.Username AS RecordedBy,
      v.VehicleID,
      v.Brand,
      v.Color,
      vt.TypeName AS VehicleType,
      r.FullName AS OwnerName,
      r.Phone AS OwnerPhone,
      a.ApartmentCode,
      ps.SlotNumber,
      sub.ParkingSubscriptionID
    FROM dbo.ParkingAccessLog al
    INNER JOIN dbo.ParkingSubscription sub ON al.ParkingSubscriptionID = sub.ParkingSubscriptionID
    INNER JOIN dbo.Vehicle v ON al.VehicleID = v.VehicleID
    INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
    INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.Contract c ON sub.ContractID = c.ContractID
    LEFT JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
    LEFT JOIN dbo.ParkingSlot ps ON al.SlotID = ps.SlotID
    LEFT JOIN dbo.Users u ON al.RecordedByUserID = u.UserID
    ${listWhere}
    ORDER BY al.EventTime DESC, al.AccessLogID DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY
  `;
  listReq.input('Offset', sql.Int, offset);
  listReq.input('Limit', sql.Int, safeLimit);
  const listResult = await listReq.query(listQuery);

  const countReq = pool.request();
  const countWhere = buildWhereAndParams(countReq);
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM dbo.ParkingAccessLog al
    INNER JOIN dbo.ParkingSubscription sub ON al.ParkingSubscriptionID = sub.ParkingSubscriptionID
    INNER JOIN dbo.Vehicle v ON al.VehicleID = v.VehicleID
    INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.Contract c ON sub.ContractID = c.ContractID
    LEFT JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
    ${countWhere}
  `;
  const countResult = await countReq.query(countQuery);
  const total = countResult.recordset[0]?.total || 0;

  const statsReq = pool.request();
  const statsWhere = buildWhereAndParams(statsReq);
  const statsQuery = `
    SELECT
      COUNT(*) AS totalEvents,
      COALESCE(SUM(CASE WHEN al.EventType = 'IN' THEN 1 ELSE 0 END), 0) AS entries,
      COALESCE(SUM(CASE WHEN al.EventType = 'OUT' THEN 1 ELSE 0 END), 0) AS exits
    FROM dbo.ParkingAccessLog al
    INNER JOIN dbo.ParkingSubscription sub ON al.ParkingSubscriptionID = sub.ParkingSubscriptionID
    INNER JOIN dbo.Vehicle v ON al.VehicleID = v.VehicleID
    INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
    LEFT JOIN dbo.Contract c ON sub.ContractID = c.ContractID
    LEFT JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
    ${statsWhere}
  `;
  const statsResult = await statsReq.query(statsQuery);
  const stats = statsResult.recordset[0] || { totalEvents: 0, entries: 0, exits: 0 };

  const insideQuery = `
    WITH LastEvents AS (
      SELECT
        VehicleID,
        EventType,
        ROW_NUMBER() OVER (PARTITION BY VehicleID ORDER BY EventTime DESC, AccessLogID DESC) AS rn
      FROM dbo.ParkingAccessLog
    )
    SELECT COUNT(*) AS inside
    FROM LastEvents
    WHERE rn = 1 AND EventType = 'IN'
  `;
  const insideResult = await pool.request().query(insideQuery);
  stats.insideNow = insideResult.recordset[0]?.inside || 0;

  return {
    data: listResult.recordset || [],
    stats,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};