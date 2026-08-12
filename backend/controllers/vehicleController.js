// backend/controllers/vehicleController.js
const { getPool, sql } = require('../config/db');

// ============================================
// LẤY DANH SÁCH XE
// ============================================
exports.getAllVehicles = async (req, res) => {
    try {
        const { 
            residentId,
            vehicleTypeId,
            status,
            search,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const safeLimit = parseInt(limit) || 20;

        let query = `
            SELECT 
                v.VehicleID,
                v.PlateNumber,
                v.Brand,
                v.Color,
                v.RegisterDate,
                v.Status,
                vt.TypeName AS VehicleType,
                vt.VehicleTypeID,
                r.FullName AS OwnerName,
                r.Phone AS OwnerPhone,
                r.ResidentID,
                r.Address AS OwnerAddress,
                (
                    SELECT TOP 1 a.ApartmentCode
                    FROM ContractResident cr
                    JOIN Contract c ON cr.ContractID = c.ContractID
                    JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                    WHERE cr.ResidentID = r.ResidentID 
                        AND cr.MoveOutDate IS NULL
                        AND c.StatusID = 2
                ) AS ApartmentCode,
                pc.CardID,
                pc.CardCode,
                pc.IssueDate AS CardIssueDate,
                pc.ExpiredDate AS CardExpiredDate,
                pc.Status AS CardStatus,
                ps.SlotID,
                ps.SlotNumber,
                CASE 
                    WHEN pc.CardID IS NOT NULL AND pc.Status = 1 AND GETDATE() <= pc.ExpiredDate THEN 1
                    ELSE 0
                END AS IsActiveCard
            FROM Vehicle v
            INNER JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
            INNER JOIN Resident r ON v.ResidentID = r.ResidentID
            LEFT JOIN ParkingCard pc ON v.VehicleID = pc.VehicleID
            LEFT JOIN ParkingSlot ps ON pc.SlotID = ps.SlotID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Vehicle v
            WHERE 1=1
        `;

        if (residentId) {
            query += ` AND v.ResidentID = @ResidentID`;
            countQuery += ` AND v.ResidentID = @ResidentID`;
            request.input('ResidentID', sql.Int, parseInt(residentId));
        }

        if (vehicleTypeId) {
            query += ` AND v.VehicleTypeID = @VehicleTypeID`;
            countQuery += ` AND v.VehicleTypeID = @VehicleTypeID`;
            request.input('VehicleTypeID', sql.Int, parseInt(vehicleTypeId));
        }

        if (status !== undefined && status !== '') {
            query += ` AND v.Status = @Status`;
            countQuery += ` AND v.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        if (search) {
            const searchPattern = `%${search}%`;
            query += ` AND (v.PlateNumber LIKE @Search OR v.Brand LIKE @Search OR r.FullName LIKE @Search)`;
            countQuery += ` AND (v.PlateNumber LIKE @Search OR v.Brand LIKE @Search OR r.FullName LIKE @Search)`;
            request.input('Search', sql.NVarChar, searchPattern);
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;

        query += `
            ORDER BY v.VehicleID DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset || [],
            pagination: {
                total,
                page: parseInt(page),
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });

    } catch (error) {
        console.error('❌ Get vehicles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vehicles',
            error: error.message
        });
    }
};

