const { getPool, sql } = require('../config/db');
const { getAccessScope, getCurrentResidentId, contractOwnershipSql, apartmentOwnershipSql } = require('../utils/accessScope');
const {
    generateMonthlyInvoice,
    getMonthlyInvoicePreview,
    syncInvoiceStatus,
    SUCCESS_PAYMENT_STATUS_ID,
    PAID_INVOICE_STATUS_ID,
    ensureDraftInvoiceForApartment,
    updateManualMeterReadings,
    finalizeInvoice,
    getMeterReadingState,
    WORKFLOW_DRAFT,
    WORKFLOW_WAITING_PAYMENT,
    WORKFLOW_PAID,
    ACTIVE_CONTRACT_STATUS_SQL,
    toNumber,
    roundMoney
} = require('../services/billingService');

function parseJsonArray(value) {
    if (!value) return [];
    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
}

function normalizeInvoice(row) {
    const invoice = {
        ...row,
        Details: parseJsonArray(row.Details),
        Payments: parseJsonArray(row.Payments)
    };
    invoice.PaidAmount = toNumber(invoice.PaidAmount);
    invoice.RemainingAmount = Math.max(0, roundMoney(toNumber(invoice.TotalAmount) - invoice.PaidAmount));
    invoice.IsPaid = invoice.StatusID !== 4 && invoice.WorkflowStatus !== WORKFLOW_DRAFT && invoice.PaidAmount >= toNumber(invoice.TotalAmount);
    invoice.WorkflowStatus = invoice.IsPaid ? WORKFLOW_PAID : (invoice.WorkflowStatus || WORKFLOW_WAITING_PAYMENT);
    invoice.WorkflowStatusName = {
        [WORKFLOW_DRAFT]: 'Nháp',
        [WORKFLOW_WAITING_PAYMENT]: 'Chờ thanh toán',
        [WORKFLOW_PAID]: 'Đã thanh toán'
    }[invoice.WorkflowStatus] || invoice.InvoiceStatus;
    invoice.DisplayStatusID = invoice.IsPaid ? PAID_INVOICE_STATUS_ID : invoice.StatusID;
    invoice.DisplayInvoiceStatus = invoice.WorkflowStatusName;
    if (invoice.StatusID === 4) invoice.DisplayInvoiceStatus = invoice.WorkflowStatusName = 'Đã hủy';
    return invoice;
}

async function requireApartmentScope(req, pool, apartmentId) {
    const accessScope = getAccessScope(req, {
        viewAll: 'INVOICE_VIEW_ALL',
        viewOwn: 'INVOICE_VIEW_OWN'
    });
    if (accessScope === 'none') {
        return { error: { status: 403, message: 'Bạn không có quyền xem hóa đơn' } };
    }
    if (accessScope === 'all') return { accessScope };

    const residentId = await getCurrentResidentId(pool, req.userId);
    if (!residentId) {
        return { error: { status: 403, message: 'Không tìm thấy cư dân hiện tại' } };
    }
    const ownership = await pool.request()
        .input('ApartmentID', sql.Int, apartmentId)
        .input('CurrentResidentID', sql.Int, residentId)
        .query(`
            SELECT TOP 1 1 AS HasAccess
            FROM Apartment a WHERE a.ApartmentID=@ApartmentID
              AND ${apartmentOwnershipSql('a.ApartmentID')}
        `);
    return ownership.recordset[0] ? { accessScope, residentId } : {
        error: { status: 404, message: 'Apartment invoice not found' }
    };
}

