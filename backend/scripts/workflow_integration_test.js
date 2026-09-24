// Exercises real Express routes, RBAC rows and SQL Server. All fixtures/mutations roll back.
require('dotenv').config({path:require('path').join(__dirname,'..','.env')});
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const db=require('../config/db');
const {sql}=db;
async function main(){
 const realPool=await db.getPool(),outer=new sql.Transaction(realPool);await outer.begin();
 const pool={request:()=>new sql.Request(outer),query:q=>new sql.Request(outer).query(q)};
 db.getPool=async()=>pool;
 let savepoint=0;
 // Controllers use nested transactions; savepoints keep every mutation inside the test rollback.
 sql.Transaction=class {
  constructor(){this.name=`workflow_${++savepoint}`;this.config=outer.config;}
  async begin(){await pool.request().query(`SAVE TRANSACTION ${this.name}`);}
  async commit(){}
  async rollback(){await pool.request().query(`ROLLBACK TRANSACTION ${this.name}`);}
  request(){return pool.request();}
  acquire(...args){return outer.acquire(...args);}
  release(...args){return outer.release(...args);}
 };
 const results=[];let server;
 try{
  const fixtures=await pool.request().query(`
   SELECT TOP 2 r.ResidentID,r.UserID FROM Resident r JOIN Users u ON u.UserID=r.UserID WHERE r.Status=1 AND u.Status=1 ORDER BY r.ResidentID;
   SELECT RoleID,RoleCode FROM Role WHERE Status=1;
   SELECT TOP 1 MethodID FROM PaymentMethod ORDER BY MethodID;
   SELECT TOP 1 PermissionID FROM Permission WHERE PermissionCode='PROFILE_UPDATE';
  `);
  assert(fixtures.recordsets[0].length===2,'Need two linked residents');
  const [a,b]=fixtures.recordsets[0],methodId=fixtures.recordsets[2][0].MethodID,permissionId=fixtures.recordsets[3][0].PermissionID;
  const users={RESIDENT:a.UserID,RESIDENT_B:b.UserID};
  for(const role of fixtures.recordsets[1]){
   if(role.RoleCode==='RESIDENT')continue;
   const result=await pool.request().input('Code',sql.VarChar(100),`TEST_${role.RoleCode}_${Date.now()}`).input('Role',sql.Int,role.RoleID)
    .input('Phone',sql.VarChar(15),`T${Date.now()}${Object.keys(users).length}`)
    .query(`DECLARE @UserID int; INSERT Users(Username,PasswordHash,Email,Phone,Status,CreatedAt) VALUES(@Code,'DISABLED_TEST_PASSWORD',CONCAT(@Code,'@test.invalid'),@Phone,1,GETDATE()); SET @UserID=SCOPE_IDENTITY();
     INSERT UserRole(UserID,RoleID,AssignedDate) VALUES(@UserID,@Role,GETDATE());
     INSERT Employee(UserID,FullName,Status) VALUES(@UserID,@Code,1); SELECT @UserID UserID;`);
   users[role.RoleCode]=result.recordset[0].UserID;
  }
  const contract=(await pool.request().input('Resident',sql.Int,a.ResidentID).query(`SELECT TOP 1 c.ContractID,c.ApartmentID FROM Contract c WHERE c.OwnerID=@Resident AND c.StatusID IN(2,5) AND CAST(GETDATE() AS date) BETWEEN StartDate AND EndDate`)).recordset[0];
  assert(contract,'Resident A needs an active owned contract');
  const otherApartment=(await pool.request().input('ID',sql.Int,contract.ApartmentID).query('SELECT TOP 1 ApartmentID FROM Apartment WHERE ApartmentID<>@ID ORDER BY ApartmentID')).recordset[0].ApartmentID;
  const invoice=(await pool.request().input('Contract',sql.Int,contract.ContractID).query(`INSERT Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus)
   OUTPUT INSERTED.InvoiceID VALUES(@Contract,1,2099,GETDATE(),DATEADD(day,10,GETDATE()),123456,1,'WAITING_PAYMENT')`)).recordset[0].InvoiceID;
  const equipment=(await pool.request().input('Contract',sql.Int,contract.ContractID).query(`INSERT ContractEquipment(ContractID,EquipmentName,Quantity,EquipmentStatus) OUTPUT INSERTED.ContractEquipmentID VALUES(@Contract,N'Test device',1,'operational')`)).recordset[0].ContractEquipmentID;
  const app=express();app.use(express.json());
  // SQL Server permits one request per transaction. Serialize test HTTP requests only.
  let requestQueue=Promise.resolve();
  app.use('/api',(req,res,next)=>{const previous=requestQueue;requestQueue=new Promise(resolve=>res.once('finish',resolve));previous.then(next);});
  app.use('/api',require('../routes'));app.use((e,req,res,next)=>res.status(e.statusCode||500).json({success:false,message:e.message}));
  app.use(express.static(process.env.TEST_FRONTEND_DIST || require('path').join(__dirname,'..','..','frontend','dist')));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(role,path,expected=200,method='GET',body){
   const token=jwt.sign({userId:users[role]},process.env.JWT_SECRET,{expiresIn:'15m'});
   const response=await fetch(`${base}/api${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const data=await response.json();results.push({role,method,path,status:response.status});
   assert.equal(response.status,expected,`${role} ${method} ${path}: ${JSON.stringify(data)}`);return data;
  }
  const paths=['/residents','/apartments','/contracts','/invoices','/vehicles','/vehicles/cards','/vehicles/history','/services','/services/gym/members','/services/pool/members','/services/wifi/members','/tickets','/feedbacks','/notifications','/users/roles','/users/permissions','/users/employees','/dashboard/stats'];
  const scopes={RESIDENT:['residents','apartments','contracts','invoices','vehicles','services','tickets','feedbacks','notifications','dashboard'],TECHNICIAN:['tickets','notifications','dashboard'],ACCOUNTANT:['residents','apartments','contracts','invoices','services','notifications','dashboard'],MANAGER:['residents','apartments','contracts','invoices','vehicles','services','tickets','feedbacks','notifications','dashboard','users/employees'],RECEPTION:['residents','apartments','contracts','invoices','vehicles','tickets','feedbacks','notifications','dashboard'],SECURITY:['vehicles','notifications']};
  for(const role of Object.keys(users).filter(r=>r!=='RESIDENT_B')){
   await call(role,'/auth/me');await call(role,'/auth/permissions');
   for(const path of paths){
    const key=path.startsWith('/users/')?path.slice(1):path.split('/')[1];
    const expected=role==='ADMIN'||scopes[role]?.includes(key)?200:403;
    await call(role,path,expected);
   }
   await call(role,'/auth/profile',200,'PUT',{});
   await call(role,'/auth/change-password',400,'POST',{oldPassword:'incorrect',newPassword:'Testing123!'});
  }
  await call('RESIDENT',`/apartments/${otherApartment}`,404);
  const apartment=await call('RESIDENT',`/apartments/${contract.ApartmentID}`);assert(apartment.data.Equipment.some(e=>e.EquipmentID===equipment));
  await call('RESIDENT',`/apartments/${contract.ApartmentID}`,403,'PUT',{area:50});
  await call('RESIDENT','/apartments/buildings',403,'POST',{});
  // Real role CRUD, duplicate IDs, rollback on invalid permission, protected and occupied roles.
  const role=(await call('ADMIN','/users/roles',201,'POST',{roleCode:`TEST_ROLE_${Date.now()}`,roleName:'Test role',permissionIds:[permissionId,permissionId]})).data.roleId;
  await call('ADMIN',`/users/roles/${role}`,200,'PUT',{roleName:'Updated role',status:0});
  await call('ADMIN',`/users/roles/${role}/permissions`,400,'PUT',{permissionIds:[2147483647]});
  assert.deepEqual((await call('ADMIN',`/users/roles/${role}/permissions`)).data,[permissionId]);
  await call('ADMIN',`/users/roles/${role}`,200,'DELETE');
  await call('ADMIN',`/users/roles/${role}`,404,'DELETE');
  const residentRole=fixtures.recordsets[1].find(r=>r.RoleCode==='RESIDENT').RoleID;
  await call('ADMIN',`/users/roles/${residentRole}`,409,'DELETE');
  const used=(await call('ADMIN','/users/roles',201,'POST',{roleCode:`TEST_USED_${Date.now()}`,roleName:'Used role'})).data.roleId;
  await pool.request().input('RoleID',sql.Int,used).input('UserID',sql.Int,users.SECURITY).query('INSERT UserRole(UserID,RoleID) VALUES(@UserID,@RoleID)');
  assert.match((await call('ADMIN',`/users/roles/${used}`,409,'DELETE')).message,/1 người dùng/);
  const staffRole=fixtures.recordsets[1].find(r=>r.RoleCode==='SECURITY').RoleID;
  await pool.request().query('SAVE TRANSACTION staff_delete_test');
  await pool.request().input('ID',sql.Int,staffRole).query('DELETE UserRole WHERE RoleID=@ID');
  await call('ADMIN',`/users/roles/${staffRole}`,200,'DELETE');
  assert.equal((await pool.request().input('ID',sql.Int,staffRole).query('SELECT COUNT(*) n FROM RolePermission WHERE RoleID=@ID')).recordset[0].n,0);
  await pool.request().query('ROLLBACK TRANSACTION staff_delete_test');
  // Resident invoice/payment isolation and idempotency.
  await call('RESIDENT_B',`/invoices/${invoice}/payment-info`,404);
  await call('RESIDENT_B',`/invoices/${invoice}/payment-submission`,404,'POST');
  await call('RESIDENT',`/invoices/${invoice}/confirm-payment`,403,'POST',{methodId});
  await call('ADMIN','/invoices/payment-config',200,'PUT',{bankBin:'970436',accountNumber:'1234567890',accountName:'TEST ONLY'});
  assert((await call('RESIDENT',`/invoices/${invoice}/payment-info`)).data.qrUrl);
  assert.equal((await call('ACCOUNTANT',`/invoices/${invoice}/payment-info`)).data.qrUrl,null);
  await call('RESIDENT',`/invoices/${invoice}/payment-submission`,201,'POST');
  await call('RESIDENT',`/invoices/${invoice}/payment-submission`,409,'POST');
  assert.equal((await call('RESIDENT',`/invoices/${invoice}`)).data.StatusID,1);
  const inbox=await call('ACCOUNTANT','/notifications');assert(inbox.data.some(n=>n.Title.includes(`#${invoice}`)));
  await call('ACCOUNTANT',`/invoices/${invoice}/confirm-payment`,200,'POST',{methodId});
  await call('MANAGER',`/invoices/${invoice}/confirm-payment`,409,'POST',{methodId});
  assert.equal((await call('RESIDENT',`/invoices/${invoice}`)).data.StatusID,2);
  assert.equal((await pool.request().input('ID',sql.Int,invoice).query('SELECT COUNT(*) n FROM Payment WHERE InvoiceID=@ID')).recordset[0].n,1);
  // Support request complete workflow and cross-user denial.
  await call('RESIDENT','/tickets',403,'POST',{apartmentId:otherApartment,title:'Invalid apartment'});
  await call('RESIDENT','/tickets',404,'POST',{apartmentId:contract.ApartmentID,equipmentId:2147483647,title:'Invalid device'});
  const ticket=(await call('RESIDENT','/tickets',201,'POST',{apartmentId:contract.ApartmentID,equipmentId:equipment,title:'Workflow test',residentId:b.ResidentID})).data.ticketId;
  assert.equal((await call('RESIDENT',`/tickets/${ticket}`)).data.ContractEquipmentID,equipment);
  assert.equal((await call('RESIDENT',`/tickets/${ticket}`)).data.ResidentID,a.ResidentID);
  await call('RESIDENT_B',`/tickets/${ticket}`,404);
  await call('RESIDENT',`/tickets/${ticket}`,403,'PUT',{statusId:2});
  assert((await call('TECHNICIAN','/tickets?search=Workflow')).data.some(t=>t.RequestID===ticket));
  await call('TECHNICIAN',`/tickets/${ticket}`,409,'PUT',{statusId:3});
  await call('TECHNICIAN',`/tickets/${ticket}`,200,'PUT',{statusId:2});
  await call('TECHNICIAN',`/tickets/${ticket}`,400,'PUT',{statusId:2});
  await call('TECHNICIAN',`/tickets/${ticket}`,200,'PUT',{statusId:2,progress:50,response:'Half finished'});
  await call('TECHNICIAN',`/tickets/${ticket}`,200,'PUT',{statusId:3,response:'Completed'});
  await call('TECHNICIAN',`/tickets/${ticket}`,409,'PUT',{statusId:3});
  const final=(await call('RESIDENT',`/tickets/${ticket}`)).data;assert.equal(final.Progress,100);assert.equal(final.AssignedUserID,users.TECHNICIAN);assert.equal(final.Updates.length,3);assert(final.CompletedAt);
  const feedback=(await call('RESIDENT','/feedbacks',201,'POST',{title:'Test feedback',content:'Feedback test',rating:5})).data.feedbackId;
  await call('RESIDENT',`/feedbacks/${feedback}/reply`,403,'PUT',{reply:'Not allowed'});
  await call('MANAGER',`/feedbacks/${feedback}/reply`,200,'PUT',{reply:'Reviewed'});
  await call('RESIDENT_B',`/feedbacks/${feedback}`,404);
  // Service registration uses actual active services and own contracts.
  const service=(await pool.request().query("SELECT TOP 1 ServiceID FROM Service WHERE Status=1 ORDER BY ServiceID")).recordset[0];
  if(service){
   await pool.request().input('ID',sql.Int,contract.ContractID).input('Service',sql.Int,service.ServiceID).query('UPDATE ServiceRegistration SET Status=0 WHERE ContractID=@ID AND ServiceID=@Service');
   await call('RESIDENT_B','/services/register',404,'POST',{contractId:contract.ContractID,serviceId:service.ServiceID});
   const registration=(await call('RESIDENT','/services/register',201,'POST',{contractId:contract.ContractID,serviceId:service.ServiceID,quantity:1})).data.registrationId;
   await call('RESIDENT','/services/register',409,'POST',{contractId:contract.ContractID,serviceId:service.ServiceID});
   await call('RESIDENT_B',`/services/unregister/${registration}`,404,'PUT',{});
   await call('RESIDENT',`/services/unregister/${registration}`,200,'PUT',{});
  }
  const year=(await pool.request().query('SELECT YEAR(GETDATE()) year')).recordset[0].year;
  const revenue=(await call('ACCOUNTANT',`/dashboard/revenue?year=${year}&period=year`)).data;
  const actual=(await pool.request().input('Year',sql.Int,year).query('SELECT ISNULL(SUM(p.Amount),0) amount FROM Payment p JOIN Invoice i ON i.InvoiceID=p.InvoiceID WHERE p.StatusID=2 AND i.StatusID<>4 AND YEAR(p.PaymentDate)=@Year')).recordset[0].amount;
  assert.equal(revenue.summary.total,actual);assert(revenue.payments.some(p=>p.InvoiceID===invoice));
  assert.equal((await call('ADMIN','/dashboard/revenue?year=1900')).data.summary.total,0);
  await call('ADMIN','/dashboard/revenue?year=bad',400);
  await call('RESIDENT',`/dashboard/revenue?year=${year}`,403);
  const system=(await call('ADMIN','/users/system-info')).data;assert(system.database);await call('RESIDENT','/users/system-info',403);
  const dashboard=(await call('RESIDENT','/dashboard/stats')).data;
  const financial=(await call('RESIDENT','/dashboard/financial')).data;
  const ownInvoices=(await call('RESIDENT','/invoices?pageSize=100')).data.filter(i=>i.StatusID!==4&&i.WorkflowStatus!=='DRAFT'&&i.RemainingAmount>0);
  assert.equal(dashboard.residentSummary.unpaidInvoiceCount,ownInvoices.length);
  assert.equal(dashboard.residentSummary.outstandingAmount,ownInvoices.reduce((sum,i)=>sum+i.RemainingAmount,0));
  assert.equal(financial.outstanding.Outstanding,dashboard.residentSummary.outstandingAmount);
  const ownApts=(await call('RESIDENT','/apartments')).data;
  assert(dashboard.residentDetails.apartments.every(a=>ownApts.some(own=>own.ApartmentID===a.ApartmentID)));
  await call('ADMIN',`/users/accounts/${users.TECHNICIAN}`,200,'PUT',{fullName:'Updated technician',status:1});
  await call('MANAGER',`/users/accounts/${users.TECHNICIAN}`,403,'PUT',{roleIds:[residentRole]});
  if(process.argv.includes('--extended')) await require('./testExtendedWorkflows')({pool,sql,call,users,contract,a,b,methodId});
  if(process.argv.includes('--audit')) await require('./testProjectAudit')({pool,sql,call,users,contract,a,b});
  console.log(JSON.stringify({passed:results.length,roles:Object.keys(users),results},null,2));
  if(process.argv.includes('--browser')){
   const browserInvoice=(await pool.request().input('Contract',sql.Int,contract.ContractID).query(`INSERT Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus) OUTPUT INSERTED.InvoiceID VALUES(@Contract,2,2099,DATEADD(day,-10,GETDATE()),DATEADD(day,-1,GETDATE()),45678,3,'WAITING_PAYMENT')`)).recordset[0].InvoiceID;
   const requestedDate=(await pool.request().query("SELECT CONVERT(varchar(10),DATEADD(day,20,GETDATE()),23) d")).recordset[0].d;
   await require('./workflow_browser_test')({base,extensionInvoiceId:browserInvoice,requestedDate,users:Object.fromEntries(Object.entries(users).map(([role,id])=>[role,jwt.sign({userId:id},process.env.JWT_SECRET,{expiresIn:'15m'})]))});
  }
 }catch(error){ console.error('WORKFLOW FAILURE:',error);throw error; }finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  try { await outer.rollback(); }
  catch(error) { if(error.code!=='EABORT') throw error; }
  finally { await db.closePool(); }
  console.log('ALL WORKFLOW TEST DATA ROLLED BACK');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
