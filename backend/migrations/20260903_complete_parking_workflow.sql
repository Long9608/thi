SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- ======================================================
-- Migration: Hoàn thiện luồng nghiệp vụ Parking (Đức Vũ Tower)
-- Ngày: 2026-09-03
-- Mô tả: Tạo bảng đăng ký gửi xe, log ra vào, bổ sung ràng buộc,
--        backfill dữ liệu, cấp quyền và kiểm tra.
-- Yêu cầu: Chạy được trên SQL Server Express / Azure SQL
-- ======================================================

-- ======================================================
-- 1. Tạo bảng dbo.ParkingSubscription
-- ======================================================
IF OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingSubscription (
        ParkingSubscriptionID INT IDENTITY(1,1) NOT NULL,
        VehicleID INT NOT NULL,
        ContractID INT NOT NULL,
        CardID INT NOT NULL,                      -- Tham chiếu ParkingCard.CardID
        StartDate DATE NOT NULL,
        EndDate DATE NULL,
        MonthlyFeeSnapshot DECIMAL(18,2) NOT NULL,
        Status VARCHAR(20) NOT NULL
            CONSTRAINT DF_ParkingSubscription_Status DEFAULT ('ACTIVE'),
        CreatedByUserID INT NULL,
        CreatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_ParkingSubscription_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_ParkingSubscription_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ParkingSubscription PRIMARY KEY (ParkingSubscriptionID),

        CONSTRAINT FK_ParkingSubscription_Vehicle
            FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicle(VehicleID),

        CONSTRAINT FK_ParkingSubscription_Contract
            FOREIGN KEY (ContractID) REFERENCES dbo.Contract(ContractID),

        CONSTRAINT FK_ParkingSubscription_ParkingCard
            FOREIGN KEY (CardID) REFERENCES dbo.ParkingCard(CardID),

        CONSTRAINT FK_ParkingSubscription_Users
            FOREIGN KEY (CreatedByUserID) REFERENCES dbo.Users(UserID),

        CONSTRAINT CHK_ParkingSubscription_MonthlyFee
            CHECK (MonthlyFeeSnapshot >= 0),

        CONSTRAINT CHK_ParkingSubscription_Dates
            CHECK (EndDate IS NULL OR EndDate >= StartDate),

        CONSTRAINT CHK_ParkingSubscription_Status
            CHECK (Status IN ('ACTIVE', 'SUSPENDED', 'ENDED'))
    );
END
GO

