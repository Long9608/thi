USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Cập nhật hóa đơn: nháp -> chờ thanh toán -> đã thanh toán, nhập chỉ số điện/nước thủ công.';

    ------------------------------------------------------------
    -- 1. Workflow riêng cho hóa đơn để không phá StatusID cũ
    ------------------------------------------------------------
    IF COL_LENGTH('dbo.Invoice', 'WorkflowStatus') IS NULL
    BEGIN
        ALTER TABLE dbo.Invoice
        ADD WorkflowStatus VARCHAR(30) NOT NULL
            CONSTRAINT DF_Invoice_WorkflowStatus DEFAULT ('WAITING_PAYMENT');
    END

    EXEC(N'
        UPDATE dbo.Invoice
        SET WorkflowStatus = CASE
            WHEN StatusID = 2 THEN ''PAID''
            WHEN WorkflowStatus IS NULL OR WorkflowStatus = '''' THEN ''WAITING_PAYMENT''
            ELSE WorkflowStatus
        END;
    ');

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_Invoice_Contract_Period'
          AND object_id = OBJECT_ID('dbo.Invoice')
    )
    BEGIN
        CREATE UNIQUE INDEX UX_Invoice_Contract_Period
        ON dbo.Invoice (ContractID, InvoiceMonth, InvoiceYear);
    END

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_MeterReading_Apartment_Utility_Period'
          AND object_id = OBJECT_ID('dbo.MeterReading')
    )
    BEGIN
        CREATE UNIQUE INDEX UX_MeterReading_Apartment_Utility_Period
        ON dbo.MeterReading (ApartmentID, UtilityTypeID, ReadingMonth, ReadingYear);
    END

    ------------------------------------------------------------
    -- 2. Giá thuê cố định 7.500.000 VNĐ/tháng
    ------------------------------------------------------------
    UPDATE dbo.Contract
    SET Rent = 7500000;

    UPDATE dbo.ApartmentPriceHistory
    SET BaseRentalPrice = 7500000;

    ------------------------------------------------------------
    -- 3. Dữ liệu nền điện/nước + bậc giá thực tế tham chiếu
    -- Điện sinh hoạt EVN/QĐ 1279/QĐ-BCT từ 10/05/2025, chưa VAT.
    -- Nước sinh hoạt TP.HCM/SAWACO 2026, cộng phần nước sạch + thuế + thoát nước/xử lý nước thải.
    ------------------------------------------------------------
    DECLARE @ElectricUtilityID INT;
    DECLARE @WaterUtilityID INT;

    SELECT TOP 1 @ElectricUtilityID = UtilityTypeID
    FROM dbo.UtilityType
    WHERE UtilityName LIKE N'%điện%' OR UtilityName LIKE N'%dien%' OR UtilityName LIKE N'%electric%';

    IF @ElectricUtilityID IS NULL
    BEGIN
        INSERT INTO dbo.UtilityType (UtilityName)
        VALUES (N'Điện sinh hoạt');
        SET @ElectricUtilityID = SCOPE_IDENTITY();
    END

    SELECT TOP 1 @WaterUtilityID = UtilityTypeID
    FROM dbo.UtilityType
    WHERE UtilityName LIKE N'%nước%' OR UtilityName LIKE N'%nuoc%' OR UtilityName LIKE N'%water%';

    IF @WaterUtilityID IS NULL
    BEGIN
        INSERT INTO dbo.UtilityType (UtilityName)
        VALUES (N'Nước sinh hoạt');
        SET @WaterUtilityID = SCOPE_IDENTITY();
    END

    DELETE FROM dbo.UtilityPriceTier
    WHERE UtilityTypeID IN (@ElectricUtilityID, @WaterUtilityID);

    INSERT INTO dbo.UtilityPriceTier (UtilityTypeID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate)
    VALUES
        (@ElectricUtilityID, N'Điện bậc 1: 0-50 kWh',       0,    50, 1984, '2025-05-10'),
        (@ElectricUtilityID, N'Điện bậc 2: 51-100 kWh',    50,   100, 2050, '2025-05-10'),
        (@ElectricUtilityID, N'Điện bậc 3: 101-200 kWh',   100,  200, 2380, '2025-05-10'),
        (@ElectricUtilityID, N'Điện bậc 4: 201-300 kWh',   200,  300, 2998, '2025-05-10'),
        (@ElectricUtilityID, N'Điện bậc 5: 301-400 kWh',   300,  400, 3350, '2025-05-10'),
        (@ElectricUtilityID, N'Điện bậc 6: trên 400 kWh',  400, NULL, 3460, '2025-05-10');

    INSERT INTO dbo.UtilityPriceTier (UtilityTypeID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate)
    VALUES
        (@WaterUtilityID, N'Nước TP.HCM bậc 1: 0-10 m3 quy đổi',      0,   10,  9206, '2026-01-01'),
        (@WaterUtilityID, N'Nước TP.HCM bậc 2: 10-20 m3 quy đổi',    10,   20, 17725, '2026-01-01'),
        (@WaterUtilityID, N'Nước TP.HCM bậc 3: trên 20 m3 quy đổi',  20, NULL, 19786, '2026-01-01');

    ------------------------------------------------------------
    -- 4. Dữ liệu nền dịch vụ hộ/căn hộ: Gym + Hồ bơi
    ------------------------------------------------------------
    DECLARE @ServiceCategoryID INT;
    DECLARE @GymServiceID INT;
    DECLARE @PoolServiceID INT;

    SELECT TOP 1 @ServiceCategoryID = CategoryID
    FROM dbo.ServiceCategory
    WHERE CategoryName LIKE N'%tiện ích%' OR CategoryName LIKE N'%dịch vụ hộ%';

    IF @ServiceCategoryID IS NULL
    BEGIN
        INSERT INTO dbo.ServiceCategory (CategoryName, Description)
        VALUES (N'Dịch vụ hộ/căn hộ', N'Dịch vụ đăng ký theo hộ như Gym, hồ bơi');
        SET @ServiceCategoryID = SCOPE_IDENTITY();
    END

    SELECT TOP 1 @GymServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName LIKE N'%Gym%';

    IF @GymServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@ServiceCategoryID, N'Phí Gym hộ gia đình', N'Tháng', 250000, 1);
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @ServiceCategoryID,
            ServiceName = N'Phí Gym hộ gia đình',
            Unit = N'Tháng',
            Price = 250000,
            Status = 1
        WHERE ServiceID = @GymServiceID;
    END

    SELECT TOP 1 @PoolServiceID = ServiceID
    FROM dbo.Service
    WHERE ServiceName LIKE N'%Hồ bơi%' OR ServiceName LIKE N'%bơi%';

    IF @PoolServiceID IS NULL
    BEGIN
        INSERT INTO dbo.Service (CategoryID, ServiceName, Unit, Price, Status)
        VALUES (@ServiceCategoryID, N'Phí Hồ bơi hộ gia đình', N'Tháng', 180000, 1);
    END
    ELSE
    BEGIN
        UPDATE dbo.Service
        SET CategoryID = @ServiceCategoryID,
            ServiceName = N'Phí Hồ bơi hộ gia đình',
            Unit = N'Tháng',
            Price = 180000,
            Status = 1
        WHERE ServiceID = @PoolServiceID;
    END

    ------------------------------------------------------------
    -- 5. Xóa phí quản lý/vận hành nếu còn trong catalog
    ------------------------------------------------------------
    DELETE sr
    FROM dbo.ServiceRegistration sr
    JOIN dbo.Service s ON s.ServiceID = sr.ServiceID
    WHERE s.ServiceName LIKE N'%quản lý%'
       OR s.ServiceName LIKE N'%vận hành%';

    DELETE FROM dbo.Service
    WHERE ServiceName LIKE N'%quản lý%'
       OR ServiceName LIKE N'%vận hành%';

    EXEC(N'
        SELECT
            (SELECT COUNT(*) FROM dbo.UtilityType) AS UtilityTypes,
            (SELECT COUNT(*) FROM dbo.UtilityPriceTier) AS UtilityPriceTiers,
            (SELECT COUNT(*) FROM dbo.ServiceCategory) AS ServiceCategories,
            (SELECT COUNT(*) FROM dbo.Service) AS Services,
            (SELECT COUNT(*) FROM dbo.Invoice WHERE WorkflowStatus = ''DRAFT'') AS DraftInvoices,
            (SELECT COUNT(*) FROM dbo.Invoice WHERE WorkflowStatus = ''WAITING_PAYMENT'') AS WaitingInvoices,
            (SELECT COUNT(*) FROM dbo.Invoice WHERE WorkflowStatus = ''PAID'') AS PaidInvoices;
    ');

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất cập nhật workflow hóa đơn và dữ liệu nền điện/nước/dịch vụ.';
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
