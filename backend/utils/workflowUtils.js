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
async function notifyUsers(transaction, { senderId, title, content, userIds }) {
    if (!userIds.length) return;
    const result = await transaction.request().input('SenderID', sql.Int, senderId)
        .input('Title', sql.NVarChar(200), title).input('Content', sql.NVarChar(sql.MAX), content)
        .query(`INSERT Notification(SenderID,Title,Content,CreatedDate,TargetScope)
                OUTPUT INSERTED.NotificationID VALUES((SELECT EmployeeID FROM Employee WHERE UserID=@SenderID AND Status=1),@Title,@Content,GETDATE(),'USER');`);
    for (const userId of new Set(userIds)) {
        await transaction.request().input('NotificationID', sql.Int, result.recordset[0].NotificationID)
            .input('UserID', sql.Int, userId)
            .query('INSERT NotificationReceiver(NotificationID,UserID,IsRead) VALUES(@NotificationID,@UserID,0)');
    }
}
module.exports = { fail, positiveId, inTransaction, notifyUsers };
