const { getPool, sql } = require('../config/db');

exports.getAllServices = async (req, res) => {
    try {
        const { 
            categoryId,
            status,
            page = 1,
            limit = 20 
        } = req.query;

        const pool = await getPool();
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                s.ServiceID,
                s.ServiceName,
                s.Unit,
                s.Price,
                s.Status,
                sc.CategoryName,
                sc.CategoryID,
                (
                    SELECT COUNT(*) 
                    FROM ServiceRegistration 
                    WHERE ServiceID = s.ServiceID AND Status = 1
                ) AS ActiveRegistrations
            FROM Service s
            INNER JOIN ServiceCategory sc ON s.CategoryID = sc.CategoryID
            WHERE 1=1
        `;

        const request = pool.request();
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Service s
            WHERE 1=1
        `;

        if (categoryId) {
            query += ` AND s.CategoryID = @CategoryID`;
            countQuery += ` AND s.CategoryID = @CategoryID`;
            request.input('CategoryID', sql.Int, parseInt(categoryId));
        }

        if (status !== undefined) {
            query += ` AND s.Status = @Status`;
            countQuery += ` AND s.Status = @Status`;
            request.input('Status', sql.Bit, parseInt(status));
        }

        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        query += `
            ORDER BY s.ServiceName
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
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: error.message
        });
    }
};

exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('ServiceID', sql.Int, id)
            .query(`
                SELECT 
                    s.*,
                    sc.CategoryName,
                    sc.Description AS CategoryDescription
                FROM Service s
                INNER JOIN ServiceCategory sc ON s.CategoryID = sc.CategoryID
                WHERE s.ServiceID = @ServiceID
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service',
            error: error.message
        });
    }
};

exports.createService = async (req, res) => {
    try {
        const { 
            categoryId,
            serviceName,
            unit,
            price,
            status
        } = req.body;

        if (!categoryId || !serviceName || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Category ID, service name, and price are required'
            });
        }

        const pool = await getPool();

        // Check if service name already exists
        const checkResult = await pool.request()
            .input('ServiceName', sql.NVarChar, serviceName)
            .query('SELECT ServiceID FROM Service WHERE ServiceName = @ServiceName');

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Service name already exists'
            });
        }

        const result = await pool.request()
            .input('CategoryID', sql.Int, categoryId)
            .input('ServiceName', sql.NVarChar, serviceName)
            .input('Unit', sql.NVarChar, unit || null)
            .input('Price', sql.Decimal, price)
            .input('Status', sql.Bit, status !== undefined ? status : 1)
            .query(`
                INSERT INTO Service (CategoryID, ServiceName, Unit, Price, Status)
                OUTPUT INSERTED.ServiceID
                VALUES (@CategoryID, @ServiceName, @Unit, @Price, @Status)
            `);

        const serviceId = result.recordset[0].ServiceID;

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: { serviceId }
        });

    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create service',
            error: error.message
        });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            categoryId,
            serviceName,
            unit,
            price,
            status
        } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('ServiceID', sql.Int, id);

        if (categoryId) {
            updates.push('CategoryID = @CategoryID');
            request.input('CategoryID', sql.Int, categoryId);
        }

        if (serviceName) {
            updates.push('ServiceName = @ServiceName');
            request.input('ServiceName', sql.NVarChar, serviceName);
        }

        if (unit !== undefined) {
            updates.push('Unit = @Unit');
            request.input('Unit', sql.NVarChar, unit);
        }

        if (price !== undefined) {
            updates.push('Price = @Price');
            request.input('Price', sql.Decimal, price);
        }

        if (status !== undefined) {
            updates.push('Status = @Status');
            request.input('Status', sql.Bit, status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const result = await request.query(`
            UPDATE Service 
            SET ${updates.join(', ')}
            WHERE ServiceID = @ServiceID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            message: 'Service updated successfully'
        });

    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update service',
            error: error.message
        });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if service is being used
        const usageCheck = await pool.request()
            .input('ServiceID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM ServiceRegistration 
                WHERE ServiceID = @ServiceID AND Status = 1
            `);

        if (usageCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete service with active registrations'
            });
        }

        const result = await pool.request()
            .input('ServiceID', sql.Int, id)
            .query('DELETE FROM Service WHERE ServiceID = @ServiceID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });

    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete service',
            error: error.message
        });
    }
};

exports.getServiceCategories = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                sc.CategoryID,
                sc.CategoryName,
                sc.Description,
                COUNT(s.ServiceID) AS ServiceCount
            FROM ServiceCategory sc
            LEFT JOIN Service s ON sc.CategoryID = s.CategoryID AND s.Status = 1
            GROUP BY sc.CategoryID, sc.CategoryName, sc.Description
            ORDER BY sc.CategoryName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get service categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service categories',
            error: error.message
        });
    }
};

