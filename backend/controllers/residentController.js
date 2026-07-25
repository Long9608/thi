// backend/controllers/residentController.js
const { getPool, sql } = require('../config/db');

// ============================================
// QUẢN LÝ CƯ DÂN
// ============================================

// Lấy danh sách cư dân (có phân trang, tìm kiếm, lọc)
exports.getResidents = async (req, res) => {
    try {
        const { 
            search = '',
            status = '',
            apartmentId = '',
            page = 1, 
            limit = 20 
        } = req.query;

        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 20;
        const safePage = Math.max(1, parsedPage);
        const safeLimit = Math.max(1, parsedLimit);
        const offset = (safePage - 1) * safeLimit;

        const pool = await getPool();

        let query = `
            SELECT DISTINCT
                r.ResidentID,
                r.UserID,
                r.FullName,
                r.Gender,
                r.BirthDate,
                r.Phone,
                r.Email,
                r.Address,
                r.Avatar,
                r.Status,
                r.EmergencyContactName,
                r.EmergencyContactPhone,
                ri.IdentityNumber,
                ri.IssueDate,
                ri.IssuePlace,
                ri.ExpiredDate,
                (
                    SELECT TOP 1 a.ApartmentCode
                    FROM ContractResident cr2
                    JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                    JOIN Apartment a ON c2.ApartmentID = a.ApartmentID
                    WHERE cr2.ResidentID = r.ResidentID 
                        AND cr2.MoveOutDate IS NULL
                        AND c2.StatusID = 2
                    ORDER BY c2.SignDate DESC
                ) AS ApartmentCode,
                (
                    SELECT TOP 1 b.BuildingName
                    FROM ContractResident cr2
                    JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                    JOIN Apartment a ON c2.ApartmentID = a.ApartmentID
                    JOIN Floor f ON a.FloorID = f.FloorID
                    JOIN Building b ON f.BuildingID = b.BuildingID
                    WHERE cr2.ResidentID = r.ResidentID 
                        AND cr2.MoveOutDate IS NULL
                        AND c2.StatusID = 2
                    ORDER BY c2.SignDate DESC
                ) AS BuildingName,
                (
                    SELECT TOP 1 f.FloorNumber
                    FROM ContractResident cr2
                    JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                    JOIN Apartment a ON c2.ApartmentID = a.ApartmentID
                    JOIN Floor f ON a.FloorID = f.FloorID
                    WHERE cr2.ResidentID = r.ResidentID 
                        AND cr2.MoveOutDate IS NULL
                        AND c2.StatusID = 2
                    ORDER BY c2.SignDate DESC
                ) AS FloorNumber,
                (
                    SELECT TOP 1 rs.StatusName
                    FROM ContractResident cr2
                    JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                    JOIN Apartment a ON c2.ApartmentID = a.ApartmentID
                    JOIN RoomStatus rs ON a.StatusID = rs.StatusID
                    WHERE cr2.ResidentID = r.ResidentID 
                        AND cr2.MoveOutDate IS NULL
                        AND c2.StatusID = 2
                    ORDER BY c2.SignDate DESC
                ) AS RoomStatus
            FROM Resident r
            LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(DISTINCT r.ResidentID) as total 
            FROM Resident r
            WHERE 1=1
        `;

        if (search) {
            query += ` AND (r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search OR ri.IdentityNumber LIKE @Search)`;
            countQuery += ` AND (r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search)`;
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        if (status) {
            query += ` AND r.Status = @Status`;
            countQuery += ` AND r.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        if (apartmentId) {
            query += ` AND EXISTS (
                SELECT 1 FROM ContractResident cr2
                JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                WHERE cr2.ResidentID = r.ResidentID 
                    AND c2.ApartmentID = @ApartmentID
                    AND cr2.MoveOutDate IS NULL
                    AND c2.StatusID = 2
            )`;
            countQuery += ` AND EXISTS (
                SELECT 1 FROM ContractResident cr2
                JOIN Contract c2 ON cr2.ContractID = c2.ContractID
                WHERE cr2.ResidentID = r.ResidentID 
                    AND c2.ApartmentID = @ApartmentID
                    AND cr2.MoveOutDate IS NULL
                    AND c2.StatusID = 2
            )`;
            request.input('ApartmentID', sql.Int, parseInt(apartmentId));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY r.ResidentID DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

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
        console.error('Get residents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch residents',
            error: error.message
        });
    }
};

// Lấy chi tiết cư dân theo ID
exports.getResidentById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    r.*,
                    ri.IdentityNumber,
                    ri.FrontImage,
                    ri.BackImage,
                    ri.IssueDate,
                    ri.IssuePlace,
                    ri.ExpiredDate,
                    u.Username,
                    u.Email as UserEmail,
                    u.Phone as UserPhone,
                    u.Status as UserStatus,
                    u.LastLogin,
                    u.CreatedAt
                FROM Resident r
                LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
                LEFT JOIN Users u ON r.UserID = u.UserID
                WHERE r.ResidentID = @ResidentID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        const resident = result.recordset[0];

        // Lấy danh sách hợp đồng của cư dân
        const contractResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    c.ContractID,
                    c.ContractNumber,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName as ContractStatus,
                    a.ApartmentCode,
                    b.BuildingName,
                    f.FloorNumber,
                    cr.Relationship,
                    cr.MoveInDate,
                    cr.MoveOutDate
                FROM Contract c
                JOIN ContractResident cr ON c.ContractID = cr.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Floor f ON a.FloorID = f.FloorID
                JOIN Building b ON f.BuildingID = b.BuildingID
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                WHERE cr.ResidentID = @ResidentID
                ORDER BY c.SignDate DESC
            `);
        resident.Contracts = contractResult.recordset;

        // Lấy danh sách phương tiện của cư dân
        const vehicleResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    v.VehicleID,
                    v.PlateNumber,
                    v.Brand,
                    v.Color,
                    v.RegisterDate,
                    v.Status,
                    vt.TypeName as VehicleType,
                    ps.SlotNumber,
                    pc.CardCode,
                    pc.ExpiredDate as CardExpiredDate
                FROM Vehicle v
                JOIN VehicleType vt ON v.VehicleTypeID = vt.VehicleTypeID
                LEFT JOIN ParkingCard pc ON v.VehicleID = pc.VehicleID
                LEFT JOIN ParkingSlot ps ON pc.SlotID = ps.SlotID
                WHERE v.ResidentID = @ResidentID
                ORDER BY v.RegisterDate DESC
            `);
        resident.Vehicles = vehicleResult.recordset;

        // Lấy danh sách feedback của cư dân
        const feedbackResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    FeedbackID,
                    Title,
                    Content,
                    Rating,
                    Reply,
                    CreatedDate
                FROM Feedback
                WHERE ResidentID = @ResidentID
                ORDER BY CreatedDate DESC
            `);
        resident.Feedbacks = feedbackResult.recordset;

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

// Tạo cư dân mới
exports.createResident = async (req, res) => {
    try {
        const {
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            avatar,
            emergencyContactName,
            emergencyContactPhone,
            identityNumber,
            frontImage,
            backImage,
            issueDate,
            issuePlace,
            expiredDate,
            username,
            password,
            userId
        } = req.body;

        if (!fullName) {
            return res.status(400).json({
                success: false,
                message: 'Full name is required'
            });
        }

        const pool = await getPool();
        let residentUserId = userId || null;

        // 🔥 KIỂM TRA TRÙNG LẶP SỐ ĐIỆN THOẠI
        if (phone) {
            const phoneCheck = await pool.request()
                .input('Phone', sql.VarChar, phone)
                .query('SELECT UserID, Username FROM Users WHERE Phone = @Phone');
            
            if (phoneCheck.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: `Số điện thoại ${phone} đã được đăng ký bởi người dùng khác. Vui lòng sử dụng số khác.`,
                    field: 'phone',
                    value: phone
                });
            }
        }

        // 🔥 KIỂM TRA TRÙNG LẶP EMAIL
        if (email) {
            const emailCheck = await pool.request()
                .input('Email', sql.VarChar, email)
                .query('SELECT UserID, Username FROM Users WHERE Email = @Email');
            
            if (emailCheck.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: `Email ${email} đã được đăng ký bởi người dùng khác. Vui lòng sử dụng email khác.`,
                    field: 'email',
                    value: email
                });
            }
        }

        // 🔥 KIỂM TRA TRÙNG LẶP USERNAME
        if (username) {
            const userCheck = await pool.request()
                .input('Username', sql.VarChar, username)
                .query('SELECT UserID FROM Users WHERE Username = @Username');
            
            if (userCheck.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: `Tên đăng nhập "${username}" đã tồn tại. Vui lòng chọn tên khác.`,
                    field: 'username',
                    value: username
                });
            }
        }

        // Nếu có username và password, tạo user mới
        if (username && password && !userId) {
            const userResult = await pool.request()
                .input('Username', sql.VarChar, username)
                .input('PasswordHash', sql.VarChar, password)
                .input('Email', sql.VarChar, email || null)
                .input('Phone', sql.VarChar, phone || null)
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
                    OUTPUT INSERTED.UserID
                    VALUES (@Username, @PasswordHash, @Email, @Phone, 1, GETDATE())
                `);
            residentUserId = userResult.recordset[0].UserID;

            // Gán role RESIDENT cho user
            const roleResult = await pool.request()
                .query("SELECT RoleID FROM Role WHERE RoleCode = 'RESIDENT'");
            
            if (roleResult.recordset[0]) {
                await pool.request()
                    .input('UserID', sql.Int, residentUserId)
                    .input('RoleID', sql.Int, roleResult.recordset[0].RoleID)
                    .query(`
                        INSERT INTO UserRole (UserID, RoleID, AssignedDate)
                        VALUES (@UserID, @RoleID, GETDATE())
                    `);
            }
        }

        // Tạo resident
        const result = await pool.request()
            .input('UserID', sql.Int, residentUserId)
            .input('FullName', sql.NVarChar, fullName)
            .input('Gender', sql.Bit, gender !== undefined ? gender : null)
            .input('BirthDate', sql.Date, birthDate || null)
            .input('Phone', sql.VarChar, phone || null)
            .input('Email', sql.VarChar, email || null)
            .input('Address', sql.NVarChar, address || null)
            .input('Avatar', sql.NVarChar, avatar || null)
            .input('EmergencyContactName', sql.NVarChar, emergencyContactName || null)
            .input('EmergencyContactPhone', sql.VarChar, emergencyContactPhone || null)
            .query(`
                INSERT INTO Resident (
                    UserID, FullName, Gender, BirthDate, Phone, Email, 
                    Address, Avatar, Status, EmergencyContactName, EmergencyContactPhone
                )
                OUTPUT INSERTED.ResidentID
                VALUES (
                    @UserID, @FullName, @Gender, @BirthDate, @Phone, @Email,
                    @Address, @Avatar, 1, @EmergencyContactName, @EmergencyContactPhone
                )
            `);

        const residentId = result.recordset[0].ResidentID;

        // Tạo identity nếu có
        if (identityNumber) {
            await pool.request()
                .input('ResidentID', sql.Int, residentId)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .input('FrontImage', sql.NVarChar, frontImage || null)
                .input('BackImage', sql.NVarChar, backImage || null)
                .input('IssueDate', sql.Date, issueDate || null)
                .input('IssuePlace', sql.NVarChar, issuePlace || null)
                .input('ExpiredDate', sql.Date, expiredDate || null)
                .query(`
                    INSERT INTO ResidentIdentity (
                        ResidentID, IdentityNumber, FrontImage, BackImage, 
                        IssueDate, IssuePlace, ExpiredDate
                    )
                    VALUES (
                        @ResidentID, @IdentityNumber, @FrontImage, @BackImage,
                        @IssueDate, @IssuePlace, @ExpiredDate
                    )
                `);
        }

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'INSERT')
            .input('TableName', sql.VarChar, 'Resident')
            .input('RecordID', sql.Int, residentId)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.status(201).json({
            success: true,
            message: 'Resident created successfully',
            data: { residentId }
        });

    } catch (error) {
        console.error('Create resident error:', error);
        
        // 🔥 XỬ LÝ LỖI UNIQUE CONSTRAINT
        if (error.number === 2627) {
            let message = 'Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.';
            let field = null;
            
            if (error.message.includes('UQ_Users_Phone')) {
                message = 'Số điện thoại đã được đăng ký. Vui lòng sử dụng số khác.';
                field = 'phone';
            } else if (error.message.includes('UQ_Users_Email')) {
                message = 'Email đã được đăng ký. Vui lòng sử dụng email khác.';
                field = 'email';
            } else if (error.message.includes('UQ_Users_Username')) {
                message = 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.';
                field = 'username';
            }
            
            return res.status(400).json({
                success: false,
                message: message,
                field: field,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create resident',
            error: error.message
        });
    }
};

// Cập nhật cư dân
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
            avatar,
            status,
            emergencyContactName,
            emergencyContactPhone,
            identityNumber,
            frontImage,
            backImage,
            issueDate,
            issuePlace,
            expiredDate
        } = req.body;

        const pool = await getPool();

        // Check resident exists
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT ResidentID, UserID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        const resident = checkResult.recordset[0];

        // 🔥 Kiểm tra trùng lặp phone nếu có thay đổi
        if (phone) {
            const phoneCheck = await pool.request()
                .input('Phone', sql.VarChar, phone)
                .input('UserID', sql.Int, resident.UserID)
                .query('SELECT UserID FROM Users WHERE Phone = @Phone AND UserID != @UserID');
            
            if (phoneCheck.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: `Số điện thoại ${phone} đã được đăng ký bởi người dùng khác.`,
                    field: 'phone'
                });
            }
        }

        // 🔥 Kiểm tra trùng lặp email nếu có thay đổi
        if (email) {
            const emailCheck = await pool.request()
                .input('Email', sql.VarChar, email)
                .input('UserID', sql.Int, resident.UserID)
                .query('SELECT UserID FROM Users WHERE Email = @Email AND UserID != @UserID');
            
            if (emailCheck.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: `Email ${email} đã được đăng ký bởi người dùng khác.`,
                    field: 'email'
                });
            }
        }

        // Update resident
        const updates = [];
        const request = pool.request();
        request.input('ResidentID', sql.Int, id);

        if (fullName !== undefined) {
            updates.push('FullName = @FullName');
            request.input('FullName', sql.NVarChar, fullName);
        }
        if (gender !== undefined) {
            updates.push('Gender = @Gender');
            request.input('Gender', sql.Bit, gender);
        }
        if (birthDate !== undefined) {
            updates.push('BirthDate = @BirthDate');
            request.input('BirthDate', sql.Date, birthDate);
        }
        if (phone !== undefined) {
            updates.push('Phone = @Phone');
            request.input('Phone', sql.VarChar, phone);
        }
        if (email !== undefined) {
            updates.push('Email = @Email');
            request.input('Email', sql.VarChar, email);
        }
        if (address !== undefined) {
            updates.push('Address = @Address');
            request.input('Address', sql.NVarChar, address);
        }
        if (avatar !== undefined) {
            updates.push('Avatar = @Avatar');
            request.input('Avatar', sql.NVarChar, avatar);
        }
        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }
        if (emergencyContactName !== undefined) {
            updates.push('EmergencyContactName = @EmergencyContactName');
            request.input('EmergencyContactName', sql.NVarChar, emergencyContactName);
        }
        if (emergencyContactPhone !== undefined) {
            updates.push('EmergencyContactPhone = @EmergencyContactPhone');
            request.input('EmergencyContactPhone', sql.VarChar, emergencyContactPhone);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Resident 
                SET ${updates.join(', ')}
                WHERE ResidentID = @ResidentID
            `);

            // 🔥 Cập nhật thông tin Users nếu có thay đổi
            if (resident.UserID && (phone !== undefined || email !== undefined)) {
                const userUpdates = [];
                const userRequest = pool.request();
                userRequest.input('UserID', sql.Int, resident.UserID);

                if (phone !== undefined) {
                    userUpdates.push('Phone = @Phone');
                    userRequest.input('Phone', sql.VarChar, phone);
                }
                if (email !== undefined) {
                    userUpdates.push('Email = @Email');
                    userRequest.input('Email', sql.VarChar, email);
                }

                if (userUpdates.length > 0) {
                    await userRequest.query(`
                        UPDATE Users 
                        SET ${userUpdates.join(', ')}
                        WHERE UserID = @UserID
                    `);
                }
            }
        }

        // Update identity
        if (identityNumber !== undefined) {
            const identityCheck = await pool.request()
                .input('ResidentID', sql.Int, id)
                .query('SELECT IdentityID FROM ResidentIdentity WHERE ResidentID = @ResidentID');

            const identityRequest = pool.request();
            identityRequest.input('ResidentID', sql.Int, id);
            identityRequest.input('IdentityNumber', sql.VarChar, identityNumber);
            identityRequest.input('FrontImage', sql.NVarChar, frontImage || null);
            identityRequest.input('BackImage', sql.NVarChar, backImage || null);
            identityRequest.input('IssueDate', sql.Date, issueDate || null);
            identityRequest.input('IssuePlace', sql.NVarChar, issuePlace || null);
            identityRequest.input('ExpiredDate', sql.Date, expiredDate || null);

            if (identityCheck.recordset[0]) {
                await identityRequest.query(`
                    UPDATE ResidentIdentity SET
                        IdentityNumber = @IdentityNumber,
                        FrontImage = @FrontImage,
                        BackImage = @BackImage,
                        IssueDate = @IssueDate,
                        IssuePlace = @IssuePlace,
                        ExpiredDate = @ExpiredDate
                    WHERE ResidentID = @ResidentID
                `);
            } else {
                await identityRequest.query(`
                    INSERT INTO ResidentIdentity (
                        ResidentID, IdentityNumber, FrontImage, BackImage, 
                        IssueDate, IssuePlace, ExpiredDate
                    )
                    VALUES (
                        @ResidentID, @IdentityNumber, @FrontImage, @BackImage,
                        @IssueDate, @IssuePlace, @ExpiredDate
                    )
                `);
            }
        }

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'UPDATE')
            .input('TableName', sql.VarChar, 'Resident')
            .input('RecordID', sql.Int, id)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.json({
            success: true,
            message: 'Resident updated successfully'
        });

    } catch (error) {
        console.error('Update resident error:', error);
        
        if (error.number === 2627) {
            let message = 'Dữ liệu đã tồn tại trong hệ thống.';
            if (error.message.includes('UQ_Users_Phone')) {
                message = 'Số điện thoại đã được đăng ký bởi người dùng khác.';
            } else if (error.message.includes('UQ_Users_Email')) {
                message = 'Email đã được đăng ký bởi người dùng khác.';
            }
            return res.status(400).json({
                success: false,
                message: message,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update resident',
            error: error.message
        });
    }
};

