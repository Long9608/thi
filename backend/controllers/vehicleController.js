// backend/controllers/vehicleController.js
const { getPool, sql } = require('../config/db');
const { getAccessScope, getCurrentResidentId } = require('../utils/accessScope');

class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const validatePositiveInt = (value, name) => {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    throw new BusinessError(`${name} must be a positive integer`, 400);
  }
  return num;
};

const normalizePagination = (page, limit) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  return { safePage, safeLimit, offset };
};

const normalizePlate = (plate) => {
  if (!plate) return null;
  return plate.trim().toUpperCase();
};

const validateBitParam = (value, name) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value ? 1 : 0;
  if (value === 'true') return 1;
  if (value === 'false') return 0;
  const num = parseInt(value);
  if (num === 0 || num === 1) return num;
  throw new BusinessError(`${name} must be 0, 1, true, or false`, 400);
};

const buildVehicleWhere = (filters, request) => {
  const { residentId, vehicleTypeId, status, search } = filters;
  let where = ' WHERE 1=1';
  if (residentId) {
    const id = validatePositiveInt(residentId, 'residentId');
    where += ' AND v.ResidentID = @ResidentID';
    request.input('ResidentID', sql.Int, id);
  }
  if (vehicleTypeId) {
    const id = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
    where += ' AND v.VehicleTypeID = @VehicleTypeID';
    request.input('VehicleTypeID', sql.Int, id);
  }
  if (status !== undefined && status !== '') {
    const stat = validateBitParam(status, 'status');
    if (stat === undefined) {
      throw new BusinessError('status must be 0, 1, true, or false', 400);
    }
    where += ' AND v.Status = @Status';
    request.input('Status', sql.Bit, stat);
  }
  if (search) {
    const pattern = `%${search}%`;
    where += ' AND (v.PlateNumber LIKE @Search OR v.Brand LIKE @Search OR r.FullName LIKE @Search)';
    request.input('Search', sql.NVarChar, pattern);
  }
  return where;
};