exports.getAllInvoices = async (req, res) => {
    try {
        const {
            statusId,
            contractId,
            apartmentId,
            month,
            year,
            page = 1,
            limit = 20
        } = req.query;

        const pool = await getPool();
        const accessScope = getAccessScope(req, {
            viewAll: 'INVOICE_VIEW_ALL',
            viewOwn: 'INVOICE_VIEW_OWN',
            legacy: ['INVOICE_VIEW']
        });
        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hóa đơn' });
        }
        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 999);
        const offset = (safePage - 1) * safeLimit;

        let where = 'WHERE 1=1';
        const request = pool.request();
        const countRequest = pool.request();
        const addInput = (name, type, value) => {
            request.input(name, type, value);
            countRequest.input(name, type, value);
        };

        if (accessScope === 'own') {
            const currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            where += ' AND (c.OwnerID = @CurrentResidentID OR EXISTS (SELECT 1 FROM ContractResident cr WHERE cr.ContractID = c.ContractID AND cr.ResidentID = @CurrentResidentID AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))))';
            addInput('CurrentResidentID', sql.Int, currentResidentId);
        }

        if (statusId) {
            where += ' AND i.StatusID = @StatusID';
            addInput('StatusID', sql.Int, parseInt(statusId, 10));
        }
        if (contractId) {
            where += ' AND i.ContractID = @ContractID';
            addInput('ContractID', sql.Int, parseInt(contractId, 10));
        }
        if (apartmentId) {
            where += ' AND c.ApartmentID = @ApartmentID';
            addInput('ApartmentID', sql.Int, parseInt(apartmentId, 10));
        }
        if (month) {
            where += ' AND i.InvoiceMonth = @Month';
            addInput('Month', sql.Int, parseInt(month, 10));
        }
        if (year) {
            where += ' AND i.InvoiceYear = @Year';
            addInput('Year', sql.Int, parseInt(year, 10));
        }

        const countResult = await countRequest.query(`
            SELECT COUNT(*) AS total
            FROM Invoice i
            JOIN Contract c ON c.ContractID = i.ContractID
            ${where}
        `);

        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);
        const result = await request.query(`
            SELECT
                i.InvoiceID,
                CASE WHEN i.DueDate<CAST(GETDATE() AS date) AND i.StatusID NOT IN (2,4) AND i.WorkflowStatus<>'DRAFT'
                  AND i.TotalAmount>ISNULL((SELECT SUM(Amount) FROM Payment WHERE InvoiceID=i.InvoiceID AND StatusID=2),0) THEN 1 ELSE 0 END IsOverdue,
                (SELECT RequestID FROM InvoiceDueDateExtensionRequest WHERE InvoiceID=i.InvoiceID AND Status='PENDING') PendingExtensionID,

                (SELECT TOP 1 s.SubmittedAt FROM InvoicePaymentSubmission s WHERE s.InvoiceID=i.InvoiceID AND s.ConfirmedAt IS NULL ORDER BY s.SubmittedAt DESC) AS PaymentSubmittedAt,
                i.ContractID,
                i.InvoiceMonth,
                i.InvoiceYear,
                i.InvoiceDate,
                i.DueDate,
                i.TotalAmount,
                i.StatusID,
                i.WorkflowStatus,
                ist.StatusName AS InvoiceStatus,
                c.ContractNumber,
                a.ApartmentID,
                a.ApartmentCode,
                r.FullName AS OwnerName,
                ISNULL(pay.PaidAmount, 0) AS PaidAmount,
                (
                    SELECT InvoiceDetailID, ChargeType, Description, Quantity, UnitPrice, Amount
                    FROM InvoiceDetail
                    WHERE InvoiceID = i.InvoiceID
                    ORDER BY InvoiceDetailID
                    FOR JSON PATH
                ) AS Details,
                (
                    SELECT p.PaymentID, p.Amount, p.PaymentDate, p.StatusID, ps.StatusName AS PaymentStatus,
                           p.TransactionCode, pm.MethodName AS PaymentMethod
                    FROM Payment p
                    LEFT JOIN PaymentMethod pm ON p.MethodID = pm.MethodID
                    LEFT JOIN PaymentStatus ps ON p.StatusID = ps.StatusID
                    WHERE p.InvoiceID = i.InvoiceID
                    ORDER BY p.PaymentDate DESC
                    FOR JSON PATH
                ) AS Payments
            FROM Invoice i
            JOIN InvoiceStatus ist ON i.StatusID = ist.StatusID
            JOIN Contract c ON i.ContractID = c.ContractID
            JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            JOIN Resident r ON c.OwnerID = r.ResidentID
            OUTER APPLY (
                SELECT SUM(Amount) AS PaidAmount
                FROM Payment
                WHERE InvoiceID = i.InvoiceID AND StatusID = ${SUCCESS_PAYMENT_STATUS_ID}
            ) pay
            ${where}
            ORDER BY i.InvoiceYear DESC, i.InvoiceMonth DESC, i.InvoiceDate DESC, i.InvoiceID DESC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        `);

        const total = countResult.recordset[0]?.total || 0;
        res.json({
            success: true,
            data: result.recordset.map(normalizeInvoice),
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const pool = await getPool();
        const accessScope = getAccessScope(req, {
            viewAll: 'INVOICE_VIEW_ALL',
            viewOwn: 'INVOICE_VIEW_OWN',
            legacy: ['INVOICE_VIEW']
        });
        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hóa đơn' });
        }

        let residentFilter = '';
        if (accessScope === 'own') {
            const currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            residentFilter = ` AND (c.OwnerID = @CurrentResidentID OR EXISTS (SELECT 1 FROM ContractResident cr WHERE cr.ContractID = c.ContractID AND cr.ResidentID = @CurrentResidentID AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))))`;
        }

        const result = await pool.request()
            .input('InvoiceID', sql.Int, req.params.id)
            .input('CurrentResidentID', sql.Int, accessScope === 'own' ? await getCurrentResidentId(pool, req.userId) : 0)
            .query(`
                SELECT
                    i.*,
                CASE WHEN i.DueDate<CAST(GETDATE() AS date) AND i.StatusID NOT IN (2,4) AND i.WorkflowStatus<>'DRAFT'
                  AND i.TotalAmount>ISNULL((SELECT SUM(Amount) FROM Payment WHERE InvoiceID=i.InvoiceID AND StatusID=2),0) THEN 1 ELSE 0 END IsOverdue,
                (SELECT RequestID FROM InvoiceDueDateExtensionRequest WHERE InvoiceID=i.InvoiceID AND Status='PENDING') PendingExtensionID,
 (SELECT SubmittedAt FROM InvoicePaymentSubmission WHERE InvoiceID=i.InvoiceID AND ConfirmedAt IS NULL) PaymentSubmittedAt,
                    i.WorkflowStatus,
                    ist.StatusName AS InvoiceStatus,
                    c.ContractNumber,
                    c.Rent,
                    a.ApartmentID,
                    a.ApartmentCode,
                    a.Area,
                    r.FullName AS OwnerName,
                    r.Phone AS OwnerPhone,
                    ISNULL(pay.PaidAmount, 0) AS PaidAmount,
                    (
                        SELECT InvoiceDetailID, ChargeType, Description, Quantity, UnitPrice, Amount
                        FROM InvoiceDetail
                        WHERE InvoiceID = i.InvoiceID
                        ORDER BY InvoiceDetailID
                        FOR JSON PATH
                    ) AS Details,
                    (
                        SELECT p.PaymentID, p.PaymentDate, p.Amount, p.TransactionCode,
                               p.StatusID, ps.StatusName AS PaymentStatus, pm.MethodName AS PaymentMethod
                        FROM Payment p
                        LEFT JOIN PaymentMethod pm ON p.MethodID = pm.MethodID
                        LEFT JOIN PaymentStatus ps ON p.StatusID = ps.StatusID
                        WHERE p.InvoiceID = i.InvoiceID
                        ORDER BY p.PaymentDate DESC
                        FOR JSON PATH
                    ) AS Payments
                FROM Invoice i
                JOIN InvoiceStatus ist ON i.StatusID = ist.StatusID
                JOIN Contract c ON i.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                OUTER APPLY (
                    SELECT SUM(Amount) AS PaidAmount
                    FROM Payment
                    WHERE InvoiceID = i.InvoiceID AND StatusID = ${SUCCESS_PAYMENT_STATUS_ID}
                ) pay
                WHERE i.InvoiceID = @InvoiceID
                  ${residentFilter}
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        res.json({ success: true, data: normalizeInvoice(result.recordset[0]) });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice',
            error: error.message
        });
    }
};

exports.getApartmentCurrentInvoice = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
        const year = parseInt(req.query.year, 10) || now.getFullYear();
        const apartmentId = parseInt(req.params.apartmentId, 10);
        const pool = await getPool();
        const scope = await requireApartmentScope(req, pool, apartmentId);
        if (scope.error) return res.status(scope.error.status).json({ success: false, message: scope.error.message });

        if (scope.accessScope === 'all') await ensureDraftInvoiceForApartment(pool, { apartmentId, invoiceMonth: month, invoiceYear: year });

        const invoiceResult = await pool.request()
            .input('CurrentResidentID', sql.Int, scope.residentId || null)
            .input('ApartmentID', sql.Int, apartmentId)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .query(`
                SELECT TOP 1
                    i.InvoiceID,
                    i.ContractID,
                    i.InvoiceMonth,
                    i.InvoiceYear,
                    i.InvoiceDate,
                    i.DueDate,
                    i.TotalAmount,
                    i.StatusID,
                    i.WorkflowStatus,
                    ist.StatusName AS InvoiceStatus,
                    c.ContractNumber,
                    a.ApartmentID,
                    a.ApartmentCode,
                    r.FullName AS OwnerName,
                    ISNULL(pay.PaidAmount, 0) AS PaidAmount,
                    (
                        SELECT InvoiceDetailID, ChargeType, Description, Quantity, UnitPrice, Amount
                        FROM InvoiceDetail
                        WHERE InvoiceID = i.InvoiceID
                        ORDER BY InvoiceDetailID
                        FOR JSON PATH
                    ) AS Details,
                    (
                        SELECT p.PaymentID, p.PaymentDate, p.Amount, p.TransactionCode,
                               p.StatusID, ps.StatusName AS PaymentStatus, pm.MethodName AS PaymentMethod
                        FROM Payment p
                        LEFT JOIN PaymentMethod pm ON p.MethodID = pm.MethodID
                        LEFT JOIN PaymentStatus ps ON p.StatusID = ps.StatusID
                        WHERE p.InvoiceID = i.InvoiceID
                        ORDER BY p.PaymentDate DESC
                        FOR JSON PATH
                    ) AS Payments
                FROM Invoice i
                JOIN InvoiceStatus ist ON i.StatusID = ist.StatusID
                JOIN Contract c ON i.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                OUTER APPLY (
                    SELECT SUM(Amount) AS PaidAmount
                    FROM Payment
                    WHERE InvoiceID = i.InvoiceID AND StatusID = ${SUCCESS_PAYMENT_STATUS_ID}
                ) pay
                WHERE c.ApartmentID = @ApartmentID
                  ${scope.accessScope === 'own' ? `AND ${contractOwnershipSql()}` : ''}
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

        const contractResult = await pool.request()
            .input('CurrentResidentID', sql.Int, scope.residentId || null)
            .input('ApartmentID', sql.Int, apartmentId)
            .query(`
                SELECT TOP 1 c.ContractID, c.ContractNumber, c.Rent, c.StartDate, c.EndDate,
                       r.FullName AS OwnerName
                FROM Contract c
                JOIN Resident r ON r.ResidentID = c.OwnerID
                WHERE c.ApartmentID = @ApartmentID
                  ${scope.accessScope === 'own' ? `AND ${contractOwnershipSql()}` : ''}
                  AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND EXISTS (
                      SELECT 1
                      FROM ContractResident cr
                      WHERE cr.ContractID = c.ContractID
                        AND cr.MoveOutDate IS NULL
                  )
                ORDER BY c.StartDate DESC, c.ContractID DESC
            `);

        const preview = scope.accessScope === 'own' || invoiceResult.recordset[0]
            ? null
            : await getMonthlyInvoicePreview(pool, {
                apartmentId,
                invoiceMonth: month,
                invoiceYear: year
            });
        const meterReadings = await getMeterReadingState(pool, apartmentId, month, year);
        const activeContract = contractResult.recordset[0] || null;
        const invoice = invoiceResult.recordset[0] ? normalizeInvoice(invoiceResult.recordset[0]) : null;
        const showBaselineMeterState = !activeContract || invoice?.WorkflowStatus === WORKFLOW_PAID;
        const displayedMeterReadings = showBaselineMeterState
            ? meterReadings.map((reading) => ({
                ...reading,
                oldIndex: reading.isEntered ? reading.newIndex : reading.oldIndex,
                newIndex: null,
                consumption: 0,
                amount: 0,
                averageUnitPrice: reading.averageUnitPrice,
                isEntered: false
            }))
            : meterReadings;
        let registeredServices = [];
        if (activeContract) {
            const servicesResult = await pool.request()
                .input('ContractID', sql.Int, activeContract.ContractID)
                .query(`
                    SELECT sr.RegistrationID, sr.ContractID, sr.ServiceID, sr.Quantity,
                           sr.RegisterDate, sr.EndDate, sr.Status,
                           s.ServiceName, s.Unit, s.Price
                    FROM ServiceRegistration sr
                    JOIN Service s ON s.ServiceID = sr.ServiceID
                    WHERE sr.ContractID = @ContractID
                      AND sr.Status = 1
                      AND s.Status = 1
                      AND (sr.EndDate IS NULL OR sr.EndDate >= CAST(GETDATE() AS DATE))
                    ORDER BY s.ServiceName
                `);
            registeredServices = servicesResult.recordset || [];
        }

        res.json({
            success: true,
            data: {
                month,
                year,
                invoice,
                preview,
                activeContract,
                registeredServices,
                meterReadings: displayedMeterReadings,
                canGenerate: false
            }
        });
    } catch (error) {
        console.error('Get apartment current invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartment invoice',
            error: error.message
        });
    }
};

