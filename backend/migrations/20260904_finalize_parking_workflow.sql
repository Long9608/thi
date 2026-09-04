SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'ApartmentManagement'
    THROW 51000, 'Migration must run against ApartmentManagement.', 1;

IF OBJECT_ID('dbo.Vehicle', 'U') IS NULL OR OBJECT_ID('dbo.VehicleType', 'U') IS NULL
   OR OBJECT_ID('dbo.ParkingCard', 'U') IS NULL OR OBJECT_ID('dbo.ParkingSlot', 'U') IS NULL
   OR OBJECT_ID('dbo.Contract', 'U') IS NULL OR OBJECT_ID('dbo.ContractResident', 'U') IS NULL
   OR OBJECT_ID('dbo.InvoiceDetail', 'U') IS NULL OR OBJECT_ID('dbo.Users', 'U') IS NULL
    THROW 51001, 'Preflight failed: required base parking/contract/invoice tables are missing.', 1;

IF OBJECT_ID('dbo.ParkingSubscription', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT VehicleID FROM dbo.ParkingSubscription WHERE Status = 'ACTIVE' GROUP BY VehicleID HAVING COUNT(*) > 1)
        THROW 51002, 'Preflight failed: duplicate ACTIVE subscriptions for a vehicle.', 1;
    IF EXISTS (SELECT CardID FROM dbo.ParkingSubscription WHERE Status = 'ACTIVE' GROUP BY CardID HAVING COUNT(*) > 1)
        THROW 51003, 'Preflight failed: duplicate ACTIVE subscriptions for a card.', 1;
