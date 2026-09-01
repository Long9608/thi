const { sql } = require('../config/db');

const ACTIVE_CONTRACT_STATUS_ID = 2;
const ACTIVE_CONTRACT_STATUS_IDS = [2, 5];
const ACTIVE_CONTRACT_STATUS_SQL = ACTIVE_CONTRACT_STATUS_IDS.join(', ');
const UNPAID_INVOICE_STATUS_ID = 1;
const PAID_INVOICE_STATUS_ID = 2;
const SUCCESS_PAYMENT_STATUS_ID = 2;
const ELECTRIC_UTILITY_TYPE_ID = 1;
const WATER_UTILITY_TYPE_ID = 2;

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
    return Math.round(toNumber(value) * 100) / 100;
}

function getPeriodBounds(month, year) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    return { periodStart, periodEnd };
}

function createRequest(executor) {
    return executor.request();
}

async function ensureSmartMetersForActiveContracts(executor) {
    await createRequest(executor).query(`
        INSERT INTO SmartMeter (ApartmentID, UtilityTypeID, CurrentIndex, LastTickAt, Status, CreatedAt)
        SELECT c.ApartmentID, ut.UtilityTypeID, 0, NULL, 1, GETDATE()
        FROM Contract c
        CROSS JOIN UtilityType ut
        WHERE c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
          AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
          AND ut.UtilityTypeID IN (${ELECTRIC_UTILITY_TYPE_ID}, ${WATER_UTILITY_TYPE_ID})
          AND NOT EXISTS (
              SELECT 1
              FROM SmartMeter sm
              WHERE sm.ApartmentID = c.ApartmentID
                AND sm.UtilityTypeID = ut.UtilityTypeID
          )
    `);
}

async function getActiveContractForPeriod(executor, { apartmentId, contractId, month, year }) {
    const { periodStart, periodEnd } = getPeriodBounds(month, year);
    const request = createRequest(executor)
        .input('PeriodStart', sql.Date, periodStart)
        .input('PeriodEnd', sql.Date, periodEnd);

    let where = `
        c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
        AND c.StartDate <= @PeriodEnd
        AND c.EndDate >= @PeriodStart
    `;

    if (contractId) {
        where += ' AND c.ContractID = @ContractID';
        request.input('ContractID', sql.Int, contractId);
    }

    if (apartmentId) {
        where += ' AND c.ApartmentID = @ApartmentID';
        request.input('ApartmentID', sql.Int, apartmentId);
    }

    const result = await request.query(`
        SELECT TOP 1
            c.ContractID,
            c.ContractNumber,
            c.ApartmentID,
            c.OwnerID,
            c.Rent,
            c.StartDate,
            c.EndDate,
            a.ApartmentCode,
            a.Area,
            r.FullName AS OwnerName
        FROM Contract c
        JOIN Apartment a ON a.ApartmentID = c.ApartmentID
        JOIN Resident r ON r.ResidentID = c.OwnerID
        WHERE ${where}
        ORDER BY c.StartDate DESC, c.ContractID DESC
    `);

    return result.recordset[0] || null;
}

async function getExistingInvoiceForApartmentPeriod(executor, apartmentId, month, year) {
    const result = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('InvoiceMonth', sql.Int, month)
        .input('InvoiceYear', sql.Int, year)
        .query(`
            SELECT TOP 1 i.InvoiceID
            FROM Invoice i
            JOIN Contract c ON c.ContractID = i.ContractID
            WHERE c.ApartmentID = @ApartmentID
              AND i.InvoiceMonth = @InvoiceMonth
              AND i.InvoiceYear = @InvoiceYear
            ORDER BY i.InvoiceID DESC
        `);

    return result.recordset[0] || null;
}

