USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu dọn dữ liệu hợp đồng/phòng/tòa nhà...';

    ------------------------------------------------------------
    -- 1. Xóa toàn bộ hợp đồng tự sinh nhầm HD-AUTO-*
    ------------------------------------------------------------
    DELETE FROM dbo.ContractResident
    WHERE ContractID IN (
        SELECT ContractID
        FROM dbo.Contract
        WHERE ContractNumber LIKE 'HD-AUTO-%'
    );

    DELETE FROM dbo.Contract
    WHERE ContractNumber LIKE 'HD-AUTO-%';

    ------------------------------------------------------------
    -- 2. Xóa tòa Block A và toàn bộ dữ liệu phụ thuộc
    -- Giữ lại các tòa còn lại: Tòa A, Tòa B, Tòa C
    ------------------------------------------------------------
    DECLARE @BlockApartments TABLE (ApartmentID INT PRIMARY KEY);
    DECLARE @BlockContracts TABLE (ContractID INT PRIMARY KEY);
    DECLARE @BlockInvoices TABLE (InvoiceID INT PRIMARY KEY);
    DECLARE @BlockMeters TABLE (MeterID INT PRIMARY KEY);
    DECLARE @BlockFloors TABLE (FloorID INT PRIMARY KEY);

    INSERT INTO @BlockFloors (FloorID)
    SELECT f.FloorID
    FROM dbo.Floor f
    JOIN dbo.Building b ON b.BuildingID = f.BuildingID
    WHERE b.BuildingName = N'Block A';

    INSERT INTO @BlockApartments (ApartmentID)
    SELECT a.ApartmentID
    FROM dbo.Apartment a
    WHERE a.FloorID IN (SELECT FloorID FROM @BlockFloors);

    INSERT INTO @BlockContracts (ContractID)
    SELECT c.ContractID
    FROM dbo.Contract c
    WHERE c.ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

    INSERT INTO @BlockInvoices (InvoiceID)
    SELECT i.InvoiceID
    FROM dbo.Invoice i
    WHERE i.ContractID IN (SELECT ContractID FROM @BlockContracts);

    IF OBJECT_ID('dbo.SmartMeter', 'U') IS NOT NULL
    BEGIN
        INSERT INTO @BlockMeters (MeterID)
        SELECT sm.MeterID
        FROM dbo.SmartMeter sm
        WHERE sm.ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);
    END

    DELETE FROM dbo.Payment
    WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

    DELETE FROM dbo.InvoiceDetail
    WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

    DELETE FROM dbo.Invoice
    WHERE InvoiceID IN (SELECT InvoiceID FROM @BlockInvoices);

    DELETE FROM dbo.MeterReading
    WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

    IF OBJECT_ID('dbo.SmartMeterLog', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.SmartMeterLog
        WHERE MeterID IN (SELECT MeterID FROM @BlockMeters);
    END

    IF OBJECT_ID('dbo.SmartMeter', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.SmartMeter
        WHERE MeterID IN (SELECT MeterID FROM @BlockMeters);
    END

    DELETE FROM dbo.ServiceRegistration
    WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

    DELETE FROM dbo.ContractResident
    WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

    DELETE FROM dbo.Contract
    WHERE ContractID IN (SELECT ContractID FROM @BlockContracts);

    DELETE FROM dbo.ApartmentPriceHistory
    WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

    DELETE FROM dbo.Apartment
    WHERE ApartmentID IN (SELECT ApartmentID FROM @BlockApartments);

    DELETE FROM dbo.Floor
    WHERE FloorID IN (SELECT FloorID FROM @BlockFloors);

    DELETE FROM dbo.Building
    WHERE BuildingName = N'Block A';

    ------------------------------------------------------------
    -- 3. Đồng bộ trạng thái phòng theo hợp đồng thật
    -- Contract.StatusID IN (2, 5) đều được xem là hiệu lực
    -- nếu ngày hiện tại nằm trong StartDate - EndDate
    ------------------------------------------------------------
    UPDATE a
    SET StatusID = 2
    FROM dbo.Apartment a
    WHERE EXISTS (
        SELECT 1
        FROM dbo.Contract c
        JOIN dbo.ContractResident cr ON cr.ContractID = c.ContractID
        WHERE c.ApartmentID = a.ApartmentID
          AND c.StatusID IN (2, 5)
          AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
          AND cr.MoveOutDate IS NULL
    )
      AND a.StatusID <> 2;

    UPDATE a
    SET StatusID = 1
    FROM dbo.Apartment a
    WHERE a.StatusID = 2
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.Contract c
        JOIN dbo.ContractResident cr ON cr.ContractID = c.ContractID
        WHERE c.ApartmentID = a.ApartmentID
          AND c.StatusID IN (2, 5)
          AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
          AND cr.MoveOutDate IS NULL
    );

    ------------------------------------------------------------
    -- 4. Kiểm tra sau khi dọn
    ------------------------------------------------------------
    SELECT
        (SELECT COUNT(*) FROM dbo.Contract WHERE ContractNumber LIKE 'HD-AUTO-%') AS AutoContracts,
        (SELECT COUNT(*) FROM dbo.Building WHERE BuildingName = N'Block A') AS BlockABuildings,
        (
            SELECT COUNT(*)
            FROM dbo.Apartment a
            JOIN dbo.Floor f ON f.FloorID = a.FloorID
            JOIN dbo.Building b ON b.BuildingID = f.BuildingID
            WHERE b.BuildingName = N'Block A'
        ) AS BlockAApartments,
        (
            SELECT COUNT(*)
            FROM dbo.Apartment a
            WHERE a.StatusID = 2
              AND NOT EXISTS (
                SELECT 1
                FROM dbo.Contract c
                JOIN dbo.ContractResident cr ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = a.ApartmentID
                  AND c.StatusID IN (2, 5)
                  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                  AND cr.MoveOutDate IS NULL
              )
        ) AS OccupiedWithoutRealActiveContract;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất: đã xóa Block A, xóa HD-AUTO-* và đồng bộ trạng thái phòng.';
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

