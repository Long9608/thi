require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPool, closePool } = require('../config/db');
(async () => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT r.RoleCode,r.RoleName,r.Status, COUNT(DISTINCT ur.UserID) Users,
      STRING_AGG(CAST(CASE WHEN rp.IsGranted=1 THEN p.PermissionCode END AS nvarchar(max)), ',') Permissions
    FROM Role r LEFT JOIN UserRole ur ON ur.RoleID=r.RoleID
    LEFT JOIN RolePermission rp ON rp.RoleID=r.RoleID LEFT JOIN Permission p ON p.PermissionID=rp.PermissionID
    GROUP BY r.RoleCode,r.RoleName,r.Status;
    SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN ('MaintenanceRequest','MaintenanceStatus','Notification','NotificationReceiver','Payment','PaymentMethod','Invoice','Role','ContractEquipment','SystemSetting');
    SELECT * FROM MaintenanceStatus; SELECT * FROM PaymentMethod; SELECT * FROM InvoiceStatus;
    SELECT ModuleID, ModuleCode FROM Module;
    SELECT OBJECT_NAME(parent_object_id) TableName, name FK FROM sys.foreign_keys WHERE referenced_object_id=OBJECT_ID('Role');
    SELECT name FROM sys.tables WHERE name LIKE '%Setting%' OR name LIKE '%Device%' OR name LIKE '%Equipment%';
    SELECT YEAR(PaymentDate) PaymentYear,MONTH(PaymentDate) PaymentMonth,StatusID,COUNT(*) Payments,SUM(Amount) Amount FROM Payment GROUP BY YEAR(PaymentDate),MONTH(PaymentDate),StatusID;
    SELECT StatusID,WorkflowStatus,COUNT(*) Invoices,SUM(TotalAmount) Total FROM Invoice GROUP BY StatusID,WorkflowStatus;
  `);
  result.recordsets.forEach((rows, index) => console.log(JSON.stringify({index,rows})));
})().catch(e => { console.error(e.message); process.exitCode=1; }).finally(closePool);
