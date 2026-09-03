USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu reset dữ liệu demo: giữ admin + dữ liệu tòa/tầng/phòng.';

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
    -- 1. Xóa dữ liệu nghiệp vụ/phát sinh
    ------------------------------------------------------------
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
    -- 2. Giữ catalog/lookup, giữ dữ liệu tòa nhà.
    --    Chỉ đưa toàn bộ phòng về trạng thái còn trống.
    ------------------------------------------------------------
    UPDATE dbo.Apartment
    SET StatusID = 1;

    ------------------------------------------------------------
    -- 3. Giữ tài khoản admin đăng nhập thử nghiệm.
    --    Xóa các user/employee khác để DB sạch demo.
    ------------------------------------------------------------
    DELETE FROM dbo.Employee
    WHERE UserID IS NULL OR UserID <> @KeepUserID;

    DELETE FROM dbo.UserRole
    WHERE UserID <> @KeepUserID;

    DELETE FROM dbo.Users
    WHERE UserID <> @KeepUserID;

    ------------------------------------------------------------
    -- 4. Kiểm tra sau reset
    ------------------------------------------------------------
    SELECT
        (SELECT COUNT(*) FROM dbo.Users) AS UsersLeft,
        (SELECT STRING_AGG(Username, ', ') FROM dbo.Users) AS UsernamesLeft,
        (SELECT COUNT(*) FROM dbo.Employee) AS EmployeesLeft,
        (SELECT COUNT(*) FROM dbo.ApartmentArea) AS AreasLeft,
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
        (SELECT COUNT(*) FROM dbo.ServiceRegistration) AS ServiceRegistrationsLeft,
        (SELECT COUNT(*) FROM dbo.MeterReading) AS MeterReadingsLeft;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất reset: giữ admin + tòa/tầng/phòng, tất cả phòng đã chuyển về còn trống.';
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

