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
                END AS IsReceived
            FROM Notification n
            LEFT JOIN Employee e ON n.SenderID = e.EmployeeID
            LEFT JOIN NotificationReceiver nr ON n.NotificationID = nr.NotificationID 
                AND nr.UserID = @UserID
            WHERE 1=1
        `;

        const request = pool.request();
        request.input('UserID', sql.Int, req.userId);

        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Notification n
            WHERE 1=1
        `;

        if (targetScope) {
            query += ` AND n.TargetScope = @TargetScope OR n.TargetScope = 'ALL'`;
            countQuery += ` AND n.TargetScope = @TargetScope OR n.TargetScope = 'ALL'`;
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
    try {
        const { 
            title,
            content,
            targetScope,
            targetUserIds,
            targetBuildingIds
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        const pool = await getPool();

        // Get sender info
        const employeeResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT EmployeeID FROM Employee WHERE UserID = @UserID');

        const senderId = employeeResult.recordset[0]?.EmployeeID || null;

        // Create notification
        const result = await pool.request()
            .input('SenderID', sql.Int, senderId)
            .input('Title', sql.NVarChar, title)
            .input('Content', sql.NVarChar, content)
            .input('TargetScope', sql.VarChar, targetScope || 'ALL')
            .query(`
                INSERT INTO Notification (SenderID, Title, Content, CreatedDate, TargetScope)
                OUTPUT INSERTED.NotificationID
                VALUES (@SenderID, @Title, @Content, GETDATE(), @TargetScope)
            `);

        const notificationId = result.recordset[0].NotificationID;

        // Determine recipients
        let userList = [];

        if (targetScope === 'ALL') {
            // Send to all users
            const usersResult = await pool.request()
                .query('SELECT UserID FROM Users WHERE Status = 1');
            userList = usersResult.recordset.map(u => u.UserID);
        } else if (targetScope === 'BUILDING' && targetBuildingIds) {
            // Send to residents in specific buildings
            const buildingIds = targetBuildingIds.join(',');
            const usersResult = await pool.request()
                .query(`
                    SELECT DISTINCT u.UserID 
                    FROM Users u
                    INNER JOIN Resident r ON u.UserID = r.UserID
                    INNER JOIN ContractResident cr ON r.ResidentID = cr.ResidentID
                    INNER JOIN Contract c ON cr.ContractID = c.ContractID
                    INNER JOIN Apartment a ON c.ApartmentID = a.ApartmentID
                    INNER JOIN Floor f ON a.FloorID = f.FloorID
                    WHERE f.BuildingID IN (${buildingIds}) AND u.Status = 1
                `);
            userList = usersResult.recordset.map(u => u.UserID);
        } else if (targetScope === 'USER' && targetUserIds) {
            // Send to specific users
            userList = targetUserIds;
        }

        // Add notification receivers
        for (const userId of userList) {
            await pool.request()
                .input('NotificationID', sql.Int, notificationId)
                .input('UserID', sql.Int, userId)
                .query(`
                    INSERT INTO NotificationReceiver (NotificationID, UserID, IsRead)
                    VALUES (@NotificationID, @UserID, 0)
                `);
        }

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: { 
                notificationId,
                recipientsCount: userList.length 
            }
        });

    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error.message
        });
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