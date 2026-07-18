const { getPool, sql } = require('../config/db');

exports.getAllTickets = async (req, res) => {
    try {
        const { 
            statusId,
            residentId,
            assignedEmployeeId,
            fromDate,
            toDate,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                mr.RequestID,
                mr.Title,
                mr.Description,
                mr.RequestDate,
                mr.StatusID,
                ms.StatusName AS Status,
                r.FullName AS ResidentName,
                r.Phone AS ResidentPhone,
                a.ApartmentCode,
                e.FullName AS AssignedEmployeeName,
                DATEDIFF(DAY, mr.RequestDate, GETDATE()) AS DaysPending
            FROM MaintenanceRequest mr
            INNER JOIN Resident r ON mr.ResidentID = r.ResidentID
            INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            LEFT JOIN Employee e ON mr.AssignedEmployeeID = e.EmployeeID
            INNER JOIN MaintenanceStatus ms ON mr.StatusID = ms.StatusID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM MaintenanceRequest mr
            WHERE 1=1
        `;

        if (statusId) {
            query += ` AND mr.StatusID = @StatusID`;
            countQuery += ` AND mr.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        if (residentId) {
            query += ` AND mr.ResidentID = @ResidentID`;
            countQuery += ` AND mr.ResidentID = @ResidentID`;
            request.input('ResidentID', sql.Int, parseInt(residentId));
        }

        if (assignedEmployeeId) {
            query += ` AND mr.AssignedEmployeeID = @AssignedEmployeeID`;
            countQuery += ` AND mr.AssignedEmployeeID = @AssignedEmployeeID`;
            request.input('AssignedEmployeeID', sql.Int, parseInt(assignedEmployeeId));
        }

        if (fromDate) {
            query += ` AND mr.RequestDate >= @FromDate`;
            countQuery += ` AND mr.RequestDate >= @FromDate`;
            request.input('FromDate', sql.Date, fromDate);
        }

        if (toDate) {
            query += ` AND mr.RequestDate <= @ToDate`;
            countQuery += ` AND mr.RequestDate <= @ToDate`;
            request.input('ToDate', sql.Date, toDate);
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY 
                CASE 
                    WHEN mr.StatusID = 1 THEN 1
                    WHEN mr.StatusID = 2 THEN 2
                    ELSE 3
                END,
                mr.RequestDate DESC
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
        console.error('Get tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets',
            error: error.message
        });
    }
};

exports.getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('RequestID', sql.Int, id)
            .query(`
                SELECT 
                    mr.*,
                    ms.StatusName AS Status,
                    r.FullName AS ResidentName,
                    r.Phone AS ResidentPhone,
                    r.Email AS ResidentEmail,
                    a.ApartmentCode,
                    a.Area,
                    e.FullName AS AssignedEmployeeName,
                    e.Phone AS AssignedEmployeePhone
                FROM MaintenanceRequest mr
                INNER JOIN Resident r ON mr.ResidentID = r.ResidentID
                INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
                LEFT JOIN Employee e ON mr.AssignedEmployeeID = e.EmployeeID
                INNER JOIN MaintenanceStatus ms ON mr.StatusID = ms.StatusID
                WHERE mr.RequestID = @RequestID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket',
            error: error.message
        });
    }
};

exports.createTicket = async (req, res) => {
    try {
        const { 
            apartmentId,
            title,
            description,
            statusId
        } = req.body;

        if (!apartmentId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Apartment ID and title are required'
            });
        }

        const pool = await getPool();

        // Get resident ID from user
        const residentResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT ResidentID FROM Resident WHERE UserID = @UserID');

        if (!residentResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found for this user'
            });
        }

        const residentId = residentResult.recordset[0].ResidentID;

        const result = await pool.request()
            .input('ResidentID', sql.Int, residentId)
            .input('ApartmentID', sql.Int, apartmentId)
            .input('Title', sql.NVarChar, title)
            .input('Description', sql.NVarChar, description || null)
            .input('StatusID', sql.Int, statusId || 1)
            .query(`
                INSERT INTO MaintenanceRequest (
                    ResidentID, ApartmentID, Title, Description, RequestDate, StatusID
                )
                OUTPUT INSERTED.RequestID
                VALUES (
                    @ResidentID, @ApartmentID, @Title, @Description, GETDATE(), @StatusID
                )
            `);

        const ticketId = result.recordset[0].RequestID;

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: { ticketId }
        });

    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket',
            error: error.message
        });
    }
};

exports.updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            statusId,
            assignedEmployeeId,
            title,
            description
        } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('RequestID', sql.Int, id);

        if (statusId) {
            updates.push('StatusID = @StatusID');
            request.input('StatusID', sql.Int, statusId);
        }

        if (assignedEmployeeId !== undefined) {
            updates.push('AssignedEmployeeID = @AssignedEmployeeID');
            request.input('AssignedEmployeeID', sql.Int, assignedEmployeeId);
        }

        if (title) {
            updates.push('Title = @Title');
            request.input('Title', sql.NVarChar, title);
        }

        if (description) {
            updates.push('Description = @Description');
            request.input('Description', sql.NVarChar, description);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const result = await request.query(`
            UPDATE MaintenanceRequest 
            SET ${updates.join(', ')}
            WHERE RequestID = @RequestID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket updated successfully'
        });

    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket',
            error: error.message
        });
    }
};

exports.deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('RequestID', sql.Int, id)
            .query('DELETE FROM MaintenanceRequest WHERE RequestID = @RequestID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });

    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete ticket',
            error: error.message
        });
    }
};

exports.getTicketStatuses = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT StatusID, StatusName 
            FROM MaintenanceStatus 
            ORDER BY StatusID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get ticket statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error.message
        });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const { statusId, page = 1, limit = 20 } = req.query;
        const pool = await getPool();
        const offset = (page - 1) * limit;

        // Get resident ID from user
        const residentResult = await pool.request()
            .input('UserID', sql.Int, req.userId)
            .query('SELECT ResidentID FROM Resident WHERE UserID = @UserID');

        if (!residentResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Resident not found'
            });
        }

        const residentId = residentResult.recordset[0].ResidentID;

        let query = `
            SELECT 
                mr.RequestID,
                mr.Title,
                mr.Description,
                mr.RequestDate,
                mr.StatusID,
                ms.StatusName AS Status,
                a.ApartmentCode,
                e.FullName AS AssignedEmployeeName,
                DATEDIFF(DAY, mr.RequestDate, GETDATE()) AS DaysPending
            FROM MaintenanceRequest mr
            INNER JOIN Apartment a ON mr.ApartmentID = a.ApartmentID
            LEFT JOIN Employee e ON mr.AssignedEmployeeID = e.EmployeeID
            INNER JOIN MaintenanceStatus ms ON mr.StatusID = ms.StatusID
            WHERE mr.ResidentID = @ResidentID
        `;

        const request = pool.request();
        request.input('ResidentID', sql.Int, residentId);
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM MaintenanceRequest mr
            WHERE mr.ResidentID = @ResidentID
        `;

        if (statusId) {
            query += ` AND mr.StatusID = @StatusID`;
            countQuery += ` AND mr.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY mr.RequestDate DESC
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
        console.error('Get my tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets',
            error: error.message
        });
    }
};