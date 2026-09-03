USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu xóa dữ liệu mẫu còn sót trong catalog: dịch vụ, điện/nước, gửi xe.';

    ------------------------------------------------------------
    -- Xóa lại dữ liệu nghiệp vụ/phát sinh để chắc chắn sạch.
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
    -- Xóa catalog mẫu không thuộc dữ liệu tòa/tầng/phòng.
    ------------------------------------------------------------
    DELETE FROM dbo.Service;
    DELETE FROM dbo.ServiceCategory;

    DELETE FROM dbo.UtilityPriceTier;
    DELETE FROM dbo.UtilityType;

    DELETE FROM dbo.ParkingSlot;
    DELETE FROM dbo.VehicleType;

    ------------------------------------------------------------
    -- Giữ phòng nhưng chuyển hết về trống.
    ------------------------------------------------------------
    UPDATE dbo.Apartment
    SET StatusID = 1;

    ------------------------------------------------------------
    -- Kiểm tra nhanh.
    ------------------------------------------------------------
    SELECT
        (SELECT COUNT(*) FROM dbo.Building) AS Buildings,
        (SELECT COUNT(*) FROM dbo.Floor) AS Floors,
        (SELECT COUNT(*) FROM dbo.Apartment) AS Apartments,
        (SELECT COUNT(*) FROM dbo.Contract) AS Contracts,
        (SELECT COUNT(*) FROM dbo.Resident) AS Residents,
        (SELECT COUNT(*) FROM dbo.Invoice) AS Invoices,
        (SELECT COUNT(*) FROM dbo.Payment) AS Payments,
        (SELECT COUNT(*) FROM dbo.ServiceRegistration) AS ServiceRegistrations,
        (SELECT COUNT(*) FROM dbo.Service) AS Services,
        (SELECT COUNT(*) FROM dbo.ServiceCategory) AS ServiceCategories,
        (SELECT COUNT(*) FROM dbo.UtilityType) AS UtilityTypes,
        (SELECT COUNT(*) FROM dbo.UtilityPriceTier) AS UtilityPriceTiers,
        (SELECT COUNT(*) FROM dbo.MeterReading) AS MeterReadings,
        CASE WHEN OBJECT_ID('dbo.SmartMeter', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeter) END AS SmartMeters,
        CASE WHEN OBJECT_ID('dbo.SmartMeterLog', 'U') IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM dbo.SmartMeterLog) END AS SmartMeterLogs,
        (SELECT COUNT(*) FROM dbo.Vehicle) AS Vehicles,
        (SELECT COUNT(*) FROM dbo.ParkingCard) AS ParkingCards,
        (SELECT COUNT(*) FROM dbo.ParkingSlot) AS ParkingSlots,
        (SELECT COUNT(*) FROM dbo.VehicleType) AS VehicleTypes;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất xóa dữ liệu mẫu catalog. DB chỉ còn dữ liệu nền cần thiết + tòa/tầng/phòng.';
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
