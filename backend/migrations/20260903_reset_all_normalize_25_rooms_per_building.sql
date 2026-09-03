USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu reset sạch dữ liệu nghiệp vụ và chuẩn hóa mỗi tòa 25 phòng.';

    DECLARE @KeepUserID INT;
    SELECT TOP 1 @KeepUserID = UserID
    FROM dbo.Users
    WHERE Username = 'admin'
    ORDER BY UserID;

    IF @KeepUserID IS NULL
    BEGIN
        THROW 50001, 'Không tìm thấy tài khoản admin để giữ lại. Dừng reset để tránh mất tài khoản đăng nhập.', 1;
    END

    ------------------------------------------------------------
    -- 1. Xóa sạch dữ liệu nghiệp vụ/phát sinh
    --    Bao gồm hợp đồng, cư dân, hóa đơn, thanh toán,
    --    điện/nước smart meter, gửi xe, dịch vụ đăng ký...
    ------------------------------------------------------------
    IF OBJECT_ID('dbo.ParkingAccessLog', 'U') IS NOT NULL
        DELETE FROM dbo.ParkingAccessLog;

    IF OBJECT_ID('dbo.ParkingSubscription', 'U') IS NOT NULL
        DELETE FROM dbo.ParkingSubscription;

    DELETE FROM dbo.NotificationReceiver;
    DELETE FROM dbo.Notification;
    DELETE FROM dbo.Feedback;
    DELETE FROM dbo.MaintenanceRequest;
    DELETE FROM dbo.AuditLog;

    DELETE FROM dbo.Payment;
    DELETE FROM dbo.InvoiceDetail;
    DELETE FROM dbo.Invoice;

    DELETE FROM dbo.MeterReading;

    IF OBJECT_ID('dbo.SmartMeterLog', 'U') IS NOT NULL
        DELETE FROM dbo.SmartMeterLog;

    IF OBJECT_ID('dbo.SmartMeter', 'U') IS NOT NULL
        DELETE FROM dbo.SmartMeter;

    DELETE FROM dbo.ParkingCard;
    DELETE FROM dbo.Vehicle;
    DELETE FROM dbo.ServiceRegistration;

    DELETE FROM dbo.ContractResident;
    DELETE FROM dbo.Contract;

    DELETE FROM dbo.ResidentIdentity;
    DELETE FROM dbo.Resident;

    ------------------------------------------------------------
    -- 2. Xóa căn hộ dư.
    --    Chỉ giữ format chuẩn:
    --    [Tên tòa]-T[1..5]-P[1..5]
    --    Ví dụ: Tòa A-T1-P1 ... Tòa A-T5-P5
    ------------------------------------------------------------
    DECLARE @ApartmentsToDelete TABLE (ApartmentID INT PRIMARY KEY);

    INSERT INTO @ApartmentsToDelete (ApartmentID)
    SELECT a.ApartmentID
    FROM dbo.Apartment a
    JOIN dbo.Floor f ON f.FloorID = a.FloorID
    JOIN dbo.Building b ON b.BuildingID = f.BuildingID
    WHERE f.FloorNumber NOT BETWEEN 1 AND 5
       OR a.ApartmentCode NOT IN (
            CONCAT(b.BuildingName, N'-T', f.FloorNumber, N'-P1'),
            CONCAT(b.BuildingName, N'-T', f.FloorNumber, N'-P2'),
            CONCAT(b.BuildingName, N'-T', f.FloorNumber, N'-P3'),
            CONCAT(b.BuildingName, N'-T', f.FloorNumber, N'-P4'),
            CONCAT(b.BuildingName, N'-T', f.FloorNumber, N'-P5')
       );

    DELETE FROM dbo.ApartmentPriceHistory
    WHERE ApartmentID IN (SELECT ApartmentID FROM @ApartmentsToDelete);

    DELETE FROM dbo.Apartment
    WHERE ApartmentID IN (SELECT ApartmentID FROM @ApartmentsToDelete);

    ------------------------------------------------------------
    -- 3. Xóa tầng dư nếu có, chỉ giữ tầng 1..5.
    ------------------------------------------------------------
    DELETE FROM dbo.Floor
    WHERE FloorNumber NOT BETWEEN 1 AND 5;

    ------------------------------------------------------------
    -- 4. Đưa toàn bộ phòng còn lại về phòng trống.
    ------------------------------------------------------------
    UPDATE dbo.Apartment
    SET StatusID = 1;

    ------------------------------------------------------------
    -- 5. Giữ tài khoản admin đăng nhập thử nghiệm.
    --    Xóa user/employee khác để dữ liệu demo sạch.
    ------------------------------------------------------------
    DELETE FROM dbo.Employee
    WHERE UserID IS NULL OR UserID <> @KeepUserID;

    DELETE FROM dbo.UserRole
    WHERE UserID <> @KeepUserID;

    DELETE FROM dbo.Users
    WHERE UserID <> @KeepUserID;

    ------------------------------------------------------------
    -- 6. Kiểm tra kết quả.
    ------------------------------------------------------------
    SELECT
        b.BuildingName,
        COUNT(DISTINCT f.FloorID) AS FloorCount,
        COUNT(a.ApartmentID) AS ApartmentCount
    FROM dbo.Building b
    LEFT JOIN dbo.Floor f ON f.BuildingID = b.BuildingID
    LEFT JOIN dbo.Apartment a ON a.FloorID = f.FloorID
    GROUP BY b.BuildingID, b.BuildingName
    ORDER BY b.BuildingName;

    SELECT
        (SELECT COUNT(*) FROM dbo.Users) AS UsersLeft,
        (SELECT STRING_AGG(Username, ', ') FROM dbo.Users) AS UsernamesLeft,
        (SELECT COUNT(*) FROM dbo.Building) AS BuildingsLeft,
        (SELECT COUNT(*) FROM dbo.Floor) AS FloorsLeft,
        (SELECT COUNT(*) FROM dbo.Apartment) AS ApartmentsLeft,
        (SELECT COUNT(*) FROM dbo.Apartment WHERE StatusID <> 1) AS NonVacantApartments,
        (SELECT COUNT(*) FROM dbo.Contract) AS ContractsLeft,
        (SELECT COUNT(*) FROM dbo.ContractResident) AS ContractResidentsLeft,
        (SELECT COUNT(*) FROM dbo.Resident) AS ResidentsLeft,
        (SELECT COUNT(*) FROM dbo.Invoice) AS InvoicesLeft,
        (SELECT COUNT(*) FROM dbo.Payment) AS PaymentsLeft,
        (SELECT COUNT(*) FROM dbo.Vehicle) AS VehiclesLeft,
        (SELECT COUNT(*) FROM dbo.ParkingCard) AS ParkingCardsLeft,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration) AS ServiceRegistrationsLeft,
        (SELECT COUNT(*) FROM dbo.MeterReading) AS MeterReadingsLeft,
        CASE WHEN OBJECT_ID('dbo.SmartMeter', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeter) END AS SmartMetersLeft,
        CASE WHEN OBJECT_ID('dbo.SmartMeterLog', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeterLog) END AS SmartMeterLogsLeft;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất: đã xóa sạch dữ liệu nghiệp vụ và chuẩn hóa mỗi tòa còn đúng 25 phòng.';
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
