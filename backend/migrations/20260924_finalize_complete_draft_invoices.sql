-- Promote only complete non-utility drafts so residents can pay invoices whose amount is already final.
-- Utility drafts remain drafts until the meter workflow finalizes them.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE i
SET WorkflowStatus = 'WAITING_PAYMENT', StatusID = 1
FROM dbo.Invoice i
WHERE i.WorkflowStatus = 'DRAFT'
  AND i.StatusID <> 4
  AND i.TotalAmount > 0
  AND EXISTS (SELECT 1 FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID)
  AND NOT EXISTS (SELECT 1 FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID AND d.ChargeType IN ('ELECTRIC', 'WATER'))
  AND i.TotalAmount = (SELECT SUM(d.Amount) FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID);

COMMIT TRANSACTION;
GO
