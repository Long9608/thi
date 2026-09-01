USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Đồng bộ dịch vụ Gym/Hồ bơi cho demo hóa đơn...';

    ------------------------------------------------------------
    -- 1. Xóa service cũ gộp Gym + Hồ bơi để tránh lẫn
    ------------------------------------------------------------
    DELETE FROM dbo.ServiceRegistration
    WHERE ServiceID IN (
        SELECT ServiceID
        FROM dbo.Service
        WHERE ServiceName = N'Phí dịch vụ bể bơi & Gym gia đình'
    );

    DELETE FROM dbo.Service
    WHERE ServiceName = N'Phí dịch vụ bể bơi & Gym gia đình';

    ------------------------------------------------------------
    -- 2. Đảm bảo service Gym và Hồ bơi tồn tại
    ------------------------------------------------------------
    DECLARE @UtilityCategoryID INT;
    SELECT TOP 1 @UtilityCategoryID = CategoryID
    FROM dbo.ServiceCategory
    WHERE CategoryName LIKE N'%tiện ích%'
       OR CategoryName LIKE N'%mở rộng%';

    IF @UtilityCategoryID IS NULL
    BEGIN
        INSERT INTO dbo.ServiceCategory (CategoryName, Description)
        VALUES (N'Dịch vụ tiện ích mở rộng', N'Gym, hồ bơi và các tiện ích cư dân');

        SET @UtilityCategoryID = SCOPE_IDENTITY();
    END

    DECLARE @GymServiceID INT;
    DECLARE @PoolServiceID INT;

    SELECT @GymServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName = N'Phí Gym';

    IF @GymServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@UtilityCategoryID, N'Phí Gym', N'Tháng', 250000, 1);
        SET @GymServiceID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @UtilityCategoryID, Unit = N'Tháng', Price = 250000, Status = 1
        WHERE ServiceID = @GymServiceID;
    END

    SELECT @PoolServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName = N'Phí Hồ bơi';

    IF @PoolServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@UtilityCategoryID, N'Phí Hồ bơi', N'Tháng', 180000, 1);
        SET @PoolServiceID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @UtilityCategoryID, Unit = N'Tháng', Price = 180000, Status = 1
        WHERE ServiceID = @PoolServiceID;
    END

    ------------------------------------------------------------
    -- 3. Xóa mọi đăng ký Gym/Hồ bơi cũ để seed lại rõ ràng
    ------------------------------------------------------------
    DELETE FROM dbo.ServiceRegistration
    WHERE ServiceID IN (@GymServiceID, @PoolServiceID);

    ------------------------------------------------------------
    -- 4. Seed demo theo phân bố:
    --    - 48% không đăng ký
    --    - 42% đăng ký 1 dịch vụ
    --    - 10% đăng ký cả 2 dịch vụ
    --    + Bắt buộc căn Tòa C-T1-P1 có cả Gym và Hồ bơi để nhìn thấy ngay.
    ------------------------------------------------------------
    DECLARE @ActiveContracts TABLE (
        RowNo INT IDENTITY(1,1) PRIMARY KEY,
        ContractID INT NOT NULL,
        ApartmentCode NVARCHAR(50) NOT NULL
    );

    INSERT INTO @ActiveContracts (ContractID, ApartmentCode)
    SELECT c.ContractID, a.ApartmentCode
    FROM dbo.Contract c
    JOIN dbo.Apartment a ON a.ApartmentID = c.ApartmentID
    WHERE c.StatusID IN (2, 5)
      AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
      AND EXISTS (
        SELECT 1
        FROM dbo.ContractResident cr
        WHERE cr.ContractID = c.ContractID
          AND cr.MoveOutDate IS NULL
      );

    DECLARE @ActiveCount INT = (SELECT COUNT(*) FROM @ActiveContracts);
    DECLARE @NoneCount INT = FLOOR(@ActiveCount * 0.48);
    DECLARE @BothCount INT = FLOOR(@ActiveCount * 0.10);
    DECLARE @OneServiceCount INT = @ActiveCount - @NoneCount - @BothCount;
    DECLARE @GymOnlyCount INT = @OneServiceCount / 2;
    DECLARE @PoolOnlyCount INT = @OneServiceCount - @GymOnlyCount;

    IF @ActiveCount > 0 AND @OneServiceCount < 0
        SET @OneServiceCount = 0;

    DECLARE @ShowcaseContractID INT;
    SELECT TOP 1 @ShowcaseContractID = ContractID
    FROM @ActiveContracts
    WHERE ApartmentCode = N'Tòa C-T1-P1';

    DECLARE @Pool TABLE (ContractID INT PRIMARY KEY);
    DECLARE @GymOnly TABLE (ContractID INT PRIMARY KEY);
    DECLARE @PoolOnly TABLE (ContractID INT PRIMARY KEY);

    INSERT INTO @Pool (ContractID)
    SELECT TOP (@BothCount) ContractID
    FROM @ActiveContracts
    WHERE ContractID <> ISNULL(@ShowcaseContractID, -1)
    ORDER BY NEWID();

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT ContractID, @GymServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
    FROM @Pool;

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT ContractID, @PoolServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
    FROM @Pool;

    INSERT INTO @GymOnly (ContractID)
    SELECT TOP (@GymOnlyCount) ContractID
    FROM @ActiveContracts
    WHERE ContractID <> ISNULL(@ShowcaseContractID, -1)
      AND ContractID NOT IN (SELECT ContractID FROM @Pool)
    ORDER BY NEWID();

    INSERT INTO @PoolOnly (ContractID)
    SELECT TOP (@PoolOnlyCount) ContractID
    FROM @ActiveContracts
    WHERE ContractID <> ISNULL(@ShowcaseContractID, -1)
      AND ContractID NOT IN (SELECT ContractID FROM @Pool)
      AND ContractID NOT IN (SELECT ContractID FROM @GymOnly)
    ORDER BY NEWID();

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT ContractID, @GymServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
    FROM @GymOnly;

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT ContractID, @PoolServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
    FROM @PoolOnly;

    IF @ShowcaseContractID IS NOT NULL
    BEGIN
        INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
        SELECT @ShowcaseContractID, @GymServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.ServiceRegistration
            WHERE ContractID = @ShowcaseContractID AND ServiceID = @GymServiceID
        );

        INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
        SELECT @ShowcaseContractID, @PoolServiceID, CAST(GETDATE() AS DATE), NULL, 1, 1
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.ServiceRegistration
            WHERE ContractID = @ShowcaseContractID AND ServiceID = @PoolServiceID
        );
    END

    ------------------------------------------------------------
    -- 5. Kiểm tra
    ------------------------------------------------------------
    SELECT
        @ActiveCount AS ActiveContracts,
        @NoneCount AS NoRegisterCount,
        @OneServiceCount AS OneServiceCount,
        @BothCount AS BothServiceCount,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration sr WHERE sr.ServiceID = @GymServiceID AND sr.Status = 1) AS GymRegs,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration sr WHERE sr.ServiceID = @PoolServiceID AND sr.Status = 1) AS PoolRegs,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration sr JOIN dbo.Service s ON s.ServiceID = sr.ServiceID WHERE s.ServiceName = N'Phí dịch vụ bể bơi & Gym gia đình') AS OldMergedRegs,
        (SELECT COUNT(*) FROM dbo.Service WHERE ServiceName = N'Phí dịch vụ bể bơi & Gym gia đình') AS OldMergedServices;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất đồng bộ Gym/Hồ bơi.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    SELECT ERROR_NUMBER() AS ErrorNumber, ERROR_MESSAGE() AS ErrorMessage, ERROR_LINE() AS ErrorLine;
    THROW;
END CATCH;
GO