// Xóa cư dân (soft delete)
exports.deleteResident = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT Status FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        // Soft delete
        await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('UPDATE Resident SET Status = 0 WHERE ResidentID = @ResidentID');

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'DELETE')
            .input('TableName', sql.VarChar, 'Resident')
            .input('RecordID', sql.Int, id)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

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

// Lấy cư dân theo ngày sinh
exports.getResidentsByBirthday = async (req, res) => {
    try {
        const { monthDay } = req.query;
        
        if (!monthDay) {
            return res.status(400).json({
                success: false,
                message: 'Month-Day is required (format: MM-DD)'
            });
        }

        const pool = await getPool();
        
        const result = await pool.request()
            .input('MonthDay', sql.VarChar, monthDay)
            .query(`
                SELECT 
                    r.ResidentID,
                    r.FullName,
                    r.BirthDate,
                    r.Phone,
                    r.Email,
                    r.Address,
                    a.ApartmentCode,
                    b.BuildingName
                FROM Resident r
                LEFT JOIN ContractResident cr ON r.ResidentID = cr.ResidentID AND cr.MoveOutDate IS NULL
                LEFT JOIN Contract c ON cr.ContractID = c.ContractID AND c.StatusID = 2
                LEFT JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                LEFT JOIN Floor f ON a.FloorID = f.FloorID
                LEFT JOIN Building b ON f.BuildingID = b.BuildingID
                WHERE FORMAT(r.BirthDate, 'MM-dd') = @MonthDay
                    AND r.Status = 1
                ORDER BY r.FullName
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get residents by birthday error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch residents by birthday',
            error: error.message
        });
    }
};

// Lấy lịch sử cư trú của cư dân
exports.getResidenceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    cr.ContractResidentID,
                    cr.Relationship,
                    cr.MoveInDate,
                    cr.MoveOutDate,
                    c.ContractNumber,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName as ContractStatus,
                    a.ApartmentCode,
                    a.Area,
                    b.BuildingName,
                    f.FloorNumber
                FROM ContractResident cr
                JOIN Contract c ON cr.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Floor f ON a.FloorID = f.FloorID
                JOIN Building b ON f.BuildingID = b.BuildingID
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                WHERE cr.ResidentID = @ResidentID
                ORDER BY cr.MoveInDate DESC
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get residence history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch residence history',
            error: error.message
        });
    }
};

// Lấy danh sách thành viên hộ gia đình
exports.getFamilyMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Lấy căn hộ hiện tại của cư dân
        const currentResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT TOP 1 a.ApartmentID, a.ApartmentCode
                FROM ContractResident cr
                JOIN Contract c ON cr.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                WHERE cr.ResidentID = @ResidentID
                    AND cr.MoveOutDate IS NULL
                    AND c.StatusID = 2
                ORDER BY c.SignDate DESC
            `);

        if (!currentResult.recordset[0]) {
            return res.json({
                success: true,
                data: [],
                message: 'Resident is not currently living in any apartment'
            });
        }

        const apartmentId = currentResult.recordset[0].ApartmentID;

        // Lấy tất cả thành viên trong cùng căn hộ
        const result = await pool.request()
            .input('ApartmentID', sql.Int, apartmentId)
            .query(`
                SELECT 
                    r.ResidentID,
                    r.FullName,
                    r.Gender,
                    r.BirthDate,
                    r.Phone,
                    r.Email,
                    r.Address,
                    r.Avatar,
                    cr.Relationship,
                    cr.MoveInDate,
                    ri.IdentityNumber,
                    u.Username
                FROM ContractResident cr
                JOIN Resident r ON cr.ResidentID = r.ResidentID
                LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
                LEFT JOIN Users u ON r.UserID = u.UserID
                WHERE cr.ContractID IN (
                    SELECT ContractID 
                    FROM Contract 
                    WHERE ApartmentID = @ApartmentID 
                        AND StatusID = 2
                )
                    AND cr.MoveOutDate IS NULL
                    AND r.Status = 1
                ORDER BY 
                    CASE WHEN cr.Relationship = 'Chủ hộ' THEN 0 ELSE 1 END,
                    r.FullName
            `);

        res.json({
            success: true,
            data: {
                apartment: currentResult.recordset[0],
                members: result.recordset
            }
        });

    } catch (error) {
        console.error('Get family members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch family members',
            error: error.message
        });
    }
};

