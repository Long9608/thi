USE ApartmentManagement;
GO

/*
  Sửa dữ liệu của phiên bản cũ: khi tạo tài khoản có role RESIDENT,
  API từng tạo Employee nhưng không cập nhật Resident.UserID.
  Chỉ ghép các cặp có duy nhất một ứng viên và trùng họ tên cùng SĐT/email,
  nên không tự động liên kết dữ liệu mơ hồ.
*/
BEGIN TRANSACTION;

BEGIN TRY
    DECLARE @Links TABLE (
        EmployeeID INT PRIMARY KEY,
        UserID INT NOT NULL,
        ResidentID INT NOT NULL UNIQUE
    );

    ;WITH Candidates AS (
        SELECT
            e.EmployeeID,
            e.UserID,
            r.ResidentID,
            COUNT(*) OVER (PARTITION BY e.UserID) AS UserMatches,
            COUNT(*) OVER (PARTITION BY r.ResidentID) AS ResidentMatches
        FROM dbo.Employee e
        JOIN dbo.Users u ON u.UserID = e.UserID AND u.Status = 1
        JOIN dbo.Resident r ON r.UserID IS NULL AND r.Status = 1
            AND r.FullName = e.FullName
            AND (
                (NULLIF(LTRIM(RTRIM(r.Phone)), '') IS NOT NULL
                    AND NULLIF(LTRIM(RTRIM(r.Phone)), '') = NULLIF(LTRIM(RTRIM(e.Phone)), ''))
                OR
                (NULLIF(LTRIM(RTRIM(r.Email)), '') IS NOT NULL
                    AND NULLIF(LTRIM(RTRIM(r.Email)), '') = NULLIF(LTRIM(RTRIM(e.Email)), ''))
            )
        WHERE EXISTS (
            SELECT 1
            FROM dbo.UserRole ur
            JOIN dbo.Role ro ON ro.RoleID = ur.RoleID
            WHERE ur.UserID = u.UserID AND ro.RoleCode = 'RESIDENT'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM dbo.UserRole ur
            JOIN dbo.Role ro ON ro.RoleID = ur.RoleID
            WHERE ur.UserID = u.UserID AND ro.RoleCode <> 'RESIDENT'
        )
    )
    INSERT INTO @Links (EmployeeID, UserID, ResidentID)
    SELECT EmployeeID, UserID, ResidentID
    FROM Candidates
    WHERE UserMatches = 1 AND ResidentMatches = 1;

    UPDATE r
    SET UserID = l.UserID
    FROM dbo.Resident r
    JOIN @Links l ON l.ResidentID = r.ResidentID
    WHERE r.UserID IS NULL;

    -- Bản ghi Employee là dữ liệu phát sinh sai, không phải hồ sơ nhân viên.
    DELETE e
    FROM dbo.Employee e
    JOIN @Links l ON l.EmployeeID = e.EmployeeID;

    SELECT EmployeeID, UserID, ResidentID
    FROM @Links;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
