const { getPool, sql } = require('../config/db');
const { getAccessScope, getCurrentResidentId, contractOwnershipSql, apartmentOwnershipSql } = require('../utils/accessScope');

const DEFAULT_CONTRACT_EQUIPMENT = [
    { name: 'Smart Tivi 4K Samsung Crystal UHD 55 inch', category: 'TIVI', brand: 'Samsung', model: 'UA55AU7002KXXV', location: 'Phòng khách', specs: '55 inch - 4K UHD - Wi-Fi 5G & Bluetooth', condition: 'Hoạt động tốt (98%)' },
    { name: 'Tủ lạnh Inverter Panasonic 322 Lít 2 cánh', category: 'TỦ LẠNH', brand: 'Panasonic', model: 'NR-BV360QSVN', location: 'Khu vực bếp', specs: '322 Lít - Ngăn đông mềm - Inverter Econavi', condition: 'Mới 98%, làm lạnh êm' },
    { name: 'Máy lạnh Daikin Inverter 1.5 HP (Phòng khách)', category: 'MÁY LẠNH', brand: 'Daikin', model: 'FTKB35XVMV', location: 'Phòng khách', specs: '1.5 HP - 12.000 BTU - Inverter', condition: 'Làm lạnh nhanh, đã vệ sinh bảo dưỡng định kỳ' },
    { name: 'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ Master)', category: 'MÁY LẠNH', brand: 'Daikin', model: 'FTKB25XVMV', location: 'Phòng ngủ Master', specs: '1.0 HP - 9.000 BTU - Inverter', condition: 'Hoạt động rất êm' },
    { name: 'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ nhỏ)', category: 'MÁY LẠNH', brand: 'Daikin', model: 'FTKB25XVMV', location: 'Phòng ngủ 2', specs: '1.0 HP - 9.000 BTU - Inverter', condition: 'Hoạt động ổn định' },
    { name: 'Máy giặt cửa ngang Electrolux UltimateCare 9.0 Kg', category: 'MÁY GIẶT', brand: 'Electrolux', model: 'EWF9024P5WB', location: 'Logia giặt phơi', specs: '9.0 Kg - EcoInverter - Giặt hơi nước', condition: 'Hoạt động tốt, vắt êm' }
];

