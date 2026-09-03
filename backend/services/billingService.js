const { sql } = require('../config/db');

const ACTIVE_CONTRACT_STATUS_ID = 2;
const ACTIVE_CONTRACT_STATUS_IDS = [2, 5];
const ACTIVE_CONTRACT_STATUS_SQL = ACTIVE_CONTRACT_STATUS_IDS.join(', ');
const UNPAID_INVOICE_STATUS_ID = 1;
const PAID_INVOICE_STATUS_ID = 2;
const SUCCESS_PAYMENT_STATUS_ID = 2;
const FIXED_MONTHLY_RENT = 7500000;

const WORKFLOW_DRAFT = 'DRAFT';
const WORKFLOW_WAITING_PAYMENT = 'WAITING_PAYMENT';
const WORKFLOW_PAID = 'PAID';

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
    return Math.round(toNumber(value));
}

function roundQuantity(value) {
    return Math.round(toNumber(value) * 1000) / 1000;
}

function createRequest(executor) {
    return executor.request();
}

function getPeriodBounds(month, year) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    return { periodStart, periodEnd };
}

function getDueDate(month, year) {
    return new Date(year, month - 1, 10);
}

async function ensureSmartMetersForActiveContracts() {
    // Luồng mới không còn dùng smart meter tự tăng.
    return [];
}

async function getUtilityTypes(executor) {
    const result = await createRequest(executor).query(`
        SELECT UtilityTypeID, UtilityName
        FROM UtilityType
        WHERE UtilityName LIKE N'%điện%'
           OR UtilityName LIKE N'%dien%'
           OR UtilityName LIKE N'%electric%'
           OR UtilityName LIKE N'%nước%'
           OR UtilityName LIKE N'%nuoc%'
           OR UtilityName LIKE N'%water%'
    `);

    const electric = result.recordset.find((row) => {
        const name = String(row.UtilityName || '').toLowerCase();
        return name.includes('điện') || name.includes('dien') || name.includes('electric');
    });
    const water = result.recordset.find((row) => {
        const name = String(row.UtilityName || '').toLowerCase();
        return name.includes('nước') || name.includes('nuoc') || name.includes('water');
    });

    return { electric, water };
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
        AND EXISTS (
            SELECT 1
            FROM ContractResident cr
            WHERE cr.ContractID = c.ContractID
              AND cr.MoveOutDate IS NULL
        )
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
            CAST(${FIXED_MONTHLY_RENT} AS DECIMAL(18, 2)) AS Rent,
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
              AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
              AND EXISTS (
                  SELECT 1
                  FROM ContractResident cr
                  WHERE cr.ContractID = c.ContractID
                    AND cr.MoveOutDate IS NULL
              )
              AND i.InvoiceMonth = @InvoiceMonth
              AND i.InvoiceYear = @InvoiceYear
            ORDER BY i.InvoiceID DESC
        `);

    return result.recordset[0] || null;
}

async function getExistingInvoiceForContractPeriod(executor, contractId, month, year) {
    const result = await createRequest(executor)
        .input('ContractID', sql.Int, contractId)
        .input('InvoiceMonth', sql.Int, month)
        .input('InvoiceYear', sql.Int, year)
        .query(`
            SELECT TOP 1 InvoiceID
            FROM Invoice
            WHERE ContractID = @ContractID
              AND InvoiceMonth = @InvoiceMonth
              AND InvoiceYear = @InvoiceYear
            ORDER BY InvoiceID DESC
        `);

    return result.recordset[0] || null;
}

async function getPriceTiers(executor, utilityTypeId) {
    const result = await createRequest(executor)
        .input('UtilityTypeID', sql.Int, utilityTypeId)
        .query(`
            SELECT FromValue, ToValue, UnitPrice, TierName
            FROM UtilityPriceTier
            WHERE UtilityTypeID = @UtilityTypeID
              AND EffectiveDate = (
                  SELECT MAX(EffectiveDate)
                  FROM UtilityPriceTier
                  WHERE UtilityTypeID = @UtilityTypeID
              )
            ORDER BY FromValue
        `);

    return result.recordset;
}

async function calculateTierAmount(executor, utilityTypeId, consumption) {
    const qty = roundQuantity(consumption);
    if (qty <= 0) return 0;

    const tiers = await getPriceTiers(executor, utilityTypeId);
    if (tiers.length === 0) return 0;

    let amount = 0;
    for (const tier of tiers) {
        const from = toNumber(tier.FromValue);
        const to = tier.ToValue === null ? Number.POSITIVE_INFINITY : toNumber(tier.ToValue);
        if (qty <= from) continue;

        const billableQty = Math.min(qty, to) - from;
        if (billableQty > 0) {
            amount += billableQty * toNumber(tier.UnitPrice);
        }
    }

    return roundMoney(amount);
}

async function getPreviousIndex(executor, apartmentId, utilityTypeId, month, year) {
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
            ORDER BY ReadingYear DESC, ReadingMonth DESC, ReadingID DESC
        `);

    return toNumber(previous.recordset[0]?.NewIndex);
}

