const { sql } = require('../config/db');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const positiveId = value => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) fail(400, 'ID không hợp lệ');
    return id;
};
async function inTransaction(pool, work) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const result = await work(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}
async function notifyUsers(transaction, { senderId, title, content, userIds, entityType = null, entityId = null, targetPage = null, actionUrl = null }) {
    if (!userIds.length) return;
    const result = await transaction.request().input('SenderID', sql.Int, senderId)
        .input('Title', sql.NVarChar(200), title).input('Content', sql.NVarChar(sql.MAX), content)
        .input('EntityType', sql.VarChar(50), entityType).input('EntityID', sql.Int, entityId)
        .input('TargetPage', sql.VarChar(100), targetPage).input('ActionUrl', sql.VarChar(500), actionUrl)
        .query(`INSERT Notification(SenderID,Title,Content,CreatedDate,TargetScope,EntityType,EntityID,TargetPage,ActionUrl)
            OUTPUT INSERTED.NotificationID VALUES((SELECT EmployeeID FROM Employee WHERE UserID=@SenderID AND Status=1),@Title,@Content,GETDATE(),'USER',@EntityType,@EntityID,@TargetPage,@ActionUrl);`);
    for (const userId of new Set(userIds)) {
        await transaction.request().input('NotificationID', sql.Int, result.recordset[0].NotificationID)
            .input('UserID', sql.Int, userId)
            .query(`INSERT NotificationReceiver(NotificationID,UserID,IsRead) VALUES(@NotificationID,@UserID,0);
              INSERT NotificationDelivery(NotificationID,UserID,Channel,Status,AttemptCount,SentAt) VALUES(@NotificationID,@UserID,'WEB','SENT',1,SYSDATETIME())`);
    }
}
module.exports = { fail, positiveId, inTransaction, notifyUsers };
