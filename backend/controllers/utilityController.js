// backend/controllers/utilityController.js
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
    let transaction;
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
                message: 'Missing required fields: apartmentId, utilityTypeId, readingMonth, readingYear, newIndex'
            });
        }

        const parsedNew = parseFloat(newIndex);
        const parsedOld = parseFloat(oldIndex) || 0;
        if (parsedNew < parsedOld) {
            return res.status(400).json({
                success: false,
                message: 'New index must be >= old index'
            });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Lấy chỉ số cũ
        let previousReading = parsedOld;
        if (oldIndex === undefined || oldIndex === null) {
            const prevResult = await transaction.request()
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

        // 2. Kiểm tra trùng
        const checkReading = await transaction.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('UtilityTypeID', sql.Int, utilityTypeId)
            .input('ReadingMonth', sql.Int, readingMonth)
            .input('ReadingYear', sql.Int, readingYear)
            .query(`
                SELECT ReadingID FROM MeterReading 
                WHERE ApartmentID = @ApartmentID 
                    AND UtilityTypeID = @UtilityTypeID 
                    AND ReadingMonth = @ReadingMonth 
                    AND ReadingYear = @ReadingYear
            `);

        if (checkReading.recordset[0]) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Meter reading for this period already exists'
            });
        }

        // 3. Lấy EmployeeID
        let employeeId = null;
        if (req.userId) {
            const empResult = await transaction.request()
                .input('UserID', sql.Int, req.userId)
                .query('SELECT EmployeeID FROM Employee WHERE UserID = @UserID');
            if (empResult.recordset[0]) {
                employeeId = empResult.recordset[0].EmployeeID;
            }
        }

        // 4. Insert MeterReading
        const insertReading = await transaction.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('EmployeeID', sql.Int, employeeId)
            .input('UtilityTypeID', sql.Int, utilityTypeId)
            .input('ReadingMonth', sql.Int, readingMonth)
            .input('ReadingYear', sql.Int, readingYear)
            .input('OldIndex', sql.Decimal, previousReading)
            .input('NewIndex', sql.Decimal, parsedNew)
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

        const readingId = insertReading.recordset[0].ReadingID;
        const consumption = parsedNew - previousReading;

        let invoiceId = null;
        let totalAmount = 0;

        // 5. Tạo hóa đơn nếu consumption > 0 và có hợp đồng hiệu lực
        if (consumption > 0) {
            const contractRes = await transaction.request()
                .input('ApartmentID', sql.Int, apartmentId)
                .query(`
                    SELECT TOP 1 ContractID, Rent
                    FROM Contract
                    WHERE ApartmentID = @ApartmentID AND StatusID = 2
                    ORDER BY StartDate DESC
                `);

            const contract = contractRes.recordset[0];
            if (contract) {
                // Kiểm tra hóa đơn đã tồn tại
                const checkInvoice = await transaction.request()
                    .input('ContractID', sql.Int, contract.ContractID)
                    .input('InvoiceMonth', sql.Int, readingMonth)
                    .input('InvoiceYear', sql.Int, readingYear)
                    .query(`
                        SELECT InvoiceID FROM Invoice 
                        WHERE ContractID = @ContractID 
                            AND InvoiceMonth = @InvoiceMonth 
                            AND InvoiceYear = @InvoiceYear
                    `);

                if (!checkInvoice.recordset[0]) {
                    // Lấy bảng giá
                    const priceTiers = await transaction.request()
                        .input('UtilityTypeID', sql.Int, utilityTypeId)
                        .query(`
                            SELECT PriceTierID, FromValue, ToValue, UnitPrice
                            FROM UtilityPriceTier
                            WHERE UtilityTypeID = @UtilityTypeID
                                AND EffectiveDate = (
                                    SELECT MAX(EffectiveDate) 
                                    FROM UtilityPriceTier 
                                    WHERE UtilityTypeID = @UtilityTypeID
                                )
                            ORDER BY FromValue
                        `);

                    const details = [];
                    let remaining = consumption;

                    if (priceTiers.recordset.length === 0) {
                        // Fallback: giá mặc định
                        details.push({
                            chargeType: utilityTypeId === 1 ? 'ELECTRIC' : 'WATER',
                            description: utilityTypeId === 1 ? 'Tiền điện' : 'Tiền nước',
                            quantity: remaining,
                            unitPrice: 0.5,
                            amount: remaining * 0.5
                        });
                    } else {
                        for (const tier of priceTiers.recordset) {
                            if (remaining <= 0) break;
                            const from = parseFloat(tier.FromValue);
                            const to = tier.ToValue !== null ? parseFloat(tier.ToValue) : Infinity;
                            const unitPrice = parseFloat(tier.UnitPrice);
                            let qty = 0;
                            if (to === Infinity) {
                                qty = remaining;
                            } else {
                                const limit = to - from;
                                if (remaining > limit) {
                                    qty = limit;
                                } else {
                                    qty = remaining;
                                }
                            }
                            if (qty > 0) {
                                details.push({
                                    chargeType: utilityTypeId === 1 ? 'ELECTRIC' : 'WATER',
                                    description: utilityTypeId === 1 
                                        ? `Tiền điện bậc ${tier.PriceTierID}` 
                                        : `Tiền nước bậc ${tier.PriceTierID}`,
                                    quantity: qty,
                                    unitPrice: unitPrice,
                                    amount: qty * unitPrice
                                });
                                remaining -= qty;
                            }
                        }
                    }

                    if (details.length > 0) {
                        totalAmount = details.reduce((sum, d) => sum + d.amount, 0);

                        const invoiceDate = new Date();
                        const dueDate = new Date(invoiceDate);
                        dueDate.setDate(dueDate.getDate() + 30);

                        const invoiceType = utilityTypeId === 1 ? 'ELECTRIC' : 'WATER';

                        const insertInvoice = await transaction.request()
                            .input('ContractID', sql.Int, contract.ContractID)
                            .input('InvoiceMonth', sql.Int, readingMonth)
                            .input('InvoiceYear', sql.Int, readingYear)
                            .input('InvoiceDate', sql.Date, invoiceDate)
                            .input('DueDate', sql.Date, dueDate)
                            .input('TotalAmount', sql.Decimal, totalAmount)
                            .input('StatusID', sql.Int, 1)
                            .input('InvoiceType', sql.VarChar, invoiceType)
                            .query(`
                                INSERT INTO Invoice (
                                    ContractID, InvoiceMonth, InvoiceYear, 
                                    InvoiceDate, DueDate, TotalAmount, StatusID, InvoiceType
                                )
                                OUTPUT INSERTED.InvoiceID
                                VALUES (
                                    @ContractID, @InvoiceMonth, @InvoiceYear,
                                    @InvoiceDate, @DueDate, @TotalAmount, @StatusID, @InvoiceType
                                )
                            `);

                        invoiceId = insertInvoice.recordset[0].InvoiceID;

                        for (const detail of details) {
                            await transaction.request()
                                .input('InvoiceID', sql.Int, invoiceId)
                                .input('ChargeType', sql.VarChar, detail.chargeType)
                                .input('Description', sql.NVarChar, detail.description)
                                .input('Quantity', sql.Decimal, detail.quantity)
                                .input('UnitPrice', sql.Decimal, detail.unitPrice)
                                .input('Amount', sql.Decimal, detail.amount)
                                .query(`
                                    INSERT INTO InvoiceDetail (
                                        InvoiceID, ChargeType, Description, Quantity, UnitPrice, Amount
                                    )
                                    VALUES (
                                        @InvoiceID, @ChargeType, @Description, @Quantity, @UnitPrice, @Amount
                                    )
                                `);
                        }
                    }
                }
            }
        }

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: invoiceId ? 'Meter reading created and invoice generated' : 'Meter reading created successfully',
            data: {
                readingId,
                consumption,
                invoiceId,
                totalAmount
            }
        });

    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }
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