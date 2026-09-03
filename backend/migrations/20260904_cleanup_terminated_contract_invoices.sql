USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Dọn dữ liệu hợp đồng đã thanh lý: xóa hóa đơn/payment/detail, giữ chỉ số điện nước.';

    DECLARE @TerminatedContracts TABLE (ContractID INT PRIMARY KEY, ApartmentID INT);
    DECLARE @TerminatedInvoices TABLE (InvoiceID INT PRIMARY KEY);

    INSERT INTO @TerminatedContracts (ContractID, ApartmentID)
    SELECT ContractID, ApartmentID
    FROM dbo.Contract
    WHERE StatusID = 4;

    INSERT INTO @TerminatedInvoices (InvoiceID)
    SELECT i.InvoiceID
    FROM dbo.Invoice i
    JOIN @TerminatedContracts tc ON tc.ContractID = i.ContractID;

    DELETE FROM dbo.Payment
    WHERE InvoiceID IN (SELECT InvoiceID FROM @TerminatedInvoices);

    DELETE FROM dbo.InvoiceDetail
    WHERE InvoiceID IN (SELECT InvoiceID FROM @TerminatedInvoices);

    DELETE FROM dbo.Invoice
    WHERE InvoiceID IN (SELECT InvoiceID FROM @TerminatedInvoices);

    UPDATE sr
    SET Status = 0,
        EndDate = ISNULL(sr.EndDate, CAST(GETDATE() AS DATE))
    FROM dbo.ServiceRegistration sr
    JOIN @TerminatedContracts tc ON tc.ContractID = sr.ContractID
    WHERE sr.Status = 1;

    UPDATE cr
    SET MoveOutDate = ISNULL(cr.MoveOutDate, CAST(GETDATE() AS DATE))
    FROM dbo.ContractResident cr
    JOIN @TerminatedContracts tc ON tc.ContractID = cr.ContractID
    WHERE cr.MoveOutDate IS NULL;

    UPDATE a
    SET StatusID = 1
    FROM dbo.Apartment a
    JOIN @TerminatedContracts tc ON tc.ApartmentID = a.ApartmentID
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.Contract c
        WHERE c.ApartmentID = a.ApartmentID
          AND c.StatusID IN (2, 5)
          AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
    );

    SELECT
        (SELECT COUNT(*) FROM @TerminatedContracts) AS TerminatedContracts,
        (SELECT COUNT(*) FROM @TerminatedInvoices) AS DeletedInvoices,
        (SELECT COUNT(*) FROM dbo.MeterReading) AS MeterReadingsKept;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất dọn dữ liệu hợp đồng đã thanh lý.';
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
