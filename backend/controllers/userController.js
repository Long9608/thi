const { getPool, sql } = require('../config/db');
const bcrypt = require('bcrypt');

// ============================================
// QUẢN LÝ NHÂN VIÊN
// ============================================

// Lấy danh sách nhân viên
exports.getEmployees = async (req, res) => {
    try {
        const { 
            search,
            status,
            roleId,
            page = 1,

            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                e.EmployeeID,
                e.UserID,
                e.FullName,
                e.Gender,
                e.BirthDate,
                e.Phone,
                e.Email,
                e.Address,
                e.CCCD,
                e.HireDate,
                e.Status,
                u.Username,
                u.Status AS UserStatus,
                STRING_AGG(r.RoleName, ', ') AS RoleNames,
                STRING_AGG(r.RoleCode, ', ') AS RoleCodes
            FROM Employee e
            LEFT JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN UserRole ur ON u.UserID = ur.UserID
            LEFT JOIN Role r ON ur.RoleID = r.RoleID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Employee e
            LEFT JOIN Users u ON e.UserID = u.UserID
            WHERE 1=1
        `;

        if (search) {
            query += ` AND (e.FullName LIKE @Search OR e.Phone LIKE @Search OR e.Email LIKE @Search OR u.Username LIKE @Search)`;
            countQuery += ` AND (e.FullName LIKE @Search OR e.Phone LIKE @Search OR e.Email LIKE @Search OR u.Username LIKE @Search)`;
            request.input('Search', sql.NVarChar, `%${search}%`);
        }

        if (status !== undefined) {
            query += ` AND e.Status = @Status`;
            countQuery += ` AND e.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        if (roleId) {
            query += ` AND r.RoleID = @RoleID`;
            countQuery += ` AND r.RoleID = @RoleID`;
            request.input('RoleID', sql.Int, parseInt(roleId));
        }

        query += ` GROUP BY e.EmployeeID, e.UserID, e.FullName, e.Gender, e.BirthDate, e.Phone, e.Email, e.Address, e.CCCD, e.HireDate, e.Status, u.Username, u.Status`;

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY e.EmployeeID DESC
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
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees',
            error: error.message
        });
    }
};

