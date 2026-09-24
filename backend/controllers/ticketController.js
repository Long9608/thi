const { getPool, sql } = require('../config/db');
const { resolveScope, isResidentAccount, apartmentOwnershipSql, getCurrentResidentId } = require('../utils/accessScope');
const { fail, positiveId, inTransaction, notifyUsers } = require('../utils/workflowUtils');

async function ticketScope(req, pool) {
    const scope = await resolveScope(req, pool, 'TICKET');
    return { ...scope, condition: scope.scope === 'all' ? '1=1' : scope.employeeId
        ? '(mr.AssignedEmployeeID=@EmployeeID OR (mr.AssignedEmployeeID IS NULL AND mr.StatusID=1))'
        : 'mr.ResidentID=@ResidentID' };
}
const scopedRequest = (pool, scope) => pool.request().input('ResidentID',sql.Int,scope.residentId || null).input('EmployeeID',sql.Int,scope.employeeId || null);
const selectTicket = `SELECT mr.*, ms.StatusName AS Status, r.FullName AS ResidentName, r.Phone AS ResidentPhone,
    a.ApartmentCode, ce.EquipmentName, e.FullName AS AssignedEmployeeName,e.UserID AS AssignedUserID,
    DATEDIFF(DAY,mr.RequestDate,COALESCE(mr.CompletedAt,GETDATE())) AS DaysPending
    FROM MaintenanceRequest mr JOIN MaintenanceStatus ms ON ms.StatusID=mr.StatusID
    JOIN Resident r ON r.ResidentID=mr.ResidentID JOIN Apartment a ON a.ApartmentID=mr.ApartmentID
    LEFT JOIN Employee e ON e.EmployeeID=mr.AssignedEmployeeID
    LEFT JOIN ContractEquipment ce ON ce.ContractEquipmentID=mr.ContractEquipmentID`;
