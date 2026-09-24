const {sql}=require('../config/db');
const {inTransaction,fail}=require('../utils/workflowUtils');
const email=require('./emailService');

async function createDelivery(pool,userId,payload,sendEmail=email.sendNotificationEmail){
    const {title,content,targetScope='ALL',targetUserIds=[],targetBuildingIds=[],channels=['WEB'],entityType=null,entityId=null,targetPage=null,actionUrl=null}=payload;
  const selectedChannels=Array.isArray(channels)?[...new Set(channels.map(channel=>String(channel).toUpperCase()))]:[];
    if(typeof title!=='string'||!title.trim()||title.length>200||typeof content!=='string'||!content.trim()||content.length>20000) fail(400,'Tiêu đề/nội dung không hợp lệ');
  if(!selectedChannels.length||selectedChannels.some(c=>!['WEB','EMAIL'].includes(c))) fail(400,'Chọn ít nhất một kênh WEB/EMAIL');
    if(!['ALL','USER','BUILDING'].includes(targetScope)) fail(400,'Đối tượng nhận không hợp lệ');
    const ids=targetScope==='USER'?targetUserIds:targetScope==='BUILDING'?targetBuildingIds:[];
    if(!Array.isArray(ids)||(targetScope!=='ALL'&&!ids.length)||ids.some(id=>!Number.isInteger(Number(id))||Number(id)<=0)) fail(400,'Danh sách người nhận không hợp lệ');
    if(entityType!==null&&(!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(entityType)||!Number.isInteger(Number(entityId))||Number(entityId)<=0)) fail(400,'Metadata không hợp lệ');
    if(targetPage!==null&&!/^[a-z][a-z0-9-]{0,99}$/.test(targetPage)) fail(400,'Trang đích không hợp lệ');
    if(actionUrl!==null&&(typeof actionUrl!=='string'||actionUrl.length>500||!actionUrl.startsWith('/')||actionUrl.startsWith('//'))) fail(400,'Liên kết phải là đường dẫn nội bộ');
    const web=selectedChannels.includes('WEB'), mail=selectedChannels.includes('EMAIL');
    const saved=await inTransaction(pool,async tx=>{
        const recipients=(await tx.request().input('Scope',sql.VarChar(10),targetScope).input('IDs',sql.NVarChar(sql.MAX),JSON.stringify(ids.map(Number))).query(`
          SELECT u.UserID,u.Email AccountEmail,MAX(r.Email) ResidentEmail FROM Users u JOIN Resident r ON r.UserID=u.UserID AND r.Status=1
          WHERE u.Status=1 AND (@Scope='ALL' OR (@Scope='USER' AND u.UserID IN (SELECT CONVERT(int,value) FROM OPENJSON(@IDs)))
            OR (@Scope='BUILDING' AND EXISTS(SELECT 1 FROM Contract c JOIN Apartment a ON a.ApartmentID=c.ApartmentID JOIN Floor f ON f.FloorID=a.FloorID
              WHERE c.StatusID IN (2,5) AND CAST(GETDATE() AS date) BETWEEN c.StartDate AND c.EndDate
              AND (c.OwnerID=r.ResidentID OR EXISTS(SELECT 1 FROM ContractResident cr WHERE cr.ContractID=c.ContractID AND cr.ResidentID=r.ResidentID
                AND (cr.MoveInDate IS NULL OR cr.MoveInDate<=CAST(GETDATE() AS date)) AND (cr.MoveOutDate IS NULL OR cr.MoveOutDate>=CAST(GETDATE() AS date))))
              AND f.BuildingID IN (SELECT CONVERT(int,value) FROM OPENJSON(@IDs))))) GROUP BY u.UserID,u.Email`)).recordset;
        const n=(await tx.request().input('User',sql.Int,userId).input('Title',sql.NVarChar(200),title.trim()).input('Content',sql.NVarChar(sql.MAX),content)
            .input('Scope',sql.VarChar(10),targetScope).input('Type',sql.VarChar(50),entityType).input('ID',sql.Int,entityId===null?null:Number(entityId))
            .input('Page',sql.VarChar(100),targetPage).input('URL',sql.VarChar(500),actionUrl)
            .query(`INSERT Notification(SenderID,Title,Content,CreatedDate,TargetScope,EntityType,EntityID,TargetPage,ActionUrl)
              OUTPUT INSERTED.NotificationID VALUES((SELECT TOP 1 EmployeeID FROM Employee WHERE UserID=@User AND Status=1),@Title,@Content,GETDATE(),@Scope,@Type,@ID,@Page,@URL)`)).recordset[0].NotificationID;
        const deliveries=[];
        for(const r of recipients){
            if(web) await tx.request().input('N',sql.Int,n).input('U',sql.Int,r.UserID).query(`INSERT NotificationReceiver(NotificationID,UserID,IsRead) VALUES(@N,@U,0);
              INSERT NotificationDelivery(NotificationID,UserID,Channel,Status,AttemptCount,SentAt) VALUES(@N,@U,'WEB','SENT',1,SYSDATETIME())`);
            if(mail){
                const recipient=email.recipientEmail(r);
                const d=(await tx.request().input('N',sql.Int,n).input('U',sql.Int,r.UserID).input('R',sql.NVarChar(320),recipient)
                    .query(`INSERT NotificationDelivery(NotificationID,UserID,Channel,Recipient,Status,ErrorMessage) OUTPUT INSERTED.*
                      VALUES(@N,@U,'EMAIL',@R,CASE WHEN @R IS NULL THEN 'SKIPPED' ELSE 'PENDING' END,CASE WHEN @R IS NULL THEN 'MISSING_EMAIL' END)`)).recordset[0];
                deliveries.push(d);
            }
        }
        return {notificationId:n,recipients,deliveries};
    });
    // SMTP happens only after the transaction commits. Each failure is isolated.
    const summary={notificationId:saved.notificationId,targetCount:saved.recipients.length,recipientsCount:saved.recipients.length,
        webDelivered:web?saved.recipients.length:0,emailSent:0,emailFailed:0,missingEmail:0,emailErrors:[],emailResults:[]};
    for(const d of saved.deliveries){
        if(d.Status==='SKIPPED'){summary.missingEmail++;continue;}
        let status='SENT',error=null,receipt=null;
        try{receipt=await sendEmail(d.Recipient,payload);summary.emailSent++;}
        catch(e){
            status='FAILED';
            const detail=email.deliveryError(e);
            error=detail.code;
            summary.emailFailed++;
            const existing=summary.emailErrors.find(item=>item.code===error);
            if(existing) existing.count++;
            else summary.emailErrors.push({...detail,count:1});
        }
        summary.emailResults.push({recipient:d.Recipient,status,messageId:receipt?.messageId||null});
        // Keep the SMTP receipt for diagnosis without logging content or credentials.
        console.info('Notification email delivery', {notificationId:saved.notificationId,deliveryId:d.DeliveryID,
            status,messageId:receipt?.messageId||null,response:receipt?.response||null,error});
        await pool.request().input('ID',sql.Int,d.DeliveryID).input('Status',sql.VarChar(10),status).input('Error',sql.NVarChar(500),error)
            .query("UPDATE NotificationDelivery SET Status=@Status,AttemptCount=AttemptCount+1,ErrorMessage=@Error,SentAt=CASE WHEN @Status='SENT' THEN SYSDATETIME() END WHERE DeliveryID=@ID");
    }
    return summary;
}
module.exports={createDelivery};
