USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Cập nhật dịch vụ gym/hồ bơi theo phí tháng, thêm wifi và dọn menu cũ.';

    DECLARE @ServiceCategoryID INT;
    DECLARE @GymServiceID INT;
    DECLARE @PoolServiceID INT;
    DECLARE @WifiServiceID INT;

    SELECT TOP 1 @ServiceCategoryID = CategoryID
    FROM dbo.ServiceCategory
    WHERE CategoryName LIKE N'%tiện ích%'
       OR CategoryName LIKE N'%dịch vụ%'

    IF @ServiceCategoryID IS NULL
    BEGIN
        INSERT INTO dbo.ServiceCategory (CategoryName, Description)
        VALUES (N'Dịch vụ tiện ích', N'Gym, hồ bơi, wifi và các dịch vụ theo tháng');
        SET @ServiceCategoryID = SCOPE_IDENTITY();
    END

    SELECT TOP 1 @GymServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName LIKE N'%gym%';

    IF @GymServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@ServiceCategoryID, N'Phí Gym', N'Tháng', 250000, 1);
        SET @GymServiceID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @ServiceCategoryID,
            ServiceName = N'Phí Gym',
            Unit = N'Tháng',
            Price = 250000,
            Status = 1
        WHERE ServiceID = @GymServiceID;
    END

    SELECT TOP 1 @PoolServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName LIKE N'%bơi%';

    IF @PoolServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@ServiceCategoryID, N'Phí Hồ bơi', N'Tháng', 180000, 1);
        SET @PoolServiceID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @ServiceCategoryID,
            ServiceName = N'Phí Hồ bơi',
            Unit = N'Tháng',
            Price = 180000,
            Status = 1
        WHERE ServiceID = @PoolServiceID;
    END

    SELECT TOP 1 @WifiServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName LIKE N'%wifi%'
       OR ServiceName LIKE N'%internet%'
       OR ServiceName LIKE N'%fpt%';

    IF @WifiServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@ServiceCategoryID, N'Phí Wifi', N'Tháng', 150000, 1);
        SET @WifiServiceID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @ServiceCategoryID,
            ServiceName = N'Phí Wifi',
            Unit = N'Tháng',
            Price = 150000,
            Status = 1
        WHERE ServiceID = @WifiServiceID;
    END

    DELETE rp
    FROM dbo.RolePermission rp
    JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
    WHERE p.PermissionCode IN ('MENU_REGISTER_SERVICE_VIEW', 'MENU_EVENT_SPACE_VIEW');

    DELETE FROM dbo.Permission
    WHERE PermissionCode IN ('MENU_REGISTER_SERVICE_VIEW', 'MENU_EVENT_SPACE_VIEW');

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Permission
        WHERE PermissionCode = 'MENU_WIFI_VIEW'
    )
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (5, 'MENU_WIFI_VIEW', N'Xem menu: Wifi', N'Quyền xem menu Wifi');
    END

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode = 'MENU_WIFI_VIEW'
    WHERE r.RoleCode = 'ADMIN'
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = p.PermissionID
      );

    SELECT
        @GymServiceID AS GymServiceID,
        @PoolServiceID AS PoolServiceID,
        @WifiServiceID AS WifiServiceID,
        (SELECT COUNT(*) FROM dbo.Permission WHERE PermissionCode IN ('MENU_REGISTER_SERVICE_VIEW', 'MENU_EVENT_SPACE_VIEW')) AS RemovedMenuPermissions,
        (SELECT COUNT(*) FROM dbo.Permission WHERE PermissionCode = 'MENU_WIFI_VIEW') AS WifiMenuPermission;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất cập nhật dịch vụ tháng và menu Wifi.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    SELECT
        ERROR_NUMBER() AS ErrorNumber,
        ERROR_MESSAGE() AS ErrorMessage,
        ERROR_LINE() AS ErrorLine;

    THROW;
END CATCH;
GO
