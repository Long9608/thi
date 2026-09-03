USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu thêm thông tin thời hạn, chu kỳ đóng tiền và ảnh hợp đồng đã ký.';

    IF COL_LENGTH('dbo.Contract', 'ContractTermMonths') IS NULL
        ALTER TABLE dbo.Contract ADD ContractTermMonths INT NULL;

    IF COL_LENGTH('dbo.Contract', 'DepositMonths') IS NULL
        ALTER TABLE dbo.Contract ADD DepositMonths INT NULL;

    IF COL_LENGTH('dbo.Contract', 'PaymentCycleMonths') IS NULL
        ALTER TABLE dbo.Contract ADD PaymentCycleMonths INT NOT NULL
            CONSTRAINT DF_Contract_PaymentCycleMonths DEFAULT (1);

    IF COL_LENGTH('dbo.Contract', 'MonthlyBillingDay') IS NULL
        ALTER TABLE dbo.Contract ADD MonthlyBillingDay INT NOT NULL
            CONSTRAINT DF_Contract_MonthlyBillingDay DEFAULT (10);

    IF COL_LENGTH('dbo.Contract', 'SignedContractImage') IS NULL
        ALTER TABLE dbo.Contract ADD SignedContractImage NVARCHAR(500) NULL;

    IF COL_LENGTH('dbo.Apartment', 'BaseRentalPrice') IS NOT NULL
    BEGIN
        EXEC(N'UPDATE dbo.Apartment SET BaseRentalPrice = 7500000;');
    END

    IF OBJECT_ID('dbo.ApartmentPriceHistory', 'U') IS NOT NULL
       AND COL_LENGTH('dbo.ApartmentPriceHistory', 'Price') IS NOT NULL
    BEGIN
        EXEC(N'UPDATE dbo.ApartmentPriceHistory SET Price = 7500000;');
    END

    EXEC(N'
        UPDATE dbo.Contract
        SET
            Rent = 7500000,
            PaymentCycleMonths = ISNULL(PaymentCycleMonths, 1),
            MonthlyBillingDay = ISNULL(MonthlyBillingDay, 10),
            DepositMonths = CASE
                WHEN Deposit IS NULL OR Deposit = 0 THEN NULL
                WHEN Deposit >= 15000000 THEN 2
                ELSE 1
            END,
            ContractTermMonths = CASE
                WHEN ContractTermMonths IS NULL THEN DATEDIFF(MONTH, StartDate, EndDate)
                ELSE ContractTermMonths
            END;
    ');

    SELECT
        COL_LENGTH('dbo.Contract', 'ContractTermMonths') AS ContractTermMonthsColumn,
        COL_LENGTH('dbo.Contract', 'DepositMonths') AS DepositMonthsColumn,
        COL_LENGTH('dbo.Contract', 'PaymentCycleMonths') AS PaymentCycleMonthsColumn,
        COL_LENGTH('dbo.Contract', 'MonthlyBillingDay') AS MonthlyBillingDayColumn,
        COL_LENGTH('dbo.Contract', 'SignedContractImage') AS SignedContractImageColumn;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất thêm metadata hợp đồng.';
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