// Xuất Excel danh sách cư dân
exports.exportResidents = async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT 
                r.FullName as 'Họ tên',
                CASE WHEN r.Gender = 1 THEN 'Nam' ELSE 'Nữ' END as 'Giới tính',
                FORMAT(r.BirthDate, 'dd/MM/yyyy') as 'Ngày sinh',
                r.Phone as 'Số điện thoại',
                r.Email as 'Email',
                r.Address as 'Địa chỉ',
                ri.IdentityNumber as 'CCCD',
                ri.IssuePlace as 'Nơi cấp',
                FORMAT(ri.IssueDate, 'dd/MM/yyyy') as 'Ngày cấp',
                a.ApartmentCode as 'Mã căn hộ',
                b.BuildingName as 'Tòa nhà',
                CASE WHEN r.Status = 1 THEN 'Đang ở' ELSE 'Đã rời' END as 'Trạng thái'
            FROM Resident r
            LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
            LEFT JOIN ContractResident cr ON r.ResidentID = cr.ResidentID AND cr.MoveOutDate IS NULL
            LEFT JOIN Contract c ON cr.ContractID = c.ContractID AND c.StatusID = 2
            LEFT JOIN Apartment a ON c.ApartmentID = a.ApartmentID
            LEFT JOIN Floor f ON a.FloorID = f.FloorID
            LEFT JOIN Building b ON f.BuildingID = b.BuildingID
            WHERE r.Status = 1
            ORDER BY r.FullName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Export residents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export residents',
            error: error.message
        });
    }
};

