// backend/controllers/apartmentController.js
const { getPool, sql } = require('../config/db');
const { getAccessScope, getCurrentResidentId, apartmentOwnershipSql, contractOwnershipSql, resolveScope } = require('../utils/accessScope');

const ACTIVE_CONTRACT_STATUS_SQL = '2, 5';

// ============================================
// QUẢN LÝ CĂN HỘ
// ============================================

exports.getApartments = async (req, res) => {
    try {
        const {
            search = '',
            statusId = '',
            buildingId = '',
            floorId = '',
            page = 1,
            limit = 20
        } = req.query;

        // 🔥 Đảm bảo page và limit là số nguyên dương
        const parsedPage = parseInt(page) || 1;
        const parsedLimit = parseInt(limit) || 20;
        const safePage = Math.max(1, parsedPage);
        const safeLimit = Math.max(1, parsedLimit);
        const offset = (safePage - 1) * safeLimit;

        const pool = await getPool();
        const accessScope = getAccessScope(req, {
            viewAll: 'APARTMENT_VIEW_ALL',
            viewOwn: 'APARTMENT_VIEW_OWN'
        });
        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem căn hộ' });
        }

        let query = `
            SELECT 
                a.ApartmentID,
                a.ApartmentCode,
                a.Area,
                a.StatusID,
                rs.StatusName as Status,
                f.FloorID,
                f.FloorNumber,
                b.BuildingID,
                b.BuildingName,
                ar.AreaID,
                ar.AreaName,
                ar.Address as AreaAddress,
                (
                    SELECT STRING_AGG(r.FullName, ', ')
                    FROM ContractResident cr
                    JOIN Contract c ON cr.ContractID = c.ContractID
                    JOIN Resident r ON cr.ResidentID = r.ResidentID
                    WHERE c.ApartmentID = a.ApartmentID
                        AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                        AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                        AND cr.MoveOutDate IS NULL
                ) as CurrentResidents,
                (
                    SELECT TOP 1
                        (SELECT 
                            c.ContractID,
                            c.ContractNumber,
                            c.SignDate,
                            c.StartDate,
                            c.EndDate,
                            c.Rent,
                            c.Deposit,
                            c.OwnerID
                         FROM Contract c
                         WHERE c.ApartmentID = a.ApartmentID
                            AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                            AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                         ORDER BY c.SignDate DESC
                         FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
                ) as CurrentContract,
                (
                    SELECT TOP 1 c.Rent
                    FROM Contract c
                    WHERE c.ApartmentID = a.ApartmentID
                        AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                        AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                    ORDER BY c.SignDate DESC
                ) as CurrentRent
            FROM Apartment a
            JOIN RoomStatus rs ON a.StatusID = rs.StatusID
            JOIN Floor f ON a.FloorID = f.FloorID
            JOIN Building b ON f.BuildingID = b.BuildingID
            JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
            WHERE 1=1
        `;

        const request = pool.request();
        
        // 🔥 countQuery cũng phải JOIN đúng các bảng
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM Apartment a
            JOIN RoomStatus rs ON a.StatusID = rs.StatusID
            JOIN Floor f ON a.FloorID = f.FloorID
            JOIN Building b ON f.BuildingID = b.BuildingID
            JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
            WHERE 1=1
        `;

        // 🔥 Thêm điều kiện tìm kiếm
        if (accessScope === 'own') {
            const currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            const residentApartmentCondition = apartmentOwnershipSql();
            query += ` AND ${residentApartmentCondition}`;
            countQuery += ` AND ${residentApartmentCondition}`;
            request.input('CurrentResidentID', sql.Int, currentResidentId);
        }

        if (search) {
            const searchPattern = `%${search}%`;
            query += ` AND (a.ApartmentCode LIKE @Search OR b.BuildingName LIKE @Search)`;
            countQuery += ` AND (a.ApartmentCode LIKE @Search OR b.BuildingName LIKE @Search)`;
            request.input('Search', sql.NVarChar, searchPattern);
        }

        if (statusId) {
            query += ` AND a.StatusID = @StatusID`;
            countQuery += ` AND a.StatusID = @StatusID`;
            request.input('StatusID', sql.Int, parseInt(statusId));
        }

        if (buildingId) {
            query += ` AND b.BuildingID = @BuildingID`;
            countQuery += ` AND b.BuildingID = @BuildingID`;
            request.input('BuildingID', sql.Int, parseInt(buildingId));
        }

        if (floorId) {
            query += ` AND f.FloorID = @FloorID`;
            countQuery += ` AND f.FloorID = @FloorID`;
            request.input('FloorID', sql.Int, parseInt(floorId));
        }

        // 🔥 Lấy tổng số bản ghi
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;

        // 🔥 Thêm phân trang
        query += `
            ORDER BY b.BuildingName, f.FloorNumber, a.ApartmentCode
            OFFSET @Offset ROWS
            FETCH NEXT @Limit ROWS ONLY
        `;
        request.input('Offset', sql.Int, offset);
        request.input('Limit', sql.Int, safeLimit);

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });

    } catch (error) {
        console.error('Get apartments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartments',
            error: error.message
        });
    }
};

// Lấy chi tiết căn hộ
exports.getEquipment = async (req,res,next) => {
    try {
        const pool=await getPool();
        const result=await pool.request().input('Search',sql.NVarChar(250),`%${String(req.query.search || '').slice(0,200)}%`)
            .query(`SELECT ce.*,a.ApartmentCode,c.ContractNumber FROM ContractEquipment ce
                JOIN Contract c ON c.ContractID=ce.ContractID JOIN Apartment a ON a.ApartmentID=c.ApartmentID
                WHERE ${activeContractSqlForEquipment()}
                AND (ce.EquipmentName LIKE @Search OR a.ApartmentCode LIKE @Search) ORDER BY a.ApartmentCode,ce.ContractEquipmentID`);
        res.json({success:true,data:result.recordset});
    } catch(error){next(error);}
};
function activeContractSqlForEquipment() { return 'c.StatusID IN (2,5) AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate'; }
exports.updateEquipment = async(req,res,next) => {
    try {
        const { positiveId,fail }=require('../utils/workflowUtils');
        const id=positiveId(req.params.id),{status,conditionDescription}=req.body;
        if(!['operational','maintenance','broken','retired'].includes(status)) fail(400,'Trạng thái thiết bị không hợp lệ');
        const result=await (await getPool()).request().input('ID',sql.Int,id).input('Status',sql.NVarChar(50),status)
            .input('Condition',sql.NVarChar(500),String(conditionDescription || '').slice(0,500))
            .query('UPDATE ContractEquipment SET EquipmentStatus=@Status,ConditionDescription=@Condition WHERE ContractEquipmentID=@ID');
        if(!result.rowsAffected[0]) fail(404,'Không tìm thấy thiết bị');
        res.json({success:true,message:'Đã cập nhật thiết bị'});
    }catch(error){next(error);}
};
exports.getApartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const accessScope = getAccessScope(req, {
            viewAll: 'APARTMENT_VIEW_ALL',
            viewOwn: 'APARTMENT_VIEW_OWN',
            legacy: ['APARTMENT_VIEW']
        });
        if (accessScope === 'none') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem căn hộ' });
        }

        let residentRestriction = '';
        let currentResidentId = null;
        if (accessScope === 'own') {
            currentResidentId = await getCurrentResidentId(pool, req.userId);
            if (!currentResidentId) {
                return res.status(403).json({ success: false, message: 'Không tìm thấy cư dân hiện tại' });
            }
            residentRestriction = ` AND ${apartmentOwnershipSql()}`;
        }

        const result = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    a.ApartmentID,
                    a.ApartmentCode,
                    a.Area,
                    a.StatusID,
                    rs.StatusName as Status,
                    f.FloorID,
                    f.FloorNumber,
                    b.BuildingID,
                    b.BuildingName,
                    b.NumberOfFloors,
                    ar.AreaID,
                    ar.AreaName,
                    ar.Address as AreaAddress
                FROM Apartment a
                JOIN RoomStatus rs ON a.StatusID = rs.StatusID
                JOIN Floor f ON a.FloorID = f.FloorID
                JOIN Building b ON f.BuildingID = b.BuildingID
                JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
                WHERE a.ApartmentID = @ApartmentID
                  ${residentRestriction}
            `);

        if (!result.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        const apartment = result.recordset[0];

        // Lấy lịch sử giá
        const priceResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    PriceHistoryID,
                    BaseRentalPrice,
                    EffectiveDate,
                    Note
                FROM ApartmentPriceHistory
                WHERE ApartmentID = @ApartmentID
                ORDER BY EffectiveDate DESC
            `);
        apartment.PriceHistory = priceResult.recordset;

        // Lấy hợp đồng hiện tại
        const contractResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    c.ContractID,
                    c.ContractNumber,
                    c.OwnerID,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName as ContractStatus,
                    r.FullName as OwnerName,
                    ${accessScope === 'own' ? 'NULL' : 'r.Phone'} as OwnerPhone,
                    ${accessScope === 'own' ? 'NULL' : 'r.Email'} as OwnerEmail
                FROM Contract c
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                WHERE c.ApartmentID = @ApartmentID
                    ${accessScope === 'own' ? `AND ${contractOwnershipSql('c')}` : ''}
                    AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                    AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                ORDER BY c.SignDate DESC
            `);
        apartment.CurrentContract = contractResult.recordset[0] || null;
                const contents = await pool.request()
                        .input('ApartmentID', sql.Int, id)
                        .input('ContractID', sql.Int, apartment.CurrentContract?.ContractID || null)
                        .input('CurrentResidentID', sql.Int, currentResidentId)
                        .query(`
                        SELECT ce.ContractEquipmentID AS EquipmentID,ce.EquipmentName AS Name,ce.Category,ce.Brand,ce.Model,ce.Quantity,ce.Location,ce.Specifications,ce.ConditionDescription,ce.EquipmentStatus AS Status,ce.CreatedDate
                        FROM ContractEquipment ce
                        JOIN Contract c ON c.ContractID=ce.ContractID
                        WHERE c.ApartmentID=@ApartmentID
                            AND c.ContractID=@ContractID
                            AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                            AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate
                            ${accessScope === 'own' ? `AND ${contractOwnershipSql('c')}` : ''}
                        ORDER BY ce.ContractEquipmentID;
                        SELECT sr.RegistrationID,s.ServiceName,sr.RegisterDate,sr.EndDate,sr.Quantity,sr.Status
                        FROM ServiceRegistration sr JOIN Service s ON s.ServiceID=sr.ServiceID
                        WHERE sr.ContractID=@ContractID ORDER BY sr.RegisterDate DESC;
                `);
        apartment.Equipment = contents.recordsets[0];
        apartment.Services = contents.recordsets[1];

        // Lấy tất cả hợp đồng
        const allContracts = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    c.ContractID,
                    c.ContractNumber,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName as ContractStatus,
                    r.FullName as OwnerName
                FROM Contract c
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                WHERE c.ApartmentID = @ApartmentID
                    ${accessScope === 'own' ? `AND ${contractOwnershipSql()}` : ''}
                ORDER BY c.SignDate DESC
            `);
        apartment.AllContracts = allContracts.recordset;

        // Lấy cư dân hiện tại
        const residentResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    r.ResidentID,
                    r.FullName,
                    ${accessScope === 'own' ? 'NULL' : 'r.Gender'} AS Gender,
                    ${accessScope === 'own' ? 'NULL' : 'r.BirthDate'} AS BirthDate,
                    ${accessScope === 'own' ? 'NULL' : 'r.Phone'} AS Phone,
                    ${accessScope === 'own' ? 'NULL' : 'r.Email'} AS Email,
                    cr.Relationship,
                    cr.MoveInDate
                FROM ContractResident cr
                JOIN Resident r ON cr.ResidentID = r.ResidentID
                JOIN Contract c ON cr.ContractID = c.ContractID
                WHERE c.ApartmentID = @ApartmentID
                    ${accessScope === 'own' ? `AND ${contractOwnershipSql()}` : ''}
                    AND c.StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                    AND CAST(GETDATE() AS DATE) BETWEEN c.StartDate AND c.EndDate
                    AND cr.MoveOutDate IS NULL
                    AND (cr.MoveInDate IS NULL OR cr.MoveInDate <= CAST(GETDATE() AS date))
                    ${accessScope === 'own' ? 'AND r.ResidentID = @CurrentResidentID' : ''}
            `);
        apartment.CurrentResidents = residentResult.recordset;

        // Lấy lịch sử thuê
        const historyResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .input('CurrentResidentID', sql.Int, currentResidentId)
            .query(`
                SELECT 
                    c.ContractNumber,
                    c.SignDate,
                    c.StartDate,
                    c.EndDate,
                    c.Rent,
                    c.Deposit,
                    cs.StatusName as ContractStatus,
                    r.FullName as OwnerName
                FROM Contract c
                JOIN ContractStatus cs ON c.StatusID = cs.StatusID
                JOIN Resident r ON c.OwnerID = r.ResidentID
                WHERE c.ApartmentID = @ApartmentID
                    ${accessScope === 'own' ? `AND ${contractOwnershipSql()}` : ''}
                ORDER BY c.SignDate DESC
            `);
        apartment.RentalHistory = historyResult.recordset;

        res.json({
            success: true,
            data: apartment
        });

    } catch (error) {
        console.error('Get apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartment',
            error: error.message
        });
    }
};

