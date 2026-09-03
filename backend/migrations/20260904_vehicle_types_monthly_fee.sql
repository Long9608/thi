USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    IF OBJECT_ID('dbo.VehicleType', 'U') IS NOT NULL
    BEGIN
        UPDATE dbo.VehicleType
        SET TypeName = N'Xe hơi',
            MonthlyFee = 300000
        WHERE TypeName LIKE N'%Ô tô%'
           OR TypeName LIKE N'%O to%'
           OR TypeName LIKE N'%Xe hơi%'
           OR TypeName LIKE N'%Car%';

        UPDATE dbo.VehicleType
        SET TypeName = N'Xe máy',
            MonthlyFee = 150000
        WHERE TypeName LIKE N'%Xe máy%'
           OR TypeName LIKE N'%Xe may%'
           OR TypeName LIKE N'%Motor%';

        UPDATE dbo.VehicleType
        SET TypeName = N'Xe đạp',
            MonthlyFee = 0
        WHERE TypeName LIKE N'%Xe đạp%'
           OR TypeName LIKE N'%Xe dap%'
           OR TypeName LIKE N'%Bicycle%';

        IF NOT EXISTS (SELECT 1 FROM dbo.VehicleType WHERE TypeName = N'Xe hơi')
        BEGIN
            INSERT INTO dbo.VehicleType (TypeName, MonthlyFee)
            VALUES (N'Xe hơi', 300000);
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.VehicleType WHERE TypeName = N'Xe máy')
        BEGIN
            INSERT INTO dbo.VehicleType (TypeName, MonthlyFee)
            VALUES (N'Xe máy', 150000);
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.VehicleType WHERE TypeName = N'Xe đạp')
        BEGIN
            INSERT INTO dbo.VehicleType (TypeName, MonthlyFee)
            VALUES (N'Xe đạp', 0);
        END

        UPDATE dbo.VehicleType
        SET MonthlyFee = CASE
            WHEN TypeName = N'Xe hơi' THEN 300000
            WHEN TypeName = N'Xe máy' THEN 150000
            WHEN TypeName = N'Xe đạp' THEN 0
            ELSE MonthlyFee
        END
        WHERE TypeName IN (N'Xe hơi', N'Xe máy', N'Xe đạp');
    END

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