async function getMeterReadingState(executor, apartmentId, month, year) {
    const utilityTypes = await getUtilityTypes(executor);
    const configs = [
        { key: 'electric', label: 'Tiền điện', unit: 'kWh', chargeType: 'ELECTRIC', utility: utilityTypes.electric },
        { key: 'water', label: 'Tiền nước', unit: 'm³', chargeType: 'WATER', utility: utilityTypes.water }
    ];

    const readings = [];
    for (const config of configs) {
        if (!config.utility) {
            readings.push({ ...config, utilityTypeId: null, missingUtilityType: true, isEntered: false });
            continue;
        }

        const existing = await createRequest(executor)
            .input('ApartmentID', sql.Int, apartmentId)
            .input('UtilityTypeID', sql.Int, config.utility.UtilityTypeID)
            .input('ReadingMonth', sql.Int, month)
            .input('ReadingYear', sql.Int, year)
            .query(`
                SELECT TOP 1 ReadingID, OldIndex, NewIndex, ReadingDate
                FROM MeterReading
                WHERE ApartmentID = @ApartmentID
                  AND UtilityTypeID = @UtilityTypeID
                  AND ReadingMonth = @ReadingMonth
                  AND ReadingYear = @ReadingYear
                ORDER BY ReadingID DESC
            `);

        const row = existing.recordset[0];
        const oldIndex = row
            ? toNumber(row.OldIndex)
            : await getPreviousIndex(executor, apartmentId, config.utility.UtilityTypeID, month, year);
        const newIndex = row ? toNumber(row.NewIndex) : null;
        const consumption = newIndex === null ? 0 : roundQuantity(newIndex - oldIndex);
        const amount = newIndex === null ? 0 : await calculateTierAmount(executor, config.utility.UtilityTypeID, consumption);
        const tiers = await getPriceTiers(executor, config.utility.UtilityTypeID);

        readings.push({
            key: config.key,
            label: config.label,
            unit: config.unit,
            chargeType: config.chargeType,
            utilityTypeId: config.utility.UtilityTypeID,
            utilityName: config.utility.UtilityName,
            readingId: row?.ReadingID || null,
            oldIndex,
            newIndex,
            consumption,
            amount,
            averageUnitPrice: consumption > 0 ? roundMoney(amount / consumption) : toNumber(tiers[0]?.UnitPrice),
            tiers,
            isEntered: Boolean(row)
        });
    }

    return readings;
}