exports.getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('VehicleID', sql.Int, id)
            .query(`
                SELECT 
                    v.*,
                    vt.TypeName AS VehicleType,
                    r.FullName AS OwnerName,
                    r.Phone AS OwnerPhone,
                    r.Email AS OwnerEmail,
                    r.Address AS OwnerAddress,
                    (
                        SELECT TOP 1 a.ApartmentCode
                        FROM ContractResident cr
                        JOIN Contract c ON cr.ContractID = c.ContractID
                        JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                        WHERE cr.ResidentID = r.ResidentID 
                            AND cr.MoveOutDate IS NULL
                            AND c.StatusID = 2
                    ) AS ApartmentCode,
                    pc.CardID,
                    pc.CardCode,
                    pc.IssueDate AS CardIssueDate,
                    pc.ExpiredDate AS CardExpiredDate,
                    pc.Status AS CardStatus,
                    ps.SlotID,
                    ps.SlotNumber,
                    ps.IsOccupied AS SlotOccupied
                FROM Vehicle v
                INNER JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
                INNER JOIN Resident r ON v.ResidentID = r.ResidentID
                LEFT JOIN ParkingCard pc ON v.VehicleID = pc.VehicleID
                LEFT JOIN ParkingSlot ps ON pc.SlotID = ps.SlotID
                WHERE v.VehicleID = @VehicleID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vehicle',
            error: error.message
        });
    }
};

exports.createVehicle = async (req, res) => {
    try {
        const { 
            residentId,
            plateNumber,
            vehicleTypeId,
            brand,
            color,
            slotId,
            cardExpiryDate
        } = req.body;

        if (!residentId || !plateNumber || !vehicleTypeId) {
            return res.status(400).json({
                success: false,
                message: 'Resident ID, plate number, and vehicle type are required'
            });
        }

        const pool = await getPool();

        const checkPlate = await pool.request()
            .input('PlateNumber', sql.VarChar, plateNumber)
            .query('SELECT VehicleID FROM Vehicle WHERE PlateNumber = @PlateNumber');

        if (checkPlate.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Plate number already registered'
            });
        }

        const result = await pool.request()
            .input('ResidentID', sql.Int, residentId)
            .input('PlateNumber', sql.VarChar, plateNumber)
            .input('VehicleTypeID', sql.Int, vehicleTypeId)
            .input('Brand', sql.NVarChar, brand || null)
            .input('Color', sql.NVarChar, color || null)
            .input('Status', sql.Bit, 1)
            .query(`
                INSERT INTO Vehicle (
                    ResidentID, PlateNumber, VehicleTypeID, Brand, Color, RegisterDate, Status
                )
                OUTPUT INSERTED.VehicleID
                VALUES (
                    @ResidentID, @PlateNumber, @VehicleTypeID, @Brand, @Color, GETDATE(), @Status
                )
            `);

        const vehicleId = result.recordset[0].VehicleID;

        if (slotId) {
            const slotCheck = await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('SELECT IsOccupied FROM ParkingSlot WHERE SlotID = @SlotID');

            if (slotCheck.recordset[0] && !slotCheck.recordset[0].IsOccupied) {
                const cardCode = `CARD-${vehicleId}-${Date.now()}`;
                
                await pool.request()
                    .input('VehicleID', sql.Int, vehicleId)
                    .input('CardCode', sql.VarChar, cardCode)
                    .input('SlotID', sql.Int, slotId)
                    .input('IssueDate', sql.Date, new Date())
                    .input('ExpiredDate', sql.Date, cardExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
                    .input('Status', sql.Bit, 1)
                    .query(`
                        INSERT INTO ParkingCard (
                            VehicleID, CardCode, SlotID, IssueDate, ExpiredDate, Status
                        )
                        VALUES (
                            @VehicleID, @CardCode, @SlotID, @IssueDate, @ExpiredDate, @Status
                        )
                    `);

                await pool.request()
                    .input('SlotID', sql.Int, slotId)
                    .query('UPDATE ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
            }
        }

        res.status(201).json({
            success: true,
            message: 'Vehicle registered successfully',
            data: { vehicleId }
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register vehicle',
            error: error.message
        });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            brand,
            color,
            status,
            vehicleTypeId,
            slotId,
            cardExpiryDate
        } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('VehicleID', sql.Int, id);

        if (brand) {
            updates.push('Brand = @Brand');
            request.input('Brand', sql.NVarChar, brand);
        }

        if (color) {
            updates.push('Color = @Color');
            request.input('Color', sql.NVarChar, color);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (vehicleTypeId) {
            updates.push('VehicleTypeID = @VehicleTypeID');
            request.input('VehicleTypeID', sql.Int, vehicleTypeId);
        }

        if (updates.length > 0) {
            const result = await request.query(`
                UPDATE Vehicle 
                SET ${updates.join(', ')}
                WHERE VehicleID = @VehicleID
            `);

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle not found'
                });
            }
        }

        if (slotId || cardExpiryDate) {
            const cardCheck = await pool.request()
                .input('VehicleID', sql.Int, id)
                .query('SELECT CardID, SlotID FROM ParkingCard WHERE VehicleID = @VehicleID AND Status = 1');

            if (cardCheck.recordset[0]) {
                const cardUpdates = [];
                const cardRequest = pool.request();
                cardRequest.input('VehicleID', sql.Int, id);

                if (slotId) {
                    if (cardCheck.recordset[0].SlotID) {
                        await pool.request()
                            .input('SlotID', sql.Int, cardCheck.recordset[0].SlotID)
                            .query('UPDATE ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
                    }

                    await pool.request()
                        .input('SlotID', sql.Int, slotId)
                        .query('UPDATE ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');

                    cardUpdates.push('SlotID = @SlotID');
                    cardRequest.input('SlotID', sql.Int, slotId);
                }

                if (cardExpiryDate) {
                    cardUpdates.push('ExpiredDate = @ExpiredDate');
                    cardRequest.input('ExpiredDate', sql.Date, cardExpiryDate);
                }

                if (cardUpdates.length > 0) {
                    await cardRequest.query(`
                        UPDATE ParkingCard 
                        SET ${cardUpdates.join(', ')}
                        WHERE VehicleID = @VehicleID AND Status = 1
                    `);
                }
            }
        }

        res.json({
            success: true,
            message: 'Vehicle updated successfully'
        });

    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update vehicle',
            error: error.message
        });
    }
};

exports.deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkResult = await pool.request()
            .input('VehicleID', sql.Int, id)
            .query('SELECT VehicleID FROM Vehicle WHERE VehicleID = @VehicleID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        await pool.request()
            .input('VehicleID', sql.Int, id)
            .query('DELETE FROM Vehicle WHERE VehicleID = @VehicleID');

        res.json({
            success: true,
            message: 'Vehicle deleted successfully'
        });

    } catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete vehicle',
            error: error.message
        });
    }
};

exports.getVehicleTypes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT VehicleTypeID, TypeName 
            FROM VehicleType 
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
            message: 'Failed to fetch vehicle types',
            error: error.message
        });
    }
};

exports.getParkingHistory = async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.query(`
            SELECT
                pc.CardID,
                pc.CardCode,
                pc.IssueDate,
                pc.ExpiredDate,
                pc.Status,
                ps.SlotNumber,
                v.PlateNumber,
                vt.TypeName AS VehicleType,
                r.FullName AS OwnerName,
                a.ApartmentCode,
                CASE WHEN pc.Status = 1 THEN 'Vào' ELSE 'Ra' END AS Action,
                CASE WHEN pc.Status = 1 THEN pc.IssueDate ELSE pc.ExpiredDate END AS Timestamp
            FROM ParkingCard pc
            LEFT JOIN Vehicle v ON pc.VehicleID = v.VehicleID
            LEFT JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
            LEFT JOIN Resident r ON v.ResidentID = r.ResidentID
            LEFT JOIN Apartment a ON r.ResidentID = a.ApartmentID
            LEFT JOIN ParkingSlot ps ON pc.SlotID = ps.SlotID
            ORDER BY pc.IssueDate DESC
        `);

        res.json({
            success: true,
            data: result.recordset || []
        });
    } catch (error) {
        console.error('Get parking history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parking history',
            error: error.message
        });
    }
};

// ============================================
// 🔥 QUẢN LÝ PARKING SLOT - SỬA LỖI
// ============================================

exports.getParkingSlots = async (req, res) => {
    try {
        const { areaId, vehicleTypeId, isOccupied } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                ps.SlotID,
                ps.SlotNumber,
                ps.IsOccupied,
                ps.AreaID,
                vt.TypeName AS VehicleType,
                vt.VehicleTypeID,
                ar.AreaName,
                v.PlateNumber,
                r.FullName AS OwnerName
            FROM ParkingSlot ps
            INNER JOIN VehicleType vt ON ps.VehicleTypeID = vt.VehicleTypeID
            INNER JOIN ApartmentArea ar ON ps.AreaID = ar.AreaID
            LEFT JOIN ParkingCard pc ON ps.SlotID = pc.SlotID AND pc.Status = 1
            LEFT JOIN Vehicle v ON pc.VehicleID = v.VehicleID
            LEFT JOIN Resident r ON v.ResidentID = r.ResidentID
            WHERE 1=1
        `;

        const request = pool.request();

        if (areaId && areaId !== '') {
            query += ` AND ps.AreaID = @AreaID`;
            request.input('AreaID', sql.Int, parseInt(areaId));
        }

        if (vehicleTypeId && vehicleTypeId !== '') {
            query += ` AND ps.VehicleTypeID = @VehicleTypeID`;
            request.input('VehicleTypeID', sql.Int, parseInt(vehicleTypeId));
        }

        // 🔥 SỬA: Xử lý isOccupied đúng cách - chỉ thêm điều kiện nếu có giá trị hợp lệ
        if (isOccupied !== undefined && isOccupied !== null && isOccupied !== '') {
            const occupiedValue = parseInt(isOccupied);
            if (!isNaN(occupiedValue)) {
                query += ` AND ps.IsOccupied = @IsOccupied`;
                request.input('IsOccupied', sql.Bit, occupiedValue);
            }
        }

        query += ` ORDER BY ps.SlotNumber`;

        console.log('📊 Parking slots query:', query);
        console.log('📊 Parameters:', { areaId, vehicleTypeId, isOccupied });

        const result = await request.query(query);

        console.log('📊 Parking slots result:', result.recordset.length);

        res.json({
            success: true,
            data: result.recordset || []
        });

    } catch (error) {
        console.error('❌ Get parking slots error:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slots',
            error: error.message
        });
    }
};

