--====================================================
-- TẠO DATABASE
--====================================================
CREATE DATABASE ApartmentManagement;
GO

USE ApartmentManagement;
GO

--====================================================
-- 1. CATEGORY TABLES (CÁC BẢNG DANH MỤC TRẠNG THÁI & PHÂN LOẠI)
--====================================================

CREATE TABLE Role (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleCode VARCHAR(50) NOT NULL UNIQUE,
    RoleName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(255),
    Status BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE RoomStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE ContractStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE InvoiceStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE PaymentStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE MaintenanceStatus (
    StatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE VehicleType (
    VehicleTypeID INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL UNIQUE
);

--====================================================
-- 2. SYSTEM TABLES & USER MANAGEMENT (ĐÃ THÊM BẢNG MỚI)
--====================================================

-- Bảng Module (MỚI)
CREATE TABLE Module (
    ModuleID INT IDENTITY(1,1) PRIMARY KEY,
    ModuleCode VARCHAR(50) NOT NULL UNIQUE,
    ModuleName NVARCHAR(100) NOT NULL,
    Icon VARCHAR(100),
    SortOrder INT DEFAULT 0,
    Status BIT DEFAULT 1
);

-- Bảng Permission (MỚI)
CREATE TABLE Permission (
    PermissionID INT IDENTITY(1,1) PRIMARY KEY,
    ModuleID INT NOT NULL,
    PermissionCode VARCHAR(100) NOT NULL UNIQUE,
    PermissionName NVARCHAR(150) NOT NULL,
    Description NVARCHAR(255),
    CONSTRAINT FK_Permission_Module
        FOREIGN KEY(ModuleID)
        REFERENCES Module(ModuleID)
);

-- Bảng RolePermission (MỚI)
CREATE TABLE RolePermission (
    RolePermissionID INT IDENTITY(1,1) PRIMARY KEY,
    RoleID INT NOT NULL,
    PermissionID INT NOT NULL,
    IsGranted BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_RolePermission_Role
        FOREIGN KEY(RoleID)
        REFERENCES Role(RoleID),
    CONSTRAINT FK_RolePermission_Permission
        FOREIGN KEY(PermissionID)
        REFERENCES Permission(PermissionID),
    CONSTRAINT UQ_RolePermission
        UNIQUE(RoleID, PermissionID)
);

-- Bảng Users (ĐÃ SỬA - Bỏ RoleID, thêm LastLogin)
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(20) UNIQUE,
    Status BIT DEFAULT 1,
    LastLogin DATETIME NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Bảng UserRole (MỚI)
CREATE TABLE UserRole (
    UserRoleID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    RoleID INT NOT NULL,
    AssignedDate DATETIME DEFAULT GETDATE(),
    AssignedBy INT NULL,
    CONSTRAINT FK_UserRole_User
        FOREIGN KEY(UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE,
    CONSTRAINT FK_UserRole_Role
        FOREIGN KEY(RoleID)
        REFERENCES Role(RoleID),
    CONSTRAINT FK_UserRole_AssignedBy
        FOREIGN KEY(AssignedBy)
        REFERENCES Users(UserID),
    CONSTRAINT UQ_UserRole
        UNIQUE(UserID, RoleID)
);

-- Bảng Employee (GIỮ NGUYÊN)
CREATE TABLE Employee (
    EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT UNIQUE,
    FullName NVARCHAR(100) NOT NULL,
    Gender BIT,
    BirthDate DATE,
    Phone VARCHAR(20),
    Email VARCHAR(100),
    Address NVARCHAR(255),
    CCCD VARCHAR(20) UNIQUE,
    HireDate DATE,
    Status BIT DEFAULT 1,
    CONSTRAINT FK_Employee_User FOREIGN KEY(UserID) REFERENCES Users(UserID) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT CHK_Employee_Dates CHECK (BirthDate < HireDate)
);

--====================================================
-- 3. APARTMENT INFRASTRUCTURE & PRICE HISTORY
--====================================================

CREATE TABLE ApartmentArea (
    AreaID INT IDENTITY(1,1) PRIMARY KEY,
    AreaName NVARCHAR(100) NOT NULL UNIQUE,
    Address NVARCHAR(255),
    Description NVARCHAR(255)
);

CREATE TABLE Building (
    BuildingID INT IDENTITY(1,1) PRIMARY KEY,
    AreaID INT NOT NULL,
    BuildingName NVARCHAR(100) NOT NULL,
    NumberOfFloors INT CONSTRAINT CHK_Building_Floors CHECK (NumberOfFloors > 0),
    CONSTRAINT FK_Building_Area FOREIGN KEY(AreaID) REFERENCES ApartmentArea(AreaID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Building_Area UNIQUE(AreaID, BuildingName)
);

CREATE TABLE Floor (
    FloorID INT IDENTITY(1,1) PRIMARY KEY,
    BuildingID INT NOT NULL,
    FloorNumber INT NOT NULL,
    CONSTRAINT FK_Floor_Building FOREIGN KEY(BuildingID) REFERENCES Building(BuildingID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Floor_Building UNIQUE(BuildingID, FloorNumber) 
);

CREATE TABLE Apartment (
    ApartmentID INT IDENTITY(1,1) PRIMARY KEY,
    FloorID INT NOT NULL,
    ApartmentCode VARCHAR(20) NOT NULL UNIQUE,
    Area FLOAT CONSTRAINT CHK_Apartment_Area CHECK (Area > 0),
    StatusID INT NOT NULL,
    CONSTRAINT FK_Apartment_Floor FOREIGN KEY(FloorID) REFERENCES Floor(FloorID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Apartment_Status FOREIGN KEY(StatusID) REFERENCES RoomStatus(StatusID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE ApartmentPriceHistory (
    PriceHistoryID INT IDENTITY(1,1) PRIMARY KEY,
    ApartmentID INT NOT NULL,
    BaseRentalPrice DECIMAL(18,2) NOT NULL CONSTRAINT CHK_PriceHistory_Price CHECK (BaseRentalPrice >= 0),
    EffectiveDate DATE NOT NULL,
    Note NVARCHAR(255),
    CONSTRAINT FK_PriceHistory_Apartment FOREIGN KEY(ApartmentID) REFERENCES Apartment(ApartmentID) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE ParkingSlot (
    SlotID INT IDENTITY(1,1) PRIMARY KEY,
    AreaID INT NOT NULL,
    SlotNumber VARCHAR(20) NOT NULL,
    VehicleTypeID INT NOT NULL,
    IsOccupied BIT DEFAULT 0,
    CONSTRAINT FK_Slot_Area FOREIGN KEY(AreaID) REFERENCES ApartmentArea(AreaID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Slot_VehicleType FOREIGN KEY(VehicleTypeID) REFERENCES VehicleType(VehicleTypeID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Slot_Area UNIQUE(AreaID, SlotNumber)
);

--====================================================
-- 4. RESIDENTS & RELATIONSHIPS
--====================================================

CREATE TABLE Resident (
    ResidentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL UNIQUE, 
    FullName NVARCHAR(100) NOT NULL,
    Gender BIT,
    BirthDate DATE,
    Phone VARCHAR(20),
    Email VARCHAR(100),
    Address NVARCHAR(255),
    Avatar NVARCHAR(255),
    Status BIT DEFAULT 1,
    EmergencyContactName NVARCHAR(100),
    EmergencyContactPhone VARCHAR(20)
);

CREATE TABLE ResidentIdentity (
    IdentityID INT IDENTITY(1,1) PRIMARY KEY,
    ResidentID INT NOT NULL UNIQUE,
    IdentityNumber VARCHAR(20) UNIQUE NOT NULL,
    FrontImage NVARCHAR(255),
    BackImage NVARCHAR(255),
    IssueDate DATE,
    IssuePlace NVARCHAR(100),
    ExpiredDate DATE,
    CONSTRAINT FK_Identity_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT CHK_Identity_Dates CHECK (ExpiredDate > IssueDate)
);

--====================================================
-- 5. CONTRACTS
--====================================================

CREATE TABLE Contract (
    ContractID INT IDENTITY(1,1) PRIMARY KEY,
    ApartmentID INT NOT NULL,
    OwnerID INT NOT NULL, 
    ContractNumber VARCHAR(50) UNIQUE NOT NULL,
    SignDate DATE NOT NULL DEFAULT GETDATE(), 
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Deposit DECIMAL(18,2) DEFAULT 0 CONSTRAINT CHK_Contract_Deposit CHECK (Deposit >= 0),
    Rent DECIMAL(18,2) NOT NULL CONSTRAINT CHK_Contract_Rent CHECK (Rent > 0),
    StatusID INT NOT NULL,
    CreatedDate DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Contract_Apartment FOREIGN KEY(ApartmentID) REFERENCES Apartment(ApartmentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Contract_Resident FOREIGN KEY(OwnerID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Contract_Status FOREIGN KEY(StatusID) REFERENCES ContractStatus(StatusID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT CHK_Contract_Duration CHECK (EndDate > StartDate)
);

CREATE TABLE ContractResident (
    ContractResidentID INT IDENTITY(1,1) PRIMARY KEY,
    ContractID INT NOT NULL,
    ResidentID INT NOT NULL, 
    Relationship NVARCHAR(50), 
    MoveInDate DATE,
    MoveOutDate DATE,
    CONSTRAINT FK_CR_Contract FOREIGN KEY(ContractID) REFERENCES Contract(ContractID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT FK_CR_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Contract_Resident UNIQUE(ContractID, ResidentID),
    CONSTRAINT CHK_ContractResident_Dates CHECK (MoveOutDate >= MoveInDate)
);

--====================================================
-- 6. UTILITY SERVICES & PRICES
--====================================================

CREATE TABLE ServiceCategory (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(255)
);

CREATE TABLE Service (
    ServiceID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL,
    ServiceName NVARCHAR(100) NOT NULL UNIQUE,
    Unit NVARCHAR(50), 
    Price DECIMAL(18,2) CONSTRAINT CHK_Service_Price CHECK (Price >= 0),
    Status BIT DEFAULT 1,
    CONSTRAINT FK_Service_Category FOREIGN KEY(CategoryID) REFERENCES ServiceCategory(CategoryID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE ServiceRegistration (
    RegistrationID INT IDENTITY(1,1) PRIMARY KEY,
    ContractID INT NOT NULL,
    ServiceID INT NOT NULL,
    RegisterDate DATE DEFAULT GETDATE(),
    EndDate DATE NULL, 
    Quantity INT DEFAULT 1 CONSTRAINT CHK_SR_Quantity CHECK (Quantity > 0),
    Status BIT DEFAULT 1, 
    CONSTRAINT FK_SR_Contract FOREIGN KEY(ContractID) REFERENCES Contract(ContractID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT FK_SR_Service FOREIGN KEY(ServiceID) REFERENCES Service(ServiceID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT CHK_SR_Dates CHECK (EndDate >= RegisterDate)
);

CREATE TABLE UtilityType (
    UtilityTypeID INT IDENTITY(1,1) PRIMARY KEY,
    UtilityName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE UtilityPriceTier (
    PriceTierID INT IDENTITY(1,1) PRIMARY KEY,
    UtilityTypeID INT NOT NULL,
    TierName NVARCHAR(50), 
    FromValue DECIMAL(18,2) NOT NULL CONSTRAINT CHK_UPT_From CHECK (FromValue >= 0), 
    ToValue DECIMAL(18,2) NULL,     
    UnitPrice DECIMAL(18,2) NOT NULL CONSTRAINT CHK_UPT_Price CHECK (UnitPrice >= 0), 
    EffectiveDate DATE NOT NULL,     
    CONSTRAINT FK_UPT_Utility FOREIGN KEY(UtilityTypeID) REFERENCES UtilityType(UtilityTypeID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT CHK_UPT_Values CHECK (ToValue > FromValue)
);

CREATE TABLE MeterReading (
    ReadingID INT IDENTITY(1,1) PRIMARY KEY,
    ApartmentID INT NOT NULL,
    EmployeeID INT NOT NULL, 
    UtilityTypeID INT NOT NULL,
    ReadingMonth INT NOT NULL CONSTRAINT CHK_MR_Month CHECK (ReadingMonth BETWEEN 1 AND 12),
    ReadingYear INT NOT NULL CONSTRAINT CHK_MR_Year CHECK (ReadingYear >= 2000),
    OldIndex DECIMAL(18,2) NOT NULL CONSTRAINT CHK_MR_Old CHECK (OldIndex >= 0),
    NewIndex DECIMAL(18,2) NOT NULL CONSTRAINT CHK_MR_New CHECK (NewIndex >= 0),
    ReadingDate DATE DEFAULT GETDATE(),
    CONSTRAINT FK_MR_Apartment FOREIGN KEY(ApartmentID) REFERENCES Apartment(ApartmentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_MR_Employee FOREIGN KEY(EmployeeID) REFERENCES Employee(EmployeeID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_MR_Utility FOREIGN KEY(UtilityTypeID) REFERENCES UtilityType(UtilityTypeID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_MeterReading_Period UNIQUE(ApartmentID, UtilityTypeID, ReadingMonth, ReadingYear),
    CONSTRAINT CHK_MR_Index CHECK (NewIndex >= OldIndex)
);

--====================================================
-- 7. INVOICES & PAYMENTS
--====================================================

CREATE TABLE Invoice (
    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
    ContractID INT NOT NULL,
    InvoiceMonth INT NOT NULL CONSTRAINT CHK_Invoice_Month CHECK (InvoiceMonth BETWEEN 1 AND 12), 
    InvoiceYear INT NOT NULL CONSTRAINT CHK_Invoice_Year CHECK (InvoiceYear >= 2000),  
    InvoiceDate DATE DEFAULT GETDATE(),
    DueDate DATE,              
    TotalAmount DECIMAL(18,2) DEFAULT 0 CONSTRAINT CHK_Invoice_Total CHECK (TotalAmount >= 0), 
    StatusID INT NOT NULL, 
    CONSTRAINT FK_Invoice_Contract FOREIGN KEY(ContractID) REFERENCES Contract(ContractID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Invoice_Status FOREIGN KEY(StatusID) REFERENCES InvoiceStatus(StatusID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Invoice_Contract_Period UNIQUE(ContractID, InvoiceMonth, InvoiceYear),
    CONSTRAINT CHK_Invoice_DueDate CHECK (DueDate >= InvoiceDate)
);

CREATE TABLE InvoiceDetail (
    InvoiceDetailID INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceID INT NOT NULL,
    ChargeType VARCHAR(50) NOT NULL CONSTRAINT CHK_InvoiceDetail_Type CHECK (ChargeType IN ('ROOM', 'ELECTRIC', 'WATER', 'SERVICE', 'PARKING', 'OTHER')), 
    Description NVARCHAR(255) NOT NULL, 
    Quantity DECIMAL(18,2) DEFAULT 1 CONSTRAINT CHK_InvoiceDetail_Qty CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL CONSTRAINT CHK_InvoiceDetail_Price CHECK (UnitPrice >= 0),
    Amount DECIMAL(18,2) NOT NULL CONSTRAINT CHK_InvoiceDetail_Amount CHECK (Amount >= 0), 
    CONSTRAINT FK_InvoiceDetail_Invoice FOREIGN KEY(InvoiceID) REFERENCES Invoice(InvoiceID) ON UPDATE NO ACTION ON DELETE CASCADE 
);

CREATE TABLE PaymentMethod (
    MethodID INT IDENTITY(1,1) PRIMARY KEY,
    MethodName NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Payment (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceID INT NOT NULL,
    MethodID INT NOT NULL,
    PaymentDate DATETIME DEFAULT GETDATE(),
    Amount DECIMAL(18,2) NOT NULL CONSTRAINT CHK_Payment_Amount CHECK (Amount > 0),
    TransactionCode VARCHAR(100), 
    StatusID INT NOT NULL, 
    CONSTRAINT FK_Payment_Invoice FOREIGN KEY(InvoiceID) REFERENCES Invoice(InvoiceID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Payment_Method FOREIGN KEY(MethodID) REFERENCES PaymentMethod(MethodID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Payment_Status FOREIGN KEY(StatusID) REFERENCES PaymentStatus(StatusID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

--====================================================
-- 8. OPERATIONS & ENGAGEMENTS
--====================================================

CREATE TABLE Vehicle (
    VehicleID INT IDENTITY(1,1) PRIMARY KEY,
    ResidentID INT NOT NULL,
    PlateNumber VARCHAR(20) UNIQUE NOT NULL,
    VehicleTypeID INT NOT NULL, 
    Brand NVARCHAR(100),
    Color NVARCHAR(50),
    RegisterDate DATE DEFAULT GETDATE(),
    Status BIT DEFAULT 1,
    CONSTRAINT FK_Vehicle_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Vehicle_Type FOREIGN KEY(VehicleTypeID) REFERENCES VehicleType(VehicleTypeID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE ParkingCard (
    CardID INT IDENTITY(1,1) PRIMARY KEY,
    VehicleID INT NOT NULL UNIQUE, 
    CardCode VARCHAR(50) UNIQUE NOT NULL, 
    SlotID INT NULL, 
    IssueDate DATE DEFAULT GETDATE(),
    ExpiredDate DATE,
    Status BIT DEFAULT 1,
    CONSTRAINT FK_ParkingCard_Vehicle FOREIGN KEY(VehicleID) REFERENCES Vehicle(VehicleID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT FK_ParkingCard_Slot FOREIGN KEY(SlotID) REFERENCES ParkingSlot(SlotID) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT CHK_ParkingCard_Dates CHECK (ExpiredDate >= IssueDate)
);

CREATE TABLE MaintenanceRequest (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    ResidentID INT NOT NULL,
    ApartmentID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    RequestDate DATETIME DEFAULT GETDATE(),
    AssignedEmployeeID INT NULL, 
    StatusID INT NOT NULL, 
    CONSTRAINT FK_Maintenance_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Maintenance_Apartment FOREIGN KEY(ApartmentID) REFERENCES Apartment(ApartmentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_Maintenance_Employee FOREIGN KEY(AssignedEmployeeID) REFERENCES Employee(EmployeeID) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT FK_Maintenance_Status FOREIGN KEY(StatusID) REFERENCES MaintenanceStatus(StatusID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE Notification (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NULL, 
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedDate DATETIME DEFAULT GETDATE(),
    TargetScope VARCHAR(50) DEFAULT 'ALL' CONSTRAINT CHK_Notification_Scope CHECK (TargetScope IN ('ALL', 'BUILDING', 'USER')), 
    CONSTRAINT FK_Notification_Employee FOREIGN KEY(SenderID) REFERENCES Employee(EmployeeID) ON UPDATE NO ACTION ON DELETE SET NULL
);

CREATE TABLE NotificationReceiver (
    ReceiverID INT IDENTITY(1,1) PRIMARY KEY,
    NotificationID INT NOT NULL,
    UserID INT NOT NULL,
    IsRead BIT DEFAULT 0,
    ReadDate DATETIME NULL,
    CONSTRAINT FK_NR_Notification FOREIGN KEY(NotificationID) REFERENCES Notification(NotificationID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT FK_NR_User FOREIGN KEY(UserID) REFERENCES Users(UserID) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT UQ_Notification_User UNIQUE(NotificationID, UserID) 
);

CREATE TABLE Feedback (
    FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
    ResidentID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    Rating INT CONSTRAINT CHK_Feedback_Rating CHECK (Rating BETWEEN 1 AND 5),
    Reply NVARCHAR(MAX), 
    CreatedDate DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Feedback_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE AuditLog (
    LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL, 
    Action VARCHAR(50) NOT NULL CONSTRAINT CHK_Audit_Action CHECK (Action IN ('INSERT', 'UPDATE', 'DELETE')), 
    TableName VARCHAR(100) NOT NULL, 
    RecordID INT NOT NULL, 
    OldValue NVARCHAR(MAX) NULL, 
    NewValue NVARCHAR(MAX) NULL, 
    Timestamp DATETIME DEFAULT GETDATE(),
    IPAddress VARCHAR(50)
);
GO

--====================================================
-- TẠO HỆ THỐNG INDEX
--====================================================

CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Resident_FullName ON Resident(FullName);
CREATE INDEX IX_Resident_Phone ON Resident(Phone);
CREATE INDEX IX_Apartment_Code ON Apartment(ApartmentCode);
CREATE INDEX IX_Contract_Number ON Contract(ContractNumber);

CREATE INDEX IX_Invoice_Period ON Invoice(InvoiceYear, InvoiceMonth);
CREATE INDEX IX_MeterReading_Period ON MeterReading(ReadingYear, ReadingMonth);

CREATE INDEX IX_FK_Employee_User ON Employee(UserID);
CREATE INDEX IX_FK_Building_Area ON Building(AreaID);
CREATE INDEX IX_FK_Floor_Building ON Floor(BuildingID);
CREATE INDEX IX_FK_Apartment_Floor ON Apartment(FloorID);
CREATE INDEX IX_FK_ApartmentPrice_Apartment ON ApartmentPriceHistory(ApartmentID);
CREATE INDEX IX_FK_Contract_Apartment ON Contract(ApartmentID);
CREATE INDEX IX_FK_Contract_Owner ON Contract(OwnerID);
CREATE INDEX IX_FK_CR_Contract ON ContractResident(ContractID);
CREATE INDEX IX_FK_CR_Resident ON ContractResident(ResidentID);
CREATE INDEX IX_FK_SR_Contract ON ServiceRegistration(ContractID);
CREATE INDEX IX_FK_MR_Apartment ON MeterReading(ApartmentID);
CREATE INDEX IX_FK_Invoice_Contract ON Invoice(ContractID);
CREATE INDEX IX_FK_InvoiceDetail_Invoice ON InvoiceDetail(InvoiceID);
CREATE INDEX IX_FK_Payment_Invoice ON Payment(InvoiceID);
CREATE INDEX IX_FK_Vehicle_Resident ON Vehicle(ResidentID);
CREATE INDEX IX_FK_Maintenance_Apartment ON MaintenanceRequest(ApartmentID);
CREATE INDEX IX_FK_NR_User ON NotificationReceiver(UserID);

-- Index cho bảng mới
CREATE INDEX IX_UserRole_User ON UserRole(UserID);
CREATE INDEX IX_UserRole_Role ON UserRole(RoleID);
CREATE INDEX IX_RolePermission_Role ON RolePermission(RoleID);
CREATE INDEX IX_RolePermission_Permission ON RolePermission(PermissionID);
CREATE INDEX IX_Permission_Module ON Permission(ModuleID);
GO

--====================================================
-- DỌN SẠCH DỮ LIỆU CŨ
--====================================================
USE ApartmentManagement;
GO

DELETE FROM AuditLog;
DELETE FROM Feedback;
DELETE FROM NotificationReceiver;
DELETE FROM Notification;
DELETE FROM MaintenanceRequest;
DELETE FROM ParkingCard;
DELETE FROM Vehicle;
DELETE FROM Payment;
DELETE FROM InvoiceDetail;
DELETE FROM Invoice;
DELETE FROM MeterReading;
DELETE FROM UtilityPriceTier;
DELETE FROM UtilityType;
DELETE FROM ServiceRegistration;
DELETE FROM Service;
DELETE FROM ServiceCategory;
DELETE FROM ContractResident;
DELETE FROM Contract;
DELETE FROM ResidentIdentity;
DELETE FROM Resident;
DELETE FROM ParkingSlot;
DELETE FROM ApartmentPriceHistory;
DELETE FROM Apartment;
DELETE FROM Floor;
DELETE FROM Building;
DELETE FROM ApartmentArea;
DELETE FROM Employee;
DELETE FROM UserRole;
DELETE FROM RolePermission;
DELETE FROM Users;
DELETE FROM Permission;
DELETE FROM Module;
DELETE FROM VehicleType;
DELETE FROM MaintenanceStatus;
DELETE FROM PaymentStatus;
DELETE FROM InvoiceStatus;
DELETE FROM ContractStatus;
DELETE FROM RoomStatus;
DELETE FROM Role;
DELETE FROM PaymentMethod;
GO

--====================================================
-- CHÈN DỮ LIỆU BẢNG DANH MỤC
--====================================================

-- 1. Bảng Role (Thêm RoleCode)
SET IDENTITY_INSERT Role ON;
INSERT INTO Role (RoleID, RoleCode, RoleName, Description) VALUES
(1, 'ADMIN', N'Quản trị viên', N'Ban quản lý Đức Vũ Tower'),
(2, 'MANAGER', N'Ban quản lý', N'Quản lý vận hành tòa nhà'),
(3, 'ACCOUNTANT', N'Kế toán', N'Quản lý tài chính, hóa đơn'),
(4, 'RECEPTION', N'Lễ tân', N'Tiếp nhận yêu cầu, hướng dẫn'),
(5, 'TECHNICIAN', N'Kỹ thuật', N'Bảo trì, sửa chữa'),
(6, 'SECURITY', N'Bảo vệ', N'An ninh, bãi xe'),
(7, 'RESIDENT', N'Cư dân', N'Chủ hộ hoặc người thuê căn hộ');
SET IDENTITY_INSERT Role OFF;

-- 2. Bảng RoomStatus
SET IDENTITY_INSERT RoomStatus ON;
INSERT INTO RoomStatus (StatusID, StatusName) VALUES
(1, N'Còn trống'),
(2, N'Đang ở'),
(3, N'Đang bảo trì'),
(4, N'Đang thuê');
SET IDENTITY_INSERT RoomStatus OFF;

-- 3. Bảng ContractStatus
SET IDENTITY_INSERT ContractStatus ON;
INSERT INTO ContractStatus (StatusID, StatusName) VALUES
(1, N'Mới lập'),
(2, N'Hiệu lực'),
(3, N'Hết hạn'),
(4, N'Đã thanh lý');
SET IDENTITY_INSERT ContractStatus OFF;

-- 4. Bảng InvoiceStatus
SET IDENTITY_INSERT InvoiceStatus ON;
INSERT INTO InvoiceStatus (StatusID, StatusName) VALUES
(1, N'Chưa thanh toán'),
(2, N'Đã thanh toán'),
(3, N'Quá hạn'),
(4, N'Đã hủy');
SET IDENTITY_INSERT InvoiceStatus OFF;

-- 5. Bảng PaymentStatus
SET IDENTITY_INSERT PaymentStatus ON;
INSERT INTO PaymentStatus (StatusID, StatusName) VALUES
(1, N'Chờ xử lý'),
(2, N'Thành công'),
(3, N'Thất bại');
SET IDENTITY_INSERT PaymentStatus OFF;

-- 6. Bảng MaintenanceStatus
SET IDENTITY_INSERT MaintenanceStatus ON;
INSERT INTO MaintenanceStatus (StatusID, StatusName) VALUES
(1, N'Mới tiếp nhận'),
(2, N'Đang xử lý'),
(3, N'Hoàn tất'),
(4, N'Đã hủy');
SET IDENTITY_INSERT MaintenanceStatus OFF;

-- 7. Bảng VehicleType
SET IDENTITY_INSERT VehicleType ON;
INSERT INTO VehicleType (VehicleTypeID, TypeName) VALUES
(1, N'Ô tô'),
(2, N'Xe máy'),
(3, N'Xe đạp điện');
SET IDENTITY_INSERT VehicleType OFF;

-- 8. Bảng PaymentMethod
SET IDENTITY_INSERT PaymentMethod ON;
INSERT INTO PaymentMethod (MethodID, MethodName) VALUES
(1, N'Chuyển khoản Ngân hàng (VietQR)'),
(2, N'Ví điện tử (Momo/ZaloPay)'),
(3, N'Tiền mặt trực tiếp');
SET IDENTITY_INSERT PaymentMethod OFF;

--====================================================
-- CHÈN DỮ LIỆU MODULE & PERMISSION
--====================================================

SET IDENTITY_INSERT Module ON;
INSERT INTO Module (ModuleID, ModuleCode, ModuleName, SortOrder) VALUES
(1, 'DASHBOARD', N'Tổng quan', 1),
(2, 'RESIDENT', N'Quản lý cư dân', 2),
(3, 'APARTMENT', N'Quản lý căn hộ', 3),
(4, 'CONTRACT', N'Quản lý hợp đồng', 4),
(5, 'SERVICE', N'Dịch vụ công ích', 5),
(6, 'FINANCE', N'Hóa đơn & Tài chính', 6),
(7, 'PARKING', N'Gửi xe', 7),
(8, 'OPERATION', N'Vận hành', 8),
(9, 'NOTIFICATION', N'Thông báo', 9),
(10, 'EMPLOYEE', N'Nhân sự', 10),
(11, 'REPORT', N'Báo cáo', 11),
(12, 'AI', N'AI Assistant', 12),
(13, 'SETTING', N'Cài đặt', 13);
SET IDENTITY_INSERT Module OFF;

SET IDENTITY_INSERT Permission ON;
-- Dashboard
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(1, 1, 'DASHBOARD_VIEW', N'Xem Dashboard');
-- Resident
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(2, 2, 'RESIDENT_VIEW', N'Xem cư dân'),
(3, 2, 'RESIDENT_CREATE', N'Thêm cư dân'),
(4, 2, 'RESIDENT_UPDATE', N'Sửa cư dân'),
(5, 2, 'RESIDENT_DELETE', N'Xóa cư dân');
-- Apartment
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(6, 3, 'APARTMENT_VIEW', N'Xem căn hộ'),
(7, 3, 'APARTMENT_CREATE', N'Thêm căn hộ'),
(8, 3, 'APARTMENT_UPDATE', N'Sửa căn hộ'),
(9, 3, 'APARTMENT_DELETE', N'Xóa căn hộ');
-- Contract
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(10, 4, 'CONTRACT_VIEW', N'Xem hợp đồng'),
(11, 4, 'CONTRACT_CREATE', N'Tạo hợp đồng'),
(12, 4, 'CONTRACT_RENEW', N'Gia hạn hợp đồng'),
(13, 4, 'CONTRACT_LIQUIDATE', N'Thanh lý hợp đồng');
-- Service
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(14, 5, 'SERVICE_VIEW', N'Xem dịch vụ'),
(15, 5, 'SERVICE_CREATE', N'Thêm dịch vụ'),
(16, 5, 'SERVICE_UPDATE', N'Sửa dịch vụ'),
(17, 5, 'SERVICE_DELETE', N'Xóa dịch vụ');
-- Finance
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(18, 6, 'INVOICE_VIEW', N'Xem hóa đơn'),
(19, 6, 'INVOICE_CREATE', N'Tạo hóa đơn'),
(20, 6, 'PAYMENT_CREATE', N'Thu phí'),
(21, 6, 'DEBT_VIEW', N'Xem công nợ');
-- Parking
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(22, 7, 'PARKING_VIEW', N'Xem gửi xe'),
(23, 7, 'VEHICLE_CREATE', N'Thêm xe'),
(24, 7, 'CARD_CREATE', N'Cấp thẻ xe'),
(25, 7, 'PARKING_HISTORY', N'Lịch sử ra vào');
-- Operation
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(26, 8, 'TICKET_VIEW', N'Xem Ticket'),
(27, 8, 'TICKET_CREATE', N'Tạo Ticket'),
(28, 8, 'MAINTENANCE_UPDATE', N'Cập nhật bảo trì'),
(29, 8, 'DEVICE_MANAGE', N'Quản lý thiết bị');
-- Notification
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(30, 9, 'NOTIFICATION_VIEW', N'Xem thông báo'),
(31, 9, 'NOTIFICATION_SEND', N'Gửi thông báo');
-- Employee
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(32, 10, 'EMPLOYEE_VIEW', N'Xem nhân viên'),
(33, 10, 'EMPLOYEE_CREATE', N'Thêm nhân viên'),
(34, 10, 'ROLE_MANAGE', N'Quản lý vai trò'),
(35, 10, 'PERMISSION_MANAGE', N'Phân quyền');
-- Report
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(36, 11, 'REPORT_VIEW', N'Xem báo cáo'),
(37, 11, 'REPORT_EXCEL', N'Xuất Excel'),
(38, 11, 'REPORT_PDF', N'Xuất PDF');
-- AI
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(39, 12, 'AI_CHAT', N'Chat AI'),
(40, 12, 'AI_STATISTIC', N'Thống kê AI'),
(41, 12, 'AI_SEARCH', N'Tìm kiếm AI'),
(42, 12, 'AI_PREDICT', N'Dự đoán hợp đồng');
-- Setting
INSERT INTO Permission (PermissionID, ModuleID, PermissionCode, PermissionName) VALUES
(43, 13, 'PROFILE_UPDATE', N'Cập nhật hồ sơ'),
(44, 13, 'PASSWORD_CHANGE', N'Đổi mật khẩu'),
(45, 13, 'SYSTEM_SETTING', N'Cấu hình hệ thống');
SET IDENTITY_INSERT Permission OFF;

--====================================================
-- CHÈN DỮ LIỆU NGƯỜI DÙNG (ĐÃ SỬA - Bỏ RoleID)
--====================================================

SET IDENTITY_INSERT Users ON;
INSERT INTO Users (UserID, Username, PasswordHash, Email, Phone, Status) VALUES
(1, 'admin', '123456', 'admin@anbinh.vn', '0911111111', 1),
(2, 'kythuat01', '123456', 'kythuat01@anbinh.vn', '0922222222', 1),
(3, 'user01', '123456', 'minhanh@anbinh.vn', '0912345678', 1),
(4, 'user02', '123456', 'quocbao@anbinh.vn', '0987654321', 1),
(5, 'user03', '123456', 'hoangyen@anbinh.vn', '0905123456', 1);
SET IDENTITY_INSERT Users OFF;

-- Gán Role cho Users
INSERT INTO UserRole (UserID, RoleID) VALUES
(1, 1), -- admin -> ADMIN
(2, 5), -- kythuat01 -> TECHNICIAN
(3, 7), -- user01 -> RESIDENT
(4, 7), -- user02 -> RESIDENT
(5, 7); -- user03 -> RESIDENT

-- Bảng Employee
SET IDENTITY_INSERT Employee ON;
INSERT INTO Employee (EmployeeID, UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status) VALUES
(1, 1, N'Trần Đức Vũ', 1, '1985-05-20', '0911111111', 'admin@anbinh.vn', N'Quận 1, TP. HCM', '012345678901', '2020-01-15', 1),
(2, 2, N'Phạm Văn Sáng', 1, '1992-09-12', '0922222222', 'kythuat01@anbinh.vn', N'Bình Thạnh, TP. HCM', '012345678902', '2022-03-01', 1);
SET IDENTITY_INSERT Employee OFF;

--====================================================
-- CHÈN DỮ LIỆU ROLEPERMISSION (PHÂN QUYỀN)
--====================================================

-- Admin: Toàn quyền
INSERT INTO RolePermission (RoleID, PermissionID)
SELECT 1, PermissionID FROM Permission;

-- Manager (RoleID = 2)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 6), (2, 7), (2, 8),
(2, 10), (2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 16),
(2, 18), (2, 19), (2, 20), (2, 21), (2, 22), (2, 23), (2, 24),
(2, 26), (2, 27), (2, 28), (2, 30), (2, 31), (2, 32), (2, 36);

-- Accountant (RoleID = 3)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(3, 1), (3, 18), (3, 19), (3, 20), (3, 21), (3, 36), (3, 37), (3, 38);

-- Reception (RoleID = 4)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(4, 2), (4, 3), (4, 4), (4, 6), (4, 10), (4, 22), (4, 26), (4, 27), (4, 30);

-- Technician (RoleID = 5)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(5, 1), (5, 6), (5, 26), (5, 27), (5, 28);

-- Security (RoleID = 6)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(6, 22), (6, 23), (6, 24), (6, 25);

-- Resident (RoleID = 7)
INSERT INTO RolePermission (RoleID, PermissionID) VALUES
(7, 2), (7, 6), (7, 10), (7, 18), (7, 22), (7, 26), (7, 27), 
(7, 30), (7, 39), (7, 41), (7, 43), (7, 44);

--====================================================
-- CƠ SỞ HẠ TẦNG (GIỮ NGUYÊN)
--====================================================

SET IDENTITY_INSERT ApartmentArea ON;
INSERT INTO ApartmentArea (AreaID, AreaName, Address, Description) VALUES
(1, N'Đức Vũ Tower - Khu A', N'Đường Mai Chí Thọ, Quận 2, TP. Thủ Đức', N'Khu căn hộ cao cấp Block A'),
(2, N'Đức Vũ Tower - Khu B', N'Đường Mai Chí Thọ, Quận 2, TP. Thủ Đức', N'Khu căn hộ cao cấp Block B'),
(3, N'Đức Vũ Tower - Khu C', N'Đường Mai Chí Thọ, Quận 2, TP. Thủ Đức', N'Khu căn hộ cao cấp Block C');
SET IDENTITY_INSERT ApartmentArea OFF;

SET IDENTITY_INSERT Building ON;
INSERT INTO Building (BuildingID, AreaID, BuildingName, NumberOfFloors) VALUES
(1, 1, N'Block A', 25),
(2, 2, N'Block B', 20),
(3, 3, N'Block C', 18);
SET IDENTITY_INSERT Building OFF;

SET IDENTITY_INSERT Floor ON;
INSERT INTO Floor (FloorID, BuildingID, FloorNumber) VALUES
(1, 1, 12), (2, 2, 8), (3, 1, 9), (4, 3, 3), (5, 1, 1);
SET IDENTITY_INSERT Floor OFF;

SET IDENTITY_INSERT Apartment ON;
INSERT INTO Apartment (ApartmentID, FloorID, ApartmentCode, Area, StatusID) VALUES
(1, 1, 'A-1201', 75.5, 4),
(2, 2, 'B-0805', 92.0, 4),
(3, 3, 'A-0903', 68.2, 4),
(4, 4, 'C-0301', 110.0, 4),
(5, 5, 'A-0101', 75.5, 1),
(6, 1, 'A-1202', 85.0, 3);
SET IDENTITY_INSERT Apartment OFF;

SET IDENTITY_INSERT ApartmentPriceHistory ON;
INSERT INTO ApartmentPriceHistory (PriceHistoryID, ApartmentID, BaseRentalPrice, EffectiveDate, Note) VALUES
(1, 1, 15000000.00, '2025-01-01', N'Mức giá thuê tiêu chuẩn Block A tầng cao'),
(2, 2, 18000000.00, '2025-01-01', N'Mức giá thuê Block B căn góc'),
(3, 3, 13500000.00, '2025-01-01', N'Căn hộ nhỏ gọn Block A');
SET IDENTITY_INSERT ApartmentPriceHistory OFF;

SET IDENTITY_INSERT ParkingSlot ON;
INSERT INTO ParkingSlot (SlotID, AreaID, SlotNumber, VehicleTypeID, IsOccupied) VALUES
(1, 1, 'B1-021', 1, 1),
(2, 2, 'B2-015', 1, 1),
(3, 1, 'M-118', 2, 1),
(4, 1, 'B1-022', 1, 0);
SET IDENTITY_INSERT ParkingSlot OFF;

--====================================================
-- CƯ DÂN & HỢP ĐỒNG (KHÔNG DÙNG SET IDENTITY_INSERT)
--====================================================

INSERT INTO Resident (UserID, FullName, Gender, BirthDate, Phone, Email, Address, Status, EmergencyContactName, EmergencyContactPhone) VALUES
(3, N'Nguyễn Minh Anh', 0, '1995-04-27', '0912345678', 'minhanh@anbinh.vn', N'Quận 2, TP. Thủ Đức', 1, N'Nguyễn Văn Cha', '0912000111'),
(4, N'Trần Quốc Bảo', 1, '1990-11-15', '0987654321', 'quocbao@anbinh.vn', N'Quận 2, TP. Thủ Đức', 1, N'Trần Quốc Mẹ', '0987000222'),
(5, N'Lê Hoàng Yến', 0, '1997-08-20', '0905123456', 'hoangyen@anbinh.vn', N'Quận 2, TP. Thủ Đức', 1, N'Lê Chị Gái', '0905000333'),
(NULL, N'Phạm Gia Huy', 1, '1988-03-10', '0944999888', 'giahuy@anbinh.vn', N'Quận 2, TP. Thủ Đức', 1, N'Phạm Anh Trai', '0944000444');

INSERT INTO ResidentIdentity (ResidentID, IdentityNumber, FrontImage, BackImage, IssueDate, IssuePlace, ExpiredDate) VALUES
(1, '079195000123', 'front_r1.png', 'back_r1.png', '2021-06-15', N'Cục CS QLHC về TTXH', '2031-06-15'),
(2, '079190000456', 'front_r2.png', 'back_r2.png', '2018-02-10', N'Cục CS QLHC về TTXH', '2028-02-10'),
(3, '079197000789', 'front_r3.png', 'back_r3.png', '2022-11-20', N'Cục CS QLHC về TTXH', '2032-11-20');

INSERT INTO Contract (ApartmentID, OwnerID, ContractNumber, SignDate, StartDate, EndDate, Deposit, Rent, StatusID) VALUES
(1, 1, 'HD-A1201-2025', '2025-01-01', '2025-01-10', '2027-01-10', 30000000.00, 15000000.00, 2),
(2, 2, 'HD-B0805-2025', '2025-02-01', '2025-02-05', '2026-02-05', 36000000.00, 18000000.00, 2),
(3, 3, 'HD-A0903-2025', '2025-03-01', '2025-03-05', '2026-03-05', 27000000.00, 13500000.00, 2),
(4, 4, 'HD-C0301-2025', '2025-04-01', '2025-04-10', '2026-04-10', 40000000.00, 20000000.00, 2);

INSERT INTO ContractResident (ContractID, ResidentID, Relationship, MoveInDate) VALUES
(1, 1, N'Chủ hộ', '2025-01-10'),
(2, 2, N'Chủ hộ', '2025-02-05'),
(3, 3, N'Chủ hộ', '2025-03-05'),
(4, 4, N'Chủ hộ', '2025-04-10');

--====================================================
-- PHÍ DỊCH VỤ & CHỈ SỐ TIÊU THỤ
--====================================================

SET IDENTITY_INSERT ServiceCategory ON;
INSERT INTO ServiceCategory (CategoryID, CategoryName, Description) VALUES
(1, N'Dịch vụ cơ bản', N'Phí quản lý tòa nhà chung cư'),
(2, N'Dịch vụ tiện ích mở rộng', N'Internet, Gym, Hồ bơi...');
SET IDENTITY_INSERT ServiceCategory OFF;

SET IDENTITY_INSERT Service ON;
INSERT INTO Service (ServiceID, CategoryID, ServiceName, Unit, Price, Status) VALUES
(1, 1, N'Phí quản lý vận hành tòa nhà', N'm2', 8000.00, 1),
(2, 2, N'Phí Internet tốc độ cao FPT', N'Tháng', 250000.00, 1),
(3, 2, N'Phí dịch vụ bể bơi & Gym gia đình', N'Tháng', 300000.00, 1);
SET IDENTITY_INSERT Service OFF;

SET IDENTITY_INSERT ServiceRegistration ON;
INSERT INTO ServiceRegistration (RegistrationID, ContractID, ServiceID, RegisterDate, Quantity, Status) VALUES
(1, 1, 1, '2025-01-10', 75, 1),
(2, 1, 2, '2025-01-15', 1, 1),
(3, 2, 1, '2025-02-05', 92, 1),
(4, 2, 3, '2025-02-10', 1, 1);
SET IDENTITY_INSERT ServiceRegistration OFF;

SET IDENTITY_INSERT UtilityType ON;
INSERT INTO UtilityType (UtilityTypeID, UtilityName) VALUES
(1, N'Điện sinh hoạt'),
(2, N'Nước sạch');
SET IDENTITY_INSERT UtilityType OFF;

SET IDENTITY_INSERT UtilityPriceTier ON;
INSERT INTO UtilityPriceTier (PriceTierID, UtilityTypeID, TierName, FromValue, ToValue, UnitPrice, EffectiveDate) VALUES
(1, 1, N'Bậc 1 (0-50kWh)', 0.00, 50.00, 1800.00, '2025-01-01'),
(2, 1, N'Bậc 2 (51-100kWh)', 50.00, 100.00, 2100.00, '2025-01-01'),
(3, 1, N'Bậc 3 (Trên 100kWh)', 100.00, 99999.00, 2900.00, '2025-01-01'),
(4, 2, N'Giá nước định mức hộ gia đình', 0.00, 999.00, 12000.00, '2025-01-01');
SET IDENTITY_INSERT UtilityPriceTier OFF;

SET IDENTITY_INSERT MeterReading ON;
INSERT INTO MeterReading (ReadingID, ApartmentID, EmployeeID, UtilityTypeID, ReadingMonth, ReadingYear, OldIndex, NewIndex, ReadingDate) VALUES
(1, 1, 2, 1, 4, 2026, 1250.00, 1380.00, '2026-04-25'),
(2, 1, 2, 2, 4, 2026, 420.00, 435.00, '2026-04-25'),
(3, 2, 2, 1, 4, 2026, 2110.00, 2280.00, '2026-04-25'),
(4, 2, 2, 2, 4, 2026, 612.00, 630.00, '2026-04-25');
SET IDENTITY_INSERT MeterReading OFF;

--====================================================
-- HÓA ĐƠN & THANH TOÁN
--====================================================

SET IDENTITY_INSERT Invoice ON;
INSERT INTO Invoice (InvoiceID, ContractID, InvoiceMonth, InvoiceYear, InvoiceDate, DueDate, TotalAmount, StatusID) VALUES
(1, 1, 4, 2026, '2026-04-25', '2026-05-25', 1010000.00, 2),
(2, 2, 4, 2026, '2026-04-25', '2026-05-25', 1480000.00, 1),
(3, 3, 4, 2026, '2026-04-25', '2026-05-25', 925000.00, 3);
SET IDENTITY_INSERT Invoice OFF;

SET IDENTITY_INSERT InvoiceDetail ON;
INSERT INTO InvoiceDetail (InvoiceDetailID, InvoiceID, ChargeType, Description, Quantity, UnitPrice, Amount) VALUES
(1, 1, 'SERVICE', N'Phí quản lý vận hành căn hộ', 1.0, 580000.00, 580000.00),
(2, 1, 'PARKING', N'Phí trông giữ xe (Ô tô và Xe máy)', 1.0, 250000.00, 250000.00),
(3, 1, 'WATER', N'Phí sử dụng nước sinh hoạt', 15.0, 12000.00, 180000.00),
(4, 2, 'SERVICE', N'Phí quản lý vận hành căn hộ', 1.0, 760000.00, 760000.00),
(5, 2, 'PARKING', N'Phí gửi 01 Ô tô và 01 Xe máy', 1.0, 500000.00, 500000.00),
(6, 2, 'WATER', N'Phí sử dụng nước sinh hoạt', 18.0, 12222.00, 220000.00),
(7, 3, 'SERVICE', N'Phí quản lý vận hành căn hộ', 1.0, 510000.00, 510000.00),
(8, 3, 'PARKING', N'Phí giữ xe máy', 1.0, 250000.00, 250000.00),
(9, 3, 'WATER', N'Phí sử dụng nước sinh hoạt', 13.0, 12692.00, 165000.00);
SET IDENTITY_INSERT InvoiceDetail OFF;

SET IDENTITY_INSERT Payment ON;
INSERT INTO Payment (PaymentID, InvoiceID, MethodID, PaymentDate, Amount, TransactionCode, StatusID) VALUES
(1, 1, 1, '2026-04-28 09:30:00', 1010000.00, 'BANK_FTX7189182', 2);
SET IDENTITY_INSERT Payment OFF;

--====================================================
-- PHƯƠNG TIỆN & THẺ BÃI XE
--====================================================

SET IDENTITY_INSERT Vehicle ON;
INSERT INTO Vehicle (VehicleID, ResidentID, PlateNumber, VehicleTypeID, Brand, Color, Status) VALUES
(1, 1, '30H-123.45', 1, N'Mazda 3', N'Đỏ', 1),
(2, 3, '29X1-456.78', 2, N'Honda SH', N'Đen', 1),
(3, 2, '30K-888.99', 1, N'VinFast VF8', N'Trắng', 0);
SET IDENTITY_INSERT Vehicle OFF;

SET IDENTITY_INSERT ParkingCard ON;
INSERT INTO ParkingCard (CardID, VehicleID, CardCode, SlotID, IssueDate, ExpiredDate, Status) VALUES
(1, 1, 'CARD-AUTO-01', 1, '2025-01-10', '2027-01-10', 1),
(2, 2, 'CARD-MOTO-01', 3, '2025-03-05', '2027-03-05', 1),
(3, 3, 'CARD-AUTO-02', 2, '2025-02-05', '2027-02-05', 1);
SET IDENTITY_INSERT ParkingCard OFF;

--====================================================
-- VẬN HÀNH & TƯƠNG TÁC
--====================================================

SET IDENTITY_INSERT MaintenanceRequest ON;
INSERT INTO MaintenanceRequest (RequestID, ResidentID, ApartmentID, Title, Description, StatusID, AssignedEmployeeID) VALUES
(1, 1, 1, N'Đèn hành lang tầng 12 bị hỏng', N'Đèn chập chờn liên tục nhấp nháy từ hôm qua.', 2, 2),
(2, 2, 2, N'Rò nước khu vực để xe B2', N'Nước rò rỉ từ đường ống cứu hỏa trần bãi đỗ xe.', 1, NULL),
(3, 3, 3, N'Đăng ký sửa khóa cửa chính', N'Khóa vân tay bị hết pin hoặc hỏng cảm biến.', 3, 2);
SET IDENTITY_INSERT MaintenanceRequest OFF;

SET IDENTITY_INSERT Notification ON;
INSERT INTO Notification (NotificationID, SenderID, Title, Content, TargetScope) VALUES
(1, 1, N'Bảo trì thang máy Block A', N'Ban quản lý thông báo thang máy Block A bảo trì định kỳ từ 09:00 đến 11:00 ngày 27/04/2026.', 'BUILDING'),
(2, 1, N'Thông báo họp cư dân thường niên 2026', N'Họp thông qua kế hoạch cải tạo nâng cấp cảnh quan vườn treo khu B.', 'ALL');
SET IDENTITY_INSERT Notification OFF;

SET IDENTITY_INSERT NotificationReceiver ON;
INSERT INTO NotificationReceiver (ReceiverID, NotificationID, UserID, IsRead) VALUES
(1, 1, 3, 0),
(2, 2, 3, 1),
(3, 2, 4, 1);
SET IDENTITY_INSERT NotificationReceiver OFF;

SET IDENTITY_INSERT Feedback ON;
INSERT INTO Feedback (FeedbackID, ResidentID, Title, Content, Rating, Reply) VALUES
(1, 1, N'Góp ý bãi xe', N'Thái độ bảo vệ bãi giữ xe ca tối cần thân thiện hơn với cư dân.', 4, N'Ban quản lý đã tiếp thu và nhắc nhở bộ phận an ninh bãi xe.');
SET IDENTITY_INSERT Feedback OFF;
GO
-- ====================================================
-- THÊM USER CHO CÁC ROLE CÒN THIẾU
-- ====================================================


-- ====================================================
-- 1. THÊM MANAGER (Ban quản lý)
-- ====================================================
INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
VALUES ('manager', '123456', 'manager@anbinh.vn', '0900000002', 1, GETDATE());

INSERT INTO UserRole (UserID, RoleID, AssignedDate)
VALUES (@@IDENTITY, 2, GETDATE());

INSERT INTO Employee (UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status)
VALUES (
    @@IDENTITY, 
    N'Nguyễn Văn Quản Lý', 
    1, 
    '1988-06-15', 
    '0900000002', 
    'manager@anbinh.vn', 
    N'Quận 2, TP. Thủ Đức', 
    '012345678910', 
    '2020-03-01', 
    1
);

PRINT N'✅ Đã thêm MANAGER: manager / 123456';
GO

-- ====================================================
-- 2. THÊM ACCOUNTANT (Kế toán)
-- ====================================================
INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
VALUES ('accountant', '123456', 'accountant@anbinh.vn', '0900000003', 1, GETDATE());

INSERT INTO UserRole (UserID, RoleID, AssignedDate)
VALUES (@@IDENTITY, 3, GETDATE());

INSERT INTO Employee (UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status)
VALUES (
    @@IDENTITY, 
    N'Trần Thị Kế Toán', 
    0, 
    '1992-09-20', 
    '0900000003', 
    'accountant@anbinh.vn', 
    N'Bình Thạnh, TP. HCM', 
    '012345678911', 
    '2021-05-01', 
    1
);

PRINT N'✅ Đã thêm ACCOUNTANT: accountant / 123456';
GO

-- ====================================================
-- 3. THÊM RECEPTION (Lễ tân)
-- ====================================================
INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
VALUES ('reception', '123456', 'reception@anbinh.vn', '0900000004', 1, GETDATE());

INSERT INTO UserRole (UserID, RoleID, AssignedDate)
VALUES (@@IDENTITY, 4, GETDATE());

INSERT INTO Employee (UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status)
VALUES (
    @@IDENTITY, 
    N'Lê Thị Lễ Tân', 
    0, 
    '1995-03-10', 
    '0900000004', 
    'reception@anbinh.vn', 
    N'Quận 1, TP. HCM', 
    '012345678912', 
    '2022-07-15', 
    1
);

PRINT N'✅ Đã thêm RECEPTION: reception / 123456';
GO

-- ====================================================
-- 4. THÊM SECURITY (Bảo vệ)
-- ====================================================
INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
VALUES ('security01', '123456', 'security@anbinh.vn', '0900000005', 1, GETDATE());

INSERT INTO UserRole (UserID, RoleID, AssignedDate)
VALUES (@@IDENTITY, 6, GETDATE());

INSERT INTO Employee (UserID, FullName, Gender, BirthDate, Phone, Email, Address, CCCD, HireDate, Status)
VALUES (
    @@IDENTITY, 
    N'Phạm Văn Bảo Vệ', 
    1, 
    '1990-11-25', 
    '0900000005', 
    'security@anbinh.vn', 
    N'Quận 2, TP. Thủ Đức', 
    '012345678913', 
    '2023-01-01', 
    1
);

PRINT N'✅ Đã thêm SECURITY: security01 / 123456';
GO

-- ====================================================
-- 5. THÊM THÊM 1 RESIDENT (Cư dân mới)
-- ====================================================
INSERT INTO Users (Username, PasswordHash, Email, Phone, Status, CreatedAt)
VALUES ('user04', '123456', 'user04@gmail.com', '0900000006', 1, GETDATE());

DECLARE @UserID INT = @@IDENTITY;

INSERT INTO UserRole (UserID, RoleID, AssignedDate)
VALUES (@UserID, 7, GETDATE());

INSERT INTO Resident (UserID, FullName, Gender, BirthDate, Phone, Email, Address, Status, EmergencyContactName, EmergencyContactPhone)
VALUES (
    @UserID,
    N'Hoàng Thị Mới',
    0,
    '1998-07-12',
    '0900000006',
    'user04@gmail.com',
    N'Quận 2, TP. Thủ Đức',
    1,
    N'Hoàng Văn Cha',
    '0912000999'
);

PRINT N'✅ Đã thêm RESIDENT: user04 / 123456';
GO

-- ====================================================
-- 6. KIỂM TRA LẠI DANH SÁCH USER THEO ROLE
-- ====================================================
SELECT 
    r.RoleCode,
    r.RoleName,
    COUNT(u.UserID) AS SoLuong,
    STRING_AGG(u.Username, ', ') AS DanhSachUser
FROM Role r
LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
LEFT JOIN Users u ON ur.UserID = u.UserID AND u.Status = 1
WHERE r.Status = 1
GROUP BY r.RoleID, r.RoleCode, r.RoleName
ORDER BY r.RoleID;
GO

-- ====================================================
-- 7. XEM CHI TIẾT TẤT CẢ USER
-- ====================================================
SELECT 
    u.UserID,
    u.Username,
    u.PasswordHash,
    u.Email,
    u.Phone,
    u.Status,
    u.LastLogin,
    u.CreatedAt,
    STRING_AGG(r.RoleCode, ', ') AS Roles
FROM Users u
LEFT JOIN UserRole ur ON u.UserID = ur.UserID
LEFT JOIN Role r ON ur.RoleID = r.RoleID
WHERE u.Status = 1
GROUP BY u.UserID, u.Username, u.PasswordHash, u.Email, u.Phone, u.Status, u.LastLogin, u.CreatedAt
ORDER BY u.UserID;
GO

--====================================================
-- KIỂM TRA DỮ LIỆU
--====================================================
SELECT 'Đã nạp thành công dữ liệu mẫu đồng bộ Đức Vũ Tower!' AS 'Notification';

-- Kiểm tra số lượng bản ghi
SELECT 'Roles' AS TableName, COUNT(*) AS Total FROM Role
UNION ALL
SELECT 'Users', COUNT(*) FROM Users
UNION ALL
SELECT 'Modules', COUNT(*) FROM Module
UNION ALL
SELECT 'Permissions', COUNT(*) FROM Permission
UNION ALL
SELECT 'Residents', COUNT(*) FROM Resident
UNION ALL
SELECT 'Contracts', COUNT(*) FROM Contract
UNION ALL
SELECT 'Invoices', COUNT(*) FROM Invoice;
GO


USE ApartmentManagement;

-- 1. Kiểm tra xem đã có Module EMPLOYEE chưa
IF NOT EXISTS (SELECT 1 FROM Module WHERE ModuleCode = 'EMPLOYEE')
BEGIN
    INSERT INTO Module (ModuleCode, ModuleName, SortOrder) VALUES
    ('EMPLOYEE', N'Nhân sự', 10);
    PRINT '✅ Đã thêm module EMPLOYEE';
END

-- 2. Kiểm tra xem đã có permission ROLE_MANAGE chưa
IF NOT EXISTS (SELECT 1 FROM Permission WHERE PermissionCode = 'ROLE_MANAGE')
BEGIN
    DECLARE @ModuleID INT;
    SELECT @ModuleID = ModuleID FROM Module WHERE ModuleCode = 'EMPLOYEE';
    
    INSERT INTO Permission (ModuleID, PermissionCode, PermissionName) VALUES
    (@ModuleID, 'ROLE_MANAGE', N'Quản lý vai trò');
    PRINT '✅ Đã thêm permission ROLE_MANAGE';
END

-- 3. Gán permission ROLE_MANAGE cho admin (RoleID = 1)
DECLARE @RoleID INT = 1;
DECLARE @PermID INT;
SELECT @PermID = PermissionID FROM Permission WHERE PermissionCode = 'ROLE_MANAGE';

IF NOT EXISTS (SELECT 1 FROM RolePermission WHERE RoleID = @RoleID AND PermissionID = @PermID)
BEGIN
    INSERT INTO RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    VALUES (@RoleID, @PermID, 1, GETDATE());
    PRINT '✅ Đã gán ROLE_MANAGE cho ADMIN';
END

-- 4. Kiểm tra lại
SELECT 
    r.RoleName,
    p.PermissionCode,
    p.PermissionName,
    rp.IsGranted
FROM Role r
JOIN RolePermission rp ON r.RoleID = rp.RoleID
JOIN Permission p ON rp.PermissionID = p.PermissionID
WHERE r.RoleID = 1
ORDER BY p.PermissionCode;