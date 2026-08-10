-- One independent view permission for every sidebar menu item.
BEGIN TRANSACTION;

DECLARE @Items TABLE (MenuID VARCHAR(50), ModuleID INT);
INSERT INTO @Items VALUES
('dashboard',1),('quick-report',11),('residents',2),('buildings',3),('contract-list',4),
('electricity',5),('water',5),('register-service',5),('gym',5),('pool',5),('event-space',5),
('fees',6),('payments',6),('debts',6),('fee-collection',6),('revenue',11),
('vehicles',7),('vehicle-cards',7),('parking-lot',7),('parking-history',7),
('tickets',8),('maintenance',8),('feedbacks',8),('maintenance-schedule',8),('equipment',8),
('notifications',9),('send-notification',9),('schedule-notification',9),
('employees',10),('permissions',10),('roles',10),('system-logs',10),
('revenue-report',11),('debt-report',11),('apartment-report',11),('service-report',11),('export-excel',11),('export-pdf',11),
('ai-chat',12),('ai-stats',12),('ai-predict',12),('ai-search',12),
('profile',13),('change-password',13),('system-info',13);

INSERT INTO Permission (ModuleID, PermissionCode, PermissionName, Description)
SELECT i.ModuleID,
       'MENU_' + UPPER(REPLACE(i.MenuID, '-', '_')) + '_VIEW',
       N'Xem menu: ' + i.MenuID,
       N'Quyền xem độc lập cho từng chức năng trên thanh menu'
FROM @Items i
WHERE NOT EXISTS (SELECT 1 FROM Permission p WHERE p.PermissionCode = 'MENU_' + UPPER(REPLACE(i.MenuID, '-', '_')) + '_VIEW');

-- Keep the administrator able to access every menu immediately after migration.
INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM Role r CROSS JOIN Permission p
WHERE r.RoleCode = 'ADMIN' AND p.PermissionCode LIKE 'MENU[_]%[_]VIEW'
  AND NOT EXISTS (SELECT 1 FROM RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);

COMMIT TRANSACTION;