-- ======================================================
-- 2. Tạo các index cho dbo.ParkingSubscription
-- ======================================================
-- Unique Filtered Index: Mỗi Vehicle chỉ có 1 đăng ký ACTIVE
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UQ_ParkingSubscription_ActiveVehicle'
               AND object_id = OBJECT_ID('dbo.ParkingSubscription'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ParkingSubscription_ActiveVehicle
    ON dbo.ParkingSubscription (VehicleID)
    WHERE Status = 'ACTIVE';
END
GO

-- Unique Filtered Index: Mỗi Card chỉ có 1 đăng ký ACTIVE
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UQ_ParkingSubscription_ActiveCard'
               AND object_id = OBJECT_ID('dbo.ParkingSubscription'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ParkingSubscription_ActiveCard
    ON dbo.ParkingSubscription (CardID)
    WHERE Status = 'ACTIVE';
END
GO

-- Index hỗ trợ lập hóa đơn theo ContractID và kỳ thời gian
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ParkingSubscription_Contract_Status_Dates'
               AND object_id = OBJECT_ID('dbo.ParkingSubscription'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ParkingSubscription_Contract_Status_Dates
    ON dbo.ParkingSubscription (ContractID, Status, StartDate, EndDate)
    INCLUDE (MonthlyFeeSnapshot);
END
GO

-- ======================================================
-- 3. Tạo bảng dbo.ParkingAccessLog
-- ======================================================
IF OBJECT_ID('dbo.ParkingAccessLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingAccessLog (
        AccessLogID BIGINT IDENTITY(1,1) NOT NULL,
        ParkingSubscriptionID INT NOT NULL,
        VehicleID INT NOT NULL,
        CardID INT NOT NULL,                      -- Tham chiếu ParkingCard.CardID
        SlotID INT NULL,                          -- Tham chiếu ParkingSlot.SlotID
        EventType VARCHAR(10) NOT NULL,
        EventTime DATETIME2 NOT NULL
            CONSTRAINT DF_ParkingAccessLog_EventTime DEFAULT (SYSUTCDATETIME()),
        PlateNumberSnapshot VARCHAR(20) NOT NULL,
        CardCodeSnapshot VARCHAR(50) NOT NULL,
        GateName NVARCHAR(100) NULL,
        Note NVARCHAR(255) NULL,
        RecordedByUserID INT NULL,

        CONSTRAINT PK_ParkingAccessLog PRIMARY KEY (AccessLogID),

        CONSTRAINT FK_ParkingAccessLog_ParkingSubscription
            FOREIGN KEY (ParkingSubscriptionID)
            REFERENCES dbo.ParkingSubscription(ParkingSubscriptionID),

        CONSTRAINT FK_ParkingAccessLog_Vehicle
            FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicle(VehicleID),

        CONSTRAINT FK_ParkingAccessLog_ParkingCard
            FOREIGN KEY (CardID) REFERENCES dbo.ParkingCard(CardID),

        CONSTRAINT FK_ParkingAccessLog_ParkingSlot
            FOREIGN KEY (SlotID) REFERENCES dbo.ParkingSlot(SlotID),

        CONSTRAINT FK_ParkingAccessLog_Users
            FOREIGN KEY (RecordedByUserID) REFERENCES dbo.Users(UserID),

        CONSTRAINT CHK_ParkingAccessLog_EventType
            CHECK (EventType IN ('IN', 'OUT'))
    );
END
GO

-- ======================================================
-- 4. Tạo các index cho dbo.ParkingAccessLog
-- ======================================================
-- Index theo thời gian
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ParkingAccessLog_EventTime'
               AND object_id = OBJECT_ID('dbo.ParkingAccessLog'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ParkingAccessLog_EventTime
    ON dbo.ParkingAccessLog (EventTime DESC);
END
GO

-- Index theo Subscription (có EventTime và AccessLogID để hỗ trợ truy vấn)
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ParkingAccessLog_Subscription'
               AND object_id = OBJECT_ID('dbo.ParkingAccessLog'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ParkingAccessLog_Subscription
    ON dbo.ParkingAccessLog (ParkingSubscriptionID, EventTime DESC, AccessLogID DESC);
END
GO

-- Index theo biển số
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ParkingAccessLog_PlateNumber'
               AND object_id = OBJECT_ID('dbo.ParkingAccessLog'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ParkingAccessLog_PlateNumber
    ON dbo.ParkingAccessLog (PlateNumberSnapshot);
END
GO

-- Index theo mã thẻ
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ParkingAccessLog_CardCode'
               AND object_id = OBJECT_ID('dbo.ParkingAccessLog'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ParkingAccessLog_CardCode
    ON dbo.ParkingAccessLog (CardCodeSnapshot);
END
GO

-- ======================================================
-- 5. Bổ sung cột ParkingSubscriptionID cho InvoiceDetail
--    (Mỗi bước kiểm tra riêng)
-- ======================================================
IF COL_LENGTH('dbo.InvoiceDetail', 'ParkingSubscriptionID') IS NULL
BEGIN
    ALTER TABLE dbo.InvoiceDetail
    ADD ParkingSubscriptionID INT NULL;
END
GO

-- Thêm FK nếu chưa có
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys
               WHERE name = 'FK_InvoiceDetail_ParkingSubscription')
BEGIN
    ALTER TABLE dbo.InvoiceDetail
    ADD CONSTRAINT FK_InvoiceDetail_ParkingSubscription
    FOREIGN KEY (ParkingSubscriptionID)
    REFERENCES dbo.ParkingSubscription(ParkingSubscriptionID);
END
GO

-- Thêm index nếu chưa có
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_InvoiceDetail_ParkingSubscription'
               AND object_id = OBJECT_ID('dbo.InvoiceDetail'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceDetail_ParkingSubscription
    ON dbo.InvoiceDetail (ParkingSubscriptionID);
END
GO

-- ======================================================
-- 6. Unique Filtered Index cho ParkingCard.SlotID
--    (Kiểm tra conflict trước khi tạo, không tự xóa)
-- ======================================================
IF EXISTS (
    SELECT 1
    FROM dbo.ParkingCard
    WHERE Status = 1 AND SlotID IS NOT NULL
    GROUP BY SlotID
    HAVING COUNT(*) > 1
)
BEGIN
    DECLARE @ConflictSlotIDs NVARCHAR(MAX);
    SELECT @ConflictSlotIDs = STRING_AGG(CAST(SlotID AS NVARCHAR(20)), ', ')
    FROM (
        SELECT SlotID
        FROM dbo.ParkingCard
        WHERE Status = 1 AND SlotID IS NOT NULL
        GROUP BY SlotID
        HAVING COUNT(*) > 1
    ) AS Conflicts;

    DECLARE @ErrorMessage NVARCHAR(4000);
    SET @ErrorMessage = N'Không thể tạo index UQ_ParkingCard_ActiveSlot. Có nhiều thẻ đang hoạt động (Status=1) cùng thuộc một SlotID. SlotID xung đột: ' + ISNULL(@ConflictSlotIDs, '');
    THROW 50000, @ErrorMessage, 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UQ_ParkingCard_ActiveSlot'
               AND object_id = OBJECT_ID('dbo.ParkingCard'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_ParkingCard_ActiveSlot
    ON dbo.ParkingCard (SlotID)
    WHERE Status = 1 AND SlotID IS NOT NULL;
END
GO

-- ======================================================
-- 7. Backfill dữ liệu cho ParkingSubscription
-- ======================================================
INSERT INTO dbo.ParkingSubscription (
    VehicleID,
    ContractID,
    CardID,
    StartDate,
    EndDate,
    MonthlyFeeSnapshot,
    Status,
    CreatedByUserID,
    CreatedAt,
    UpdatedAt
)
SELECT
    v.VehicleID,
    c.ContractID,
    pc.CardID,
    ISNULL(pc.IssueDate, CAST(GETDATE() AS DATE)) AS StartDate,
    pc.ExpiredDate AS EndDate,
    ISNULL(vt.MonthlyFee, 0) AS MonthlyFeeSnapshot,
    'ACTIVE' AS Status,
    NULL AS CreatedByUserID,
    SYSUTCDATETIME() AS CreatedAt,
    SYSUTCDATETIME() AS UpdatedAt
FROM dbo.ParkingCard pc
INNER JOIN dbo.Vehicle v
    ON pc.VehicleID = v.VehicleID
INNER JOIN dbo.VehicleType vt
    ON v.VehicleTypeID = vt.VehicleTypeID
OUTER APPLY (
    SELECT TOP 1 c.ContractID
    FROM dbo.ContractResident cr
    INNER JOIN dbo.Contract c
        ON cr.ContractID = c.ContractID
    WHERE cr.ResidentID = v.ResidentID
      AND c.StatusID IN (2, 5)
      AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate > ISNULL(pc.IssueDate, GETDATE()))
    ORDER BY
        -- Ưu tiên hợp đồng có khoảng thời gian giao nhau với thẻ
        CASE WHEN c.StartDate <= ISNULL(pc.ExpiredDate, CONVERT(date, '99991231', 112))
                  AND c.EndDate >= ISNULL(pc.IssueDate, CAST(GETDATE() AS date))
             THEN 0 ELSE 1 END,
        -- Tiếp theo ưu tiên cư dân chưa MoveOut
        CASE WHEN cr.MoveOutDate IS NULL THEN 0 ELSE 1 END,
        -- Sau đó ưu tiên hợp đồng mới nhất
        c.StartDate DESC,
        -- Cuối cùng ưu tiên hợp đồng có thời gian kết thúc xa nhất (NULL xếp cuối)
        CASE WHEN c.EndDate IS NULL THEN 1 ELSE 0 END,
        c.EndDate DESC,
        -- Để kết quả xác định, thêm ContractID DESC
        c.ContractID DESC
) c
WHERE pc.Status = 1
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.ParkingSubscription ps
      WHERE ps.Status = 'ACTIVE'
        AND (ps.CardID = pc.CardID OR ps.VehicleID = v.VehicleID)
  )
  AND c.ContractID IS NOT NULL;
GO

-- ======================================================
-- 8. Đồng bộ trạng thái ParkingSlot.IsOccupied
-- ======================================================
IF COL_LENGTH('dbo.ParkingSlot', 'IsOccupied') IS NOT NULL
BEGIN
    UPDATE ps
    SET IsOccupied = CASE
        WHEN EXISTS (
            SELECT 1
            FROM dbo.ParkingCard pc
            WHERE pc.SlotID = ps.SlotID
              AND pc.Status = 1
        ) THEN 1
        ELSE 0
    END
    FROM dbo.ParkingSlot ps;
END
GO

-- ======================================================
-- 9. Thêm Module PARKING (nếu chưa có)
--    Lưu ý: Module không có cột Description
-- ======================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Module WHERE ModuleCode = 'PARKING')
BEGIN
    INSERT INTO dbo.Module (ModuleCode, ModuleName, Icon, SortOrder, Status)
    VALUES ('PARKING', N'Quản lý bãi đỗ xe', 'fa-parking', 99, 1);
END
GO

-- ======================================================
-- 10. Thêm các PermissionCode mới (nếu chưa tồn tại)
-- ======================================================
DECLARE @ParkingModuleID INT;
SELECT @ParkingModuleID = ModuleID FROM dbo.Module WHERE ModuleCode = 'PARKING';

IF @ParkingModuleID IS NOT NULL
BEGIN
    -- VEHICLE_UPDATE
    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'VEHICLE_UPDATE')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (@ParkingModuleID, 'VEHICLE_UPDATE', N'Cập nhật phương tiện', N'Cho phép sửa thông tin phương tiện');
    END

    -- VEHICLE_DELETE
    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'VEHICLE_DELETE')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (@ParkingModuleID, 'VEHICLE_DELETE', N'Xóa phương tiện', N'Cho phép xóa phương tiện');
    END

    -- CARD_UPDATE
    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'CARD_UPDATE')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (@ParkingModuleID, 'CARD_UPDATE', N'Cập nhật thẻ xe', N'Cho phép sửa thông tin thẻ xe');
    END

    -- PARKING_SLOT_MANAGE
    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'PARKING_SLOT_MANAGE')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (@ParkingModuleID, 'PARKING_SLOT_MANAGE', N'Quản lý vị trí đỗ', N'Cho phép thêm, sửa, xóa vị trí đỗ xe');
    END

    -- PARKING_ACCESS_CREATE
    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'PARKING_ACCESS_CREATE')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (@ParkingModuleID, 'PARKING_ACCESS_CREATE', N'Tạo log ra vào', N'Cho phép ghi nhận sự kiện xe ra/vào');
    END