// Tạo vị trí đỗ mới
exports.createParkingSlot = async (req, res) => {
    try {
        const { areaId, slotNumber, vehicleTypeId, isOccupied } = req.body;

        if (!areaId || !slotNumber || !vehicleTypeId) {
            return res.status(400).json({
                success: false,
                message: 'Area ID, slot number and vehicle type are required'
            });
        }

        const pool = await getPool();

        const checkResult = await pool.request()
            .input('AreaID', sql.Int, areaId)
            .input('SlotNumber', sql.VarChar, slotNumber)
            .query(`
                SELECT SlotID 
                FROM ParkingSlot 
                WHERE AreaID = @AreaID AND SlotNumber = @SlotNumber
            `);

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Slot number already exists in this area'
            });
        }

        const result = await pool.request()
            .input('AreaID', sql.Int, areaId)
            .input('SlotNumber', sql.VarChar, slotNumber)
            .input('VehicleTypeID', sql.Int, vehicleTypeId)
            .input('IsOccupied', sql.Bit, isOccupied || 0)
            .query(`
                INSERT INTO ParkingSlot (AreaID, SlotNumber, VehicleTypeID, IsOccupied)
                OUTPUT INSERTED.SlotID
                VALUES (@AreaID, @SlotNumber, @VehicleTypeID, @IsOccupied)
            `);

        const slotId = result.recordset[0].SlotID;

        res.status(201).json({
            success: true,
            message: 'Parking slot created successfully',
            data: { slotId }
        });

    } catch (error) {
        console.error('Create parking slot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create parking slot',
            error: error.message
        });
    }
};

