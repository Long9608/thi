const { resolveScope, apartmentOwnershipSql } = require('../utils/accessScope');
const { getPool, sql } = require('../config/db');
const { ensureSmartMetersForActiveContracts } = require('../services/billingService');
const { tickMeters } = require('../services/smartMeterSimulator');

exports.getUtilityTypes = async (req, res) => {
    try {
        const result = await (await getPool()).query(`
            SELECT
                ut.UtilityTypeID,
                ut.UtilityName,
                COUNT(upt.PriceTierID) AS TierCount
            FROM UtilityType ut
            LEFT JOIN UtilityPriceTier upt ON ut.UtilityTypeID = upt.UtilityTypeID
            GROUP BY ut.UtilityTypeID, ut.UtilityName
            ORDER BY ut.UtilityName
        `);

        res.json({ success: true, data: result.recordset });
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
        const result = await (await getPool()).request()
            .input('UtilityTypeID', sql.Int, req.params.utilityTypeId)
            .query(`
                SELECT PriceTierID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate
                FROM UtilityPriceTier
                WHERE UtilityTypeID = @UtilityTypeID
                  AND EffectiveDate = (
                      SELECT MAX(EffectiveDate)
                      FROM UtilityPriceTier
                      WHERE UtilityTypeID = @UtilityTypeID
                  )
                ORDER BY FromValue
            `);

        res.json({ success: true, data: result.recordset });
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
    return res.status(405).json({
        success: false,
        message: 'Khong cho nhap chi so dien/nuoc thu cong. He thong se chot MeterReading tu smart meter khi tao hoa don tong.'
    });
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

        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 999);
        const offset = (safePage - 1) * safeLimit;
        const pool = await getPool();

        const { scope, residentId } = await resolveScope(req, pool, 'INVOICE');
        let where = 'WHERE 1=1';
        const request = pool.request();
        const countRequest = pool.request();
        const addInput = (name, type, value) => {
            request.input(name, type, value);
            countRequest.input(name, type, value);
        };

        if (scope === 'own') {
            where += ` AND ${apartmentOwnershipSql('mr.ApartmentID')}`;
            addInput('CurrentResidentID', sql.Int, residentId);
        }
        if (apartmentId) {
            where += ' AND mr.ApartmentID = @ApartmentID';
            addInput('ApartmentID', sql.Int, parseInt(apartmentId, 10));
        }
        if (utilityTypeId) {
            where += ' AND mr.UtilityTypeID = @UtilityTypeID';
            addInput('UtilityTypeID', sql.Int, parseInt(utilityTypeId, 10));
        }
        if (month) {
            where += ' AND mr.ReadingMonth = @Month';
            addInput('Month', sql.Int, parseInt(month, 10));
        }
        if (year) {
            where += ' AND mr.ReadingYear = @Year';
            addInput('Year', sql.Int, parseInt(year, 10));
        }

        const countResult = await countRequest.query(`
            SELECT COUNT(*) AS total
            FROM MeterReading mr
            ${where}
        `);

        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);
        const result = await request.query(`
            SELECT
                mr.ReadingID,
                mr.ApartmentID,
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
            JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            JOIN UtilityType ut ON mr.UtilityTypeID = ut.UtilityTypeID
            LEFT JOIN Employee e ON mr.EmployeeID = e.EmployeeID
            ${where}
            ORDER BY mr.ReadingYear DESC, mr.ReadingMonth DESC, mr.ReadingID DESC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        `);

        const total = countResult.recordset[0]?.total || 0;
        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
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

exports.getSmartMeters = async (req, res) => {
    try {
        const { apartmentId } = req.query;
        const pool = await getPool();
        

        const request = pool.request();
        const { scope, residentId } = await resolveScope(req, pool, 'INVOICE');
        let where = 'WHERE 1=1';
        if (scope === 'own') {
            where += ` AND ${apartmentOwnershipSql('sm.ApartmentID')}`;
            request.input('CurrentResidentID', sql.Int, residentId);
        }
        if (apartmentId) {
            where += ' AND sm.ApartmentID = @ApartmentID';
            request.input('ApartmentID', sql.Int, parseInt(apartmentId, 10));
        }

        const result = await request.query(`
            SELECT
                sm.MeterID,
                sm.ApartmentID,
                a.ApartmentCode,
                sm.UtilityTypeID,
                ut.UtilityName,
                sm.CurrentIndex,
                sm.LastTickAt,
                sm.Status,
                CASE WHEN EXISTS (
                    SELECT 1
                    FROM Contract c
                    WHERE c.ApartmentID = sm.ApartmentID
                      AND c.StatusID = 2
                      AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                ) THEN 1 ELSE 0 END AS HasActiveContract,
                ISNULL(logs.LogCount, 0) AS LogCount
            FROM SmartMeter sm
            JOIN Apartment a ON a.ApartmentID = sm.ApartmentID
            JOIN UtilityType ut ON ut.UtilityTypeID = sm.UtilityTypeID
            OUTER APPLY (
                SELECT COUNT(*) AS LogCount
                FROM SmartMeterLog sml
                WHERE sml.MeterID = sm.MeterID
            ) logs
            ${where}
            ORDER BY a.ApartmentCode, sm.UtilityTypeID
        `);

        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Get smart meters error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch smart meters',
            error: error.message
        });
    }
};

exports.demoTickMeters = async (req, res) => {
    try {
        const updated = await tickMeters({
            apartmentId: req.body?.apartmentId || req.query?.apartmentId || null,
            source: 'DEMO'
        });

        res.json({
            success: true,
            message: 'Smart meter demo tick completed',
            data: updated
        });
    } catch (error) {
        console.error('Demo smart meter tick error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to demo tick smart meters',
            error: error.message
        });
    }
};