END
GO

-- ======================================================
-- 11. Phân quyền theo RoleName (không hard-code ID)
--     Nếu quyền đã tồn tại nhưng IsGranted = 0 hoặc NULL -> cập nhật thành 1
-- ======================================================
DECLARE @Perm_VehicleUpdate INT, @Perm_VehicleDelete INT,
        @Perm_CardUpdate INT, @Perm_SlotManage INT, @Perm_AccessCreate INT;

SELECT @Perm_VehicleUpdate = PermissionID FROM dbo.Permission WHERE PermissionCode = 'VEHICLE_UPDATE';
SELECT @Perm_VehicleDelete = PermissionID FROM dbo.Permission WHERE PermissionCode = 'VEHICLE_DELETE';
SELECT @Perm_CardUpdate    = PermissionID FROM dbo.Permission WHERE PermissionCode = 'CARD_UPDATE';
SELECT @Perm_SlotManage    = PermissionID FROM dbo.Permission WHERE PermissionCode = 'PARKING_SLOT_MANAGE';
SELECT @Perm_AccessCreate  = PermissionID FROM dbo.Permission WHERE PermissionCode = 'PARKING_ACCESS_CREATE';

DECLARE @RoleCode VARCHAR(50), @PermID INT, @CurrentRoleID INT;
DECLARE role_perm_cursor CURSOR FOR
SELECT r.RoleCode, RolePermissions.PermissionID
FROM (VALUES
    ('ADMIN', @Perm_VehicleUpdate),
    ('ADMIN', @Perm_VehicleDelete),
    ('ADMIN', @Perm_CardUpdate),
    ('ADMIN', @Perm_SlotManage),
    ('ADMIN', @Perm_AccessCreate),
    ('MANAGER', @Perm_VehicleUpdate),
    ('MANAGER', @Perm_VehicleDelete),
    ('MANAGER', @Perm_CardUpdate),
    ('MANAGER', @Perm_SlotManage),
    ('MANAGER', @Perm_AccessCreate),
    ('SECURITY', @Perm_AccessCreate),
    ('RECEPTION', @Perm_VehicleUpdate),
    ('RECEPTION', @Perm_CardUpdate)
) AS RolePermissions(RoleCode, PermissionID)
INNER JOIN dbo.Role r ON r.RoleCode = RolePermissions.RoleCode
WHERE RolePermissions.PermissionID IS NOT NULL;