// Cập nhật vị trí đỗ
exports.updateParkingSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { slotNumber, vehicleTypeId, isOccupied } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('SlotID', sql.Int, id);

        if (slotNumber) {
            updates.push('SlotNumber = @SlotNumber');
            request.input('SlotNumber', sql.VarChar, slotNumber);
        }

        if (vehicleTypeId !== undefined) {
            updates.push('VehicleTypeID = @VehicleTypeID');
            request.input('VehicleTypeID', sql.Int, vehicleTypeId);
        }

        if (isOccupied !== undefined) {
            updates.push('IsOccupied = @IsOccupied');
            request.input('IsOccupied', sql.Bit, isOccupied);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const result = await request.query(`
            UPDATE ParkingSlot 
            SET ${updates.join(', ')}
            WHERE SlotID = @SlotID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Parking slot updated successfully'
        });

    } catch (error) {
        console.error('Update parking slot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update parking slot',
            error: error.message
        });
    }
};

// Xóa vị trí đỗ
exports.deleteParkingSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkResult = await pool.request()
            .input('SlotID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM ParkingCard 
                WHERE SlotID = @SlotID AND Status = 1
            `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete slot with active parking card'
            });
        }

        const result = await pool.request()
            .input('SlotID', sql.Int, id)
            .query('DELETE FROM ParkingSlot WHERE SlotID = @SlotID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Parking slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Parking slot deleted successfully'
        });

    } catch (error) {
        console.error('Delete parking slot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete parking slot',
            error: error.message
        });
    }
};

