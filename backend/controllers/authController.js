// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

const generateToken = (userId) => {
    return jwt.sign(
        { userId }, 
        process.env.JWT_SECRET || 'your_secret_key', 
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// ==================== LOGIN ====================
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('========================================');
        console.log('📝 Login attempt:', { username, password: '***' });
        console.log('========================================');
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const pool = await getPool();
        
        const result = await pool.request()
            .input('Username', sql.VarChar, username)
            .input('Email', sql.VarChar, username)
            .query(`
                SELECT 
                    u.UserID,
                    u.Username,
                    u.PasswordHash,
                    u.Email,
                    u.Phone,
                    u.Status,
                    u.LastLogin,
                    u.CreatedAt,
                    STRING_AGG(r.RoleCode, ',') AS RoleCodes,
                    STRING_AGG(r.RoleName, ',') AS RoleNames
                FROM Users u
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                WHERE (u.Username = @Username OR u.Email = @Email)
                GROUP BY u.UserID, u.Username, u.PasswordHash, u.Email, u.Phone, 
                         u.Status, u.LastLogin, u.CreatedAt
            `);

        console.log('📊 Query result:', result.recordset.length > 0 ? 'User found' : 'User not found');

        if (!result.recordset || result.recordset.length === 0) {
            console.log('❌ User not found');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.recordset[0];
        console.log('👤 User found:', {
            UserID: user.UserID,
            Username: user.Username,
            Email: user.Email,
            Roles: user.RoleNames,
            Status: user.Status
        });
        
        // Check if user is active
        if (!user.Status) {
            console.log('❌ Account is inactive');
            return res.status(401).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // 🔐 SỬA: So sánh password với bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        
        console.log('🔐 Password check:', {
            match: isPasswordValid
        });

        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        console.log('✅ Password verified');

        // Lấy permissions
        const permResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`
                SELECT DISTINCT p.PermissionCode, p.PermissionName, m.ModuleCode
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
            `);

        const permissions = permResult.recordset.map(p => p.PermissionCode);

        // Update last login time
        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID`);

        const token = generateToken(user.UserID);
        console.log('🔑 Token generated');
        
        // Get resident info if user is resident
        let residentInfo = null;
        const residentResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`SELECT * FROM Resident WHERE UserID = @UserID`);
        if (residentResult.recordset[0]) {
            residentInfo = residentResult.recordset[0];
        }

        // Get employee info if user is employee
        let employeeInfo = null;
        const employeeResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`SELECT * FROM Employee WHERE UserID = @UserID`);
        if (employeeResult.recordset[0]) {
            employeeInfo = employeeResult.recordset[0];
        }

        console.log('✅ Login successful!');
        console.log('========================================');

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.UserID,
                    username: user.Username,
                    email: user.Email,
                    phone: user.Phone,
                    roles: user.RoleNames ? user.RoleNames.split(',') : [],
                    roleCodes: user.RoleCodes ? user.RoleCodes.split(',') : [],
                    permissions: permissions,
                    resident: residentInfo,
                    employee: employeeInfo
                }
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        console.error('Stack:', error.stack);
        console.log('========================================');
        
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// ==================== REGISTER ====================
exports.register = async (req, res) => {
    try {
        const { 
            username, 
            password, 
            email, 
            phone, 
            fullName, 
            gender, 
            birthDate,
            identityNumber,
            address,
            roleCode
        } = req.body;

        const pool = await getPool();

        // Check if username already exists
        const checkUser = await pool.request()
            .input('Username', sql.VarChar, username)
            .query('SELECT UserID FROM Users WHERE Username = @Username');

        if (checkUser.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Lấy RoleID từ RoleCode
        const roleResult = await pool.request()
            .input('RoleCode', sql.VarChar, roleCode || 'RESIDENT')
            .query('SELECT RoleID FROM Role WHERE RoleCode = @RoleCode');

        if (!roleResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const roleId = roleResult.recordset[0].RoleID;

        // 🔐 SỬA: Hash password trước khi lưu
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Tạo user với password đã hash
        const userResult = await pool.request()
            .input('Username', sql.VarChar, username)
            .input('PasswordHash', sql.VarChar, hashedPassword) // Lưu hash
            .input('Email', sql.VarChar, email || null)
            .input('Phone', sql.VarChar, phone || null)
            .query(`
                INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
                OUTPUT INSERTED.UserID
                VALUES (@Username, @PasswordHash, @Email, @Phone, 1, GETDATE())
            `);

        const userId = userResult.recordset[0].UserID;

        // Gán Role cho User
        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('RoleID', sql.Int, roleId)
            .query(`
                INSERT INTO UserRole (UserID, RoleID, AssignedDate)
                VALUES (@UserID, @RoleID, GETDATE())
            `);

        // Create resident record
        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('FullName', sql.NVarChar, fullName)
            .input('Gender', sql.Bit, gender)
            .input('BirthDate', sql.Date, birthDate || null)
            .input('Phone', sql.VarChar, phone || null)
            .input('Email', sql.VarChar, email || null)
            .input('Address', sql.NVarChar, address || null)
            .query(`
                INSERT INTO Resident (UserID, FullName, Gender, BirthDate, Phone, Email, Address, Status)
                VALUES (@UserID, @FullName, @Gender, @BirthDate, @Phone, @Email, @Address, 1)
            `);

        // Create identity if provided
        if (identityNumber) {
            await pool.request()
                .input('ResidentID', sql.Int, userId)
                .input('IdentityNumber', sql.VarChar, identityNumber)
                .query(`
                    INSERT INTO ResidentIdentity (ResidentID, IdentityNumber)
                    VALUES (@ResidentID, @IdentityNumber)
                `);
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { userId, username }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// ==================== GET CURRENT USER ====================
exports.me = async (req, res) => {
    try {
        const pool = await getPool();
        
        const userResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT 
                    u.UserID,
                    u.Username,
                    u.Email,
                    u.Phone,
                    u.Status,
                    u.LastLogin,
                    u.CreatedAt,
                    STRING_AGG(r.RoleCode, ',') AS RoleCodes,
                    STRING_AGG(r.RoleName, ',') AS RoleNames
                FROM Users u
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                WHERE u.UserID = @UserID
                GROUP BY u.UserID, u.Username, u.Email, u.Phone, u.Status, u.LastLogin, u.CreatedAt
            `);

        const user = userResult.recordset[0];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const permResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT DISTINCT p.PermissionCode, p.PermissionName, m.ModuleCode
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
            `);

        // Lấy thông tin Resident
        let residentInfo = null;
        const residentResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT * FROM Resident WHERE UserID = @UserID');
        if (residentResult.recordset[0]) {
            residentInfo = residentResult.recordset[0];
        }

        // Lấy thông tin Employee
        let employeeInfo = null;
        const employeeResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT * FROM Employee WHERE UserID = @UserID');
        if (employeeResult.recordset[0]) {
            employeeInfo = employeeResult.recordset[0];
        }

        res.json({
            success: true,
            data: {
                id: user.UserID,
                username: user.Username,
                email: user.Email,
                phone: user.Phone,
                roles: user.RoleNames ? user.RoleNames.split(',') : [],
                roleCodes: user.RoleCodes ? user.RoleCodes.split(',') : [],
                permissions: permResult.recordset.map(p => p.PermissionCode),
                permissionsDetail: permResult.recordset,
                status: user.Status,
                resident: residentInfo,
                employee: employeeInfo
            }
        });

    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
};

// ==================== CHANGE PASSWORD ====================
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });
        }

        const pool = await getPool();
        
        const userResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');

        const user = userResult.recordset[0];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // 🔐 SỬA: So sánh password với bcrypt
        const isPasswordValid = await bcrypt.compare(oldPassword, user.PasswordHash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // 🔐 SỬA: Hash password mới
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('NewPassword', sql.VarChar, hashedPassword)
            .query(`UPDATE Users SET PasswordHash = @NewPassword WHERE UserID = @UserID`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const pool = await getPool();
        const userResult = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT UserID FROM Users WHERE Email = @Email');

        if (!userResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        // TODO: Implement email sending logic
        // Generate reset token, save to database, send email

        res.json({
            success: true,
            message: 'Password reset instructions sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request'
        });
    }
};

// ==================== UPDATE PROFILE (NEW) ====================
/**
 * Cập nhật hồ sơ người dùng
 * Hỗ trợ cập nhật cả User, Resident và Employee
 */
exports.updateProfile = async (req, res) => {
    try {
        const { 
            email, 
            phone, 
            fullName, 
            address, 
            birthDate, 
            gender,
            identityNumber // Thêm hỗ trợ cập nhật số CMND/CCCD
        } = req.body;
        const userId = req.userId;

        const pool = await getPool();

        // ===== 1. CẬP NHẬT BẢNG USERS =====
        const userUpdates = [];
        const userRequest = pool.request();
        userRequest.input('UserID', sql.Int, userId);

        if (email !== undefined && email !== null) {
            userUpdates.push('Email = @Email');
            userRequest.input('Email', sql.VarChar, email);
        }
        if (phone !== undefined && phone !== null) {
            userUpdates.push('Phone = @Phone');
            userRequest.input('Phone', sql.VarChar, phone);
        }

        if (userUpdates.length > 0) {
            await userRequest.query(`
                UPDATE Users 
                SET ${userUpdates.join(', ')}
                WHERE UserID = @UserID
            `);
        }

        // ===== 2. KIỂM TRA VÀ CẬP NHẬT EMPLOYEE HOẶC RESIDENT =====
        // Kiểm tra Employee
        const empResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT EmployeeID FROM Employee WHERE UserID = @UserID');

        let isEmployee = false;
        let isResident = false;

        if (empResult.recordset && empResult.recordset.length > 0) {
            isEmployee = true;
            // Cập nhật Employee
            const empUpdates = [];
            const empRequest = pool.request();
            const employeeId = empResult.recordset[0].EmployeeID;
            empRequest.input('EmployeeID', sql.Int, employeeId);

            if (fullName !== undefined && fullName !== null) {
                empUpdates.push('FullName = @FullName');
                empRequest.input('FullName', sql.NVarChar, fullName);
            }
            if (address !== undefined && address !== null) {
                empUpdates.push('Address = @Address');
                empRequest.input('Address', sql.NVarChar, address);
            }
            if (birthDate !== undefined && birthDate !== null) {
                empUpdates.push('BirthDate = @BirthDate');
                empRequest.input('BirthDate', sql.Date, birthDate);
            }
            if (gender !== undefined && gender !== null) {
                empUpdates.push('Gender = @Gender');
                empRequest.input('Gender', sql.Bit, gender);
            }
            if (phone !== undefined && phone !== null) {
                empUpdates.push('Phone = @Phone');
                empRequest.input('Phone', sql.VarChar, phone);
            }
            if (email !== undefined && email !== null) {
                empUpdates.push('Email = @Email');
                empRequest.input('Email', sql.VarChar, email);
            }

            if (empUpdates.length > 0) {
                await empRequest.query(`
                    UPDATE Employee 
                    SET ${empUpdates.join(', ')}
                    WHERE EmployeeID = @EmployeeID
                `);
            }
        } else {
            // Kiểm tra Resident
            const resResult = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT ResidentID FROM Resident WHERE UserID = @UserID');

            if (resResult.recordset && resResult.recordset.length > 0) {
                isResident = true;
                // Cập nhật Resident
                const resUpdates = [];
                const resRequest = pool.request();
                const residentId = resResult.recordset[0].ResidentID;
                resRequest.input('ResidentID', sql.Int, residentId);

                if (fullName !== undefined && fullName !== null) {
                    resUpdates.push('FullName = @FullName');
                    resRequest.input('FullName', sql.NVarChar, fullName);
                }
                if (address !== undefined && address !== null) {
                    resUpdates.push('Address = @Address');
                    resRequest.input('Address', sql.NVarChar, address);
                }
                if (birthDate !== undefined && birthDate !== null) {
                    resUpdates.push('BirthDate = @BirthDate');
                    resRequest.input('BirthDate', sql.Date, birthDate);
                }
                if (gender !== undefined && gender !== null) {
                    resUpdates.push('Gender = @Gender');
                    resRequest.input('Gender', sql.Bit, gender);
                }
                if (phone !== undefined && phone !== null) {
                    resUpdates.push('Phone = @Phone');
                    resRequest.input('Phone', sql.VarChar, phone);
                }
                if (email !== undefined && email !== null) {
                    resUpdates.push('Email = @Email');
                    resRequest.input('Email', sql.VarChar, email);
                }

                if (resUpdates.length > 0) {
                    await resRequest.query(`
                        UPDATE Resident 
                        SET ${resUpdates.join(', ')}
                        WHERE ResidentID = @ResidentID
                    `);
                }

                // ===== 3. CẬP NHẬT RESIDENT IDENTITY =====
                if (identityNumber !== undefined && identityNumber !== null) {
                    // Kiểm tra đã có identity chưa
                    const identityCheck = await pool.request()
                        .input('ResidentID', sql.Int, residentId)
                        .query('SELECT IdentityID FROM ResidentIdentity WHERE ResidentID = @ResidentID');

                    if (identityCheck.recordset && identityCheck.recordset.length > 0) {
                        // Update existing
                        await pool.request()
                            .input('ResidentID', sql.Int, residentId)
                            .input('IdentityNumber', sql.VarChar, identityNumber)
                            .query(`
                                UPDATE ResidentIdentity 
                                SET IdentityNumber = @IdentityNumber
                                WHERE ResidentID = @ResidentID
                            `);
                    } else {
                        // Insert new
                        await pool.request()
                            .input('ResidentID', sql.Int, residentId)
                            .input('IdentityNumber', sql.VarChar, identityNumber)
                            .query(`
                                INSERT INTO ResidentIdentity (ResidentID, IdentityNumber)
                                VALUES (@ResidentID, @IdentityNumber)
                            `);
                    }
                }
            }
        }

        // ===== 4. TRẢ VỀ THÔNG TIN ĐÃ CẬP NHẬT =====
        // Lấy lại thông tin user đã cập nhật
        const updatedUser = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT UserID, Username, Email, Phone, Status, LastLogin, CreatedAt
                FROM Users 
                WHERE UserID = @UserID
            `);

        let updatedResident = null;
        let updatedEmployee = null;

        if (isResident) {
            const res = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT * FROM Resident WHERE UserID = @UserID');
            if (res.recordset[0]) updatedResident = res.recordset[0];
        }

        if (isEmployee) {
            const emp = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT * FROM Employee WHERE UserID = @UserID');
            if (emp.recordset[0]) updatedEmployee = emp.recordset[0];
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: updatedUser.recordset[0] || null,
                resident: updatedResident,
                employee: updatedEmployee
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// ==================== GET PROFILE (NEW) ====================
/**
 * Lấy thông tin hồ sơ đầy đủ của người dùng
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const pool = await getPool();

        // Lấy thông tin user
        const userResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT UserID, Username, Email, Phone, Status, LastLogin, CreatedAt
                FROM Users 
                WHERE UserID = @UserID
            `);

        if (!userResult.recordset || userResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.recordset[0];

        // Lấy thông tin Resident
        let residentInfo = null;
        const residentResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT r.*, ri.IdentityNumber 
                FROM Resident r
                LEFT JOIN ResidentIdentity ri ON r.ResidentID = ri.ResidentID
                WHERE r.UserID = @UserID
            `);
        if (residentResult.recordset[0]) {
            residentInfo = residentResult.recordset[0];
        }

        // Lấy thông tin Employee
        let employeeInfo = null;
        const employeeResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT * FROM Employee WHERE UserID = @UserID');
        if (employeeResult.recordset[0]) {
            employeeInfo = employeeResult.recordset[0];
        }

        res.json({
            success: true,
            data: {
                user,
                resident: residentInfo,
                employee: employeeInfo
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error.message
        });
    }
};