OPEN role_perm_cursor;
FETCH NEXT FROM role_perm_cursor INTO @RoleCode, @PermID;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @CurrentRoleID = RoleID FROM dbo.Role WHERE RoleCode = @RoleCode;

    IF NOT EXISTS (SELECT 1 FROM dbo.RolePermission WHERE RoleID = @CurrentRoleID AND PermissionID = @PermID)
    BEGIN
        INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
        VALUES (@CurrentRoleID, @PermID, 1, GETDATE());
    END
    ELSE
    BEGIN
        UPDATE dbo.RolePermission
        SET IsGranted = 1
        WHERE RoleID = @CurrentRoleID
          AND PermissionID = @PermID
          AND ISNULL(IsGranted, 0) = 0;
    END

    FETCH NEXT FROM role_perm_cursor INTO @RoleCode, @PermID;
END
CLOSE role_perm_cursor;
DEALLOCATE role_perm_cursor;
GO

-- ======================================================
-- 12. Kiểm tra sau migration (SELECT)
-- ======================================================
-- (A) Hai bảng mới (có OBJECT_ID)
SELECT 'Table_Check' AS CheckName,
       COUNT(*) AS RecordCount,
       OBJECT_ID('dbo.ParkingSubscription') AS ParkingSubscription_ObjectID,
       OBJECT_ID('dbo.ParkingAccessLog') AS ParkingAccessLog_ObjectID