// ============================================
// 🔥 TẠO THẺ XE MỚI
// ============================================

exports.createParkingCard = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { 
            cardCode,
            slotId,
            issueDate,
            expiredDate,
            status
        } = req.body;

        console.log('📤 Creating parking card for vehicle:', vehicleId);

        if (!vehicleId) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID is required'
            });
        }

        if (!expiredDate) {
            return res.status(400).json({
                success: false,
                message: 'Expired date is required'
            });
        }

        const pool = await getPool();

        const vehicleCheck = await pool.request()
            .input('VehicleID', sql.Int, vehicleId)
            .query('SELECT VehicleID FROM Vehicle WHERE VehicleID = @VehicleID');

        if (!vehicleCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        const cardCheck = await pool.request()
            .input('VehicleID', sql.Int, vehicleId)
            .query('SELECT CardID FROM ParkingCard WHERE VehicleID = @VehicleID AND Status = 1');

        if (cardCheck.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'This vehicle already has an active card'
            });
        }

        if (slotId) {
            const slotCheck = await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('SELECT IsOccupied FROM ParkingSlot WHERE SlotID = @SlotID');

            if (!slotCheck.recordset[0]) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found'
                });
            }

            if (slotCheck.recordset[0].IsOccupied === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Parking slot is already occupied'
                });
            }
        }

        let finalCardCode = cardCode;
        if (!finalCardCode) {
            const prefix = 'CARD';
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            finalCardCode = `${prefix}-${random}`;
        }

        const codeCheck = await pool.request()
            .input('CardCode', sql.VarChar, finalCardCode)
            .query('SELECT CardID FROM ParkingCard WHERE CardCode = @CardCode');

        if (codeCheck.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Card code already exists'
            });
        }

        const result = await pool.request()
            .input('VehicleID', sql.Int, vehicleId)
            .input('CardCode', sql.VarChar, finalCardCode)
            .input('SlotID', sql.Int, slotId || null)
            .input('IssueDate', sql.Date, issueDate || new Date())
            .input('ExpiredDate', sql.Date, expiredDate)
            .input('Status', sql.Bit, status !== undefined ? status : 1)
            .query(`
                INSERT INTO ParkingCard (VehicleID, CardCode, SlotID, IssueDate, ExpiredDate, Status)
                OUTPUT INSERTED.CardID
                VALUES (@VehicleID, @CardCode, @SlotID, @IssueDate, @ExpiredDate, @Status)
            `);

        const cardId = result.recordset[0].CardID;

        if (slotId) {
            await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('UPDATE ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
        }

        console.log('✅ Parking card created:', cardId);

        res.status(201).json({
            success: true,
            message: 'Parking card created successfully',
            data: { 
                cardId,
                cardCode: finalCardCode
            }
        });

    } catch (error) {
        console.error('❌ Create parking card error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create parking card',
            error: error.message
        });
    }
};

