const { getAccessScope } = require('../utils/accessScope');
const { getPool, sql } = require('../config/db');

exports.getAllNotifications = async (req, res) => {
    try {
        const { 
            targetScope,
            isRead,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const all = getAccessScope(req, { viewAll: 'NOTIFICATION_VIEW_ALL', viewOwn: 'NOTIFICATION_VIEW_OWN' }) === 'all';
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                n.NotificationID,
                n.Title,
                n.Content,
                n.CreatedDate,
                n.TargetScope,
                e.FullName AS SenderName,
                nr.IsRead,
                nr.ReadDate,
                CASE 
                    WHEN nr.ReceiverID IS NOT NULL THEN 1 
                    ELSE 0 
                END AS IsReceived,
                (
                    SELECT COUNT(*) 
                    FROM NotificationReceiver nr2 
                    WHERE nr2.NotificationID = n.NotificationID
                ) AS RecipientsCount
            FROM Notification n
            LEFT JOIN NotificationReceiver nr ON n.NotificationID = nr.NotificationID AND nr.UserID=@UserID
            LEFT JOIN Employee e ON n.SenderID = e.EmployeeID
            WHERE ${all ? '1=1' : 'nr.UserID = @UserID'}
        `;

        const request = pool.request();
        request.input('UserID', sql.Int, req.userId);

        let countQuery = `
            SELECT COUNT(*) as total
            FROM Notification n
            LEFT JOIN NotificationReceiver nr ON n.NotificationID = nr.NotificationID AND nr.UserID=@UserID
            WHERE ${all ? '1=1' : 'nr.UserID = @UserID'}
        `;

        if (targetScope) {
            query += ` AND (n.TargetScope = @TargetScope OR n.TargetScope = 'ALL')`;
            countQuery += ` AND (n.TargetScope = @TargetScope OR n.TargetScope = 'ALL')`;
            request.input('TargetScope', sql.VarChar, targetScope);
        }

        if (isRead !== undefined) {
            query += ` AND (nr.IsRead = @IsRead OR (nr.IsRead IS NULL AND @IsRead = 0))`;
            countQuery += ` AND (nr.IsRead = @IsRead OR (nr.IsRead IS NULL AND @IsRead = 0))`;
            request.input('IsRead', sql.Bit, parseInt(isRead));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY n.CreatedDate DESC
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, parseInt(offset));
        request.input('Limit', sql.Int, parseInt(limit));

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

exports.getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const all = getAccessScope(req, { viewAll: 'NOTIFICATION_VIEW_ALL', viewOwn: 'NOTIFICATION_VIEW_OWN' }) === 'all';

        const result = await pool.request()
            .input('NotificationID', sql.Int, id)
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT 
                    n.*,
                    e.FullName AS SenderName,
                    nr.IsRead,
                    nr.ReadDate
                FROM Notification n
                LEFT JOIN Employee e ON n.SenderID = e.EmployeeID
                LEFT JOIN NotificationReceiver nr ON n.NotificationID = nr.NotificationID
                    AND nr.UserID = @UserID
                WHERE n.NotificationID = @NotificationID
                  ${all ? '' : 'AND nr.UserID = @UserID'}
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Mark as read if not already
        const notification = result.recordset[0];
        if (!notification.IsRead) {
            await pool.request()
                .input('NotificationID', sql.Int, id)
                .input('UserID', sql.Int, req.userId)
                .query(`
                    UPDATE NotificationReceiver 
                    SET IsRead = 1, ReadDate = GETDATE()
                    WHERE NotificationID = @NotificationID AND UserID = @UserID
                `);
        }

        res.json({
            success: true,
            data: notification
        });

    } catch (error) {
        console.error('Get notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification',
            error: error.message
        });
    }
};

exports.createNotification = async (req, res) => {
    const { title, content, targetScope = 'ALL', targetUserIds, targetBuildingIds } = req.body;
    if (req.body.scheduledDate || req.body.scheduledAt) return res.status(409).json({ success: false, message: 'Chưa có cơ chế lưu lịch gửi. Thông báo chưa được gửi.' });
    if (!title || !content || !['ALL', 'BUILDING', 'USER'].includes(targetScope)) return res.status(400).json({ success: false, message: 'Tiêu đề, nội dung hoặc đối tượng nhận không hợp lệ' });
    const ids = targetScope === 'USER' ? targetUserIds : targetScope === 'BUILDING' ? targetBuildingIds : [];
    if (!Array.isArray(ids) || (targetScope !== 'ALL' && !ids.length) || ids.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) return res.status(400).json({ success: false, message: 'Danh sách người nhận không hợp lệ' });
    let transaction;
    try {
        transaction = new sql.Transaction(await getPool());
        await transaction.begin();
        const request = transaction.request().input('Title', sql.NVarChar, title).input('Content', sql.NVarChar, content)
            .input('TargetScope', sql.VarChar, targetScope).input('UserID', sql.Int, req.user.UserID)
            .input('TargetIDs', sql.NVarChar(sql.MAX), JSON.stringify([...new Set(ids.map(Number))]));
        const result = await request.query(`
            DECLARE @NotificationID int;
            INSERT INTO Notification (SenderID, Title, Content, CreatedDate, TargetScope)
            VALUES ((SELECT TOP 1 EmployeeID FROM Employee WHERE UserID=@UserID AND Status=1), @Title, @Content, GETDATE(), @TargetScope);
            SET @NotificationID = SCOPE_IDENTITY();
            INSERT INTO NotificationReceiver (NotificationID, UserID, IsRead)
            SELECT @NotificationID, u.UserID, 0 FROM Users u
            WHERE u.Status=1 AND (
                @TargetScope='ALL'
                OR (@TargetScope='USER' AND u.UserID IN (SELECT CONVERT(int, value) FROM OPENJSON(@TargetIDs)))
                OR (@TargetScope='BUILDING' AND EXISTS (
                    SELECT 1 FROM Resident r
                    JOIN Contract c ON c.OwnerID=r.ResidentID OR EXISTS (
                        SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=r.ResidentID
                        AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date))
                        AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date)))
                    JOIN Apartment a ON a.ApartmentID=c.ApartmentID JOIN Floor f ON f.FloorID=a.FloorID
                    WHERE r.UserID=u.UserID AND r.Status=1 AND c.StatusID IN (2,5)
                      AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate
                      AND f.BuildingID IN (SELECT CONVERT(int, value) FROM OPENJSON(@TargetIDs))
                ))
            );
            SELECT @NotificationID AS notificationId, COUNT(*) AS recipientsCount FROM NotificationReceiver WHERE NotificationID=@NotificationID;
        `);
        await transaction.commit();
        res.status(201).json({ success: true, message: 'Notification created successfully', data: result.recordset[0] });
    } catch (error) {
        if (transaction) { try { await transaction.rollback(); } catch {} }
        console.error('Create notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to create notification' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('NotificationID', sql.Int, id)
            .input('UserID', sql.Int, req.userId)
            .query(`
                UPDATE NotificationReceiver 
                SET IsRead = 1, ReadDate = GETDATE()
                WHERE NotificationID = @NotificationID AND UserID = @UserID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found for this user'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const pool = await getPool();

        await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                UPDATE NotificationReceiver 
                SET IsRead = 1, ReadDate = GETDATE()
                WHERE UserID = @UserID AND IsRead = 0
            `);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if notification exists
        const checkResult = await pool.request()
            .input('NotificationID', sql.Int, id)
            .query('SELECT NotificationID FROM Notification WHERE NotificationID = @NotificationID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Delete notification (cascade will handle receivers)
        await pool.request()
            .input('NotificationID', sql.Int, id)
            .query('DELETE FROM Notification WHERE NotificationID = @NotificationID');

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query(`
                SELECT COUNT(*) as unreadCount
                FROM NotificationReceiver
                WHERE UserID = @UserID AND IsRead = 0
            `);

        res.json({
            success: true,
            data: {
                unreadCount: result.recordset[0].unreadCount
            }
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message
        });
    }
};
