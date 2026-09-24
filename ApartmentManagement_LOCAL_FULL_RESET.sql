/*
    ApartmentManagement - FULL RESET (LOCAL SQL SERVER)
    Generated from Ngay10_9.sql and synchronized with the current project.
    WARNING: This script DROPS the existing ApartmentManagement database and recreates it.
*/
USE [master];
GO
IF DB_ID(N'ApartmentManagement') IS NOT NULL
BEGIN
    ALTER DATABASE [ApartmentManagement] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [ApartmentManagement];
END;
GO
CREATE DATABASE [ApartmentManagement];
GO
ALTER DATABASE [ApartmentManagement] SET COMPATIBILITY_LEVEL = 160;
GO
USE [ApartmentManagement];
GO
/****** Object:  Table [dbo].[Apartment]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Apartment](
	[ApartmentID] [int] IDENTITY(1,1) NOT NULL,
	[FloorID] [int] NOT NULL,
	[ApartmentCode] [nvarchar](50) NOT NULL,
	[Area] [decimal](10, 2) NULL,
	[StatusID] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ApartmentArea]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ApartmentArea](
	[AreaID] [int] IDENTITY(1,1) NOT NULL,
	[AreaName] [nvarchar](100) NOT NULL,
	[Address] [nvarchar](255) NULL,
	[Description] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[AreaID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ApartmentPriceHistory]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ApartmentPriceHistory](
	[PriceHistoryID] [int] IDENTITY(1,1) NOT NULL,
	[ApartmentID] [int] NOT NULL,
	[BaseRentalPrice] [decimal](18, 2) NOT NULL,
	[EffectiveDate] [date] NOT NULL,
	[Note] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[PriceHistoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AuditLog]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuditLog](
	[LogID] [bigint] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NULL,
	[Action] [varchar](50) NOT NULL,
	[TableName] [varchar](100) NOT NULL,
	[RecordID] [int] NOT NULL,
	[OldValue] [nvarchar](max) NULL,
	[NewValue] [nvarchar](max) NULL,
	[Timestamp] [datetime] NULL,
	[IPAddress] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[LogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Building]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Building](
	[BuildingID] [int] IDENTITY(1,1) NOT NULL,
	[AreaID] [int] NOT NULL,
	[BuildingName] [nvarchar](100) NOT NULL,
	[NumberOfFloors] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[BuildingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Contract]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Contract](
	[ContractID] [int] IDENTITY(1,1) NOT NULL,
	[ApartmentID] [int] NOT NULL,
	[OwnerID] [int] NOT NULL,
	[ContractNumber] [nvarchar](100) NOT NULL,
	[SignDate] [date] NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NOT NULL,
	[Deposit] [decimal](18, 2) NULL,
	[Rent] [decimal](18, 2) NOT NULL,
	[StatusID] [int] NOT NULL,
	[CreatedDate] [datetime] NULL,
	[ContractTermMonths] [int] NULL,
	[DepositMonths] [int] NULL,
	[PaymentCycleMonths] [int] NOT NULL,
	[MonthlyBillingDay] [int] NOT NULL,
	[SignedContractImage] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Added: Contract equipment delivered with a rental contract ******/
IF OBJECT_ID(N'dbo.ContractEquipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContractEquipment (
        ContractEquipmentID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContractEquipment PRIMARY KEY,
        ContractID INT NOT NULL,
        EquipmentName NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100) NULL,
        Brand NVARCHAR(100) NULL,
        Model NVARCHAR(150) NULL,
        Quantity INT NOT NULL CONSTRAINT DF_ContractEquipment_Quantity DEFAULT (1),
        Location NVARCHAR(255) NULL,
        Specifications NVARCHAR(1000) NULL,
        ConditionDescription NVARCHAR(1000) NULL,
        EquipmentStatus NVARCHAR(50) NULL,
        CreatedDate DATETIME2 NOT NULL CONSTRAINT DF_ContractEquipment_CreatedDate DEFAULT (SYSDATETIME()),
        CONSTRAINT FK_ContractEquipment_Contract FOREIGN KEY (ContractID)
            REFERENCES dbo.Contract(ContractID) ON DELETE CASCADE,
        CONSTRAINT CK_ContractEquipment_Quantity CHECK (Quantity > 0)
    );

    CREATE INDEX IX_ContractEquipment_ContractID
        ON dbo.ContractEquipment(ContractID);
