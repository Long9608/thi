SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.NotificationDelivery','U') IS NULL
BEGIN
 CREATE TABLE dbo.NotificationDelivery (
  DeliveryID int IDENTITY PRIMARY KEY,
  NotificationID int NOT NULL REFERENCES dbo.Notification(NotificationID) ON DELETE CASCADE,
  UserID int NOT NULL REFERENCES dbo.Users(UserID),
  Channel varchar(10) NOT NULL CHECK(Channel IN ('WEB','EMAIL')),
  Recipient nvarchar(320) NULL,
  Status varchar(10) NOT NULL CHECK(Status IN ('PENDING','SENT','FAILED','SKIPPED')),
  AttemptCount int NOT NULL DEFAULT 0 CHECK(AttemptCount>=0),
  ErrorMessage nvarchar(500) NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(), SentAt datetime2 NULL,
  CONSTRAINT UQ_NotificationDelivery UNIQUE(NotificationID,UserID,Channel)
 );
 CREATE INDEX IX_NotificationDelivery_Status ON dbo.NotificationDelivery(Status,CreatedAt);
END;
IF OBJECT_ID('dbo.InvoiceDueDateExtensionRequest','U') IS NULL
BEGIN
 CREATE TABLE dbo.InvoiceDueDateExtensionRequest (
  RequestID int IDENTITY PRIMARY KEY,
  InvoiceID int NOT NULL REFERENCES dbo.Invoice(InvoiceID),
  RequestedByUserID int NOT NULL REFERENCES dbo.Users(UserID),
  RequestedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
  OriginalDueDate date NOT NULL, RequestedDueDate date NOT NULL,
  Reason nvarchar(2000) NOT NULL,
  Status varchar(10) NOT NULL DEFAULT 'PENDING' CHECK(Status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  ReviewedByUserID int NULL REFERENCES dbo.Users(UserID), ReviewedAt datetime2 NULL,
  ApprovedDueDate date NULL, ReviewNote nvarchar(2000) NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(), UpdatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT CK_Extension_Dates CHECK(RequestedDueDate>OriginalDueDate),
  CONSTRAINT CK_Extension_Approval CHECK(Status<>'APPROVED' OR (ApprovedDueDate>OriginalDueDate AND ReviewedByUserID IS NOT NULL AND ReviewedAt IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_Extension_Pending ON dbo.InvoiceDueDateExtensionRequest(InvoiceID) WHERE Status='PENDING';
 CREATE INDEX IX_Extension_Invoice ON dbo.InvoiceDueDateExtensionRequest(InvoiceID,RequestedAt);
END;
IF COL_LENGTH('dbo.MaintenanceRequest','DueDate') IS NULL
 ALTER TABLE dbo.MaintenanceRequest ADD DueDate date NULL;
IF NOT EXISTS(SELECT 1 FROM Permission WHERE PermissionCode='INVOICE_DUE_DATE_EXTEND')
 INSERT Permission(ModuleID,PermissionCode,PermissionName)
 SELECT ModuleID,'INVOICE_DUE_DATE_EXTEND',N'Gia hạn thanh toán hóa đơn' FROM Permission WHERE PermissionCode='INVOICE_UPDATE';
DECLARE @Grants TABLE(RoleCode varchar(50),PermissionCode varchar(100));
INSERT @Grants VALUES ('ADMIN','INVOICE_DUE_DATE_EXTEND'),('MANAGER','INVOICE_DUE_DATE_EXTEND'),('ACCOUNTANT','INVOICE_DUE_DATE_EXTEND'),
 ('RESIDENT','AI_CHAT'),('RESIDENT','AI_SEARCH'),('RESIDENT','MENU_AI_CHAT_VIEW'),('RESIDENT','MENU_AI_SEARCH_VIEW');
UPDATE rp SET IsGranted=1 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
 JOIN @Grants g ON g.RoleCode=r.RoleCode AND g.PermissionCode=p.PermissionCode;
INSERT RolePermission(RoleID,PermissionID,IsGranted,CreatedAt)
 SELECT r.RoleID,p.PermissionID,1,GETDATE() FROM @Grants g JOIN Role r ON r.RoleCode=g.RoleCode JOIN Permission p ON p.PermissionCode=g.PermissionCode
 WHERE NOT EXISTS(SELECT 1 FROM RolePermission rp WHERE rp.RoleID=r.RoleID AND rp.PermissionID=p.PermissionID);
COMMIT;
GO