// Lấy chi tiết nhân viên
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('EmployeeID', sql.Int, id)
            .query(`
                SELECT 
                    e.*,
                    u.Username,
                    u.Email AS UserEmail,
                    u.Phone AS UserPhone,
                    u.Status AS UserStatus,
                    u.LastLogin,
                    u.CreatedAt,
                    STRING_AGG(r.RoleID, ',') AS RoleIDs,
                    STRING_AGG(r.RoleName, ',') AS RoleNames,
                    STRING_AGG(r.RoleCode, ',') AS RoleCodes
                FROM Employee e
                LEFT JOIN Users u ON e.UserID = u.UserID
                LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                LEFT JOIN Role r ON ur.RoleID = r.RoleID
                WHERE e.EmployeeID = @EmployeeID
                GROUP BY e.EmployeeID, e.UserID, e.FullName, e.Gender, e.BirthDate, e.Phone, e.Email, 
                         e.Address, e.CCCD, e.HireDate, e.Status, u.Username, u.Email, u.Phone, 
                         u.Status, u.LastLogin, u.CreatedAt
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const employee = result.recordset[0];
        
        // Lấy danh sách permissions của employee
        if (employee.UserID) {
            const permResult = await pool.request()
                .input('UserID', sql.Int, employee.UserID)
                .query(`
                    SELECT DISTINCT p.PermissionCode, p.PermissionName, m.ModuleName
                    FROM Users u
                    JOIN UserRole ur ON u.UserID = ur.UserID
                    JOIN RolePermission rp ON ur.RoleID = rp.RoleID
                    JOIN Permission p ON rp.PermissionID = p.PermissionID
                    JOIN Module m ON p.ModuleID = m.ModuleID
                    WHERE u.UserID = @UserID AND rp.IsGranted = 1
                    ORDER BY m.SortOrder
                `);
            employee.Permissions = permResult.recordset;
        }

        res.json({
            success: true,
            data: employee
        });

    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee',
            error: error.message
        });
    }
};

// Tạo nhân viên mới
exports.createEmployee = async (req, res) => {
    try {
        const { 
            username,
            password,
            email,
            phone,
            fullName,
            gender,
            birthDate,
            address,
            cccd,
            hireDate,
            roleIds
        } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'Username, password and full name are required'
            });
        }

        const pool = await getPool();

        // Check username exists
        const checkUser = await pool.request()
            .input('Username', sql.VarChar, username)
            .query('SELECT UserID FROM Users WHERE Username = @Username');

        if (checkUser.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Check email exists
        if (email) {
            const checkEmail = await pool.request()
                .input('Email', sql.VarChar, email)
                .query('SELECT UserID FROM Users WHERE Email = @Email');
            
            if (checkEmail.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Tạo user
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

        // Gán roles
        if (roleIds && roleIds.length > 0) {
            for (const roleId of roleIds) {
                await pool.request()
                    .input('UserID', sql.Int, userId)
                    .input('RoleID', sql.Int, roleId)
                    .input('AssignedBy', sql.Int, req.userId)
                    .query(`
                        INSERT INTO UserRole (UserID, RoleID, AssignedDate, AssignedBy)
                        VALUES (@UserID, @RoleID, GETDATE(), @AssignedBy)
                    `);
            }
        }

        // Tạo employee
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .input('FullName', sql.NVarChar, fullName)
            .input('Gender', sql.Bit, gender !== undefined ? gender : null)
            .input('BirthDate', sql.Date, birthDate || null)
            .input('Phone', sql.VarChar, phone || null)
            .input('Email', sql.VarChar, email || null)
            .input('Address', sql.NVarChar, address || null)
            .input('CCCD', sql.VarChar, cccd || null)
            .input('HireDate', sql.Date, hireDate || new Date())
            .query(`
                INSERT INTO Employee (
                    UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status
                )
                OUTPUT INSERTED.EmployeeID
                VALUES (
                    @UserID, @FullName, @Gender, @BirthDate, @Phone, @Email, @Address, @CCCD, @HireDate, 1
                )
            `);

        const employeeId = result.recordset[0].EmployeeID;

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: { employeeId, userId }
        });

    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    }
};

// Cập nhật nhân viên
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            fullName,
            gender,
            birthDate,
            phone,
            email,
            address,
            cccd,
            status,
            roleIds
        } = req.body;

        const pool = await getPool();

        // Check employee exists
        const checkResult = await pool.request()
            .input('EmployeeID', sql.Int, id)
            .query('SELECT UserID FROM Employee WHERE EmployeeID = @EmployeeID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const userId = checkResult.recordset[0].UserID;

        // Update employee
        const updates = [];
        const request = pool.request();
        request.input('EmployeeID', sql.Int, id);

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

        if (cccd) {
            updates.push('CCCD = @CCCD');
            request.input('CCCD', sql.VarChar, cccd);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Employee 
                SET ${updates.join(', ')}
                WHERE EmployeeID = @EmployeeID
            `);
        }

        // Update roles
        if (roleIds && userId) {
            // Xóa roles cũ
            await pool.request()
                .input('UserID', sql.Int, userId)
                .query('DELETE FROM UserRole WHERE UserID = @UserID');

            // Thêm roles mới
            for (const roleId of roleIds) {
                await pool.request()
                    .input('UserID', sql.Int, userId)
                    .input('RoleID', sql.Int, roleId)
                    .input('AssignedBy', sql.Int, req.userId)
                    .query(`
                        INSERT INTO UserRole (UserID, RoleID, AssignedDate, AssignedBy)
                        VALUES (@UserID, @RoleID, GETDATE(), @AssignedBy)
                    `);
            }
        }

        res.json({
            success: true,
            message: 'Employee updated successfully'
        });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee',
            error: error.message
        });
    }
};

// Xóa nhân viên
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkResult = await pool.request()
            .input('EmployeeID', sql.Int, id)
            .query('SELECT UserID FROM Employee WHERE EmployeeID = @EmployeeID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const userId = checkResult.recordset[0].UserID;

        // Soft delete employee
        await pool.request()
            .input('EmployeeID', sql.Int, id)
            .query('UPDATE Employee SET Status = 0 WHERE EmployeeID = @EmployeeID');

        // Soft delete user
        if (userId) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .query('UPDATE Users SET Status = 0 WHERE UserID = @UserID');
        }

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ VAI TRÒ (ROLE)
// ============================================

// Lấy danh sách roles
exports.getRoles = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                r.RoleID,
                r.RoleCode,
                r.RoleName,
                r.Description,
                r.Status,
                r.CreatedAt,
                COUNT(DISTINCT ur.UserID) AS UserCount,
                COUNT(DISTINCT rp.PermissionID) AS PermissionCount
            FROM Role r
            LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
            LEFT JOIN RolePermission rp ON r.RoleID = rp.RoleID
            GROUP BY r.RoleID, r.RoleCode, r.RoleName, r.Description, r.Status, r.CreatedAt
            ORDER BY r.RoleName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles',
            error: error.message
        });
    }
};