// Tạo căn hộ mới
exports.createApartment = async (req, res) => {
    try {
        const {
            floorId,
            apartmentCode,
            area,
            statusId
        } = req.body;

        if (!floorId || !apartmentCode || !area) {
            return res.status(400).json({
                success: false,
                message: 'Floor ID, apartment code and area are required'
            });
        }

        const pool = await getPool();

        // Check code exists
        const checkResult = await pool.request()
            .input('ApartmentCode', sql.VarChar, apartmentCode)
            .query('SELECT ApartmentID FROM Apartment WHERE ApartmentCode = @ApartmentCode');

        if (checkResult.recordset[0]) {
            return res.status(400).json({
                success: false,
                message: 'Apartment code already exists'
            });
        }

        const result = await pool.request()
            .input('FloorID', sql.Int, floorId)
            .input('ApartmentCode', sql.VarChar, apartmentCode)
            .input('Area', sql.Float, area)
            .input('StatusID', sql.Int, statusId || 1)
            .query(`
                INSERT INTO Apartment (FloorID, ApartmentCode, Area, StatusID)
                OUTPUT INSERTED.ApartmentID
                VALUES (@FloorID, @ApartmentCode, @Area, @StatusID)
            `);

        const apartmentId = result.recordset[0].ApartmentID;

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'INSERT')
            .input('TableName', sql.VarChar, 'Apartment')
            .input('RecordID', sql.Int, apartmentId)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.status(201).json({
            success: true,
            message: 'Apartment created successfully',
            data: { apartmentId }
        });

    } catch (error) {
        console.error('Create apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create apartment',
            error: error.message
        });
    }
};

