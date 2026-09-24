const { getPool, sql } = require('../config/db');
const { assertResourceScope, isResidentAccount } = require('../utils/accessScope');
const { fail, positiveId, inTransaction, notifyUsers } = require('../utils/workflowUtils');
const { SUCCESS_PAYMENT_STATUS_ID, syncInvoiceStatus } = require('../services/billingService');

async function lockedInvoice(tx, id) {
    const row = (await tx.request().input('ID', sql.Int, id).input('Success', sql.Int, SUCCESS_PAYMENT_STATUS_ID).query(`
      SELECT i.*,a.ApartmentCode,r.FullName OwnerName,CAST(GETDATE() AS date) Today,
        i.TotalAmount-ISNULL((SELECT SUM(p.Amount) FROM Payment p WHERE p.InvoiceID=i.InvoiceID AND p.StatusID=@Success),0) RemainingAmount,
        (SELECT COUNT(*) FROM InvoicePaymentSubmission s WHERE s.InvoiceID=i.InvoiceID AND s.ConfirmedAt IS NULL) PendingPayment
      FROM Invoice i WITH(UPDLOCK,HOLDLOCK) JOIN Contract c ON c.ContractID=i.ContractID
      JOIN Apartment a ON a.ApartmentID=c.ApartmentID JOIN Resident r ON r.ResidentID=c.OwnerID WHERE i.InvoiceID=@ID`)).recordset[0];
    if (!row) fail(404, 'Không tìm thấy hóa đơn');
    return row;
}
function assertOverdue(i) {
    if (i.StatusID === 4 || i.WorkflowStatus === 'DRAFT' || i.RemainingAmount <= 0 || !i.DueDate || i.DueDate >= i.Today)
        fail(409, 'Chỉ được gia hạn hóa đơn quá hạn còn nợ');
    if (i.PendingPayment) fail(409, 'Hóa đơn đang chờ xác nhận thanh toán');
}
function dueDate(value, invoice) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) fail(400, 'Ngày gia hạn không hợp lệ');
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value || date <= invoice.DueDate || date <= invoice.Today)
        fail(400, 'Hạn mới phải sau hạn hiện tại và sau hôm nay');
    return date;
}
function note(value, required = false) {
    if (typeof value !== 'string' || value.trim().length > 2000 || (required && !value.trim())) fail(400, 'Lý do/ghi chú phải có từ 1 đến 2000 ký tự');
    return value.trim();
}
const pending = async (tx,id) => (await tx.request().input('ID',sql.Int,id)
    .query("SELECT * FROM InvoiceDueDateExtensionRequest WHERE InvoiceID=@ID AND Status='PENDING'")).recordset[0];