// Lấy chi tiết role
exports.getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('RoleID', sql.Int, id)
            .query(`
                SELECT 
                    r.*,
                    COUNT(DISTINCT ur.UserID) AS UserCount
                FROM Role r
                LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
                WHERE r.RoleID = @RoleID
                GROUP BY r.RoleID, r.RoleCode, r.RoleName, r.Description, r.Status, r.CreatedAt
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Lấy permissions của role
        const permResult = await pool.request()
            .input('RoleID', sql.Int, id)
            .query(`
                SELECT 
                    p.PermissionID,
                    p.PermissionCode,
                    p.PermissionName,
                    p.Description,
                    m.ModuleName,
                    m.ModuleCode,
                    rp.IsGranted
                FROM RolePermission rp
                JOIN Permission p ON rp.PermissionID = p.PermissionID
                JOIN Module m ON p.ModuleID = m.ModuleID
                WHERE rp.RoleID = @RoleID
                ORDER BY m.SortOrder, p.PermissionCode
            `);

        const role = result.recordset[0];
        role.Permissions = permResult.recordset;

        res.json({
            success: true,
            data: role
        });

    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role',
            error: error.message
        });
    }
};

// Tạo role mới
exports.createRole = async (req, res) => {
    try {
        const { roleCode, roleName, description, permissionIds } = req.body;

        if (!roleCode || !roleName) {
            return res.status(400).json({
                success: false,
                message: 'Role code and name are required'
            });
        }

        const pool = await getPool();

        // Check role exists
        const checkResult = await pool.request()
            .input('RoleCode', sql.VarChar, roleCode)
            .query('SELECT RoleID FROM Role WHERE RoleCode = @RoleCode');

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Role code already exists'
            });
        }

        // Create role
        const result = await pool.request()
            .input('RoleCode', sql.VarChar, roleCode)
            .input('RoleName', sql.NVarChar, roleName)
            .input('Description', sql.NVarChar, description || null)
            .query(`
                INSERT INTO Role (RoleCode, RoleName, Description, Status, CreatedAt)
                OUTPUT INSERTED.RoleID
                VALUES (@RoleCode, @RoleName, @Description, 1, GETDATE())
            `);

        const roleId = result.recordset[0].RoleID;

        // Gán permissions
        if (permissionIds && permissionIds.length > 0) {
            for (const permissionId of permissionIds) {
                await pool.request()
                    .input('RoleID', sql.Int, roleId)
                    .input('PermissionID', sql.Int, permissionId)
                    .query(`
                        INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
                        VALUES (@RoleID, @PermissionID, 1, GETDATE())
                    `);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: { roleId }
        });

    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create role',
            error: error.message
        });
    }
};

// Cập nhật role
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleName, description, status, permissionIds } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('RoleID', sql.Int, id);

        if (roleName) {
            updates.push('RoleName = @RoleName');
            request.input('RoleName', sql.NVarChar, roleName);
        }

        if (description !== undefined) {
            updates.push('Description = @Description');
            request.input('Description', sql.NVarChar, description);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (updates.length > 0) {
            const result = await request.query(`
                UPDATE Role 
                SET ${updates.join(', ')}
                WHERE RoleID = @RoleID
            `);

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
        }

        // Update permissions
        if (permissionIds) {
            // Xóa permissions cũ
            await pool.request()
                .input('RoleID', sql.Int, id)
                .query('DELETE FROM RolePermission WHERE RoleID = @RoleID');

            // Thêm permissions mới
            for (const permissionId of permissionIds) {
                await pool.request()
                    .input('RoleID', sql.Int, id)
                    .input('PermissionID', sql.Int, permissionId)
                    .query(`
                        INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
                        VALUES (@RoleID, @PermissionID, 1, GETDATE())
                    `);
            }
        }

        res.json({
            success: true,
            message: 'Role updated successfully'
        });

    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role',
            error: error.message
        });
    }
};

// Xóa role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if role has users
        const userCheck = await pool.request()
            .input('RoleID', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM UserRole WHERE RoleID = @RoleID');

        if (userCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role with assigned users'
            });
        }

        const result = await pool.request()
            .input('RoleID', sql.Int, id)
            .query('DELETE FROM Role WHERE RoleID = @RoleID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.json({
            success: true,
            message: 'Role deleted successfully'
        });

    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete role',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ PERMISSION
// ============================================

// Lấy danh sách permissions
exports.getPermissions = async (req, res) => {
    try {
        const { moduleId } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                p.PermissionID,
                p.PermissionCode,
                p.PermissionName,
                p.Description,
                m.ModuleID,
                m.ModuleName,
                m.ModuleCode,
                m.SortOrder
            FROM Permission p
            JOIN Module m ON p.ModuleID = m.ModuleID
            WHERE 1=1
        `;

        if (moduleId) {
            query += ` AND p.ModuleID = @ModuleID`;
        }

        query += ` ORDER BY m.SortOrder, p.PermissionCode`;

        const request = pool.request();
        if (moduleId) {
            request.input('ModuleID', sql.Int, parseInt(moduleId));
        }

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions',
            error: error.message
        });
    }
};

