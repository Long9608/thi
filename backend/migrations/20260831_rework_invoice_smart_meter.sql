USE ApartmentManagement;
GO

DECLARE @MeterPermissionID INT;

SELECT @MeterPermissionID = PermissionID
FROM dbo.Permission
WHERE PermissionCode = 'METER_READING_CREATE';

IF @MeterPermissionID IS NULL
BEGIN
    INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
    SELECT ModuleID,
           'METER_READING_CREATE',
           N'Mô phỏng/chốt chỉ số điện nước',
           N'Cho phép chạy demo smart meter và chốt MeterReading khi tạo hóa đơn'
    FROM dbo.Module
    WHERE ModuleCode = 'SERVICE';

    SELECT @MeterPermissionID = PermissionID
    FROM dbo.Permission
    WHERE PermissionCode = 'METER_READING_CREATE';
END

IF @MeterPermissionID IS NOT NULL
BEGIN
    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, @MeterPermissionID, 1, GETDATE()
    FROM dbo.Role r
    WHERE r.RoleCode IN ('ADMIN', 'MANAGER', 'ACCOUNTANT')
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = @MeterPermissionID
      );
END
GO

IF COL_LENGTH('dbo.VehicleType', 'MonthlyFee') IS NULL
BEGIN
    ALTER TABLE dbo.VehicleType
    ADD MonthlyFee DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_VehicleType_MonthlyFee DEFAULT (0);
END
GO

UPDATE dbo.VehicleType
SET MonthlyFee = CASE
    WHEN TypeName LIKE N'%Ô tô%' OR TypeName LIKE N'%O to%' THEN 1200000
    WHEN TypeName LIKE N'%Xe máy%' OR TypeName LIKE N'%Xe may%' THEN 150000
    WHEN TypeName LIKE N'%đạp%' OR TypeName LIKE N'%dap%' THEN 80000
    ELSE MonthlyFee
END
WHERE MonthlyFee = 0;
GO

IF OBJECT_ID('dbo.SmartMeter', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartMeter (
        MeterID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ApartmentID INT NOT NULL,
        UtilityTypeID INT NOT NULL,
        CurrentIndex DECIMAL(18,3) NOT NULL CONSTRAINT DF_SmartMeter_CurrentIndex DEFAULT (0),
        LastTickAt DATETIME2 NULL,
        Status BIT NOT NULL CONSTRAINT DF_SmartMeter_Status DEFAULT (1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SmartMeter_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SmartMeter_Apartment FOREIGN KEY (ApartmentID) REFERENCES dbo.Apartment(ApartmentID),
        CONSTRAINT FK_SmartMeter_UtilityType FOREIGN KEY (UtilityTypeID) REFERENCES dbo.UtilityType(UtilityTypeID),
        CONSTRAINT UQ_SmartMeter_Apartment_Utility UNIQUE (ApartmentID, UtilityTypeID),
        CONSTRAINT CHK_SmartMeter_CurrentIndex CHECK (CurrentIndex >= 0)
    );
END
GO

IF OBJECT_ID('dbo.SmartMeterLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartMeterLog (
        LogID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        MeterID INT NOT NULL,
        OldIndex DECIMAL(18,3) NOT NULL,
        NewIndex DECIMAL(18,3) NOT NULL,
        DeltaValue DECIMAL(18,3) NOT NULL,
        Source VARCHAR(20) NOT NULL CONSTRAINT DF_SmartMeterLog_Source DEFAULT ('AUTO'),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SmartMeterLog_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SmartMeterLog_Meter FOREIGN KEY (MeterID) REFERENCES dbo.SmartMeter(MeterID),
        CONSTRAINT CHK_SmartMeterLog_Index CHECK (NewIndex >= OldIndex),
        CONSTRAINT CHK_SmartMeterLog_Delta CHECK (DeltaValue > 0),
        CONSTRAINT CHK_SmartMeterLog_Source CHECK (Source IN ('AUTO', 'DEMO'))
    );
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.MeterReading')
      AND name = 'EmployeeID'
      AND is_nullable = 0
)
BEGIN
    IF OBJECT_ID('dbo.FK_MR_Employee', 'F') IS NOT NULL
        ALTER TABLE dbo.MeterReading DROP CONSTRAINT FK_MR_Employee;

    ALTER TABLE dbo.MeterReading ALTER COLUMN EmployeeID INT NULL;

    IF OBJECT_ID('dbo.FK_MR_Employee', 'F') IS NULL
        ALTER TABLE dbo.MeterReading WITH CHECK ADD CONSTRAINT FK_MR_Employee
            FOREIGN KEY(EmployeeID) REFERENCES dbo.Employee(EmployeeID);
END
GO

INSERT INTO dbo.SmartMeter (ApartmentID, UtilityTypeID, CurrentIndex, LastTickAt, Status, CreatedAt)
SELECT c.ApartmentID,
       ut.UtilityTypeID,
       ISNULL(lastReading.NewIndex, 0),
       NULL,
       1,
       SYSUTCDATETIME()
FROM dbo.Contract c
CROSS JOIN dbo.UtilityType ut
OUTER APPLY (
    SELECT TOP 1 mr.NewIndex
    FROM dbo.MeterReading mr
    WHERE mr.ApartmentID = c.ApartmentID
      AND mr.UtilityTypeID = ut.UtilityTypeID
    ORDER BY mr.ReadingYear DESC, mr.ReadingMonth DESC
) lastReading
WHERE c.StatusID = 2
  AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
  AND ut.UtilityTypeID IN (1, 2)
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.SmartMeter sm
      WHERE sm.ApartmentID = c.ApartmentID
        AND sm.UtilityTypeID = ut.UtilityTypeID
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SmartMeter_Apartment' AND object_id = OBJECT_ID('dbo.SmartMeter'))
    CREATE INDEX IX_SmartMeter_Apartment ON dbo.SmartMeter(ApartmentID);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SmartMeterLog_Meter_CreatedAt' AND object_id = OBJECT_ID('dbo.SmartMeterLog'))
    CREATE INDEX IX_SmartMeterLog_Meter_CreatedAt ON dbo.SmartMeterLog(MeterID, CreatedAt DESC);
GO
