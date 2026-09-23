const { getPool, sql } = require('../config/db');
const { fail, positiveId, inTransaction } = require('../utils/workflowUtils');

function permissionIds(req) {
    if (req.body.permissionIds === undefined) return undefined;
    if (!(req.user.Permissions || []).includes('PERMISSION_MANAGE')) fail(403,'Cần quyền PERMISSION_MANAGE để gán quyền');
    if (!Array.isArray(req.body.permissionIds)) fail(400,'Danh sách quyền không hợp lệ');
    return [...new Set(req.body.permissionIds.map(positiveId))];
}
async function replacePermissions(tx, role, ids) {
    if(ids === undefined) return;
    const permissions=(await tx.request().input('IDs',sql.NVarChar(sql.MAX),JSON.stringify(ids))
        .query('SELECT PermissionID,PermissionCode FROM Permission WHERE PermissionID IN(SELECT value FROM OPENJSON(@IDs))')).recordset;
    if(permissions.length!==ids.length) fail(400,'Có quyền không tồn tại; chưa lưu thay đổi');
    if(role.RoleCode==='ADMIN' && ['ROLE_MANAGE','PERMISSION_MANAGE','SYSTEM_SETTING'].some(code=>!permissions.some(p=>p.PermissionCode===code)))
        fail(409,'Vai trò Admin phải giữ quyền quản trị vai trò, phân quyền và hệ thống');
    if(role.RoleCode==='RESIDENT' && permissions.some(p=>p.PermissionCode.endsWith('_VIEW_ALL') || /^(EMPLOYEE_|ROLE_|PERMISSION_|SYSTEM_|REPORT_|AI_|MAINTENANCE_|DEVICE_|BUILDING_|FLOOR_)/.test(p.PermissionCode)))
        fail(400,'Không được gán quyền quản trị hoặc xem toàn bộ dữ liệu cho Cư dân');
    await tx.request().input('ID',sql.Int,role.RoleID).query('DELETE RolePermission WHERE RoleID=@ID');
    for(const id of ids) await tx.request().input('RoleID',sql.Int,role.RoleID).input('PermissionID',sql.Int,id)
        .query('INSERT RolePermission(RoleID,PermissionID,IsGranted,CreatedAt) VALUES(@RoleID,@PermissionID,1,GETDATE())');
}
async function readRole(tx,id) {
    const role=(await tx.request().input('ID',sql.Int,id).query('SELECT * FROM Role WITH(UPDLOCK,HOLDLOCK) WHERE RoleID=@ID')).recordset[0];
    if(!role) fail(404,'Không tìm thấy vai trò');
    return role;
}
exports.createRole = async(req,res,next) => {
    try {
        const roleCode=String(req.body.roleCode || '').trim().toUpperCase(), roleName=String(req.body.roleName || '').trim();
        if(!/^[A-Z][A-Z0-9_]{1,49}$/.test(roleCode) || !roleName || roleName.length>100) fail(400,'Mã hoặc tên vai trò không hợp lệ');
        const ids=permissionIds(req),status=req.body.status===undefined?1:Number(req.body.status);
        if(![0,1].includes(status)) fail(400,'Trạng thái không hợp lệ');
        const roleId=await inTransaction(await getPool(),async tx=>{
            if((await tx.request().input('Code',sql.VarChar(50),roleCode).query('SELECT 1 FROM Role WITH(UPDLOCK,HOLDLOCK) WHERE RoleCode=@Code')).recordset.length) fail(409,'Mã vai trò đã tồn tại');
            const role=(await tx.request().input('Code',sql.VarChar(50),roleCode).input('Name',sql.NVarChar(100),roleName)
                .input('Description',sql.NVarChar(500),String(req.body.description || '').slice(0,500)).input('Status',sql.Bit,status)
                .query('INSERT Role(RoleCode,RoleName,Description,Status,CreatedAt) OUTPUT INSERTED.* VALUES(@Code,@Name,@Description,@Status,GETDATE())')).recordset[0];
            await replacePermissions(tx,role,ids);
            return role.RoleID;
        });
        res.status(201).json({success:true,data:{roleId},message:'Đã tạo vai trò'});
    } catch(error){next(error);}
};
exports.updateRole = async(req,res,next)=>{
    try {
        const id=positiveId(req.params.id),ids=permissionIds(req);
        await inTransaction(await getPool(),async tx=>{
            const role=await readRole(tx,id),status=req.body.status===undefined?Number(role.Status):Number(req.body.status);
            const name=String(req.body.roleName ?? role.RoleName).trim();
            if(!name || name.length>100 || ![0,1].includes(status)) fail(400,'Tên hoặc trạng thái vai trò không hợp lệ');
            if(role.IsSystem && !status) fail(409,'Không được khóa vai trò hệ thống');
            await tx.request().input('ID',sql.Int,id).input('Name',sql.NVarChar(100),name).input('Status',sql.Bit,status)
                .input('Description',sql.NVarChar(500),String(req.body.description ?? role.Description ?? '').slice(0,500))
                .query('UPDATE Role SET RoleName=@Name,Description=@Description,Status=@Status WHERE RoleID=@ID');
            await replacePermissions(tx,role,ids);
        });
        res.json({success:true,message:'Đã cập nhật vai trò'});
    } catch(error){next(error);}
};
exports.deleteRole = async(req,res,next)=>{
    try {
        const id=positiveId(req.params.id);
        await inTransaction(await getPool(),async tx=>{
            const role=await readRole(tx,id);
            if(role.IsSystem || ['ADMIN','RESIDENT'].includes(role.RoleCode)) fail(409,'Không được xóa vai trò lõi của hệ thống');
            const userCount=(await tx.request().input('ID',sql.Int,id).query('SELECT COUNT(*) UserCount FROM UserRole WITH(UPDLOCK,HOLDLOCK) WHERE RoleID=@ID')).recordset[0].UserCount;
            if(userCount) fail(409,`Vai trò đang được sử dụng bởi ${userCount} người dùng. Hãy chuyển vai trò của người dùng trước khi xóa.`);
            await tx.request().input('ID',sql.Int,id).query('DELETE RolePermission WHERE RoleID=@ID; DELETE Role WHERE RoleID=@ID;');
        });
        res.json({success:true,message:'Đã xóa vai trò và quyền được gán'});
    } catch(error){
        if(error.number===547) return next(Object.assign(new Error('Vai trò còn được dữ liệu khác sử dụng, không thể xóa'),{statusCode:409}));
        next(error);
    }
};
exports.updateRolePermissions = async(req,res,next)=>{
    try {
        const id=positiveId(req.params.roleId),ids=permissionIds(req);
        if(ids===undefined) fail(400,'Vui lòng gửi danh sách quyền');
        await inTransaction(await getPool(),async tx=>replacePermissions(tx,await readRole(tx,id),ids));
        res.json({success:true,message:'Đã lưu quyền của vai trò'});
    } catch(error){next(error);}
};
