// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middlewares/auth');
const { derivePermissions } = require('../utils/permissionUtils');

// ============================================
// 🔥 ĐĂNG NHẬP
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('📝 Login attempt:', { username });
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const pool = await getPool();
        
        const result = await pool.request()
            .input('Username', sql.VarChar, username)
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
                WHERE u.Username = @Username OR u.Email = @Username
                GROUP BY u.UserID, u.Username, u.PasswordHash, u.Email, u.Phone, u.Status, u.LastLogin, u.CreatedAt
            `);

        if (!result.recordset[0]) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.recordset[0];
        
        if (password !== user.PasswordHash) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        if (user.Status === 0) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled'
            });
        }

        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID');

        const JWT_SECRET = process.env.JWT_SECRET || "ApartmentManagementSecret123456789";
        const token = jwt.sign(
            { 
                userId: user.UserID,
                username: user.Username,
                roles: user.RoleCodes ? user.RoleCodes.split(',') : []
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const empResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`
                SELECT FullName, EmployeeID 
                FROM Employee 
                WHERE UserID = @UserID
            `);

        const employee = empResult.recordset[0] || null;

        const resResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`
                SELECT ResidentID, FullName 
                FROM Resident 
                WHERE UserID = @UserID
            `);

        const resident = resResult.recordset[0] || null;

        // ✅ SỬA: Thêm SortOrder vào SELECT
        const permResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`
                SELECT DISTINCT 
                    p.PermissionCode,
                    m.SortOrder
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
                ORDER BY m.SortOrder, p.PermissionCode
            `);

        const permissions = permResult.recordset ? permResult.recordset.map(row => row.PermissionCode) : [];
        const derivedPermissions = derivePermissions(permissions);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    userId: user.UserID,
                    username: user.Username,
                    email: user.Email,
                    phone: user.Phone,
                    status: user.Status,
                    lastLogin: user.LastLogin,
                    createdAt: user.CreatedAt,
                    roles: user.RoleNames ? user.RoleNames.split(',') : [],
                    roleCodes: user.RoleCodes ? user.RoleCodes.split(',') : [],
                    permissions: derivedPermissions,
                    employee: employee ? {
                        fullName: employee.FullName,
                        employeeId: employee.EmployeeID
                    } : null,
                    resident: resident ? {
                        fullName: resident.FullName,
                        residentId: resident.ResidentID
                    } : null
                }
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// ============================================
// LẤY THÔNG TIN USER HIỆN TẠI
// ============================================
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
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
                    STRING_AGG(r.RoleName, ',') AS RoleNames,
                    e.FullName AS EmployeeFullName,
                    e.EmployeeID,
                    e.Phone AS EmployeePhone,
                    e.Email AS EmployeeEmail,
                    e.Address AS EmployeeAddress,
                    e.BirthDate AS EmployeeBirthDate,
                    e.Gender AS EmployeeGender,
                    res.FullName AS ResidentFullName,
                    res.ResidentID,
                    res.Phone AS ResidentPhone,
                    res.Email AS ResidentEmail,
                    res.Address AS ResidentAddress,
                    res.BirthDate AS ResidentBirthDate,
                    res.Gender AS ResidentGender
                FROM Users u
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                LEFT JOIN Employee e ON u.UserID = e.UserID
                LEFT JOIN Resident res ON u.UserID = res.UserID
                WHERE u.UserID = @UserID
                GROUP BY u.UserID, u.Username, u.Email, u.Phone, u.Status, 
                         u.LastLogin, u.CreatedAt, e.FullName, e.EmployeeID,
                         e.Phone, e.Email, e.Address, e.BirthDate, e.Gender,
                         res.FullName, res.ResidentID, res.Phone, res.Email,
                         res.Address, res.BirthDate, res.Gender
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userData = result.recordset[0];

        // ✅ SỬA: Thêm SortOrder vào SELECT
        const permResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT DISTINCT 
                    p.PermissionCode,
                    m.SortOrder
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
                ORDER BY m.SortOrder, p.PermissionCode
            `);

        const permissions = permResult.recordset ? permResult.recordset.map(row => row.PermissionCode) : [];

        res.json({
            success: true,
            data: {
                id: userData.UserID,
                username: userData.Username,
                email: userData.Email,
                phone: userData.Phone,
                status: userData.Status,
                lastLogin: userData.LastLogin,
                createdAt: userData.CreatedAt,
                roles: userData.RoleNames ? userData.RoleNames.split(',') : [],
                roleCodes: userData.RoleCodes ? userData.RoleCodes.split(',') : [],
                permissions: permissions,
                employee: userData.EmployeeID ? {
                    employeeId: userData.EmployeeID,
                    fullName: userData.EmployeeFullName,
                    phone: userData.EmployeePhone,
                    email: userData.EmployeeEmail,
                    address: userData.EmployeeAddress,
                    birthDate: userData.EmployeeBirthDate,
                    gender: userData.EmployeeGender
                } : null,
                resident: userData.ResidentID ? {
                    residentId: userData.ResidentID,
                    fullName: userData.ResidentFullName,
                    phone: userData.ResidentPhone,
                    email: userData.ResidentEmail,
                    address: userData.ResidentAddress,
                    birthDate: userData.ResidentBirthDate,
                    gender: userData.ResidentGender
                } : null
            }
        });

    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info',
            error: error.message
        });
    }
});

