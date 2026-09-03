USE [ApartmentManagement];
GO

SELECT COUNT(*) AS UserTableCount
FROM sys.tables
WHERE is_ms_shipped = 0;