END;
GO
/****** Object:  Table [dbo].[ContractResident]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContractResident](
	[ContractResidentID] [int] IDENTITY(1,1) NOT NULL,
	[ContractID] [int] NOT NULL,
	[ResidentID] [int] NOT NULL,
	[Relationship] [nvarchar](50) NULL,
	[MoveInDate] [date] NULL,
	[MoveOutDate] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[ContractResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContractStatus]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContractStatus](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Employee]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Employee](
	[EmployeeID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[Gender] [bit] NULL,
	[BirthDate] [date] NULL,
	[Phone] [varchar](20) NULL,
	[Email] [varchar](100) NULL,
	[Address] [nvarchar](255) NULL,
	[CCCD] [varchar](20) NULL,
	[HireDate] [date] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[EmployeeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Feedback]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Feedback](
	[FeedbackID] [int] IDENTITY(1,1) NOT NULL,
	[ResidentID] [int] NOT NULL,
	[Title] [nvarchar](200) NOT NULL,
	[Content] [nvarchar](max) NOT NULL,
	[Rating] [int] NULL,
	[Reply] [nvarchar](max) NULL,
	[CreatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[FeedbackID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Floor]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Floor](
	[FloorID] [int] IDENTITY(1,1) NOT NULL,
	[BuildingID] [int] NOT NULL,
	[FloorNumber] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[FloorID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Invoice]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Invoice](
	[InvoiceID] [int] IDENTITY(1,1) NOT NULL,
	[ContractID] [int] NOT NULL,
	[InvoiceMonth] [int] NOT NULL,
	[InvoiceYear] [int] NOT NULL,
	[InvoiceDate] [date] NULL,
	[DueDate] [date] NULL,
	[TotalAmount] [decimal](18, 2) NULL,
	[StatusID] [int] NOT NULL,
	[WorkflowStatus] [varchar](30) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[InvoiceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InvoiceDetail]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InvoiceDetail](
	[InvoiceDetailID] [int] IDENTITY(1,1) NOT NULL,
	[InvoiceID] [int] NOT NULL,
	[ChargeType] [varchar](50) NOT NULL,
	[Description] [nvarchar](255) NOT NULL,
	[Quantity] [decimal](18, 2) NULL,
	[UnitPrice] [decimal](18, 2) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[ParkingSubscriptionID] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[InvoiceDetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InvoiceStatus]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InvoiceStatus](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaintenanceRequest]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaintenanceRequest](
	[RequestID] [int] IDENTITY(1,1) NOT NULL,
	[ResidentID] [int] NOT NULL,
	[ApartmentID] [int] NOT NULL,
	[Title] [nvarchar](200) NOT NULL,
	[Description] [nvarchar](max) NULL,
	[RequestDate] [datetime] NULL,
	[AssignedEmployeeID] [int] NULL,
	[StatusID] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RequestID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaintenanceStatus]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaintenanceStatus](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MeterReading]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MeterReading](
	[ReadingID] [int] IDENTITY(1,1) NOT NULL,
	[ApartmentID] [int] NOT NULL,
	[EmployeeID] [int] NULL,
	[UtilityTypeID] [int] NOT NULL,
	[ReadingMonth] [int] NOT NULL,
	[ReadingYear] [int] NOT NULL,
	[OldIndex] [decimal](18, 2) NOT NULL,
	[NewIndex] [decimal](18, 2) NOT NULL,
	[ReadingDate] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[ReadingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Module]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Module](
	[ModuleID] [int] IDENTITY(1,1) NOT NULL,
	[ModuleCode] [varchar](50) NOT NULL,
	[ModuleName] [nvarchar](100) NOT NULL,
	[Icon] [varchar](100) NULL,
	[SortOrder] [int] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[ModuleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notification]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notification](
	[NotificationID] [int] IDENTITY(1,1) NOT NULL,
	[SenderID] [int] NULL,
	[Title] [nvarchar](200) NOT NULL,
	[Content] [nvarchar](max) NOT NULL,
	[CreatedDate] [datetime] NULL,
	[TargetScope] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[NotificationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[NotificationReceiver]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[NotificationReceiver](
	[ReceiverID] [int] IDENTITY(1,1) NOT NULL,
	[NotificationID] [int] NOT NULL,
	[UserID] [int] NOT NULL,
	[IsRead] [bit] NULL,
	[ReadDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[ReceiverID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ParkingAccessLog]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ParkingAccessLog](
	[AccessLogID] [bigint] IDENTITY(1,1) NOT NULL,
	[ParkingSubscriptionID] [int] NOT NULL,
	[VehicleID] [int] NOT NULL,
	[CardID] [int] NOT NULL,
	[SlotID] [int] NULL,
	[EventType] [varchar](10) NOT NULL,
	[EventTime] [datetime2](7) NOT NULL,
	[PlateNumberSnapshot] [varchar](20) NOT NULL,
	[CardCodeSnapshot] [varchar](50) NOT NULL,
	[GateName] [nvarchar](100) NULL,
	[Note] [nvarchar](255) NULL,
	[RecordedByUserID] [int] NULL,
 CONSTRAINT [PK_ParkingAccessLog] PRIMARY KEY CLUSTERED 
(
	[AccessLogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ParkingCard]    Script Date: 10/09/2026 2:57:30 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ParkingCard](
	[CardID] [int] IDENTITY(1,1) NOT NULL,
	[VehicleID] [int] NOT NULL,
	[CardCode] [varchar](50) NOT NULL,
	[SlotID] [int] NULL,
	[IssueDate] [date] NULL,
	[ExpiredDate] [date] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[CardID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ParkingSlot]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ParkingSlot](
	[SlotID] [int] IDENTITY(1,1) NOT NULL,
	[AreaID] [int] NOT NULL,
	[SlotNumber] [varchar](20) NOT NULL,
	[VehicleTypeID] [int] NOT NULL,
	[IsOccupied] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[SlotID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ParkingSubscription]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ParkingSubscription](
	[ParkingSubscriptionID] [int] IDENTITY(1,1) NOT NULL,
	[VehicleID] [int] NOT NULL,
	[ContractID] [int] NOT NULL,
	[CardID] [int] NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NULL,
	[MonthlyFeeSnapshot] [decimal](18, 2) NOT NULL,
	[Status] [varchar](20) NOT NULL,
	[CreatedByUserID] [int] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_ParkingSubscription] PRIMARY KEY CLUSTERED 
(
	[ParkingSubscriptionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Payment]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Payment](
	[PaymentID] [int] IDENTITY(1,1) NOT NULL,
	[InvoiceID] [int] NOT NULL,
	[MethodID] [int] NOT NULL,
	[PaymentDate] [datetime] NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[TransactionCode] [varchar](100) NULL,
	[StatusID] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PaymentMethod]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PaymentMethod](
	[MethodID] [int] IDENTITY(1,1) NOT NULL,
	[MethodName] [nvarchar](100) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MethodID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PaymentStatus]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PaymentStatus](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Permission]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Permission](
	[PermissionID] [int] IDENTITY(1,1) NOT NULL,
	[ModuleID] [int] NOT NULL,
	[PermissionCode] [varchar](100) NOT NULL,
	[PermissionName] [nvarchar](150) NOT NULL,
	[Description] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[PermissionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Resident]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Resident](
	[ResidentID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[Gender] [bit] NULL,
	[BirthDate] [date] NULL,
	[Phone] [varchar](20) NULL,
	[Email] [varchar](100) NULL,
	[Address] [nvarchar](255) NULL,
	[Avatar] [nvarchar](255) NULL,
	[Status] [bit] NULL,
	[EmergencyContactName] [nvarchar](100) NULL,
	[EmergencyContactPhone] [varchar](20) NULL,
PRIMARY KEY CLUSTERED 
(
	[ResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ResidentIdentity]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ResidentIdentity](
	[IdentityID] [int] IDENTITY(1,1) NOT NULL,
	[ResidentID] [int] NOT NULL,
	[IdentityNumber] [varchar](20) NOT NULL,
	[FrontImage] [nvarchar](255) NULL,
	[BackImage] [nvarchar](255) NULL,
	[IssueDate] [date] NULL,
	[IssuePlace] [nvarchar](100) NULL,
	[ExpiredDate] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[IdentityID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Role]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Role](
	[RoleID] [int] IDENTITY(1,1) NOT NULL,
	[RoleCode] [varchar](50) NOT NULL,
	[RoleName] [nvarchar](100) NOT NULL,
	[Description] [nvarchar](255) NULL,
	[Status] [bit] NOT NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RolePermission]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RolePermission](
	[RolePermissionID] [int] IDENTITY(1,1) NOT NULL,
	[RoleID] [int] NOT NULL,
	[PermissionID] [int] NOT NULL,
	[IsGranted] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RolePermissionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RoomStatus]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoomStatus](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Service]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Service](
	[ServiceID] [int] IDENTITY(1,1) NOT NULL,
	[CategoryID] [int] NOT NULL,
	[ServiceName] [nvarchar](100) NOT NULL,
	[Unit] [nvarchar](50) NULL,
	[Price] [decimal](18, 2) NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[ServiceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceCategory]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceCategory](
	[CategoryID] [int] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[Description] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[CategoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceRegistration]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceRegistration](
	[RegistrationID] [int] IDENTITY(1,1) NOT NULL,
	[ContractID] [int] NOT NULL,
	[ServiceID] [int] NOT NULL,
	[RegisterDate] [date] NULL,
	[EndDate] [date] NULL,
	[Quantity] [int] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[RegistrationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SmartMeter]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SmartMeter](
	[MeterID] [int] IDENTITY(1,1) NOT NULL,
	[ApartmentID] [int] NOT NULL,
	[UtilityTypeID] [int] NOT NULL,
	[CurrentIndex] [decimal](18, 3) NOT NULL,
	[LastTickAt] [datetime2](7) NULL,
	[Status] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MeterID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SmartMeterLog]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SmartMeterLog](
	[LogID] [bigint] IDENTITY(1,1) NOT NULL,
	[MeterID] [int] NOT NULL,
	[OldIndex] [decimal](18, 3) NOT NULL,
	[NewIndex] [decimal](18, 3) NOT NULL,
	[DeltaValue] [decimal](18, 3) NOT NULL,
	[Source] [varchar](20) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[LogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UserRole]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserRole](
	[UserRoleID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[RoleID] [int] NOT NULL,
	[AssignedDate] [datetime] NULL,
	[AssignedBy] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserRoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[Username] [varchar](50) NOT NULL,
	[PasswordHash] [varchar](255) NOT NULL,
	[Email] [varchar](100) NULL,
	[Phone] [varchar](20) NULL,
	[Status] [bit] NULL,
	[LastLogin] [datetime] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UtilityPriceTier]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UtilityPriceTier](
	[PriceTierID] [int] IDENTITY(1,1) NOT NULL,
	[UtilityTypeID] [int] NOT NULL,
	[TierName] [nvarchar](50) NULL,
	[FromValue] [decimal](18, 2) NOT NULL,
	[ToValue] [decimal](18, 2) NULL,
	[UnitPrice] [decimal](18, 2) NOT NULL,
	[EffectiveDate] [date] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PriceTierID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UtilityType]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UtilityType](
	[UtilityTypeID] [int] IDENTITY(1,1) NOT NULL,
	[UtilityName] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[UtilityTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Vehicle]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Vehicle](
	[VehicleID] [int] IDENTITY(1,1) NOT NULL,
	[ResidentID] [int] NOT NULL,
	[PlateNumber] [varchar](20) NOT NULL,
	[VehicleTypeID] [int] NOT NULL,
	[Brand] [nvarchar](100) NULL,
	[Color] [nvarchar](50) NULL,
	[RegisterDate] [date] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[VehicleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VehicleType]    Script Date: 10/09/2026 2:57:31 CH ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VehicleType](
	[VehicleTypeID] [int] IDENTITY(1,1) NOT NULL,
	[TypeName] [nvarchar](50) NOT NULL,
	[MonthlyFee] [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[VehicleTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[Apartment] ON 

INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (16, 15, N'Tòa A-T1-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (17, 15, N'Tòa A-T1-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (18, 15, N'Tòa A-T1-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (19, 15, N'Tòa A-T1-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (20, 15, N'Tòa A-T1-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (21, 16, N'Tòa A-T2-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (22, 16, N'Tòa A-T2-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (23, 16, N'Tòa A-T2-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (24, 16, N'Tòa A-T2-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (25, 16, N'Tòa A-T2-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (26, 17, N'Tòa A-T3-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (27, 17, N'Tòa A-T3-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (28, 17, N'Tòa A-T3-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (29, 17, N'Tòa A-T3-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (30, 17, N'Tòa A-T3-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (31, 18, N'Tòa A-T4-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (32, 18, N'Tòa A-T4-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (33, 18, N'Tòa A-T4-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (34, 18, N'Tòa A-T4-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (35, 18, N'Tòa A-T4-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (36, 19, N'Tòa A-T5-P1', CAST(30.00 AS Decimal(10, 2)), 2)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (37, 19, N'Tòa A-T5-P2', CAST(30.00 AS Decimal(10, 2)), 2)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (38, 19, N'Tòa A-T5-P3', CAST(30.00 AS Decimal(10, 2)), 2)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (39, 19, N'Tòa A-T5-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (40, 19, N'Tòa A-T5-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (41, 20, N'Tòa B-T1-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (42, 20, N'Tòa B-T1-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (43, 20, N'Tòa B-T1-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (44, 20, N'Tòa B-T1-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (45, 20, N'Tòa B-T1-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (46, 21, N'Tòa B-T2-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (47, 21, N'Tòa B-T2-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (48, 21, N'Tòa B-T2-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (49, 21, N'Tòa B-T2-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (50, 21, N'Tòa B-T2-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (51, 22, N'Tòa B-T3-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (52, 22, N'Tòa B-T3-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (53, 22, N'Tòa B-T3-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (54, 22, N'Tòa B-T3-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (55, 22, N'Tòa B-T3-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (56, 23, N'Tòa B-T4-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (57, 23, N'Tòa B-T4-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (58, 23, N'Tòa B-T4-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (59, 23, N'Tòa B-T4-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (60, 23, N'Tòa B-T4-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (61, 24, N'Tòa B-T5-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (62, 24, N'Tòa B-T5-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (63, 24, N'Tòa B-T5-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (64, 24, N'Tòa B-T5-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (65, 24, N'Tòa B-T5-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (66, 25, N'Tòa C-T1-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (67, 25, N'Tòa C-T1-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (68, 25, N'Tòa C-T1-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (69, 25, N'Tòa C-T1-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (70, 25, N'Tòa C-T1-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (71, 26, N'Tòa C-T2-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (72, 26, N'Tòa C-T2-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (73, 26, N'Tòa C-T2-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (74, 26, N'Tòa C-T2-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (75, 26, N'Tòa C-T2-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (76, 27, N'Tòa C-T3-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (77, 27, N'Tòa C-T3-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (78, 27, N'Tòa C-T3-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (79, 27, N'Tòa C-T3-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (80, 27, N'Tòa C-T3-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (81, 28, N'Tòa C-T4-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (82, 28, N'Tòa C-T4-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (83, 28, N'Tòa C-T4-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (84, 28, N'Tòa C-T4-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (85, 28, N'Tòa C-T4-P5', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (86, 29, N'Tòa C-T5-P1', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (87, 29, N'Tòa C-T5-P2', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (88, 29, N'Tòa C-T5-P3', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (89, 29, N'Tòa C-T5-P4', CAST(30.00 AS Decimal(10, 2)), 1)
INSERT [dbo].[Apartment] ([ApartmentID], [FloorID], [ApartmentCode], [Area], [StatusID]) VALUES (90, 29, N'Tòa C-T5-P5', CAST(30.00 AS Decimal(10, 2)), 1)
SET IDENTITY_INSERT [dbo].[Apartment] OFF
GO
SET IDENTITY_INSERT [dbo].[ApartmentArea] ON 

INSERT [dbo].[ApartmentArea] ([AreaID], [AreaName], [Address], [Description]) VALUES (1, N'Đức Vũ Tower - Khu A', N'Đường Mai Chí Thọ, Quận 2, TP. Thủ Đức', N'Khu căn hộ cao cấp Block A')
INSERT [dbo].[ApartmentArea] ([AreaID], [AreaName], [Address], [Description]) VALUES (4, N'Khu A', N'123 Đường A', N'Khu chung cư A')
INSERT [dbo].[ApartmentArea] ([AreaID], [AreaName], [Address], [Description]) VALUES (5, N'Khu B', N'456 Đường B', N'Khu chung cư B')
INSERT [dbo].[ApartmentArea] ([AreaID], [AreaName], [Address], [Description]) VALUES (6, N'Khu mặc định', N'Địa chỉ mặc định', N'Khu tạo sẵn cho dev')
SET IDENTITY_INSERT [dbo].[ApartmentArea] OFF
GO
SET IDENTITY_INSERT [dbo].[AuditLog] ON 

INSERT [dbo].[AuditLog] ([LogID], [UserID], [Action], [TableName], [RecordID], [OldValue], [NewValue], [Timestamp], [IPAddress]) VALUES (1, 1, N'INSERT', N'Resident', 531, NULL, NULL, CAST(N'2026-09-03T23:29:45.733' AS DateTime), N'::1')
INSERT [dbo].[AuditLog] ([LogID], [UserID], [Action], [TableName], [RecordID], [OldValue], [NewValue], [Timestamp], [IPAddress]) VALUES (2, 1, N'INSERT', N'Resident', 532, NULL, NULL, CAST(N'2026-09-03T23:55:32.477' AS DateTime), N'::1')
SET IDENTITY_INSERT [dbo].[AuditLog] OFF
GO
SET IDENTITY_INSERT [dbo].[Building] ON 

INSERT [dbo].[Building] ([BuildingID], [AreaID], [BuildingName], [NumberOfFloors]) VALUES (13, 1, N'Tòa A', 5)
INSERT [dbo].[Building] ([BuildingID], [AreaID], [BuildingName], [NumberOfFloors]) VALUES (14, 1, N'Tòa B', 5)
INSERT [dbo].[Building] ([BuildingID], [AreaID], [BuildingName], [NumberOfFloors]) VALUES (15, 1, N'Tòa C', 5)
SET IDENTITY_INSERT [dbo].[Building] OFF
GO
SET IDENTITY_INSERT [dbo].[Contract] ON 

INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (152, 36, 532, N'HD-Tòa A-T5-P1-20260903', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-12-02' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 2, CAST(N'2026-09-04T00:31:28.847' AS DateTime), 3, 1, 1, 10, N'/uploads/contracts/contract-152-1788456688871-249627483.webp')
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (153, 37, 531, N'HD-Tòa A-T5-P2-20260903', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T01:22:40.660' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (154, 38, 532, N'HD-Tòa A-T5-P3-20260903', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-12-02' AS Date), CAST(15000000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T01:23:52.337' AS DateTime), 3, 2, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (155, 39, 532, N'HD-Tòa A-T5-P4-20260903', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T01:27:27.670' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (156, 37, 532, N'HD-Tòa A-T5-P2-124323', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T01:32:28.540' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (157, 37, 532, N'HD-Tòa A-T5-P2-20260943', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T01:50:37.710' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (158, 37, 532, N'HD-Tòa A-T5-P2-20260952', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 4, CAST(N'2026-09-04T02:08:44.057' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (159, 37, 532, N'HD-Tòa A-T5-P2-20260988', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 2, CAST(N'2026-09-04T02:13:16.330' AS DateTime), NULL, 1, 1, 10, NULL)
INSERT [dbo].[Contract] ([ContractID], [ApartmentID], [OwnerID], [ContractNumber], [SignDate], [StartDate], [EndDate], [Deposit], [Rent], [StatusID], [CreatedDate], [ContractTermMonths], [DepositMonths], [PaymentCycleMonths], [MonthlyBillingDay], [SignedContractImage]) VALUES (160, 38, 531, N'HD-Tòa A-T5-P3-20260988', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-03' AS Date), CAST(N'2026-10-03' AS Date), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), 2, CAST(N'2026-09-04T02:30:54.210' AS DateTime), NULL, 1, 1, 10, NULL)
SET IDENTITY_INSERT [dbo].[Contract] OFF
GO
SET IDENTITY_INSERT [dbo].[ContractResident] ON 

INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (514, 152, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), NULL)
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (515, 152, 531, N'Người ở', CAST(N'2026-09-03' AS Date), NULL)
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (516, 153, 531, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (517, 153, 532, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (518, 154, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (519, 154, 531, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (520, 155, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (521, 155, 531, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (522, 156, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (523, 156, 531, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (524, 157, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (525, 157, 531, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (526, 158, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (527, 158, 531, N'Người ở', CAST(N'2026-09-03' AS Date), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (528, 159, 532, N'Chủ hộ', CAST(N'2026-09-03' AS Date), NULL)
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (529, 159, 531, N'Người ở', CAST(N'2026-09-03' AS Date), NULL)
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (530, 160, 531, N'Chủ hộ', CAST(N'2026-09-03' AS Date), NULL)
INSERT [dbo].[ContractResident] ([ContractResidentID], [ContractID], [ResidentID], [Relationship], [MoveInDate], [MoveOutDate]) VALUES (531, 160, 532, N'Người ở', CAST(N'2026-09-03' AS Date), NULL)
SET IDENTITY_INSERT [dbo].[ContractResident] OFF
GO
SET IDENTITY_INSERT [dbo].[ContractStatus] ON 

INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (8, N'Chưa ký')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (6, N'Đã hết hạn')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (4, N'Đã thanh lý')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (5, N'Đang hiệu lực')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (3, N'Hết hạn')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (2, N'Hiệu lực')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (1, N'Mới lập')
INSERT [dbo].[ContractStatus] ([StatusID], [StatusName]) VALUES (7, N'Sắp hết hạn')
SET IDENTITY_INSERT [dbo].[ContractStatus] OFF
GO
SET IDENTITY_INSERT [dbo].[Employee] ON 

INSERT [dbo].[Employee] ([EmployeeID], [UserID], [FullName], [Gender], [BirthDate], [Phone], [Email], [Address], [CCCD], [HireDate], [Status]) VALUES (1, 1, N'Trần Đức Vũ', 1, CAST(N'1985-05-20' AS Date), N'0911111111', N'admin@anbinh.vn', N'Quận 1, TP. HCM', N'012345678901', CAST(N'2020-01-15' AS Date), 1)
SET IDENTITY_INSERT [dbo].[Employee] OFF
GO
SET IDENTITY_INSERT [dbo].[Floor] ON 

INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (15, 13, 1)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (16, 13, 2)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (17, 13, 3)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (18, 13, 4)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (19, 13, 5)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (20, 14, 1)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (21, 14, 2)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (22, 14, 3)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (23, 14, 4)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (24, 14, 5)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (25, 15, 1)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (26, 15, 2)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (27, 15, 3)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (28, 15, 4)
INSERT [dbo].[Floor] ([FloorID], [BuildingID], [FloorNumber]) VALUES (29, 15, 5)
SET IDENTITY_INSERT [dbo].[Floor] OFF
GO
SET IDENTITY_INSERT [dbo].[Invoice] ON 

INSERT [dbo].[Invoice] ([InvoiceID], [ContractID], [InvoiceMonth], [InvoiceYear], [InvoiceDate], [DueDate], [TotalAmount], [StatusID], [WorkflowStatus]) VALUES (13, 152, 9, 2026, CAST(N'2026-09-03' AS Date), CAST(N'2026-09-09' AS Date), CAST(8612270.00 AS Decimal(18, 2)), 2, N'PAID')
INSERT [dbo].[Invoice] ([InvoiceID], [ContractID], [InvoiceMonth], [InvoiceYear], [InvoiceDate], [DueDate], [TotalAmount], [StatusID], [WorkflowStatus]) VALUES (20, 159, 9, 2026, CAST(N'2026-09-03' AS Date), CAST(N'2026-09-09' AS Date), CAST(7750000.00 AS Decimal(18, 2)), 1, N'DRAFT')
INSERT [dbo].[Invoice] ([InvoiceID], [ContractID], [InvoiceMonth], [InvoiceYear], [InvoiceDate], [DueDate], [TotalAmount], [StatusID], [WorkflowStatus]) VALUES (21, 160, 9, 2026, CAST(N'2026-09-03' AS Date), CAST(N'2026-09-09' AS Date), CAST(7650000.00 AS Decimal(18, 2)), 1, N'DRAFT')
SET IDENTITY_INSERT [dbo].[Invoice] OFF
GO
SET IDENTITY_INSERT [dbo].[InvoiceDetail] ON 

INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (38, 13, N'ROOM', N'Tiền thuê căn hộ Tòa A-T5-P1 tháng 9/2026', CAST(1.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (39, 13, N'ELECTRIC', N'Tiền điện: (75 - 0) x đơn giá bậc thang = 150.450 VND', CAST(75.00 AS Decimal(18, 2)), CAST(2006.00 AS Decimal(18, 2)), CAST(150450.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (40, 13, N'WATER', N'Tiền nước: (55 - 0) x đơn giá bậc thang = 961.820 VND', CAST(55.00 AS Decimal(18, 2)), CAST(17488.00 AS Decimal(18, 2)), CAST(961820.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (78, 20, N'ROOM', N'Tiền thuê căn hộ Tòa A-T5-P2 tháng 9/2026', CAST(1.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (79, 20, N'SERVICE', N'Phí Gym tháng 9/2026', CAST(1.00 AS Decimal(18, 2)), CAST(250000.00 AS Decimal(18, 2)), CAST(250000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (80, 21, N'ROOM', N'Tiền thuê căn hộ Tòa A-T5-P3 tháng 9/2026', CAST(1.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), CAST(7500000.00 AS Decimal(18, 2)), NULL)
INSERT [dbo].[InvoiceDetail] ([InvoiceDetailID], [InvoiceID], [ChargeType], [Description], [Quantity], [UnitPrice], [Amount], [ParkingSubscriptionID]) VALUES (81, 21, N'SERVICE', N'Phí Wifi tháng 9/2026', CAST(1.00 AS Decimal(18, 2)), CAST(150000.00 AS Decimal(18, 2)), CAST(150000.00 AS Decimal(18, 2)), NULL)
SET IDENTITY_INSERT [dbo].[InvoiceDetail] OFF
GO
SET IDENTITY_INSERT [dbo].[InvoiceStatus] ON 

INSERT [dbo].[InvoiceStatus] ([StatusID], [StatusName]) VALUES (1, N'Chưa thanh toán')
INSERT [dbo].[InvoiceStatus] ([StatusID], [StatusName]) VALUES (4, N'Đã hủy')
INSERT [dbo].[InvoiceStatus] ([StatusID], [StatusName]) VALUES (2, N'Đã thanh toán')
INSERT [dbo].[InvoiceStatus] ([StatusID], [StatusName]) VALUES (3, N'Quá hạn')
SET IDENTITY_INSERT [dbo].[InvoiceStatus] OFF
GO
SET IDENTITY_INSERT [dbo].[MaintenanceStatus] ON 

INSERT [dbo].[MaintenanceStatus] ([StatusID], [StatusName]) VALUES (4, N'Đã hủy')
INSERT [dbo].[MaintenanceStatus] ([StatusID], [StatusName]) VALUES (2, N'Đang xử lý')
INSERT [dbo].[MaintenanceStatus] ([StatusID], [StatusName]) VALUES (3, N'Hoàn tất')
INSERT [dbo].[MaintenanceStatus] ([StatusID], [StatusName]) VALUES (1, N'Mới tiếp nhận')
SET IDENTITY_INSERT [dbo].[MaintenanceStatus] OFF
GO
SET IDENTITY_INSERT [dbo].[MeterReading] ON 

INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (23, 36, NULL, 3, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(75.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (24, 36, NULL, 4, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(55.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (25, 37, NULL, 3, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(64.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (26, 37, NULL, 4, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(345.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (27, 38, NULL, 3, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(1.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (28, 38, NULL, 4, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(1.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (29, 39, NULL, 3, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(1.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
INSERT [dbo].[MeterReading] ([ReadingID], [ApartmentID], [EmployeeID], [UtilityTypeID], [ReadingMonth], [ReadingYear], [OldIndex], [NewIndex], [ReadingDate]) VALUES (30, 39, NULL, 4, 9, 2026, CAST(0.00 AS Decimal(18, 2)), CAST(1.00 AS Decimal(18, 2)), CAST(N'2026-09-04' AS Date))
SET IDENTITY_INSERT [dbo].[MeterReading] OFF
GO
SET IDENTITY_INSERT [dbo].[Module] ON 

INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (1, N'DASHBOARD', N'Tổng quan', NULL, 1, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (2, N'RESIDENT', N'Quản lý cư dân', NULL, 2, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (3, N'APARTMENT', N'Quản lý căn hộ', NULL, 3, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (4, N'CONTRACT', N'Quản lý hợp đồng', NULL, 4, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (5, N'SERVICE', N'Dịch vụ công ích', NULL, 5, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (6, N'FINANCE', N'Hóa đơn & Tài chính', NULL, 6, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (7, N'PARKING', N'Gửi xe', NULL, 7, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (8, N'OPERATION', N'Vận hành', NULL, 8, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (9, N'NOTIFICATION', N'Thông báo', NULL, 9, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (10, N'EMPLOYEE', N'Nhân sự', NULL, 10, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (11, N'REPORT', N'Báo cáo', NULL, 11, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (12, N'AI', N'AI Assistant', NULL, 12, 1)
INSERT [dbo].[Module] ([ModuleID], [ModuleCode], [ModuleName], [Icon], [SortOrder], [Status]) VALUES (13, N'SETTING', N'Cài đặt', NULL, 13, 1)
SET IDENTITY_INSERT [dbo].[Module] OFF
GO
SET IDENTITY_INSERT [dbo].[Payment] ON 

INSERT [dbo].[Payment] ([PaymentID], [InvoiceID], [MethodID], [PaymentDate], [Amount], [TransactionCode], [StatusID]) VALUES (7, 13, 1, CAST(N'2026-09-04T01:21:36.640' AS DateTime), CAST(8612270.00 AS Decimal(18, 2)), N'AUTO-PAY-1788459696640', 2)
SET IDENTITY_INSERT [dbo].[Payment] OFF
GO
SET IDENTITY_INSERT [dbo].[PaymentMethod] ON 

INSERT [dbo].[PaymentMethod] ([MethodID], [MethodName]) VALUES (1, N'Chuyển khoản Ngân hàng (VietQR)')
INSERT [dbo].[PaymentMethod] ([MethodID], [MethodName]) VALUES (3, N'Tiền mặt trực tiếp')
INSERT [dbo].[PaymentMethod] ([MethodID], [MethodName]) VALUES (2, N'Ví điện tử (Momo/ZaloPay)')
SET IDENTITY_INSERT [dbo].[PaymentMethod] OFF
GO
SET IDENTITY_INSERT [dbo].[PaymentStatus] ON 

INSERT [dbo].[PaymentStatus] ([StatusID], [StatusName]) VALUES (1, N'Chờ xử lý')
INSERT [dbo].[PaymentStatus] ([StatusID], [StatusName]) VALUES (2, N'Thành công')
INSERT [dbo].[PaymentStatus] ([StatusID], [StatusName]) VALUES (3, N'Thất bại')
SET IDENTITY_INSERT [dbo].[PaymentStatus] OFF
GO
SET IDENTITY_INSERT [dbo].[Permission] ON 

INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (1, 1, N'DASHBOARD_VIEW', N'Xem Dashboard', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (2, 2, N'RESIDENT_VIEW', N'Xem cư dân', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (3, 2, N'RESIDENT_CREATE', N'Thêm cư dân', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (4, 2, N'RESIDENT_UPDATE', N'Sửa cư dân', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (5, 2, N'RESIDENT_DELETE', N'Xóa cư dân', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (6, 3, N'APARTMENT_VIEW', N'Xem căn hộ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (7, 3, N'APARTMENT_CREATE', N'Thêm căn hộ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (8, 3, N'APARTMENT_UPDATE', N'Sửa căn hộ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (9, 3, N'APARTMENT_DELETE', N'Xóa căn hộ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (10, 4, N'CONTRACT_VIEW', N'Xem hợp đồng', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (11, 4, N'CONTRACT_CREATE', N'Tạo hợp đồng', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (12, 4, N'CONTRACT_RENEW', N'Gia hạn hợp đồng', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (13, 4, N'CONTRACT_LIQUIDATE', N'Thanh lý hợp đồng', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (14, 5, N'SERVICE_VIEW', N'Xem dịch vụ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (15, 5, N'SERVICE_CREATE', N'Thêm dịch vụ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (16, 5, N'SERVICE_UPDATE', N'Sửa dịch vụ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (17, 5, N'SERVICE_DELETE', N'Xóa dịch vụ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (18, 6, N'INVOICE_VIEW', N'Xem hóa đơn', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (19, 6, N'INVOICE_CREATE', N'Tạo hóa đơn', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (20, 6, N'PAYMENT_CREATE', N'Thu phí', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (21, 6, N'DEBT_VIEW', N'Xem công nợ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (22, 7, N'PARKING_VIEW', N'Xem gửi xe', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (23, 7, N'VEHICLE_CREATE', N'Thêm xe', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (24, 7, N'CARD_CREATE', N'Cấp thẻ xe', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (25, 7, N'PARKING_HISTORY', N'Lịch sử ra vào', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (26, 8, N'TICKET_VIEW', N'Xem Ticket', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (27, 8, N'TICKET_CREATE', N'Tạo Ticket', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (28, 8, N'MAINTENANCE_UPDATE', N'Cập nhật bảo trì', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (29, 8, N'DEVICE_MANAGE', N'Quản lý thiết bị', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (30, 9, N'NOTIFICATION_VIEW', N'Xem thông báo', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (31, 9, N'NOTIFICATION_SEND', N'Gửi thông báo', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (32, 10, N'EMPLOYEE_VIEW', N'Xem nhân viên', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (33, 10, N'EMPLOYEE_CREATE', N'Thêm nhân viên', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (34, 10, N'ROLE_MANAGE', N'Quản lý vai trò', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (35, 10, N'PERMISSION_MANAGE', N'Phân quyền', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (36, 11, N'REPORT_VIEW', N'Xem báo cáo', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (37, 11, N'REPORT_EXCEL', N'Xuất Excel', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (38, 11, N'REPORT_PDF', N'Xuất PDF', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (39, 12, N'AI_CHAT', N'Chat AI', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (40, 12, N'AI_STATISTIC', N'Thống kê AI', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (41, 12, N'AI_SEARCH', N'Tìm kiếm AI', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (42, 12, N'AI_PREDICT', N'Dự đoán hợp đồng', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (43, 13, N'PROFILE_UPDATE', N'Cập nhật hồ sơ', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (44, 13, N'PASSWORD_CHANGE', N'Đổi mật khẩu', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (45, 13, N'SYSTEM_SETTING', N'Cấu hình hệ thống', NULL)
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (46, 4, N'CONTRACT_UPDATE', N'Sửa hợp đồng', N'Quyền cập nhật/hủy/gia hạn hợp đồng')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (47, 5, N'METER_READING_CREATE', N'Mô phỏng/chốt chỉ số điện nước', N'Cho phép chạy demo smart meter và chốt MeterReading khi tạo hóa đơn')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (48, 5, N'MENU_WIFI_VIEW', N'Xem menu: Wifi', N'Quyền xem menu Wifi')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (49, 6, N'MENU_FEES_VIEW', N'Xem menu: fees', N'Quyền xem độc lập cho trang hóa đơn')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (50, 7, N'VEHICLE_UPDATE', N'Cập nhật phương tiện', N'Cho phép sửa thông tin phương tiện')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (51, 7, N'VEHICLE_DELETE', N'Xóa phương tiện', N'Cho phép xóa phương tiện')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (52, 7, N'CARD_UPDATE', N'Cập nhật thẻ xe', N'Cho phép sửa thông tin thẻ xe')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (53, 7, N'PARKING_SLOT_MANAGE', N'Quản lý vị trí đỗ', N'Cho phép thêm, sửa, xóa vị trí đỗ xe')
INSERT [dbo].[Permission] ([PermissionID], [ModuleID], [PermissionCode], [PermissionName], [Description]) VALUES (54, 7, N'PARKING_ACCESS_CREATE', N'Tạo log ra vào', N'Cho phép ghi nhận sự kiện xe ra/vào')
SET IDENTITY_INSERT [dbo].[Permission] OFF
GO
/****** Added: complete permissions for the current project ******/
DECLARE @ExtraPermissions TABLE (
    ModuleID INT NOT NULL,
    PermissionCode VARCHAR(100) NOT NULL,
    PermissionName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(500) NULL
);
INSERT INTO @ExtraPermissions VALUES (3, 'BUILDING_VIEW', N'Xem tòa nhà', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'BUILDING_CREATE', N'Thêm tòa nhà', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'BUILDING_UPDATE', N'Sửa tòa nhà', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'BUILDING_DELETE', N'Xóa tòa nhà', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'FLOOR_VIEW', N'Xem tầng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'FLOOR_CREATE', N'Thêm tầng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'FLOOR_UPDATE', N'Sửa tầng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (3, 'FLOOR_DELETE', N'Xóa tầng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_DELETE', N'Xóa hợp đồng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_EQUIPMENT_VIEW', N'Xem thiết bị bàn giao hợp đồng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_EQUIPMENT_CREATE', N'Thêm thiết bị bàn giao hợp đồng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_EQUIPMENT_UPDATE', N'Sửa thiết bị bàn giao hợp đồng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_EQUIPMENT_DELETE', N'Xóa thiết bị bàn giao hợp đồng', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'GYM_VIEW', N'Xem phòng Gym', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'GYM_CREATE', N'Thêm đăng ký Gym', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'GYM_UPDATE', N'Sửa đăng ký Gym', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'GYM_DELETE', N'Xóa đăng ký Gym', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'POOL_VIEW', N'Xem hồ bơi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'POOL_CREATE', N'Thêm đăng ký hồ bơi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'POOL_UPDATE', N'Sửa đăng ký hồ bơi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'POOL_DELETE', N'Xóa đăng ký hồ bơi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'WIFI_VIEW', N'Xem dịch vụ Wi-Fi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'WIFI_CREATE', N'Thêm đăng ký Wi-Fi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'WIFI_UPDATE', N'Sửa đăng ký Wi-Fi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'WIFI_DELETE', N'Xóa đăng ký Wi-Fi', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'SERVICE_REGISTRATION_VIEW', N'Xem đăng ký dịch vụ', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'SERVICE_REGISTRATION_CREATE', N'Thêm đăng ký dịch vụ', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'SERVICE_REGISTRATION_UPDATE', N'Sửa đăng ký dịch vụ', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'SERVICE_REGISTRATION_DELETE', N'Xóa đăng ký dịch vụ', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'METER_READING_VIEW', N'Xem chỉ số điện nước', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'METER_READING_UPDATE', N'Sửa chỉ số điện nước', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (5, 'METER_READING_DELETE', N'Xóa chỉ số điện nước', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (6, 'INVOICE_UPDATE', N'Sửa hóa đơn', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (6, 'INVOICE_DELETE', N'Xóa hóa đơn', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (6, 'PAYMENT_VIEW', N'Xem thanh toán', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (6, 'PAYMENT_UPDATE', N'Sửa thanh toán', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (6, 'PAYMENT_DELETE', N'Xóa thanh toán', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'VEHICLE_VIEW', N'Xem phương tiện', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'CARD_VIEW', N'Xem thẻ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'CARD_DELETE', N'Xóa/thu hồi thẻ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SLOT_VIEW', N'Xem vị trí đỗ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SLOT_CREATE', N'Thêm vị trí đỗ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SLOT_UPDATE', N'Sửa vị trí đỗ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SLOT_DELETE', N'Xóa vị trí đỗ xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_ACCESS_VIEW', N'Xem log xe ra vào', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_ACCESS_UPDATE', N'Sửa log xe ra vào', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_ACCESS_DELETE', N'Xóa log xe ra vào', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SUBSCRIPTION_VIEW', N'Xem đăng ký gửi xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SUBSCRIPTION_CREATE', N'Thêm đăng ký gửi xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SUBSCRIPTION_UPDATE', N'Sửa đăng ký gửi xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_SUBSCRIPTION_DELETE', N'Xóa/kết thúc đăng ký gửi xe', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'TICKET_UPDATE', N'Sửa ticket', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'TICKET_DELETE', N'Xóa ticket', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'MAINTENANCE_VIEW', N'Xem bảo trì', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'MAINTENANCE_CREATE', N'Thêm bảo trì', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'MAINTENANCE_DELETE', N'Xóa bảo trì', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_VIEW', N'Xem phản ánh', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_CREATE', N'Thêm phản ánh', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_UPDATE', N'Sửa/phản hồi phản ánh', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_DELETE', N'Xóa phản ánh', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'EQUIPMENT_VIEW', N'Xem thiết bị vận hành', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'EQUIPMENT_CREATE', N'Thêm thiết bị vận hành', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'EQUIPMENT_UPDATE', N'Sửa thiết bị vận hành', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (8, 'EQUIPMENT_DELETE', N'Xóa thiết bị vận hành', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_CREATE', N'Thêm thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_UPDATE', N'Sửa thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_DELETE', N'Xóa thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_SCHEDULE_VIEW', N'Xem lịch gửi thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_SCHEDULE_CREATE', N'Thêm lịch gửi thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_SCHEDULE_UPDATE', N'Sửa lịch gửi thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_SCHEDULE_DELETE', N'Xóa lịch gửi thông báo', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'EMPLOYEE_UPDATE', N'Sửa nhân viên', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'EMPLOYEE_DELETE', N'Xóa nhân viên', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'ROLE_VIEW', N'Xem vai trò', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'ROLE_CREATE', N'Thêm vai trò', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'ROLE_UPDATE', N'Sửa vai trò', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'ROLE_DELETE', N'Xóa vai trò', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'PERMISSION_VIEW', N'Xem phân quyền', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'PERMISSION_CREATE', N'Thêm quyền', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'PERMISSION_UPDATE', N'Sửa quyền', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'PERMISSION_DELETE', N'Xóa quyền', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (10, 'AUDIT_LOG_VIEW', N'Xem nhật ký hệ thống', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (2, 'RESIDENT_VIEW_OWN', N'Xem dữ liệu cư dân của mình', N'Quyền xem danh sách và hồ sơ cư dân thuộc quyền sở hữu / liên quan đến tài khoản hiện tại.');
INSERT INTO @ExtraPermissions VALUES (2, 'RESIDENT_VIEW_ALL', N'Xem tất cả cư dân', N'Quyền xem toàn bộ danh sách cư dân trong tòa nhà.');
INSERT INTO @ExtraPermissions VALUES (3, 'APARTMENT_VIEW_OWN', N'Xem căn hộ của mình', N'Quyền xem căn hộ liên quan đến cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (3, 'APARTMENT_VIEW_ALL', N'Xem tất cả căn hộ', N'Quyền xem toàn bộ căn hộ trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_VIEW_OWN', N'Xem hợp đồng của mình', N'Quyền xem hợp đồng có liên quan đến cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (4, 'CONTRACT_VIEW_ALL', N'Xem tất cả hợp đồng', N'Quyền xem toàn bộ hợp đồng trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (6, 'INVOICE_VIEW_OWN', N'Xem hóa đơn của mình', N'Quyền xem hóa đơn thuộc hợp đồng/căn hộ của cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (6, 'INVOICE_VIEW_ALL', N'Xem tất cả hóa đơn', N'Quyền xem toàn bộ hóa đơn trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (7, 'VEHICLE_VIEW_OWN', N'Xem phương tiện của mình', N'Quyền xem phương tiện thuộc cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'VEHICLE_VIEW_ALL', N'Xem tất cả phương tiện', N'Quyền xem toàn bộ phương tiện trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_VIEW_OWN', N'Xem bãi xe của mình', N'Quyền xem thẻ, đăng ký và lịch sử bãi xe thuộc cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'PARKING_VIEW_ALL', N'Xem tất cả bãi xe', N'Quyền xem toàn bộ thẻ, đăng ký và lịch sử bãi xe.');
INSERT INTO @ExtraPermissions VALUES (8, 'TICKET_VIEW_OWN', N'Xem ticket của mình', N'Quyền xem yêu cầu hỗ trợ thuộc cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'TICKET_VIEW_ALL', N'Xem tất cả ticket', N'Quyền xem toàn bộ yêu cầu hỗ trợ trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_VIEW_OWN', N'Xem phản ánh của mình', N'Quyền xem phản ánh thuộc cư dân hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'FEEDBACK_VIEW_ALL', N'Xem tất cả phản ánh', N'Quyền xem toàn bộ phản ánh trong hệ thống.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_VIEW_OWN', N'Xem thông báo của mình', N'Quyền xem inbox thông báo của tài khoản hiện tại.');
INSERT INTO @ExtraPermissions VALUES (9, 'NOTIFICATION_VIEW_ALL', N'Xem tất cả thông báo quản trị', N'Quyền xem dữ liệu thông báo theo quyền quản trị.');
INSERT INTO @ExtraPermissions VALUES (2, 'RESIDENT_EXPORT', N'Xuất danh sách cư dân', N'Quyền xuất dữ liệu cư dân cho vai trò quản lý.');
INSERT INTO @ExtraPermissions VALUES (13, 'PROFILE_VIEW', N'Xem hồ sơ cá nhân', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (13, 'SYSTEM_INFO_VIEW', N'Xem thông tin hệ thống', N'Quyền thao tác chi tiết, bổ sung cho hệ thống phân quyền CRUD.');
INSERT INTO @ExtraPermissions VALUES (1, 'MENU_DASHBOARD_VIEW', N'Xem menu: Bảng tổng quan', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (11, 'MENU_QUICK_REPORT_VIEW', N'Xem menu: Báo cáo nhanh', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (2, 'MENU_RESIDENTS_VIEW', N'Xem menu: Cư dân', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (3, 'MENU_BUILDINGS_VIEW', N'Xem menu: Căn hộ & tòa nhà', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (4, 'MENU_CONTRACT_LIST_VIEW', N'Xem menu: Hợp đồng thuê', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (6, 'MENU_FEES_VIEW', N'Xem menu: Hóa đơn & thu phí', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'MENU_VEHICLES_VIEW', N'Xem menu: Xe cư dân', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'MENU_PARKING_CARDS_VIEW', N'Xem menu: Thẻ xe', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'MENU_PARKING_SLOTS_VIEW', N'Xem menu: Vị trí đỗ xe', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (7, 'MENU_PARKING_HISTORY_VIEW', N'Xem menu: Lịch sử ra vào', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (5, 'MENU_GYM_VIEW', N'Xem menu: Phòng Gym', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (5, 'MENU_POOL_VIEW', N'Xem menu: Hồ bơi', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (5, 'MENU_WIFI_VIEW', N'Xem menu: Dịch vụ Wi-Fi', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'MENU_TICKETS_VIEW', N'Xem menu: Yêu cầu hỗ trợ', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'MENU_MAINTENANCE_VIEW', N'Xem menu: Xử lý bảo trì', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'MENU_FEEDBACKS_VIEW', N'Xem menu: Phản ánh cư dân', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'MENU_MAINTENANCE_SCHEDULE_VIEW', N'Xem menu: Lịch bảo trì', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (8, 'MENU_EQUIPMENT_VIEW', N'Xem menu: Thiết bị', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (9, 'MENU_NOTIFICATIONS_VIEW', N'Xem menu: Danh sách thông báo', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (9, 'MENU_SEND_NOTIFICATION_VIEW', N'Xem menu: Gửi thông báo', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (9, 'MENU_SCHEDULE_NOTIFICATION_VIEW', N'Xem menu: Lịch gửi', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (11, 'MENU_REVENUE_REPORT_VIEW', N'Xem menu: Báo cáo doanh thu', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (11, 'MENU_DEBT_REPORT_VIEW', N'Xem menu: Báo cáo công nợ', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (11, 'MENU_APARTMENT_REPORT_VIEW', N'Xem menu: Báo cáo căn hộ', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (11, 'MENU_SERVICE_REPORT_VIEW', N'Xem menu: Báo cáo dịch vụ', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (10, 'MENU_EMPLOYEES_VIEW', N'Xem menu: Nhân viên', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (10, 'MENU_PERMISSIONS_VIEW', N'Xem menu: Phân quyền', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (10, 'MENU_ROLES_VIEW', N'Xem menu: Vai trò', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (10, 'MENU_SYSTEM_LOGS_VIEW', N'Xem menu: Nhật ký hệ thống', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (12, 'MENU_AI_CHAT_VIEW', N'Xem menu: Chat AI', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (12, 'MENU_AI_STATS_VIEW', N'Xem menu: Thống kê AI', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (12, 'MENU_AI_PREDICT_VIEW', N'Xem menu: Dự đoán hợp đồng', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (12, 'MENU_AI_SEARCH_VIEW', N'Xem menu: Tìm kiếm AI', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (13, 'MENU_PROFILE_VIEW', N'Xem menu: Hồ sơ cá nhân', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (13, 'MENU_CHANGE_PASSWORD_VIEW', N'Xem menu: Đổi mật khẩu', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');
INSERT INTO @ExtraPermissions VALUES (13, 'MENU_SYSTEM_INFO_VIEW', N'Xem menu: Thông tin hệ thống', N'Quyền xem độc lập cho chức năng trên thanh menu hiện tại.');

INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
SELECT ep.ModuleID, ep.PermissionCode, ep.PermissionName, ep.Description
FROM @ExtraPermissions ep
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Permission p WHERE p.PermissionCode = ep.PermissionCode
);
GO
SET IDENTITY_INSERT [dbo].[Resident] ON 

INSERT [dbo].[Resident] ([ResidentID], [UserID], [FullName], [Gender], [BirthDate], [Phone], [Email], [Address], [Avatar], [Status], [EmergencyContactName], [EmergencyContactPhone]) VALUES (531, NULL, N'alo', 1, CAST(N'1997-06-06' AS Date), N'0123545750', N'123@gmail.com', N'ok', NULL, 1, N'qư', N'1903002390235235')
INSERT [dbo].[Resident] ([ResidentID], [UserID], [FullName], [Gender], [BirthDate], [Phone], [Email], [Address], [Avatar], [Status], [EmergencyContactName], [EmergencyContactPhone]) VALUES (532, NULL, N'nguyễn ok', 1, CAST(N'2000-05-18' AS Date), N'0123456789', N'ok@gmail.com', N'123', NULL, 1, N'oka', N'012492354')
SET IDENTITY_INSERT [dbo].[Resident] OFF
GO
SET IDENTITY_INSERT [dbo].[ResidentIdentity] ON 

INSERT [dbo].[ResidentIdentity] ([IdentityID], [ResidentID], [IdentityNumber], [FrontImage], [BackImage], [IssueDate], [IssuePlace], [ExpiredDate]) VALUES (262, 531, N'0923423525', NULL, NULL, CAST(N'2026-09-24' AS Date), N'ccs', NULL)
INSERT [dbo].[ResidentIdentity] ([IdentityID], [ResidentID], [IdentityNumber], [FrontImage], [BackImage], [IssueDate], [IssuePlace], [ExpiredDate]) VALUES (263, 532, N'1231342342', NULL, NULL, CAST(N'2009-02-03' AS Date), N'ccs', NULL)
SET IDENTITY_INSERT [dbo].[ResidentIdentity] OFF
GO
SET IDENTITY_INSERT [dbo].[Role] ON 

INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (1, N'ADMIN', N'Quản trị viên', N'Ban quản lý Đức Vũ Tower', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (2, N'MANAGER', N'Ban quản lý', N'Quản lý vận hành tòa nhà', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (3, N'ACCOUNTANT', N'Kế toán', N'Quản lý tài chính, hóa đơn', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (4, N'RECEPTION', N'Lễ tân', N'Tiếp nhận yêu cầu, hướng dẫn', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (5, N'TECHNICIAN', N'Kỹ thuật', N'Bảo trì, sửa chữa', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (6, N'SECURITY', N'Bảo vệ', N'An ninh, bãi xe', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
INSERT [dbo].[Role] ([RoleID], [RoleCode], [RoleName], [Description], [Status], [CreatedAt]) VALUES (7, N'RESIDENT', N'Cư dân', N'Chủ hộ hoặc người thuê căn hộ', 1, CAST(N'2026-07-22T21:00:55.960' AS DateTime))
SET IDENTITY_INSERT [dbo].[Role] OFF
GO
SET IDENTITY_INSERT [dbo].[RolePermission] ON 

INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (1, 1, 1, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (2, 1, 2, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (3, 1, 3, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (4, 1, 4, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (5, 1, 5, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (6, 1, 6, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (7, 1, 7, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (8, 1, 8, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (9, 1, 9, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (10, 1, 10, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (11, 1, 11, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (12, 1, 12, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (13, 1, 13, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (14, 1, 14, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (15, 1, 15, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (16, 1, 16, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (17, 1, 17, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (18, 1, 18, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (19, 1, 19, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (20, 1, 20, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (21, 1, 21, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (22, 1, 22, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (23, 1, 23, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (24, 1, 24, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (25, 1, 25, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (26, 1, 26, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (27, 1, 27, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (28, 1, 28, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (29, 1, 29, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (30, 1, 30, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (31, 1, 31, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (32, 1, 32, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (33, 1, 33, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (34, 1, 34, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (35, 1, 35, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (36, 1, 36, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (37, 1, 37, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (38, 1, 38, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (39, 1, 39, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (40, 1, 40, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (41, 1, 41, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (42, 1, 42, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (43, 1, 43, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (44, 1, 44, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (45, 1, 45, 1, CAST(N'2026-07-22T21:00:55.967' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (46, 2, 1, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (47, 2, 2, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (48, 2, 3, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (49, 2, 4, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (50, 2, 6, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (51, 2, 7, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (52, 2, 8, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (53, 2, 10, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (54, 2, 11, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (55, 2, 12, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (56, 2, 13, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (57, 2, 14, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (58, 2, 15, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (59, 2, 16, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (60, 2, 18, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (61, 2, 19, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (62, 2, 20, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (63, 2, 21, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (64, 2, 22, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (65, 2, 23, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (66, 2, 24, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (67, 2, 26, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (68, 2, 27, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (69, 2, 28, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (70, 2, 30, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (71, 2, 31, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (72, 2, 32, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (73, 2, 36, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (74, 3, 1, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (75, 3, 18, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (76, 3, 19, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (77, 3, 20, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (78, 3, 21, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (79, 3, 36, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (80, 3, 37, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (81, 3, 38, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (82, 4, 2, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (83, 4, 3, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (84, 4, 4, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (85, 4, 6, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (86, 4, 10, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (87, 4, 22, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (88, 4, 26, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (89, 4, 27, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (90, 4, 30, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (91, 5, 1, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (92, 5, 6, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (93, 5, 26, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (94, 5, 27, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (95, 5, 28, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (96, 6, 22, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (97, 6, 23, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (98, 6, 24, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (99, 6, 25, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
GO
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (100, 7, 2, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (101, 7, 6, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (102, 7, 10, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (103, 7, 18, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (104, 7, 22, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (105, 7, 26, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (106, 7, 27, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (107, 7, 30, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (108, 7, 39, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (109, 7, 41, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (110, 7, 43, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (111, 7, 44, 1, CAST(N'2026-07-22T21:00:55.970' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (112, 1, 46, 1, CAST(N'2026-08-06T04:13:36.310' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (113, 3, 47, 1, CAST(N'2026-08-31T21:37:37.350' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (114, 1, 47, 1, CAST(N'2026-08-31T21:37:37.350' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (115, 2, 47, 1, CAST(N'2026-08-31T21:37:37.350' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (116, 1, 48, 1, CAST(N'2026-09-04T02:25:34.020' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (117, 1, 49, 1, CAST(N'2026-09-04T03:26:39.060' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (118, 1, 50, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (119, 1, 51, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (120, 1, 52, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (121, 1, 53, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (122, 1, 54, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (123, 2, 50, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (124, 2, 51, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (125, 2, 52, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (126, 2, 53, 1, CAST(N'2026-09-10T13:14:53.323' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (127, 2, 54, 1, CAST(N'2026-09-10T13:14:53.327' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (128, 6, 54, 1, CAST(N'2026-09-10T13:14:53.327' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (129, 4, 50, 1, CAST(N'2026-09-10T13:14:53.327' AS DateTime))
INSERT [dbo].[RolePermission] ([RolePermissionID], [RoleID], [PermissionID], [IsGranted], [CreatedAt]) VALUES (130, 4, 52, 1, CAST(N'2026-09-10T13:14:53.327' AS DateTime))
SET IDENTITY_INSERT [dbo].[RolePermission] OFF
GO

INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM dbo.Role r
JOIN dbo.Permission p ON p.PermissionCode IN (
    'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_OWN', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_OWN',
    'VEHICLE_VIEW_OWN', 'PARKING_VIEW_OWN', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_OWN'
	, 'NOTIFICATION_VIEW_OWN'
)
WHERE r.RoleCode = 'RESIDENT'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
  );

INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM dbo.Role r
JOIN dbo.Permission p ON p.PermissionCode IN (
    'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
    'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN',
    'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
    'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
	, 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
)
WHERE r.RoleCode IN ('MANAGER', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
  );

INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM dbo.Role r
JOIN dbo.Permission p ON p.PermissionCode IN (
    'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN', 'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN',
    'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN', 'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'
)
WHERE r.RoleCode IN ('RECEPTION', 'ACCOUNTANT')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
  );

INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM dbo.Role r
JOIN dbo.Permission p ON p.PermissionCode IN (
    'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
    'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
	, 'NOTIFICATION_VIEW_ALL'
)
WHERE r.RoleCode IN ('SECURITY', 'RECEPTION')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
  );

UPDATE rp
SET rp.IsGranted = 0
FROM dbo.RolePermission rp
JOIN dbo.Role r ON r.RoleID = rp.RoleID
JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
WHERE r.RoleCode = 'RESIDENT'
  AND p.PermissionCode IN (
	  'RESIDENT_VIEW_ALL', 'APARTMENT_VIEW_ALL', 'CONTRACT_VIEW_ALL', 'INVOICE_VIEW_ALL',
	  'VEHICLE_VIEW_ALL', 'PARKING_VIEW_ALL', 'TICKET_VIEW_ALL', 'FEEDBACK_VIEW_ALL',
	  'NOTIFICATION_VIEW_ALL'
  );

/****** Added: administrator receives every current and future permission in this seed ******/
INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
SELECT r.RoleID, p.PermissionID, 1, GETDATE()
FROM dbo.Role r
CROSS JOIN dbo.Permission p
WHERE r.RoleCode = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolePermission rp
      WHERE rp.RoleID = r.RoleID
        AND rp.PermissionID = p.PermissionID
  );
GO

SET IDENTITY_INSERT [dbo].[RoomStatus] ON 

INSERT [dbo].[RoomStatus] ([StatusID], [StatusName]) VALUES (7, N'Bảo trì')
INSERT [dbo].[RoomStatus] ([StatusID], [StatusName]) VALUES (1, N'Còn trống')
INSERT [dbo].[RoomStatus] ([StatusID], [StatusName]) VALUES (3, N'Đang bảo trì')
INSERT [dbo].[RoomStatus] ([StatusID], [StatusName]) VALUES (2, N'Đang ở')
INSERT [dbo].[RoomStatus] ([StatusID], [StatusName]) VALUES (4, N'Đang thuê')
SET IDENTITY_INSERT [dbo].[RoomStatus] OFF
GO
SET IDENTITY_INSERT [dbo].[Service] ON 

INSERT [dbo].[Service] ([ServiceID], [CategoryID], [ServiceName], [Unit], [Price], [Status]) VALUES (6, 3, N'Phí Gym', N'Tháng', CAST(250000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[Service] ([ServiceID], [CategoryID], [ServiceName], [Unit], [Price], [Status]) VALUES (7, 3, N'Phí Hồ bơi', N'Tháng', CAST(180000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[Service] ([ServiceID], [CategoryID], [ServiceName], [Unit], [Price], [Status]) VALUES (8, 3, N'Phí Wifi', N'Tháng', CAST(150000.00 AS Decimal(18, 2)), 1)
SET IDENTITY_INSERT [dbo].[Service] OFF
GO
SET IDENTITY_INSERT [dbo].[ServiceCategory] ON 

INSERT [dbo].[ServiceCategory] ([CategoryID], [CategoryName], [Description]) VALUES (3, N'Dịch vụ hộ/căn hộ', N'Dịch vụ đăng ký theo hộ như Gym, hồ bơi')
SET IDENTITY_INSERT [dbo].[ServiceCategory] OFF
GO
SET IDENTITY_INSERT [dbo].[ServiceRegistration] ON 

INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (62, 154, 6, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-04' AS Date), 100, 0)
INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (63, 156, 6, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-04' AS Date), 100, 0)
INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (64, 156, 7, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-04' AS Date), 50, 0)
INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (65, 158, 6, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-04' AS Date), 100, 0)
INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (66, 159, 6, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-24' AS Date), 1, 1)
INSERT [dbo].[ServiceRegistration] ([RegistrationID], [ContractID], [ServiceID], [RegisterDate], [EndDate], [Quantity], [Status]) VALUES (67, 160, 8, CAST(N'2026-09-04' AS Date), CAST(N'2026-09-17' AS Date), 1, 1)
SET IDENTITY_INSERT [dbo].[ServiceRegistration] OFF
GO
SET IDENTITY_INSERT [dbo].[UserRole] ON 

INSERT [dbo].[UserRole] ([UserRoleID], [UserID], [RoleID], [AssignedDate], [AssignedBy]) VALUES (1, 1, 1, CAST(N'2026-07-22T21:00:55.963' AS DateTime), NULL)
SET IDENTITY_INSERT [dbo].[UserRole] OFF
GO
SET IDENTITY_INSERT [dbo].[Users] ON 

INSERT [dbo].[Users] ([UserID], [Username], [PasswordHash], [Email], [Phone], [Status], [LastLogin], [CreatedAt]) VALUES (1, N'admin', N'123456', N'admin@anbinh.vn', N'0911111111', 1, CAST(N'2026-09-04T00:15:59.217' AS DateTime), CAST(N'2026-07-22T21:00:55.963' AS DateTime))
SET IDENTITY_INSERT [dbo].[Users] OFF
GO
SET IDENTITY_INSERT [dbo].[UtilityPriceTier] ON 

INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (25, 3, N'Điện bậc 1: 0-50 kWh', CAST(0.00 AS Decimal(18, 2)), CAST(50.00 AS Decimal(18, 2)), CAST(1984.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (26, 3, N'Điện bậc 2: 51-100 kWh', CAST(50.00 AS Decimal(18, 2)), CAST(100.00 AS Decimal(18, 2)), CAST(2050.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (27, 3, N'Điện bậc 3: 101-200 kWh', CAST(100.00 AS Decimal(18, 2)), CAST(200.00 AS Decimal(18, 2)), CAST(2380.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (28, 3, N'Điện bậc 4: 201-300 kWh', CAST(200.00 AS Decimal(18, 2)), CAST(300.00 AS Decimal(18, 2)), CAST(2998.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (29, 3, N'Điện bậc 5: 301-400 kWh', CAST(300.00 AS Decimal(18, 2)), CAST(400.00 AS Decimal(18, 2)), CAST(3350.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (30, 3, N'Điện bậc 6: trên 400 kWh', CAST(400.00 AS Decimal(18, 2)), NULL, CAST(3460.00 AS Decimal(18, 2)), CAST(N'2025-05-10' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (31, 4, N'Nước TP.HCM bậc 1: 0-10 m3 quy đổi', CAST(0.00 AS Decimal(18, 2)), CAST(10.00 AS Decimal(18, 2)), CAST(9206.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (32, 4, N'Nước TP.HCM bậc 2: 10-20 m3 quy đổi', CAST(10.00 AS Decimal(18, 2)), CAST(20.00 AS Decimal(18, 2)), CAST(17725.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date))
INSERT [dbo].[UtilityPriceTier] ([PriceTierID], [UtilityTypeID], [TierName], [FromValue], [ToValue], [UnitPrice], [EffectiveDate]) VALUES (33, 4, N'Nước TP.HCM bậc 3: trên 20 m3 quy đổi', CAST(20.00 AS Decimal(18, 2)), NULL, CAST(19786.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date))
SET IDENTITY_INSERT [dbo].[UtilityPriceTier] OFF
GO
SET IDENTITY_INSERT [dbo].[UtilityType] ON 

INSERT [dbo].[UtilityType] ([UtilityTypeID], [UtilityName]) VALUES (3, N'Điện sinh hoạt')
INSERT [dbo].[UtilityType] ([UtilityTypeID], [UtilityName]) VALUES (4, N'Nước sinh hoạt')
SET IDENTITY_INSERT [dbo].[UtilityType] OFF
GO
SET IDENTITY_INSERT [dbo].[Vehicle] ON 

INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (4, 532, N'1241432', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (5, 532, N'124334', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (6, 532, N'1241324', 5, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (7, 531, N'30H-123.45', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (8, 532, N'Q1232Q123213', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (9, 531, N'30H-982.55', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (10, 531, N'31H-063.24', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
INSERT [dbo].[Vehicle] ([VehicleID], [ResidentID], [PlateNumber], [VehicleTypeID], [Brand], [Color], [RegisterDate], [Status]) VALUES (11, 531, N'31H-351.35', 4, NULL, NULL, CAST(N'2026-09-04' AS Date), 1)
SET IDENTITY_INSERT [dbo].[Vehicle] OFF
GO
SET IDENTITY_INSERT [dbo].[VehicleType] ON 

INSERT [dbo].[VehicleType] ([VehicleTypeID], [TypeName], [MonthlyFee]) VALUES (4, N'Xe hơi', CAST(300000.00 AS Decimal(18, 2)))
INSERT [dbo].[VehicleType] ([VehicleTypeID], [TypeName], [MonthlyFee]) VALUES (5, N'Xe máy', CAST(150000.00 AS Decimal(18, 2)))
INSERT [dbo].[VehicleType] ([VehicleTypeID], [TypeName], [MonthlyFee]) VALUES (6, N'Xe đạp', CAST(0.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[VehicleType] OFF
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Apartmen__C6F22AE6DF14AE6D]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Apartment] ADD UNIQUE NONCLUSTERED 
(
	[ApartmentCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Apartment_Code]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Apartment_Code] ON [dbo].[Apartment]
(
	[ApartmentCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Apartment_Floor]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Apartment_Floor] ON [dbo].[Apartment]
(
	[FloorID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Apartmen__8EB6AF570B73394B]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ApartmentArea] ADD UNIQUE NONCLUSTERED 
(
	[AreaName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_ApartmentPrice_Apartment]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_ApartmentPrice_Apartment] ON [dbo].[ApartmentPriceHistory]
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Building_Area]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Building] ADD  CONSTRAINT [UQ_Building_Area] UNIQUE NONCLUSTERED 
(
	[AreaID] ASC,
	[BuildingName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Building_Area]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Building_Area] ON [dbo].[Building]
(
	[AreaID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Contract__C51D43DACE7198C4]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Contract] ADD UNIQUE NONCLUSTERED 
(
	[ContractNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Contract_Number]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Contract_Number] ON [dbo].[Contract]
(
	[ContractNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Contract_Apartment]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Contract_Apartment] ON [dbo].[Contract]
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Contract_Owner]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Contract_Owner] ON [dbo].[Contract]
(
	[OwnerID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Contract_Resident]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ContractResident] ADD  CONSTRAINT [UQ_Contract_Resident] UNIQUE NONCLUSTERED 
(
	[ContractID] ASC,
	[ResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_CR_Contract]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_CR_Contract] ON [dbo].[ContractResident]
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_CR_Resident]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_CR_Resident] ON [dbo].[ContractResident]
(
	[ResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Contract__05E7698A61C92DD3]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ContractStatus] ADD UNIQUE NONCLUSTERED 
(
	[StatusName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ__Employee__1788CCAD415D632F]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Employee] ADD UNIQUE NONCLUSTERED 
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Employee__A955A0AA709782BB]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Employee] ADD UNIQUE NONCLUSTERED 
(
	[CCCD] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Employee_User]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Employee_User] ON [dbo].[Employee]
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Floor_Building]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Floor] ADD  CONSTRAINT [UQ_Floor_Building] UNIQUE NONCLUSTERED 
(
	[BuildingID] ASC,
	[FloorNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Floor_Building]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Floor_Building] ON [dbo].[Floor]
(
	[BuildingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Invoice_Contract_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Invoice] ADD  CONSTRAINT [UQ_Invoice_Contract_Period] UNIQUE NONCLUSTERED 
(
	[ContractID] ASC,
	[InvoiceMonth] ASC,
	[InvoiceYear] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Invoice_Contract]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Invoice_Contract] ON [dbo].[Invoice]
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Invoice_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Invoice_Period] ON [dbo].[Invoice]
(
	[InvoiceYear] ASC,
	[InvoiceMonth] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UX_Invoice_Contract_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_Invoice_Contract_Period] ON [dbo].[Invoice]
(
	[ContractID] ASC,
	[InvoiceMonth] ASC,
	[InvoiceYear] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_InvoiceDetail_Invoice]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_InvoiceDetail_Invoice] ON [dbo].[InvoiceDetail]
(
	[InvoiceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_InvoiceDetail_ParkingSubscription]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_InvoiceDetail_ParkingSubscription] ON [dbo].[InvoiceDetail]
(
	[ParkingSubscriptionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__InvoiceS__05E7698ACB2A7157]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[InvoiceStatus] ADD UNIQUE NONCLUSTERED 
(
	[StatusName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Maintenance_Apartment]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Maintenance_Apartment] ON [dbo].[MaintenanceRequest]
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Maintena__05E7698AF250A8FB]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[MaintenanceStatus] ADD UNIQUE NONCLUSTERED 
(
	[StatusName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_MeterReading_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[MeterReading] ADD  CONSTRAINT [UQ_MeterReading_Period] UNIQUE NONCLUSTERED 
(
	[ApartmentID] ASC,
	[UtilityTypeID] ASC,
	[ReadingMonth] ASC,
	[ReadingYear] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_MR_Apartment]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_MR_Apartment] ON [dbo].[MeterReading]
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MeterReading_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_MeterReading_Period] ON [dbo].[MeterReading]
(
	[ReadingYear] ASC,
	[ReadingMonth] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UX_MeterReading_Apartment_Utility_Period]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_MeterReading_Apartment_Utility_Period] ON [dbo].[MeterReading]
(
	[ApartmentID] ASC,
	[UtilityTypeID] ASC,
	[ReadingMonth] ASC,
	[ReadingYear] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Module__EB27D4330438783C]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Module] ADD UNIQUE NONCLUSTERED 
(
	[ModuleCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Notification_User]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[NotificationReceiver] ADD  CONSTRAINT [UQ_Notification_User] UNIQUE NONCLUSTERED 
(
	[NotificationID] ASC,
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_NR_User]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_NR_User] ON [dbo].[NotificationReceiver]
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ParkingAccessLog_CardCode]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_ParkingAccessLog_CardCode] ON [dbo].[ParkingAccessLog]
(
	[CardCodeSnapshot] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ParkingAccessLog_EventTime]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_ParkingAccessLog_EventTime] ON [dbo].[ParkingAccessLog]
(
	[EventTime] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ParkingAccessLog_PlateNumber]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_ParkingAccessLog_PlateNumber] ON [dbo].[ParkingAccessLog]
(
	[PlateNumberSnapshot] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ParkingAccessLog_Subscription]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_ParkingAccessLog_Subscription] ON [dbo].[ParkingAccessLog]
(
	[ParkingSubscriptionID] ASC,
	[EventTime] DESC,
	[AccessLogID] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__ParkingC__3D531707CD3E3540]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ParkingCard] ADD UNIQUE NONCLUSTERED 
(
	[CardCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ__ParkingC__476B54B35EF0AA58]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ParkingCard] ADD UNIQUE NONCLUSTERED 
(
	[VehicleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_ParkingCard_ActiveSlot]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_ParkingCard_ActiveSlot] ON [dbo].[ParkingCard]
(
	[SlotID] ASC
)
WHERE ([Status]=(1) AND [SlotID] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Slot_Area]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ParkingSlot] ADD  CONSTRAINT [UQ_Slot_Area] UNIQUE NONCLUSTERED 
(
	[AreaID] ASC,
	[SlotNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ParkingSubscription_Contract_Status_Dates]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_ParkingSubscription_Contract_Status_Dates] ON [dbo].[ParkingSubscription]
(
	[ContractID] ASC,
	[Status] ASC,
	[StartDate] ASC,
	[EndDate] ASC
)
INCLUDE([MonthlyFeeSnapshot]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_ParkingSubscription_ActiveCard]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_ParkingSubscription_ActiveCard] ON [dbo].[ParkingSubscription]
(
	[CardID] ASC
)
WHERE ([Status]='ACTIVE')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_ParkingSubscription_ActiveVehicle]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_ParkingSubscription_ActiveVehicle] ON [dbo].[ParkingSubscription]
(
	[VehicleID] ASC
)
WHERE ([Status]='ACTIVE')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Payment_Invoice]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Payment_Invoice] ON [dbo].[Payment]
(
	[InvoiceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__PaymentM__218CFB170BC80EBB]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[PaymentMethod] ADD UNIQUE NONCLUSTERED 
(
	[MethodName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__PaymentS__05E7698AF81154AF]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[PaymentStatus] ADD UNIQUE NONCLUSTERED 
(
	[StatusName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Permissi__91FE5750ED532256]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Permission] ADD UNIQUE NONCLUSTERED 
(
	[PermissionCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Permission_Module]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Permission_Module] ON [dbo].[Permission]
(
	[ModuleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Resident_FullName]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Resident_FullName] ON [dbo].[Resident]
(
	[FullName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Resident_Phone]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Resident_Phone] ON [dbo].[Resident]
(
	[Phone] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Resident_UserID_NotNull]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_Resident_UserID_NotNull] ON [dbo].[Resident]
(
	[UserID] ASC
)
WHERE ([UserID] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ__Resident__07FB00FD5DC1A81D]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ResidentIdentity] ADD UNIQUE NONCLUSTERED 
(
	[ResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Resident__6354A73FC9B87FCD]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ResidentIdentity] ADD UNIQUE NONCLUSTERED 
(
	[IdentityNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Role__8A2B61603FDFCCF5]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Role] ADD UNIQUE NONCLUSTERED 
(
	[RoleName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Role__D62CB59C427FE349]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Role] ADD UNIQUE NONCLUSTERED 
(
	[RoleCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_RolePermission]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[RolePermission] ADD  CONSTRAINT [UQ_RolePermission] UNIQUE NONCLUSTERED 
(
	[RoleID] ASC,
	[PermissionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RolePermission_Permission]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_RolePermission_Permission] ON [dbo].[RolePermission]
(
	[PermissionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RolePermission_Role]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_RolePermission_Role] ON [dbo].[RolePermission]
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__RoomStat__05E7698AF05C058B]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[RoomStatus] ADD UNIQUE NONCLUSTERED 
(
	[StatusName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Service__A42B5F99BC22F815]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Service] ADD UNIQUE NONCLUSTERED 
(
	[ServiceName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__ServiceC__8517B2E0D79CD338]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[ServiceCategory] ADD UNIQUE NONCLUSTERED 
(
	[CategoryName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_SR_Contract]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_SR_Contract] ON [dbo].[ServiceRegistration]
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_SmartMeter_Apartment_Utility]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[SmartMeter] ADD  CONSTRAINT [UQ_SmartMeter_Apartment_Utility] UNIQUE NONCLUSTERED 
(
	[ApartmentID] ASC,
	[UtilityTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmartMeter_Apartment]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_SmartMeter_Apartment] ON [dbo].[SmartMeter]
(
	[ApartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmartMeterLog_Meter_CreatedAt]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_SmartMeterLog_Meter_CreatedAt] ON [dbo].[SmartMeterLog]
(
	[MeterID] ASC,
	[CreatedAt] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_UserRole]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[UserRole] ADD  CONSTRAINT [UQ_UserRole] UNIQUE NONCLUSTERED 
(
	[UserID] ASC,
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_UserRole_Role]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_UserRole_Role] ON [dbo].[UserRole]
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_UserRole_User]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_UserRole_User] ON [dbo].[UserRole]
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__536C85E4748DA278]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__5C7E359E0DEC9C84]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Phone] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__A9D105341DED8868]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Users_Username]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_Users_Username] ON [dbo].[Users]
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__UtilityT__E8B225D636B97E6D]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[UtilityType] ADD UNIQUE NONCLUSTERED 
(
	[UtilityName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Vehicle__03692624BE342EE4]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[Vehicle] ADD UNIQUE NONCLUSTERED 
(
	[PlateNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FK_Vehicle_Resident]    Script Date: 10/09/2026 2:57:31 CH ******/
CREATE NONCLUSTERED INDEX [IX_FK_Vehicle_Resident] ON [dbo].[Vehicle]
(
	[ResidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__VehicleT__D4E7DFA8558E73DD]    Script Date: 10/09/2026 2:57:31 CH ******/
ALTER TABLE [dbo].[VehicleType] ADD UNIQUE NONCLUSTERED 
(
	[TypeName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AuditLog] ADD  DEFAULT (getdate()) FOR [Timestamp]
GO
ALTER TABLE [dbo].[Contract] ADD  DEFAULT (getdate()) FOR [SignDate]
GO
ALTER TABLE [dbo].[Contract] ADD  DEFAULT ((0)) FOR [Deposit]
GO
ALTER TABLE [dbo].[Contract] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Contract] ADD  CONSTRAINT [DF_Contract_PaymentCycleMonths]  DEFAULT ((1)) FOR [PaymentCycleMonths]
GO
ALTER TABLE [dbo].[Contract] ADD  CONSTRAINT [DF_Contract_MonthlyBillingDay]  DEFAULT ((10)) FOR [MonthlyBillingDay]
GO
ALTER TABLE [dbo].[Employee] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[Feedback] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Invoice] ADD  DEFAULT (getdate()) FOR [InvoiceDate]
GO
ALTER TABLE [dbo].[Invoice] ADD  DEFAULT ((0)) FOR [TotalAmount]
GO
ALTER TABLE [dbo].[Invoice] ADD  CONSTRAINT [DF_Invoice_WorkflowStatus]  DEFAULT ('WAITING_PAYMENT') FOR [WorkflowStatus]
GO
ALTER TABLE [dbo].[InvoiceDetail] ADD  DEFAULT ((1)) FOR [Quantity]
GO
ALTER TABLE [dbo].[MaintenanceRequest] ADD  DEFAULT (getdate()) FOR [RequestDate]
GO
ALTER TABLE [dbo].[MeterReading] ADD  DEFAULT (getdate()) FOR [ReadingDate]
GO
ALTER TABLE [dbo].[Module] ADD  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[Module] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[Notification] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[Notification] ADD  DEFAULT ('ALL') FOR [TargetScope]
GO
ALTER TABLE [dbo].[NotificationReceiver] ADD  DEFAULT ((0)) FOR [IsRead]
GO
ALTER TABLE [dbo].[ParkingAccessLog] ADD  CONSTRAINT [DF_ParkingAccessLog_EventTime]  DEFAULT (sysutcdatetime()) FOR [EventTime]
GO
ALTER TABLE [dbo].[ParkingCard] ADD  DEFAULT (getdate()) FOR [IssueDate]
GO
ALTER TABLE [dbo].[ParkingCard] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[ParkingSlot] ADD  DEFAULT ((0)) FOR [IsOccupied]
GO
ALTER TABLE [dbo].[ParkingSubscription] ADD  CONSTRAINT [DF_ParkingSubscription_Status]  DEFAULT ('ACTIVE') FOR [Status]
GO
ALTER TABLE [dbo].[ParkingSubscription] ADD  CONSTRAINT [DF_ParkingSubscription_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ParkingSubscription] ADD  CONSTRAINT [DF_ParkingSubscription_UpdatedAt]  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Payment] ADD  DEFAULT (getdate()) FOR [PaymentDate]
GO
ALTER TABLE [dbo].[Resident] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[Role] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[Role] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[RolePermission] ADD  DEFAULT ((1)) FOR [IsGranted]
GO
ALTER TABLE [dbo].[RolePermission] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Service] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[ServiceRegistration] ADD  DEFAULT (getdate()) FOR [RegisterDate]
GO
ALTER TABLE [dbo].[ServiceRegistration] ADD  DEFAULT ((1)) FOR [Quantity]
GO
ALTER TABLE [dbo].[ServiceRegistration] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[SmartMeter] ADD  CONSTRAINT [DF_SmartMeter_CurrentIndex]  DEFAULT ((0)) FOR [CurrentIndex]
GO
ALTER TABLE [dbo].[SmartMeter] ADD  CONSTRAINT [DF_SmartMeter_Status]  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[SmartMeter] ADD  CONSTRAINT [DF_SmartMeter_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SmartMeterLog] ADD  CONSTRAINT [DF_SmartMeterLog_Source]  DEFAULT ('AUTO') FOR [Source]
GO
ALTER TABLE [dbo].[SmartMeterLog] ADD  CONSTRAINT [DF_SmartMeterLog_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[UserRole] ADD  DEFAULT (getdate()) FOR [AssignedDate]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Vehicle] ADD  DEFAULT (getdate()) FOR [RegisterDate]
GO
ALTER TABLE [dbo].[Vehicle] ADD  DEFAULT ((1)) FOR [Status]
GO
ALTER TABLE [dbo].[VehicleType] ADD  CONSTRAINT [DF_VehicleType_MonthlyFee]  DEFAULT ((0)) FOR [MonthlyFee]
GO
ALTER TABLE [dbo].[Apartment]  WITH CHECK ADD  CONSTRAINT [FK_Apartment_Floor] FOREIGN KEY([FloorID])
REFERENCES [dbo].[Floor] ([FloorID])
GO
ALTER TABLE [dbo].[Apartment] CHECK CONSTRAINT [FK_Apartment_Floor]
GO
ALTER TABLE [dbo].[Apartment]  WITH CHECK ADD  CONSTRAINT [FK_Apartment_Status] FOREIGN KEY([StatusID])
REFERENCES [dbo].[RoomStatus] ([StatusID])
GO
ALTER TABLE [dbo].[Apartment] CHECK CONSTRAINT [FK_Apartment_Status]
GO
ALTER TABLE [dbo].[ApartmentPriceHistory]  WITH CHECK ADD  CONSTRAINT [FK_PriceHistory_Apartment] FOREIGN KEY([ApartmentID])
REFERENCES [dbo].[Apartment] ([ApartmentID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ApartmentPriceHistory] CHECK CONSTRAINT [FK_PriceHistory_Apartment]
GO
ALTER TABLE [dbo].[Building]  WITH CHECK ADD  CONSTRAINT [FK_Building_Area] FOREIGN KEY([AreaID])
REFERENCES [dbo].[ApartmentArea] ([AreaID])
GO
ALTER TABLE [dbo].[Building] CHECK CONSTRAINT [FK_Building_Area]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [FK_Contract_Apartment] FOREIGN KEY([ApartmentID])
REFERENCES [dbo].[Apartment] ([ApartmentID])
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [FK_Contract_Apartment]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [FK_Contract_Resident] FOREIGN KEY([OwnerID])
REFERENCES [dbo].[Resident] ([ResidentID])
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [FK_Contract_Resident]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [FK_Contract_Status] FOREIGN KEY([StatusID])
REFERENCES [dbo].[ContractStatus] ([StatusID])
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [FK_Contract_Status]
GO
ALTER TABLE [dbo].[ContractResident]  WITH CHECK ADD  CONSTRAINT [FK_CR_Contract] FOREIGN KEY([ContractID])
REFERENCES [dbo].[Contract] ([ContractID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ContractResident] CHECK CONSTRAINT [FK_CR_Contract]
GO
ALTER TABLE [dbo].[ContractResident]  WITH CHECK ADD  CONSTRAINT [FK_CR_Resident] FOREIGN KEY([ResidentID])
REFERENCES [dbo].[Resident] ([ResidentID])
GO
ALTER TABLE [dbo].[ContractResident] CHECK CONSTRAINT [FK_CR_Resident]
GO
ALTER TABLE [dbo].[Employee]  WITH CHECK ADD  CONSTRAINT [FK_Employee_User] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Employee] CHECK CONSTRAINT [FK_Employee_User]
GO
ALTER TABLE [dbo].[Feedback]  WITH CHECK ADD  CONSTRAINT [FK_Feedback_Resident] FOREIGN KEY([ResidentID])
REFERENCES [dbo].[Resident] ([ResidentID])
GO
ALTER TABLE [dbo].[Feedback] CHECK CONSTRAINT [FK_Feedback_Resident]
GO
ALTER TABLE [dbo].[Floor]  WITH CHECK ADD  CONSTRAINT [FK_Floor_Building] FOREIGN KEY([BuildingID])
REFERENCES [dbo].[Building] ([BuildingID])
GO
ALTER TABLE [dbo].[Floor] CHECK CONSTRAINT [FK_Floor_Building]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [FK_Invoice_Contract] FOREIGN KEY([ContractID])
REFERENCES [dbo].[Contract] ([ContractID])
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [FK_Invoice_Contract]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [FK_Invoice_Status] FOREIGN KEY([StatusID])
REFERENCES [dbo].[InvoiceStatus] ([StatusID])
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [FK_Invoice_Status]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [FK_InvoiceDetail_Invoice] FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[Invoice] ([InvoiceID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [FK_InvoiceDetail_Invoice]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [FK_InvoiceDetail_ParkingSubscription] FOREIGN KEY([ParkingSubscriptionID])
REFERENCES [dbo].[ParkingSubscription] ([ParkingSubscriptionID])
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [FK_InvoiceDetail_ParkingSubscription]
GO
ALTER TABLE [dbo].[MaintenanceRequest]  WITH CHECK ADD  CONSTRAINT [FK_Maintenance_Apartment] FOREIGN KEY([ApartmentID])
REFERENCES [dbo].[Apartment] ([ApartmentID])
GO
ALTER TABLE [dbo].[MaintenanceRequest] CHECK CONSTRAINT [FK_Maintenance_Apartment]
GO
ALTER TABLE [dbo].[MaintenanceRequest]  WITH CHECK ADD  CONSTRAINT [FK_Maintenance_Employee] FOREIGN KEY([AssignedEmployeeID])
REFERENCES [dbo].[Employee] ([EmployeeID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[MaintenanceRequest] CHECK CONSTRAINT [FK_Maintenance_Employee]
GO
ALTER TABLE [dbo].[MaintenanceRequest]  WITH CHECK ADD  CONSTRAINT [FK_Maintenance_Resident] FOREIGN KEY([ResidentID])
REFERENCES [dbo].[Resident] ([ResidentID])
GO
ALTER TABLE [dbo].[MaintenanceRequest] CHECK CONSTRAINT [FK_Maintenance_Resident]
GO
ALTER TABLE [dbo].[MaintenanceRequest]  WITH CHECK ADD  CONSTRAINT [FK_Maintenance_Status] FOREIGN KEY([StatusID])
REFERENCES [dbo].[MaintenanceStatus] ([StatusID])
GO
ALTER TABLE [dbo].[MaintenanceRequest] CHECK CONSTRAINT [FK_Maintenance_Status]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [FK_MR_Apartment] FOREIGN KEY([ApartmentID])
REFERENCES [dbo].[Apartment] ([ApartmentID])
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [FK_MR_Apartment]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [FK_MR_Employee] FOREIGN KEY([EmployeeID])
REFERENCES [dbo].[Employee] ([EmployeeID])
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [FK_MR_Employee]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [FK_MR_Utility] FOREIGN KEY([UtilityTypeID])
REFERENCES [dbo].[UtilityType] ([UtilityTypeID])
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [FK_MR_Utility]
GO
ALTER TABLE [dbo].[Notification]  WITH CHECK ADD  CONSTRAINT [FK_Notification_Employee] FOREIGN KEY([SenderID])
REFERENCES [dbo].[Employee] ([EmployeeID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Notification] CHECK CONSTRAINT [FK_Notification_Employee]
GO
ALTER TABLE [dbo].[NotificationReceiver]  WITH CHECK ADD  CONSTRAINT [FK_NR_Notification] FOREIGN KEY([NotificationID])
REFERENCES [dbo].[Notification] ([NotificationID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[NotificationReceiver] CHECK CONSTRAINT [FK_NR_Notification]
GO
ALTER TABLE [dbo].[NotificationReceiver]  WITH CHECK ADD  CONSTRAINT [FK_NR_User] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[NotificationReceiver] CHECK CONSTRAINT [FK_NR_User]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [FK_ParkingAccessLog_ParkingCard] FOREIGN KEY([CardID])
REFERENCES [dbo].[ParkingCard] ([CardID])
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [FK_ParkingAccessLog_ParkingCard]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [FK_ParkingAccessLog_ParkingSlot] FOREIGN KEY([SlotID])
REFERENCES [dbo].[ParkingSlot] ([SlotID])
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [FK_ParkingAccessLog_ParkingSlot]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [FK_ParkingAccessLog_ParkingSubscription] FOREIGN KEY([ParkingSubscriptionID])
REFERENCES [dbo].[ParkingSubscription] ([ParkingSubscriptionID])
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [FK_ParkingAccessLog_ParkingSubscription]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [FK_ParkingAccessLog_Users] FOREIGN KEY([RecordedByUserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [FK_ParkingAccessLog_Users]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [FK_ParkingAccessLog_Vehicle] FOREIGN KEY([VehicleID])
REFERENCES [dbo].[Vehicle] ([VehicleID])
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [FK_ParkingAccessLog_Vehicle]
GO
ALTER TABLE [dbo].[ParkingCard]  WITH CHECK ADD  CONSTRAINT [FK_ParkingCard_Slot] FOREIGN KEY([SlotID])
REFERENCES [dbo].[ParkingSlot] ([SlotID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[ParkingCard] CHECK CONSTRAINT [FK_ParkingCard_Slot]
GO
ALTER TABLE [dbo].[ParkingCard]  WITH CHECK ADD  CONSTRAINT [FK_ParkingCard_Vehicle] FOREIGN KEY([VehicleID])
REFERENCES [dbo].[Vehicle] ([VehicleID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ParkingCard] CHECK CONSTRAINT [FK_ParkingCard_Vehicle]
GO
ALTER TABLE [dbo].[ParkingSlot]  WITH CHECK ADD  CONSTRAINT [FK_Slot_Area] FOREIGN KEY([AreaID])
REFERENCES [dbo].[ApartmentArea] ([AreaID])
GO
ALTER TABLE [dbo].[ParkingSlot] CHECK CONSTRAINT [FK_Slot_Area]
GO
ALTER TABLE [dbo].[ParkingSlot]  WITH CHECK ADD  CONSTRAINT [FK_Slot_VehicleType] FOREIGN KEY([VehicleTypeID])
REFERENCES [dbo].[VehicleType] ([VehicleTypeID])
GO
ALTER TABLE [dbo].[ParkingSlot] CHECK CONSTRAINT [FK_Slot_VehicleType]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [FK_ParkingSubscription_Contract] FOREIGN KEY([ContractID])
REFERENCES [dbo].[Contract] ([ContractID])
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [FK_ParkingSubscription_Contract]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [FK_ParkingSubscription_ParkingCard] FOREIGN KEY([CardID])
REFERENCES [dbo].[ParkingCard] ([CardID])
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [FK_ParkingSubscription_ParkingCard]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [FK_ParkingSubscription_Users] FOREIGN KEY([CreatedByUserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [FK_ParkingSubscription_Users]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [FK_ParkingSubscription_Vehicle] FOREIGN KEY([VehicleID])
REFERENCES [dbo].[Vehicle] ([VehicleID])
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [FK_ParkingSubscription_Vehicle]
GO
ALTER TABLE [dbo].[Payment]  WITH CHECK ADD  CONSTRAINT [FK_Payment_Invoice] FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[Invoice] ([InvoiceID])
GO
ALTER TABLE [dbo].[Payment] CHECK CONSTRAINT [FK_Payment_Invoice]
GO
ALTER TABLE [dbo].[Payment]  WITH CHECK ADD  CONSTRAINT [FK_Payment_Method] FOREIGN KEY([MethodID])
REFERENCES [dbo].[PaymentMethod] ([MethodID])
GO
ALTER TABLE [dbo].[Payment] CHECK CONSTRAINT [FK_Payment_Method]
GO
ALTER TABLE [dbo].[Payment]  WITH CHECK ADD  CONSTRAINT [FK_Payment_Status] FOREIGN KEY([StatusID])
REFERENCES [dbo].[PaymentStatus] ([StatusID])
GO
ALTER TABLE [dbo].[Payment] CHECK CONSTRAINT [FK_Payment_Status]
GO
ALTER TABLE [dbo].[Permission]  WITH CHECK ADD  CONSTRAINT [FK_Permission_Module] FOREIGN KEY([ModuleID])
REFERENCES [dbo].[Module] ([ModuleID])
GO
ALTER TABLE [dbo].[Permission] CHECK CONSTRAINT [FK_Permission_Module]
GO
ALTER TABLE [dbo].[ResidentIdentity]  WITH CHECK ADD  CONSTRAINT [FK_Identity_Resident] FOREIGN KEY([ResidentID])
REFERENCES [dbo].[Resident] ([ResidentID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ResidentIdentity] CHECK CONSTRAINT [FK_Identity_Resident]
GO
ALTER TABLE [dbo].[RolePermission]  WITH CHECK ADD  CONSTRAINT [FK_RolePermission_Permission] FOREIGN KEY([PermissionID])
REFERENCES [dbo].[Permission] ([PermissionID])
GO
ALTER TABLE [dbo].[RolePermission] CHECK CONSTRAINT [FK_RolePermission_Permission]
GO
ALTER TABLE [dbo].[RolePermission]  WITH CHECK ADD  CONSTRAINT [FK_RolePermission_Role] FOREIGN KEY([RoleID])
REFERENCES [dbo].[Role] ([RoleID])
GO
ALTER TABLE [dbo].[RolePermission] CHECK CONSTRAINT [FK_RolePermission_Role]
GO
ALTER TABLE [dbo].[Service]  WITH CHECK ADD  CONSTRAINT [FK_Service_Category] FOREIGN KEY([CategoryID])
REFERENCES [dbo].[ServiceCategory] ([CategoryID])
GO
ALTER TABLE [dbo].[Service] CHECK CONSTRAINT [FK_Service_Category]
GO
ALTER TABLE [dbo].[ServiceRegistration]  WITH CHECK ADD  CONSTRAINT [FK_SR_Contract] FOREIGN KEY([ContractID])
REFERENCES [dbo].[Contract] ([ContractID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ServiceRegistration] CHECK CONSTRAINT [FK_SR_Contract]
GO
ALTER TABLE [dbo].[ServiceRegistration]  WITH CHECK ADD  CONSTRAINT [FK_SR_Service] FOREIGN KEY([ServiceID])
REFERENCES [dbo].[Service] ([ServiceID])
GO
ALTER TABLE [dbo].[ServiceRegistration] CHECK CONSTRAINT [FK_SR_Service]
GO
ALTER TABLE [dbo].[SmartMeter]  WITH CHECK ADD  CONSTRAINT [FK_SmartMeter_Apartment] FOREIGN KEY([ApartmentID])
REFERENCES [dbo].[Apartment] ([ApartmentID])
GO
ALTER TABLE [dbo].[SmartMeter] CHECK CONSTRAINT [FK_SmartMeter_Apartment]
GO
ALTER TABLE [dbo].[SmartMeter]  WITH CHECK ADD  CONSTRAINT [FK_SmartMeter_UtilityType] FOREIGN KEY([UtilityTypeID])
REFERENCES [dbo].[UtilityType] ([UtilityTypeID])
GO
ALTER TABLE [dbo].[SmartMeter] CHECK CONSTRAINT [FK_SmartMeter_UtilityType]
GO
ALTER TABLE [dbo].[SmartMeterLog]  WITH CHECK ADD  CONSTRAINT [FK_SmartMeterLog_Meter] FOREIGN KEY([MeterID])
REFERENCES [dbo].[SmartMeter] ([MeterID])
GO
ALTER TABLE [dbo].[SmartMeterLog] CHECK CONSTRAINT [FK_SmartMeterLog_Meter]
GO
ALTER TABLE [dbo].[UserRole]  WITH CHECK ADD  CONSTRAINT [FK_UserRole_AssignedBy] FOREIGN KEY([AssignedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[UserRole] CHECK CONSTRAINT [FK_UserRole_AssignedBy]
GO
ALTER TABLE [dbo].[UserRole]  WITH CHECK ADD  CONSTRAINT [FK_UserRole_Role] FOREIGN KEY([RoleID])
REFERENCES [dbo].[Role] ([RoleID])
GO
ALTER TABLE [dbo].[UserRole] CHECK CONSTRAINT [FK_UserRole_Role]
GO
ALTER TABLE [dbo].[UserRole]  WITH CHECK ADD  CONSTRAINT [FK_UserRole_User] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[UserRole] CHECK CONSTRAINT [FK_UserRole_User]
GO
ALTER TABLE [dbo].[UtilityPriceTier]  WITH CHECK ADD  CONSTRAINT [FK_UPT_Utility] FOREIGN KEY([UtilityTypeID])
REFERENCES [dbo].[UtilityType] ([UtilityTypeID])
GO
ALTER TABLE [dbo].[UtilityPriceTier] CHECK CONSTRAINT [FK_UPT_Utility]
GO
ALTER TABLE [dbo].[Vehicle]  WITH CHECK ADD  CONSTRAINT [FK_Vehicle_Resident] FOREIGN KEY([ResidentID])
REFERENCES [dbo].[Resident] ([ResidentID])
GO
ALTER TABLE [dbo].[Vehicle] CHECK CONSTRAINT [FK_Vehicle_Resident]
GO
ALTER TABLE [dbo].[Vehicle]  WITH CHECK ADD  CONSTRAINT [FK_Vehicle_Type] FOREIGN KEY([VehicleTypeID])
REFERENCES [dbo].[VehicleType] ([VehicleTypeID])
GO
ALTER TABLE [dbo].[Vehicle] CHECK CONSTRAINT [FK_Vehicle_Type]
GO
ALTER TABLE [dbo].[Apartment]  WITH CHECK ADD  CONSTRAINT [CHK_Apartment_Area] CHECK  (([Area]>(0)))
GO
ALTER TABLE [dbo].[Apartment] CHECK CONSTRAINT [CHK_Apartment_Area]
GO
ALTER TABLE [dbo].[ApartmentPriceHistory]  WITH CHECK ADD  CONSTRAINT [CHK_PriceHistory_Price] CHECK  (([BaseRentalPrice]>=(0)))
GO
ALTER TABLE [dbo].[ApartmentPriceHistory] CHECK CONSTRAINT [CHK_PriceHistory_Price]
GO
ALTER TABLE [dbo].[AuditLog]  WITH CHECK ADD  CONSTRAINT [CHK_Audit_Action] CHECK  (([Action]='DELETE' OR [Action]='UPDATE' OR [Action]='INSERT'))
GO
ALTER TABLE [dbo].[AuditLog] CHECK CONSTRAINT [CHK_Audit_Action]
GO
ALTER TABLE [dbo].[Building]  WITH CHECK ADD  CONSTRAINT [CHK_Building_Floors] CHECK  (([NumberOfFloors]>(0)))
GO
ALTER TABLE [dbo].[Building] CHECK CONSTRAINT [CHK_Building_Floors]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [CHK_Contract_Deposit] CHECK  (([Deposit]>=(0)))
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [CHK_Contract_Deposit]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [CHK_Contract_Duration] CHECK  (([EndDate]>[StartDate]))
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [CHK_Contract_Duration]
GO
ALTER TABLE [dbo].[Contract]  WITH CHECK ADD  CONSTRAINT [CHK_Contract_Rent] CHECK  (([Rent]>(0)))
GO
ALTER TABLE [dbo].[Contract] CHECK CONSTRAINT [CHK_Contract_Rent]
GO
ALTER TABLE [dbo].[ContractResident]  WITH CHECK ADD  CONSTRAINT [CHK_ContractResident_Dates] CHECK  (([MoveOutDate]>=[MoveInDate]))
GO
ALTER TABLE [dbo].[ContractResident] CHECK CONSTRAINT [CHK_ContractResident_Dates]
GO
ALTER TABLE [dbo].[Employee]  WITH CHECK ADD  CONSTRAINT [CHK_Employee_Dates] CHECK  (([BirthDate]<[HireDate]))
GO
ALTER TABLE [dbo].[Employee] CHECK CONSTRAINT [CHK_Employee_Dates]
GO
ALTER TABLE [dbo].[Feedback]  WITH CHECK ADD  CONSTRAINT [CHK_Feedback_Rating] CHECK  (([Rating]>=(1) AND [Rating]<=(5)))
GO
ALTER TABLE [dbo].[Feedback] CHECK CONSTRAINT [CHK_Feedback_Rating]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [CHK_Invoice_DueDate] CHECK  (([DueDate]>=[InvoiceDate]))
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [CHK_Invoice_DueDate]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [CHK_Invoice_Month] CHECK  (([InvoiceMonth]>=(1) AND [InvoiceMonth]<=(12)))
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [CHK_Invoice_Month]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [CHK_Invoice_Total] CHECK  (([TotalAmount]>=(0)))
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [CHK_Invoice_Total]
GO
ALTER TABLE [dbo].[Invoice]  WITH CHECK ADD  CONSTRAINT [CHK_Invoice_Year] CHECK  (([InvoiceYear]>=(2000)))
GO
ALTER TABLE [dbo].[Invoice] CHECK CONSTRAINT [CHK_Invoice_Year]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [CHK_InvoiceDetail_Amount] CHECK  (([Amount]>=(0)))
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [CHK_InvoiceDetail_Amount]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [CHK_InvoiceDetail_Price] CHECK  (([UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [CHK_InvoiceDetail_Price]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [CHK_InvoiceDetail_Qty] CHECK  (([Quantity]>(0)))
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [CHK_InvoiceDetail_Qty]
GO
ALTER TABLE [dbo].[InvoiceDetail]  WITH CHECK ADD  CONSTRAINT [CHK_InvoiceDetail_Type] CHECK  (([ChargeType]='OTHER' OR [ChargeType]='PARKING' OR [ChargeType]='SERVICE' OR [ChargeType]='WATER' OR [ChargeType]='ELECTRIC' OR [ChargeType]='ROOM'))
GO
ALTER TABLE [dbo].[InvoiceDetail] CHECK CONSTRAINT [CHK_InvoiceDetail_Type]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [CHK_MR_Index] CHECK  (([NewIndex]>=[OldIndex]))
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [CHK_MR_Index]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [CHK_MR_Month] CHECK  (([ReadingMonth]>=(1) AND [ReadingMonth]<=(12)))
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [CHK_MR_Month]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [CHK_MR_New] CHECK  (([NewIndex]>=(0)))
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [CHK_MR_New]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [CHK_MR_Old] CHECK  (([OldIndex]>=(0)))
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [CHK_MR_Old]
GO
ALTER TABLE [dbo].[MeterReading]  WITH CHECK ADD  CONSTRAINT [CHK_MR_Year] CHECK  (([ReadingYear]>=(2000)))
GO
ALTER TABLE [dbo].[MeterReading] CHECK CONSTRAINT [CHK_MR_Year]
GO
ALTER TABLE [dbo].[Notification]  WITH CHECK ADD  CONSTRAINT [CHK_Notification_Scope] CHECK  (([TargetScope]='USER' OR [TargetScope]='BUILDING' OR [TargetScope]='ALL'))
GO
ALTER TABLE [dbo].[Notification] CHECK CONSTRAINT [CHK_Notification_Scope]
GO
ALTER TABLE [dbo].[ParkingAccessLog]  WITH CHECK ADD  CONSTRAINT [CHK_ParkingAccessLog_EventType] CHECK  (([EventType]='OUT' OR [EventType]='IN'))
GO
ALTER TABLE [dbo].[ParkingAccessLog] CHECK CONSTRAINT [CHK_ParkingAccessLog_EventType]
GO
ALTER TABLE [dbo].[ParkingCard]  WITH CHECK ADD  CONSTRAINT [CHK_ParkingCard_Dates] CHECK  (([ExpiredDate]>=[IssueDate]))
GO
ALTER TABLE [dbo].[ParkingCard] CHECK CONSTRAINT [CHK_ParkingCard_Dates]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [CHK_ParkingSubscription_Dates] CHECK  (([EndDate] IS NULL OR [EndDate]>=[StartDate]))
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [CHK_ParkingSubscription_Dates]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [CHK_ParkingSubscription_MonthlyFee] CHECK  (([MonthlyFeeSnapshot]>=(0)))
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [CHK_ParkingSubscription_MonthlyFee]
GO
ALTER TABLE [dbo].[ParkingSubscription]  WITH CHECK ADD  CONSTRAINT [CHK_ParkingSubscription_Status] CHECK  (([Status]='ENDED' OR [Status]='SUSPENDED' OR [Status]='ACTIVE'))
GO
ALTER TABLE [dbo].[ParkingSubscription] CHECK CONSTRAINT [CHK_ParkingSubscription_Status]
GO
ALTER TABLE [dbo].[Payment]  WITH CHECK ADD  CONSTRAINT [CHK_Payment_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Payment] CHECK CONSTRAINT [CHK_Payment_Amount]
GO
ALTER TABLE [dbo].[ResidentIdentity]  WITH CHECK ADD  CONSTRAINT [CHK_Identity_Dates] CHECK  (([ExpiredDate]>[IssueDate]))
GO
ALTER TABLE [dbo].[ResidentIdentity] CHECK CONSTRAINT [CHK_Identity_Dates]
GO
ALTER TABLE [dbo].[Service]  WITH CHECK ADD  CONSTRAINT [CHK_Service_Price] CHECK  (([Price]>=(0)))
GO
ALTER TABLE [dbo].[Service] CHECK CONSTRAINT [CHK_Service_Price]
GO
ALTER TABLE [dbo].[ServiceRegistration]  WITH CHECK ADD  CONSTRAINT [CHK_SR_Dates] CHECK  (([EndDate]>=[RegisterDate]))
GO
ALTER TABLE [dbo].[ServiceRegistration] CHECK CONSTRAINT [CHK_SR_Dates]
GO
ALTER TABLE [dbo].[ServiceRegistration]  WITH CHECK ADD  CONSTRAINT [CHK_SR_Quantity] CHECK  (([Quantity]>(0)))
GO
ALTER TABLE [dbo].[ServiceRegistration] CHECK CONSTRAINT [CHK_SR_Quantity]
GO
ALTER TABLE [dbo].[SmartMeter]  WITH CHECK ADD  CONSTRAINT [CHK_SmartMeter_CurrentIndex] CHECK  (([CurrentIndex]>=(0)))
GO
ALTER TABLE [dbo].[SmartMeter] CHECK CONSTRAINT [CHK_SmartMeter_CurrentIndex]
GO
ALTER TABLE [dbo].[SmartMeterLog]  WITH CHECK ADD  CONSTRAINT [CHK_SmartMeterLog_Delta] CHECK  (([DeltaValue]>(0)))
GO
ALTER TABLE [dbo].[SmartMeterLog] CHECK CONSTRAINT [CHK_SmartMeterLog_Delta]
GO
ALTER TABLE [dbo].[SmartMeterLog]  WITH CHECK ADD  CONSTRAINT [CHK_SmartMeterLog_Index] CHECK  (([NewIndex]>=[OldIndex]))
GO
ALTER TABLE [dbo].[SmartMeterLog] CHECK CONSTRAINT [CHK_SmartMeterLog_Index]
GO
ALTER TABLE [dbo].[SmartMeterLog]  WITH CHECK ADD  CONSTRAINT [CHK_SmartMeterLog_Source] CHECK  (([Source]='DEMO' OR [Source]='AUTO'))
GO
ALTER TABLE [dbo].[SmartMeterLog] CHECK CONSTRAINT [CHK_SmartMeterLog_Source]
GO
ALTER TABLE [dbo].[UtilityPriceTier]  WITH CHECK ADD  CONSTRAINT [CHK_UPT_From] CHECK  (([FromValue]>=(0)))
GO
ALTER TABLE [dbo].[UtilityPriceTier] CHECK CONSTRAINT [CHK_UPT_From]
GO
ALTER TABLE [dbo].[UtilityPriceTier]  WITH CHECK ADD  CONSTRAINT [CHK_UPT_Price] CHECK  (([UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[UtilityPriceTier] CHECK CONSTRAINT [CHK_UPT_Price]
GO
ALTER TABLE [dbo].[UtilityPriceTier]  WITH CHECK ADD  CONSTRAINT [CHK_UPT_Values] CHECK  (([ToValue]>[FromValue]))
GO
ALTER TABLE [dbo].[UtilityPriceTier] CHECK CONSTRAINT [CHK_UPT_Values]
GO


/****** Verification ******/
PRINT N'ApartmentManagement database script completed.';
SELECT N'ApartmentCode datatype' AS CheckName, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Apartment' AND COLUMN_NAME = 'ApartmentCode';

SELECT N'ContractNumber datatype' AS CheckName, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Contract' AND COLUMN_NAME = 'ContractNumber';

SELECT N'ContractEquipment exists' AS CheckName, OBJECT_ID(N'dbo.ContractEquipment', N'U') AS ObjectID;
SELECT COUNT(*) AS TotalPermissions FROM dbo.Permission;
SELECT COUNT(*) AS AdminPermissions
FROM dbo.RolePermission rp
JOIN dbo.Role r ON r.RoleID = rp.RoleID
WHERE r.RoleCode = 'ADMIN' AND rp.IsGranted = 1;
GO
GO
-- BEGIN SYNCHRONIZED WORKFLOW MIGRATIONS

-- 20260921_add_rbac_scoped_view_permissions.sql
BEGIN TRANSACTION;
BEGIN TRY
    DECLARE @Permissions TABLE (
        PermissionCode NVARCHAR(100) PRIMARY KEY,
        ModuleID INT NOT NULL,
        PermissionName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL
    );

    INSERT INTO @Permissions (PermissionCode, ModuleID, PermissionName, Description) VALUES
        ('RESIDENT_VIEW_OWN', 2, N'Xem dữ liệu cư dân của mình', N'Quyền xem danh sách và hồ sơ cư dân thuộc tài khoản hiện tại.'),
        ('RESIDENT_VIEW_ALL', 2, N'Xem tất cả cư dân', N'Quyền xem toàn bộ danh sách cư dân trong hệ thống.'),
        ('APARTMENT_VIEW_OWN', 3, N'Xem căn hộ của mình', N'Quyền xem căn hộ có liên quan đến cư dân hiện tại.'),
        ('APARTMENT_VIEW_ALL', 3, N'Xem tất cả căn hộ', N'Quyền xem toàn bộ căn hộ trong hệ thống.'),
        ('CONTRACT_VIEW_OWN', 4, N'Xem hợp đồng của mình', N'Quyền xem hợp đồng liên quan đến cư dân hiện tại.'),
        ('CONTRACT_VIEW_ALL', 4, N'Xem tất cả hợp đồng', N'Quyền xem toàn bộ hợp đồng trong hệ thống.'),
        ('INVOICE_VIEW_OWN', 6, N'Xem hóa đơn của mình', N'Quyền xem hóa đơn thuộc hợp đồng/căn hộ của cư dân hiện tại.'),
        ('INVOICE_VIEW_ALL', 6, N'Xem tất cả hóa đơn', N'Quyền xem toàn bộ hóa đơn trong hệ thống.'),
        ('VEHICLE_VIEW_OWN', 7, N'Xem phương tiện của mình', N'Quyền xem phương tiện thuộc cư dân hiện tại.'),
        ('VEHICLE_VIEW_ALL', 7, N'Xem tất cả phương tiện', N'Quyền xem toàn bộ phương tiện trong hệ thống.'),
        ('PARKING_VIEW_OWN', 7, N'Xem bãi xe của mình', N'Quyền xem thẻ, đăng ký và lịch sử bãi xe thuộc cư dân hiện tại.'),
        ('PARKING_VIEW_ALL', 7, N'Xem tất cả bãi xe', N'Quyền xem toàn bộ thẻ, đăng ký và lịch sử bãi xe.'),
        ('TICKET_VIEW_OWN', 8, N'Xem ticket của mình', N'Quyền xem yêu cầu hỗ trợ thuộc cư dân hiện tại.'),
        ('TICKET_VIEW_ALL', 8, N'Xem tất cả ticket', N'Quyền xem toàn bộ yêu cầu hỗ trợ trong hệ thống.'),
        ('FEEDBACK_VIEW_OWN', 8, N'Xem phản ánh của mình', N'Quyền xem phản ánh thuộc cư dân hiện tại.'),
        ('FEEDBACK_VIEW_ALL', 8, N'Xem tất cả phản ánh', N'Quyền xem toàn bộ phản ánh trong hệ thống.'),
        ('NOTIFICATION_VIEW_OWN', 9, N'Xem thông báo của mình', N'Quyền xem inbox thông báo của tài khoản hiện tại.'),
        ('NOTIFICATION_VIEW_ALL', 9, N'Xem tất cả thông báo quản trị', N'Quyền xem dữ liệu thông báo theo quyền quản trị.'),
        ('RESIDENT_EXPORT', 2, N'Xuất danh sách cư dân', N'Quyền xuất dữ liệu cư dân cho vai trò quản lý.');

    INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
    SELECT p.ModuleID, p.PermissionCode, p.PermissionName, p.Description
    FROM @Permissions p
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Permission x WHERE x.PermissionCode = p.PermissionCode
    );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_OWN', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_OWN',
        'VEHICLE_VIEW_OWN', 'PARKING_VIEW_OWN', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_OWN'
        , 'NOTIFICATION_VIEW_OWN'
    )
    WHERE r.RoleCode = 'RESIDENT'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
        'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN',
        'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
        'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
        , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
    )
    WHERE r.RoleCode IN ('MANAGER', 'ADMIN')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
        'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN'
    )
    WHERE r.RoleCode IN ('ACCOUNTANT', 'RECEPTION')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode IN (
        'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
        'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
                    , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
    )
    WHERE r.RoleCode IN ('SECURITY', 'RECEPTION')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RolePermission rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID
      );

        UPDATE rp
        SET rp.IsGranted = 1
        FROM dbo.RolePermission rp
        JOIN dbo.Role r ON r.RoleID = rp.RoleID
        JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
        WHERE r.RoleCode = 'RESIDENT'
            AND p.PermissionCode IN (
                    'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_OWN', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_OWN',
                    'VEHICLE_VIEW_OWN', 'PARKING_VIEW_OWN', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_OWN',
                    'NOTIFICATION_VIEW_OWN'
            );

        UPDATE rp
        SET rp.IsGranted = 1
        FROM dbo.RolePermission rp
        JOIN dbo.Role r ON r.RoleID = rp.RoleID
        JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
        WHERE r.RoleCode IN ('MANAGER', 'ADMIN', 'ACCOUNTANT', 'RECEPTION', 'SECURITY')
            AND p.PermissionCode IN (
                    'RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN', 'APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN',
                    'CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN',
                    'VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN', 'PARKING_VIEW_ALL', 'PARKING_VIEW_OWN',
                    'TICKET_VIEW_ALL', 'TICKET_VIEW_OWN', 'FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'
                                        , 'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
            );

                UPDATE rp
                SET rp.IsGranted = 0
                FROM dbo.RolePermission rp
                JOIN dbo.Role r ON r.RoleID = rp.RoleID
                JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
                WHERE r.RoleCode = 'RESIDENT'
                    AND p.PermissionCode IN (
                            'RESIDENT_VIEW_ALL', 'APARTMENT_VIEW_ALL', 'CONTRACT_VIEW_ALL', 'INVOICE_VIEW_ALL',
                            'VEHICLE_VIEW_ALL', 'PARKING_VIEW_ALL', 'TICKET_VIEW_ALL', 'FEEDBACK_VIEW_ALL',
                            'NOTIFICATION_VIEW_ALL', 'RESIDENT_EXPORT'
                    );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
GO

-- 20260922_complete_workflows.sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Role', 'IsSystem') IS NULL
    ALTER TABLE dbo.Role ADD IsSystem bit NOT NULL CONSTRAINT DF_Role_IsSystem DEFAULT 0;
EXEC(N'UPDATE dbo.Role SET IsSystem=1 WHERE RoleCode IN (''ADMIN'',''RESIDENT'')');
IF COL_LENGTH('dbo.MaintenanceRequest','Progress') IS NULL
    ALTER TABLE dbo.MaintenanceRequest ADD Progress int NOT NULL CONSTRAINT DF_Maintenance_Progress DEFAULT 0,
        Response nvarchar(max) NULL, UpdatedAt datetime2 NULL, CompletedAt datetime2 NULL;
IF OBJECT_ID('dbo.TicketUpdate','U') IS NULL
    CREATE TABLE dbo.TicketUpdate (
        UpdateID int IDENTITY PRIMARY KEY, RequestID int NOT NULL REFERENCES dbo.MaintenanceRequest(RequestID) ON DELETE CASCADE,
        ActorID int NOT NULL REFERENCES dbo.Users(UserID), StatusID int NOT NULL REFERENCES dbo.MaintenanceStatus(StatusID),
        Progress int NOT NULL CHECK (Progress BETWEEN 0 AND 100), Response nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME()
    );
IF OBJECT_ID('dbo.InvoicePaymentSubmission','U') IS NULL
    CREATE TABLE dbo.InvoicePaymentSubmission (
        InvoiceID int PRIMARY KEY REFERENCES dbo.Invoice(InvoiceID),
        SubmittedBy int NOT NULL REFERENCES dbo.Users(UserID), SubmittedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
        Amount decimal(18,2) NOT NULL CHECK (Amount > 0), TransferContent varchar(100) NOT NULL,
        ConfirmedBy int NULL REFERENCES dbo.Users(UserID), ConfirmedAt datetime2 NULL,
        PaymentID int NULL REFERENCES dbo.Payment(PaymentID)
    );
IF OBJECT_ID('dbo.PaymentConfiguration','U') IS NULL
    CREATE TABLE dbo.PaymentConfiguration (
        ConfigKey varchar(30) PRIMARY KEY, BankBin varchar(6) NOT NULL,
        AccountNumber varchar(30) NOT NULL, AccountName nvarchar(150) NOT NULL
    );

DECLARE @NewPermissions TABLE(ModuleCode varchar(50), Code varchar(100), Name nvarchar(200));
INSERT @NewPermissions VALUES
('SERVICE','SERVICE_VIEW_OWN',N'Xem dịch vụ của mình'),('SERVICE','SERVICE_VIEW_ALL',N'Xem tất cả dịch vụ'),
('OPERATION','TICKET_VIEW_OWN',N'Xem yêu cầu của mình và việc kỹ thuật có thể nhận'),
('SETTING','PROFILE_UPDATE',N'Cập nhật hồ sơ cá nhân'),('SETTING','PASSWORD_CHANGE',N'Đổi mật khẩu'),
('NOTIFICATION','NOTIFICATION_VIEW_OWN',N'Xem thông báo của mình');
INSERT dbo.Permission(ModuleID,PermissionCode,PermissionName)
SELECT m.ModuleID,n.Code,n.Name FROM @NewPermissions n JOIN Module m ON m.ModuleCode=n.ModuleCode
WHERE NOT EXISTS(SELECT 1 FROM Permission p WHERE p.PermissionCode=n.Code);

DECLARE @Grants TABLE(RoleCode varchar(50), PermissionCode varchar(100));
INSERT @Grants SELECT RoleCode,p.Code FROM Role CROSS JOIN (VALUES('PROFILE_UPDATE'),('PASSWORD_CHANGE'),('NOTIFICATION_VIEW_OWN')) p(Code) WHERE Status=1;
INSERT @Grants VALUES
('TECHNICIAN','TICKET_VIEW_OWN'),('TECHNICIAN','MAINTENANCE_UPDATE'),
('RESIDENT','SERVICE_VIEW_OWN'),('RESIDENT','SERVICE_VIEW'),('RESIDENT','SERVICE_REGISTRATION_CREATE'),('RESIDENT','SERVICE_REGISTRATION_UPDATE'),('RESIDENT','FEEDBACK_CREATE'),
('ADMIN','SERVICE_VIEW_ALL'),('MANAGER','SERVICE_VIEW_ALL'),('ACCOUNTANT','SERVICE_VIEW_ALL'),('ACCOUNTANT','SERVICE_VIEW');
UPDATE rp SET IsGranted=1 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
JOIN @Grants g ON g.RoleCode=r.RoleCode AND g.PermissionCode=p.PermissionCode;
INSERT RolePermission(RoleID,PermissionID,IsGranted,CreatedAt)
SELECT DISTINCT r.RoleID,p.PermissionID,1,GETDATE() FROM @Grants g JOIN Role r ON r.RoleCode=g.RoleCode JOIN Permission p ON p.PermissionCode=g.PermissionCode
WHERE NOT EXISTS(SELECT 1 FROM RolePermission rp WHERE rp.RoleID=r.RoleID AND rp.PermissionID=p.PermissionID);
-- Remove known accidental administrative grants, without granting global reads from a menu permission.
UPDATE rp SET IsGranted=0 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
WHERE (r.RoleCode='RESIDENT' AND (p.PermissionCode LIKE '%[_]VIEW[_]ALL' OR p.PermissionCode IN ('SYSTEM_SETTING','MENU_SYSTEM_INFO_VIEW','AI_CHAT','AI_SEARCH')))
   OR (r.RoleCode='TECHNICIAN' AND p.PermissionCode IN ('TICKET_VIEW_ALL','TICKET_CREATE'))
   OR (r.RoleCode='SECURITY' AND p.PermissionCode IN ('RESIDENT_EXPORT','FEEDBACK_VIEW_ALL','FEEDBACK_VIEW_OWN','TICKET_VIEW_ALL','TICKET_VIEW_OWN','NOTIFICATION_VIEW_ALL'));
COMMIT;
GO

-- 20260923_core_roles_equipment_tickets.sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE dbo.MaintenanceRequest SET Progress=100 WHERE StatusID=3 AND Progress<>100;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_MaintenanceRequest_Progress')
    ALTER TABLE dbo.MaintenanceRequest WITH CHECK ADD CONSTRAINT CK_MaintenanceRequest_Progress CHECK(Progress BETWEEN 0 AND 100);
-- Only these two role codes define core authorization/account identity behavior.
UPDATE dbo.Role SET IsSystem=CASE WHEN RoleCode IN ('ADMIN','RESIDENT') THEN 1 ELSE 0 END
WHERE RoleCode IN ('ADMIN','RESIDENT','MANAGER','ACCOUNTANT','TECHNICIAN','SECURITY','RECEPTION');
IF COL_LENGTH('dbo.MaintenanceRequest','ContractEquipmentID') IS NULL
    ALTER TABLE dbo.MaintenanceRequest ADD ContractEquipmentID int NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_MaintenanceRequest_ContractEquipment')
    EXEC(N'ALTER TABLE dbo.MaintenanceRequest WITH CHECK ADD CONSTRAINT FK_MaintenanceRequest_ContractEquipment FOREIGN KEY(ContractEquipmentID) REFERENCES dbo.ContractEquipment(ContractEquipmentID)');
COMMIT;
GO

-- 20260924_add_notification_deep_links.sql
-- Add optional deep-link metadata without changing existing notification behavior.
IF COL_LENGTH('dbo.Notification', 'EntityType') IS NULL
    ALTER TABLE dbo.Notification ADD EntityType varchar(50) NULL;
IF COL_LENGTH('dbo.Notification', 'EntityID') IS NULL
    ALTER TABLE dbo.Notification ADD EntityID int NULL;
IF COL_LENGTH('dbo.Notification', 'TargetPage') IS NULL
    ALTER TABLE dbo.Notification ADD TargetPage varchar(100) NULL;
IF COL_LENGTH('dbo.Notification', 'ActionUrl') IS NULL
    ALTER TABLE dbo.Notification ADD ActionUrl varchar(500) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notification_EntityLink' AND object_id = OBJECT_ID('dbo.Notification'))
    CREATE INDEX IX_Notification_EntityLink ON dbo.Notification(EntityType, EntityID);
GO
GO

-- 20260924_backfill_contract_equipment.sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Seed the handover template only for contracts that have no persisted equipment.
-- This is idempotent and covers the active contract for apartment A-T5-P1.
INSERT INTO dbo.ContractEquipment (
    ContractID,
    EquipmentName,
    Category,
    Brand,
    Model,
    Quantity,
    Location,
    Specifications,
    ConditionDescription,
    EquipmentStatus
)
SELECT
    c.ContractID,
    v.EquipmentName,
    v.Category,
    v.Brand,
    v.Model,
    1,
    v.Location,
    v.Specifications,
    v.ConditionDescription,
    'operational'
FROM dbo.Contract c
CROSS JOIN (VALUES
    (N'Smart Tivi 4K Samsung Crystal UHD 55 inch', N'TIVI', N'Samsung', N'UA55AU7002KXXV', N'Phòng khách', N'55 inch - 4K UHD - Wi-Fi 5G & Bluetooth', N'Hoạt động tốt (98%)'),
    (N'Tủ lạnh Inverter Panasonic 322 Lít 2 cánh', N'TỦ LẠNH', N'Panasonic', N'NR-BV360QSVN', N'Khu vực bếp', N'322 Lít - Ngăn đông mềm - Inverter Econavi', N'Mới 98%, làm lạnh êm'),
    (N'Máy lạnh Daikin Inverter 1.5 HP (Phòng khách)', N'MÁY LẠNH', N'Daikin', N'FTKB35XVMV', N'Phòng khách', N'1.5 HP - 12.000 BTU - Inverter', N'Làm lạnh nhanh, đã vệ sinh bảo dưỡng định kỳ'),
    (N'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ Master)', N'MÁY LẠNH', N'Daikin', N'FTKB25XVMV', N'Phòng ngủ Master', N'1.0 HP - 9.000 BTU - Inverter', N'Hoạt động rất êm'),
    (N'Máy lạnh Daikin Inverter 1.0 HP (Phòng ngủ nhỏ)', N'MÁY LẠNH', N'Daikin', N'FTKB25XVMV', N'Phòng ngủ 2', N'1.0 HP - 9.000 BTU - Inverter', N'Hoạt động ổn định'),
    (N'Máy giặt cửa ngang Electrolux UltimateCare 9.0 Kg', N'MÁY GIẶT', N'Electrolux', N'EWF9024P5WB', N'Logia giặt phơi', N'9.0 Kg - EcoInverter - Giặt hơi nước', N'Hoạt động tốt, vắt êm')
) v(EquipmentName, Category, Brand, Model, Location, Specifications, ConditionDescription)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ContractEquipment existing
    WHERE existing.ContractID = c.ContractID
);

COMMIT;
GO

-- 20260924_backfill_legacy_notification_links.sql
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
GO

-- 20260924_finalize_complete_draft_invoices.sql
-- Promote only complete non-utility drafts so residents can pay invoices whose amount is already final.
-- Utility drafts remain drafts until the meter workflow finalizes them.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE i
SET WorkflowStatus = 'WAITING_PAYMENT', StatusID = 1
FROM dbo.Invoice i
WHERE i.WorkflowStatus = 'DRAFT'
  AND i.StatusID <> 4
  AND i.TotalAmount > 0
  AND EXISTS (SELECT 1 FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID)
  AND NOT EXISTS (SELECT 1 FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID AND d.ChargeType IN ('ELECTRIC', 'WATER'))
  AND i.TotalAmount = (SELECT SUM(d.Amount) FROM dbo.InvoiceDetail d WHERE d.InvoiceID = i.InvoiceID);

COMMIT TRANSACTION;
GO
GO

-- 20260925_delivery_extensions_ai.sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.NotificationDelivery','U') IS NULL
BEGIN
 CREATE TABLE dbo.NotificationDelivery (
  DeliveryID int IDENTITY PRIMARY KEY,
  NotificationID int NOT NULL REFERENCES dbo.Notification(NotificationID) ON DELETE CASCADE,
  UserID int NOT NULL REFERENCES dbo.Users(UserID),
  Channel varchar(10) NOT NULL CHECK(Channel IN ('WEB','EMAIL')),
  Recipient nvarchar(320) NULL,
  Status varchar(10) NOT NULL CHECK(Status IN ('PENDING','SENT','FAILED','SKIPPED')),
  AttemptCount int NOT NULL DEFAULT 0 CHECK(AttemptCount>=0),
  ErrorMessage nvarchar(500) NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(), SentAt datetime2 NULL,
  CONSTRAINT UQ_NotificationDelivery UNIQUE(NotificationID,UserID,Channel)
 );
 CREATE INDEX IX_NotificationDelivery_Status ON dbo.NotificationDelivery(Status,CreatedAt);
END;
IF OBJECT_ID('dbo.InvoiceDueDateExtensionRequest','U') IS NULL
BEGIN
 CREATE TABLE dbo.InvoiceDueDateExtensionRequest (
  RequestID int IDENTITY PRIMARY KEY,
  InvoiceID int NOT NULL REFERENCES dbo.Invoice(InvoiceID),
  RequestedByUserID int NOT NULL REFERENCES dbo.Users(UserID),
  RequestedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
  OriginalDueDate date NOT NULL, RequestedDueDate date NOT NULL,
  Reason nvarchar(2000) NOT NULL,
  Status varchar(10) NOT NULL DEFAULT 'PENDING' CHECK(Status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  ReviewedByUserID int NULL REFERENCES dbo.Users(UserID), ReviewedAt datetime2 NULL,
  ApprovedDueDate date NULL, ReviewNote nvarchar(2000) NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(), UpdatedAt datetime2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT CK_Extension_Dates CHECK(RequestedDueDate>OriginalDueDate),
  CONSTRAINT CK_Extension_Approval CHECK(Status<>'APPROVED' OR (ApprovedDueDate>OriginalDueDate AND ReviewedByUserID IS NOT NULL AND ReviewedAt IS NOT NULL))
 );
 CREATE UNIQUE INDEX UX_Extension_Pending ON dbo.InvoiceDueDateExtensionRequest(InvoiceID) WHERE Status='PENDING';
 CREATE INDEX IX_Extension_Invoice ON dbo.InvoiceDueDateExtensionRequest(InvoiceID,RequestedAt);
END;
IF COL_LENGTH('dbo.MaintenanceRequest','DueDate') IS NULL
 ALTER TABLE dbo.MaintenanceRequest ADD DueDate date NULL;
IF NOT EXISTS(SELECT 1 FROM Permission WHERE PermissionCode='INVOICE_DUE_DATE_EXTEND')
 INSERT Permission(ModuleID,PermissionCode,PermissionName)
 SELECT ModuleID,'INVOICE_DUE_DATE_EXTEND',N'Gia hạn thanh toán hóa đơn' FROM Permission WHERE PermissionCode='INVOICE_UPDATE';
DECLARE @Grants TABLE(RoleCode varchar(50),PermissionCode varchar(100));
INSERT @Grants VALUES ('ADMIN','INVOICE_DUE_DATE_EXTEND'),('MANAGER','INVOICE_DUE_DATE_EXTEND'),('ACCOUNTANT','INVOICE_DUE_DATE_EXTEND'),
 ('RESIDENT','AI_CHAT'),('RESIDENT','AI_SEARCH'),('RESIDENT','MENU_AI_CHAT_VIEW'),('RESIDENT','MENU_AI_SEARCH_VIEW');
UPDATE rp SET IsGranted=1 FROM RolePermission rp JOIN Role r ON r.RoleID=rp.RoleID JOIN Permission p ON p.PermissionID=rp.PermissionID
 JOIN @Grants g ON g.RoleCode=r.RoleCode AND g.PermissionCode=p.PermissionCode;
INSERT RolePermission(RoleID,PermissionID,IsGranted,CreatedAt)
 SELECT r.RoleID,p.PermissionID,1,GETDATE() FROM @Grants g JOIN Role r ON r.RoleCode=g.RoleCode JOIN Permission p ON p.PermissionCode=g.PermissionCode
 WHERE NOT EXISTS(SELECT 1 FROM RolePermission rp WHERE rp.RoleID=r.RoleID AND rp.PermissionID=p.PermissionID);
COMMIT;
GO
GO