FROM dbo.ParkingSubscription
UNION ALL
SELECT 'Table_Check',
       COUNT(*),
       OBJECT_ID('dbo.ParkingSubscription'),
       OBJECT_ID('dbo.ParkingAccessLog')
FROM dbo.ParkingAccessLog;

-- (B) Tổng số đăng ký (Subscription) đang hoạt động
SELECT 'Active_Subscription_Count' AS Metric, COUNT(*) AS Value
FROM dbo.ParkingSubscription
WHERE Status = 'ACTIVE';

-- (C) Tổng số log ra vào
SELECT 'Total_Access_Logs' AS Metric, COUNT(*) AS Value
FROM dbo.ParkingAccessLog;

-- (D) Kiểm tra thẻ và vị trí đỗ bị lệch (Slot có IsOccupied=1 nhưng không có thẻ hoạt động, hoặc ngược lại)
SELECT 'Occupied_Slot_No_Active_Card' AS CheckType,
       ps.SlotID,
       ps.SlotNumber,
       ps.IsOccupied
FROM dbo.ParkingSlot ps
WHERE ps.IsOccupied = 1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.ParkingCard pc
      WHERE pc.SlotID = ps.SlotID AND pc.Status = 1
  )
UNION ALL
SELECT 'Active_Card_No_Occupied_Slot',
       ps.SlotID,
       ps.SlotNumber,
       ps.IsOccupied
FROM dbo.ParkingSlot ps
WHERE EXISTS (
      SELECT 1 FROM dbo.ParkingCard pc
      WHERE pc.SlotID = ps.SlotID AND pc.Status = 1
  )
  AND ps.IsOccupied = 0;

-- (E) Danh sách các Permission vừa thêm trong module PARKING
SELECT p.PermissionCode, p.PermissionName, m.ModuleCode
FROM dbo.Permission p
JOIN dbo.Module m ON p.ModuleID = m.ModuleID
WHERE m.ModuleCode = 'PARKING'
  AND p.PermissionCode IN (
      'VEHICLE_UPDATE',
      'VEHICLE_DELETE',
      'CARD_UPDATE',
      'PARKING_SLOT_MANAGE',
      'PARKING_ACCESS_CREATE'
  )
ORDER BY p.PermissionCode;
GO