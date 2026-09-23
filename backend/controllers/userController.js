// backend/controllers/userController.js
const { getPool, sql } = require('../config/db');

const {
    hashPassword
} = require('../utils/passwordUtils');

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
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const safeLimit = parseInt(limit) || 20;

        let query = `
            SELECT
                e.EmployeeID,
                r.ResidentID,
                u.UserID,
                COALESCE(r.FullName, e.FullName) AS FullName,
                COALESCE(r.Gender, e.Gender) AS Gender,
                COALESCE(r.BirthDate, e.BirthDate) AS BirthDate,
                COALESCE(r.Phone, e.Phone) AS Phone,
                COALESCE(r.Email, e.Email) AS Email,
                COALESCE(r.Address, e.Address) AS Address,
                COALESCE(ri.IdentityNumber, e.CCCD) AS CCCD,
                e.HireDate,
                u.Status AS Status,
                u.Username,
                u.Status AS UserStatus,
                STRING_AGG(role.RoleName, ', ') AS RoleNames,
                STRING_AGG(role.RoleCode, ', ') AS RoleCodes,
                STRING_AGG(CONVERT(varchar(max), role.RoleID), ',') AS RoleIDs
            FROM Users u
            LEFT JOIN Employee e ON e.UserID = u.UserID
            LEFT JOIN Resident r ON r.UserID = u.UserID
            LEFT JOIN ResidentIdentity ri ON ri.ResidentID = r.ResidentID
            LEFT JOIN UserRole ur ON u.UserID = ur.UserID
            LEFT JOIN Role role ON ur.RoleID = role.RoleID
            WHERE (e.EmployeeID IS NOT NULL OR r.ResidentID IS NOT NULL)
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(DISTINCT u.UserID) as total
            FROM Users u
            LEFT JOIN Employee e ON e.UserID = u.UserID
            LEFT JOIN Resident r ON r.UserID = u.UserID
            LEFT JOIN UserRole ur ON u.UserID = ur.UserID
            LEFT JOIN Role role ON ur.RoleID = role.RoleID
            WHERE (e.EmployeeID IS NOT NULL OR r.ResidentID IS NOT NULL)
        `;

        if (search) {
            const searchPattern = `%${search}%`;
            query += ` AND (COALESCE(e.FullName, r.FullName) LIKE @Search OR COALESCE(e.Phone, r.Phone) LIKE @Search OR COALESCE(e.Email, r.Email) LIKE @Search OR u.Username LIKE @Search)`;
            countQuery += ` AND (COALESCE(e.FullName, r.FullName) LIKE @Search OR COALESCE(e.Phone, r.Phone) LIKE @Search OR COALESCE(e.Email, r.Email) LIKE @Search OR u.Username LIKE @Search)`;
            request.input('Search', sql.NVarChar, searchPattern);
        }

        if (status !== undefined && status !== '') {
            query += ` AND CASE WHEN e.EmployeeID IS NULL THEN u.Status ELSE e.Status END = @Status`;
            countQuery += ` AND CASE WHEN e.EmployeeID IS NULL THEN u.Status ELSE e.Status END = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        if (roleId) {
            query += ` AND EXISTS (SELECT 1 FROM UserRole filterRole WHERE filterRole.UserID=u.UserID AND filterRole.RoleID=@RoleID)`;
            countQuery += ` AND EXISTS (SELECT 1 FROM UserRole filterRole WHERE filterRole.UserID=u.UserID AND filterRole.RoleID=@RoleID)`;
            request.input('RoleID', sql.Int, parseInt(roleId));
        }

        query += ` GROUP BY e.EmployeeID, r.ResidentID, u.UserID, e.FullName, r.FullName, e.Gender, r.Gender, e.BirthDate, r.BirthDate, e.Phone, r.Phone, e.Email, r.Email, e.Address, r.Address, e.CCCD, ri.IdentityNumber, e.HireDate, e.Status, u.Username, u.Status`;

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;

        query += `
            ORDER BY u.UserID DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset || [],
            pagination: {
                total,
                page: parseInt(page),
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
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
        
        if (employee.UserID) {
            const permResult = await pool.request()
                .input('UserID', sql.Int, employee.UserID)
                .query(`
                    SELECT DISTINCT p.PermissionCode, p.PermissionName, m.ModuleName, m.SortOrder
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
            roleIds,
            residentId
        } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'Username, password and full name are required'
            });
        }

        if (req.body.roleIds !== undefined && !(req.user.Permissions || []).includes('ROLE_MANAGE')) {
            return res.status(403).json({ success: false, message: 'Cần quyền ROLE_MANAGE để gán vai trò' });
        }
        if (req.body.password && (typeof req.body.password !== 'string' || req.body.password.length < 6)) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        if (req.body.roleIds !== undefined && (!Array.isArray(req.body.roleIds) || req.body.roleIds.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0))) {
            return res.status(400).json({ success: false, message: 'Danh sách vai trò không hợp lệ' });
        }
        const pool = await getPool();
        const normalizedRoleIds = Array.isArray(roleIds)
            ? [...new Set(roleIds.map(Number).filter(Number.isInteger))]
            : [];
        const normalizedResidentId = residentId ? Number(residentId) : null;

        // Tài khoản cư dân phải liên kết với hồ sơ Resident có sẵn, không tạo
        // thêm Employee. Nếu không liên kết, các màn lọc/gửi thông báo không
        // thể nhận ra cư dân đã có tài khoản.
        const residentRoleResult = await pool.request()
            .query("SELECT RoleID FROM Role WHERE RoleCode = 'RESIDENT' AND Status = 1");
        const residentRoleId = residentRoleResult.recordset[0]?.RoleID;
        const isResidentAccount = residentRoleId != null
            && normalizedRoleIds.includes(Number(residentRoleId));

        if (isResidentAccount && normalizedRoleIds.length !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản cư dân chỉ được gán vai trò Cư dân'
            });
        }

        if (isResidentAccount && (!Number.isInteger(normalizedResidentId) || normalizedResidentId <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn cư dân chưa có tài khoản'
            });
        }

        if (!isResidentAccount && normalizedResidentId) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ tài khoản có vai trò Cư dân mới được liên kết với cư dân'
            });
        }

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

        // Check phone exists
        if (phone) {
            const checkPhone = await pool.request()
                .input('Phone', sql.VarChar, phone)
                .query('SELECT UserID FROM Users WHERE Phone = @Phone');
            
            if (checkPhone.recordset[0]) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number already exists'
                });
            }
        }

        if (isResidentAccount) {
            const residentResult = await pool.request()
                .input('ResidentID', sql.Int, normalizedResidentId)
                .query('SELECT ResidentID, UserID FROM Resident WHERE ResidentID = @ResidentID AND Status = 1');

            if (!residentResult.recordset[0]) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy cư dân đang hoạt động' });
            }

            if (residentResult.recordset[0].UserID) {
                return res.status(400).json({ success: false, message: 'Cư dân này đã có tài khoản' });
            }
        }

        const hashedPassword = await hashPassword(password);
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();
            const transactionRequest = () => new sql.Request(transaction);

            // Tạo user
            const userResult = await transactionRequest()
            .input('Username', sql.VarChar, username)
            .input(
                'PasswordHash',
                sql.VarChar(255),
                hashedPassword
            )
            .input('Email', sql.VarChar, email || null)
            .input('Phone', sql.VarChar, phone || null)
            .query(`
                INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
                OUTPUT INSERTED.UserID
                VALUES (@Username, @PasswordHash, @Email, @Phone, 1, GETDATE())
            `);

            const userId = userResult.recordset[0].UserID;

            // Gán roles
            for (const roleId of normalizedRoleIds) {
                await transactionRequest()
                    .input('UserID', sql.Int, userId)
                    .input('RoleID', sql.Int, roleId)
                    .input('AssignedBy', sql.Int, req.userId || null)
                    .query(`
                        INSERT INTO UserRole (UserID, RoleID, AssignedDate, AssignedBy)
                        VALUES (@UserID, @RoleID, GETDATE(), @AssignedBy)
                    `);
            }

            let employeeId = null;
            if (isResidentAccount) {
                // Điều kiện UserID IS NULL cũng bảo vệ trường hợp hai yêu cầu tạo
                // tài khoản cùng chọn một cư dân tại gần như cùng thời điểm.
                const linkResult = await transactionRequest()
                    .input('ResidentID', sql.Int, normalizedResidentId)
                    .input('UserID', sql.Int, userId)
                    .query(`
                        UPDATE Resident
                        SET UserID = @UserID
                        WHERE ResidentID = @ResidentID AND UserID IS NULL
                    `);

                if (linkResult.rowsAffected[0] !== 1) {
                    throw new Error('Cư dân này đã có tài khoản');
                }
            } else {
                // Chỉ tài khoản nhân viên mới có bản ghi Employee.
                const result = await transactionRequest()
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
                employeeId = result.recordset[0].EmployeeID;
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                message: isResidentAccount ? 'Resident account created successfully' : 'Employee created successfully',
                data: { employeeId, userId, residentId: isResidentAccount ? normalizedResidentId : null }
            });
        } catch (error) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                // Giao dịch có thể đã bị SQL Server tự hủy; chỉ log lỗi rollback
                // để không che mất lỗi gốc.
                console.error('Rollback create user error:', rollbackError);
            }
            throw error;
        }

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
exports.updateEmployee = async (req, res, next) => {
    try {
        const pool = await getPool();
        const row = (await pool.request().input('ID', sql.Int, Number(req.params.id)).query('SELECT UserID FROM Employee WHERE EmployeeID=@ID')).recordset[0];
        if (!row) return res.status(404).json({success:false,message:'Employee not found'});
        req.params.id = row.UserID;
        return require('./accountController').updateAccount(req,res,next);
    } catch (error) { next(error); }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkResult = await pool.request()
            .input('UserID', sql.Int, id)
            .query(`
                SELECT u.UserID
                FROM Users u
                WHERE u.UserID = @UserID
                  AND (
                      EXISTS (SELECT 1 FROM Employee e WHERE e.UserID = u.UserID)
                      OR EXISTS (SELECT 1 FROM Resident r WHERE r.UserID = u.UserID)
                  )
            `);

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản'
            });
        }

        const userId = Number(checkResult.recordset[0].UserID);
        if (Number(req.userId) === userId) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản đang đăng nhập'
            });
        }

        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const transactionRequest = () => new sql.Request(transaction).input('UserID', sql.Int, userId);

            // Giữ dữ liệu nghiệp vụ, chỉ gỡ liên kết đến tài khoản bị xóa.
            await transactionRequest().query('UPDATE MeterReading SET EmployeeID = NULL WHERE EmployeeID IN (SELECT EmployeeID FROM Employee WHERE UserID = @UserID)');
            await transactionRequest().query('UPDATE Resident SET UserID = NULL WHERE UserID = @UserID');
            await transactionRequest().query('UPDATE ParkingAccessLog SET RecordedByUserID = NULL WHERE RecordedByUserID = @UserID');
            await transactionRequest().query('UPDATE ParkingSubscription SET CreatedByUserID = NULL WHERE CreatedByUserID = @UserID');
            await transactionRequest().query('UPDATE UserRole SET AssignedBy = NULL WHERE AssignedBy = @UserID');
            await transactionRequest().query('DELETE FROM Employee WHERE UserID = @UserID');
            await transactionRequest().query('DELETE FROM Users WHERE UserID = @UserID');
            await transaction.commit();
        } catch (transactionError) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback delete user error:', rollbackError);
            }
            throw transactionError;
        }

        res.json({
            success: true,
            message: 'Đã xóa vĩnh viễn tài khoản'
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        if (error.number === 547) return res.status(409).json({success:false,message:'Tài khoản còn liên quan đến thanh toán/yêu cầu/lịch sử nghiệp vụ. Hãy khóa tài khoản để giữ dữ liệu.'});
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
                r.IsSystem,
                r.CreatedAt,
                COUNT(DISTINCT ur.UserID) AS UserCount,
                COUNT(DISTINCT CASE WHEN rp.IsGranted=1 THEN rp.PermissionID END) AS PermissionCount
            FROM Role r
            LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
            LEFT JOIN RolePermission rp ON r.RoleID = rp.RoleID
            GROUP BY r.RoleID, r.RoleCode, r.RoleName, r.Description, r.Status, r.IsSystem, r.CreatedAt
            ORDER BY r.RoleName
        `);

        res.json({
            success: true,
            data: result.recordset || []
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
                GROUP BY r.RoleID, r.RoleCode, r.RoleName, r.Description, r.Status, r.IsSystem, r.CreatedAt
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

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
        role.Permissions = permResult.recordset || [];

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
            data: result.recordset || []
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
            data: result.recordset || []
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
        
        const permissionIds = result.recordset ? result.recordset.map(row => row.id) : [];
        
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
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const safeLimit = parseInt(limit) || 20;

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
        const total = countResult.recordset[0]?.total || 0;

        query += `
            ORDER BY al.Timestamp DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset || [],
            pagination: {
                total,
                page: parseInt(page),
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
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

// ============================================
// 🔥 THÔNG TIN HỆ THỐNG (MỚI)
// ============================================

// Lấy thông tin hệ thống
exports.getSystemInfo = async (req, res) => {
    try {
        const pool = await getPool();

        // Lấy thống kê tổng quan
        const statsResult = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Apartment) AS totalApartments,
                (SELECT COUNT(*) FROM Resident WHERE Status = 1) AS totalResidents,
                (SELECT COUNT(*) FROM Contract WHERE StatusID = 2) AS activeContracts,
                (SELECT COUNT(*) FROM Invoice) AS totalInvoices,
                (SELECT COUNT(*) FROM Service WHERE Status = 1) AS totalServices,
                (SELECT COUNT(*) FROM MaintenanceRequest) AS totalTickets,
                (SELECT COUNT(*) FROM Vehicle) AS totalVehicles,
                (SELECT COUNT(*) FROM Notification) AS totalNotifications,
                (SELECT COUNT(*) FROM Users WHERE Status = 1) AS activeUsers,
                (SELECT COUNT(*) FROM Users) AS totalUsers,
                (SELECT COUNT(*) FROM Module) AS totalModules,
                (SELECT COUNT(*) FROM Module WHERE Status=1) AS activeModules,
                (SELECT COUNT(*) FROM Permission) AS totalPermissions
        `);

        const stats = statsResult.recordset[0] || {};

        // Lấy thông tin database
        const dbInfo = await pool.request().query(`
            SELECT 
                DB_NAME() AS databaseName,
                SUM(CAST(size AS bigint)) * 8.0 / 1024 AS sizeMB,
                (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0) AS tableCount,
                (SELECT SUM(rows) FROM sys.partitions WHERE index_id IN(0,1) AND OBJECTPROPERTY(object_id,'IsUserTable')=1) AS recordCount,
                CAST(SERVERPROPERTY('ProductVersion') AS varchar(100)) AS databaseVersion
            FROM sys.database_files
        `);

        const dbSize = dbInfo.recordset.reduce((sum, row) => sum + (row.sizeMB || 0), 0);

        res.json({
            success: true,
            data: {
                stats: stats,
                system: {
                    name: 'ĐỨC VŨ TOWER',
                    version: require('../package.json').version,
                    build: process.env.BUILD_VERSION || null,
                    environment: process.env.NODE_ENV || 'development',
                    nodeVersion: process.version,
                    expressVersion: require('express/package.json').version,
                    operatingSystem: `${require('os').type()} ${require('os').release()}`,
                    uptime: Math.floor(process.uptime())
                },
                database: {
                    name: dbInfo.recordset[0]?.databaseName,
                    size: `${Math.round(dbSize)} MB`,
                    tables: dbInfo.recordset[0]?.tableCount || 0,
                    records: dbInfo.recordset[0]?.recordCount || 0,
                    version: dbInfo.recordset[0]?.databaseVersion
                },
                features: {
                    apartments: stats.totalApartments || 0,
                    residents: stats.totalResidents || 0,
                    contracts: stats.activeContracts || 0,
                    invoices: stats.totalInvoices || 0,
                    services: stats.totalServices || 0,
                    tickets: stats.totalTickets || 0,
                    vehicles: stats.totalVehicles || 0,
                    notifications: stats.totalNotifications || 0
                },
                status: {
                    database: 'Connected',
                    api: 'Running',
                    storage: 'Chưa giám sát',
                    cache: 'Không sử dụng'
                }
            }
        });

    } catch (error) {
        console.error('Get system info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system info',
            error: error.message
        });
    }
};
