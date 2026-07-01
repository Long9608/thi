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
    RoleName NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255)
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
-- 2. SYSTEM TABLES & USER MANAGEMENT
--====================================================

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    RoleID INT NOT NULL,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE, 
    Phone VARCHAR(20) UNIQUE,
    Status BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_User_Role FOREIGN KEY(RoleID) REFERENCES Role(RoleID) ON UPDATE NO ACTION ON DELETE NO ACTION
);

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
    -- [CHECK] Ngày sinh phải trước ngày đi làm
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

-- [NÊN SỬA]: Bảng lịch sử giá thuê niêm yết của căn hộ
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
    -- [CHECK] Ngày hết hạn phải sau ngày cấp
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
    -- [CHECK] Ngày kết thúc hợp đồng phải sau ngày bắt đầu
    CONSTRAINT CHK_Contract_Duration CHECK (EndDate > StartDate)
);

CREATE TABLE ContractResident (
    ContractResidentID INT IDENTITY(1,1) PRIMARY KEY,
    ContractID INT NOT NULL,
    ResidentID INT NOT NULL, 
    Relationship NVARCHAR(50), 
    MoveInDate DATE,
    MoveOutDate DATE,
    CONSTRAINT FK_CR_Contract FOREIGN KEY(ContractID) REFERENCES Contract(ContractID) ON UPDATE NO ACTION ON DELETE CASCADE, -- Xóa hợp đồng thì xóa danh sách thành viên ở phòng đó
    CONSTRAINT FK_CR_Resident FOREIGN KEY(ResidentID) REFERENCES Resident(ResidentID) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_Contract_Resident UNIQUE(ContractID, ResidentID),
    -- [CHECK] Ngày dời đi phải sau hoặc bằng ngày dời vào
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
    -- [CHECK] Chỉ số mới không được nhỏ hơn chỉ số cũ
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
    -- [CASCADE]: Xóa hóa đơn tổng thì tự động xóa sạch các dòng chi tiết của nó
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
    CONSTRAINT FK_ParkingCard_Vehicle FOREIGN KEY(VehicleID) REFERENCES Vehicle(VehicleID) ON UPDATE NO ACTION ON DELETE CASCADE, -- Hủy xe thì hủy luôn thẻ xe đó
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
    -- [CASCADE]: Xóa bản tin thông báo gốc thì dọn sạch hộp thư của tất cả cư dân liên quan
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
-- TẠO HỆ THỐNG INDEX (TỐI ƯU HÓA TÌM KIẾM & TRUY VẤN)
--====================================================

-- Cột tìm kiếm thường xuyên ở các bảng chính
CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Resident_FullName ON Resident(FullName);
CREATE INDEX IX_Resident_Phone ON Resident(Phone);
CREATE INDEX IX_Apartment_Code ON Apartment(ApartmentCode);
CREATE INDEX IX_Contract_Number ON Contract(ContractNumber);

-- Tối ưu truy vấn tìm kiếm theo thời gian (Kỳ hóa đơn / Kỳ chốt số)
CREATE INDEX IX_Invoice_Period ON Invoice(InvoiceYear, InvoiceMonth);
CREATE INDEX IX_MeterReading_Period ON MeterReading(ReadingYear, ReadingMonth);

-- Khóa ngoại của các bảng quan hệ nhiều (Nên có Index để tăng tốc độ lệnh JOIN)
CREATE INDEX IX_FK_Users_Role ON Users(RoleID);
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
GO