async function calculateTierAmount(executor, utilityTypeId, consumption) {
    const qty = roundMoney(consumption);
    if (qty <= 0) {
        return 0;
    }

    const result = await createRequest(executor)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .query(`
            SELECT FromValue, ToValue, UnitPrice
            FROM UtilityPriceTier
            WHERE UtilityTypeID = @UtilityTypeID
              AND EffectiveDate = (
                  SELECT MAX(EffectiveDate)
                  FROM UtilityPriceTier
                  WHERE UtilityTypeID = @UtilityTypeID
              )
            ORDER BY FromValue
        `);

    if (result.recordset.length === 0) {
        return 0;
    }

    let amount = 0;
    let lastTo = 0;
    let lastPrice = 0;
    for (const tier of result.recordset) {
        const from = toNumber(tier.FromValue);
        const to = tier.ToValue === null ? Number.POSITIVE_INFINITY : toNumber(tier.ToValue);
        const price = toNumber(tier.UnitPrice);
        lastTo = to;
        lastPrice = price;

        if (qty <= from) {
            continue;
        }

        const billableQty = Math.min(qty, to) - from;
        if (billableQty > 0) {
            amount += billableQty * price;
        }
    }

    if (Number.isFinite(lastTo) && qty > lastTo) {
        amount += (qty - lastTo) * lastPrice;
    }

    return roundMoney(amount);
}

async function closeMeterReadingForPeriod(executor, apartmentId, utilityTypeId, month, year) {
    await ensureSmartMetersForActiveContracts(executor);

    const existing = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .input('ReadingMonth', sql.Int, month)
        .input('ReadingYear', sql.Int, year)
        .query(`
            SELECT TOP 1 ReadingID, OldIndex, NewIndex, ReadingDate
            FROM MeterReading
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
              AND ReadingMonth = @ReadingMonth
              AND ReadingYear = @ReadingYear
        `);

    if (existing.recordset[0]) {
        const row = existing.recordset[0];
        return {
            readingId: row.ReadingID,
            oldIndex: toNumber(row.OldIndex),
            newIndex: toNumber(row.NewIndex),
            consumption: roundMoney(toNumber(row.NewIndex) - toNumber(row.OldIndex))
        };
    }

    const meterResult = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .query(`
            SELECT TOP 1 MeterID, CurrentIndex
            FROM SmartMeter
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
        `);

    const meter = meterResult.recordset[0];
    if (!meter) {
        return { readingId: null, oldIndex: 0, newIndex: 0, consumption: 0 };
    }

    const previous = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .input('ReadingMonth', sql.Int, month)
        .input('ReadingYear', sql.Int, year)
        .query(`
            SELECT TOP 1 NewIndex
            FROM MeterReading
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
              AND (ReadingYear < @ReadingYear OR (ReadingYear = @ReadingYear AND ReadingMonth < @ReadingMonth))
            ORDER BY ReadingYear DESC, ReadingMonth DESC
        `);

    const oldIndex = toNumber(previous.recordset[0]?.NewIndex);
    const newIndex = Math.max(oldIndex, toNumber(meter.CurrentIndex));

    const inserted = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('EmployeeID', sql.Int, null)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .input('ReadingMonth', sql.Int, month)
        .input('ReadingYear', sql.Int, year)
        .input('OldIndex', sql.Decimal(18, 3), oldIndex)
        .input('NewIndex', sql.Decimal(18, 3), newIndex)
        .query(`
            INSERT INTO MeterReading (
                ApartmentID, EmployeeID, UtilityTypeID, ReadingMonth, ReadingYear,
                OldIndex, NewIndex, ReadingDate
            )
            OUTPUT INSERTED.ReadingID
            VALUES (
                @ApartmentID, @EmployeeID, @UtilityTypeID, @ReadingMonth, @ReadingYear,
                @OldIndex, @NewIndex, GETDATE()
            )
        `);

    return {
        readingId: inserted.recordset[0].ReadingID,
        oldIndex,
        newIndex,
        consumption: roundMoney(newIndex - oldIndex)
    };
}

