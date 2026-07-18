const { getPool, sql } = require('../config/db');

exports.getUtilityTypes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                ut.UtilityTypeID,
                ut.UtilityName,
                COUNT(upt.PriceTierID) AS TierCount
            FROM UtilityType ut
            LEFT JOIN UtilityPriceTier upt ON ut.UtilityTypeID = upt.UtilityTypeID
            GROUP BY ut.UtilityTypeID, ut.UtilityName
            ORDER BY ut.UtilityName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get utility types error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch utility types',
            error: error.message
        });
    }
};

exports.getPriceTiers = async (req, res) => {
    try {
        const { utilityTypeId } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('UtilityTypeID', sql.Int, utilityTypeId)
            .query(`
                SELECT 
                    PriceTierID,
                    TierName,
                    FromValue,
                    ToValue,
                    UnitPrice,
                    EffectiveDate
                FROM UtilityPriceTier
                WHERE UtilityTypeID = @UtilityTypeID
                    AND EffectiveDate = (
                        SELECT MAX(EffectiveDate) 
                        FROM UtilityPriceTier 
                        WHERE UtilityTypeID = @UtilityTypeID
                    )
                ORDER BY FromValue
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get price tiers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price tiers',
            error: error.message
        });
    }
};

exports.createMeterReading = async (req, res) => {
    try {
        const { 
            apartmentId,
            utilityTypeId,
            readingMonth,
            readingYear,
            oldIndex,
            newIndex,
            readingDate
        } = req.body;

        if (!apartmentId || !utilityTypeId || !readingMonth || !readingYear || newIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const pool = await getPool();

        // Check if reading already exists for this period
        const checkResult = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('UtilityTypeID', sql.Int, utilityTypeId)
            .input('ReadingMonth', sql.Int, readingMonth)
            .input('ReadingYear', sql.Int, readingYear)
            .query(`
                SELECT ReadingID 
                FROM MeterReading 
                WHERE ApartmentID = @ApartmentID 
                    AND UtilityTypeID = @UtilityTypeID 
                    AND ReadingMonth = @ReadingMonth 
                    AND ReadingYear = @ReadingYear
            `);

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Meter reading already exists for this period'
            });
        }

        // Get employee ID
        const employeeResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT EmployeeID FROM Employee WHERE UserID = @UserID');

        const employeeId = employeeResult.recordset[0]?.EmployeeID || null;

        // Get previous reading if not provided
        let previousReading = oldIndex;
        if (previousReading === undefined) {
            const prevResult = await pool.request()
                .input('ApartmentID', sql.Int, apartmentId)
                .input('UtilityTypeID', sql.Int, utilityTypeId)
                .query(`
                    SELECT TOP 1 NewIndex as LastIndex
                    FROM MeterReading
                    WHERE ApartmentID = @ApartmentID 
                        AND UtilityTypeID = @UtilityTypeID
                    ORDER BY ReadingYear DESC, ReadingMonth DESC
                `);
            previousReading = prevResult.recordset[0]?.LastIndex || 0;
        }

        const result = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('EmployeeID', sql.Int, employeeId)
            .input('UtilityTypeID', sql.Int, utilityTypeId)
            .input('ReadingMonth', sql.Int, readingMonth)
            .input('ReadingYear', sql.Int, readingYear)
            .input('OldIndex', sql.Decimal, previousReading)
            .input('NewIndex', sql.Decimal, newIndex)
            .input('ReadingDate', sql.Date, readingDate || new Date())
            .query(`
                INSERT INTO MeterReading (
                    ApartmentID, EmployeeID, UtilityTypeID, 
                    ReadingMonth, ReadingYear, OldIndex, NewIndex, ReadingDate
                )
                OUTPUT INSERTED.ReadingID
                VALUES (
                    @ApartmentID, @EmployeeID, @UtilityTypeID,
                    @ReadingMonth, @ReadingYear, @OldIndex, @NewIndex, @ReadingDate
                )
            `);

        const readingId = result.recordset[0].ReadingID;

        res.status(201).json({
            success: true,
            message: 'Meter reading created successfully',
            data: { 
                readingId,
                consumption: newIndex - previousReading
            }
        });

    } catch (error) {
        console.error('Create meter reading error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create meter reading',
            error: error.message
        });
    }
};

exports.getMeterReadings = async (req, res) => {
    try {
        const { 
            apartmentId,
            utilityTypeId,
            month,
            year,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                mr.ReadingID,
                mr.ReadingMonth,
                mr.ReadingYear,
                mr.OldIndex,
                mr.NewIndex,
                mr.ReadingDate,
                (mr.NewIndex - mr.OldIndex) AS Consumption,
                a.ApartmentCode,
                ut.UtilityName,
                e.FullName AS EmployeeName
            FROM MeterReading mr
            INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            INNER JOIN UtilityType ut ON mr.UtilityTypeID = ut.UtilityTypeID
            LEFT JOIN Employee e ON mr.EmployeeID = e.EmployeeID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM MeterReading mr
            WHERE 1=1
        `;

        if (apartmentId) {
            query += ` AND mr.ApartmentID = @ApartmentID`;
            countQuery += ` AND mr.ApartmentID = @ApartmentID`;
            request.input('ApartmentID', sql.Int, parseInt(apartmentId));
        }

        if (utilityTypeId) {
            query += ` AND mr.UtilityTypeID = @UtilityTypeID`;
            countQuery += ` AND mr.UtilityTypeID = @UtilityTypeID`;
            request.input('UtilityTypeID', sql.Int, parseInt(utilityTypeId));
        }

        if (month) {
            query += ` AND mr.ReadingMonth = @Month`;
            countQuery += ` AND mr.ReadingMonth = @Month`;
            request.input('Month', sql.Int, parseInt(month));
        }

        if (year) {
            query += ` AND mr.ReadingYear = @Year`;
            countQuery += ` AND mr.ReadingYear = @Year`;
            request.input('Year', sql.Int, parseInt(year));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY mr.ReadingYear DESC, mr.ReadingMonth DESC
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
        console.error('Get meter readings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meter readings',
            error: error.message
        });
    }
};