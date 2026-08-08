USE ApartmentManagement;
GO

-- 1) Thêm các trạng thái nếu chưa có
IF NOT EXISTS (SELECT 1 FROM RoomStatus WHERE StatusName = N'Còn trống')
  INSERT INTO RoomStatus (StatusName) VALUES (N'Còn trống');

IF NOT EXISTS (SELECT 1 FROM RoomStatus WHERE StatusName = N'Đang ở')
  INSERT INTO RoomStatus (StatusName) VALUES (N'Đang ở');

IF NOT EXISTS (SELECT 1 FROM RoomStatus WHERE StatusName = N'Bảo trì')
  INSERT INTO RoomStatus (StatusName) VALUES (N'Bảo trì');

IF NOT EXISTS (SELECT 1 FROM ContractStatus WHERE StatusName = N'Đang hiệu lực')
  INSERT INTO ContractStatus (StatusName) VALUES (N'Đang hiệu lực');

IF NOT EXISTS (SELECT 1 FROM ContractStatus WHERE StatusName = N'Sắp hết hạn')
  INSERT INTO ContractStatus (StatusName) VALUES (N'Sắp hết hạn');

IF NOT EXISTS (SELECT 1 FROM ContractStatus WHERE StatusName = N'Đã hết hạn')
  INSERT INTO ContractStatus (StatusName) VALUES (N'Đã hết hạn');

IF NOT EXISTS (SELECT 1 FROM ContractStatus WHERE StatusName = N'Chưa ký')
  INSERT INTO ContractStatus (StatusName) VALUES (N'Chưa ký');

-- 2) Đảm bảo có một khu vực mặc định
IF NOT EXISTS (SELECT 1 FROM ApartmentArea WHERE AreaName = N'Khu mặc định')
BEGIN
  INSERT INTO ApartmentArea (AreaName, Address, Description)
  VALUES (N'Khu mặc định', N'Địa chỉ mặc định', N'Khu tạo sẵn cho dev');
END

-- 3) Thêm building mẫu nếu chưa có
DECLARE @AreaID INT = (SELECT TOP 1 AreaID FROM ApartmentArea WHERE AreaName = N'Khu mặc định');
IF @AreaID IS NULL
  THROW 51000, 'ApartmentArea not found', 1;

IF NOT EXISTS (SELECT 1 FROM Building WHERE AreaID = @AreaID AND BuildingName = N'Block A')
BEGIN
  INSERT INTO Building (AreaID, BuildingName, NumberOfFloors)
  VALUES (@AreaID, N'Block A', 5);
END

DECLARE @BuildingID INT = (SELECT TOP 1 BuildingID FROM Building WHERE AreaID = @AreaID AND BuildingName = N'Block A');

-- 4) Tạo các tầng (1..5) nếu chưa có
DECLARE @floor INT = 1;
WHILE @floor <= 5
BEGIN
  IF NOT EXISTS (SELECT 1 FROM Floor WHERE BuildingID = @BuildingID AND FloorNumber = @floor)
    INSERT INTO Floor (BuildingID, FloorNumber) VALUES (@BuildingID, @floor);
  SET @floor = @floor + 1;
END

-- 5) Tạo vài căn hộ mẫu trên mỗi tầng (mỗi tầng 3 căn) nếu chưa có
DECLARE @StatusVacant INT = (SELECT TOP 1 StatusID FROM RoomStatus WHERE StatusName = N'Còn trống');
IF @StatusVacant IS NULL
  RAISERROR('Missing RoomStatus "Còn trống".', 16, 1);

DECLARE curFloors CURSOR FOR SELECT FloorID, FloorNumber FROM Floor WHERE BuildingID = @BuildingID ORDER BY FloorNumber;
OPEN curFloors;
DECLARE @FloorID INT, @FloorNumber INT;
FETCH NEXT FROM curFloors INTO @FloorID, @FloorNumber;
WHILE @@FETCH_STATUS = 0
BEGIN
  DECLARE @i INT = 1;
  WHILE @i <= 3
  BEGIN
    DECLARE @code VARCHAR(20) = CONCAT('A-', RIGHT('0' + CAST(@FloorNumber AS VARCHAR(2)), 2), RIGHT('0' + CAST(@i AS VARCHAR(2)), 2));
    IF NOT EXISTS (SELECT 1 FROM Apartment WHERE ApartmentCode = @code)
    BEGIN
      INSERT INTO Apartment (FloorID, ApartmentCode, Area, StatusID)
      VALUES (@FloorID, @code, 45.0, @StatusVacant);
    END
    SET @i = @i + 1;
  END

  FETCH NEXT FROM curFloors INTO @FloorID, @FloorNumber;
END
CLOSE curFloors;
DEALLOCATE curFloors;

-- 6) Đồng bộ lại Apartment.Status nếu có bản ghi không hợp lệ
UPDATE a
SET StatusID = @StatusVacant
FROM Apartment a
LEFT JOIN RoomStatus rs ON a.StatusID = rs.StatusID
WHERE rs.StatusID IS NULL;

PRINT 'Seed hoàn tất: statuses, area, building, floors, sample apartments đã được tạo.';
GO
