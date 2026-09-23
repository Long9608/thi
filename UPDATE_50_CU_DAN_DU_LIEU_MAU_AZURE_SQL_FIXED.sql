/*
    DUC VU TOWER - DEMO DATA UPDATE (50 RESIDENTS)
    Azure SQL Database edition
    Compatible with thi(20260923-150153) / current ApartmentManagement schema.

    AZURE NOTES:
    - Connect DIRECTLY to the target Azure SQL database before running this file.
      Do NOT run it while connected to the logical server's master database.
    - This file intentionally contains no USE [Database] and no GO separators, so it can
      be executed as one batch from Azure Portal Query Editor, SSMS, Azure Data Studio,
      sqlcmd-compatible clients, or application migration runners.
    - IDs such as the admin/system UserID are resolved dynamically; the script does not
      assume UserID = 1 on Azure.

    Muc tieu:
    - Them 50 tai khoan cu dan + ho so cu dan + CCCD.
    - Gan 50 can ho dang trong, tao hop dong dang hieu luc.
    - Moi hop dong co thiet bi ban giao, dich vu, xe, the bai xe, dang ky gui xe.
    - Tao cong to dien/nuoc, chi so thang 09/2026, hoa don va du lieu thanh toan.
    - Them mot so yeu cau bao tri va phan hoi de dashboard/bao cao co du lieu thuc te.
    - Backfill thiet bi cho cac hop dong dang hieu luc cu (neu chua co ContractEquipment),
      vi du hop dong cua cu dan "nguyen ok".

    Tai khoan demo: resident01 ... resident50
    Mat khau chung: Resident@123

    Script an toan theo transaction. Neu resident01 da ton tai, script dung de tranh tao trung.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF DB_NAME() = N'master'
        THROW 51010, N'Bạn đang kết nối vào database master. Hãy chọn đúng Azure SQL database của project rồi chạy lại script.', 1;

    IF OBJECT_ID(N'dbo.Users', N'U') IS NULL OR OBJECT_ID(N'dbo.Role', N'U') IS NULL
        THROW 51011, N'Không tìm thấy schema ApartmentManagement trong database hiện tại.', 1;

    IF OBJECT_ID(N'dbo.ContractEquipment', N'U') IS NULL
        THROW 51000, N'Thieu bang ContractEquipment. Hay chay migration/workflow truoc.', 1;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'resident01')
        THROW 51001, N'Bo du lieu demo resident01-resident50 da duoc nap. Khong nap lai de tranh trung du lieu.', 1;

    DECLARE @ResidentRoleID INT = (SELECT TOP 1 RoleID FROM dbo.Role WHERE RoleCode='RESIDENT' AND Status=1);
    DECLARE @ActiveContractStatusID INT = COALESCE((SELECT TOP 1 StatusID FROM dbo.ContractStatus WHERE StatusName=N'Hiệu lực'),
                                                   (SELECT TOP 1 StatusID FROM dbo.ContractStatus WHERE StatusName=N'Đang hiệu lực'));
    DECLARE @OccupiedRoomStatusID INT = (SELECT TOP 1 StatusID FROM dbo.RoomStatus WHERE StatusName=N'Đang ở');
    DECLARE @MotorbikeTypeID INT = (SELECT TOP 1 VehicleTypeID FROM dbo.VehicleType WHERE TypeName=N'Xe máy');
    DECLARE @CarTypeID INT = (SELECT TOP 1 VehicleTypeID FROM dbo.VehicleType WHERE TypeName=N'Xe hơi');
    DECLARE @WifiServiceID INT = (SELECT TOP 1 ServiceID FROM dbo.Service WHERE ServiceName=N'Phí Wifi' AND Status=1);
    DECLARE @GymServiceID INT = (SELECT TOP 1 ServiceID FROM dbo.Service WHERE ServiceName=N'Phí Gym' AND Status=1);
    DECLARE @PoolServiceID INT = (SELECT TOP 1 ServiceID FROM dbo.Service WHERE ServiceName=N'Phí Hồ bơi' AND Status=1);
    DECLARE @ElectricUtilityID INT = (SELECT TOP 1 UtilityTypeID FROM dbo.UtilityType WHERE UtilityName LIKE N'%Điện%');
    DECLARE @WaterUtilityID INT = (SELECT TOP 1 UtilityTypeID FROM dbo.UtilityType WHERE UtilityName LIKE N'%Nước%');
    DECLARE @InvoiceUnpaidID INT = (SELECT TOP 1 StatusID FROM dbo.InvoiceStatus WHERE StatusName=N'Chưa thanh toán');
    DECLARE @InvoicePaidID INT = (SELECT TOP 1 StatusID FROM dbo.InvoiceStatus WHERE StatusName=N'Đã thanh toán');
    DECLARE @InvoiceOverdueID INT = (SELECT TOP 1 StatusID FROM dbo.InvoiceStatus WHERE StatusName=N'Quá hạn');
    DECLARE @PaymentSuccessID INT = (SELECT TOP 1 StatusID FROM dbo.PaymentStatus WHERE StatusName=N'Thành công');
    DECLARE @BankMethodID INT = (SELECT TOP 1 MethodID FROM dbo.PaymentMethod WHERE MethodName LIKE N'%VietQR%' OR MethodName LIKE N'%Ngân hàng%');
    DECLARE @MaintenanceNewID INT = (SELECT TOP 1 StatusID FROM dbo.MaintenanceStatus WHERE StatusName=N'Mới tiếp nhận');
    DECLARE @ParkingAreaID INT = (SELECT TOP 1 AreaID FROM dbo.ApartmentArea ORDER BY CASE WHEN AreaName LIKE N'%Đức Vũ%' THEN 0 ELSE 1 END, AreaID);
    DECLARE @SystemUserID INT = (
        SELECT TOP (1) u.UserID
        FROM dbo.Users u
        JOIN dbo.UserRole ur ON ur.UserID = u.UserID
        JOIN dbo.Role r ON r.RoleID = ur.RoleID
        WHERE u.Status = 1 AND r.RoleCode IN ('ADMIN','SYSTEM_ADMIN')
        ORDER BY CASE WHEN r.RoleCode='ADMIN' THEN 0 ELSE 1 END, u.UserID
    );
    IF @SystemUserID IS NULL
        SELECT TOP (1) @SystemUserID = UserID FROM dbo.Users WHERE Status = 1 ORDER BY UserID;

    IF @ResidentRoleID IS NULL OR @ActiveContractStatusID IS NULL OR @OccupiedRoomStatusID IS NULL
       OR @MotorbikeTypeID IS NULL OR @CarTypeID IS NULL
       OR @WifiServiceID IS NULL OR @GymServiceID IS NULL OR @PoolServiceID IS NULL
       OR @ElectricUtilityID IS NULL OR @WaterUtilityID IS NULL
       OR @InvoiceUnpaidID IS NULL OR @InvoicePaidID IS NULL OR @InvoiceOverdueID IS NULL
       OR @PaymentSuccessID IS NULL OR @BankMethodID IS NULL OR @ParkingAreaID IS NULL OR @SystemUserID IS NULL
        THROW 51002, N'Thieu du lieu danh muc bat buoc (Role/Status/Service/VehicleType/Utility...).', 1;

    CREATE TABLE #People(
        Seq INT PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Gender BIT NOT NULL,
        BirthDate DATE NOT NULL,
        Phone VARCHAR(20) NOT NULL,
        Email VARCHAR(100) NOT NULL,
        Username VARCHAR(50) NOT NULL,
        Address NVARCHAR(255) NOT NULL,
        EmergencyName NVARCHAR(100) NOT NULL,
        EmergencyPhone VARCHAR(20) NOT NULL,
        IdentityNumber VARCHAR(20) NOT NULL
    );

    INSERT INTO #People(Seq,FullName,Gender,BirthDate,Phone,Email,Username,Address,EmergencyName,EmergencyPhone,IdentityNumber)
    VALUES
(1, N'Nguyễn Minh Anh', 0, '1996-03-14', '0920000001', 'cudan01@ducvutower.demo', 'resident01', N'12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'Nguyễn Văn Hùng', '0830000001', '079960000001'),
(2, N'Trần Quốc Bảo', 1, '1992-08-21', '0930000002', 'cudan02@ducvutower.demo', 'resident02', N'88 Võ Văn Tần, Quận 3, TP.HCM', N'Trần Thị Lan', '0840000002', '079920000002'),
(3, N'Lê Hoàng Nam', 1, '1988-11-05', '0940000003', 'cudan03@ducvutower.demo', 'resident03', N'145 Điện Biên Phủ, Bình Thạnh, TP.HCM', N'Lê Minh Tâm', '0850000003', '079880000003'),
(4, N'Phạm Thu Trang', 0, '1995-06-18', '0950000004', 'cudan04@ducvutower.demo', 'resident04', N'23 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM', N'Phạm Quốc Dũng', '0860000004', '079950000004'),
(5, N'Hoàng Gia Huy', 1, '1990-02-27', '0960000005', 'cudan05@ducvutower.demo', 'resident05', N'71 Lê Văn Việt, TP. Thủ Đức, TP.HCM', N'Hoàng Thu Hà', '0870000005', '079900000005'),
(6, N'Võ Ngọc Mai', 0, '1998-09-12', '0970000006', 'cudan06@ducvutower.demo', 'resident06', N'39 Nguyễn Duy Trinh, TP. Thủ Đức, TP.HCM', N'Võ Đức Anh', '0880000006', '079980000006'),
(7, N'Đặng Đức Long', 1, '1985-12-03', '0980000007', 'cudan07@ducvutower.demo', 'resident07', N'102 Phan Xích Long, Phú Nhuận, TP.HCM', N'Đặng Thị Hạnh', '0820000007', '079850000007'),
(8, N'Bùi Thanh Thảo', 0, '1993-04-25', '0910000008', 'cudan08@ducvutower.demo', 'resident08', N'55 Cộng Hòa, Tân Bình, TP.HCM', N'Bùi Văn Sơn', '0830000008', '079930000008'),
(9, N'Đỗ Quang Huy', 1, '1997-07-30', '0920000009', 'cudan09@ducvutower.demo', 'resident09', N'18 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Đỗ Ngọc Hà', '0840000009', '079970000009'),
(10, N'Hồ Khánh Linh', 0, '2000-01-16', '0930000010', 'cudan10@ducvutower.demo', 'resident10', N'210 Lý Thường Kiệt, Quận 10, TP.HCM', N'Hồ Thanh Bình', '0850000010', '079000000010'),
(11, N'Nguyễn Tuấn Kiệt', 1, '1994-10-09', '0940000011', 'cudan11@ducvutower.demo', 'resident11', N'12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'Nguyễn Văn Hùng', '0860000011', '079940000011'),
(12, N'Trần Thị Mỹ Duyên', 0, '1989-05-22', '0950000012', 'cudan12@ducvutower.demo', 'resident12', N'88 Võ Văn Tần, Quận 3, TP.HCM', N'Trần Thị Lan', '0870000012', '079890000012'),
(13, N'Lê Quốc Khánh', 1, '1991-01-11', '0960000013', 'cudan13@ducvutower.demo', 'resident13', N'145 Điện Biên Phủ, Bình Thạnh, TP.HCM', N'Lê Minh Tâm', '0880000013', '079910000013'),
(14, N'Phạm Ngọc Hân', 0, '1999-12-19', '0970000014', 'cudan14@ducvutower.demo', 'resident14', N'23 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM', N'Phạm Quốc Dũng', '0820000014', '079990000014'),
(15, N'Hoàng Minh Khang', 1, '1987-06-07', '0980000015', 'cudan15@ducvutower.demo', 'resident15', N'71 Lê Văn Việt, TP. Thủ Đức, TP.HCM', N'Hoàng Thu Hà', '0830000015', '079870000015'),
(16, N'Võ Thùy Dương', 0, '1996-08-28', '0910000016', 'cudan16@ducvutower.demo', 'resident16', N'39 Nguyễn Duy Trinh, TP. Thủ Đức, TP.HCM', N'Võ Đức Anh', '0840000016', '079960000016'),
(17, N'Đặng Anh Tuấn', 1, '1984-03-17', '0920000017', 'cudan17@ducvutower.demo', 'resident17', N'102 Phan Xích Long, Phú Nhuận, TP.HCM', N'Đặng Thị Hạnh', '0850000017', '079840000017'),
(18, N'Bùi Kim Ngân', 0, '1992-11-24', '0930000018', 'cudan18@ducvutower.demo', 'resident18', N'55 Cộng Hòa, Tân Bình, TP.HCM', N'Bùi Văn Sơn', '0860000018', '079920000018'),
(19, N'Đỗ Thành Công', 1, '1995-09-06', '0940000019', 'cudan19@ducvutower.demo', 'resident19', N'18 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Đỗ Ngọc Hà', '0870000019', '079950000019'),
(20, N'Hồ Bảo Ngọc', 0, '2001-02-13', '0950000020', 'cudan20@ducvutower.demo', 'resident20', N'210 Lý Thường Kiệt, Quận 10, TP.HCM', N'Hồ Thanh Bình', '0880000020', '079010000020'),
(21, N'Nguyễn Nhật Minh', 1, '1993-07-15', '0960000021', 'cudan21@ducvutower.demo', 'resident21', N'12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'Nguyễn Văn Hùng', '0820000021', '079930000021'),
(22, N'Trần Thanh Tâm', 0, '1986-10-31', '0970000022', 'cudan22@ducvutower.demo', 'resident22', N'88 Võ Văn Tần, Quận 3, TP.HCM', N'Trần Thị Lan', '0830000022', '079860000022'),
(23, N'Lê Minh Đức', 1, '1998-05-04', '0980000023', 'cudan23@ducvutower.demo', 'resident23', N'145 Điện Biên Phủ, Bình Thạnh, TP.HCM', N'Lê Minh Tâm', '0840000023', '079980000023'),
(24, N'Phạm Hải Yến', 0, '1990-04-08', '0910000024', 'cudan24@ducvutower.demo', 'resident24', N'23 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM', N'Phạm Quốc Dũng', '0850000024', '079900000024'),
(25, N'Hoàng Quốc Việt', 1, '1983-09-29', '0920000025', 'cudan25@ducvutower.demo', 'resident25', N'71 Lê Văn Việt, TP. Thủ Đức, TP.HCM', N'Hoàng Thu Hà', '0860000025', '079830000025'),
(26, N'Võ Thanh Nhàn', 0, '1997-12-01', '0930000026', 'cudan26@ducvutower.demo', 'resident26', N'39 Nguyễn Duy Trinh, TP. Thủ Đức, TP.HCM', N'Võ Đức Anh', '0870000026', '079970000026'),
(27, N'Đặng Trung Hiếu', 1, '1991-06-20', '0940000027', 'cudan27@ducvutower.demo', 'resident27', N'102 Phan Xích Long, Phú Nhuận, TP.HCM', N'Đặng Thị Hạnh', '0880000027', '079910000027'),
(28, N'Bùi Phương Anh', 0, '1994-01-26', '0950000028', 'cudan28@ducvutower.demo', 'resident28', N'55 Cộng Hòa, Tân Bình, TP.HCM', N'Bùi Văn Sơn', '0820000028', '079940000028'),
(29, N'Đỗ Minh Quân', 1, '1989-08-14', '0960000029', 'cudan29@ducvutower.demo', 'resident29', N'18 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Đỗ Ngọc Hà', '0830000029', '079890000029'),
(30, N'Hồ Tú Uyên', 0, '2000-10-02', '0970000030', 'cudan30@ducvutower.demo', 'resident30', N'210 Lý Thường Kiệt, Quận 10, TP.HCM', N'Hồ Thanh Bình', '0840000030', '079000000030'),
(31, N'Nguyễn Thành Đạt', 1, '1996-11-18', '0980000031', 'cudan31@ducvutower.demo', 'resident31', N'12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'Nguyễn Văn Hùng', '0850000031', '079960000031'),
(32, N'Trần Ngọc Ánh', 0, '1992-02-09', '0910000032', 'cudan32@ducvutower.demo', 'resident32', N'88 Võ Văn Tần, Quận 3, TP.HCM', N'Trần Thị Lan', '0860000032', '079920000032'),
(33, N'Lê Anh Khoa', 1, '1986-07-23', '0920000033', 'cudan33@ducvutower.demo', 'resident33', N'145 Điện Biên Phủ, Bình Thạnh, TP.HCM', N'Lê Minh Tâm', '0870000033', '079860000033'),
(34, N'Phạm Quỳnh Như', 0, '1998-03-11', '0930000034', 'cudan34@ducvutower.demo', 'resident34', N'23 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM', N'Phạm Quốc Dũng', '0880000034', '079980000034'),
(35, N'Hoàng Đức Thịnh', 1, '1990-12-26', '0940000035', 'cudan35@ducvutower.demo', 'resident35', N'71 Lê Văn Việt, TP. Thủ Đức, TP.HCM', N'Hoàng Thu Hà', '0820000035', '079900000035'),
(36, N'Võ Minh Châu', 0, '1995-05-13', '0950000036', 'cudan36@ducvutower.demo', 'resident36', N'39 Nguyễn Duy Trinh, TP. Thủ Đức, TP.HCM', N'Võ Đức Anh', '0830000036', '079950000036'),
(37, N'Đặng Quốc Trung', 1, '1988-04-02', '0960000037', 'cudan37@ducvutower.demo', 'resident37', N'102 Phan Xích Long, Phú Nhuận, TP.HCM', N'Đặng Thị Hạnh', '0840000037', '079880000037'),
(38, N'Bùi Thảo Vy', 0, '2002-09-17', '0970000038', 'cudan38@ducvutower.demo', 'resident38', N'55 Cộng Hòa, Tân Bình, TP.HCM', N'Bùi Văn Sơn', '0850000038', '079020000038'),
(39, N'Đỗ Gia Bảo', 1, '1994-06-29', '0980000039', 'cudan39@ducvutower.demo', 'resident39', N'18 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Đỗ Ngọc Hà', '0860000039', '079940000039'),
(40, N'Hồ Ngọc Trâm', 0, '1997-01-07', '0910000040', 'cudan40@ducvutower.demo', 'resident40', N'210 Lý Thường Kiệt, Quận 10, TP.HCM', N'Hồ Thanh Bình', '0870000040', '079970000040'),
(41, N'Nguyễn Quang Vinh', 1, '1985-08-10', '0920000041', 'cudan41@ducvutower.demo', 'resident41', N'12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'Nguyễn Văn Hùng', '0880000041', '079850000041'),
(42, N'Trần Hà My', 0, '1999-07-19', '0930000042', 'cudan42@ducvutower.demo', 'resident42', N'88 Võ Văn Tần, Quận 3, TP.HCM', N'Trần Thị Lan', '0820000042', '079990000042'),
(43, N'Lê Thanh Phong', 1, '1991-03-05', '0940000043', 'cudan43@ducvutower.demo', 'resident43', N'145 Điện Biên Phủ, Bình Thạnh, TP.HCM', N'Lê Minh Tâm', '0830000043', '079910000043'),
(44, N'Phạm Mai Chi', 0, '1993-11-27', '0950000044', 'cudan44@ducvutower.demo', 'resident44', N'23 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM', N'Phạm Quốc Dũng', '0840000044', '079930000044'),
(45, N'Hoàng Tuấn Anh', 1, '1987-02-16', '0960000045', 'cudan45@ducvutower.demo', 'resident45', N'71 Lê Văn Việt, TP. Thủ Đức, TP.HCM', N'Hoàng Thu Hà', '0850000045', '079870000045'),
(46, N'Võ Khánh Vy', 0, '2000-06-22', '0970000046', 'cudan46@ducvutower.demo', 'resident46', N'39 Nguyễn Duy Trinh, TP. Thủ Đức, TP.HCM', N'Võ Đức Anh', '0860000046', '079000000046'),
(47, N'Đặng Minh Tân', 1, '1996-04-30', '0980000047', 'cudan47@ducvutower.demo', 'resident47', N'102 Phan Xích Long, Phú Nhuận, TP.HCM', N'Đặng Thị Hạnh', '0870000047', '079960000047'),
(48, N'Bùi Ngọc Diệp', 0, '1989-09-09', '0910000048', 'cudan48@ducvutower.demo', 'resident48', N'55 Cộng Hòa, Tân Bình, TP.HCM', N'Bùi Văn Sơn', '0880000048', '079890000048'),
(49, N'Đỗ Quốc Hưng', 1, '1992-12-12', '0920000049', 'cudan49@ducvutower.demo', 'resident49', N'18 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM', N'Đỗ Ngọc Hà', '0820000049', '079920000049'),
(50, N'Hồ Thanh Hương', 0, '1998-08-03', '0930000050', 'cudan50@ducvutower.demo', 'resident50', N'210 Lý Thường Kiệt, Quận 10, TP.HCM', N'Hồ Thanh Bình', '0830000050', '079980000050');

    /* Chon 50 can ho chua co hop dong dang hieu luc. */
    CREATE TABLE #ApartmentMap(Seq INT PRIMARY KEY, ApartmentID INT NOT NULL UNIQUE, ApartmentCode NVARCHAR(50), Area DECIMAL(10,2));
    ;WITH Available AS (
        SELECT a.ApartmentID, a.ApartmentCode, a.Area,
               ROW_NUMBER() OVER(ORDER BY a.ApartmentID) AS rn
        FROM dbo.Apartment a
        WHERE a.StatusID <> @OccupiedRoomStatusID
          AND NOT EXISTS (SELECT 1 FROM dbo.Contract c WHERE c.ApartmentID=a.ApartmentID)
          AND NOT EXISTS (SELECT 1 FROM dbo.MeterReading mr WHERE mr.ApartmentID=a.ApartmentID AND mr.ReadingMonth=9 AND mr.ReadingYear=2026)
    )
    INSERT INTO #ApartmentMap(Seq,ApartmentID,ApartmentCode,Area)
    SELECT rn, ApartmentID, ApartmentCode, Area FROM Available WHERE rn<=50;

    IF (SELECT COUNT(*) FROM #ApartmentMap) < 50
        THROW 51003, N'Khong du 50 can ho trong de gan cho 50 cu dan demo.', 1;

    /* 1) Tai khoan dang nhap cu dan. */
    INSERT dbo.Users(Username,PasswordHash,Email,Phone,Status,LastLogin,CreatedAt)
    SELECT Username, '$2b$10$ELYbrBVfz4wC2gM63uDj4uXvO/zzNplzX3qrs3xr277SJCAjWQOU6', Email, Phone, 1, NULL, DATEADD(DAY,-Seq,'2026-09-23')
    FROM #People;

    INSERT dbo.UserRole(UserID,RoleID,AssignedDate,AssignedBy)
    SELECT u.UserID,@ResidentRoleID,'2026-09-01',@SystemUserID
    FROM #People p JOIN dbo.Users u ON u.Username=p.Username;

    /* 2) Ho so cu dan + CCCD. */
    INSERT dbo.Resident(UserID,FullName,Gender,BirthDate,Phone,Email,Address,Avatar,Status,EmergencyContactName,EmergencyContactPhone)
    SELECT u.UserID,p.FullName,p.Gender,p.BirthDate,p.Phone,p.Email,p.Address,NULL,1,p.EmergencyName,p.EmergencyPhone
    FROM #People p JOIN dbo.Users u ON u.Username=p.Username;

    INSERT dbo.ResidentIdentity(ResidentID,IdentityNumber,FrontImage,BackImage,IssueDate,IssuePlace,ExpiredDate)
    SELECT r.ResidentID,p.IdentityNumber,NULL,NULL,
           DATEFROMPARTS(YEAR(p.BirthDate)+18, MONTH(p.BirthDate), CASE WHEN DAY(p.BirthDate)>28 THEN 28 ELSE DAY(p.BirthDate) END),
           N'Cục Cảnh sát QLHC về TTXH',
           DATEFROMPARTS(YEAR(p.BirthDate)+33, MONTH(p.BirthDate), CASE WHEN DAY(p.BirthDate)>28 THEN 28 ELSE DAY(p.BirthDate) END)
    FROM #People p JOIN dbo.Resident r ON r.Email=p.Email;

    /* 3) Hop dong + quan he cu tru. */
    INSERT dbo.Contract(ApartmentID,OwnerID,ContractNumber,SignDate,StartDate,EndDate,Deposit,Rent,StatusID,CreatedDate,ContractTermMonths,DepositMonths,PaymentCycleMonths,MonthlyBillingDay,SignedContractImage)
    SELECT am.ApartmentID,r.ResidentID,
           CONCAT(N'HD-DEMO-',RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3),N'-',REPLACE(am.ApartmentCode,N' ',N'')),
           DATEADD(DAY,-(25 + p.Seq%15),CAST('2026-09-01' AS DATE)),
           DATEADD(DAY,-(20 + p.Seq%15),CAST('2026-09-01' AS DATE)),
           DATEADD(YEAR,1,DATEADD(DAY,-(20 + p.Seq%15),CAST('2026-09-01' AS DATE))),
           CAST((7500000 + ((p.Seq-1)%5)*250000) * 2 AS DECIMAL(18,2)),
           CAST(7500000 + ((p.Seq-1)%5)*250000 AS DECIMAL(18,2)),
           @ActiveContractStatusID,GETDATE(),12,2,1,10,NULL
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN #ApartmentMap am ON am.Seq=p.Seq;

    INSERT dbo.ContractResident(ContractID,ResidentID,Relationship,MoveInDate,MoveOutDate)
    SELECT c.ContractID,r.ResidentID,N'Chủ hộ',c.StartDate,NULL
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%';

    UPDATE a SET StatusID=@OccupiedRoomStatusID
    FROM dbo.Apartment a JOIN #ApartmentMap am ON am.ApartmentID=a.ApartmentID;

    /* 4) Thiet bi ban giao: 5 thiet bi/can ho. */
    INSERT dbo.ContractEquipment(ContractID,EquipmentName,Category,Brand,Model,Quantity,Location,Specifications,ConditionDescription,EquipmentStatus)
    SELECT c.ContractID,e.EquipmentName,e.Category,e.Brand,e.Model,1,e.Location,e.Specifications,N'Mới bàn giao, đã kiểm tra hoạt động',N'Hoạt động tốt'
    FROM dbo.Contract c
    JOIN #People p ON c.ContractNumber LIKE CONCAT(N'HD-DEMO-',RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3),N'-%')
    CROSS APPLY (VALUES
        (N'Smart TV 4K 55 inch',N'TIVI',N'Samsung',N'UA55CU8000',N'Phòng khách',N'4K UHD, Wi-Fi, điều khiển giọng nói'),
        (N'Tủ lạnh Inverter 322 lít',N'TỦ LẠNH',N'Panasonic',N'NR-BV360QSVN',N'Khu vực bếp',N'Inverter, ngăn đông mềm'),
        (N'Máy lạnh Inverter 1.5 HP',N'MÁY LẠNH',N'Daikin',N'FTKB35XVMV',N'Phòng khách',N'1.5 HP, Inverter, lọc Enzyme Blue'),
        (N'Máy giặt Inverter 10 kg',N'MÁY GIẶT',N'Electrolux',N'EWF1042Q7WB',N'Logia',N'Cửa trước, 10 kg, Inverter'),
        (N'Bếp điện từ đôi',N'THIẾT BỊ BẾP',N'Hafele',N'HC-I772D',N'Khu vực bếp',N'2 vùng nấu, khóa trẻ em')
    ) e(EquipmentName,Category,Brand,Model,Location,Specifications);

    /* Backfill 4 thiet bi co ban cho hop dong CU dang hoat dong nhung chua co thiet bi. */
    INSERT dbo.ContractEquipment(ContractID,EquipmentName,Category,Brand,Model,Quantity,Location,Specifications,ConditionDescription,EquipmentStatus)
    SELECT c.ContractID,e.EquipmentName,e.Category,e.Brand,e.Model,1,e.Location,e.Specifications,N'Thiết bị bàn giao theo hợp đồng',N'Hoạt động tốt'
    FROM dbo.Contract c
    CROSS APPLY (VALUES
        (N'Smart TV 4K 55 inch',N'TIVI',N'Samsung',N'UA55CU8000',N'Phòng khách',N'4K UHD, Wi-Fi'),
        (N'Tủ lạnh Inverter 322 lít',N'TỦ LẠNH',N'Panasonic',N'NR-BV360QSVN',N'Khu vực bếp',N'Inverter, ngăn đông mềm'),
        (N'Máy lạnh Inverter 1.5 HP',N'MÁY LẠNH',N'Daikin',N'FTKB35XVMV',N'Phòng khách',N'Inverter'),
        (N'Máy giặt Inverter 10 kg',N'MÁY GIẶT',N'Electrolux',N'EWF1042Q7WB',N'Logia',N'Cửa trước, 10 kg')
    ) e(EquipmentName,Category,Brand,Model,Location,Specifications)
    WHERE c.StatusID IN (2,5,7)
      AND c.StartDate<='2026-09-23' AND c.EndDate>='2026-09-23'
      AND c.ContractNumber NOT LIKE N'HD-DEMO-%'
      AND NOT EXISTS(SELECT 1 FROM dbo.ContractEquipment ce WHERE ce.ContractID=c.ContractID);

    /* 5) Dang ky dich vu: Wifi cho tat ca + Gym/Ho boi xen ke. */
    INSERT dbo.ServiceRegistration(ContractID,ServiceID,RegisterDate,EndDate,Quantity,Status)
    SELECT c.ContractID,@WifiServiceID,c.StartDate,c.EndDate,1,1
    FROM dbo.Contract c WHERE c.ContractNumber LIKE N'HD-DEMO-%';

    INSERT dbo.ServiceRegistration(ContractID,ServiceID,RegisterDate,EndDate,Quantity,Status)
    SELECT c.ContractID,CASE WHEN p.Seq%2=0 THEN @GymServiceID ELSE @PoolServiceID END,c.StartDate,c.EndDate,1,1
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%';

    /* 6) Xe + cho do + the xe + goi gui xe. Moi cu dan 1 xe. */
    INSERT dbo.Vehicle(ResidentID,PlateNumber,VehicleTypeID,Brand,Color,RegisterDate,Status)
    SELECT r.ResidentID,
           CASE WHEN p.Seq%5=0 THEN CONCAT('51H-',RIGHT('000'+CAST(700+p.Seq AS VARCHAR(3)),3),'.',RIGHT('00'+CAST(p.Seq AS VARCHAR(2)),2))
                ELSE CONCAT('59A1-',RIGHT('000'+CAST(800+p.Seq AS VARCHAR(3)),3),'.',RIGHT('00'+CAST(p.Seq AS VARCHAR(2)),2)) END,
           CASE WHEN p.Seq%5=0 THEN @CarTypeID ELSE @MotorbikeTypeID END,
           CASE WHEN p.Seq%5=0 THEN CASE p.Seq%4 WHEN 0 THEN N'Toyota' WHEN 1 THEN N'VinFast' WHEN 2 THEN N'Hyundai' ELSE N'Kia' END
                ELSE CASE p.Seq%4 WHEN 0 THEN N'Honda' WHEN 1 THEN N'Yamaha' WHEN 2 THEN N'Honda' ELSE N'Piaggio' END END,
           CASE p.Seq%5 WHEN 0 THEN N'Trắng' WHEN 1 THEN N'Đen' WHEN 2 THEN N'Đỏ' WHEN 3 THEN N'Xám' ELSE N'Xanh' END,
           c.StartDate,1
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%';

    INSERT dbo.ParkingSlot(AreaID,SlotNumber,VehicleTypeID,IsOccupied)
    SELECT @ParkingAreaID,CONCAT(CASE WHEN p.Seq%5=0 THEN 'CAR-' ELSE 'MOTO-' END,RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3)),
           CASE WHEN p.Seq%5=0 THEN @CarTypeID ELSE @MotorbikeTypeID END,1
    FROM #People p;

    INSERT dbo.ParkingCard(VehicleID,CardCode,SlotID,IssueDate,ExpiredDate,Status)
    SELECT v.VehicleID,CONCAT('DVT-DEMO-',RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3)),ps.SlotID,c.StartDate,c.EndDate,1
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Vehicle v ON v.ResidentID=r.ResidentID
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.ParkingSlot ps ON ps.AreaID=@ParkingAreaID AND ps.SlotNumber=CONCAT(CASE WHEN p.Seq%5=0 THEN 'CAR-' ELSE 'MOTO-' END,RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3));

    INSERT dbo.ParkingSubscription(VehicleID,ContractID,CardID,StartDate,EndDate,MonthlyFeeSnapshot,Status,CreatedByUserID,CreatedAt,UpdatedAt)
    SELECT v.VehicleID,c.ContractID,pc.CardID,c.StartDate,c.EndDate,vt.MonthlyFee,'ACTIVE',@SystemUserID,SYSDATETIME(),SYSDATETIME()
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Vehicle v ON v.ResidentID=r.ResidentID
    JOIN dbo.VehicleType vt ON vt.VehicleTypeID=v.VehicleTypeID
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.ParkingCard pc ON pc.VehicleID=v.VehicleID;

    /* 7) Cong to + chi so dien nuoc thang 09/2026. */
    INSERT dbo.SmartMeter(ApartmentID,UtilityTypeID,CurrentIndex,LastTickAt,Status,CreatedAt)
    SELECT am.ApartmentID,u.UtilityTypeID,
           CASE WHEN u.UtilityTypeID=@ElectricUtilityID THEN CAST(1200+p.Seq*13 AS DECIMAL(18,3)) ELSE CAST(180+p.Seq*3 AS DECIMAL(18,3)) END,
           SYSDATETIME(),1,SYSDATETIME()
    FROM #People p JOIN #ApartmentMap am ON am.Seq=p.Seq
    CROSS APPLY (VALUES(@ElectricUtilityID),(@WaterUtilityID)) u(UtilityTypeID);

    INSERT dbo.MeterReading(ApartmentID,EmployeeID,UtilityTypeID,ReadingMonth,ReadingYear,OldIndex,NewIndex,ReadingDate)
    SELECT am.ApartmentID,NULL,@ElectricUtilityID,9,2026,
           CAST(1000+p.Seq*10 AS DECIMAL(18,2)),CAST(1000+p.Seq*10+85+(p.Seq%65) AS DECIMAL(18,2)),'2026-09-20'
    FROM #People p JOIN #ApartmentMap am ON am.Seq=p.Seq
    UNION ALL
    SELECT am.ApartmentID,NULL,@WaterUtilityID,9,2026,
           CAST(100+p.Seq*2 AS DECIMAL(18,2)),CAST(100+p.Seq*2+10+(p.Seq%12) AS DECIMAL(18,2)),'2026-09-20'
    FROM #People p JOIN #ApartmentMap am ON am.Seq=p.Seq;

    /* 8) Hoa don thang 09/2026. 30 chua thanh toan, 15 da thanh toan, 5 qua han. */
    INSERT dbo.Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus)
    SELECT c.ContractID,9,2026,
           CASE WHEN p.Seq<=45 THEN CAST('2026-09-20' AS date) ELSE CAST('2026-09-01' AS date) END,
           CASE WHEN p.Seq<=30 THEN CAST('2026-09-28' AS date) WHEN p.Seq<=45 THEN CAST('2026-09-25' AS date) ELSE CAST('2026-09-10' AS date) END,
           0,
           CASE WHEN p.Seq<=30 THEN @InvoiceUnpaidID WHEN p.Seq<=45 THEN @InvoicePaidID ELSE @InvoiceOverdueID END,
           CASE WHEN p.Seq BETWEEN 31 AND 45 THEN 'PAID' ELSE 'WAITING_PAYMENT' END
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%';

    /* Chi tiet tien thue. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'ROOM',CONCAT(N'Tiền thuê căn hộ ',am.ApartmentCode,N' tháng 9/2026'),1,c.Rent,c.Rent,NULL
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.Invoice i ON i.ContractID=c.ContractID AND i.InvoiceMonth=9 AND i.InvoiceYear=2026
    JOIN #ApartmentMap am ON am.Seq=p.Seq;

    /* Wifi. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'SERVICE',N'Phí Wifi tháng 9/2026',1,s.Price,s.Price,NULL
    FROM dbo.Invoice i
    JOIN dbo.Contract c ON c.ContractID=i.ContractID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.Service s ON s.ServiceID=@WifiServiceID;

    /* Gym/ho boi. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'SERVICE',CONCAT(s.ServiceName,N' tháng 9/2026'),1,s.Price,s.Price,NULL
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.Invoice i ON i.ContractID=c.ContractID AND i.InvoiceMonth=9 AND i.InvoiceYear=2026
    JOIN dbo.Service s ON s.ServiceID=CASE WHEN p.Seq%2=0 THEN @GymServiceID ELSE @PoolServiceID END;

    /* Phi gui xe. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'PARKING',CONCAT(N'Phí gửi ',vt.TypeName,N' tháng 9/2026'),1,ps.MonthlyFeeSnapshot,ps.MonthlyFeeSnapshot,ps.ParkingSubscriptionID
    FROM dbo.Invoice i
    JOIN dbo.Contract c ON c.ContractID=i.ContractID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.ParkingSubscription ps ON ps.ContractID=c.ContractID AND ps.Status='ACTIVE'
    JOIN dbo.Vehicle v ON v.VehicleID=ps.VehicleID
    JOIN dbo.VehicleType vt ON vt.VehicleTypeID=v.VehicleTypeID;

    /* Dien. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'ELECTRIC',CONCAT(N'Tiền điện tháng 9/2026: ',CAST(mr.NewIndex-mr.OldIndex AS INT),N' kWh'),
           mr.NewIndex-mr.OldIndex,2500,(mr.NewIndex-mr.OldIndex)*2500,NULL
    FROM dbo.Invoice i
    JOIN dbo.Contract c ON c.ContractID=i.ContractID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.MeterReading mr ON mr.ApartmentID=c.ApartmentID AND mr.UtilityTypeID=@ElectricUtilityID AND mr.ReadingMonth=9 AND mr.ReadingYear=2026;

    /* Nuoc. */
    INSERT dbo.InvoiceDetail(InvoiceID,ChargeType,Description,Quantity,UnitPrice,Amount,ParkingSubscriptionID)
    SELECT i.InvoiceID,'WATER',CONCAT(N'Tiền nước tháng 9/2026: ',CAST(mr.NewIndex-mr.OldIndex AS INT),N' m3'),
           mr.NewIndex-mr.OldIndex,12000,(mr.NewIndex-mr.OldIndex)*12000,NULL
    FROM dbo.Invoice i
    JOIN dbo.Contract c ON c.ContractID=i.ContractID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.MeterReading mr ON mr.ApartmentID=c.ApartmentID AND mr.UtilityTypeID=@WaterUtilityID AND mr.ReadingMonth=9 AND mr.ReadingYear=2026;

    UPDATE i SET TotalAmount=x.TotalAmount
    FROM dbo.Invoice i
    JOIN (SELECT InvoiceID,SUM(Amount) TotalAmount FROM dbo.InvoiceDetail GROUP BY InvoiceID) x ON x.InvoiceID=i.InvoiceID
    JOIN dbo.Contract c ON c.ContractID=i.ContractID
    WHERE c.ContractNumber LIKE N'HD-DEMO-%' AND i.InvoiceMonth=9 AND i.InvoiceYear=2026;

    /* Thanh toan thanh cong cho 15 hoa don da thanh toan. */
    INSERT dbo.Payment(InvoiceID,MethodID,PaymentDate,Amount,TransactionCode,StatusID)
    SELECT i.InvoiceID,@BankMethodID,DATEADD(DAY,p.Seq%5,CAST('2026-09-20' AS DATETIME)),i.TotalAmount,
           CONCAT('DVT-DEMO-PAY-',RIGHT('000'+CAST(p.Seq AS VARCHAR(3)),3)),@PaymentSuccessID
    FROM #People p
    JOIN dbo.Resident r ON r.Email=p.Email
    JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
    JOIN dbo.Invoice i ON i.ContractID=c.ContractID AND i.InvoiceMonth=9 AND i.InvoiceYear=2026
    WHERE p.Seq BETWEEN 31 AND 45;

    /* 9) Mot so ticket/feedback de du lieu trong giong van hanh that. */
    IF @MaintenanceNewID IS NOT NULL
    BEGIN
        INSERT dbo.MaintenanceRequest(ResidentID,ApartmentID,Title,Description,RequestDate,AssignedEmployeeID,StatusID)
        SELECT r.ResidentID,c.ApartmentID,
               CASE p.Seq%4 WHEN 0 THEN N'Kiểm tra máy lạnh' WHEN 1 THEN N'Kiểm tra vòi nước' WHEN 2 THEN N'Đèn hành lang trước căn hộ' ELSE N'Kiểm tra ổ cắm điện' END,
               CASE p.Seq%4 WHEN 0 THEN N'Máy lạnh làm mát chậm, đề nghị kỹ thuật kiểm tra.' WHEN 1 THEN N'Vòi nước có dấu hiệu rò nhẹ, cần kiểm tra.' WHEN 2 THEN N'Đèn khu vực trước căn hộ chập chờn.' ELSE N'Một ổ cắm trong phòng khách hoạt động không ổn định.' END,
               DATEADD(DAY,-(p.Seq%10),GETDATE()),NULL,@MaintenanceNewID
        FROM #People p
        JOIN dbo.Resident r ON r.Email=p.Email
        JOIN dbo.Contract c ON c.OwnerID=r.ResidentID AND c.ContractNumber LIKE N'HD-DEMO-%'
        WHERE p.Seq%5=0;
    END;

    INSERT dbo.Feedback(ResidentID,Title,Content,Rating,Reply,CreatedDate)
    SELECT r.ResidentID,
           CASE p.Seq%3 WHEN 0 THEN N'Góp ý vệ sinh khu chung' WHEN 1 THEN N'Đánh giá dịch vụ lễ tân' ELSE N'Góp ý khu vực gửi xe' END,
           CASE p.Seq%3 WHEN 0 THEN N'Khu vực chung sạch sẽ, mong duy trì lịch vệ sinh hiện tại.' WHEN 1 THEN N'Nhân viên hỗ trợ nhanh và hướng dẫn rõ ràng.' ELSE N'Bãi xe vận hành ổn định, đề nghị bổ sung thêm biển hướng dẫn.' END,
           4 + (p.Seq%2),NULL,DATEADD(DAY,-(p.Seq%12),GETDATE())
    FROM #People p JOIN dbo.Resident r ON r.Email=p.Email
    WHERE p.Seq%4=0;

    COMMIT TRANSACTION;

    PRINT N'============================================';
    PRINT CONCAT(N'Azure SQL database: ', DB_NAME());
    PRINT N'ĐÃ THÊM THÀNH CÔNG 50 BỘ DỮ LIỆU CƯ DÂN.';
    PRINT N'Tài khoản: resident01 ... resident50';
    PRINT N'Mật khẩu chung: Resident@123';
    PRINT N'============================================';

    SELECT COUNT(*) AS DemoResidents FROM dbo.Resident WHERE Email LIKE '%@ducvutower.demo';
    SELECT COUNT(*) AS DemoContracts FROM dbo.Contract WHERE ContractNumber LIKE N'HD-DEMO-%';
    SELECT COUNT(*) AS DemoEquipment FROM dbo.ContractEquipment ce JOIN dbo.Contract c ON c.ContractID=ce.ContractID WHERE c.ContractNumber LIKE N'HD-DEMO-%';
    SELECT COUNT(*) AS DemoVehicles FROM dbo.Vehicle v JOIN dbo.Resident r ON r.ResidentID=v.ResidentID WHERE r.Email LIKE '%@ducvutower.demo';
    SELECT COUNT(*) AS DemoServiceRegistrations FROM dbo.ServiceRegistration sr JOIN dbo.Contract c ON c.ContractID=sr.ContractID WHERE c.ContractNumber LIKE N'HD-DEMO-%';
    SELECT COUNT(*) AS DemoInvoices FROM dbo.Invoice i JOIN dbo.Contract c ON c.ContractID=i.ContractID WHERE c.ContractNumber LIKE N'HD-DEMO-%';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @Err NVARCHAR(2048) = LEFT(CONCAT(N'Lỗi tạo dữ liệu demo Azure SQL: ', ERROR_MESSAGE()), 2048);
    THROW 51099, @Err, 1;
END CATCH;