async function previewMeterReadingForPeriod(executor, apartmentId, utilityTypeId, month, year) {
    await ensureSmartMetersForActiveContracts(executor);

    const existing = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .input('ReadingMonth', sql.Int, month)
        .input('ReadingYear', sql.Int, year)
        .query(`
            SELECT TOP 1 ReadingID, OldIndex, NewIndex
            FROM MeterReading
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
              AND ReadingMonth = @ReadingMonth
              AND ReadingYear = @ReadingYear
        `);

    if (existing.recordset[0]) {
        const row = existing.recordset[0];
        return {
            readingId: row.ReadingID,
            oldIndex: toNumber(row.OldIndex),
            newIndex: toNumber(row.NewIndex),
            consumption: roundMoney(toNumber(row.NewIndex) - toNumber(row.OldIndex))
        };
    }

    const meterResult = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .query(`
            SELECT TOP 1 CurrentIndex
            FROM SmartMeter
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
        `);

    const previous = await createRequest(executor)
        .input('ApartmentID', sql.Int, apartmentId)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .input('ReadingMonth', sql.Int, month)
        .input('ReadingYear', sql.Int, year)
        .query(`
            SELECT TOP 1 NewIndex
            FROM MeterReading
            WHERE ApartmentID = @ApartmentID
              AND UtilityTypeID = @UtilityTypeID
              AND (ReadingYear < @ReadingYear OR (ReadingYear = @ReadingYear AND ReadingMonth < @ReadingMonth))
            ORDER BY ReadingYear DESC, ReadingMonth DESC
        `);

    const oldIndex = toNumber(previous.recordset[0]?.NewIndex);
    const newIndex = Math.max(oldIndex, toNumber(meterResult.recordset[0]?.CurrentIndex));

    return {
        readingId: null,
        oldIndex,
        newIndex,
        consumption: roundMoney(newIndex - oldIndex)
    };
}

async function buildInvoiceDetails(executor, contract, month, year, otherItems = [], options = {}) {
    const { periodStart, periodEnd } = getPeriodBounds(month, year);
    const getReading = options.preview ? previewMeterReadingForPeriod : closeMeterReadingForPeriod;
    const details = [];

    details.push({
        chargeType: 'ROOM',
        description: `Tien thue can ho ${contract.ApartmentCode} thang ${month}/${year}`,
        quantity: 1,
        unitPrice: toNumber(contract.Rent),
        amount: toNumber(contract.Rent)
    });

    for (const utility of [
        { id: ELECTRIC_UTILITY_TYPE_ID, chargeType: 'ELECTRIC', unit: 'kWh', label: 'Tien dien' },
        { id: WATER_UTILITY_TYPE_ID, chargeType: 'WATER', unit: 'm3', label: 'Tien nuoc' }
    ]) {
        const reading = await getReading(executor, contract.ApartmentID, utility.id, month, year);
        if (reading.consumption > 0) {
            const amount = await calculateTierAmount(executor, utility.id, reading.consumption);
            details.push({
                chargeType: utility.chargeType,
                description: `${utility.label} (${reading.oldIndex} -> ${reading.newIndex} ${utility.unit})`,
                quantity: reading.consumption,
                unitPrice: reading.consumption > 0 ? roundMoney(amount / reading.consumption) : 0,
                amount
            });
        }
    }

    const parking = await createRequest(executor)
        .input('ContractID', sql.Int, contract.ContractID)
        .input('PeriodStart', sql.Date, periodStart)
        .input('PeriodEnd', sql.Date, periodEnd)
        .query(`
            SELECT
                v.PlateNumber,
                vt.TypeName,
                ISNULL(vt.MonthlyFee, 0) AS MonthlyFee
            FROM ContractResident cr
            JOIN Vehicle v ON v.ResidentID = cr.ResidentID AND v.Status = 1
            JOIN ParkingCard pc ON pc.VehicleID = v.VehicleID AND pc.Status = 1
            JOIN VehicleType vt ON vt.VehicleTypeID = v.VehicleTypeID
            WHERE cr.ContractID = @ContractID
              AND cr.MoveOutDate IS NULL
              AND ISNULL(pc.IssueDate, @PeriodStart) <= @PeriodEnd
              AND ISNULL(pc.ExpiredDate, @PeriodEnd) >= @PeriodStart
        `);

    for (const row of parking.recordset) {
        const fee = toNumber(row.MonthlyFee);
        if (fee > 0) {
            details.push({
                chargeType: 'PARKING',
                description: `Phi gui xe ${row.TypeName || ''} ${row.PlateNumber || ''}`.trim(),
                quantity: 1,
                unitPrice: fee,
                amount: fee
            });
        }
    }

    const services = await createRequest(executor)
        .input('ContractID', sql.Int, contract.ContractID)
        .input('PeriodStart', sql.Date, periodStart)
        .input('PeriodEnd', sql.Date, periodEnd)
        .query(`
            SELECT
                s.ServiceName,
                ISNULL(sr.Quantity, 1) AS Quantity,
                ISNULL(s.Price, 0) AS UnitPrice
            FROM ServiceRegistration sr
            JOIN Service s ON s.ServiceID = sr.ServiceID
            WHERE sr.ContractID = @ContractID
              AND sr.Status = 1
              AND s.Status = 1
              AND ISNULL(sr.RegisterDate, @PeriodStart) <= @PeriodEnd
              AND ISNULL(sr.EndDate, @PeriodEnd) >= @PeriodStart
        `);

    for (const row of services.recordset) {
        const quantity = Math.max(1, toNumber(row.Quantity));
        const unitPrice = toNumber(row.UnitPrice);
        details.push({
            chargeType: 'SERVICE',
            description: row.ServiceName || 'Phi dich vu',
            quantity,
            unitPrice,
            amount: roundMoney(quantity * unitPrice)
        });
    }

    for (const item of otherItems) {
        const quantity = Math.max(1, toNumber(item.quantity || 1));
        const unitPrice = Math.max(0, toNumber(item.unitPrice));
        const amount = item.amount !== undefined ? Math.max(0, toNumber(item.amount)) : roundMoney(quantity * unitPrice);
        if (amount > 0) {
            details.push({
                chargeType: 'OTHER',
                description: item.description || 'Khoan phat sinh khac',
                quantity,
                unitPrice,
                amount
            });
        }
    }

    return details.map((detail) => ({
        ...detail,
        quantity: roundMoney(detail.quantity),
        unitPrice: roundMoney(detail.unitPrice),
        amount: roundMoney(detail.amount)
    }));
}