// Cập nhật căn hộ
exports.updateApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            floorId,
            area,
            statusId
        } = req.body;

        const pool = await getPool();

        const checkResult = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query('SELECT ApartmentID FROM Apartment WHERE ApartmentID = @ApartmentID');

        if (!checkResult.recordset[0]) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        const updates = [];
        const request = pool.request();
        request.input('ApartmentID', sql.Int, id);

        if (floorId) {
            updates.push('FloorID = @FloorID');
            request.input('FloorID', sql.Int, floorId);
        }
        if (area) {
            updates.push('Area = @Area');
            request.input('Area', sql.Float, area);
        }
        if (statusId) {
            updates.push('StatusID = @StatusID');
            request.input('StatusID', sql.Int, statusId);
        }

        if (updates.length > 0) {
            await request.query(`
                UPDATE Apartment 
                SET ${updates.join(', ')}
                WHERE ApartmentID = @ApartmentID
            `);
        }

        // Ghi audit log
        await pool.request()
            .input('UserID', sql.Int, req.userId || null)
            .input('Action', sql.VarChar, 'UPDATE')
            .input('TableName', sql.VarChar, 'Apartment')
            .input('RecordID', sql.Int, id)
            .input('IPAddress', sql.VarChar, req.ip || req.connection.remoteAddress)
            .query(`
                INSERT INTO AuditLog (UserID, Action, TableName, RecordID, Timestamp, IPAddress)
                VALUES (@UserID, @Action, @TableName, @RecordID, GETDATE(), @IPAddress)
            `);

        res.json({
            success: true,
            message: 'Apartment updated successfully'
        });

    } catch (error) {
        console.error('Update apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update apartment',
            error: error.message
        });
    }
};

