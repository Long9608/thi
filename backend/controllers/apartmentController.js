const { getPool, sql } = require('../config/db');

exports.getAllApartments = async (req, res) => {
    try {
        const { 
            buildingId, 
            floorId, 
            statusId,
            search,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                a.ApartmentID,
                a.ApartmentCode,
                a.Area,
                a.FloorID,
                f.FloorNumber,
                b.BuildingName,
                b.BuildingID,
                ar.AreaName,
                rs.StatusName AS Status,
                a.StatusID,
                (
                    SELECT TOP 1 BaseRentalPrice 
                    FROM ApartmentPriceHistory 
                    WHERE ApartmentID = a.ApartmentID 
                    ORDER BY EffectiveDate DESC
                ) AS CurrentPrice,
                (
                    SELECT COUNT(*) 
                    FROM Contract c 
                    WHERE c.ApartmentID = a.ApartmentID 
                        AND c.StatusID IN (1, 2)
                ) AS ActiveContracts
            FROM Apartment a
            INNER JOIN Floor f ON a.FloorID = f.FloorID
            INNER JOIN Building b ON f.BuildingID = b.BuildingID
            INNER JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
            INNER JOIN RoomStatus rs ON a.StatusID = rs.StatusID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Apartment a
            INNER JOIN Floor f ON a.FloorID = f.FloorID
            INNER JOIN Building b ON f.BuildingID = b.BuildingID
            WHERE 1=1
        `;

        // Apply filters
        if (buildingId) {
            query += ` AND b.BuildingID = @BuildingID`;
            countQuery += ` AND b.BuildingID = @BuildingID`;
            request.input('BuildingID', sql.Int, parseInt(buildingId));
        }

        if (floorId) {
            query += ` AND a.FloorID = @FloorID`;
            countQuery += ` AND a.FloorID = @FloorID`;
            request.input('FloorID', sql.Int, parseInt(floorId));
        }

        if (statusId) {
            query += ` AND a.StatusID = @StatusID`;
            countQuery += ` AND a.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        if (search) {
            query += ` AND (a.ApartmentCode LIKE @Search OR b.BuildingName LIKE @Search)`;
            countQuery += ` AND (a.ApartmentCode LIKE @Search OR b.BuildingName LIKE @Search)`;
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        // Get total count
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        // Get data with pagination
        query += `
            ORDER BY a.ApartmentCode
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
        console.error('Get apartments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartments',
            error: error.message
        });
    }
};

exports.getApartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query(`
                SELECT 
                    a.*,
                    f.FloorNumber,
                    b.BuildingName,
                    b.BuildingID,
                    ar.AreaName,
                    ar.AreaID,
                    rs.StatusName AS Status,
                    ph.BaseRentalPrice,
                    ph.EffectiveDate AS PriceEffectiveDate
                FROM Apartment a
                INNER JOIN Floor f ON a.FloorID = f.FloorID
                INNER JOIN Building b ON f.BuildingID = b.BuildingID
                INNER JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
                INNER JOIN RoomStatus rs ON a.StatusID = rs.StatusID
                LEFT JOIN ApartmentPriceHistory ph ON a.ApartmentID = ph.ApartmentID
                    AND ph.EffectiveDate = (
                        SELECT MAX(EffectiveDate) 
                        FROM ApartmentPriceHistory 
                        WHERE ApartmentID = a.ApartmentID
                    )
                WHERE a.ApartmentID = @ApartmentID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        // Get current contract if any
        const contractResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query(`
                SELECT TOP 1 
                    c.*,
                    r.FullName AS OwnerName,
                    cs.StatusName AS ContractStatus
                FROM Contract c
                INNER JOIN Resident r ON c.OwnerID = r.ResidentID
                INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                WHERE c.ApartmentID = @ApartmentID 
                    AND c.StatusID IN (1, 2)
                ORDER BY c.StartDate DESC
            `);

        const apartment = result.recordset[0];
        apartment.currentContract = contractResult.recordset[0] || null;

        res.json({
            success: true,
            data: apartment
        });

    } catch (error) {
        console.error('Get apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartment',
            error: error.message
        });
    }
};

exports.createApartment = async (req, res) => {
    try {
        const { 
            floorId, 
            apartmentCode, 
            area, 
            statusId,
            baseRentalPrice,
            priceEffectiveDate
        } = req.body;

        // Validation
        if (!floorId || !apartmentCode || !area) {
            return res.status(400).json({
                success: false,
                message: 'Floor ID, Apartment Code, and Area are required'
            });
        }

        const pool = await getPool();

        // Check if apartment code already exists
        const checkResult = await pool.request()
            .input('ApartmentCode', sql.VarChar, apartmentCode)
            .query('SELECT ApartmentID FROM Apartment WHERE ApartmentCode = @ApartmentCode');

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Apartment code already exists'
            });
        }

        // Create apartment
        const result = await pool.request()
            .input('FloorID', sql.Int, floorId)
            .input('ApartmentCode', sql.VarChar, apartmentCode)
            .input('Area', sql.Float, area)
            .input('StatusID', sql.Int, statusId || 1)
            .query(`
                INSERT INTO Apartment (FloorID, ApartmentCode, Area, StatusID)
                OUTPUT INSERTED.ApartmentID
                VALUES (@FloorID, @ApartmentCode, @Area, @StatusID)
            `);

        const apartmentId = result.recordset[0].ApartmentID;

        // Add price history if provided
        if (baseRentalPrice) {
            await pool.request()
                .input('ApartmentID', sql.Int, apartmentId)
                .input('BaseRentalPrice', sql.Decimal, baseRentalPrice)
                .input('EffectiveDate', sql.Date, priceEffectiveDate || new Date())
                .query(`
                    INSERT INTO ApartmentPriceHistory (ApartmentID, BaseRentalPrice, EffectiveDate)
                    VALUES (@ApartmentID, @BaseRentalPrice, @EffectiveDate)
                `);
        }

        res.status(201).json({
            success: true,
            message: 'Apartment created successfully',
            data: { apartmentId }
        });

    } catch (error) {
        console.error('Create apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create apartment',
            error: error.message
        });
    }
};

