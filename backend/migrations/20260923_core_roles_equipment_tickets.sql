SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE dbo.MaintenanceRequest SET Progress=100 WHERE StatusID=3 AND Progress<>100;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_MaintenanceRequest_Progress')
    ALTER TABLE dbo.MaintenanceRequest WITH CHECK ADD CONSTRAINT CK_MaintenanceRequest_Progress CHECK(Progress BETWEEN 0 AND 100);
-- Only these two role codes define core authorization/account identity behavior.
UPDATE dbo.Role SET IsSystem=CASE WHEN RoleCode IN ('ADMIN','RESIDENT') THEN 1 ELSE 0 END
WHERE RoleCode IN ('ADMIN','RESIDENT','MANAGER','ACCOUNTANT','TECHNICIAN','SECURITY','RECEPTION');
IF COL_LENGTH('dbo.MaintenanceRequest','ContractEquipmentID') IS NULL
    ALTER TABLE dbo.MaintenanceRequest ADD ContractEquipmentID int NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_MaintenanceRequest_ContractEquipment')
    EXEC(N'ALTER TABLE dbo.MaintenanceRequest WITH CHECK ADD CONSTRAINT FK_MaintenanceRequest_ContractEquipment FOREIGN KEY(ContractEquipmentID) REFERENCES dbo.ContractEquipment(ContractEquipmentID)');
COMMIT;
