-- Add optional deep-link metadata without changing existing notification behavior.
IF COL_LENGTH('dbo.Notification', 'EntityType') IS NULL
    ALTER TABLE dbo.Notification ADD EntityType varchar(50) NULL;
IF COL_LENGTH('dbo.Notification', 'EntityID') IS NULL
    ALTER TABLE dbo.Notification ADD EntityID int NULL;
IF COL_LENGTH('dbo.Notification', 'TargetPage') IS NULL
    ALTER TABLE dbo.Notification ADD TargetPage varchar(100) NULL;
IF COL_LENGTH('dbo.Notification', 'ActionUrl') IS NULL
    ALTER TABLE dbo.Notification ADD ActionUrl varchar(500) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notification_EntityLink' AND object_id = OBJECT_ID('dbo.Notification'))
    CREATE INDEX IX_Notification_EntityLink ON dbo.Notification(EntityType, EntityID);
GO