exports.getAllContracts = async (req, res) => {
    try {
        const { 
            statusId, 
            apartmentId, 
            ownerId,
            fromDate,
            toDate,
            page = 1,
            limit = 20
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;
        const accessScope = getAccessScope(req, {
            viewAll: 'CONTRACT_VIEW_ALL',
            viewOwn: 'CONTRACT_VIEW_OWN',
            legacy: ['CONTRACT_VIEW']
        });

        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hợp đồng' });
        }

        let query = `
            SELECT 
                c.ContractID,
                c.ContractNumber,
                c.SignDate,
                c.StartDate,
                c.EndDate,
                c.Deposit,
                c.Rent,
                c.ContractTermMonths,
                c.DepositMonths,
                c.PaymentCycleMonths,
                c.MonthlyBillingDay,
                c.SignedContractImage,
                c.CreatedDate,
                a.ApartmentCode,
                a.Area,
                b.BuildingName,
                r.FullName AS OwnerName,
                ${accessScope === 'own' ? 'NULL' : 'r.Phone'} AS OwnerPhone,
                cs.StatusName AS ContractStatus,
                c.StatusID,
                DATEDIFF(DAY, GETDATE(), c.EndDate) AS DaysRemaining
            FROM Contract c
            INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            INNER JOIN Floor f ON a.FloorID = f.FloorID
            INNER JOIN Building b ON f.BuildingID = b.BuildingID
            INNER JOIN Resident r ON c.OwnerID = r.ResidentID
            INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Contract c
            WHERE 1=1
        `;

        if (accessScope === 'own') {
            const currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            const residentCondition = `(
                c.OwnerID = @CurrentResidentID OR EXISTS (
                    SELECT 1 FROM ContractResident cr
                    WHERE cr.ContractID = c.ContractID
                      AND cr.ResidentID = @CurrentResidentID
                      AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))
                )
            )`;
            query += ` AND ${residentCondition}`;
            countQuery += ` AND ${residentCondition}`;
            request.input('CurrentResidentID', sql.Int, currentResidentId);
        }

        if (statusId) {
            query += ` AND c.StatusID = @StatusID`;
            countQuery += ` AND c.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        if (apartmentId) {
            query += ` AND c.ApartmentID = @ApartmentID`;
            countQuery += ` AND c.ApartmentID = @ApartmentID`;
            request.input('ApartmentID', sql.Int, parseInt(apartmentId));
        }

        if (ownerId) {
            query += ` AND c.OwnerID = @OwnerID`;
            countQuery += ` AND c.OwnerID = @OwnerID`;
            request.input('OwnerID', sql.Int, parseInt(ownerId));
        }

        if (fromDate) {
            query += ` AND c.StartDate >= @FromDate`;
            countQuery += ` AND c.StartDate >= @FromDate`;
            request.input('FromDate', sql.Date, fromDate);
        }

        if (toDate) {
            query += ` AND c.StartDate <= @ToDate`;
            countQuery += ` AND c.StartDate <= @ToDate`;
            request.input('ToDate', sql.Date, toDate);
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY c.CreatedDate DESC
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
        console.error('Get contracts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contracts',
            error: error.message
        });
    }
};

exports.getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const accessScope = getAccessScope(req, {
            viewAll: 'CONTRACT_VIEW_ALL',
            viewOwn: 'CONTRACT_VIEW_OWN',
            legacy: ['CONTRACT_VIEW']
        });

        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hợp đồng' });
        }

        let residentFilter = '';
        if (accessScope === 'own') {
            const currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            residentFilter = `
                AND (
                    c.OwnerID = @CurrentResidentID OR EXISTS (
                        SELECT 1 FROM ContractResident cr
                        WHERE cr.ContractID = c.ContractID
                          AND cr.ResidentID = @CurrentResidentID
                          AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))
                    )
                )`;
        }

        const result = await pool.request()
            .input('ContractID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, accessScope === 'own' ? (await getCurrentResidentId(pool, req.userId)) : null)
            .query(`
                SELECT 
                    c.*,
                    a.ApartmentCode,
                    a.Area,
                    f.FloorNumber,
                    b.BuildingName,
                    b.BuildingID,
                    ar.AreaName,
                    r.FullName AS OwnerName,
                    ${accessScope === 'own' ? 'NULL' : 'r.Phone'} AS OwnerPhone,
                    ${accessScope === 'own' ? 'NULL' : 'r.Email'} AS OwnerEmail,
                    ${accessScope === 'own' ? 'NULL' : 'r.Address'} AS OwnerAddress,
                    cs.StatusName AS ContractStatus,
                    (
                        SELECT 
                            cr.ResidentID,
                            res.FullName,
                            res.Phone,
                            res.Email,
                            cr.Relationship,
                            cr.MoveInDate,
                            cr.MoveOutDate
                        FROM ContractResident cr
                        INNER JOIN Resident res ON cr.ResidentID = res.ResidentID
                        WHERE cr.ContractID = c.ContractID
                        ${accessScope === 'own' ? 'AND cr.ResidentID = @CurrentResidentID' : ''}
                        FOR JSON PATH
                    ) AS Residents,
                    (
                        SELECT 
                            sr.RegistrationID,
                            sr.ServiceID,
                            s.ServiceName,
                            s.Unit,
                            s.Price,
                            sr.Quantity,
                            sr.RegisterDate,
                            sr.EndDate,
                            sr.Status
                        FROM ServiceRegistration sr
                        INNER JOIN Service s ON sr.ServiceID = s.ServiceID
                        WHERE sr.ContractID = c.ContractID
                        FOR JSON PATH
                    ) AS Services,
                    (
                        SELECT
                            ce.ContractEquipmentID AS EquipmentID,
                            ce.EquipmentName AS Name,
                            ce.Category,
                            ce.Brand,
                            ce.Model,
                            ce.Quantity,
                            ce.Location,
                            ce.Specifications AS Specs,
                            ce.ConditionDescription AS Condition,
                            ce.EquipmentStatus AS Status
                        FROM ContractEquipment ce
                        WHERE ce.ContractID = c.ContractID
                        FOR JSON PATH
                    ) AS Equipment
                FROM Contract c
                INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                INNER JOIN Floor f ON a.FloorID = f.FloorID
                INNER JOIN Building b ON f.BuildingID = b.BuildingID
                INNER JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
                INNER JOIN Resident r ON c.OwnerID = r.ResidentID
                INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                WHERE c.ContractID = @ContractID
                  ${residentFilter}
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }

        const contract = result.recordset[0];
        
        // Parse JSON fields
        if (contract.Residents) {
            contract.Residents = JSON.parse(contract.Residents);
        }
        if (contract.Services) {
            contract.Services = JSON.parse(contract.Services);
        }
        if (contract.Equipment) {
            contract.Equipment = JSON.parse(contract.Equipment);
        }

        res.json({
            success: true,
            data: contract
        });

    } catch (error) {
        console.error('Get contract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contract',
            error: error.message
        });
    }
};

