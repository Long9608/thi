USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu xóa dữ liệu ngày hết hạn CCCD của cư dân.';

    IF COL_LENGTH('dbo.ResidentIdentity', 'ExpiredDate') IS NOT NULL
    BEGIN
        UPDATE dbo.ResidentIdentity
        SET ExpiredDate = NULL
        WHERE ExpiredDate IS NOT NULL;
    END

    SELECT
        CASE
            WHEN COL_LENGTH('dbo.ResidentIdentity', 'ExpiredDate') IS NULL THEN 0
            ELSE (SELECT COUNT(*) FROM dbo.ResidentIdentity WHERE ExpiredDate IS NOT NULL)
        END AS ResidentIdentityExpiredDatesLeft;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất: form cư dân không còn dùng ngày hết hạn CCCD, dữ liệu cũ đã được đưa về NULL.';
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