exports.registerService = async (req, res) => {
    try {
        const { 
            contractId,
            serviceId,
            quantity,
            endDate
        } = req.body;

        if (!contractId || !serviceId) {
            return res.status(400).json({
                success: false,
                message: 'Contract ID and Service ID are required'
            });
        }

        const pool = await getPool();

        // Check if already registered
        const checkResult = await pool.request()
            .input('ContractID', sql.Int, contractId)
            .input('ServiceID', sql.Int, serviceId)
            .query(`
                SELECT RegistrationID 
                FROM ServiceRegistration 
                WHERE ContractID = @ContractID 
                    AND ServiceID = @ServiceID 
                    AND Status = 1
            `);

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Service already registered for this contract'
            });
        }

        const result = await pool.request()
            .input('ContractID', sql.Int, contractId)
            .input('ServiceID', sql.Int, serviceId)
            .input('Quantity', sql.Int, quantity || 1)
            .input('EndDate', sql.Date, endDate || null)
            .query(`
                INSERT INTO ServiceRegistration (
                    ContractID, ServiceID, RegisterDate, EndDate, Quantity, Status
                )
                OUTPUT INSERTED.RegistrationID
                VALUES (
                    @ContractID, @ServiceID, GETDATE(), @EndDate, @Quantity, 1
                )
            `);

        const registrationId = result.recordset[0].RegistrationID;

        res.status(201).json({
            success: true,
            message: 'Service registered successfully',
            data: { registrationId }
        });

    } catch (error) {
        console.error('Register service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register service',
            error: error.message
        });
    }
};

exports.unregisterService = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('RegistrationID', sql.Int, id)
            .query(`
                UPDATE ServiceRegistration 
                SET Status = 0, EndDate = GETDATE()
                WHERE RegistrationID = @RegistrationID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service registration not found'
            });
        }

        res.json({
            success: true,
            message: 'Service unregistered successfully'
        });

    } catch (error) {
        console.error('Unregister service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unregister service',
            error: error.message
        });
    }
};

exports.getGymMembers = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 999 } = req.query;
        const pool = await getPool();
        const offset = (Math.max(parseInt(page) || 1, 1) - 1) * Math.min(Math.max(parseInt(limit) || 999, 1), 999);
        const pageSize = Math.min(Math.max(parseInt(limit) || 999, 1), 999);
        const request = pool.request()
            .input('Search', sql.NVarChar, `%${search}%`)
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, pageSize);
        const where = `
            WHERE LOWER(s.ServiceName) LIKE '%gym%'
              AND (@Search = '%%' OR r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search)
        `;
        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM ServiceRegistration sr
            JOIN Service s ON s.ServiceID = sr.ServiceID
            JOIN Contract c ON c.ContractID = sr.ContractID
            JOIN Resident r ON r.ResidentID = c.OwnerID
            ${where}
        `);
        const result = await request.query(`
            SELECT sr.RegistrationID, sr.ContractID, sr.RegisterDate AS StartDate, sr.EndDate,
                   sr.Quantity AS TotalCheckIns, sr.Status AS RegistrationStatus,
                   r.ResidentID, r.FullName, r.Phone, r.Email, a.ApartmentCode,
                   CAST(0 AS INT) AS CheckIns
            FROM ServiceRegistration sr
            JOIN Service s ON s.ServiceID = sr.ServiceID
            JOIN Contract c ON c.ContractID = sr.ContractID
            JOIN Resident r ON r.ResidentID = c.OwnerID
            LEFT JOIN Apartment a ON a.ApartmentID = c.ApartmentID
            ${where}
            ORDER BY sr.RegisterDate DESC, sr.RegistrationID DESC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        `);
        res.json({ success: true, data: result.recordset, pagination: { total: countResult.recordset[0].total, page: parseInt(page), limit: pageSize } });
    } catch (error) {
        console.error('Get gym members error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch gym members' });
    }
};

exports.updateGymMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, phone, email, startDate, endDate, status, totalCheckIns } = req.body;
        if (!fullName || !startDate || (endDate && new Date(endDate) < new Date(startDate))) {
            return res.status(400).json({ success: false, message: 'Thông tin thành viên hoặc thời hạn đăng ký không hợp lệ' });
        }
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const registration = await new sql.Request(transaction).input('RegistrationID', sql.Int, id).query(`
                SELECT sr.RegistrationID, c.OwnerID
                FROM ServiceRegistration sr
                JOIN Service s ON s.ServiceID = sr.ServiceID
                JOIN Contract c ON c.ContractID = sr.ContractID
                WHERE sr.RegistrationID = @RegistrationID AND LOWER(s.ServiceName) LIKE '%gym%'
            `);
            if (!registration.recordset[0]) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên Gym' });
            }
            const residentId = registration.recordset[0].OwnerID;
            await new sql.Request(transaction)
                .input('ResidentID', sql.Int, residentId).input('FullName', sql.NVarChar, fullName)
                .input('Phone', sql.VarChar, phone || null).input('Email', sql.VarChar, email || null)
                .query('UPDATE Resident SET FullName = @FullName, Phone = @Phone, Email = @Email WHERE ResidentID = @ResidentID');
            await new sql.Request(transaction)
                .input('RegistrationID', sql.Int, id).input('StartDate', sql.Date, startDate)
                .input('EndDate', sql.Date, endDate || null).input('Status', sql.Bit, status ? 1 : 0)
                .input('Quantity', sql.Int, Math.max(parseInt(totalCheckIns) || 1, 1))
                .query('UPDATE ServiceRegistration SET RegisterDate = @StartDate, EndDate = @EndDate, Status = @Status, Quantity = @Quantity WHERE RegistrationID = @RegistrationID');
            await transaction.commit();
            res.json({ success: true, message: 'Cập nhật thành viên Gym thành công' });
        } catch (error) { await transaction.rollback(); throw error; }
    } catch (error) {
        console.error('Update gym member error:', error);
        res.status(500).json({ success: false, message: 'Failed to update gym member' });
    }
};

