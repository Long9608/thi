// backend/middlewares/auth.js
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { derivePermissions } = require('../utils/permissionUtils');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET || "ApartmentManagementSecret123456789";
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const pool = await getPool();
        
        const result = await pool.request()
            .input('UserID', sql.Int, decoded.userId)
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
                WHERE u.UserID = @UserID AND u.Status = 1
                GROUP BY u.UserID, u.Username, u.PasswordHash, u.Email, u.Phone, 
                         u.Status, u.LastLogin, u.CreatedAt
            `);

        if (!result.recordset[0]) {
            throw new Error('User not found or inactive');
        }

        const user = result.recordset[0];
        
        // ✅ SỬA: Thêm SortOrder vào SELECT
        const permResult = await pool.request()
            .input('UserID', sql.Int, decoded.userId)
            .query(`
                SELECT DISTINCT 
                    p.PermissionCode, 
                    m.ModuleCode,
                    m.SortOrder
                FROM Users u
                JOIN UserRole ur ON u.UserID = ur.UserID
                JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE u.UserID = @UserID AND rp.IsGranted = 1
                ORDER BY m.SortOrder, p.PermissionCode
            `);

        const rawPermissions = permResult.recordset ? permResult.recordset.map(p => p.PermissionCode) : [];
        const permissions = derivePermissions(rawPermissions);
        const moduleCodes = [...new Set(permResult.recordset ? permResult.recordset.map(p => p.ModuleCode) : [])];

        req.user = {
            UserID: user.UserID,
            Username: user.Username,
            Email: user.Email,
            Phone: user.Phone,
            Status: user.Status,
            RoleCodes: user.RoleCodes ? user.RoleCodes.split(',') : [],
            RoleNames: user.RoleNames ? user.RoleNames.split(',') : [],
            Permissions: permissions,
            ModuleCodes: moduleCodes
        };
        req.userId = decoded.userId;
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }
        
        const userRoles = req.user.RoleNames || [];
        const hasRole = userRoles.some(role => allowedRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false, 
                message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}` 
            });
        }
        
        next();
    };
};

const checkPermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Not authenticated' 
                });
            }

            const permissions = req.user.Permissions || [];
            
            if (!permissions.includes(permissionCode)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Missing required permission: ${permissionCode}` 
                });
            }
            
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Permission check failed' 
            });
        }
    };
};

const checkAnyPermission = (...permissionCodes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const permissions = req.user.Permissions || [];
        const hasAny = permissionCodes.some(code => permissions.includes(code));

        if (!hasAny) {
            return res.status(403).json({ 
                success: false, 
                message: `Missing required permission: ${permissionCodes.join(' or ')}` 
            });
        }

        next();
    };
};

module.exports = { authMiddleware, checkRole, checkPermission, checkAnyPermission };