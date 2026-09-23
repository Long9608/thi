const { getPool, sql } = require('../config/db');
const { assertResourceScope, isResidentAccount } = require('../utils/accessScope');
const { fail, positiveId, inTransaction, notifyUsers } = require('../utils/workflowUtils');
const { syncInvoiceStatus, SUCCESS_PAYMENT_STATUS_ID } = require('../services/billingService');

async function readInvoice(pool, id, lock = false) {
    const result = await pool.request().input('ID', sql.Int, id).input('PaidStatus', sql.Int, SUCCESS_PAYMENT_STATUS_ID).query(`
        SELECT i.*, c.ContractNumber, a.ApartmentCode,
          i.TotalAmount-ISNULL((SELECT SUM(Amount) FROM Payment WHERE InvoiceID=i.InvoiceID AND StatusID=@PaidStatus),0) RemainingAmount,
          s.SubmittedAt,s.ConfirmedAt,s.SubmittedBy,s.TransferContent
        FROM Invoice i ${lock ? 'WITH (UPDLOCK,HOLDLOCK)' : ''}
        JOIN Contract c ON c.ContractID=i.ContractID JOIN Apartment a ON a.ApartmentID=c.ApartmentID
        LEFT JOIN InvoicePaymentSubmission s ON s.InvoiceID=i.InvoiceID WHERE i.InvoiceID=@ID`);
    if (!result.recordset[0]) fail(404, 'Không tìm thấy hóa đơn');
    return result.recordset[0];
}
function payable(invoice) {
    if (invoice.StatusID === 4) fail(409, 'Hóa đơn đã hủy');
    if (invoice.WorkflowStatus === 'DRAFT') fail(409, 'Hóa đơn chưa chốt điện/nước');
    if (invoice.StatusID === 2 || invoice.RemainingAmount <= 0) fail(409, 'Hóa đơn đã được xác nhận thanh toán');
}
exports.getPaymentInfo = async (req, res, next) => {
    try {
        const id = positiveId(req.params.id), pool = await getPool();
        await assertResourceScope(req, pool, 'INVOICE', 'invoice', id);
        const invoice = await readInvoice(pool, id);
        const config = (await pool.request().query("SELECT BankBin,AccountNumber,AccountName FROM PaymentConfiguration WHERE ConfigKey='PRIMARY'")).recordset[0];
        const transferContent = `HD${id} T${invoice.InvoiceMonth} ${invoice.InvoiceYear}`;
        // The QR is only exposed to the resident who owns this invoice.
        const qrUrl = isResidentAccount(req) && config && invoice.RemainingAmount > 0 && invoice.StatusID !== 4 && invoice.WorkflowStatus !== 'DRAFT'
            ? `https://img.vietqr.io/image/${config.BankBin}-${config.AccountNumber}-compact2.png?amount=${encodeURIComponent(invoice.RemainingAmount)}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(config.AccountName)}` : null;
        res.json({ success: true, data: { invoice, transferContent, config: isResidentAccount(req) ? config || null : null, qrUrl } });
    } catch (error) { next(error); }
};
exports.submitPayment = async (req, res, next) => {
    try {
        if (!isResidentAccount(req)) fail(403, 'Chỉ cư dân được báo đã chuyển khoản');
        const id = positiveId(req.params.id), pool = await getPool();
        await assertResourceScope(req, pool, 'INVOICE', 'invoice', id);
        await inTransaction(pool, async tx => {
            const invoice = await readInvoice(tx, id, true); payable(invoice);
            if (invoice.SubmittedAt) fail(409, 'Bạn đã gửi xác nhận; vui lòng chờ Ban quản lý/Kế toán kiểm tra');
            const recipients = await tx.request().query(`SELECT DISTINCT u.UserID FROM Users u
                JOIN UserRole ur ON ur.UserID=u.UserID JOIN Role r ON r.RoleID=ur.RoleID AND r.Status=1
                JOIN RolePermission rp ON rp.RoleID=r.RoleID AND rp.IsGranted=1
                JOIN Permission p ON p.PermissionID=rp.PermissionID AND p.PermissionCode='PAYMENT_CREATE'
                WHERE u.Status=1 AND NOT EXISTS(SELECT 1 FROM UserRole ur2 JOIN Role r2 ON r2.RoleID=ur2.RoleID WHERE ur2.UserID=u.UserID AND r2.RoleCode='RESIDENT')
                AND EXISTS(SELECT 1 FROM UserRole ur3 JOIN Role r3 ON r3.RoleID=ur3.RoleID AND r3.Status=1 JOIN RolePermission rp3 ON rp3.RoleID=r3.RoleID AND rp3.IsGranted=1 JOIN Permission p3 ON p3.PermissionID=rp3.PermissionID WHERE ur3.UserID=u.UserID AND p3.PermissionCode='INVOICE_VIEW_ALL')`);
            if (!recipients.recordset.length) fail(409, 'Chưa có tài khoản Ban quản lý/Kế toán có quyền xác nhận thanh toán');
            await tx.request().input('ID', sql.Int, id).input('UserID', sql.Int, req.userId)
                .input('Amount', sql.Decimal(18,2), invoice.RemainingAmount).input('Content', sql.VarChar(100), `HD${id} T${invoice.InvoiceMonth} ${invoice.InvoiceYear}`)
                .query('INSERT InvoicePaymentSubmission(InvoiceID,SubmittedBy,Amount,TransferContent) VALUES(@ID,@UserID,@Amount,@Content)');
            await notifyUsers(tx, { senderId: req.userId, title: `Kiểm tra thanh toán hóa đơn #${id}`,
                content: `Cư dân căn ${invoice.ApartmentCode} báo đã chuyển ${invoice.RemainingAmount.toLocaleString('vi-VN')} đ. Vào Hóa đơn & thu phí để kiểm tra và xác nhận hóa đơn #${id}.`, userIds: recipients.recordset.map(r => r.UserID) });
        });
        res.status(201).json({ success: true, message: 'Đã thông báo Ban quản lý/Kế toán kiểm tra thanh toán' });
    } catch (error) { next(error); }
};
exports.confirmPayment = async (req, res, next) => {
    try {
        const id = positiveId(req.params.id), pool = await getPool();
        await inTransaction(pool, async tx => {
            const invoice = await readInvoice(tx, id, true); payable(invoice);
            const methodId = positiveId(req.body.methodId);
            if (!(await tx.request().input('ID', sql.Int, methodId).query('SELECT MethodID FROM PaymentMethod WHERE MethodID=@ID')).recordset.length) fail(400, 'Phương thức thanh toán không hợp lệ');
            const payment = await tx.request().input('ID', sql.Int, id).input('MethodID', sql.Int, methodId)
                .input('Amount', sql.Decimal(18,2), invoice.RemainingAmount)
                .input('Code', sql.VarChar(100), String(req.body.transactionCode || invoice.TransferContent || `HD${id}`).slice(0,100))
                .input('Status', sql.Int, SUCCESS_PAYMENT_STATUS_ID)
                .query('INSERT Payment(InvoiceID,MethodID,PaymentDate,Amount,TransactionCode,StatusID) OUTPUT INSERTED.PaymentID VALUES(@ID,@MethodID,GETDATE(),@Amount,@Code,@Status)');
            await syncInvoiceStatus(tx, id);
            await tx.request().input('ID', sql.Int, id).input('UserID', sql.Int, req.userId).input('PaymentID', sql.Int, payment.recordset[0].PaymentID)
                .query('UPDATE InvoicePaymentSubmission SET ConfirmedBy=@UserID,ConfirmedAt=SYSDATETIME(),PaymentID=@PaymentID WHERE InvoiceID=@ID AND ConfirmedAt IS NULL');
            const users = await tx.request().input('ID', sql.Int, id).query(`SELECT DISTINCT r.UserID FROM Resident r JOIN Contract c ON c.OwnerID=r.ResidentID
                JOIN Invoice i ON i.ContractID=c.ContractID WHERE i.InvoiceID=@ID AND r.UserID IS NOT NULL
                UNION SELECT SubmittedBy FROM InvoicePaymentSubmission WHERE InvoiceID=@ID`);
            await notifyUsers(tx, { senderId: req.userId, title: `Hóa đơn #${id} đã thanh toán`, content: `Ban quản lý/Kế toán đã xác nhận thanh toán hóa đơn #${id}, căn ${invoice.ApartmentCode}.`, userIds: users.recordset.map(r => r.UserID) });
        });
        res.json({ success: true, message: 'Đã xác nhận thanh toán' });
    } catch (error) { next(error); }
};
exports.getConfig = async (req,res,next) => {
    try { res.json({success:true,data:(await (await getPool()).request().query("SELECT BankBin,AccountNumber,AccountName FROM PaymentConfiguration WHERE ConfigKey='PRIMARY'")).recordset[0] || null}); }
    catch(error){next(error);}
};
exports.saveConfig = async (req,res,next) => {
    try {
        const { bankBin, accountNumber, accountName } = req.body;
        if (!/^\d{6}$/.test(bankBin || '') || !/^[A-Za-z0-9]{4,30}$/.test(accountNumber || '') || !String(accountName || '').trim() || accountName.length > 150) fail(400,'Thông tin tài khoản nhận tiền không hợp lệ (mã BIN ngân hàng gồm 6 số)');
        await inTransaction(await getPool(), async tx => {
            await tx.request().input('Bin',sql.VarChar(6),bankBin).input('Number',sql.VarChar(30),accountNumber).input('Name',sql.NVarChar(150),accountName.trim())
                .query(`IF EXISTS(SELECT 1 FROM PaymentConfiguration WITH(UPDLOCK,HOLDLOCK) WHERE ConfigKey='PRIMARY')
                    UPDATE PaymentConfiguration SET BankBin=@Bin,AccountNumber=@Number,AccountName=@Name WHERE ConfigKey='PRIMARY';
                    ELSE INSERT PaymentConfiguration VALUES('PRIMARY',@Bin,@Number,@Name);`);
        });
        res.json({success:true,message:'Đã lưu tài khoản nhận tiền'});
    } catch(error){next(error);}
};
