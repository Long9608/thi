USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Kích hoạt dịch vụ Wifi để có thể đăng ký.';

    UPDATE dbo.Service
    SET Status = 1,
        Unit = N'Tháng'
    WHERE ServiceName LIKE N'%wifi%'
       OR ServiceName LIKE N'%internet%'
       OR ServiceName LIKE N'%fpt%';

    SELECT
        ServiceID,
        ServiceName,
        Status,
        Unit,
        Price
    FROM dbo.Service
    WHERE ServiceName LIKE N'%wifi%'
       OR ServiceName LIKE N'%internet%'
       OR ServiceName LIKE N'%fpt%';

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất kích hoạt dịch vụ Wifi.';
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