// Lấy danh sách modules
exports.getModules = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                m.ModuleID,
                m.ModuleCode,
                m.ModuleName,
                m.Icon,
                m.SortOrder,
                m.Status,
                COUNT(p.PermissionID) AS PermissionCount
            FROM Module m
            LEFT JOIN Permission p ON m.ModuleID = p.ModuleID
            GROUP BY m.ModuleID, m.ModuleCode, m.ModuleName, m.Icon, m.SortOrder, m.Status
            ORDER BY m.SortOrder
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch modules',
            error: error.message
        });
    }
};

// Cập nhật permission cho role
exports.updateRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body;

        if (!permissionIds) {
            return res.status(400).json({
                success: false,
                message: 'Permission IDs are required'
            });
        }

        const pool = await getPool();

        // Check role exists
        const roleCheck = await pool.request()
            .input('RoleID', sql.Int, roleId)
            .query('SELECT RoleID FROM Role WHERE RoleID = @RoleID');

        if (!roleCheck.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Xóa permissions cũ
        await pool.request()
            .input('RoleID', sql.Int, roleId)
            .query('DELETE FROM RolePermission WHERE RoleID = @RoleID');

        // Thêm permissions mới
        for (const permissionId of permissionIds) {
            await pool.request()
                .input('RoleID', sql.Int, roleId)
                .input('PermissionID', sql.Int, permissionId)
                .query(`
                    INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
                    VALUES (@RoleID, @PermissionID, 1, GETDATE())
                `);
        }

        res.json({
            success: true,
            message: 'Permissions updated successfully'
        });

    } catch (error) {
        console.error('Update role permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update permissions',
            error: error.message
        });
    }
};

// ============================================
// NHẬT KÝ HỆ THỐNG (AUDIT LOG)
// ============================================

// Lấy nhật ký hệ thống
exports.getAuditLogs = async (req, res) => {
    try {
        const { 
            tableName,
            action,
            userId,
            fromDate,
            toDate,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                al.LogID,
                al.Action,
                al.TableName,
                al.RecordID,
                al.OldValue,
                al.NewValue,
                al.Timestamp,
                al.IPAddress,
                u.Username
            FROM AuditLog al
            LEFT JOIN Users u ON al.UserID = u.UserID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM AuditLog al
            WHERE 1=1
        `;

        if (tableName) {
            query += ` AND al.TableName = @TableName`;
            countQuery += ` AND al.TableName = @TableName`;
            request.input('TableName', sql.VarChar, tableName);
        }

        if (action) {
            query += ` AND al.Action = @Action`;
            countQuery += ` AND al.Action = @Action`;
            request.input('Action', sql.VarChar, action);
        }

        if (userId) {
            query += ` AND al.UserID = @UserID`;
            countQuery += ` AND al.UserID = @UserID`;
            request.input('UserID', sql.Int, parseInt(userId));
        }

        if (fromDate) {
            query += ` AND al.Timestamp >= @FromDate`;
            countQuery += ` AND al.Timestamp >= @FromDate`;
            request.input('FromDate', sql.DateTime, fromDate);
        }

        if (toDate) {
            query += ` AND al.Timestamp <= @ToDate`;
            countQuery += ` AND al.Timestamp <= @ToDate`;
            request.input('ToDate', sql.DateTime, toDate);
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY al.Timestamp DESC
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
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};
// backend/controllers/userController.js
// Lấy quyền của vai trò
exports.getRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('RoleID', sql.Int, roleId)
            .query(`
                SELECT PermissionID as id
                FROM RolePermission
                WHERE RoleID = @RoleID AND IsGranted = 1
            `);
        
        const permissionIds = result.recordset.map(row => row.id);
        
        res.json({
            success: true,
            data: permissionIds
        });
    } catch (error) {
        console.error('Get role permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role permissions',
            error: error.message
        });
    }
};