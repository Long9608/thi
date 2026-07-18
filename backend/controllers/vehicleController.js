const { getPool, sql } = require('../config/db');

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
        const offset = (page - 1) * limit;

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
                pc.CardID,
                pc.CardCode,
                pc.ExpiredDate AS CardExpiredDate,
                ps.SlotNumber,
                ps.SlotID,
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

        if (status !== undefined) {
            query += ` AND v.Status = @Status`;
            countQuery += ` AND v.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        if (search) {
            query += ` AND (v.PlateNumber LIKE @Search OR v.Brand LIKE @Search OR r.FullName LIKE @Search)`;
            countQuery += ` AND (v.PlateNumber LIKE @Search OR v.Brand LIKE @Search OR r.FullName LIKE @Search)`;
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY v.RegisterDate DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, parseInt(offset));
        request.input('Limit', sql.Int, parseInt(limit));

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get vehicles error:', error);
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

        // Check if plate number already exists
        const checkPlate = await pool.request()
            .input('PlateNumber', sql.VarChar, plateNumber)
            .query('SELECT VehicleID FROM Vehicle WHERE PlateNumber = @PlateNumber');

        if (checkPlate.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Plate number already registered'
            });
        }

        // Create vehicle
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

        // Create parking card if slot is provided
        if (slotId) {
            // Check if slot is available
            const slotCheck = await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('SELECT IsOccupied FROM ParkingSlot WHERE SlotID = @SlotID');

            if (!slotCheck.recordset[0]) {
                return res.status(404).json({
                    success: false,
                    message: 'Parking slot not found'
                });
            }

            if (slotCheck.recordset[0].IsOccupied) {
                return res.status(400).json({
                    success: false,
                    message: 'Parking slot is already occupied'
                });
            }

            // Generate card code
            const cardCode = `CARD-${vehicleId}-${Date.now()}`;
            
            // Create parking card
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

            // Mark slot as occupied
            await pool.request()
                .input('SlotID', sql.Int, slotId)
                .query('UPDATE ParkingSlot SET IsOccupied = 1 WHERE SlotID = @SlotID');
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
            vehicleTypeId
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

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

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

        // Check if vehicle exists
        const checkResult = await pool.request()
            .input('VehicleID', sql.Int, id)
            .query('SELECT VehicleID FROM Vehicle WHERE VehicleID = @VehicleID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        // Delete vehicle (cascade will handle parking card)
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
            data: result.recordset
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

exports.getParkingSlots = async (req, res) => {
    try {
        const { areaId, vehicleTypeId, isOccupied } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                ps.SlotID,
                ps.SlotNumber,
                ps.IsOccupied,
                vt.TypeName AS VehicleType,
                ar.AreaName
            FROM ParkingSlot ps
            INNER JOIN VehicleType vt ON ps.VehicleTypeID = vt.VehicleTypeID
            INNER JOIN ApartmentArea ar ON ps.AreaID = ar.AreaID
            WHERE 1=1
        `;

        const request = pool.request();

        if (areaId) {
            query += ` AND ps.AreaID = @AreaID`;
            request.input('AreaID', sql.Int, parseInt(areaId));
        }

        if (vehicleTypeId) {
            query += ` AND ps.VehicleTypeID = @VehicleTypeID`;
            request.input('VehicleTypeID', sql.Int, parseInt(vehicleTypeId));
        }

        if (isOccupied !== undefined) {
            query += ` AND ps.IsOccupied = @IsOccupied`;
            request.input('IsOccupied', sql.Bit, parseInt(isOccupied));
        }

        query += ` ORDER BY ps.SlotNumber`;

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get parking slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parking slots',
            error: error.message
        });
    }
};