// ============================================
// LẤY PERMISSIONS CỦA USER HIỆN TẠI ✅ SỬA
// ============================================
router.get('/permissions', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        
        // ✅ SỬA: Thêm SortOrder vào SELECT
        const result = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT DISTINCT 
                    p.PermissionCode, 
                    p.PermissionName, 
                    m.ModuleCode,
                    m.ModuleName,
                    m.SortOrder
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
                ORDER BY m.SortOrder, p.PermissionCode
            `);
        
        const permissions = result.recordset ? result.recordset.map(row => row.PermissionCode) : [];
        const derivedPermissions = derivePermissions(permissions);
        
        res.json({
            success: true,
            data: {
                permissions: derivedPermissions,
                permissionsDetail: result.recordset || [],
                count: derivedPermissions.length
            }
        });

    } catch (error) {
        console.error('❌ Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get permissions',
            error: error.message
        });
    }
});

// ============================================
// ĐỔI MẬT KHẨU
// ============================================
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const pool = await getPool();
        
        const result = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (oldPassword !== result.recordset[0].PasswordHash) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        await pool.request()
            .input('UserID', sql.Int, req.userId)
            .input('NewPassword', sql.VarChar, newPassword)
            .query('UPDATE Users SET PasswordHash = @NewPassword WHERE UserID = @UserID');

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
});

// ============================================
// CẬP NHẬT HỒ SƠ (PROFILE)
// ============================================
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, email, phone, address, birthDate, gender } = req.body;
        const userId = req.userId;

        const pool = await getPool();

        const userCheck = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT UserID FROM Users WHERE UserID = @UserID');

        if (!userCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userUpdates = [];
        const userRequest = pool.request();
        userRequest.input('UserID', sql.Int, userId);

        if (email !== undefined && email !== null) {
            if (email) {
                const emailCheck = await pool.request()
                    .input('Email', sql.VarChar, email)
                    .input('UserID', sql.Int, userId)
                    .query('SELECT UserID FROM Users WHERE Email = @Email AND UserID != @UserID');
                
                if (emailCheck.recordset[0]) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
            }
            userUpdates.push('Email = @Email');
            userRequest.input('Email', sql.VarChar, email || null);
        }

        if (phone !== undefined && phone !== null) {
            if (phone) {
                const phoneCheck = await pool.request()
                    .input('Phone', sql.VarChar, phone)
                    .input('UserID', sql.Int, userId)
                    .query('SELECT UserID FROM Users WHERE Phone = @Phone AND UserID != @UserID');
                
                if (phoneCheck.recordset[0]) {
                    return res.status(400).json({
                        success: false,
                        message: 'Phone number already exists'
                    });
                }
            }
            userUpdates.push('Phone = @Phone');
            userRequest.input('Phone', sql.VarChar, phone || null);
        }

        if (userUpdates.length > 0) {
            await userRequest.query(`
                UPDATE Users 
                SET ${userUpdates.join(', ')}
                WHERE UserID = @UserID
            `);
        }

        const empResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT EmployeeID FROM Employee WHERE UserID = @UserID');

        if (empResult.recordset[0]) {
            const empUpdates = [];
            const empRequest = pool.request();
            empRequest.input('EmployeeID', sql.Int, empResult.recordset[0].EmployeeID);

            if (fullName !== undefined) {
                empUpdates.push('FullName = @FullName');
                empRequest.input('FullName', sql.NVarChar, fullName);
            }
            if (address !== undefined) {
                empUpdates.push('Address = @Address');
                empRequest.input('Address', sql.NVarChar, address);
            }
            if (birthDate !== undefined) {
                empUpdates.push('BirthDate = @BirthDate');
                empRequest.input('BirthDate', sql.Date, birthDate || null);
            }
            if (gender !== undefined) {
                empUpdates.push('Gender = @Gender');
                empRequest.input('Gender', sql.Bit, gender);
            }
            if (email !== undefined) {
                empUpdates.push('Email = @Email');
                empRequest.input('Email', sql.VarChar, email || null);
            }
            if (phone !== undefined) {
                empUpdates.push('Phone = @Phone');
                empRequest.input('Phone', sql.VarChar, phone || null);
            }

            if (empUpdates.length > 0) {
                await empRequest.query(`
                    UPDATE Employee 
                    SET ${empUpdates.join(', ')}
                    WHERE EmployeeID = @EmployeeID
                `);
            }
        }

        const resResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT ResidentID FROM Resident WHERE UserID = @UserID');

        if (resResult.recordset[0]) {
            const resUpdates = [];
            const resRequest = pool.request();
            resRequest.input('ResidentID', sql.Int, resResult.recordset[0].ResidentID);

            if (fullName !== undefined) {
                resUpdates.push('FullName = @FullName');
                resRequest.input('FullName', sql.NVarChar, fullName);
            }
            if (address !== undefined) {
                resUpdates.push('Address = @Address');
                resRequest.input('Address', sql.NVarChar, address);
            }
            if (birthDate !== undefined) {
                resUpdates.push('BirthDate = @BirthDate');
                resRequest.input('BirthDate', sql.Date, birthDate || null);
            }
            if (gender !== undefined) {
                resUpdates.push('Gender = @Gender');
                resRequest.input('Gender', sql.Bit, gender);
            }
            if (email !== undefined) {
                resUpdates.push('Email = @Email');
                resRequest.input('Email', sql.VarChar, email || null);
            }
            if (phone !== undefined) {
                resUpdates.push('Phone = @Phone');
                resRequest.input('Phone', sql.VarChar, phone || null);
            }

            if (resUpdates.length > 0) {
                await resRequest.query(`
                    UPDATE Resident 
                    SET ${resUpdates.join(', ')}
                    WHERE ResidentID = @ResidentID
                `);
            }
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

module.exports = router;