exports.getParkingCards = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const pool = await getPool();
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const safeLimit = parseInt(limit) || 20;

        let query = `
            SELECT 
                pc.CardID,
                pc.CardCode,
                pc.IssueDate AS CardIssueDate,
                pc.ExpiredDate AS CardExpiredDate,
                pc.Status AS CardStatus,
                v.VehicleID,
                v.PlateNumber,
                v.Brand,
                v.Color,
                vt.TypeName AS VehicleType,
                r.FullName AS OwnerName,
                r.Phone AS OwnerPhone,
                r.ResidentID,
                ps.SlotID,
                ps.SlotNumber,
                ar.AreaName,
                CASE 
                    WHEN pc.Status = 1 AND GETDATE() <= pc.ExpiredDate THEN 1
                    ELSE 0
                END AS IsActiveCard
            FROM ParkingCard pc
            INNER JOIN Vehicle v ON pc.VehicleID = v.VehicleID
            INNER JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
            INNER JOIN Resident r ON v.ResidentID = r.ResidentID
            LEFT JOIN ParkingSlot ps ON pc.SlotID = ps.SlotID
            LEFT JOIN ApartmentArea ar ON ps.AreaID = ar.AreaID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM ParkingCard pc
            WHERE 1=1
        `;

        if (status !== undefined && status !== '') {
            query += ` AND pc.Status = @Status`;
            countQuery += ` AND pc.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;

        query += `
            ORDER BY pc.CardID DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset || [],
            pagination: {
                total,
                page: parseInt(page),
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });

    } catch (error) {
        console.error('❌ Get parking cards error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parking cards',
            error: error.message
        });
    }
};

exports.updateParkingCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const { slotId, expiredDate, status } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('CardID', sql.Int, cardId);

        const cardCheck = await pool.request()
            .input('CardID', sql.Int, cardId)
            .query('SELECT VehicleID, SlotID FROM ParkingCard WHERE CardID = @CardID');

        if (!cardCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Parking card not found'
            });
        }

        const oldSlotId = cardCheck.recordset[0].SlotID;

        if (slotId !== undefined) {
            if (oldSlotId) {
                await pool.request()
                    .input('SlotID', sql.Int, oldSlotId)
                    .query('UPDATE ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
            }

            if (slotId) {
                const slotCheck = await pool.request()
                    .input('SlotID', sql.Int, slotId)
                    .query('SELECT IsOccupied FROM ParkingSlot WHERE SlotID = @SlotID');

                if (!slotCheck.recordset[0]) {
                    return res.status(404).json({
                        success: false,
                        message: 'Parking slot not found'
                    });
                }

                if (slotCheck.recordset[0].IsOccupied === 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Parking slot is already occupied'
                    });
                }

                await pool.request()
                    .input('SlotID', sql.Int, slotId)
                    .query('UPDATE ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
            }

            updates.push('SlotID = @SlotID');
            request.input('SlotID', sql.Int, slotId || null);
        }

        if (expiredDate) {
            updates.push('ExpiredDate = @ExpiredDate');
            request.input('ExpiredDate', sql.Date, expiredDate);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        await request.query(`
            UPDATE ParkingCard 
            SET ${updates.join(', ')}
            WHERE CardID = @CardID
        `);

        res.json({
            success: true,
            message: 'Parking card updated successfully'
        });

    } catch (error) {
        console.error('❌ Update parking card error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update parking card',
            error: error.message
        });
    }
};

exports.deleteParkingCard = async (req, res) => {
    try {
        const { cardId } = req.params;
        const pool = await getPool();

        const cardCheck = await pool.request()
            .input('CardID', sql.Int, cardId)
            .query('SELECT SlotID FROM ParkingCard WHERE CardID = @CardID');

        if (!cardCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Parking card not found'
            });
        }

        const slotId = cardCheck.recordset[0].SlotID;

        await pool.request()
            .input('CardID', sql.Int, cardId)
            .query('DELETE FROM ParkingCard WHERE CardID = @CardID');

        if (slotId) {
            await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('UPDATE ParkingSlot SET IsOccupied = 0 WHERE SlotID = @SlotID');
        }

        res.json({
            success: true,
            message: 'Parking card deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete parking card error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete parking card',
            error: error.message
        });
    }
};