const { getPool, sql } = require('../config/db');

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

        let query = `
            SELECT 
                c.ContractID,
                c.ContractNumber,
                c.SignDate,
                c.StartDate,
                c.EndDate,
                c.Deposit,
                c.Rent,
                c.CreatedDate,
                a.ApartmentCode,
                a.Area,
                b.BuildingName,
                r.FullName AS OwnerName,
                r.Phone AS OwnerPhone,
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

        const result = await pool.request()
            .input('ContractID', sql.Int, id)
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
                    r.Phone AS OwnerPhone,
                    r.Email AS OwnerEmail,
                    r.Address AS OwnerAddress,
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
                    ) AS Services
                FROM Contract c
                INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                INNER JOIN Floor f ON a.FloorID = f.FloorID
                INNER JOIN Building b ON f.BuildingID = b.BuildingID
                INNER JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
                INNER JOIN Resident r ON c.OwnerID = r.ResidentID
                INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                WHERE c.ContractID = @ContractID
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
            statusId,
            residents,
            services
        } = req.body;

        // Validation
        if (!apartmentId || !ownerId || !contractNumber || !startDate || !endDate || !rent) {
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

        // Create contract
        const result = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('OwnerID', sql.Int, ownerId)
            .input('ContractNumber', sql.VarChar, contractNumber)
            .input('SignDate', sql.Date, signDate || new Date())
            .input('StartDate', sql.Date, startDate)
            .input('EndDate', sql.Date, endDate)
            .input('Deposit', sql.Decimal, deposit || 0)
            .input('Rent', sql.Decimal, rent)
            .input('StatusID', sql.Int, statusId || 2)
            .query(`
                INSERT INTO Contract (
                    ApartmentID, OwnerID, ContractNumber, SignDate, 
                    StartDate, EndDate, Deposit, Rent, StatusID, CreatedDate
                )
                OUTPUT INSERTED.ContractID
                VALUES (
                    @ApartmentID, @OwnerID, @ContractNumber, @SignDate,
                    @StartDate, @EndDate, @Deposit, @Rent, @StatusID, GETDATE()
                )
            `);

        const contractId = result.recordset[0].ContractID;

        // Add residents to contract
        if (residents && residents.length > 0) {
            for (const resident of residents) {
                await pool.request()
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
                await pool.request()
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

        // Update apartment status to occupied
        await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .input('StatusID', sql.Int, 2) // Đang ở
            .query('UPDATE Apartment SET StatusID = @StatusID WHERE ApartmentID = @ApartmentID');

        res.status(201).json({
            success: true,
            message: 'Contract created successfully',
            data: { contractId }
        });

    } catch (error) {
        console.error('Create contract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create contract',
            error: error.message
        });
    }
};

exports.updateContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            endDate,
            deposit,
            rent,
            statusId
        } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
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
            request.input('Rent', sql.Decimal, rent);
        }

        const willUpdateStatus = (typeof statusId !== 'undefined' && statusId !== null);
        if (willUpdateStatus) {
            updates.push('StatusID = @StatusID');
            request.input('StatusID', sql.Int, statusId);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const result = await request.query(`
            UPDATE Contract 
            SET ${updates.join(', ')}
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
            message: 'Contract updated successfully'
        });

        // Nếu cập nhật status hợp đồng, đồng bộ trạng thái căn hộ tương ứng
        if (willUpdateStatus) {
            try {
                // 2 = Hiệu lực (đang ở), 4 = Đã thanh lý (trống)
                const apartmentStatus = statusId === 2 ? 2 : (statusId === 4 ? 1 : null);
                if (apartmentStatus !== null) {
                    // Lấy ApartmentID của hợp đồng
                    const cidRes = await pool.request()
                        .input('ContractID', sql.Int, id)
                        .query('SELECT ApartmentID FROM Contract WHERE ContractID = @ContractID');
                    const aptId = cidRes.recordset[0]?.ApartmentID;
                    if (aptId) {
                        await pool.request()
                            .input('ApartmentID', sql.Int, aptId)
                            .input('StatusID', sql.Int, apartmentStatus)
                            .query('UPDATE Apartment SET StatusID = @StatusID WHERE ApartmentID = @ApartmentID');
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync apartment status after contract update:', syncErr);
            }
        }

    } catch (error) {
        console.error('Update contract error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contract',
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