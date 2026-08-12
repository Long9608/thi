const { getPool, sql } = require('../config/db');

// backend/controllers/invoiceController.js
exports.getAllInvoices = async (req, res) => {
    try {
        const { 
            statusId,
            contractId,
            month,
            year,
            fromDate,
            toDate,
            page = 1,
            limit = 20 
        } = req.query;

        console.log('📊 Fetching invoices with filters:', { statusId, month, year, page, limit });

        const pool = await getPool();
        const offset = (page - 1) * limit;
        const safeLimit = parseInt(limit) || 20;

        let query = `
            SELECT 
                i.InvoiceID,
                i.InvoiceMonth,
                i.InvoiceYear,
                i.InvoiceDate,
                i.DueDate,
                i.TotalAmount,
                i.StatusID,
                ist.StatusName AS InvoiceStatus,
                c.ContractNumber,
                a.ApartmentCode,
                r.FullName AS OwnerName,
                ISNULL((
                    SELECT SUM(Amount) 
                    FROM Payment 
                    WHERE InvoiceID = i.InvoiceID 
                        AND StatusID = 2
                ), 0) AS PaidAmount,
                (
                    SELECT 
                        InvoiceDetailID,
                        ChargeType,
                        Description,
                        Quantity,
                        UnitPrice,
                        Amount
                    FROM InvoiceDetail 
                    WHERE InvoiceID = i.InvoiceID
                    FOR JSON PATH
                ) AS Details,
                (
                    SELECT 
                        PaymentID,
                        Amount,
                        PaymentDate,
                        StatusID,
                        TransactionCode
                    FROM Payment 
                    WHERE InvoiceID = i.InvoiceID
                    FOR JSON PATH
                ) AS Payments
            FROM Invoice i
            INNER JOIN InvoiceStatus ist ON i.StatusID = ist.StatusID
            INNER JOIN Contract c ON i.ContractID = c.ContractID
            INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            INNER JOIN Resident r ON c.OwnerID = r.ResidentID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Invoice i
            WHERE 1=1
        `;

        if (statusId) {
            query += ` AND i.StatusID = @StatusID`;
            countQuery += ` AND i.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        if (month) {
            query += ` AND i.InvoiceMonth = @Month`;
            countQuery += ` AND i.InvoiceMonth = @Month`;
            request.input('Month', sql.Int, parseInt(month));
        }

        if (year) {
            query += ` AND i.InvoiceYear = @Year`;
            countQuery += ` AND i.InvoiceYear = @Year`;
            request.input('Year', sql.Int, parseInt(year));
        }

        // 🔥 THÊM LOG ĐỂ DEBUG
        console.log('📊 Query params:', { statusId, month, year });

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;
        console.log('📊 Total invoices:', total);

        query += `
            ORDER BY i.InvoiceDate DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, parseInt(offset));
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);
        console.log('📊 Query result rows:', result.recordset.length);

        // Parse JSON fields
        const invoices = result.recordset.map(inv => {
            if (inv.Details) {
                try {
                    inv.Details = JSON.parse(inv.Details);
                } catch (e) {
                    inv.Details = [];
                }
            }
            if (inv.Payments) {
                try {
                    inv.Payments = JSON.parse(inv.Payments);
                } catch (e) {
                    inv.Payments = [];
                }
            }
            return inv;
        });

        res.json({
            success: true,
            data: invoices,
            pagination: {
                total,
                page: parseInt(page),
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });

    } catch (error) {
        console.error('❌ Get invoices error:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('InvoiceID', sql.Int, id)
            .query(`
                SELECT 
                    i.*,
                    ist.StatusName AS InvoiceStatus,
                    c.ContractNumber,
                    c.Rent,
                    a.ApartmentCode,
                    a.Area,
                    r.FullName AS OwnerName,
                    r.Phone AS OwnerPhone,
                    (
                        SELECT 
                            InvoiceDetailID,
                            ChargeType,
                            Description,
                            Quantity,
                            UnitPrice,
                            Amount
                        FROM InvoiceDetail
                        WHERE InvoiceID = i.InvoiceID
                        FOR JSON PATH
                    ) AS Details,
                    (
                        SELECT 
                            p.PaymentID,
                            p.PaymentDate,
                            p.Amount,
                            p.TransactionCode,
                            p.StatusID,
                            ps.StatusName AS PaymentStatus,
                            pm.MethodName AS PaymentMethod
                        FROM Payment p
                        LEFT JOIN PaymentMethod pm ON p.MethodID = pm.MethodID
                        LEFT JOIN PaymentStatus ps ON p.StatusID = ps.StatusID
                        WHERE p.InvoiceID = i.InvoiceID
                        FOR JSON PATH
                    ) AS Payments
                FROM Invoice i
                INNER JOIN InvoiceStatus ist ON i.StatusID = ist.StatusID
                INNER JOIN Contract c ON i.ContractID = c.ContractID
                INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                INNER JOIN Resident r ON c.OwnerID = r.ResidentID
                WHERE i.InvoiceID = @InvoiceID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const invoice = result.recordset[0];
        
        // Parse JSON fields
        if (invoice.Details) {
            invoice.Details = JSON.parse(invoice.Details);
        }
        if (invoice.Payments) {
            invoice.Payments = JSON.parse(invoice.Payments);
        }

        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice',
            error: error.message
        });
    }
};

exports.generateInvoice = async (req, res) => {
    try {
        const { 
            contractId,
            invoiceMonth,
            invoiceYear,
            dueDate,
            items
        } = req.body;

        if (!contractId || !invoiceMonth || !invoiceYear || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const pool = await getPool();

        // Check if invoice already exists for this period
        const checkInvoice = await pool.request()
            .input('ContractID', sql.Int, contractId)
            .input('InvoiceMonth', sql.Int, invoiceMonth)
            .input('InvoiceYear', sql.Int, invoiceYear)
            .query(`
                SELECT InvoiceID 
                FROM Invoice 
                WHERE ContractID = @ContractID 
                    AND InvoiceMonth = @InvoiceMonth 
                    AND InvoiceYear = @InvoiceYear
            `);

        if (checkInvoice.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Invoice already exists for this period'
            });
        }

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            totalAmount += item.amount || (item.quantity * item.unitPrice);
        }

        // Create invoice
        const result = await pool.request()
            .input('ContractID', sql.Int, contractId)
            .input('InvoiceMonth', sql.Int, invoiceMonth)
            .input('InvoiceYear', sql.Int, invoiceYear)
            .input('InvoiceDate', sql.Date, new Date())
            .input('DueDate', sql.Date, dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
            .input('TotalAmount', sql.Decimal, totalAmount)
            .input('StatusID', sql.Int, 1) // Chưa thanh toán
            .query(`
                INSERT INTO Invoice (
                    ContractID, InvoiceMonth, InvoiceYear, InvoiceDate, DueDate, TotalAmount, StatusID
                )
                OUTPUT INSERTED.InvoiceID
                VALUES (
                    @ContractID, @InvoiceMonth, @InvoiceYear, @InvoiceDate, @DueDate, @TotalAmount, @StatusID
                )
            `);

        const invoiceId = result.recordset[0].InvoiceID;

        // Create invoice details
        for (const item of items) {
            const amount = item.amount || (item.quantity * item.unitPrice);
            await pool.request()
                .input('InvoiceID', sql.Int, invoiceId)
                .input('ChargeType', sql.VarChar, item.chargeType || 'OTHER')
                .input('Description', sql.NVarChar, item.description)
                .input('Quantity', sql.Decimal, item.quantity || 1)
                .input('UnitPrice', sql.Decimal, item.unitPrice)
                .input('Amount', sql.Decimal, amount)
                .query(`
                    INSERT INTO InvoiceDetail (
                        InvoiceID, ChargeType, Description, Quantity, UnitPrice, Amount
                    )
                    VALUES (
                        @InvoiceID, @ChargeType, @Description, @Quantity, @UnitPrice, @Amount
                    )
                `);
        }

        res.status(201).json({
            success: true,
            message: 'Invoice generated successfully',
            data: { invoiceId }
        });

    } catch (error) {
        console.error('Generate invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice',
            error: error.message
        });
    }
};

exports.updateInvoiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { statusId } = req.body;

        if (!statusId) {
            return res.status(400).json({
                success: false,
                message: 'Status ID is required'
            });
        }

        const pool = await getPool();

        const result = await pool.request()
            .input('InvoiceID', sql.Int, id)
            .input('StatusID', sql.Int, statusId)
            .query(`
                UPDATE Invoice 
                SET StatusID = @StatusID
                WHERE InvoiceID = @InvoiceID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            message: 'Invoice status updated successfully'
        });

    } catch (error) {
        console.error('Update invoice status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice status',
            error: error.message
        });
    }
};