exports.createContract = async (req, res) => {
    let transaction;
    try {
        const { 
            apartmentId,
            ownerId,
            contractNumber,
            signDate,
            startDate,
            endDate,
            deposit,
            rent,
            contractTermMonths,
            depositMonths,
            paymentCycleMonths,
            monthlyBillingDay,
            statusId,
            residents,
            services,
            equipment
        } = req.body;

        const fixedRent = Number(rent) > 0 ? Number(rent) : 7500000;
        const safeDepositMonths = [1, 2].includes(Number(depositMonths)) ? Number(depositMonths) : null;
        const safeDeposit = safeDepositMonths ? fixedRent * safeDepositMonths : Number(deposit || 0);
        const safePaymentCycleMonths = [1, 3].includes(Number(paymentCycleMonths)) ? Number(paymentCycleMonths) : 1;
        const safeMonthlyBillingDay = 10;

        // Validation
        if (!apartmentId || !ownerId || !contractNumber || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const pool = await getPool();

        // Check if contract number already exists
        const checkResult = await pool.request()
            .input('ContractNumber', sql.VarChar, contractNumber)
            .query('SELECT ContractID FROM Contract WHERE ContractNumber = @ContractNumber');

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Contract number already exists'
            });
        }

        // Check if apartment is available
        const apartmentCheck = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .query(`
                SELECT StatusID 
                FROM Apartment 
                WHERE ApartmentID = @ApartmentID
            `);

        if (!apartmentCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        // Chỉ căn hộ Còn trống (RoomStatus = 1) mới được lập hợp đồng.
        if (Number(apartmentCheck.recordset[0].StatusID) !== 1) {
            return res.status(409).json({
                success: false,
                message: 'Only vacant apartments can have a new contract'
            });
        }

        // Check for overlapping contracts
        const overlapCheck = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('StartDate', sql.Date, startDate)
            .input('EndDate', sql.Date, endDate)
            .query(`
                SELECT COUNT(*) as count 
                FROM Contract 
                WHERE ApartmentID = @ApartmentID 
                    AND StatusID IN (1, 2)
                    AND (@StartDate BETWEEN StartDate AND EndDate
                        OR @EndDate BETWEEN StartDate AND EndDate
                        OR StartDate BETWEEN @StartDate AND @EndDate)
            `);

        if (overlapCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Apartment has overlapping contract'
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Create contract and all handover records atomically.
        const result = await transaction.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('OwnerID', sql.Int, ownerId)
            .input('ContractNumber', sql.VarChar, contractNumber)
            .input('SignDate', sql.Date, signDate || new Date())
            .input('StartDate', sql.Date, startDate)
            .input('EndDate', sql.Date, endDate)
            .input('Deposit', sql.Decimal, safeDeposit)
            .input('Rent', sql.Decimal, fixedRent)
            .input('ContractTermMonths', sql.Int, contractTermMonths || null)
            .input('DepositMonths', sql.Int, safeDepositMonths)
            .input('PaymentCycleMonths', sql.Int, safePaymentCycleMonths)
            .input('MonthlyBillingDay', sql.Int, safeMonthlyBillingDay)
            .input('StatusID', sql.Int, statusId || 2)
            .query(`
                INSERT INTO Contract (
                    ApartmentID, OwnerID, ContractNumber, SignDate, 
                    StartDate, EndDate, Deposit, Rent,
                    ContractTermMonths, DepositMonths, PaymentCycleMonths, MonthlyBillingDay,
                    StatusID, CreatedDate
                )
                OUTPUT INSERTED.ContractID
                VALUES (
                    @ApartmentID, @OwnerID, @ContractNumber, @SignDate,
                    @StartDate, @EndDate, @Deposit, @Rent,
                    @ContractTermMonths, @DepositMonths, @PaymentCycleMonths, @MonthlyBillingDay,
                    @StatusID, GETDATE()
                )
            `);

        const contractId = result.recordset[0].ContractID;

        // Add residents to contract
        if (residents && residents.length > 0) {
            for (const resident of residents) {
                await transaction.request()
                    .input('ContractID', sql.Int, contractId)
                    .input('ResidentID', sql.Int, resident.residentId)
                    .input('Relationship', sql.NVarChar, resident.relationship || null)
                    .input('MoveInDate', sql.Date, resident.moveInDate || startDate)
                    .query(`
                        INSERT INTO ContractResident (
                            ContractID, ResidentID, Relationship, MoveInDate
                        )
                        VALUES (
                            @ContractID, @ResidentID, @Relationship, @MoveInDate
                        )
                    `);
            }
        }

        // Add services to contract
        if (services && services.length > 0) {
            for (const service of services) {
                await transaction.request()
                    .input('ContractID', sql.Int, contractId)
                    .input('ServiceID', sql.Int, service.serviceId)
                    .input('RegisterDate', sql.Date, service.registerDate || new Date())
                    .input('EndDate', sql.Date, service.endDate || null)
                    .input('Quantity', sql.Int, service.quantity || 1)
                    .query(`
                        INSERT INTO ServiceRegistration (
                            ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status
                        )
                        VALUES (
                            @ContractID, @ServiceID, @RegisterDate, @EndDate, @Quantity, 1
                        )
                    `);
            }
        }

        // Lưu danh mục thiết bị bàn giao theo hợp đồng.
        const equipmentToSave = Array.isArray(equipment) && equipment.length > 0
            ? equipment
            : DEFAULT_CONTRACT_EQUIPMENT;
        for (const item of equipmentToSave) {
            await transaction.request()
                    .input('ContractID', sql.Int, contractId)
                    .input('EquipmentName', sql.NVarChar, item.name || 'Thiết bị')
                    .input('Category', sql.NVarChar, item.category || null)
                    .input('Brand', sql.NVarChar, item.brand || null)
                    .input('Model', sql.NVarChar, item.model || null)
                    .input('Quantity', sql.Int, Number(item.quantity) > 0 ? Number(item.quantity) : 1)
                    .input('Location', sql.NVarChar, item.location || null)
                    .input('Specifications', sql.NVarChar, item.specs || null)
                    .input('ConditionDescription', sql.NVarChar, item.condition || null)
                    .input('EquipmentStatus', sql.NVarChar, item.status || 'operational')
                    .query(`
                        INSERT INTO ContractEquipment (
                            ContractID, EquipmentName, Category, Brand, Model, Quantity,
                            Location, Specifications, ConditionDescription, EquipmentStatus
                        ) VALUES (
                            @ContractID, @EquipmentName, @Category, @Brand, @Model, @Quantity,
                            @Location, @Specifications, @ConditionDescription, @EquipmentStatus
                        )
                    `);
        }

        // Update apartment status to occupied
        await transaction.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('StatusID', sql.Int, 2) // Đang ở
            .query('UPDATE Apartment SET StatusID = @StatusID WHERE ApartmentID = @ApartmentID');

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Contract created successfully',
            data: { contractId }
        });

    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback create contract error:', rollbackError);
            }
        }
        console.error('Create contract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create contract',
            error: error.message
        });
    }
};