exports.payApartmentCurrentInvoice = async (req, res, next) => {
    const now = new Date();
    const month = parseInt(req.body?.invoiceMonth || req.body?.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.body?.invoiceYear || req.body?.year, 10) || now.getFullYear();
    const apartmentId = parseInt(req.params.apartmentId || req.body?.apartmentId, 10);
    const methodId = parseInt(req.body?.methodId, 10);

    if (!apartmentId) {
        return res.status(400).json({ success: false, message: 'Apartment ID is required' });
    }

    try {
        const pool = await getPool();
        const scope = await requireApartmentScope(req, pool, apartmentId);
        if (scope.error) return res.status(scope.error.status).json({ success: false, message: scope.error.message });
        let invoiceId = null;

        const existing = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('InvoiceMonth', sql.Int, month)
            .input('InvoiceYear', sql.Int, year)
            .query(`
                SELECT TOP 1 i.InvoiceID
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

        if (existing.recordset[0]) {
            invoiceId = existing.recordset[0].InvoiceID;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Chưa có hóa đơn cho căn hộ/tháng này'
            });
        }

        req.params.id = invoiceId;
        req.body.methodId = methodId;
        return require('./paymentWorkflowController').confirmPayment(req,res,next);
    } catch (error) {
        console.error('Pay apartment current invoice error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to pay apartment invoice'
        });
    }
};

exports.updateApartmentCurrentMeterReadings = async (req, res) => {
    try {
        const now = new Date();
        const apartmentId = parseInt(req.params.apartmentId, 10);
        const month = parseInt(req.body?.invoiceMonth || req.body?.month, 10) || now.getMonth() + 1;
        const year = parseInt(req.body?.invoiceYear || req.body?.year, 10) || now.getFullYear();
        const pool = await getPool();
        const scope = await requireApartmentScope(req, pool, apartmentId);
        if (scope.error) return res.status(scope.error.status).json({ success: false, message: scope.error.message });

        await ensureDraftInvoiceForApartment(pool, { apartmentId, invoiceMonth: month, invoiceYear: year });
        await updateManualMeterReadings(pool, {
            apartmentId,
            invoiceMonth: month,
            invoiceYear: year,
            electricNewIndex: req.body?.electricNewIndex,
            waterNewIndex: req.body?.waterNewIndex
        });

        res.json({
            success: true,
            message: 'Đã cập nhật chỉ số điện/nước',
            data: {
                meterReadings: await getMeterReadingState(pool, apartmentId, month, year)
            }
        });
    } catch (error) {
        console.error('Update apartment meter readings error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Không thể cập nhật chỉ số điện/nước'
        });
    }
};

exports.finalizeApartmentCurrentInvoice = async (req, res) => {
    try {
        const now = new Date();
        const apartmentId = parseInt(req.params.apartmentId, 10);
        const month = parseInt(req.body?.invoiceMonth || req.body?.month, 10) || now.getMonth() + 1;
        const year = parseInt(req.body?.invoiceYear || req.body?.year, 10) || now.getFullYear();
        const pool = await getPool();
        const scope = await requireApartmentScope(req, pool, apartmentId);
        if (scope.error) return res.status(scope.error.status).json({ success: false, message: scope.error.message });

        const draftId = await ensureDraftInvoiceForApartment(pool, { apartmentId, invoiceMonth: month, invoiceYear: year });
        if (!draftId) {
            return res.status(400).json({ success: false, message: 'Căn hộ chưa có hợp đồng hiệu lực' });
        }

        const result = await finalizeInvoice(pool, draftId);
        res.json({
            success: true,
            message: 'Đã chốt hóa đơn, chuyển sang chờ thanh toán',
            data: result
        });
    } catch (error) {
        console.error('Finalize apartment invoice error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Không thể chốt hóa đơn'
        });
    }
};

exports.previewMonthlyInvoice = async (req, res) => {
    try {
        const contractId = parseInt(req.query.contractId, 10);
        if (!contractId || contractId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Contract ID is required'
            });
        }

        const result = await getMonthlyInvoicePreview(await getPool(), {
            contractId,
            invoiceMonth: req.query.invoiceMonth,
            invoiceYear: req.query.invoiceYear
        });

        if (!result.contract) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hợp đồng hiệu lực cho kỳ hóa đơn này'
            });
        }

        res.json({
            success: true,
            data: {
                contract: result.contract,
                details: result.details,
                totalAmount: result.totalAmount
            }
        });
    } catch (error) {
        console.error('Preview monthly invoice error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Failed to preview monthly invoice'
        });
    }
};

exports.generateInvoice = async (req, res) => {
    try {
        const otherItems = Array.isArray(req.body.items)
            ? req.body.items.filter((item) => (item.chargeType || 'OTHER') === 'OTHER')
            : [];
        const result = await generateMonthlyInvoice(await getPool(), {
            ...req.body,
            otherItems
        });

        res.status(201).json({
            success: true,
            message: 'Monthly invoice generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Generate invoice error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate invoice',
            invoiceId: error.invoiceId || null
        });
    }
};

exports.generateMonthlyInvoice = (req, res) => exports.generateInvoice(req, res);

exports.updateInvoiceStatus = async (req, res, next) => {
    const {fail,positiveId,inTransaction}=require('../utils/workflowUtils');
    try {
        const id=positiveId(req.params.id),status=Number(req.body.statusId);
        if(![1,3,4].includes(status))fail(400,'Use payment confirmation to mark an invoice paid');
        await inTransaction(await getPool(),async tx=>{
            const current=(await tx.request().input('ID',sql.Int,id).query('SELECT StatusID,WorkflowStatus FROM Invoice WITH(UPDLOCK,HOLDLOCK) WHERE InvoiceID=@ID')).recordset[0];
            if(!current)fail(404,'Invoice not found');
            const paid=(await tx.request().input('ID',sql.Int,id).query('SELECT 1 FROM Payment WHERE InvoiceID=@ID AND StatusID=2')).recordset.length;
            if([2,4].includes(current.StatusID)||paid)fail(409,'Cannot change the status of a paid, partially paid or canceled invoice');
            if(status===3&&current.WorkflowStatus==='DRAFT')fail(409,'Draft invoices cannot be overdue');
            await tx.request().input('ID',sql.Int,id).input('Status',sql.Int,status).query('UPDATE Invoice SET StatusID=@Status WHERE InvoiceID=@ID');
        });
        res.json({success:true,message:'Invoice status updated successfully'});
    } catch(error){next(error);}
};

exports.processPayment = async (req, res) => {
    const { invoiceId, methodId, amount, transactionCode } = req.body;
    const amountToPay = toNumber(amount);

    if (!invoiceId || !methodId || amountToPay <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Missing or invalid payment fields'
        });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const invoiceCheck = await transaction.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .query(`
                SELECT TotalAmount, StatusID, WorkflowStatus
                FROM Invoice WITH (UPDLOCK, ROWLOCK)
                WHERE InvoiceID = @InvoiceID
            `);

        const invoice = invoiceCheck.recordset[0];
        if (!invoice) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        if (invoice.StatusID === 4 || invoice.WorkflowStatus === WORKFLOW_DRAFT) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Hóa đơn còn nháp, cần nhập điện/nước và chốt trước khi thanh toán'
            });
        }

        const paidResult = await transaction.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .query(`
                SELECT ISNULL(SUM(Amount), 0) AS TotalPaid
                FROM Payment
                WHERE InvoiceID = @InvoiceID AND StatusID = ${SUCCESS_PAYMENT_STATUS_ID}
            `);

        const totalPaid = toNumber(paidResult.recordset[0]?.TotalPaid);
        const remainingAmount = roundMoney(toNumber(invoice.TotalAmount) - totalPaid);

        if (remainingAmount <= 0) {
            await syncInvoiceStatus(transaction, invoiceId);
            await transaction.commit();
            return res.status(400).json({ success: false, message: 'Invoice already paid' });
        }

        if (amountToPay > remainingAmount) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Amount exceeds remaining balance: ${remainingAmount}`,
                remainingAmount,
                amount: amountToPay
            });
        }

        const inserted = await transaction.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .input('MethodID', sql.Int, methodId)
            .input('Amount', sql.Decimal(18, 2), amountToPay)
            .input('TransactionCode', sql.VarChar(100), transactionCode || null)
            .input('StatusID', sql.Int, SUCCESS_PAYMENT_STATUS_ID)
            .query(`
                INSERT INTO Payment (InvoiceID, MethodID, PaymentDate, Amount, TransactionCode, StatusID)
                OUTPUT INSERTED.PaymentID
                VALUES (@InvoiceID, @MethodID, GETDATE(), @Amount, @TransactionCode, @StatusID)
            `);

        const status = await syncInvoiceStatus(transaction, invoiceId);
        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                paymentId: inserted.recordset[0].PaymentID,
                ...status
            }
        });
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error('Rollback payment error:', rollbackError);
        }

        console.error('Process payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message
        });
    }
};

exports.getInvoiceStatuses = async (req, res) => {
    try {
        const result = await (await getPool()).query(`
            SELECT StatusID, StatusName
            FROM InvoiceStatus
            ORDER BY StatusID
        `);

        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Get invoice statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error.message
        });
    }
};

exports.getPaymentMethods = async (req, res) => {
    try {
        const result = await (await getPool()).query(`
            SELECT MethodID, MethodName
            FROM PaymentMethod
            ORDER BY MethodID
        `);

        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment methods',
            error: error.message
        });
    }
};