// ============================================
// 🔥 QUẢN LÝ CCCD / HỒ SƠ
// ============================================

// Lấy thông tin CCCD của cư dân
exports.getResidentIdentity = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    ri.IdentityID,
                    ri.IdentityNumber,
                    ri.FrontImage,
                    ri.BackImage,
                    ri.IssueDate,
                    ri.IssuePlace,
                    ri.ExpiredDate,
                    r.FullName,
                    r.BirthDate,
                    r.Gender,
                    r.Phone,
                    r.Email,
                    r.Address
                FROM ResidentIdentity ri
                JOIN Resident r ON ri.ResidentID = r.ResidentID
                WHERE ri.ResidentID = @ResidentID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Identity not found for this resident'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Get resident identity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch identity',
            error: error.message
        });
    }
};

// Cập nhật CCCD của cư dân
exports.updateResidentIdentity = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            identityNumber,
            issueDate,
            issuePlace,
            expiredDate,
            frontImage,
            backImage
        } = req.body;

        const pool = await getPool();

        // Kiểm tra cư dân tồn tại
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        // Kiểm tra identity đã tồn tại chưa
        const identityCheck = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT IdentityID FROM ResidentIdentity WHERE ResidentID = @ResidentID');

        if (identityCheck.recordset[0]) {
            // Update existing identity
            await pool.request()
                .input('ResidentID', sql.Int, id)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .input('IssueDate', sql.Date, issueDate || null)
                .input('IssuePlace', sql.NVarChar, issuePlace || null)
                .input('ExpiredDate', sql.Date, expiredDate || null)
                .input('FrontImage', sql.NVarChar, frontImage || null)
                .input('BackImage', sql.NVarChar, backImage || null)
                .query(`
                    UPDATE ResidentIdentity SET
                        IdentityNumber = @IdentityNumber,
                        IssueDate = @IssueDate,
                        IssuePlace = @IssuePlace,
                        ExpiredDate = @ExpiredDate,
                        FrontImage = @FrontImage,
                        BackImage = @BackImage
                    WHERE ResidentID = @ResidentID
                `);
        } else {
            // Create new identity
            await pool.request()
                .input('ResidentID', sql.Int, id)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .input('IssueDate', sql.Date, issueDate || null)
                .input('IssuePlace', sql.NVarChar, issuePlace || null)
                .input('ExpiredDate', sql.Date, expiredDate || null)
                .input('FrontImage', sql.NVarChar, frontImage || null)
                .input('BackImage', sql.NVarChar, backImage || null)
                .query(`
                    INSERT INTO ResidentIdentity (
                        ResidentID, IdentityNumber, IssueDate, IssuePlace, 
                        ExpiredDate, FrontImage, BackImage
                    )
                    VALUES (
                        @ResidentID, @IdentityNumber, @IssueDate, @IssuePlace,
                        @ExpiredDate, @FrontImage, @BackImage
                    )
                `);
        }

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'UPDATE')
            .input('TableName', sql.VarChar, 'ResidentIdentity')
            .input('RecordID', sql.Int, id)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.json({
            success: true,
            message: 'Identity updated successfully'
        });

    } catch (error) {
        console.error('Update resident identity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update identity',
            error: error.message
        });
    }
};