// Xóa căn hộ
exports.deleteApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if apartment has active contracts
        const contractCheck = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count
                FROM Contract
                WHERE ApartmentID = @ApartmentID
                  AND StatusID IN (${ACTIVE_CONTRACT_STATUS_SQL})
                  AND CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate
            `);

        if (contractCheck.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete apartment with active contracts'
            });
        }

        const result = await pool.request()
            .input('ApartmentID', sql.Int, id)
            .query('DELETE FROM Apartment WHERE ApartmentID = @ApartmentID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }

        res.json({
            success: true,
            message: 'Apartment deleted successfully'
        });

    } catch (error) {
        console.error('Delete apartment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete apartment',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ TÒA NHÀ
// ============================================

exports.getBuildings = async (req, res) => {
    try {
        const { areaId } = req.query;
        const pool = await getPool();
        const { scope, residentId } = await resolveScope(req, pool, 'APARTMENT');

        let query = `
            SELECT 
                b.BuildingID,
                b.BuildingName,
                b.NumberOfFloors,
                b.AreaID,
                ar.AreaName,
                ar.Address as AreaAddress,
                COUNT(DISTINCT a.ApartmentID) as TotalApartments,
                COUNT(DISTINCT CASE WHEN a.StatusID = 2 THEN a.ApartmentID END) as OccupiedApartments
            FROM Building b
            JOIN ApartmentArea ar ON b.AreaID = ar.AreaID
            LEFT JOIN Floor f ON b.BuildingID = f.BuildingID
            LEFT JOIN Apartment a ON f.FloorID = a.FloorID
            WHERE 1=1
            ${scope === 'own' ? `AND ${apartmentOwnershipSql()}` : ''}
        `;

        if (areaId) {
            query += ` AND b.AreaID = @AreaID`;
        }

        query += `
            GROUP BY b.BuildingID, b.BuildingName, b.NumberOfFloors, b.AreaID, ar.AreaName, ar.Address
            ORDER BY b.BuildingName
        `;

        const request = pool.request().input('CurrentResidentID', sql.Int, residentId);
        if (areaId) {
            request.input('AreaID', sql.Int, parseInt(areaId));
        }

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get buildings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings',
            error: error.message
        });
    }
};

exports.createBuilding = async (req, res) => {
    try {
        const { areaId, buildingName, numberOfFloors } = req.body;

        if (!areaId || !buildingName || !numberOfFloors) {
            return res.status(400).json({
                success: false,
                message: 'Area ID, building name and number of floors are required'
            });
        }

        const pool = await getPool();

        const result = await pool.request()
            .input('AreaID', sql.Int, areaId)
            .input('BuildingName', sql.NVarChar, buildingName)
            .input('NumberOfFloors', sql.Int, numberOfFloors)
            .query(`
                INSERT INTO Building (AreaID, BuildingName, NumberOfFloors)
                OUTPUT INSERTED.BuildingID
                VALUES (@AreaID, @BuildingName, @NumberOfFloors)
            `);

        res.status(201).json({
            success: true,
            message: 'Building created successfully',
            data: { buildingId: result.recordset[0].BuildingID }
        });

    } catch (error) {
        console.error('Create building error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create building',
            error: error.message
        });
    }
};

exports.updateBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const { buildingName, numberOfFloors } = req.body;

        const pool = await getPool();

        const updates = [];
        const request = pool.request();
        request.input('BuildingID', sql.Int, id);

        if (buildingName) {
            updates.push('BuildingName = @BuildingName');
            request.input('BuildingName', sql.NVarChar, buildingName);
        }
        if (numberOfFloors) {
            updates.push('NumberOfFloors = @NumberOfFloors');
            request.input('NumberOfFloors', sql.Int, numberOfFloors);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const result = await request.query(`
            UPDATE Building 
            SET ${updates.join(', ')}
            WHERE BuildingID = @BuildingID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        res.json({
            success: true,
            message: 'Building updated successfully'
        });

    } catch (error) {
        console.error('Update building error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update building',
            error: error.message
        });
    }
};