END;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('dbo.ParkingSubscription', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ParkingSubscription (
            ParkingSubscriptionID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ParkingSubscription PRIMARY KEY,
            VehicleID INT NOT NULL,
            ContractID INT NOT NULL,
            CardID INT NOT NULL,
            SlotID INT NULL,
            StartDate DATE NOT NULL,
            EndDate DATE NULL,
            MonthlyFeeSnapshot DECIMAL(18,2) NOT NULL,
            Status VARCHAR(20) NOT NULL CONSTRAINT DF_ParkingSubscription_Status DEFAULT ('ACTIVE'),
            CreatedByUserID INT NULL,
            CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingSubscription_CreatedAt DEFAULT (SYSUTCDATETIME()),
            UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingSubscription_UpdatedAt DEFAULT (SYSUTCDATETIME())
        );
    END;

    IF COL_LENGTH('dbo.ParkingSubscription', 'SlotID') IS NULL
        ALTER TABLE dbo.ParkingSubscription ADD SlotID INT NULL;

    IF OBJECT_ID('dbo.ParkingAccessLog', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ParkingAccessLog (
            AccessLogID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ParkingAccessLog PRIMARY KEY,
            ParkingSubscriptionID INT NOT NULL,
            VehicleID INT NOT NULL,
            CardID INT NOT NULL,
            SlotID INT NULL,
            EventType VARCHAR(10) NOT NULL,
            EventTime DATETIME2(0) NOT NULL CONSTRAINT DF_ParkingAccessLog_EventTime DEFAULT (SYSUTCDATETIME()),
            PlateNumberSnapshot VARCHAR(20) NOT NULL,
            CardCodeSnapshot VARCHAR(50) NOT NULL,
            GateName NVARCHAR(100) NULL,
            Note NVARCHAR(500) NULL,
            RecordedByUserID INT NULL
        );
    END;

    IF COL_LENGTH('dbo.InvoiceDetail', 'ParkingSubscriptionID') IS NULL
        ALTER TABLE dbo.InvoiceDetail ADD ParkingSubscriptionID INT NULL;

    /* Backfill only unambiguous cards linked to exactly one currently valid resident contract. */
    ;WITH Candidates AS (
        SELECT pc.CardID, pc.VehicleID, pc.SlotID, c.ContractID,
               CASE WHEN pc.IssueDate < c.StartDate THEN c.StartDate ELSE ISNULL(pc.IssueDate, c.StartDate) END AS StartDate,
               CASE
                   WHEN pc.ExpiredDate IS NULL THEN c.EndDate
                   WHEN c.EndDate IS NULL OR pc.ExpiredDate <= c.EndDate THEN pc.ExpiredDate
                   ELSE c.EndDate
               END AS EndDate,
               ISNULL(vt.MonthlyFee, 0) AS MonthlyFeeSnapshot,
               COUNT(*) OVER (PARTITION BY pc.CardID) AS ContractCount
        FROM dbo.ParkingCard pc
        INNER JOIN dbo.Vehicle v ON v.VehicleID = pc.VehicleID
        INNER JOIN dbo.VehicleType vt ON vt.VehicleTypeID = v.VehicleTypeID
        INNER JOIN dbo.ContractResident cr ON cr.ResidentID = v.ResidentID
        INNER JOIN dbo.Contract c ON c.ContractID = cr.ContractID
        WHERE pc.Status = 1 AND v.Status = 1 AND c.StatusID IN (2, 5)
          AND c.StartDate <= CAST(GETDATE() AS date)
          AND (c.EndDate IS NULL OR c.EndDate >= CAST(GETDATE() AS date))
          AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date))
          AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate >= CAST(GETDATE() AS date))
    )
    INSERT dbo.ParkingSubscription
        (VehicleID, ContractID, CardID, SlotID, StartDate, EndDate, MonthlyFeeSnapshot, Status, CreatedAt, UpdatedAt)
    SELECT VehicleID, ContractID, CardID, SlotID, StartDate, EndDate, MonthlyFeeSnapshot, 'ACTIVE',
           SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM Candidates x
    WHERE ContractCount = 1 AND (EndDate IS NULL OR StartDate <= EndDate)
      AND NOT EXISTS (SELECT 1 FROM dbo.ParkingSubscription s WHERE s.CardID = x.CardID OR s.VehicleID = x.VehicleID)
      AND (SlotID IS NULL OR NOT EXISTS (
          SELECT 1 FROM dbo.ParkingSubscription s WHERE s.Status = 'ACTIVE' AND s.SlotID = x.SlotID
      ));

    IF EXISTS (SELECT SlotID FROM dbo.ParkingSubscription WHERE Status = 'ACTIVE' AND SlotID IS NOT NULL GROUP BY SlotID HAVING COUNT(*) > 1)
        THROW 51004, 'Preflight failed: duplicate ACTIVE subscriptions for a parking slot.', 1;

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_ParkingSubscription_Status')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT CHK_ParkingSubscription_Status CHECK (Status IN ('ACTIVE', 'ENDED'));
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_ParkingSubscription_Dates')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT CHK_ParkingSubscription_Dates CHECK (EndDate IS NULL OR EndDate >= StartDate);
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_ParkingSubscription_MonthlyFee')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT CHK_ParkingSubscription_MonthlyFee CHECK (MonthlyFeeSnapshot >= 0);
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_ParkingAccessLog_EventType')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT CHK_ParkingAccessLog_EventType CHECK (EventType IN ('IN', 'OUT'));

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingSubscription_Vehicle')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT FK_ParkingSubscription_Vehicle FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicle(VehicleID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingSubscription_Contract')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT FK_ParkingSubscription_Contract FOREIGN KEY (ContractID) REFERENCES dbo.Contract(ContractID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingSubscription_Card')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT FK_ParkingSubscription_Card FOREIGN KEY (CardID) REFERENCES dbo.ParkingCard(CardID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingSubscription_Slot')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT FK_ParkingSubscription_Slot FOREIGN KEY (SlotID) REFERENCES dbo.ParkingSlot(SlotID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingSubscription_CreatedBy')
        ALTER TABLE dbo.ParkingSubscription ADD CONSTRAINT FK_ParkingSubscription_CreatedBy FOREIGN KEY (CreatedByUserID) REFERENCES dbo.Users(UserID);

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingAccessLog_Subscription')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT FK_ParkingAccessLog_Subscription FOREIGN KEY (ParkingSubscriptionID) REFERENCES dbo.ParkingSubscription(ParkingSubscriptionID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingAccessLog_Vehicle')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT FK_ParkingAccessLog_Vehicle FOREIGN KEY (VehicleID) REFERENCES dbo.Vehicle(VehicleID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingAccessLog_Card')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT FK_ParkingAccessLog_Card FOREIGN KEY (CardID) REFERENCES dbo.ParkingCard(CardID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingAccessLog_Slot')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT FK_ParkingAccessLog_Slot FOREIGN KEY (SlotID) REFERENCES dbo.ParkingSlot(SlotID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ParkingAccessLog_RecordedBy')
        ALTER TABLE dbo.ParkingAccessLog ADD CONSTRAINT FK_ParkingAccessLog_RecordedBy FOREIGN KEY (RecordedByUserID) REFERENCES dbo.Users(UserID);
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvoiceDetail_ParkingSubscription')
        ALTER TABLE dbo.InvoiceDetail ADD CONSTRAINT FK_InvoiceDetail_ParkingSubscription FOREIGN KEY (ParkingSubscriptionID) REFERENCES dbo.ParkingSubscription(ParkingSubscriptionID);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingSubscription') AND name = 'UQ_ParkingSubscription_ActiveVehicle')
        CREATE UNIQUE INDEX UQ_ParkingSubscription_ActiveVehicle ON dbo.ParkingSubscription(VehicleID) WHERE Status = 'ACTIVE';
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingSubscription') AND name = 'UQ_ParkingSubscription_ActiveCard')
        CREATE UNIQUE INDEX UQ_ParkingSubscription_ActiveCard ON dbo.ParkingSubscription(CardID) WHERE Status = 'ACTIVE';
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingSubscription') AND name = 'UQ_ParkingSubscription_ActiveSlot')
        CREATE UNIQUE INDEX UQ_ParkingSubscription_ActiveSlot ON dbo.ParkingSubscription(SlotID) WHERE Status = 'ACTIVE' AND SlotID IS NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingSubscription') AND name = 'IX_ParkingSubscription_Contract_Dates')
        CREATE INDEX IX_ParkingSubscription_Contract_Dates ON dbo.ParkingSubscription(ContractID, StartDate, EndDate) INCLUDE (Status, MonthlyFeeSnapshot);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingAccessLog') AND name = 'IX_ParkingAccessLog_Vehicle_EventTime')
        CREATE INDEX IX_ParkingAccessLog_Vehicle_EventTime ON dbo.ParkingAccessLog(VehicleID, EventTime DESC, AccessLogID DESC) INCLUDE (EventType);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ParkingAccessLog') AND name = 'IX_ParkingAccessLog_EventTime')
        CREATE INDEX IX_ParkingAccessLog_EventTime ON dbo.ParkingAccessLog(EventTime DESC);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.InvoiceDetail') AND name = 'IX_InvoiceDetail_ParkingSubscription')
        CREATE INDEX IX_InvoiceDetail_ParkingSubscription ON dbo.InvoiceDetail(ParkingSubscriptionID) WHERE ParkingSubscriptionID IS NOT NULL;

    /* Reconcile the derived reservation flag; it never represents physical presence. */
    UPDATE ps SET IsOccupied = CASE WHEN EXISTS (
        SELECT 1 FROM dbo.ParkingSubscription sub WHERE sub.SlotID = ps.SlotID AND sub.Status = 'ACTIVE'
    ) THEN 1 ELSE 0 END
    FROM dbo.ParkingSlot ps;

    IF OBJECT_ID('dbo.Module', 'U') IS NOT NULL AND OBJECT_ID('dbo.Permission', 'U') IS NOT NULL
    BEGIN
        DECLARE @ModuleID INT;
        SELECT TOP (1) @ModuleID = ModuleID FROM dbo.Module WHERE ModuleCode IN ('PARKING', 'VEHICLES') ORDER BY CASE WHEN ModuleCode = 'PARKING' THEN 0 ELSE 1 END;
        IF @ModuleID IS NULL
        BEGIN
            INSERT dbo.Module(ModuleCode, ModuleName, Icon, SortOrder, Status) VALUES ('PARKING', N'Gửi xe', 'Car', 70, 1);
            SET @ModuleID = SCOPE_IDENTITY();
        END;

        DECLARE @Permissions TABLE(Code VARCHAR(100), Name NVARCHAR(150));
        INSERT @Permissions VALUES
          ('PARKING_VIEW',N'Xem dữ liệu gửi xe'),('VEHICLE_CREATE',N'Tạo xe'),('VEHICLE_UPDATE',N'Cập nhật xe'),
          ('VEHICLE_DELETE',N'Vô hiệu xe'),('CARD_CREATE',N'Cấp thẻ'),('CARD_UPDATE',N'Cập nhật thẻ'),
          ('PARKING_HISTORY',N'Xem lịch sử ra vào'),('PARKING_SLOT_MANAGE',N'Quản lý chỗ đỗ'),
          ('PARKING_ACCESS_CREATE',N'Ghi nhận xe ra vào');
        INSERT dbo.Permission(ModuleID, PermissionCode, PermissionName, Description)
        SELECT @ModuleID, p.Code, p.Name, p.Name FROM @Permissions p
        WHERE NOT EXISTS (SELECT 1 FROM dbo.Permission x WHERE x.PermissionCode = p.Code);

        IF OBJECT_ID('dbo.RolePermission', 'U') IS NOT NULL AND OBJECT_ID('dbo.Role', 'U') IS NOT NULL
        BEGIN
            INSERT dbo.RolePermission(RoleID, PermissionID, IsGranted)
            SELECT r.RoleID, p.PermissionID, 1
            FROM dbo.Role r CROSS JOIN dbo.Permission p
            WHERE r.RoleCode IN ('ADMIN', 'MANAGER') AND p.PermissionCode IN (SELECT Code FROM @Permissions)
              AND NOT EXISTS (SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);
            INSERT dbo.RolePermission(RoleID, PermissionID, IsGranted)
            SELECT r.RoleID, p.PermissionID, 1
            FROM dbo.Role r CROSS JOIN dbo.Permission p
            WHERE r.RoleCode IN ('SECURITY', 'GUARD', 'BAOVE')
              AND p.PermissionCode IN ('PARKING_VIEW','PARKING_HISTORY','PARKING_ACCESS_CREATE')
              AND NOT EXISTS (SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID);
        END;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT N'Parking workflow migration completed successfully.' AS Result;