exports.updateContract = async (req, res) => {
    const { id } = req.params;
    const {
        endDate,
        deposit,
        rent,
        contractTermMonths,
        depositMonths,
        paymentCycleMonths,
        monthlyBillingDay,
        statusId
    } = req.body;

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const updates = [];
        const request = transaction.request();
        request.input('ContractID', sql.Int, id);

        if (typeof endDate !== 'undefined' && endDate !== null && endDate !== '') {
            updates.push('EndDate = @EndDate');
            request.input('EndDate', sql.Date, endDate);
        }

        if (typeof deposit !== 'undefined' && deposit !== null) {
            updates.push('Deposit = @Deposit');
            request.input('Deposit', sql.Decimal, deposit);
        }

        if (typeof rent !== 'undefined' && rent !== null) {
            updates.push('Rent = @Rent');
            request.input('Rent', sql.Decimal, Number(rent));
        }

        if (typeof contractTermMonths !== 'undefined') {
            updates.push('ContractTermMonths = @ContractTermMonths');
            request.input('ContractTermMonths', sql.Int, contractTermMonths || null);
        }

        if (typeof depositMonths !== 'undefined') {
            const safeDepositMonths = [1, 2].includes(Number(depositMonths)) ? Number(depositMonths) : null;
            updates.push('DepositMonths = @DepositMonths');
            updates.push('Deposit = @DepositByMonths');
            request.input('DepositMonths', sql.Int, safeDepositMonths);
            request.input('DepositByMonths', sql.Decimal, safeDepositMonths ? 7500000 * safeDepositMonths : 0);
        }

        if (typeof paymentCycleMonths !== 'undefined') {
            const safePaymentCycleMonths = [1, 3].includes(Number(paymentCycleMonths)) ? Number(paymentCycleMonths) : 1;
            updates.push('PaymentCycleMonths = @PaymentCycleMonths');
            request.input('PaymentCycleMonths', sql.Int, safePaymentCycleMonths);
        }

        if (typeof monthlyBillingDay !== 'undefined') {
            updates.push('MonthlyBillingDay = @MonthlyBillingDay');
            request.input('MonthlyBillingDay', sql.Int, 10);
        }

        const willUpdateStatus = (typeof statusId !== 'undefined' && statusId !== null);
        if (willUpdateStatus) {
            updates.push('StatusID = @StatusID');
            request.input('StatusID', sql.Int, statusId);
        }

        if (updates.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const contractInfo = await transaction.request()
            .input('ContractID', sql.Int, id)
            .query('SELECT ApartmentID FROM Contract WHERE ContractID = @ContractID');
        const apartmentId = contractInfo.recordset[0]?.ApartmentID;

        const result = await request.query(`
            UPDATE Contract
            SET ${updates.join(', ')}
            WHERE ContractID = @ContractID
        `);

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }

        if (willUpdateStatus && apartmentId) {
            if (Number(statusId) === 4) {
                const invoiceIds = await transaction.request()
                    .input('ContractID', sql.Int, id)
                    .query('SELECT InvoiceID FROM Invoice WHERE ContractID = @ContractID');

                await transaction.request()
                    .input('ContractID', sql.Int, id)
                    .query(`
                        DELETE p
                        FROM Payment p
                        JOIN Invoice i ON i.InvoiceID = p.InvoiceID
                        WHERE i.ContractID = @ContractID;

                        DELETE idt
                        FROM InvoiceDetail idt
                        JOIN Invoice i ON i.InvoiceID = idt.InvoiceID
                        WHERE i.ContractID = @ContractID;

                        DELETE FROM Invoice
                        WHERE ContractID = @ContractID;

                        UPDATE ServiceRegistration
                        SET Status = 0, EndDate = CAST(GETDATE() AS DATE)
                        WHERE ContractID = @ContractID AND Status = 1;

                        UPDATE ContractResident
                        SET MoveOutDate = CAST(GETDATE() AS DATE)
                        WHERE ContractID = @ContractID AND MoveOutDate IS NULL;
                    `);

                await transaction.request()
                    .input('ApartmentID', sql.Int, apartmentId)
                    .query(`
                        IF OBJECT_ID('dbo.SmartMeter', 'U') IS NOT NULL
                        BEGIN
                            UPDATE sm
                            SET sm.CurrentIndex = mr.NewIndex,
                                sm.LastTickAt = GETDATE()
                            FROM dbo.SmartMeter sm
                            CROSS APPLY (
                                SELECT TOP 1 mr.NewIndex
                                FROM dbo.MeterReading mr
                                WHERE mr.ApartmentID = @ApartmentID
                                  AND mr.UtilityTypeID = sm.UtilityTypeID
                                ORDER BY mr.ReadingYear DESC, mr.ReadingMonth DESC, mr.ReadingID DESC
                            ) mr
                            WHERE sm.ApartmentID = @ApartmentID
                              AND mr.NewIndex IS NOT NULL;
                        END
                    `);

                if (invoiceIds.recordset.length > 0) {
                    console.log(`Cleaned ${invoiceIds.recordset.length} invoices for terminated contract #${id}`);
                }

                await transaction.request()
                    .input('ApartmentID', sql.Int, apartmentId)
                    .input('StatusID', sql.Int, 1)
                    .query('UPDATE Apartment SET StatusID = @StatusID WHERE ApartmentID = @ApartmentID');
            } else if (Number(statusId) === 2) {
                await transaction.request()
                    .input('ApartmentID', sql.Int, apartmentId)
                    .input('StatusID', sql.Int, 2)
                    .query('UPDATE Apartment SET StatusID = @StatusID WHERE ApartmentID = @ApartmentID');
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Contract updated successfully' });
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error('Rollback update contract error:', rollbackError);
        }
        console.error('Update contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contract', error: error.message });
    }
};
exports.uploadSignedContractImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const pool = await getPool();
        const imagePath = `/uploads/contracts/${req.file.filename}`;

        const result = await pool.request()
            .input('ContractID', sql.Int, id)
            .input('SignedContractImage', sql.NVarChar, imagePath)
            .query(`
                UPDATE Contract
                SET SignedContractImage = @SignedContractImage
                WHERE ContractID = @ContractID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }

        res.json({
            success: true,
            message: 'Signed contract image uploaded successfully',
            data: { imagePath }
        });
    } catch (error) {
        console.error('Upload signed contract image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload signed contract image',
            error: error.message
        });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if contract exists and is not active
        const checkResult = await pool.request()
            .input('ContractID', sql.Int, id)
            .query(`
                SELECT StatusID 
                FROM Contract 
                WHERE ContractID = @ContractID
            `);

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }

        if (checkResult.recordset[0].StatusID === 2) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete active contract'
            });
        }

        await pool.request()
            .input('ContractID', sql.Int, id)
            .query('DELETE FROM Contract WHERE ContractID = @ContractID');

        res.json({
            success: true,
            message: 'Contract deleted successfully'
        });

    } catch (error) {
        console.error('Delete contract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contract',
            error: error.message
        });
    }
};

exports.getContractStatuses = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT StatusID, StatusName 
            FROM ContractStatus 
            ORDER BY StatusID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get contract statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error.message
        });
    }
};
