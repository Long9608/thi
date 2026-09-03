USE ApartmentManagement;
GO

BEGIN TRANSACTION;

BEGIN TRY
    DELETE rp
    FROM dbo.RolePermission rp
    JOIN dbo.Permission p ON p.PermissionID = rp.PermissionID
    WHERE p.PermissionCode IN (
        'MENU_PAYMENTS_VIEW',
        'MENU_DEBTS_VIEW',
        'MENU_FEE_COLLECTION_VIEW',
        'MENU_REVENUE_VIEW'
    );

    DELETE FROM dbo.Permission
    WHERE PermissionCode IN (
        'MENU_PAYMENTS_VIEW',
        'MENU_DEBTS_VIEW',
        'MENU_FEE_COLLECTION_VIEW',
        'MENU_REVENUE_VIEW'
    );

    IF NOT EXISTS (SELECT 1 FROM dbo.Permission WHERE PermissionCode = 'MENU_FEES_VIEW')
    BEGIN
        INSERT INTO dbo.Permission (ModuleID, PermissionCode, PermissionName, Description)
        VALUES (6, 'MENU_FEES_VIEW', N'Xem menu: fees', N'Quyền xem độc lập cho trang hóa đơn');
    END

    INSERT INTO dbo.RolePermission (RoleID, PermissionID, IsGranted, CreatedAt)
    SELECT r.RoleID, p.PermissionID, 1, GETDATE()
    FROM dbo.Role r
    JOIN dbo.Permission p ON p.PermissionCode = 'MENU_FEES_VIEW'
    WHERE r.RoleCode = 'ADMIN'
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.RolePermission rp
          WHERE rp.RoleID = r.RoleID
            AND rp.PermissionID = p.PermissionID
      );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