// Upload ảnh CCCD
exports.uploadIdentityImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        if (!['front', 'back'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be "front" or "back"'
            });
        }

        const pool = await getPool();

        // Kiểm tra cư dân tồn tại
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        const imagePath = `/uploads/identity/${id}_${type}_${Date.now()}.png`;
        const column = type === 'front' ? 'FrontImage' : 'BackImage';

        // Kiểm tra identity đã tồn tại chưa
        const identityCheck = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query('SELECT IdentityID FROM ResidentIdentity WHERE ResidentID = @ResidentID');

        if (identityCheck.recordset[0]) {
            await pool.request()
                .input('ResidentID', sql.Int, id)
                .input('ImagePath', sql.NVarChar, imagePath)
                .query(`
                    UPDATE ResidentIdentity 
                    SET ${column} = @ImagePath
                    WHERE ResidentID = @ResidentID
                `);
        } else {
            await pool.request()
                .input('ResidentID', sql.Int, id)
                .input('ImagePath', sql.NVarChar, imagePath)
                .query(`
                    INSERT INTO ResidentIdentity (ResidentID, ${column})
                    VALUES (@ResidentID, @ImagePath)
                `);
        }

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: { imagePath }
        });

    } catch (error) {
        console.error('Upload identity image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
};

// ============================================
// 🔥 QUẢN LÝ THÀNH VIÊN HỘ GIA ĐÌNH
// ============================================

// Lấy danh sách thành viên hộ gia đình chi tiết
exports.getFamilyMembersDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const currentResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT TOP 1 
                    a.ApartmentID,
                    a.ApartmentCode,
                    b.BuildingName,
                    f.FloorNumber,
                    c.ContractID,
                    c.ContractNumber
                FROM ContractResident cr
                JOIN Contract c ON cr.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Floor f ON a.FloorID = f.FloorID
                JOIN Building b ON f.BuildingID = b.BuildingID
                WHERE cr.ResidentID = @ResidentID
                    AND cr.MoveOutDate IS NULL
                    AND c.StatusID = 2
                ORDER BY c.SignDate DESC
            `);

        if (!currentResult.recordset[0]) {
            return res.json({
                success: true,
                data: {
                    apartment: null,
                    members: [],
                    message: 'Resident is not currently living in any apartment'
                }
            });
        }

        const apartment = currentResult.recordset[0];

        const membersResult = await pool.request()
            .input('ContractID', sql.Int, apartment.ContractID)
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    cr.ContractResidentID,
                    r.ResidentID,
                    r.FullName,
                    r.Gender,
                    r.BirthDate,
                    r.Phone,
                    r.Email,
                    r.Address,
                    r.Avatar,
                    r.Status AS ResidentStatus,
                    cr.Relationship,
                    cr.MoveInDate,
                    cr.MoveOutDate,
                    ri.IdentityNumber,
                    u.Username,
                    u.Email AS UserEmail,
                    CASE 
                        WHEN r.ResidentID = @ResidentID THEN 1 
                        ELSE 0 
                    END AS IsCurrentUser
                FROM ContractResident cr
                JOIN Resident r ON cr.ResidentID = r.ResidentID
                LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
                LEFT JOIN Users u ON r.UserID = u.UserID
                WHERE cr.ContractID = @ContractID
                    AND cr.MoveOutDate IS NULL
                    AND r.Status = 1
                ORDER BY 
                    CASE WHEN cr.Relationship = 'Chủ hộ' THEN 0 ELSE 1 END,
                    r.FullName
            `);

        res.json({
            success: true,
            data: {
                apartment,
                members: membersResult.recordset,
                total: membersResult.recordset.length
            }
        });

    } catch (error) {
        console.error('Get family members detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch family members',
            error: error.message
        });
    }
};

