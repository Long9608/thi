-- Backfill links for legacy notifications created before EntityType/EntityID existed.
-- This is a one-time pattern migration; new notifications always write structured metadata.
UPDATE n
SET EntityType = 'Invoice',
    EntityID = TRY_CONVERT(int, LTRIM(RTRIM(SUBSTRING(n.Title, CHARINDEX('#', n.Title) + 1, 20)))),
    TargetPage = 'fees'
FROM dbo.Notification n
WHERE n.EntityType IS NULL
  AND n.Title LIKE N'%hóa đơn #%'
  AND CHARINDEX('#', n.Title) > 0
  AND TRY_CONVERT(int, LTRIM(RTRIM(SUBSTRING(n.Title, CHARINDEX('#', n.Title) + 1, 20)))) IS NOT NULL;

UPDATE n
SET EntityType = 'MaintenanceRequest',
    EntityID = TRY_CONVERT(int, LTRIM(RTRIM(SUBSTRING(n.Title, CHARINDEX('#', n.Title) + 1, 20)))),
    TargetPage = 'tickets'
FROM dbo.Notification n
WHERE n.EntityType IS NULL
  AND (n.Title LIKE N'%yêu cầu #%'
       OR n.Title LIKE N'%bảo trì #%')
  AND CHARINDEX('#', n.Title) > 0
  AND TRY_CONVERT(int, LTRIM(RTRIM(SUBSTRING(n.Title, CHARINDEX('#', n.Title) + 1, 20)))) IS NOT NULL;
