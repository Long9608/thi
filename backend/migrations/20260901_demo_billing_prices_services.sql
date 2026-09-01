USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Cập nhật dữ liệu demo hóa đơn: giá thuê, điện/nước, gym/hồ bơi...';

    ------------------------------------------------------------
    -- 1. Đổi tất cả giá thuê hợp đồng/căn hộ đang có thành 7 triệu/tháng
    ------------------------------------------------------------
    UPDATE dbo.Contract
    SET Rent = 7000000;

    UPDATE dbo.ApartmentPriceHistory
    SET BaseRentalPrice = 7000000;

    ------------------------------------------------------------
    -- 2. Giá điện sinh hoạt bậc thang theo EVN/QĐ 1279 năm 2025-2026
    -- Đơn vị: VND/kWh, chưa VAT
    ------------------------------------------------------------
    DELETE FROM dbo.UtilityPriceTier
    WHERE UtilityTypeID = 1;

    INSERT INTO dbo.UtilityPriceTier (UtilityTypeID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate)
    VALUES
        (1, N'Điện sinh hoạt bậc 1: 0-50 kWh',       0,    50, 1984, '2026-01-01'),
        (1, N'Điện sinh hoạt bậc 2: 51-100 kWh',    50,   100, 2050, '2026-01-01'),
        (1, N'Điện sinh hoạt bậc 3: 101-200 kWh',   100,  200, 2380, '2026-01-01'),
        (1, N'Điện sinh hoạt bậc 4: 201-300 kWh',   200,  300, 2998, '2026-01-01'),
        (1, N'Điện sinh hoạt bậc 5: 301-400 kWh',   300,  400, 3350, '2026-01-01'),
        (1, N'Điện sinh hoạt bậc 6: trên 400 kWh',  400, NULL, 3460, '2026-01-01');

    ------------------------------------------------------------
    -- 3. Giá nước sinh hoạt tham khảo Hà Nội năm 2026
    -- Đơn vị: VND/m3, chưa VAT/phí BVMT
    ------------------------------------------------------------
    DELETE FROM dbo.UtilityPriceTier
    WHERE UtilityTypeID = 2;

    INSERT INTO dbo.UtilityPriceTier (UtilityTypeID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate)
    VALUES
        (2, N'Nước sinh hoạt bậc 1: 0-10 m3',       0,   10,  8500, '2026-01-01'),
        (2, N'Nước sinh hoạt bậc 2: 10-20 m3',     10,   20,  9900, '2026-01-01'),
        (2, N'Nước sinh hoạt bậc 3: 20-30 m3',     20,   30, 16000, '2026-01-01'),
        (2, N'Nước sinh hoạt bậc 4: trên 30 m3',   30, NULL, 27000, '2026-01-01');

    ------------------------------------------------------------
    -- 4. Xóa phí quản lý vận hành tòa nhà khỏi đăng ký dịch vụ
    ------------------------------------------------------------
    DELETE sr
    FROM dbo.ServiceRegistration sr
    JOIN dbo.Service s ON s.ServiceID = sr.ServiceID
    WHERE s.ServiceName LIKE N'%quản lý%'
       OR s.ServiceName LIKE N'%vận hành%';

    DELETE FROM dbo.Service
    WHERE ServiceName LIKE N'%quản lý%'
       OR ServiceName LIKE N'%vận hành%';

    ------------------------------------------------------------
    -- 5. Tạo/rà lại dịch vụ Gym và Hồ bơi riêng
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
        SET CategoryID = @UtilityCategoryID,
            Unit = N'Tháng',
            Price = 250000,
            Status = 1
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
        SET CategoryID = @UtilityCategoryID,
            Unit = N'Tháng',
            Price = 180000,
            Status = 1
        WHERE ServiceID = @PoolServiceID;
    END

    ------------------------------------------------------------
    -- 6. Random đăng ký Gym/Hồ bơi cho ít phòng:
    -- Chọn khoảng 7% hợp đồng hiệu lực cho Gym, 7% cho Hồ bơi.
    -- Như vậy số phòng đăng ký luôn ít hơn 8% tổng số phòng/hợp đồng hiệu lực.
    ------------------------------------------------------------
    DELETE FROM dbo.ServiceRegistration
    WHERE ServiceID IN (@GymServiceID, @PoolServiceID);

    DECLARE @ActiveContracts TABLE (
        RowNo INT IDENTITY(1,1) PRIMARY KEY,
        ContractID INT NOT NULL
    );

    INSERT INTO @ActiveContracts (ContractID)
    SELECT c.ContractID
    FROM dbo.Contract c
    WHERE c.StatusID IN (2, 5)
      AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
      AND EXISTS (
        SELECT 1
        FROM dbo.ContractResident cr
        WHERE cr.ContractID = c.ContractID
          AND cr.MoveOutDate IS NULL
      )
    ORDER BY NEWID();

    DECLARE @ActiveCount INT = (SELECT COUNT(*) FROM @ActiveContracts);
    DECLARE @PickCount INT = FLOOR(@ActiveCount * 0.07);

    IF @PickCount < 1 AND @ActiveCount > 0
        SET @PickCount = 1;

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT TOP (@PickCount)
        ContractID,
        @GymServiceID,
        CAST(GETDATE() AS DATE),
        NULL,
        1,
        1
    FROM @ActiveContracts
    ORDER BY NEWID();

    INSERT INTO dbo.ServiceRegistration (ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status)
    SELECT TOP (@PickCount)
        ContractID,
        @PoolServiceID,
        CAST(GETDATE() AS DATE),
        NULL,
        1,
        1
    FROM @ActiveContracts
    ORDER BY NEWID();

    ------------------------------------------------------------
    -- 7. Kiểm tra nhanh
    ------------------------------------------------------------
    SELECT
        (SELECT COUNT(*) FROM dbo.Contract WHERE Rent = 7000000) AS ContractsRent7M,
        (SELECT COUNT(*) FROM dbo.Service WHERE ServiceName LIKE N'%quản lý%' OR ServiceName LIKE N'%vận hành%') AS ManagementServicesLeft,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration WHERE ServiceID = @GymServiceID AND Status = 1) AS GymRegistrations,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration WHERE ServiceID = @PoolServiceID AND Status = 1) AS PoolRegistrations,
        @ActiveCount AS ActiveContracts,
        @PickCount AS TargetPerService;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất cập nhật dữ liệu demo hóa đơn.';
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
