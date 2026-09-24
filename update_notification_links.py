from pathlib import Path
p=Path('backend/controllers/contractController.js');s=p.read_text(encoding='utf-8');s="const { notifyUsers } = require('../utils/workflowUtils');\n"+s
start=s.index('                        DELETE p\n');end=s.index('                        UPDATE ServiceRegistration',start)
s=s[:start]+'''                        -- Preserve financial history and extension audit when a contract ends.
                        UPDATE i SET StatusID=4 FROM Invoice i
                        WHERE i.ContractID=@ContractID AND i.StatusID<>2
                          AND NOT EXISTS(SELECT 1 FROM InvoicePaymentSubmission ps WHERE ps.InvoiceID=i.InvoiceID AND ps.ConfirmedAt IS NULL);
                        UPDATE er SET Status='CANCELLED',UpdatedAt=SYSDATETIME()
                        FROM InvoiceDueDateExtensionRequest er JOIN Invoice i ON i.InvoiceID=er.InvoiceID
                        WHERE i.ContractID=@ContractID AND i.StatusID=4 AND er.Status='PENDING';

'''+s[end:]
s=s.replace('console.log(`Cleaned ${invoiceIds.recordset.length} invoices', 'console.log(`Preserved ${invoiceIds.recordset.length} invoices')
marker='''        await transaction.commit();
        res.json({ success: true, message: 'Contract updated successfully' });'''
replacement='''        const recipients = (await transaction.request().input('ContractID',sql.Int,id).query(`SELECT DISTINCT r.UserID FROM Resident r
          JOIN Contract c ON c.OwnerID=r.ResidentID OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=r.ResidentID
            AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date)))
          WHERE c.ContractID=@ContractID AND r.Status=1 AND r.UserID IS NOT NULL`)).recordset;
        await notifyUsers(transaction,{senderId:req.userId,title:`Hợp đồng #${id} được cập nhật`,content:'Ban quản lý đã cập nhật hợp đồng. Vui lòng xem chi tiết.',
          userIds:recipients.map(r=>r.UserID),entityType:'Contract',entityId:Number(id),targetPage:'contract-list'});
        await transaction.commit();
        res.json({ success: true, message: 'Contract updated successfully' });'''
assert marker in s;s=s.replace(marker,replacement)
p.write_text(s,encoding='utf-8')
p=Path('backend/controllers/feedbackController.js');s=p.read_text(encoding='utf-8');s="const { inTransaction, notifyUsers, fail } = require('../utils/workflowUtils');\n"+s
start=s.index('    const result = await pool.request()',s.index('exports.updateFeedbackReply'));end=s.index('    res.json({',start)
s=s[:start]+'''    await inTransaction(pool,async tx=>{
      const result=await tx.request().input('FeedbackID',sql.Int,id).input('Reply',sql.NVarChar(sql.MAX),reply)
        .query('UPDATE Feedback SET Reply=@Reply WHERE FeedbackID=@FeedbackID');
      if(!result.rowsAffected[0]) fail(404,'Không tìm thấy phản ánh');
      const recipients=(await tx.request().input('ID',sql.Int,id).query('SELECT r.UserID FROM Feedback f JOIN Resident r ON r.ResidentID=f.ResidentID WHERE f.FeedbackID=@ID AND r.UserID IS NOT NULL')).recordset;
      await notifyUsers(tx,{senderId:req.userId,title:`Phản ánh #${id} đã được trả lời`,content:reply,userIds:recipients.map(r=>r.UserID),entityType:'Feedback',entityId:Number(id),targetPage:'feedbacks'});
    });

'''+s[end:];p.write_text(s,encoding='utf-8')