exports.processPayment = async (req, res) => {
    try {
        const { 
            invoiceId,
            methodId,
            amount,
            transactionCode
        } = req.body;

        console.log('💰 Processing payment:', { invoiceId, methodId, amount, transactionCode });

        if (!invoiceId || !methodId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const pool = await getPool();

        // Check if invoice exists
        const invoiceCheck = await pool.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .query('SELECT TotalAmount, StatusID FROM Invoice WHERE InvoiceID = @InvoiceID');

        if (!invoiceCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const invoice = invoiceCheck.recordset[0];

        if (invoice.StatusID === 2) {
            return res.status(400).json({
                success: false,
                message: 'Invoice already paid'
            });
        }

        // Check total paid amount
        const paidResult = await pool.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .query(`
                SELECT ISNULL(SUM(Amount), 0) as TotalPaid
                FROM Payment
                WHERE InvoiceID = @InvoiceID AND StatusID = 2
            `);

        const totalPaid = paidResult.recordset[0].TotalPaid;
        const remainingAmount = invoice.TotalAmount - totalPaid;

        console.log('💰 Payment calculation:', {
            totalAmount: invoice.TotalAmount,
            totalPaid: totalPaid,
            remainingAmount: remainingAmount,
            amountToPay: amount
        });

        // 🔥 SỬA: Kiểm tra chính xác
        if (amount > remainingAmount) {
            return res.status(400).json({
                success: false,
                message: `Amount exceeds remaining balance: ${remainingAmount}`,
                remainingAmount: remainingAmount,
                amount: amount
            });
        }

        // Create payment
        const result = await pool.request()
            .input('InvoiceID', sql.Int, invoiceId)
            .input('MethodID', sql.Int, methodId)
            .input('Amount', sql.Decimal, amount)
            .input('TransactionCode', sql.VarChar, transactionCode || null)
            .input('StatusID', sql.Int, 2) // Thành công
            .query(`
                INSERT INTO Payment (
                    InvoiceID, MethodID, PaymentDate, Amount, TransactionCode, StatusID
                )
                OUTPUT INSERTED.PaymentID
                VALUES (
                    @InvoiceID, @MethodID, GETDATE(), @Amount, @TransactionCode, @StatusID
                )
            `);

        const paymentId = result.recordset[0].PaymentID;

        // Update invoice status if fully paid
        const newTotalPaid = totalPaid + amount;
        if (newTotalPaid >= invoice.TotalAmount) {
            await pool.request()
                .input('InvoiceID', sql.Int, invoiceId)
                .input('StatusID', sql.Int, 2) // Đã thanh toán
                .query('UPDATE Invoice SET StatusID = @StatusID WHERE InvoiceID = @InvoiceID');
        }

        console.log('✅ Payment successful:', { paymentId, newTotalPaid });

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            data: { 
                paymentId,
                remainingAfterPayment: invoice.TotalAmount - newTotalPaid
            }
        });

    } catch (error) {
        console.error('❌ Process payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message
        });
    }
};

exports.getInvoiceStatuses = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT StatusID, StatusName 
            FROM InvoiceStatus 
            ORDER BY StatusID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

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
        const pool = await getPool();
        const result = await pool.query(`
            SELECT MethodID, MethodName 
            FROM PaymentMethod 
            ORDER BY MethodID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment methods',
            error: error.message
        });
    }
};