exports.list = async (req,res,next) => {
    try {
        const pool=await getPool(), id=positiveId(req.params.id);
        await assertResourceScope(req,pool,'INVOICE','invoice',id);
        res.json({success:true,data:(await pool.request().input('ID',sql.Int,id).query('SELECT * FROM InvoiceDueDateExtensionRequest WHERE InvoiceID=@ID ORDER BY RequestID DESC')).recordset});
    } catch(e){next(e);}
};
exports.request = async (req,res,next) => {
    try {
        if(!isResidentAccount(req)) fail(403,'Chỉ cư dân được gửi yêu cầu');
        const pool=await getPool(),id=positiveId(req.params.id);
        await assertResourceScope(req,pool,'INVOICE','invoice',id);
        await inTransaction(pool,async tx=>{
            const invoice=await lockedInvoice(tx,id); assertOverdue(invoice);
            const date=dueDate(req.body.requestedDueDate,invoice),reason=note(req.body.reason,true);
            if(await pending(tx,id)) fail(409,'Đã có yêu cầu gia hạn đang chờ');
            await tx.request().input('ID',sql.Int,id).input('User',sql.Int,req.userId).input('Old',sql.Date,invoice.DueDate)
                .input('New',sql.Date,date).input('Reason',sql.NVarChar(2000),reason)
                .query('INSERT InvoiceDueDateExtensionRequest(InvoiceID,RequestedByUserID,OriginalDueDate,RequestedDueDate,Reason) VALUES(@ID,@User,@Old,@New,@Reason)');
            const users=(await tx.request().query(`SELECT u.UserID FROM Users u WHERE u.Status=1
              AND NOT EXISTS(SELECT 1 FROM UserRole ur JOIN Role r ON r.RoleID=ur.RoleID WHERE ur.UserID=u.UserID AND r.RoleCode='RESIDENT')
              AND (SELECT COUNT(DISTINCT p.PermissionCode) FROM UserRole ur JOIN Role r ON r.RoleID=ur.RoleID AND r.Status=1
                JOIN RolePermission rp ON rp.RoleID=r.RoleID AND rp.IsGranted=1 JOIN Permission p ON p.PermissionID=rp.PermissionID
                JOIN Module m ON m.ModuleID=p.ModuleID AND m.Status=1
                WHERE ur.UserID=u.UserID AND p.PermissionCode IN ('INVOICE_VIEW_ALL','INVOICE_DUE_DATE_EXTEND'))=2`)).recordset;
            await notifyUsers(tx,{senderId:req.userId,title:`Yêu cầu gia hạn hóa đơn #${id}`,
                content:`Cư dân căn ${invoice.ApartmentCode} xin gia hạn hóa đơn #${id} đến ${req.body.requestedDueDate}.`,
                userIds:users.map(u=>u.UserID),entityType:'Invoice',entityId:id,targetPage:'fees'});
        });
        res.status(201).json({success:true,message:'Đã gửi yêu cầu gia hạn'});
    }catch(e){next(e);}
};
exports.review = async(req,res,next)=>{
    try{
        const pool=await getPool(),id=positiveId(req.params.id);
        if(isResidentAccount(req)) fail(403,'Không có quyền duyệt gia hạn');
        const decision=req.body.decision;
        if(!['APPROVED','REJECTED'].includes(decision)) fail(400,'Quyết định không hợp lệ');
        await inTransaction(pool,async tx=>{
            const invoice=await lockedInvoice(tx,id); assertOverdue(invoice);
            let request=await pending(tx,id);
            if(req.body.requestId && (!request || request.RequestID!==positiveId(req.body.requestId))) fail(409,'Yêu cầu đã được xử lý; vui lòng tải lại');
            const reviewNote=note(req.body.note || '',decision==='REJECTED' || !request);
            const date=decision==='APPROVED'?dueDate(req.body.approvedDueDate,invoice):null;
            if(!request){
                if(decision==='REJECTED') fail(409,'Không có yêu cầu đang chờ');
                request=(await tx.request().input('ID',sql.Int,id).input('User',sql.Int,req.userId).input('Old',sql.Date,invoice.DueDate)
                    .input('New',sql.Date,date).input('Reason',sql.NVarChar(2000),reviewNote)
                    .query('INSERT InvoiceDueDateExtensionRequest(InvoiceID,RequestedByUserID,OriginalDueDate,RequestedDueDate,Reason) OUTPUT INSERTED.* VALUES(@ID,@User,@Old,@New,@Reason)')).recordset[0];
            }
            await tx.request().input('Request',sql.Int,request.RequestID).input('User',sql.Int,req.userId).input('Status',sql.VarChar(10),decision)
                .input('Date',sql.Date,date).input('Note',sql.NVarChar(2000),reviewNote)
                .query('UPDATE InvoiceDueDateExtensionRequest SET Status=@Status,ApprovedDueDate=@Date,ReviewNote=@Note,ReviewedByUserID=@User,ReviewedAt=SYSDATETIME(),UpdatedAt=SYSDATETIME() WHERE RequestID=@Request');
            if(date){
                await tx.request().input('ID',sql.Int,id).input('Date',sql.Date,date).query('UPDATE Invoice SET DueDate=@Date WHERE InvoiceID=@ID');
                await syncInvoiceStatus(tx,id);
            }
            const users=(await tx.request().input('ID',sql.Int,id).query(`SELECT DISTINCT r.UserID FROM Resident r JOIN Contract c ON
              c.OwnerID=r.ResidentID OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=r.ResidentID
                AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date)))
              JOIN Invoice i ON i.ContractID=c.ContractID WHERE i.InvoiceID=@ID AND r.Status=1 AND r.UserID IS NOT NULL`)).recordset;
            await notifyUsers(tx,{senderId:req.userId,title:`${date?'Đã gia hạn':'Từ chối gia hạn'} hóa đơn #${id}`,
                content:date?`Hạn mới: ${req.body.approvedDueDate}. ${reviewNote}`:reviewNote,
                userIds:users.map(u=>u.UserID),entityType:'Invoice',entityId:id,targetPage:'fees'});
        });
        res.json({success:true,message:'Đã xử lý gia hạn'});
    }catch(e){next(e);}
};
module.exports.assertOverdue=assertOverdue;
module.exports.dueDate=dueDate;