exports.deleteBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Floors reference the building even when they contain no apartments.
        const checkResult = await pool.request()
            .input('BuildingID', sql.Int, id)
            .query(`
                SELECT COUNT(*) as count 
                FROM Floor f
                WHERE f.BuildingID = @BuildingID
            `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tòa nhà còn tầng. Hãy xóa các căn hộ và tầng trước.'
            });
        }

        const result = await pool.request()
            .input('BuildingID', sql.Int, id)
            .query('DELETE FROM Building WHERE BuildingID = @BuildingID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        res.json({
            success: true,
            message: 'Building deleted successfully'
        });

    } catch (error) {
        console.error('Delete building error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete building',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ TẦNG
// ============================================

exports.getFloors = async (req, res) => {
    try {
        const { buildingId } = req.query;
        const pool = await getPool();
        const { scope, residentId } = await resolveScope(req, pool, 'APARTMENT');

        let query = `
            SELECT 
                f.FloorID,
                f.FloorNumber,
                f.BuildingID,
                b.BuildingName,
                COUNT(a.ApartmentID) as TotalApartments
            FROM Floor f
            JOIN Building b ON f.BuildingID = b.BuildingID
            LEFT JOIN Apartment a ON f.FloorID = a.FloorID
            WHERE 1=1
            ${scope === 'own' ? `AND ${apartmentOwnershipSql()}` : ''}
        `;

        if (buildingId) {
            query += ` AND f.BuildingID = @BuildingID`;
        }

        query += `
            GROUP BY f.FloorID, f.FloorNumber, f.BuildingID, b.BuildingName
            ORDER BY f.FloorNumber
        `;

        const request = pool.request().input('CurrentResidentID', sql.Int, residentId);
        if (buildingId) {
            request.input('BuildingID', sql.Int, parseInt(buildingId));
        }

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get floors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors',
            error: error.message
        });
    }
};