async function getMonthlyInvoicePreview(pool, params) {
    const month = parseInt(params.invoiceMonth || params.month, 10);
    const year = parseInt(params.invoiceYear || params.year, 10);
    const apartmentId = params.apartmentId ? parseInt(params.apartmentId, 10) : null;
    const contractId = params.contractId ? parseInt(params.contractId, 10) : null;

    if (!month || month < 1 || month > 12 || !year || year < 2000) {
        const error = new Error('Thang/nam hoa don khong hop le');
        error.statusCode = 400;
        throw error;
    }

    const contract = await getActiveContractForPeriod(pool, { apartmentId, contractId, month, year });
    if (!contract) {
        return {
            month,
            year,
            contract: null,
            details: [],
            totalAmount: 0
        };
    }

    const details = await buildInvoiceDetails(pool, contract, month, year, params.otherItems || [], { preview: true });
    const totalAmount = roundMoney(details.reduce((sum, detail) => sum + detail.amount, 0));

    return {
        month,
        year,
        contract,
        details,
        totalAmount
    };
}

async function generateMonthlyInvoice(pool, params) {
    const month = parseInt(params.invoiceMonth || params.month, 10);
    const year = parseInt(params.invoiceYear || params.year, 10);
    const apartmentId = params.apartmentId ? parseInt(params.apartmentId, 10) : null;
    const contractId = params.contractId ? parseInt(params.contractId, 10) : null;

    if (!month || month < 1 || month > 12 || !year || year < 2000) {
        const error = new Error('Thang/nam hoa don khong hop le');
        error.statusCode = 400;
        throw error;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const contract = await getActiveContractForPeriod(transaction, { apartmentId, contractId, month, year });
        if (!contract) {
            const error = new Error('Khong tim thay hop dong hieu luc cho can ho/ky nay');
            error.statusCode = 400;
            throw error;
        }

        const existingForApartment = await getExistingInvoiceForApartmentPeriod(transaction, contract.ApartmentID, month, year);
        if (existingForApartment) {
            const error = new Error('Can ho nay da co hoa don tong trong thang/nam nay');
            error.statusCode = 400;
            error.invoiceId = existingForApartment.InvoiceID;
            throw error;
        }

        const existingForContract = await createRequest(transaction)
            .input('ContractID', sql.Int, contract.ContractID)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .query(`
                SELECT InvoiceID
                FROM Invoice
                WHERE ContractID = @ContractID
                  AND InvoiceMonth = @InvoiceMonth
                  AND InvoiceYear = @InvoiceYear
            `);

        if (existingForContract.recordset[0]) {
            const error = new Error('Hop dong nay da co hoa don tong trong thang/nam nay');
            error.statusCode = 400;
            error.invoiceId = existingForContract.recordset[0].InvoiceID;
            throw error;
        }

        const details = await buildInvoiceDetails(transaction, contract, month, year, params.otherItems || []);
        const totalAmount = roundMoney(details.reduce((sum, detail) => sum + detail.amount, 0));
        const dueDate = params.dueDate ? new Date(params.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const inserted = await createRequest(transaction)
            .input('ContractID', sql.Int, contract.ContractID)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .input('InvoiceDate', sql.Date, new Date())
            .input('DueDate', sql.Date, dueDate)
            .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
            .input('StatusID', sql.Int, UNPAID_INVOICE_STATUS_ID)
            .query(`
                INSERT INTO Invoice (
                    ContractID, InvoiceMonth, InvoiceYear, InvoiceDate, DueDate, TotalAmount, StatusID
                )
                OUTPUT INSERTED.InvoiceID
                VALUES (
                    @ContractID, @InvoiceMonth, @InvoiceYear, @InvoiceDate, @DueDate, @TotalAmount, @StatusID
                )
            `);

        const invoiceId = inserted.recordset[0].InvoiceID;
        for (const detail of details) {
            await createRequest(transaction)
                .input('InvoiceID', sql.Int, invoiceId)
                .input('ChargeType', sql.VarChar(50), detail.chargeType)
                .input('Description', sql.NVarChar(255), detail.description)
                .input('Quantity', sql.Decimal(18, 2), detail.quantity)
                .input('UnitPrice', sql.Decimal(18, 2), detail.unitPrice)
                .input('Amount', sql.Decimal(18, 2), detail.amount)
                .query(`
                    INSERT INTO InvoiceDetail (
                        InvoiceID, ChargeType, Description, Quantity, UnitPrice, Amount
                    )
                    VALUES (
                        @InvoiceID, @ChargeType, @Description, @Quantity, @UnitPrice, @Amount
                    )
                `);
        }

        await transaction.commit();
        return { invoiceId, totalAmount, details, contract };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function syncInvoiceStatus(executor, invoiceId) {
    const result = await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .query(`
            SELECT
                i.TotalAmount,
                ISNULL(SUM(CASE WHEN p.StatusID = ${SUCCESS_PAYMENT_STATUS_ID} THEN p.Amount ELSE 0 END), 0) AS PaidAmount
            FROM Invoice i
            LEFT JOIN Payment p ON p.InvoiceID = i.InvoiceID
            WHERE i.InvoiceID = @InvoiceID
            GROUP BY i.TotalAmount
        `);

    const row = result.recordset[0];
    if (!row) {
        return null;
    }

    const statusId = toNumber(row.PaidAmount) >= toNumber(row.TotalAmount)
        ? PAID_INVOICE_STATUS_ID
        : UNPAID_INVOICE_STATUS_ID;

    await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .input('StatusID', sql.Int, statusId)
        .query('UPDATE Invoice SET StatusID = @StatusID WHERE InvoiceID = @InvoiceID');

    return {
        statusId,
        paidAmount: toNumber(row.PaidAmount),
        remainingAmount: Math.max(0, roundMoney(toNumber(row.TotalAmount) - toNumber(row.PaidAmount)))
    };
}

module.exports = {
    ACTIVE_CONTRACT_STATUS_ID,
    ACTIVE_CONTRACT_STATUS_IDS,
    ACTIVE_CONTRACT_STATUS_SQL,
    UNPAID_INVOICE_STATUS_ID,
    PAID_INVOICE_STATUS_ID,
    SUCCESS_PAYMENT_STATUS_ID,
    ELECTRIC_UTILITY_TYPE_ID,
    WATER_UTILITY_TYPE_ID,
    ensureSmartMetersForActiveContracts,
    generateMonthlyInvoice,
    getMonthlyInvoicePreview,
    syncInvoiceStatus,
    toNumber,
    roundMoney,
    getPeriodBounds
};
