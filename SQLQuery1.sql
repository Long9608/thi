ALTER TABLE Invoice ADD InvoiceType VARCHAR(20) NULL;


-- Thêm permission VEHICLE_UPDATE
USE [ApartmentManagement];
GO

BEGIN TRANSACTION;

DECLARE @PermissionID INT;

-- Kiểm tra xem permission đã tồn tại chưa
SELECT @PermissionID = PermissionID
FROM Permission
WHERE PermissionCode = 'VEHICLE_UPDATE';

-- Nếu chưa có thì tạo mới
IF @PermissionID IS NULL
BEGIN
    INSERT INTO Permission (ModuleID, PermissionCode, PermissionName, Description)
    SELECT 
        ModuleID,
        'VEHICLE_UPDATE',
        N'Cập nhật xe cư dân',
        N'Cho phép cập nhật thông tin xe và cấp thẻ xe'
    FROM Module
    WHERE ModuleCode = 'PARKING';

    SELECT @PermissionID = PermissionID
    FROM Permission
    WHERE PermissionCode = 'VEHICLE_UPDATE';
    PRINT '✅ Created VEHICLE_UPDATE permission';
END
ELSE
BEGIN
    PRINT 'ℹ️ VEHICLE_UPDATE already exists';
END

-- Gán permission cho các role
IF @PermissionID IS NOT NULL
BEGIN
    -- ADMIN
    INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, @PermissionID, 1, GETDATE()
    FROM Role r
    WHERE r.RoleCode = 'ADMIN'
      AND NOT EXISTS (
          SELECT 1
          FROM RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = @PermissionID
      );
    
    -- MANAGER
    INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, @PermissionID, 1, GETDATE()
    FROM Role r
    WHERE r.RoleCode = 'MANAGER'
      AND NOT EXISTS (
          SELECT 1
          FROM RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = @PermissionID
      );
    
    -- SECURITY
    INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, @PermissionID, 1, GETDATE()
    FROM Role r
    WHERE r.RoleCode = 'SECURITY'
      AND NOT EXISTS (
          SELECT 1
          FROM RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = @PermissionID
      );
    
    PRINT '✅ Granted VEHICLE_UPDATE to ADMIN, MANAGER, SECURITY';
END

-- Kiểm tra kết quả
SELECT 
    p.PermissionID,
    p.PermissionCode,
    p.PermissionName,
    m.ModuleCode,
    m.ModuleName,
    rp.IsGranted,
    r.RoleCode,
    r.RoleName
FROM Permission p
LEFT JOIN Module m ON p.ModuleID = m.ModuleID
LEFT JOIN RolePermission rp ON p.PermissionID = rp.PermissionID
LEFT JOIN Role r ON rp.RoleID = r.RoleID
WHERE p.PermissionCode = 'VEHICLE_UPDATE'
   OR p.PermissionCode = 'VEHICLE_CREATE'
ORDER BY p.PermissionCode;

COMMIT TRANSACTION;