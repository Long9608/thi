const { getPool, sql } = require('../config/db');
const { positiveId, fail, inTransaction } = require('../utils/workflowUtils');
exports.registerService = async(req,res,next)=>{
    try {
        const contractId=positiveId(req.body.contractId),serviceId=positiveId(req.body.serviceId),quantity=Number(req.body.quantity ?? 1);
        const start=req.body.registerDate || new Date().toISOString().slice(0,10),end=req.body.endDate || null;
        if(!Number.isInteger(quantity)||quantity<1||quantity>1000||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||(end&&(!Number.isFinite(Date.parse(end))||end<start))) fail(400,'Số lượng hoặc thời gian đăng ký không hợp lệ');
        const registrationId=await inTransaction(await getPool(),async tx=>{
            const contract=(await tx.request().input('ID',sql.Int,contractId).input('Start',sql.Date,start).input('End',sql.Date,end)
                .query(`SELECT ContractID FROM Contract WITH(UPDLOCK,HOLDLOCK) WHERE ContractID=@ID AND StatusID IN(2,5)
                    AND CAST(GETDATE() AS date) BETWEEN StartDate AND EndDate AND @Start BETWEEN StartDate AND EndDate AND (@End IS NULL OR @End<=EndDate)`)).recordset[0];
            if(!contract) fail(400,'Thời gian đăng ký phải thuộc hợp đồng đang còn hiệu lực');
            if(!(await tx.request().input('ID',sql.Int,serviceId).query('SELECT ServiceID FROM Service WHERE ServiceID=@ID AND Status=1')).recordset.length) fail(400,'Dịch vụ không tồn tại hoặc đã ngừng hoạt động');
            if((await tx.request().input('ContractID',sql.Int,contractId).input('ServiceID',sql.Int,serviceId)
                .query('SELECT 1 FROM ServiceRegistration WITH(UPDLOCK,HOLDLOCK) WHERE ContractID=@ContractID AND ServiceID=@ServiceID AND Status=1 AND (EndDate IS NULL OR EndDate>=CAST(GETDATE() AS date))')).recordset.length) fail(409,'Căn hộ đã đăng ký dịch vụ này');
            const result=await tx.request().input('ContractID',sql.Int,contractId).input('ServiceID',sql.Int,serviceId).input('Start',sql.Date,start).input('End',sql.Date,end).input('Quantity',sql.Int,quantity)
                .query('INSERT ServiceRegistration(ContractID,ServiceID,RegisterDate,EndDate,Quantity,Status) OUTPUT INSERTED.RegistrationID VALUES(@ContractID,@ServiceID,@Start,@End,@Quantity,1)');
            return result.recordset[0].RegistrationID;
        });
        res.status(201).json({success:true,data:{registrationId},message:'Đã đăng ký dịch vụ'});
    }catch(error){next(error);}
};
exports.unregisterService=async(req,res,next)=>{
    try {
        const id=positiveId(req.params.id);
        const result=await (await getPool()).request().input('ID',sql.Int,id)
            .query(`UPDATE ServiceRegistration SET Status=0,EndDate=CASE WHEN RegisterDate>CAST(GETDATE() AS date) THEN RegisterDate ELSE CAST(GETDATE() AS date) END WHERE RegistrationID=@ID AND Status=1`);
        if(!result.rowsAffected[0]) fail(409,'Đăng ký không tồn tại hoặc đã hủy');
        res.json({success:true,message:'Đã hủy đăng ký dịch vụ'});
    }catch(error){next(error);}
};