async function getSpecialServiceMembers(req, res, servicePattern) {
    try {
        const { search = '', page = 1, limit = 999 } = req.query;
        const pageSize = Math.min(Math.max(parseInt(limit) || 999, 1), 999);
        const offset = (Math.max(parseInt(page) || 1, 1) - 1) * pageSize;
        const request = (await getPool()).request().input('Search', sql.NVarChar, `%${search}%`).input('Offset', sql.Int, offset).input('Limit', sql.Int, pageSize);
        const where = `WHERE LOWER(s.ServiceName) LIKE @ServicePattern AND (@Search = '%%' OR r.FullName LIKE @Search OR r.Phone LIKE @Search OR r.Email LIKE @Search)`;
        request.input('ServicePattern', sql.NVarChar, servicePattern);
        const count = await request.query(`SELECT COUNT(*) AS total FROM ServiceRegistration sr JOIN Service s ON s.ServiceID = sr.ServiceID JOIN Contract c ON c.ContractID = sr.ContractID JOIN Resident r ON r.ResidentID = c.OwnerID ${where}`);
        const result = await request.query(`SELECT sr.RegistrationID, sr.RegisterDate AS StartDate, sr.EndDate, sr.Quantity AS TotalVisits, sr.Status AS RegistrationStatus, r.FullName, r.Phone, r.Email, a.ApartmentCode, CAST(0 AS INT) AS Visits FROM ServiceRegistration sr JOIN Service s ON s.ServiceID = sr.ServiceID JOIN Contract c ON c.ContractID = sr.ContractID JOIN Resident r ON r.ResidentID = c.OwnerID LEFT JOIN Apartment a ON a.ApartmentID = c.ApartmentID ${where} ORDER BY sr.RegisterDate DESC, sr.RegistrationID DESC OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`);
        res.json({ success: true, data: result.recordset, pagination: { total: count.recordset[0].total, page: parseInt(page), limit: pageSize } });
    } catch (error) { console.error('Get special-service members error:', error); res.status(500).json({ success: false, message: 'Failed to fetch service members' }); }
}

async function updateSpecialServiceMember(req, res, servicePattern) {
    try {
        const { id } = req.params;
        const { fullName, phone, email, startDate, endDate, status, totalVisits } = req.body;
        if (!fullName || !startDate || (endDate && new Date(endDate) < new Date(startDate))) return res.status(400).json({ success: false, message: 'Thông tin thành viên hoặc thời hạn đăng ký không hợp lệ' });
        const pool = await getPool(), transaction = new sql.Transaction(pool); await transaction.begin();
        try {
            const registration = await new sql.Request(transaction).input('RegistrationID', sql.Int, id).input('ServicePattern', sql.NVarChar, servicePattern).query(`SELECT c.OwnerID FROM ServiceRegistration sr JOIN Service s ON s.ServiceID = sr.ServiceID JOIN Contract c ON c.ContractID = sr.ContractID WHERE sr.RegistrationID = @RegistrationID AND LOWER(s.ServiceName) LIKE @ServicePattern`);
            if (!registration.recordset[0]) { await transaction.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên dịch vụ' }); }
            await new sql.Request(transaction).input('ResidentID', sql.Int, registration.recordset[0].OwnerID).input('FullName', sql.NVarChar, fullName).input('Phone', sql.VarChar, phone || null).input('Email', sql.VarChar, email || null).query('UPDATE Resident SET FullName=@FullName, Phone=@Phone, Email=@Email WHERE ResidentID=@ResidentID');
            await new sql.Request(transaction).input('RegistrationID', sql.Int, id).input('StartDate', sql.Date, startDate).input('EndDate', sql.Date, endDate || null).input('Status', sql.Bit, status ? 1 : 0).input('Quantity', sql.Int, Math.max(parseInt(totalVisits) || 1, 1)).query('UPDATE ServiceRegistration SET RegisterDate=@StartDate, EndDate=@EndDate, Status=@Status, Quantity=@Quantity WHERE RegistrationID=@RegistrationID');
            await transaction.commit(); res.json({ success: true, message: 'Cập nhật thành viên thành công' });
        } catch (error) { await transaction.rollback(); throw error; }
    } catch (error) { console.error('Update special-service member error:', error); res.status(500).json({ success: false, message: 'Failed to update service member' }); }
}

exports.getPoolMembers = (req, res) => getSpecialServiceMembers(req, res, '%bơi%');
exports.updatePoolMember = (req, res) => updateSpecialServiceMember(req, res, '%bơi%');