exports.createFloor = async (req, res) => {
    try {
        const { buildingId, floorNumber } = req.body;

        if (!buildingId || !floorNumber) {
            return res.status(400).json({
                success: false,
                message: 'Building ID and floor number are required'
            });
        }

        const pool = await getPool();

        const result = await pool.request()
            .input('BuildingID', sql.Int, buildingId)
            .input('FloorNumber', sql.Int, floorNumber)
            .query(`
                INSERT INTO Floor (BuildingID, FloorNumber)
                OUTPUT INSERTED.FloorID
                VALUES (@BuildingID, @FloorNumber)
            `);

        res.status(201).json({
            success: true,
            message: 'Floor created successfully',
            data: { floorId: result.recordset[0].FloorID }
        });

    } catch (error) {
        console.error('Create floor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create floor',
            error: error.message
        });
    }
};

exports.deleteFloor = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Check if floor has apartments
        const checkResult = await pool.request()
            .input('FloorID', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM Apartment WHERE FloorID = @FloorID');

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete floor with existing apartments'
            });
        }

        const result = await pool.request()
            .input('FloorID', sql.Int, id)
            .query('DELETE FROM Floor WHERE FloorID = @FloorID');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        res.json({
            success: true,
            message: 'Floor deleted successfully'
        });

    } catch (error) {
        console.error('Delete floor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete floor',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ TRẠNG THÁI CĂN HỘ
// ============================================

exports.getApartmentStatuses = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.query(`
            SELECT 
                StatusID,
                StatusName
            FROM RoomStatus
            ORDER BY StatusID
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get apartment statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statuses',
            error: error.message
        });
    }
};

// ============================================
// QUẢN LÝ KHU VỰC
// ============================================

exports.getAreas = async (req, res) => {
    try {
        const pool = await getPool();
        const { scope, residentId } = await resolveScope(req, pool, 'APARTMENT');
        const result = await pool.request().input('CurrentResidentID', sql.Int, residentId).query(`
            SELECT 
                ar.AreaID,
                ar.AreaName,
                ar.Address,
                ar.Description,
                COUNT(DISTINCT b.BuildingID) as TotalBuildings
            FROM ApartmentArea ar
            LEFT JOIN Building b ON ar.AreaID = b.AreaID
            ${scope === 'own' ? `WHERE EXISTS (SELECT 1 FROM Floor f JOIN Apartment a ON a.FloorID=f.FloorID WHERE f.BuildingID=b.BuildingID AND ${apartmentOwnershipSql()})` : ''}
            GROUP BY ar.AreaID, ar.AreaName, ar.Address, ar.Description
            ORDER BY ar.AreaName
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Get areas error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas',
            error: error.message
        });
    }
};

// ============================================
// THỐNG KÊ CĂN HỘ
// ============================================

exports.getApartmentStats = async (req, res) => {
    try {
        const pool = await getPool();

        const { scope, residentId } = await resolveScope(req, pool, 'APARTMENT');
        const result = await pool.request().input('CurrentResidentID', sql.Int, residentId).query(`
            SELECT 
                rs.StatusName,
                COUNT(a.ApartmentID) as Count,
                CAST(COUNT(a.ApartmentID) * 100.0 / NULLIF(SUM(COUNT(a.ApartmentID)) OVER(), 0) AS DECIMAL(5,2)) as Percentage
            FROM Apartment a
            JOIN RoomStatus rs ON a.StatusID = rs.StatusID
            ${scope === 'own' ? `WHERE ${apartmentOwnershipSql()}` : ''}
            GROUP BY rs.StatusName
            ORDER BY Count DESC
        `);

        res.json({
            success: true,
            data: result.recordset || []
        });

    } catch (error) {
        console.error('Get apartment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
            error: error.message
        });
    }
};
