const { getPool, sql } = require('../config/db');

exports.getAllResidents = async (req, res) => {
    try {
        const { 
            search,
            status,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                r.ResidentID,
                r.FullName,
                r.Gender,
                r.BirthDate,
                r.Phone,
                r.Email,
                r.Address,
                r.Status,
                r.EmergencyContactName,
                r.EmergencyContactPhone,
                u.Username,
                ri.IdentityNumber,
                (
                    SELECT COUNT(*) 
                    FROM ContractResident cr 
                    INNER JOIN Contract c ON cr.ContractID = c.ContractID
                    WHERE cr.ResidentID = r.ResidentID 
                        AND c.StatusID IN (1, 2)
                ) AS ActiveContracts
            FROM Resident r
            LEFT JOIN Users u ON r.UserID = u.UserID
            LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Resident r
            WHERE 1=1
        `;

        if (search) {
            query += ` AND (r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search)`;
            countQuery += ` AND (r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search)`;
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        if (status !== undefined) {
            query += ` AND r.Status = @Status`;
            countQuery += ` AND r.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY r.FullName
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
        console.error('Get residents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch residents',
            error: error.message
        });
    }
};

exports.getResidentById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    r.*,
                    u.Username,
                    u.Email AS UserEmail,
                    u.Phone AS UserPhone,
                    ri.IdentityNumber,
                    ri.FrontImage,
                    ri.BackImage,
                    ri.IssueDate,
                    ri.IssuePlace,
                    ri.ExpiredDate,
                    (
                        SELECT 
                            c.ContractID,
                            c.ContractNumber,
                            c.StartDate,
                            c.EndDate,
                            c.Rent,
                            a.ApartmentCode,
                            cs.StatusName AS ContractStatus
                        FROM Contract c
                        INNER JOIN ContractResident cr ON c.ContractID = cr.ContractID
                        INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                        INNER JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                        WHERE cr.ResidentID = r.ResidentID
                        FOR JSON PATH
                    ) AS Contracts,
                    (
                        SELECT 
                            v.VehicleID,
                            v.PlateNumber,
                            vt.TypeName AS VehicleType,
                            v.Brand,
                            v.Color,
                            pc.CardCode,
                            pc.ExpiredDate AS CardExpiredDate
                        FROM Vehicle v
                        LEFT JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
                        LEFT JOIN ParkingCard pc ON v.VehicleID = pc.VehicleID
                        WHERE v.ResidentID = r.ResidentID
                        FOR JSON PATH
                    ) AS Vehicles
                FROM Resident r
                LEFT JOIN Users u ON r.UserID = u.UserID
                LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
                WHERE r.ResidentID = @ResidentID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        const resident = result.recordset[0];
        
        // Parse JSON fields
        if (resident.Contracts) {
            resident.Contracts = JSON.parse(resident.Contracts);
        }
        if (resident.Vehicles) {
            resident.Vehicles = JSON.parse(resident.Vehicles);
        }

        res.json({
            success: true,
            data: resident
        });

    } catch (error) {
        console.error('Get resident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resident',
            error: error.message
        });
    }
};

exports.createResident = async (req, res) => {
    try {
        const { 
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            identityNumber,
            issueDate,
            issuePlace,
            expiredDate,
            emergencyContactName,
            emergencyContactPhone,
            userId
        } = req.body;

        if (!fullName) {
            return res.status(400).json({
                success: false,
                message: 'Full name is required'
            });
        }

        const pool = await getPool();

        // Check if email or phone already exists
        if (email) {
            const checkEmail = await pool.request()
                .input('Email', sql.VarChar, email)
                .query('SELECT ResidentID FROM Resident WHERE Email = @Email');
            
            if (checkEmail.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        if (phone) {
            const checkPhone = await pool.request()
                .input('Phone', sql.VarChar, phone)
                .query('SELECT ResidentID FROM Resident WHERE Phone = @Phone');
            
            if (checkPhone.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already exists'
                });
            }
        }

        // Create resident
        const result = await pool.request()
            .input('UserID', sql.Int, userId || null)
            .input('FullName', sql.NVarChar, fullName)
            .input('Gender', sql.Bit, gender !== undefined ? gender : null)
            .input('BirthDate', sql.Date, birthDate || null)
            .input('Phone', sql.VarChar, phone || null)
            .input('Email', sql.VarChar, email || null)
            .input('Address', sql.NVarChar, address || null)
            .input('EmergencyContactName', sql.NVarChar, emergencyContactName || null)
            .input('EmergencyContactPhone', sql.VarChar, emergencyContactPhone || null)
            .query(`
                INSERT INTO Resident (
                    UserID, FullName, Gender, BirthDate, Phone, Email, Address,
                    EmergencyContactName, EmergencyContactPhone, Status
                )
                OUTPUT INSERTED.ResidentID
                VALUES (
                    @UserID, @FullName, @Gender, @BirthDate, @Phone, @Email, @Address,
                    @EmergencyContactName, @EmergencyContactPhone, 1
                )
            `);

        const residentId = result.recordset[0].ResidentID;

        // Create identity if provided
        if (identityNumber) {
            await pool.request()
                .input('ResidentID', sql.Int, residentId)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .input('IssueDate', sql.Date, issueDate || null)
                .input('IssuePlace', sql.NVarChar, issuePlace || null)
                .input('ExpiredDate', sql.Date, expiredDate || null)
                .query(`
                    INSERT INTO ResidentIdentity (
                        ResidentID, IdentityNumber, IssueDate, IssuePlace, ExpiredDate
                    )
                    VALUES (
                        @ResidentID, @IdentityNumber, @IssueDate, @IssuePlace, @ExpiredDate
                    )
                `);
        }

        res.status(201).json({
            success: true,
            message: 'Resident created successfully',
            data: { residentId }
        });

    } catch (error) {
        console.error('Create resident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create resident',
            error: error.message
        });
    }
};

