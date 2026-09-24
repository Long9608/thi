BEGIN TRANSACTION;
BEGIN TRY
    DECLARE @Permissions TABLE (
        PermissionCode NVARCHAR(100) PRIMARY KEY,
        ModuleID INT NOT NULL,
        PermissionName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL
    );

    INSERT INTO @Permissions (PermissionCode, ModuleID, PermissionName, Description) VALUES
        ('RESIDENT_VIEW_OWN', 2, N'Xem dữ liệu cư dân của mình', N'Quyền xem danh sách và hồ sơ cư dân thuộc tài khoản hiện tại.'),
        ('RESIDENT_VIEW_ALL', 2, N'Xem tất cả cư dân', N'Quyền xem toàn bộ danh sách cư dân trong hệ thống.'),
        ('APARTMENT_VIEW_OWN', 3, N'Xem căn hộ của mình', N'Quyền xem căn hộ có liên quan đến cư dân hiện tại.'),
        ('APARTMENT_VIEW_ALL', 3, N'Xem tất cả căn hộ', N'Quyền xem toàn bộ căn hộ trong hệ thống.'),
        ('CONTRACT_VIEW_OWN', 4, N'Xem hợp đồng của mình', N'Quyền xem hợp đồng liên quan đến cư dân hiện tại.'),
        ('CONTRACT_VIEW_ALL', 4, N'Xem tất cả hợp đồng', N'Quyền xem toàn bộ hợp đồng trong hệ thống.'),
        ('INVOICE_VIEW_OWN', 6, N'Xem hóa đơn của mình', N'Quyền xem hóa đơn thuộc hợp đồng/căn hộ của cư dân hiện tại.'),
        ('INVOICE_VIEW_ALL', 6, N'Xem tất cả hóa đơn', N'Quyền xem toàn bộ hóa đơn trong hệ thống.'),
        ('VEHICLE_VIEW_OWN', 7, N'Xem phương tiện của mình', N'Quyền xem phương tiện thuộc cư dân hiện tại.'),
        ('VEHICLE_VIEW_ALL', 7, N'Xem tất cả phương tiện', N'Quyền xem toàn bộ phương tiện trong hệ thống.'),
        ('PARKING_VIEW_OWN', 7, N'Xem bãi xe của mình', N'Quyền xem thẻ, đăng ký và lịch sử bãi xe thuộc cư dân hiện tại.'),
        ('PARKING_VIEW_ALL', 7, N'Xem tất cả bãi xe', N'Quyền xem toàn bộ thẻ, đăng ký và lịch sử bãi xe.'),
        ('TICKET_VIEW_OWN', 8, N'Xem ticket của mình', N'Quyền xem yêu cầu hỗ trợ thuộc cư dân hiện tại.'),
        ('TICKET_VIEW_ALL', 8, N'Xem tất cả ticket', N'Quyền xem toàn bộ yêu cầu hỗ trợ trong hệ thống.'),
        ('FEEDBACK_VIEW_OWN', 8, N'Xem phản ánh của mình', N'Quyền xem phản ánh thuộc cư dân hiện tại.'),
        ('FEEDBACK_VIEW_ALL', 8, N'Xem tất cả phản ánh', N'Quyền xem toàn bộ phản ánh trong hệ thống.'),
        ('NOTIFICATION_VIEW_OWN', 9, N'Xem thông báo của mình', N'Quyền xem inbox thông báo của tài khoản hiện tại.'),
        ('NOTIFICATION_VIEW_ALL', 9, N'Xem tất cả thông báo quản trị', N'Quyền xem dữ liệu thông báo theo quyền quản trị.'),
        ('RESIDENT_EXPORT', 2, N'Xuất danh sách cư dân', N'Quyền xuất dữ liệu cư dân cho vai trò quản lý.');

    INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
    SELECT p.ModuleID, p.PermissionCode, p.PermissionName, p.Description
    FROM @Permissions p
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Permission x WHERE x.PermissionCode = p.PermissionCode
    );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_OWN', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_OWN',
        'VEHICLE_VIEW_OWN', 'PARKING_VIEW_OWN', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_OWN'
        , 'NOTIFICATION_VIEW_OWN'
    )
    WHERE r.RoleCode = 'RESIDENT'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
        'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN',
        'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
        'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
        , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
    )
    WHERE r.RoleCode IN ('MANAGER', 'ADMIN')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
        'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN'
    )
    WHERE r.RoleCode IN ('ACCOUNTANT', 'RECEPTION')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
        'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
                    , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
    )
    WHERE r.RoleCode IN ('SECURITY', 'RECEPTION')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

        UPDATE rp
        SET rp.IsGranted = 1
        FROM dbo.RolePermission rp
        JOIN dbo.Role r ON r.RoleID = rp.RoleID
        JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
        WHERE r.RoleCode = 'RESIDENT'
            AND p.PermissionCode IN (
                    'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_OWN', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_OWN',
                    'VEHICLE_VIEW_OWN', 'PARKING_VIEW_OWN', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_OWN',
                    'NOTIFICATION_VIEW_OWN'
            );

        UPDATE rp
        SET rp.IsGranted = 1
        FROM dbo.RolePermission rp
        JOIN dbo.Role r ON r.RoleID = rp.RoleID
        JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
        WHERE r.RoleCode IN ('MANAGER', 'ADMIN', 'ACCOUNTANT', 'RECEPTION', 'SECURITY')
            AND p.PermissionCode IN (
                    'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
                    'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN',
                    'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
                    'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
                                        , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
            );

                UPDATE rp
                SET rp.IsGranted = 0
                FROM dbo.RolePermission rp
                JOIN dbo.Role r ON r.RoleID = rp.RoleID
                JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
                WHERE r.RoleCode = 'RESIDENT'
                    AND p.PermissionCode IN (
                            'RESIDENT_VIEW_ALL', 'APARTMENT_VIEW_ALL', 'CONTRACT_VIEW_ALL', 'INVOICE_VIEW_ALL',
                            'VEHICLE_VIEW_ALL', 'PARKING_VIEW_ALL', 'TICKET_VIEW_ALL', 'FEEDBACK_VIEW_ALL',
                            'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
                    );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