// Thêm thành viên mới vào hộ gia đình
exports.addFamilyMember = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            relationship,
            isHead,
            identityNumber,
            moveInDate
        } = req.body;

        if (!fullName || !relationship) {
            return res.status(400).json({
                success: false,
                message: 'Full name and relationship are required'
            });
        }

        const pool = await getPool();

        // Lấy contract hiện tại của cư dân
        const contractResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT TOP 1 c.ContractID, c.ApartmentID, c.OwnerID
                FROM ContractResident cr
                JOIN Contract c ON cr.ContractID = c.ContractID
                WHERE cr.ResidentID = @ResidentID
                    AND cr.MoveOutDate IS NULL
                    AND c.StatusID = 2
                ORDER BY c.SignDate DESC
            `);

        if (!contractResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Resident is not currently living in any apartment'
            });
        }

        const { ContractID, ApartmentID, OwnerID } = contractResult.recordset[0];

        // Tạo resident mới
        const residentResult = await pool.request()
            .input('FullName', sql.NVarChar, fullName)
            .input('Gender', sql.Bit, gender !== undefined ? gender : null)
            .input('BirthDate', sql.Date, birthDate || null)
            .input('Phone', sql.VarChar, phone || null)
            .input('Email', sql.VarChar, email || null)
            .input('Address', sql.NVarChar, address || null)
            .input('Status', sql.Bit, 1)
            .query(`
                INSERT INTO Resident (FullName, Gender, BirthDate, Phone, Email, Address, Status)
                OUTPUT INSERTED.ResidentID
                VALUES (@FullName, @Gender, @BirthDate, @Phone, @Email, @Address, @Status)
            `);

        const newResidentId = residentResult.recordset[0].ResidentID;

        // Thêm vào ContractResident
        await pool.request()
            .input('ContractID', sql.Int, ContractID)
            .input('ResidentID', sql.Int, newResidentId)
            .input('Relationship', sql.NVarChar, relationship)
            .input('MoveInDate', sql.Date, moveInDate || new Date())
            .query(`
                INSERT INTO ContractResident (
                    ContractID, ResidentID, Relationship, MoveInDate
                )
                VALUES (
                    @ContractID, @ResidentID, @Relationship, @MoveInDate
                )
            `);

        // Nếu có CCCD, thêm vào ResidentIdentity
        if (identityNumber) {
            await pool.request()
                .input('ResidentID', sql.Int, newResidentId)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .query(`
                    INSERT INTO ResidentIdentity (ResidentID, IdentityNumber)
                    VALUES (@ResidentID, @IdentityNumber)
                `);
        }

        // Nếu là chủ hộ, cập nhật OwnerID của contract
        if (isHead) {
            await pool.request()
                .input('ContractID', sql.Int, ContractID)
                .input('OwnerID', sql.Int, newResidentId)
                .query(`
                    UPDATE Contract 
                    SET OwnerID = @OwnerID 
                    WHERE ContractID = @ContractID
                `);
        }

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'INSERT')
            .input('TableName', sql.VarChar, 'Resident')
            .input('RecordID', sql.Int, newResidentId)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.status(201).json({
            success: true,
            message: 'Family member added successfully',
            data: { residentId: newResidentId }
        });

    } catch (error) {
        console.error('Add family member error:', error);
        
        if (error.number === 2627) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu đã tồn tại. Vui lòng kiểm tra lại số điện thoại hoặc email.',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to add family member',
            error: error.message
        });
    }
};

// Cập nhật thành viên hộ gia đình
exports.updateFamilyMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const {
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            relationship,
            isHead,
            moveInDate,
            moveOutDate,
            status
        } = req.body;

        const pool = await getPool();

        // Kiểm tra thành viên tồn tại
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, memberId)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Cập nhật Resident
        const updates = [];
        const request = pool.request();
        request.input('ResidentID', sql.Int, memberId);

        if (fullName !== undefined) {
            updates.push('FullName = @FullName');
            request.input('FullName', sql.NVarChar, fullName);
        }
        if (gender !== undefined) {
            updates.push('Gender = @Gender');
            request.input('Gender', sql.Bit, gender);
        }
        if (birthDate !== undefined) {
            updates.push('BirthDate = @BirthDate');
            request.input('BirthDate', sql.Date, birthDate);
        }
        if (phone !== undefined) {
            updates.push('Phone = @Phone');
            request.input('Phone', sql.VarChar, phone);
        }
        if (email !== undefined) {
            updates.push('Email = @Email');
            request.input('Email', sql.VarChar, email);
        }
        if (address !== undefined) {
            updates.push('Address = @Address');
            request.input('Address', sql.NVarChar, address);
        }
        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Resident 
                SET ${updates.join(', ')}
                WHERE ResidentID = @ResidentID
            `);
        }

        // Cập nhật ContractResident
        if (relationship !== undefined || moveInDate !== undefined || moveOutDate !== undefined) {
            const crUpdates = [];
            const crRequest = pool.request();
            crRequest.input('ResidentID', sql.Int, memberId);

            if (relationship !== undefined) {
                crUpdates.push('Relationship = @Relationship');
                crRequest.input('Relationship', sql.NVarChar, relationship);
            }
            if (moveInDate !== undefined) {
                crUpdates.push('MoveInDate = @MoveInDate');
                crRequest.input('MoveInDate', sql.Date, moveInDate);
            }
            if (moveOutDate !== undefined) {
                crUpdates.push('MoveOutDate = @MoveOutDate');
                crRequest.input('MoveOutDate', sql.Date, moveOutDate);
            }

            if (crUpdates.length > 0) {
                await crRequest.query(`
                    UPDATE ContractResident 
                    SET ${crUpdates.join(', ')}
                    WHERE ResidentID = @ResidentID 
                        AND ContractID IN (
                            SELECT ContractID 
                            FROM ContractResident 
                            WHERE ResidentID = @ResidentID 
                                AND MoveOutDate IS NULL
                        )
                `);
            }
        }

        // Nếu là chủ hộ, cập nhật OwnerID
        if (isHead !== undefined) {
            const contractResult = await pool.request()
                .input('ResidentID', sql.Int, memberId)
                .query(`
                    SELECT TOP 1 c.ContractID
                    FROM ContractResident cr
                    JOIN Contract c ON cr.ContractID = c.ContractID
                    WHERE cr.ResidentID = @ResidentID 
                        AND cr.MoveOutDate IS NULL
                        AND c.StatusID = 2
                `);

            if (contractResult.recordset[0]) {
                await pool.request()
                    .input('ContractID', sql.Int, contractResult.recordset[0].ContractID)
                    .input('OwnerID', sql.Int, isHead ? memberId : null)
                    .query(`
                        UPDATE Contract 
                        SET OwnerID = @OwnerID 
                        WHERE ContractID = @ContractID
                    `);
            }
        }

        res.json({
            success: true,
            message: 'Family member updated successfully'
        });

    } catch (error) {
        console.error('Update family member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update family member',
            error: error.message
        });
    }
};