exports.updateResident = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            status,
            emergencyContactName,
            emergencyContactPhone,
            identityNumber,
            issueDate,
            issuePlace,
            expiredDate
        } = req.body;

        const pool = await getPool();

        // Check if resident exists
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        // Update resident
        const updates = [];
        const request = pool.request();
        request.input('ResidentID', sql.Int, id);

        if (fullName) {
            updates.push('FullName = @FullName');
            request.input('FullName', sql.NVarChar, fullName);
        }

        if (gender !== undefined) {
            updates.push('Gender = @Gender');
            request.input('Gender', sql.Bit, gender);
        }

        if (birthDate) {
            updates.push('BirthDate = @BirthDate');
            request.input('BirthDate', sql.Date, birthDate);
        }

        if (phone) {
            updates.push('Phone = @Phone');
            request.input('Phone', sql.VarChar, phone);
        }

        if (email) {
            updates.push('Email = @Email');
            request.input('Email', sql.VarChar, email);
        }

        if (address) {
            updates.push('Address = @Address');
            request.input('Address', sql.NVarChar, address);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (emergencyContactName) {
            updates.push('EmergencyContactName = @EmergencyContactName');
            request.input('EmergencyContactName', sql.NVarChar, emergencyContactName);
        }

        if (emergencyContactPhone) {
            updates.push('EmergencyContactPhone = @EmergencyContactPhone');
            request.input('EmergencyContactPhone', sql.VarChar, emergencyContactPhone);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Resident 
                SET ${updates.join(', ')}
                WHERE ResidentID = @ResidentID
            `);
        }

        // Update identity if provided
        if (identityNumber) {
            const identityCheck = await pool.request()
                .input('ResidentID', sql.Int, id)
                .query('SELECT IdentityID FROM ResidentIdentity WHERE ResidentID = @ResidentID');

            if (identityCheck.recordset[0]) {
                // Update existing identity
                const identityUpdates = [];
                const identityRequest = pool.request();
                identityRequest.input('ResidentID', sql.Int, id);

                if (identityNumber) {
                    identityUpdates.push('IdentityNumber = @IdentityNumber');
                    identityRequest.input('IdentityNumber', sql.VarChar, identityNumber);
                }

                if (issueDate) {
                    identityUpdates.push('IssueDate = @IssueDate');
                    identityRequest.input('IssueDate', sql.Date, issueDate);
                }

                if (issuePlace) {
                    identityUpdates.push('IssuePlace = @IssuePlace');
                    identityRequest.input('IssuePlace', sql.NVarChar, issuePlace);
                }

                if (expiredDate) {
                    identityUpdates.push('ExpiredDate = @ExpiredDate');
                    identityRequest.input('ExpiredDate', sql.Date, expiredDate);
                }

                if (identityUpdates.length > 0) {
                    await identityRequest.query(`
                        UPDATE ResidentIdentity 
                        SET ${identityUpdates.join(', ')}
                        WHERE ResidentID = @ResidentID
                    `);
                }
            } else {
                // Insert new identity
                await pool.request()
                    .input('ResidentID', sql.Int, id)
                    .input('IdentityNumber', sql.VarChar, identityNumber)
                    .input('IssueDate', sql.Date, issueDate || null)
                    .input('IssuePlace', sql.NVarChar, issuePlace || null)
                    .input('ExpiredDate', sql.Date, expiredDate || null)
                    .query(`
                        INSERT INTO ResidentIdentity (
                            ResidentID, IdentityNumber, IssueDate, IssuePlace, ExpiredDate
                        )
                        VALUES (
                            @ResidentID, @IdentityNumber, @IssueDate, @IssuePlace, @ExpiredDate
                        )
                    `);
            }
        }

        res.json({
            success: true,
            message: 'Resident updated successfully'
        });

    } catch (error) {
        console.error('Update resident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update resident',
            error: error.message
        });
    }
};

exports.deleteResident = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if resident exists
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        // Check if resident has active contracts
        const contractCheck = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM ContractResident cr
                INNER JOIN Contract c ON cr.ContractID = c.ContractID
                WHERE cr.ResidentID = @ResidentID 
                    AND c.StatusID IN (1, 2)
            `);

        if (contractCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete resident with active contracts'
            });
        }

        // Soft delete - update status to inactive
        await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('UPDATE Resident SET Status = 0 WHERE ResidentID = @ResidentID');

        res.json({
            success: true,
            message: 'Resident deleted successfully'
        });

    } catch (error) {
        console.error('Delete resident error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete resident',
            error: error.message
        });
    }
};