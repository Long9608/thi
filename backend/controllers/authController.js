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
        
        // SỬA: Lấy user với Role từ bảng UserRole và Role
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

        // So sánh password
        const isPasswordValid = (password === user.PasswordHash);
        
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

        // 🔥 SỬA: Bỏ ORDER BY trong query này
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

        // Tạo user không có RoleID
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

        // 🔥 SỬA: Bỏ ORDER BY trong query này
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
                status: user.Status
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
        
        if (oldPassword !== user.PasswordHash) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('NewPassword', sql.VarChar, newPassword)
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