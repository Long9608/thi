const {getPool,sql}=require('../config/db');
const {fail,positiveId,inTransaction}=require('../utils/workflowUtils');
const {hashPassword}=require('../utils/passwordUtils');
exports.updateAccount=async(req,res,next)=>{
 try{
  const id=positiveId(req.params.id),body=req.body;
  if(body.roleIds!==undefined&&!(req.user.Permissions||[]).includes('ROLE_MANAGE'))fail(403,'Cần quyền ROLE_MANAGE để gán vai trò');
  if(body.roleIds!==undefined&&!Array.isArray(body.roleIds))fail(400,'Danh sách vai trò không hợp lệ');
  if(body.password&&(typeof body.password!=='string'||body.password.length<6))fail(400,'Mật khẩu phải có ít nhất 6 ký tự');
  if(body.fullName!==undefined&&(!String(body.fullName).trim()||String(body.fullName).length>100))fail(400,'Họ tên không hợp lệ');
  const password=body.password?await hashPassword(body.password):null;
  await inTransaction(await getPool(),async tx=>{
   const current=(await tx.request().input('ID',sql.Int,id).query(`SELECT u.*,r.ResidentID FROM Users u WITH(UPDLOCK,HOLDLOCK) LEFT JOIN Resident r ON r.UserID=u.UserID WHERE u.UserID=@ID`)).recordset[0];
   if(!current)fail(404,'Không tìm thấy tài khoản');
   let roles;
   if(body.roleIds!==undefined){
    const ids=[...new Set(body.roleIds.map(positiveId))];
    roles=(await tx.request().input('IDs',sql.NVarChar(sql.MAX),JSON.stringify(ids)).query('SELECT RoleID,RoleCode FROM Role WHERE Status=1 AND RoleID IN(SELECT value FROM OPENJSON(@IDs))')).recordset;
    if(roles.length!==ids.length||!roles.length)fail(400,'Phải chọn ít nhất một vai trò đang hoạt động');
   }else roles=(await tx.request().input('ID',sql.Int,id).query('SELECT r.RoleID,r.RoleCode FROM Role r JOIN UserRole ur ON ur.RoleID=r.RoleID WHERE ur.UserID=@ID')).recordset;
   const residentRole=roles.some(r=>r.RoleCode==='RESIDENT');
   if(residentRole&&roles.length!==1)fail(400,'Tài khoản cư dân chỉ được gán vai trò Cư dân');
   if(current.ResidentID&&!residentRole)fail(409,'Tài khoản đã liên kết cư dân không được chuyển thành nhân viên');
   const residentId=current.ResidentID || (body.residentId?positiveId(body.residentId):null);
   if(residentRole&&!residentId)fail(400,'Hãy chọn hồ sơ cư dân để liên kết tài khoản');
   if(!residentRole&&body.residentId)fail(400,'Chỉ tài khoản Cư dân được liên kết hồ sơ cư dân');
   if(current.ResidentID&&body.residentId&&Number(body.residentId)!==current.ResidentID)fail(409,'Không được đổi chủ hồ sơ của tài khoản cư dân');
   const status=body.status===undefined?Number(current.Status):Number(body.status);
   if(![0,1].includes(status))fail(400,'Trạng thái không hợp lệ');
   if(id===req.userId){
    const existing=(await tx.request().input('ID',sql.Int,id).query('SELECT RoleID FROM UserRole WHERE UserID=@ID')).recordset.map(r=>r.RoleID).sort((a,b)=>a-b);
    const unchanged=JSON.stringify(existing)===JSON.stringify(roles.map(r=>r.RoleID).sort((a,b)=>a-b));
    if(!status||!unchanged)fail(409,'Không được tự khóa tài khoản hoặc thay đổi vai trò của mình');
   }
   const wasAdmin=(await tx.request().input('ID',sql.Int,id).query("SELECT 1 FROM UserRole ur JOIN Role r ON r.RoleID=ur.RoleID WHERE ur.UserID=@ID AND r.RoleCode='ADMIN'")).recordset.length;
   if(wasAdmin&&(!status||!roles.some(r=>r.RoleCode==='ADMIN'))){
    const other=(await tx.request().input('ID',sql.Int,id).query("SELECT 1 FROM Users u WITH(UPDLOCK,HOLDLOCK) JOIN UserRole ur ON ur.UserID=u.UserID JOIN Role r ON r.RoleID=ur.RoleID WHERE u.UserID<>@ID AND u.Status=1 AND r.RoleCode='ADMIN' AND r.Status=1")).recordset;
    if(!other.length)fail(409,'Phải giữ ít nhất một tài khoản Admin đang hoạt động');
   }
   if(residentRole&&!current.ResidentID){
    const linked=await tx.request().input('ID',sql.Int,id).input('Resident',sql.Int,residentId).query('UPDATE Resident SET UserID=@ID WHERE ResidentID=@Resident AND UserID IS NULL AND Status=1');
    if(linked.rowsAffected[0]!==1)fail(409,'Cư dân đã có tài khoản hoặc không còn hoạt động');
    await tx.request().input('ID',sql.Int,id).query('UPDATE Employee SET Status=0 WHERE UserID=@ID');
   }
   const email=body.email===undefined?current.Email:body.email||null,phone=body.phone===undefined?current.Phone:body.phone||null;
   const duplicate=await tx.request().input('ID',sql.Int,id).input('Email',sql.VarChar(100),email).input('Phone',sql.VarChar(20),phone)
    .query('SELECT 1 FROM Users WHERE UserID<>@ID AND ((Email=@Email AND @Email IS NOT NULL) OR (Phone=@Phone AND @Phone IS NOT NULL))');
   if(duplicate.recordset.length)fail(409,'Email hoặc số điện thoại đã được tài khoản khác sử dụng');
   await tx.request().input('ID',sql.Int,id).input('Email',sql.VarChar(100),email).input('Phone',sql.VarChar(20),phone).input('Status',sql.Bit,status).input('Password',sql.VarChar(255),password)
    .query('UPDATE Users SET Email=@Email,Phone=@Phone,Status=@Status,PasswordHash=COALESCE(@Password,PasswordHash) WHERE UserID=@ID');
   const table=residentRole?'Resident':'Employee';
   const updates=['Email=@Email','Phone=@Phone'];const request=tx.request().input('ID',sql.Int,id).input('Email',sql.VarChar(100),email).input('Phone',sql.VarChar(20),phone);
   for(const [key,column,type] of [['fullName','FullName',sql.NVarChar(100)],['address','Address',sql.NVarChar(255)],['birthDate','BirthDate',sql.Date],['gender','Gender',sql.Bit]]){
    if(body[key]!==undefined){updates.push(`${column}=@${column}`);request.input(column,type,body[key]===''?null:body[key]);}
   }
   if(!residentRole){
    updates.push('Status=@Status');request.input('Status',sql.Bit,status);
    if(body.cccd!==undefined){updates.push('CCCD=@CCCD');request.input('CCCD',sql.VarChar(20),body.cccd||null);}
    if(body.hireDate!==undefined){updates.push('HireDate=@HireDate');request.input('HireDate',sql.Date,body.hireDate||null);}
   }
   await request.query(`UPDATE ${table} SET ${updates.join(',')} WHERE UserID=@ID`);
   if(body.roleIds!==undefined){
    await tx.request().input('ID',sql.Int,id).query('DELETE UserRole WHERE UserID=@ID');
    for(const role of roles)await tx.request().input('ID',sql.Int,id).input('RoleID',sql.Int,role.RoleID).input('Actor',sql.Int,req.userId).query('INSERT UserRole(UserID,RoleID,AssignedDate,AssignedBy) VALUES(@ID,@RoleID,GETDATE(),@Actor)');
   }
  });
  res.json({success:true,message:'Đã cập nhật tài khoản và hồ sơ liên kết'});
 }catch(error){next(error);}
};
