-- Enables authorized staff to create electricity and water meter readings.
-- Safe to run multiple times on an existing database.
BEGIN TRANSACTION;

DECLARE @PermissionID INT;

SELECT @PermissionID = PermissionID
FROM Permission
WHERE PermissionCode = 'METER_READING_CREATE';

IF @PermissionID IS NULL
BEGIN
    INSERT INTO Permission (ModuleID, PermissionCode, PermissionName, Description)
    SELECT ModuleID,
           'METER_READING_CREATE',
           N'Nhập chỉ số điện nước',
           N'Cho phép tạo chỉ số công tơ điện và nước'
    FROM Module
    WHERE ModuleCode = 'SERVICE';

    SELECT @PermissionID = PermissionID
    FROM Permission
    WHERE PermissionCode = 'METER_READING_CREATE';
END;

IF @PermissionID IS NULL
    THROW 50000, 'The SERVICE module was not found; meter-reading permission was not created.', 1;

INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, @PermissionID, 1, GETDATE()
FROM Role r
WHERE r.RoleCode IN ('ADMIN', 'MANAGER', 'TECHNICIAN')
  AND NOT EXISTS (
      SELECT 1
      FROM RolePermission rp
      WHERE rp.RoleID = r.RoleID
        AND rp.PermissionID = @PermissionID
  );

COMMIT TRANSACTION;
