const { getPool, sql } = require('../config/db');
const {
    ACTIVE_CONTRACT_STATUS_SQL,
    ELECTRIC_UTILITY_TYPE_ID,
    WATER_UTILITY_TYPE_ID,
    ensureSmartMetersForActiveContracts,
    toNumber,
    roundMoney
} = require('./billingService');

const FIVE_MINUTES_MS = 5 * 60 * 1000;
let intervalHandle = null;

function randomDelta(utilityTypeId) {
    const now = new Date();
    const hour = now.getHours();
    const isPeakHour = [6, 7, 8, 11, 12, 18, 19, 20, 21, 22].includes(hour);

    if (utilityTypeId === ELECTRIC_UTILITY_TYPE_ID) {
        const base = 0.003 + Math.random() * 0.012;
        const peakBoost = isPeakHour ? 1.8 : 1;
        return roundMoney(base * peakBoost);
    }
    if (utilityTypeId === WATER_UTILITY_TYPE_ID) {
        const base = 0.0015 + Math.random() * 0.0045;
        const peakBoost = isPeakHour ? 2.2 : 1;
        return Math.round(base * peakBoost * 1000) / 1000;
    }
    return 0;
}

async function tickMeters({ apartmentId = null, source = 'AUTO' } = {}) {
    const pool = await getPool();
    await ensureSmartMetersForActiveContracts(pool);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const request = transaction.request();

        let apartmentFilter = '';
        if (apartmentId) {
            apartmentFilter = 'AND sm.ApartmentID = @ApartmentID';
            request.input('ApartmentID', sql.Int, parseInt(apartmentId, 10));
        }

        const meters = await request.query(`
            SELECT
                sm.MeterID,
                sm.ApartmentID,
                sm.UtilityTypeID,
                sm.CurrentIndex,
                a.ApartmentCode,
                ut.UtilityName,
                ISNULL(rc.ResidentCount, 0) AS ResidentCount
            FROM SmartMeter sm
            JOIN Apartment a ON a.ApartmentID = sm.ApartmentID
            JOIN UtilityType ut ON ut.UtilityTypeID = sm.UtilityTypeID
            OUTER APPLY (
                SELECT COUNT(DISTINCT cr.ResidentID) AS ResidentCount
                FROM Contract c
                JOIN ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = sm.ApartmentID
                  AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
            ) rc
            WHERE sm.Status = 1
              ${apartmentFilter}
              AND EXISTS (
                  SELECT 1
                  FROM Contract c
                  WHERE c.ApartmentID = sm.ApartmentID
                    AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                    AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
              )
            ORDER BY sm.ApartmentID, sm.UtilityTypeID
        `);

        const updated = [];
        for (const meter of meters.recordset) {
            const deltaBase = randomDelta(meter.UtilityTypeID);
            const residentFactor = meter.UtilityTypeID === ELECTRIC_UTILITY_TYPE_ID
                ? 1 + Math.min(4, toNumber(meter.ResidentCount)) * 0.08
                : 1 + Math.min(4, toNumber(meter.ResidentCount)) * 0.15;
            const delta = meter.UtilityTypeID === ELECTRIC_UTILITY_TYPE_ID
                ? roundMoney(deltaBase * residentFactor)
                : Math.round(deltaBase * residentFactor * 1000) / 1000;
            if (delta <= 0) {
                continue;
            }

            const oldIndex = toNumber(meter.CurrentIndex);
            const newIndex = roundMoney(oldIndex + delta);

            await transaction.request()
                .input('MeterID', sql.Int, meter.MeterID)
                .input('CurrentIndex', sql.Decimal(18, 3), newIndex)
                .query(`
                    UPDATE SmartMeter
                    SET CurrentIndex = @CurrentIndex,
                        LastTickAt = GETDATE()
                    WHERE MeterID = @MeterID
                `);

            await transaction.request()
                .input('MeterID', sql.Int, meter.MeterID)
                .input('OldIndex', sql.Decimal(18, 3), oldIndex)
                .input('NewIndex', sql.Decimal(18, 3), newIndex)
                .input('DeltaValue', sql.Decimal(18, 3), delta)
                .input('Source', sql.VarChar(20), source)
                .query(`
                    INSERT INTO SmartMeterLog (MeterID, OldIndex, NewIndex, DeltaValue, Source, CreatedAt)
                    VALUES (@MeterID, @OldIndex, @NewIndex, @DeltaValue, @Source, GETDATE())
                `);

            updated.push({
                meterId: meter.MeterID,
                apartmentId: meter.ApartmentID,
                apartmentCode: meter.ApartmentCode,
                utilityTypeId: meter.UtilityTypeID,
                utilityName: meter.UtilityName,
                oldIndex,
                newIndex,
                delta
            });
        }

        await transaction.commit();
        return updated;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

function startSmartMeterSimulator() {
    if (intervalHandle) {
        return intervalHandle;
    }

    intervalHandle = setInterval(async () => {
        try {
            const updated = await tickMeters({ source: 'AUTO' });
            if (updated.length > 0) {
                console.log(`Smart meter tick completed: ${updated.length} meters updated`);
            }
        } catch (error) {
            console.warn('Smart meter tick skipped:', error.message);
        }
    }, FIVE_MINUTES_MS);

    intervalHandle.unref?.();
    return intervalHandle;
}

function stopSmartMeterSimulator() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}

module.exports = {
    tickMeters,
    startSmartMeterSimulator,
    stopSmartMeterSimulator
};