exports.updateApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { area, statusId, baseRentalPrice, priceEffectiveDate } = req.body;

        const pool = await getPool();

        // Check if apartment exists
        const checkResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query('SELECT ApartmentID FROM Apartment WHERE ApartmentID = @ApartmentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        // Update apartment
        const updates = [];
        const request = pool.request();
        request.input('ApartmentID', sql.Int, id);

        if (area) {
            updates.push('Area = @Area');
            request.input('Area', sql.Float, area);
        }

        if (statusId) {
            updates.push('StatusID = @StatusID');
            request.input('StatusID', sql.Int, statusId);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Apartment 
                SET ${updates.join(', ')}
                WHERE ApartmentID = @ApartmentID
            `);
        }

        // Update price history if provided
        if (baseRentalPrice) {
            // Check if there's already a price for this date
            const priceCheck = await pool.request()
                .input('ApartmentID', sql.Int, id)
                .input('EffectiveDate', sql.Date, priceEffectiveDate || new Date())
                .query(`
                    SELECT PriceHistoryID 
                    FROM ApartmentPriceHistory 
                    WHERE ApartmentID = @ApartmentID 
                        AND EffectiveDate = @EffectiveDate
                `);

            if (priceCheck.recordset[0]) {
                // Update existing price
                await pool.request()
                    .input('PriceHistoryID', sql.Int, priceCheck.recordset[0].PriceHistoryID)
                    .input('BaseRentalPrice', sql.Decimal, baseRentalPrice)
                    .query(`
                        UPDATE ApartmentPriceHistory 
                        SET BaseRentalPrice = @BaseRentalPrice
                        WHERE PriceHistoryID = @PriceHistoryID
                    `);
            } else {
                // Insert new price
                await pool.request()
                    .input('ApartmentID', sql.Int, id)
                    .input('BaseRentalPrice', sql.Decimal, baseRentalPrice)
                    .input('EffectiveDate', sql.Date, priceEffectiveDate || new Date())
                    .query(`
                        INSERT INTO ApartmentPriceHistory (ApartmentID, BaseRentalPrice, EffectiveDate)
                        VALUES (@ApartmentID, @BaseRentalPrice, @EffectiveDate)
                    `);
            }
        }

        res.json({
            success: true,
            message: 'Apartment updated successfully'
        });

    } catch (error) {
        console.error('Update apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update apartment',
            error: error.message
        });
    }
};

exports.deleteApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if apartment exists
        const checkResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query('SELECT ApartmentID FROM Apartment WHERE ApartmentID = @ApartmentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        // Check if apartment has active contracts
        const contractCheck = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM Contract 
                WHERE ApartmentID = @ApartmentID 
                    AND StatusID IN (1, 2)
            `);

        if (contractCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete apartment with active contracts'
            });
        }

        // Delete apartment (cascade will handle related records)
        await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query('DELETE FROM Apartment WHERE ApartmentID = @ApartmentID');

        res.json({
            success: true,
            message: 'Apartment deleted successfully'
        });

    } catch (error) {
        console.error('Delete apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete apartment',
            error: error.message
        });
    }
};

exports.getApartmentStatuses = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT StatusID, StatusName 
            FROM RoomStatus 
            ORDER BY StatusID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error.message
        });
    }
};

exports.getApartmentAreas = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                ar.AreaID,
                ar.AreaName,
                ar.Address,
                COUNT(DISTINCT b.BuildingID) as BuildingCount,
                COUNT(DISTINCT a.ApartmentID) as ApartmentCount
            FROM ApartmentArea ar
            LEFT JOIN Building b ON ar.AreaID = b.AreaID
            LEFT JOIN Floor f ON b.BuildingID = f.BuildingID
            LEFT JOIN Apartment a ON f.FloorID = a.FloorID
            GROUP BY ar.AreaID, ar.AreaName, ar.Address
            ORDER BY ar.AreaName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get areas error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas',
            error: error.message
        });
    }
};

exports.getApartmentBuildings = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                b.BuildingID,
                b.BuildingName,
                b.NumberOfFloors,
                ar.AreaName,
                COUNT(DISTINCT a.ApartmentID) as ApartmentCount
            FROM Building b
            INNER JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
            LEFT JOIN Floor f ON b.BuildingID = f.BuildingID
            LEFT JOIN Apartment a ON f.FloorID = a.FloorID
            GROUP BY b.BuildingID, b.BuildingName, b.NumberOfFloors, ar.AreaName
            ORDER BY b.BuildingName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get buildings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings',
            error: error.message
        });
    }
};