USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'Bắt đầu loại bỏ tài khoản đăng nhập của cư dân.';

    DECLARE @KeepUserID INT;
    SELECT TOP 1 @KeepUserID = UserID
    FROM dbo.Users
    WHERE Username = 'admin'
    ORDER BY UserID;

    DECLARE @ResidentUsers TABLE (UserID INT PRIMARY KEY);

    ------------------------------------------------------------
    -- Gom các user là tài khoản cư dân:
    -- 1. User đang được Resident.UserID trỏ tới.
    -- 2. User có role RESIDENT.
    -- Không đụng admin và không đụng user nhân viên.
    ------------------------------------------------------------
    INSERT INTO @ResidentUsers (UserID)
    SELECT DISTINCT r.UserID
    FROM dbo.Resident r
    WHERE r.UserID IS NOT NULL
      AND (@KeepUserID IS NULL OR r.UserID <> @KeepUserID)
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.Employee e
          WHERE e.UserID = r.UserID
      );

    INSERT INTO @ResidentUsers (UserID)
    SELECT DISTINCT ur.UserID
    FROM dbo.UserRole ur
    JOIN dbo.Role ro ON ro.RoleID = ur.RoleID
    WHERE ro.RoleCode = 'RESIDENT'
      AND (@KeepUserID IS NULL OR ur.UserID <> @KeepUserID)
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.Employee e
          WHERE e.UserID = ur.UserID
      )
      AND NOT EXISTS (
          SELECT 1
          FROM @ResidentUsers ru
          WHERE ru.UserID = ur.UserID
      );

    ------------------------------------------------------------
    -- Cư dân không còn tài khoản đăng nhập.
    -- Giữ cột UserID nullable để không làm gãy các màn cũ đang SELECT,
    -- nhưng từ giờ giá trị luôn NULL cho cư dân.
    ------------------------------------------------------------
    IF COL_LENGTH('dbo.Resident', 'UserID') IS NOT NULL
       AND COLUMNPROPERTY(OBJECT_ID('dbo.Resident'), 'UserID', 'AllowsNull') = 0
    BEGIN
        ALTER TABLE dbo.Resident ALTER COLUMN UserID INT NULL;
    END

    UPDATE dbo.Resident
    SET UserID = NULL
    WHERE UserID IN (SELECT UserID FROM @ResidentUsers);

    ------------------------------------------------------------
    -- Xóa dữ liệu phụ thuộc của user cư dân, rồi xóa user.
    ------------------------------------------------------------
    DELETE FROM dbo.NotificationReceiver
    WHERE UserID IN (SELECT UserID FROM @ResidentUsers);

    DELETE FROM dbo.AuditLog
    WHERE UserID IN (SELECT UserID FROM @ResidentUsers);

    DELETE FROM dbo.UserRole
    WHERE UserID IN (SELECT UserID FROM @ResidentUsers);

    DELETE FROM dbo.Users
    WHERE UserID IN (SELECT UserID FROM @ResidentUsers);

    SELECT
        (SELECT COUNT(*) FROM dbo.Resident WHERE UserID IS NOT NULL) AS ResidentsStillLinkedToUsers,
        (
            SELECT COUNT(*)
            FROM dbo.Users u
            JOIN dbo.UserRole ur ON ur.UserID = u.UserID
            JOIN dbo.Role ro ON ro.RoleID = ur.RoleID
            WHERE ro.RoleCode = 'RESIDENT'
        ) AS ResidentLoginUsersLeft,
        (SELECT COUNT(*) FROM dbo.Users WHERE Username = 'admin') AS AdminUsersLeft;

    COMMIT TRANSACTION;
    PRINT N'Hoàn tất: cư dân không còn tài khoản đăng nhập.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    SELECT
        ERROR_NUMBER() AS ErrorNumber,
        ERROR_MESSAGE() AS ErrorMessage,
        ERROR_LINE() AS ErrorLine;

    THROW;
END CATCH;
GO