// Xóa thành viên hộ gia đình
exports.removeFamilyMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const pool = await getPool();

        // Kiểm tra thành viên tồn tại
        const checkResult = await pool.request()
            .input('ResidentID', sql.Int, memberId)
            .query('SELECT ResidentID FROM Resident WHERE ResidentID = @ResidentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Soft delete
        await pool.request()
            .input('ResidentID', sql.Int, memberId)
            .query('UPDATE Resident SET Status = 0 WHERE ResidentID = @ResidentID');

        await pool.request()
            .input('ResidentID', sql.Int, memberId)
            .query(`
                UPDATE ContractResident 
                SET MoveOutDate = GETDATE() 
                WHERE ResidentID = @ResidentID 
                    AND MoveOutDate IS NULL
            `);

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'DELETE')
            .input('TableName', sql.VarChar, 'Resident')
            .input('RecordID', sql.Int, memberId)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.json({
            success: true,
            message: 'Family member removed successfully'
        });

    } catch (error) {
        console.error('Remove family member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove family member',
            error: error.message
        });
    }
};

// ============================================
// 🔥 LỊCH SỬ CƯ TRÚ CHI TIẾT
// ============================================

exports.getResidenceHistoryDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    cr.ContractResidentID,
                    cr.Relationship,
                    cr.MoveInDate,
                    cr.MoveOutDate,
                    c.ContractID,
                    c.ContractNumber,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName AS ContractStatus,
                    a.ApartmentID,
                    a.ApartmentCode,
                    a.Area,
                    f.FloorNumber,
                    b.BuildingID,
                    b.BuildingName,
                    ar.AreaName,
                    ar.Address AS AreaAddress,
                    r.FullName AS OwnerName,
                    r.Phone AS OwnerPhone,
                    r.Email AS OwnerEmail,
                    DATEDIFF(DAY, cr.MoveInDate, ISNULL(cr.MoveOutDate, GETDATE())) AS DaysStayed,
                    CASE 
                        WHEN cr.MoveOutDate IS NULL AND c.StatusID = 2 THEN 'Đang ở'
                        WHEN cr.MoveOutDate IS NULL AND c.StatusID != 2 THEN 'Hợp đồng kết thúc'
                        ELSE 'Đã chuyển đi'
                    END AS Status
                FROM ContractResident cr
                JOIN Contract c ON cr.ContractID = c.ContractID
                JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                JOIN Floor f ON a.FloorID = f.FloorID
                JOIN Building b ON f.BuildingID = b.BuildingID
                JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                WHERE cr.ResidentID = @ResidentID
                ORDER BY cr.MoveInDate DESC, c.SignDate DESC
            `);

        const records = result.recordset;
        const totalStays = records.length;
        const totalDays = records.reduce((sum, r) => sum + (r.DaysStayed || 0), 0);
        const avgDays = totalStays > 0 ? Math.round(totalDays / totalStays) : 0;

        const residentResult = await pool.request()
            .input('ResidentID', sql.Int, id)
            .query(`
                SELECT 
                    ResidentID,
                    FullName,
                    Phone,
                    Email,
                    BirthDate,
                    Address
                FROM Resident
                WHERE ResidentID = @ResidentID
            `);

        res.json({
            success: true,
            data: {
                resident: residentResult.recordset[0] || null,
                summary: {
                    totalStays,
                    totalDays,
                    averageDays: avgDays,
                    currentStay: records.find(r => r.Status === 'Đang ở') || null
                },
                history: records
            }
        });

    } catch (error) {
        console.error('Get residence history detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch residence history',
            error: error.message
        });
    }
};