async function buildFixedInvoiceDetails(executor, contract, month, year) {
    const { periodStart, periodEnd } = getPeriodBounds(month, year);
    const details = [{
        chargeType: 'ROOM',
        description: `Tiền thuê căn hộ ${contract.ApartmentCode} tháng ${month}/${year}`,
        quantity: 1,
        unitPrice: FIXED_MONTHLY_RENT,
        amount: FIXED_MONTHLY_RENT
    }];

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
            ORDER BY s.ServiceName
        `);

    for (const row of services.recordset) {
        const unitPrice = toNumber(row.UnitPrice);
        const serviceName = String(row.ServiceName || '').toLowerCase();
        const monthlyFixedService = serviceName.includes('gym')
            || serviceName.includes('bơi')
            || serviceName.includes('pool')
            || serviceName.includes('wifi')
            || serviceName.includes('internet')
            || serviceName.includes('fpt');
        const quantity = monthlyFixedService ? 1 : Math.max(1, toNumber(row.Quantity));
        const amount = monthlyFixedService ? unitPrice : roundMoney(quantity * unitPrice);
        details.push({
            chargeType: 'SERVICE',
            description: `${row.ServiceName} tháng ${month}/${year}`,
            quantity,
            unitPrice,
            amount
        });
    }

    return details;
}

async function insertInvoiceDetail(executor, invoiceId, detail) {
    await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .input('ChargeType', sql.VarChar(50), detail.chargeType)
        .input('Description', sql.NVarChar(255), detail.description)
        .input('Quantity', sql.Decimal(18, 3), roundQuantity(detail.quantity))
        .input('UnitPrice', sql.Decimal(18, 2), roundMoney(detail.unitPrice))
        .input('Amount', sql.Decimal(18, 2), roundMoney(detail.amount))
        .query(`
            INSERT INTO InvoiceDetail (InvoiceID, ChargeType, Description, Quantity, UnitPrice, Amount)
            VALUES (@InvoiceID, @ChargeType, @Description, @Quantity, @UnitPrice, @Amount)
        `);
}

async function recalculateInvoiceTotal(executor, invoiceId) {
    const result = await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .query(`
            SELECT ISNULL(SUM(Amount), 0) AS TotalAmount
            FROM InvoiceDetail
            WHERE InvoiceID = @InvoiceID
        `);

    const totalAmount = roundMoney(result.recordset[0]?.TotalAmount);
    await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
        .query('UPDATE Invoice SET TotalAmount = @TotalAmount WHERE InvoiceID = @InvoiceID');

    return totalAmount;
}

async function syncDraftFixedDetails(executor, invoiceId, contract, month, year) {
    const invoice = await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .query(`
            SELECT WorkflowStatus
            FROM Invoice WITH (UPDLOCK, ROWLOCK)
            WHERE InvoiceID = @InvoiceID
        `);

    if (invoice.recordset[0]?.WorkflowStatus !== WORKFLOW_DRAFT) {
        return null;
    }

    await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .query(`
            DELETE FROM InvoiceDetail
            WHERE InvoiceID = @InvoiceID
              AND ChargeType IN ('ROOM', 'SERVICE')
        `);

    const details = await buildFixedInvoiceDetails(executor, contract, month, year);
    for (const detail of details) {
        await insertInvoiceDetail(executor, invoiceId, detail);
    }

    return recalculateInvoiceTotal(executor, invoiceId);
}

async function ensureDraftInvoiceForApartment(pool, params) {
    const month = parseInt(params.invoiceMonth || params.month, 10);
    const year = parseInt(params.invoiceYear || params.year, 10);
    const apartmentId = parseInt(params.apartmentId, 10);

    if (!apartmentId || !month || month < 1 || month > 12 || !year || year < 2000) {
        const error = new Error('Thông tin căn hộ/tháng/năm hóa đơn không hợp lệ');
        error.statusCode = 400;
        throw error;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const contract = await getActiveContractForPeriod(transaction, { apartmentId, month, year });
        if (!contract) {
            await transaction.commit();
            return null;
        }

        const existing = await getExistingInvoiceForContractPeriod(transaction, contract.ContractID, month, year);
        if (existing) {
            await syncDraftFixedDetails(transaction, existing.InvoiceID, contract, month, year);
            await transaction.commit();
            return existing.InvoiceID;
        }

        const details = await buildFixedInvoiceDetails(transaction, contract, month, year);
        const totalAmount = roundMoney(details.reduce((sum, detail) => sum + detail.amount, 0));

        const inserted = await createRequest(transaction)
            .input('ContractID', sql.Int, contract.ContractID)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .input('InvoiceDate', sql.Date, new Date())
            .input('DueDate', sql.Date, getDueDate(month, year))
            .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
            .input('StatusID', sql.Int, UNPAID_INVOICE_STATUS_ID)
            .input('WorkflowStatus', sql.VarChar(30), WORKFLOW_DRAFT)
            .query(`
                INSERT INTO Invoice (
                    ContractID, InvoiceMonth, InvoiceYear, InvoiceDate, DueDate,
                    TotalAmount, StatusID, WorkflowStatus
                )
                OUTPUT INSERTED.InvoiceID
                VALUES (
                    @ContractID, @InvoiceMonth, @InvoiceYear, @InvoiceDate, @DueDate,
                    @TotalAmount, @StatusID, @WorkflowStatus
                )
            `);

        const invoiceId = inserted.recordset[0].InvoiceID;
        for (const detail of details) {
            await insertInvoiceDetail(transaction, invoiceId, detail);
        }

        await transaction.commit();
        return invoiceId;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function updateManualMeterReadings(pool, params) {
    const apartmentId = parseInt(params.apartmentId, 10);
    const month = parseInt(params.invoiceMonth || params.month, 10);
    const year = parseInt(params.invoiceYear || params.year, 10);
    const values = {
        electric: params.electricNewIndex,
        water: params.waterNewIndex
    };

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const invoice = await createRequest(transaction)
            .input('ApartmentID', sql.Int, apartmentId)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .query(`
                SELECT TOP 1 i.InvoiceID, i.WorkflowStatus
                FROM Invoice i
                JOIN Contract c ON c.ContractID = i.ContractID
                WHERE c.ApartmentID = @ApartmentID
                  AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND EXISTS (
                      SELECT 1
                      FROM ContractResident cr
                      WHERE cr.ContractID = c.ContractID
                        AND cr.MoveOutDate IS NULL
                  )
                  AND i.InvoiceMonth = @InvoiceMonth
                  AND i.InvoiceYear = @InvoiceYear
                ORDER BY i.InvoiceID DESC
            `);

        const invoiceRow = invoice.recordset[0];
        if (!invoiceRow) {
            const error = new Error('Chưa có hóa đơn nháp cho căn hộ/tháng này');
            error.statusCode = 400;
            throw error;
        }
        if (invoiceRow.WorkflowStatus !== WORKFLOW_DRAFT) {
            const error = new Error('Hóa đơn đã chốt, không thể sửa chỉ số điện/nước');
            error.statusCode = 400;
            throw error;
        }

        const utilityTypes = await getUtilityTypes(transaction);
        for (const key of ['electric', 'water']) {
            const utility = utilityTypes[key];
            if (!utility || values[key] === undefined || values[key] === null || values[key] === '') continue;

            const oldIndex = await getPreviousIndex(transaction, apartmentId, utility.UtilityTypeID, month, year);
            const newIndex = roundQuantity(values[key]);
            if (newIndex < oldIndex) {
                const error = new Error('Số mới không được nhỏ hơn số cũ');
                error.statusCode = 400;
                throw error;
            }

            const existing = await createRequest(transaction)
                .input('ApartmentID', sql.Int, apartmentId)
                .input('UtilityTypeID', sql.Int, utility.UtilityTypeID)
                .input('ReadingMonth', sql.Int, month)
                .input('ReadingYear', sql.Int, year)
                .query(`
                    SELECT TOP 1 ReadingID
                    FROM MeterReading
                    WHERE ApartmentID = @ApartmentID
                      AND UtilityTypeID = @UtilityTypeID
                      AND ReadingMonth = @ReadingMonth
                      AND ReadingYear = @ReadingYear
                `);

            if (existing.recordset[0]) {
                await createRequest(transaction)
                    .input('ReadingID', sql.Int, existing.recordset[0].ReadingID)
                    .input('OldIndex', sql.Decimal(18, 3), oldIndex)
                    .input('NewIndex', sql.Decimal(18, 3), newIndex)
                    .query(`
                        UPDATE MeterReading
                        SET OldIndex = @OldIndex, NewIndex = @NewIndex, ReadingDate = GETDATE()
                        WHERE ReadingID = @ReadingID
                    `);
            } else {
                await createRequest(transaction)
                    .input('ApartmentID', sql.Int, apartmentId)
                    .input('EmployeeID', sql.Int, null)
                    .input('UtilityTypeID', sql.Int, utility.UtilityTypeID)
                    .input('ReadingMonth', sql.Int, month)
                    .input('ReadingYear', sql.Int, year)
                    .input('OldIndex', sql.Decimal(18, 3), oldIndex)
                    .input('NewIndex', sql.Decimal(18, 3), newIndex)
                    .query(`
                        INSERT INTO MeterReading (
                            ApartmentID, EmployeeID, UtilityTypeID, ReadingMonth, ReadingYear,
                            OldIndex, NewIndex, ReadingDate
                        )
                        VALUES (
                            @ApartmentID, @EmployeeID, @UtilityTypeID, @ReadingMonth, @ReadingYear,
                            @OldIndex, @NewIndex, GETDATE()
                        )
                    `);
            }
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function finalizeInvoice(pool, invoiceId) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const invoiceResult = await createRequest(transaction)
            .input('InvoiceID', sql.Int, invoiceId)
            .query(`
                SELECT i.InvoiceID, i.ContractID, i.InvoiceMonth, i.InvoiceYear, i.WorkflowStatus,
                       c.ApartmentID, a.ApartmentCode
                FROM Invoice i
                JOIN Contract c ON c.ContractID = i.ContractID
                JOIN Apartment a ON a.ApartmentID = c.ApartmentID
                WHERE i.InvoiceID = @InvoiceID
            `);

        const invoice = invoiceResult.recordset[0];
        if (!invoice) {
            const error = new Error('Không tìm thấy hóa đơn');
            error.statusCode = 404;
            throw error;
        }
        if (invoice.WorkflowStatus !== WORKFLOW_DRAFT) {
            const error = new Error('Chỉ hóa đơn nháp mới được chốt');
            error.statusCode = 400;
            throw error;
        }

        const readings = await getMeterReadingState(transaction, invoice.ApartmentID, invoice.InvoiceMonth, invoice.InvoiceYear);
        const missing = readings.filter((reading) => !reading.isEntered || reading.missingUtilityType);
        if (missing.length > 0) {
            const error = new Error('Chưa nhập đủ số điện/nước mới nên chưa thể chốt hóa đơn');
            error.statusCode = 400;
            throw error;
        }

        await createRequest(transaction)
            .input('InvoiceID', sql.Int, invoiceId)
            .query(`
                DELETE FROM InvoiceDetail
                WHERE InvoiceID = @InvoiceID
                  AND ChargeType IN ('ELECTRIC', 'WATER')
            `);

        for (const reading of readings) {
            const formula = `(${reading.newIndex} - ${reading.oldIndex}) x đơn giá bậc thang`;
            await insertInvoiceDetail(transaction, invoiceId, {
                chargeType: reading.chargeType,
                description: `${reading.label}: ${formula} = ${reading.amount.toLocaleString('vi-VN')} VND`,
                quantity: reading.consumption,
                unitPrice: reading.averageUnitPrice,
                amount: reading.amount
            });
        }

        const totalAmount = await recalculateInvoiceTotal(transaction, invoiceId);
        await createRequest(transaction)
            .input('InvoiceID', sql.Int, invoiceId)
            .input('WorkflowStatus', sql.VarChar(30), WORKFLOW_WAITING_PAYMENT)
            .input('StatusID', sql.Int, UNPAID_INVOICE_STATUS_ID)
            .query(`
                UPDATE Invoice
                SET WorkflowStatus = @WorkflowStatus, StatusID = @StatusID
                WHERE InvoiceID = @InvoiceID
            `);

        await transaction.commit();
        return { invoiceId, totalAmount };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function getMonthlyInvoicePreview(pool, params) {
    const month = parseInt(params.invoiceMonth || params.month, 10);
    const year = parseInt(params.invoiceYear || params.year, 10);
    const apartmentId = params.apartmentId ? parseInt(params.apartmentId, 10) : null;
    const contractId = params.contractId ? parseInt(params.contractId, 10) : null;
    const contract = await getActiveContractForPeriod(pool, { apartmentId, contractId, month, year });

    if (!contract) {
        return { month, year, contract: null, details: [], totalAmount: 0 };
    }

    const details = await buildFixedInvoiceDetails(pool, contract, month, year);
    return {
        month,
        year,
        contract,
        details,
        totalAmount: roundMoney(details.reduce((sum, detail) => sum + detail.amount, 0))
    };
}

async function generateMonthlyInvoice(pool, params) {
    const invoiceId = await ensureDraftInvoiceForApartment(pool, params);
    if (!invoiceId) {
        const error = new Error('Không tìm thấy hợp đồng hiệu lực cho căn hộ/kỳ này');
        error.statusCode = 400;
        throw error;
    }
    return finalizeInvoice(pool, invoiceId);
}

async function syncInvoiceStatus(executor, invoiceId) {
    const result = await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .query(`
            SELECT
                i.TotalAmount,
                i.ContractID,
                i.InvoiceMonth,
                i.InvoiceYear,
                c.ApartmentID,
                ISNULL(SUM(CASE WHEN p.StatusID = ${SUCCESS_PAYMENT_STATUS_ID} THEN p.Amount ELSE 0 END), 0) AS PaidAmount
            FROM Invoice i
            JOIN Contract c ON c.ContractID = i.ContractID
            LEFT JOIN Payment p ON p.InvoiceID = i.InvoiceID
            WHERE i.InvoiceID = @InvoiceID
            GROUP BY i.TotalAmount, i.ContractID, i.InvoiceMonth, i.InvoiceYear, c.ApartmentID
        `);

    const row = result.recordset[0];
    if (!row) return null;

    const paidAmount = toNumber(row.PaidAmount);
    const totalAmount = toNumber(row.TotalAmount);
    const isPaid = paidAmount >= totalAmount && totalAmount > 0;
    const statusId = isPaid ? PAID_INVOICE_STATUS_ID : UNPAID_INVOICE_STATUS_ID;
    const workflowStatus = isPaid ? WORKFLOW_PAID : WORKFLOW_WAITING_PAYMENT;

    await createRequest(executor)
        .input('InvoiceID', sql.Int, invoiceId)
        .input('StatusID', sql.Int, statusId)
        .input('WorkflowStatus', sql.VarChar(30), workflowStatus)
        .query(`
            UPDATE Invoice
            SET StatusID = @StatusID, WorkflowStatus = @WorkflowStatus
            WHERE InvoiceID = @InvoiceID
        `);

    if (isPaid) {
        await createRequest(executor)
            .input('ApartmentID', sql.Int, row.ApartmentID)
            .input('InvoiceMonth', sql.Int, row.InvoiceMonth)
            .input('InvoiceYear', sql.Int, row.InvoiceYear)
            .query(`
                UPDATE sm
                SET sm.CurrentIndex = mr.NewIndex,
                    sm.LastTickAt = GETDATE()
                FROM SmartMeter sm
                JOIN MeterReading mr ON mr.ApartmentID = sm.ApartmentID
                   AND mr.UtilityTypeID = sm.UtilityTypeID
                WHERE sm.ApartmentID = @ApartmentID
                  AND mr.ReadingMonth = @InvoiceMonth
                  AND mr.ReadingYear = @InvoiceYear
                  AND mr.NewIndex IS NOT NULL
            `);
    }

    return {
        statusId,
        workflowStatus,
        paidAmount,
        remainingAmount: Math.max(0, roundMoney(totalAmount - paidAmount))
    };
}

module.exports = {
    ACTIVE_CONTRACT_STATUS_ID,
    ACTIVE_CONTRACT_STATUS_IDS,
    ACTIVE_CONTRACT_STATUS_SQL,
    UNPAID_INVOICE_STATUS_ID,
    PAID_INVOICE_STATUS_ID,
    SUCCESS_PAYMENT_STATUS_ID,
    FIXED_MONTHLY_RENT,
    WORKFLOW_DRAFT,
    WORKFLOW_WAITING_PAYMENT,
    WORKFLOW_PAID,
    ensureSmartMetersForActiveContracts,
    ensureDraftInvoiceForApartment,
    updateManualMeterReadings,
    finalizeInvoice,
    generateMonthlyInvoice,
    getMonthlyInvoicePreview,
    getMeterReadingState,
    calculateTierAmount,
    syncInvoiceStatus,
    toNumber,
    roundMoney,
    roundQuantity,
    getPeriodBounds
};