// =============================================
//  1. Lấy danh sách xe
// =============================================
exports.getAllVehicles = async (req, res) => {
  try {
    const { page, limit, ...filters } = req.query;
    const { safePage, safeLimit, offset } = normalizePagination(page, limit);

    const pool = await getPool();
    const accessScope = getAccessScope(req, {
      viewAll: 'VEHICLE_VIEW_ALL',
      viewOwn: 'VEHICLE_VIEW_OWN',
      legacy: ['VEHICLE_VIEW', 'PARKING_VIEW']
    });
    if (accessScope === 'none') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phương tiện' });
    }
    if (accessScope === 'own') {
      const currentResidentId = await getCurrentResidentId(pool, req.userId);
      if (!currentResidentId) {
        return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
      }
      filters.residentId = currentResidentId;
    }
    const parkingSubscriptionExists = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL THEN 0 ELSE 1 END AS HasParkingSubscription;
    `);
    const hasParkingSubscription = !!parkingSubscriptionExists.recordset[0]?.HasParkingSubscription;

    // Count
    const countReq = pool.request();
    const countWhere = buildVehicleWhere(filters, countReq);
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dbo.Vehicle v
      INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
      ${countWhere}
    `;
    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    // List
    const listReq = pool.request();
    const listWhere = buildVehicleWhere(filters, listReq);
    const parkingSelect = hasParkingSubscription ? `
        sub.ParkingSubscriptionID,
        sub.MonthlyFeeSnapshot,
        sub.StartDate AS SubStart,
        sub.EndDate AS SubEnd,
        sub.Status AS SubStatus,
        pc.CardID,
        pc.CardCode,
        pc.IssueDate AS CardIssueDate,
        pc.ExpiredDate AS CardExpiredDate,
        pc.Status AS CardStatus,
        ps.SlotID,
        ps.SlotNumber,
        ps.IsOccupied AS SlotOccupied
    ` : `
        NULL AS ParkingSubscriptionID,
        NULL AS MonthlyFeeSnapshot,
        NULL AS SubStart,
        NULL AS SubEnd,
        NULL AS SubStatus,
        NULL AS CardID,
        NULL AS CardCode,
        NULL AS CardIssueDate,
        NULL AS CardExpiredDate,
        NULL AS CardStatus,
        NULL AS SlotID,
        NULL AS SlotNumber,
        NULL AS SlotOccupied
    `;
    const parkingJoins = hasParkingSubscription ? `
      LEFT JOIN dbo.ParkingSubscription sub ON sub.VehicleID = v.VehicleID AND sub.Status = 'ACTIVE'
      LEFT JOIN dbo.ParkingCard pc ON sub.CardID = pc.CardID AND pc.Status = 1
      LEFT JOIN dbo.ParkingSlot ps ON pc.SlotID = ps.SlotID
    ` : '';
    const listQuery = `
      SELECT
        v.VehicleID,
        v.PlateNumber,
        v.Brand,
        v.Color,
        v.RegisterDate,
        v.Status,
        vt.TypeName AS VehicleType,
        vt.VehicleTypeID,
        r.ResidentID,
        r.FullName AS OwnerName,
        r.Phone AS OwnerPhone,
        r.Address AS OwnerAddress,
        c.ContractID,
        c.ContractNumber,
        c.ApartmentCode,
        ${parkingSelect}
      FROM dbo.Vehicle v
      INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
      INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
      OUTER APPLY (
        SELECT TOP 1
          c.ContractID,
          c.ContractNumber,
          a.ApartmentCode
        FROM dbo.ContractResident cr
        INNER JOIN dbo.Contract c ON cr.ContractID = c.ContractID
        INNER JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
        WHERE cr.ResidentID = r.ResidentID
          AND c.StatusID IN (2, 5)
          AND c.StartDate <= CAST(GETDATE() AS date)
          AND (c.EndDate IS NULL OR c.EndDate >= CAST(GETDATE() AS date))
          AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date))
          AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))
        ORDER BY
          CASE WHEN c.StatusID = 2 THEN 0 ELSE 1 END,
          c.StartDate DESC,
          c.ContractID DESC
      ) c
      ${parkingJoins}
      ${listWhere}
      ORDER BY v.VehicleID DESC
      OFFSET @Offset ROWS
      FETCH NEXT @Limit ROWS ONLY
    `;
    listReq.input('Offset', sql.Int, offset);
    listReq.input('Limit', sql.Int, safeLimit);

    const listResult = await listReq.query(listQuery);

    res.json({
      success: true,
      data: listResult.recordset || [],
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;
    res.status(statusCode).json({ success: false, message });
  }
};

// =============================================
//  2. Lấy chi tiết xe theo ID
// =============================================
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicleId = validatePositiveInt(id, 'vehicleId');

    const pool = await getPool();
    const accessScope = getAccessScope(req, {
      viewAll: 'VEHICLE_VIEW_ALL',
      viewOwn: 'VEHICLE_VIEW_OWN',
      legacy: ['VEHICLE_VIEW', 'PARKING_VIEW']
    });
    if (accessScope === 'none') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phương tiện' });
    }
    const parkingSubscriptionExists = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL THEN 0 ELSE 1 END AS HasParkingSubscription;
    `);
    const hasParkingSubscription = !!parkingSubscriptionExists.recordset[0]?.HasParkingSubscription;
    const parkingSelect = hasParkingSubscription ? `
          sub.ParkingSubscriptionID,
          sub.MonthlyFeeSnapshot,
          sub.StartDate AS SubStart,
          sub.EndDate AS SubEnd,
          sub.Status AS SubStatus,
          pc.CardID,
          pc.CardCode,
          pc.IssueDate AS CardIssueDate,
          pc.ExpiredDate AS CardExpiredDate,
          pc.Status AS CardStatus,
          ps.SlotID,
          ps.SlotNumber,
          ps.IsOccupied AS SlotOccupied
    ` : `
          NULL AS ParkingSubscriptionID,
          NULL AS MonthlyFeeSnapshot,
          NULL AS SubStart,
          NULL AS SubEnd,
          NULL AS SubStatus,
          NULL AS CardID,
          NULL AS CardCode,
          NULL AS CardIssueDate,
          NULL AS CardExpiredDate,
          NULL AS CardStatus,
          NULL AS SlotID,
          NULL AS SlotNumber,
          NULL AS SlotOccupied
    `;
    const parkingJoins = hasParkingSubscription ? `
        LEFT JOIN dbo.ParkingSubscription sub ON sub.VehicleID = v.VehicleID AND sub.Status = 'ACTIVE'
        LEFT JOIN dbo.ParkingCard pc ON sub.CardID = pc.CardID AND pc.Status = 1
        LEFT JOIN dbo.ParkingSlot ps ON pc.SlotID = ps.SlotID
    ` : '';
    const currentResidentId = accessScope === 'own' ? await getCurrentResidentId(pool, req.userId) : null;
    if (accessScope === 'own' && !currentResidentId) {
      return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
    }
    const result = await pool.request()
      .input('VehicleID', sql.Int, vehicleId)
      .input('CurrentResidentID', sql.Int, currentResidentId || 0)
      .query(`
        SELECT
          v.VehicleID,
          v.PlateNumber,
          v.Brand,
          v.Color,
          v.RegisterDate,
          v.Status,
          vt.TypeName AS VehicleType,
          vt.VehicleTypeID,
          r.ResidentID,
          r.FullName AS OwnerName,
          r.Phone AS OwnerPhone,
          r.Email AS OwnerEmail,
          r.Address AS OwnerAddress,
          c.ContractID,
          c.ContractNumber,
          c.ApartmentCode,
          ${parkingSelect}
        FROM dbo.Vehicle v
        INNER JOIN dbo.VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
        INNER JOIN dbo.Resident r ON v.ResidentID = r.ResidentID
        OUTER APPLY (
          SELECT TOP 1
            c.ContractID,
            c.ContractNumber,
            a.ApartmentCode
          FROM dbo.ContractResident cr
          INNER JOIN dbo.Contract c ON cr.ContractID = c.ContractID
          INNER JOIN dbo.Apartment a ON c.ApartmentID = a.ApartmentID
          WHERE cr.ResidentID = r.ResidentID
            AND c.StatusID IN (2, 5)
            AND c.StartDate <= CAST(GETDATE() AS date)
            AND (c.EndDate IS NULL OR c.EndDate >= CAST(GETDATE() AS date))
            AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date))
            AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))
          ORDER BY
            CASE WHEN c.StatusID = 2 THEN 0 ELSE 1 END,
            c.StartDate DESC,
            c.ContractID DESC
        ) c
        ${parkingJoins}
        WHERE v.VehicleID = @VehicleID
          ${accessScope === 'own' ? 'AND v.ResidentID = @CurrentResidentID' : ''}
      `);

    if (!result.recordset[0]) {
      throw new BusinessError('Vehicle not found', 404);
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;
    res.status(statusCode).json({ success: false, message });
  }
};

// =============================================
//  3. Tạo xe mới (chỉ INSERT Vehicle)
// =============================================
exports.createVehicle = async (req, res) => {
  try {
    const { residentId: requestedResidentId, plateNumber, vehicleTypeId, brand, color } = req.body;

    const pool = await getPool();
    const accessScope = getAccessScope(req, { viewAll: 'VEHICLE_VIEW_ALL', viewOwn: 'VEHICLE_VIEW_OWN' });
    if (accessScope === 'none') throw new BusinessError('Bạn không có quyền truy cập phương tiện', 403);
    const resId = accessScope === 'own'
      ? await getCurrentResidentId(pool, req.userId)
      : validatePositiveInt(requestedResidentId, 'residentId');
    if (!resId) throw new BusinessError('Resident not found for this user', 403);
    const vtId = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
    if (!plateNumber || plateNumber.trim() === '') {
      throw new BusinessError('Plate number is required', 400);
    }
    const plate = normalizePlate(plateNumber);
    if (plate.length < 5 || plate.length > 20) {
      throw new BusinessError('Plate number must be between 5 and 20 characters', 400);
    }

    const residentCheck = await pool.request()
      .input('ResidentID', sql.Int, resId)
      .query('SELECT ResidentID FROM dbo.Resident WHERE ResidentID = @ResidentID AND Status = 1');
    if (!residentCheck.recordset[0]) {
      throw new BusinessError('Resident not found or inactive', 404);
    }

    const vtCheck = await pool.request()
      .input('VehicleTypeID', sql.Int, vtId)
      .query('SELECT VehicleTypeID FROM dbo.VehicleType WHERE VehicleTypeID = @VehicleTypeID');
    if (!vtCheck.recordset[0]) {
      throw new BusinessError('Vehicle type not found', 404);
    }

    const plateCheck = await pool.request()
      .input('PlateNumber', sql.VarChar, plate)
      .query('SELECT VehicleID FROM dbo.Vehicle WHERE PlateNumber = @PlateNumber');
    if (plateCheck.recordset[0]) {
      throw new BusinessError('Plate number already exists', 409);
    }

    const result = await pool.request()
      .input('ResidentID', sql.Int, resId)
      .input('PlateNumber', sql.VarChar, plate)
      .input('VehicleTypeID', sql.Int, vtId)
      .input('Brand', sql.NVarChar, brand || null)
      .input('Color', sql.NVarChar, color || null)
      .input('Status', sql.Bit, 1)
      .query(`
        INSERT INTO dbo.Vehicle (ResidentID, PlateNumber, VehicleTypeID, Brand, Color, RegisterDate, Status)
        OUTPUT INSERTED.VehicleID
        VALUES (@ResidentID, @PlateNumber, @VehicleTypeID, @Brand, @Color, GETDATE(), @Status)
      `);

    const vehicleId = result.recordset[0].VehicleID;

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: { vehicleId }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;
    res.status(statusCode).json({ success: false, message });
  }
};

// =============================================
//  4. Cập nhật xe
// =============================================
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicleId = validatePositiveInt(id, 'vehicleId');
    const { plateNumber, vehicleTypeId, brand, color, status } = req.body;

    const pool = await getPool();

    const accessScope = getAccessScope(req, { viewAll: 'VEHICLE_VIEW_ALL', viewOwn: 'VEHICLE_VIEW_OWN' });
    if (accessScope === 'none') throw new BusinessError('Bạn không có quyền truy cập phương tiện', 403);
    const currentResidentId = accessScope === 'own' ? await getCurrentResidentId(pool, req.userId) : null;
    const vehicleCheck = await pool.request()
      .input('VehicleID', sql.Int, vehicleId)
      .input('CurrentResidentID', sql.Int, currentResidentId || 0)
      .query(`
        SELECT VehicleID, VehicleTypeID, Status
        FROM dbo.Vehicle
        WHERE VehicleID = @VehicleID
          ${accessScope === 'own' ? 'AND ResidentID = @CurrentResidentID' : ''}
      `);
    if (!vehicleCheck.recordset[0]) {
      throw new BusinessError('Vehicle not found', 404);
    }
    const vehicle = vehicleCheck.recordset[0];

    const updates = [];
    const request = pool.request();
    request.input('VehicleID', sql.Int, vehicleId);

    if (plateNumber !== undefined) {
      if (!plateNumber || plateNumber.trim() === '') {
        throw new BusinessError('Plate number cannot be empty', 400);
      }
      const newPlate = normalizePlate(plateNumber);
      if (newPlate.length < 5 || newPlate.length > 20) {
        throw new BusinessError('Plate number must be between 5 and 20 characters', 400);
      }
      const dupCheck = await pool.request()
        .input('PlateNumber', sql.VarChar, newPlate)
        .input('VehicleID', sql.Int, vehicleId)
        .query('SELECT VehicleID FROM dbo.Vehicle WHERE PlateNumber = @PlateNumber AND VehicleID != @VehicleID');
      if (dupCheck.recordset[0]) {
        throw new BusinessError('Plate number already exists', 409);
      }
      updates.push('PlateNumber = @PlateNumber');
      request.input('PlateNumber', sql.VarChar, newPlate);
    }

    if (vehicleTypeId !== undefined) {
      const vtId = validatePositiveInt(vehicleTypeId, 'vehicleTypeId');
      const vtCheck = await pool.request()
        .input('VehicleTypeID', sql.Int, vtId)
        .query('SELECT VehicleTypeID FROM dbo.VehicleType WHERE VehicleTypeID = @VehicleTypeID');
      if (!vtCheck.recordset[0]) {
        throw new BusinessError('Vehicle type not found', 404);
      }
      if (vehicle.Status) {
        const hasParkingSubscription = await pool.request().query(`
          SELECT CASE WHEN OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL THEN 0 ELSE 1 END AS HasParkingSubscription;
        `);
        if (hasParkingSubscription.recordset[0]?.HasParkingSubscription) {
          const subCheck = await pool.request()
            .input('VehicleID', sql.Int, vehicleId)
            .query(`
              SELECT ps.VehicleTypeID AS SlotVehicleTypeID
              FROM dbo.ParkingSubscription sub
              INNER JOIN dbo.ParkingCard pc ON sub.CardID = pc.CardID
              INNER JOIN dbo.ParkingSlot ps ON pc.SlotID = ps.SlotID
              WHERE sub.VehicleID = @VehicleID AND sub.Status = 'ACTIVE' AND pc.Status = 1
            `);
          if (subCheck.recordset[0]) {
            const slotVtId = subCheck.recordset[0].SlotVehicleTypeID;
            if (slotVtId !== vtId) {
              throw new BusinessError('Cannot change vehicle type because active subscription uses a slot of different type', 409);
            }
          }
        }
      }
      updates.push('VehicleTypeID = @VehicleTypeID');
      request.input('VehicleTypeID', sql.Int, vtId);
    }

    if (brand !== undefined) {
      updates.push('Brand = @Brand');
      request.input('Brand', sql.NVarChar, brand || null);
    }
    if (color !== undefined) {
      updates.push('Color = @Color');
      request.input('Color', sql.NVarChar, color || null);
    }

    if (status !== undefined) {
      const stat = validateBitParam(status, 'status');
      if (stat === undefined) {
        throw new BusinessError('status must be 0, 1, true, or false', 400);
      }
      if (stat === 0) {
        const hasParkingSubscription = await pool.request().query(`
          SELECT CASE WHEN OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL THEN 0 ELSE 1 END AS HasParkingSubscription;
        `);
        if (hasParkingSubscription.recordset[0]?.HasParkingSubscription) {
          const subActive = await pool.request()
            .input('VehicleID', sql.Int, vehicleId)
            .query(`
              SELECT ParkingSubscriptionID
              FROM dbo.ParkingSubscription
              WHERE VehicleID = @VehicleID
                AND Status = 'ACTIVE'
            `);
          if (subActive.recordset[0]) {
            throw new BusinessError('Cannot deactivate vehicle with active subscription', 409);
          }
        }
        const lastEvent = await pool.request()
          .input('VehicleID', sql.Int, vehicleId)
          .query(`
            SELECT TOP 1 EventType
            FROM dbo.ParkingAccessLog
            WHERE VehicleID = @VehicleID
            ORDER BY EventTime DESC, AccessLogID DESC
          `);
        if (lastEvent.recordset[0] && lastEvent.recordset[0].EventType === 'IN') {
          throw new BusinessError('Cannot deactivate vehicle while it is inside (last event is IN)', 409);
        }
      }
      updates.push('Status = @Status');
      request.input('Status', sql.Bit, stat);
    }

    if (updates.length === 0) {
      throw new BusinessError('No fields to update', 400);
    }

    const result = await request.query(`
      UPDATE dbo.Vehicle
      SET ${updates.join(', ')}
      WHERE VehicleID = @VehicleID
    `);

    if (result.rowsAffected[0] === 0) {
      throw new BusinessError('Vehicle not found', 404);
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;
    res.status(statusCode).json({ success: false, message });
  }
};

// =============================================
//  5. Xóa xe (soft delete)
// =============================================
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicleId = validatePositiveInt(id, 'vehicleId');

    const pool = await getPool();

    const accessScope = getAccessScope(req, { viewAll: 'VEHICLE_VIEW_ALL', viewOwn: 'VEHICLE_VIEW_OWN' });
    if (accessScope === 'none') throw new BusinessError('Bạn không có quyền truy cập phương tiện', 403);
    const currentResidentId = accessScope === 'own' ? await getCurrentResidentId(pool, req.userId) : null;
    const vehicleCheck = await pool.request()
      .input('VehicleID', sql.Int, vehicleId)
      .input('CurrentResidentID', sql.Int, currentResidentId || 0)
      .query(`
        SELECT VehicleID, Status
        FROM dbo.Vehicle
        WHERE VehicleID = @VehicleID
          ${accessScope === 'own' ? 'AND ResidentID = @CurrentResidentID' : ''}
      `);
    if (!vehicleCheck.recordset[0]) {
      throw new BusinessError('Vehicle not found', 404);
    }
    const vehicle = vehicleCheck.recordset[0];
    if (!vehicle.Status) {
      return res.json({
        success: true,
        message: 'Vehicle already inactive'
      });
    }

    const hasParkingSubscription = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL THEN 0 ELSE 1 END AS HasParkingSubscription;
    `);
    if (hasParkingSubscription.recordset[0]?.HasParkingSubscription) {
      const subActive = await pool.request()
        .input('VehicleID', sql.Int, vehicleId)
        .query(`
          SELECT ParkingSubscriptionID
          FROM dbo.ParkingSubscription
          WHERE VehicleID = @VehicleID
            AND Status = 'ACTIVE'
        `);
      if (subActive.recordset[0]) {
        throw new BusinessError('Cannot delete vehicle with active subscription', 409);
      }
    }

    const lastEvent = await pool.request()
      .input('VehicleID', sql.Int, vehicleId)
      .query(`
        SELECT TOP 1 EventType
        FROM dbo.ParkingAccessLog
        WHERE VehicleID = @VehicleID
        ORDER BY EventTime DESC, AccessLogID DESC
      `);
    if (lastEvent.recordset[0] && lastEvent.recordset[0].EventType === 'IN') {
      throw new BusinessError('Cannot delete vehicle while it is inside (last event is IN)', 409);
    }

    await pool.request()
      .input('VehicleID', sql.Int, vehicleId)
      .query('UPDATE dbo.Vehicle SET Status = 0 WHERE VehicleID = @VehicleID');

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;
    res.status(statusCode).json({ success: false, message });
  }
};

// =============================================
//  6. Lấy danh sách loại xe
// =============================================
exports.getVehicleTypes = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT VehicleTypeID, TypeName, ISNULL(MonthlyFee, 0) AS MonthlyFee
      FROM dbo.VehicleType
      ORDER BY TypeName
    `);
    res.json({
      success: true,
      data: result.recordset || []
    });
  } catch (error) {
    console.error('Get vehicle types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle types'
    });
  }
};