exports.getAllTickets = async(req,res,next) => {
    try {
        const pool=await getPool(), scope=await ticketScope(req,pool);
        const page=Math.max(1,parseInt(req.query.page)||1),limit=Math.min(100,Math.max(1,parseInt(req.query.limit)||20));
        const request=scopedRequest(pool,scope).input('Status',sql.Int,req.query.statusId ? positiveId(req.query.statusId) : null)
            .input('Search',sql.NVarChar(250),`%${String(req.query.search || '').slice(0,200)}%`)
            .input('Offset',sql.Int,(page-1)*limit).input('Limit',sql.Int,limit);
        const where=`WHERE ${scope.condition} AND (@Status IS NULL OR mr.StatusID=@Status)
            AND (mr.Title LIKE @Search OR a.ApartmentCode LIKE @Search OR r.FullName LIKE @Search)`;
        const result=await request.query(`${selectTicket} ${where} ORDER BY mr.RequestDate DESC,mr.RequestID DESC OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
            SELECT COUNT(*) total FROM MaintenanceRequest mr JOIN Apartment a ON a.ApartmentID=mr.ApartmentID JOIN Resident r ON r.ResidentID=mr.ResidentID ${where};`);
        res.json({success:true,data:result.recordsets[0],pagination:{page,limit,total:result.recordsets[1][0].total,totalPages:Math.ceil(result.recordsets[1][0].total/limit)}});
    } catch(error){next(error);}
};
exports.getTicketById = async(req,res,next) => {
    try {
        const pool=await getPool(),scope=await ticketScope(req,pool),id=positiveId(req.params.id);
        const row=(await scopedRequest(pool,scope).input('ID',sql.Int,id).query(`${selectTicket} WHERE mr.RequestID=@ID AND ${scope.condition}`)).recordset[0];
        if(!row) fail(404,'Không tìm thấy yêu cầu trong phạm vi của bạn');
        row.Updates=(await pool.request().input('ID',sql.Int,id).query(`SELECT t.*,COALESCE(e.FullName,u.Username) ActorName,ms.StatusName
            FROM TicketUpdate t JOIN Users u ON u.UserID=t.ActorID LEFT JOIN Employee e ON e.UserID=u.UserID
            JOIN MaintenanceStatus ms ON ms.StatusID=t.StatusID WHERE t.RequestID=@ID ORDER BY t.UpdateID DESC`)).recordset;
        res.json({success:true,data:row});
    } catch(error){next(error);}
};
exports.createTicket = async(req,res,next) => {
    try {
        const pool=await getPool(),scope=await ticketScope(req,pool),apartmentId=positiveId(req.body.apartmentId);
        if(scope.employeeId) fail(403,'Tài khoản kỹ thuật chỉ nhận và xử lý yêu cầu');
        const residentId=scope.scope==='own' ? await getCurrentResidentId(pool,req.userId) : positiveId(req.body.residentId);
        const title=String(req.body.title || '').trim(), description=String(req.body.description || '').trim();
        if(!title || title.length>200 || description.length>10000) fail(400,'Tiêu đề (tối đa 200 ký tự) và mô tả không hợp lệ');
        const owner=await pool.request().input('ApartmentID',sql.Int,apartmentId).input('CurrentResidentID',sql.Int,residentId)
            .query(`SELECT 1 FROM Apartment a WHERE a.ApartmentID=@ApartmentID AND ${apartmentOwnershipSql()}`);
        if(!owner.recordset.length) fail(403,'Cư dân không thuộc căn hộ đang chọn');
        const id=await inTransaction(pool,async tx => {
            const equipmentId=req.body.equipmentId == null ? null : positiveId(req.body.equipmentId);
            if(equipmentId){
                const equipment=await tx.request().input('ID',sql.Int,equipmentId).input('ApartmentID',sql.Int,apartmentId).input('ResidentID',sql.Int,residentId)
                    .query(`SELECT 1 FROM ContractEquipment ce WITH(HOLDLOCK) JOIN Contract c ON c.ContractID=ce.ContractID WHERE ce.ContractEquipmentID=@ID AND c.ApartmentID=@ApartmentID
                        AND c.StatusID IN(2,5) AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate
                        AND (c.OwnerID=@ResidentID OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=@ResidentID AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date))))`);
                if(!equipment.recordset.length)fail(404,'Thiết bị không thuộc căn hộ/hợp đồng của cư dân');
                const pending=await tx.request().input('EquipmentID',sql.Int,equipmentId)
                    .query(`SELECT TOP 1 RequestID FROM MaintenanceRequest WITH(UPDLOCK,HOLDLOCK)
                        WHERE ContractEquipmentID=@EquipmentID AND StatusID IN (1,2)`);
                if(pending.recordset.length)fail(409,'Thiết bị này đã có yêu cầu bảo trì đang chờ xử lý');
            }
            const row=await tx.request().input('ResidentID',sql.Int,residentId).input('ApartmentID',sql.Int,apartmentId)
                .input('EquipmentID',sql.Int,equipmentId)
                .input('Title',sql.NVarChar(200),title).input('Description',sql.NVarChar(sql.MAX),description)
                .query('INSERT MaintenanceRequest(ResidentID,ApartmentID,Title,Description,RequestDate,StatusID,ContractEquipmentID) OUTPUT INSERTED.RequestID VALUES(@ResidentID,@ApartmentID,@Title,@Description,GETDATE(),1,@EquipmentID)');
            return row.recordset[0].RequestID;
        });
        res.status(201).json({success:true,data:{ticketId:id},message:'Đã gửi yêu cầu hỗ trợ'});
    } catch(error){next(error);}
};
exports.updateTicket = async(req,res,next) => {
    try {
        if(isResidentAccount(req)) fail(403,'Cư dân không được nhận hoặc xử lý yêu cầu');
        const pool=await getPool(),scope=await ticketScope(req,pool),id=positiveId(req.params.id);
        await inTransaction(pool,async tx => {
            const ticket=(await scopedRequest(tx,scope).input('ID',sql.Int,id)
                .query(`SELECT mr.* FROM MaintenanceRequest mr WITH(UPDLOCK,HOLDLOCK) WHERE mr.RequestID=@ID AND ${scope.condition}`)).recordset[0];
            if(!ticket) fail(404,'Không tìm thấy yêu cầu trong phạm vi của bạn');
            if([3,4].includes(ticket.StatusID)) fail(409,'Yêu cầu đã kết thúc, không thể cập nhật lặp');
            const status=req.body.statusId === undefined ? ticket.StatusID : Number(req.body.statusId);
            if(![2,3,4].includes(status)) fail(400,'Trạng thái xử lý không hợp lệ');
            const employee=(await tx.request().input('UserID',sql.Int,req.userId).query('SELECT EmployeeID FROM Employee WHERE UserID=@UserID AND Status=1')).recordset[0];
            let assigned=ticket.AssignedEmployeeID;
            if(ticket.StatusID===1 && status===2) {
                if(!employee) fail(403,'Tài khoản chưa liên kết nhân viên đang hoạt động');
                if(assigned && assigned!==employee.EmployeeID) fail(409,'Yêu cầu đã được giao cho nhân viên khác');
                assigned=employee.EmployeeID;
            } else if(ticket.StatusID===1 && status===3) fail(409,'Cần nhận xử lý trước khi hoàn thành');
            if(scope.scope!=='all' && assigned!==employee?.EmployeeID) fail(403,'Bạn chỉ được cập nhật yêu cầu đã nhận');
            if(req.body.assignedEmployeeId !== undefined && Number(req.body.assignedEmployeeId)!==assigned) fail(400,'Không được đổi người xử lý qua thao tác này');
            const progress=status===3 ? 100 : req.body.progress===undefined ? ticket.Progress : Number(req.body.progress);
            if(!Number.isInteger(progress) || progress<0 || progress>100 || (status===2 && progress===100)) fail(400,'Tiến độ từ 0 đến 99%; chọn Hoàn tất để đạt 100%');
            if(progress<ticket.Progress) fail(409,'Tiến độ không được thấp hơn lần cập nhật trước');
            const response=String(req.body.response || '').trim();
            if(response.length>10000) fail(400,'Phản hồi quá dài');
            if(ticket.StatusID===2 && status===2 && progress===ticket.Progress && !response) fail(400,'Vui lòng nhập tiến độ hoặc phản hồi');
            await tx.request().input('ID',sql.Int,id).input('Status',sql.Int,status).input('EmployeeID',sql.Int,assigned)
                .input('Progress',sql.Int,progress).input('Response',sql.NVarChar(sql.MAX),response || ticket.Response)
                .query(`UPDATE MaintenanceRequest SET StatusID=@Status,AssignedEmployeeID=@EmployeeID,Progress=@Progress,Response=@Response,UpdatedAt=SYSDATETIME(),
                    CompletedAt=CASE WHEN @Status IN(3,4) THEN SYSDATETIME() ELSE NULL END WHERE RequestID=@ID`);
            await tx.request().input('ID',sql.Int,id).input('Actor',sql.Int,req.userId).input('Status',sql.Int,status)
                .input('Progress',sql.Int,progress).input('Response',sql.NVarChar(sql.MAX),response || (status===2 ? 'Đã nhận xử lý' : status===3 ? 'Đã hoàn thành' : 'Đã hủy'))
                .query('INSERT TicketUpdate(RequestID,ActorID,StatusID,Progress,Response) VALUES(@ID,@Actor,@Status,@Progress,@Response)');
            const resident=(await tx.request().input('ID',sql.Int,ticket.ResidentID).query('SELECT UserID FROM Resident WHERE ResidentID=@ID AND Status=1')).recordset[0];
            if(resident?.UserID) await notifyUsers(tx,{senderId:req.userId,title:`Cập nhật yêu cầu #${id}`,content:`${ticket.Title}: ${status===3?'Hoàn tất':status===4?'Đã hủy':'Đang xử lý'} (${progress}%). ${response}`,userIds:[resident.UserID],entityType:'MaintenanceRequest',entityId:id,targetPage:'tickets'});
        });
        res.json({success:true,message:'Đã cập nhật yêu cầu'});
    } catch(error){next(error);}
};
exports.deleteTicket = async(req,res,next) => {
    try {
        const pool=await getPool(),id=positiveId(req.params.id);
        const result=await pool.request().input('ID',sql.Int,id).query('DELETE MaintenanceRequest WHERE RequestID=@ID AND StatusID IN(1,4)');
        if(!result.rowsAffected[0]) fail(409,'Chỉ được xóa yêu cầu mới hoặc đã hủy');
        res.json({success:true,message:'Đã xóa yêu cầu'});
    } catch(error){next(error);}
};
exports.getTicketStatuses = async(req,res,next) => {
    try {res.json({success:true,data:(await (await getPool()).request().query('SELECT StatusID,StatusName FROM MaintenanceStatus ORDER BY StatusID')).recordset});}
    catch(error){next(error);}
};
exports.getMyTickets = exports.getAllTickets;
