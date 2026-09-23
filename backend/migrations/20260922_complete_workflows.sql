SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Role', 'IsSystem') IS NULL
    ALTER TABLE dbo.Role ADD IsSystem bit NOT NULL CONSTRAINT DF_Role_IsSystem DEFAULT 0;
EXEC(N'UPDATE dbo.Role SET IsSystem=1 WHERE RoleCode IN (''ADMIN'',''RESIDENT'')');
IF COL_LENGTH('dbo.MaintenanceRequest','Progress') IS NULL
    ALTER TABLE dbo.MaintenanceRequest ADD Progress int NOT NULL CONSTRAINT DF_Maintenance_Progress DEFAULT 0,
        Response nvarchar(max) NULL, UpdatedAt datetime2 NULL, CompletedAt datetime2 NULL;
IF OBJECT_ID('dbo.TicketUpdate','U') IS NULL
    CREATE TABLE dbo.TicketUpdate (
        UpdateID int IDENTITY PRIMARY KEY, RequestID int NOT NULL REFERENCES dbo.MaintenanceRequest(RequestID) ON DELETE CASCADE,
        ActorID int NOT NULL REFERENCES dbo.Users(UserID), StatusID int NOT NULL REFERENCES dbo.MaintenanceStatus(StatusID),
        Progress int NOT NULL CHECK (Progress BETWEEN 0 AND 100), Response nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME()
    );
IF OBJECT_ID('dbo.InvoicePaymentSubmission','U') IS NULL
    CREATE TABLE dbo.InvoicePaymentSubmission (
        InvoiceID int PRIMARY KEY REFERENCES dbo.Invoice(InvoiceID),
        SubmittedBy int NOT NULL REFERENCES dbo.Users(UserID), SubmittedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
        Amount decimal(18,2) NOT NULL CHECK (Amount > 0), TransferContent varchar(100) NOT NULL,
        ConfirmedBy int NULL REFERENCES dbo.Users(UserID), ConfirmedAt datetime2 NULL,
        PaymentID int NULL REFERENCES dbo.Payment(PaymentID)
    );
IF OBJECT_ID('dbo.PaymentConfiguration','U') IS NULL
    CREATE TABLE dbo.PaymentConfiguration (
        ConfigKey varchar(30) PRIMARY KEY, BankBin varchar(6) NOT NULL,
        AccountNumber varchar(30) NOT NULL, AccountName nvarchar(150) NOT NULL
    );

DECLARE @NewPermissions TABLE(ModuleCode varchar(50), Code varchar(100), Name nvarchar(200));
INSERT @NewPermissions VALUES
('SERVICE','SERVICE_VIEW_OWN',N'Xem dịch vụ của mình'),('SERVICE','SERVICE_VIEW_ALL',N'Xem tất cả dịch vụ'),
('OPERATION','TICKET_VIEW_OWN',N'Xem yêu cầu của mình và việc kỹ thuật có thể nhận'),
('SETTING','PROFILE_UPDATE',N'Cập nhật hồ sơ cá nhân'),('SETTING','PASSWORD_CHANGE',N'Đổi mật khẩu'),
('NOTIFICATION','NOTIFICATION_VIEW_OWN',N'Xem thông báo của mình');
INSERT dbo.Permission(ModuleID,PermissionCode,PermissionName)
SELECT m.ModuleID,n.Code,n.Name FROM @NewPermissions n JOIN Module m ON m.ModuleCode=n.ModuleCode
WHERE NOT EXISTS(SELECT 1 FROM Permission p WHERE p.PermissionCode=n.Code);

DECLARE @Grants TABLE(RoleCode varchar(50), PermissionCode varchar(100));
INSERT @Grants SELECT RoleCode,p.Code FROM Role CROSS JOIN (VALUES('PROFILE_UPDATE'),('PASSWORD_CHANGE'),('NOTIFICATION_VIEW_OWN')) p(Code) WHERE Status=1;
INSERT @Grants VALUES
('TECHNICIAN','TICKET_VIEW_OWN'),('TECHNICIAN','MAINTENANCE_UPDATE'),
('RESIDENT','SERVICE_VIEW_OWN'),('RESIDENT','SERVICE_VIEW'),('RESIDENT','SERVICE_REGISTRATION_CREATE'),('RESIDENT','SERVICE_REGISTRATION_UPDATE'),('RESIDENT','FEEDBACK_CREATE'),
('ADMIN','SERVICE_VIEW_ALL'),('MANAGER','SERVICE_VIEW_ALL'),('ACCOUNTANT','SERVICE_VIEW_ALL'),('ACCOUNTANT','SERVICE_VIEW');
UPDATE rp SET IsGranted=1 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
JOIN @Grants g ON g.RoleCode=r.RoleCode AND g.PermissionCode=p.PermissionCode;
INSERT RolePermission(RoleID,PermissionID,IsGranted,CreatedAt)
SELECT DISTINCT r.RoleID,p.PermissionID,1,GETDATE() FROM @Grants g JOIN Role r ON r.RoleCode=g.RoleCode JOIN Permission p ON p.PermissionCode=g.PermissionCode
WHERE NOT EXISTS(SELECT 1 FROM RolePermission rp WHERE rp.RoleID=r.RoleID AND rp.PermissionID=p.PermissionID);
-- Remove known accidental administrative grants, without granting global reads from a menu permission.
UPDATE rp SET IsGranted=0 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
WHERE (r.RoleCode='RESIDENT' AND (p.PermissionCode LIKE '%[_]VIEW[_]ALL' OR p.PermissionCode IN ('SYSTEM_SETTING','MENU_SYSTEM_INFO_VIEW','AI_CHAT','AI_SEARCH')))
   OR (r.RoleCode='TECHNICIAN' AND p.PermissionCode IN ('TICKET_VIEW_ALL','TICKET_CREATE'))
   OR (r.RoleCode='SECURITY' AND p.PermissionCode IN ('RESIDENT_EXPORT','FEEDBACK_VIEW_ALL','FEEDBACK_VIEW_OWN','TICKET_VIEW_ALL','TICKET_VIEW_OWN','NOTIFICATION_VIEW_ALL'));
COMMIT;
