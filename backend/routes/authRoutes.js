// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middlewares/auth');

// ============================================
// 🔥 ĐĂNG NHẬP - THÊM ROUTE NÀY
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
        
        // Tìm user theo username hoặc email
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
                    STRING_AGG(r.RoleCode, ',') AS RoleCodes,
                    STRING_AGG(r.RoleName, ',') AS RoleNames
                FROM Users u
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                WHERE u.Username = @Username OR u.Email = @Username
                GROUP BY u.UserID, u.Username, u.PasswordHash, u.Email, u.Phone, u.Status
            `);

        if (!result.recordset[0]) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.recordset[0];
        
        // So sánh password (tạm thời so sánh trực tiếp)
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

        // Cập nhật LastLogin
        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID');

        // Tạo JWT token
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

        // Lấy thông tin employee nếu có
        const empResult = await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .query(`
                SELECT FullName, EmployeeID 
                FROM Employee 
                WHERE UserID = @UserID
            `);

        const employee = empResult.recordset[0] || null;

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
                    role: user.RoleNames ? user.RoleNames.split(',')[0] : 'User',
                    roles: user.RoleCodes ? user.RoleCodes.split(',') : [],
                    employee: employee ? {
                        fullName: employee.FullName,
                        employeeId: employee.EmployeeID
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
                    e.FullName,
                    e.EmployeeID
                FROM Users u
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                LEFT JOIN Employee e ON u.UserID = e.UserID
                WHERE u.UserID = @UserID
                GROUP BY u.UserID, u.Username, u.Email, u.Phone, u.Status, 
                         u.LastLogin, u.CreatedAt, e.FullName, e.EmployeeID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
});

// ============================================
// LẤY PERMISSIONS CỦA USER HIỆN TẠI
// ============================================
router.get('/permissions', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT DISTINCT p.PermissionCode
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
            `);
        
        const permissions = result.recordset.map(row => row.PermissionCode);
        
        res.json({
            success: true,
            data: {
                permissions,
                count: permissions.length
            }
        });

    } catch (error) {
        console.error('❌ Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get permissions'
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

        const pool = await getPool();
        
        // Kiểm tra mật khẩu cũ
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
                message: 'Old password is incorrect'
            });
        }

        // Cập nhật mật khẩu mới
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
            message: 'Failed to change password'
        });
    }
});

module.exports = router;