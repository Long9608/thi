// Loaded by the existing rollback-only integration harness. Never sends real email.
const assert=require('node:assert/strict');
module.exports=async({pool,sql,call,users,contract,a,b,methodId})=>{
 const dates=(await pool.request().query("SELECT CONVERT(varchar(10),DATEADD(day,15,GETDATE()),23) future")).recordset[0];
 const id=(await pool.request().input('C',sql.Int,contract.ContractID).query(`INSERT Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus)
  OUTPUT INSERTED.InvoiceID VALUES(@C,3,2099,DATEADD(day,-10,GETDATE()),DATEADD(day,-2,GETDATE()),100000,3,'WAITING_PAYMENT')`)).recordset[0].InvoiceID;
 const body={requestedDueDate:dates.future,reason:'Integration test extension'};
 assert.equal((await call('RESIDENT',`/invoices/${id}`)).data.IsOverdue,1);
 await call('RESIDENT_B',`/invoices/${id}/extensions`,404,'POST',body);
 await call('RESIDENT',`/invoices/${id}/extensions`,400,'POST',{...body,reason:''});
 await call('RESIDENT',`/invoices/${id}/extensions`,201,'POST',{...body,userId:users.RESIDENT_B});
 await call('RESIDENT',`/invoices/${id}/extensions`,409,'POST',body);
 const request=(await call('RESIDENT',`/invoices/${id}/extensions`)).data[0];assert.equal(request.RequestedByUserID,users.RESIDENT);
 const inbox=(await call('ACCOUNTANT','/notifications?limit=100')).data;assert(inbox.some(n=>n.EntityType==='Invoice'&&n.EntityID===id&&n.TargetPage==='fees'));
 await call('RESIDENT',`/invoices/${id}/extensions/review`,403,'POST',{decision:'APPROVED',approvedDueDate:dates.future});
 await call('ACCOUNTANT',`/invoices/${id}/extensions/review`,200,'POST',{requestId:request.RequestID,decision:'REJECTED',note:'Need supporting information'});
 await call('RESIDENT',`/invoices/${id}/extensions`,201,'POST',body);
 await call('ACCOUNTANT',`/invoices/${id}/extensions/review`,200,'POST',{decision:'APPROVED',approvedDueDate:dates.future,note:'Approved'});
 const extended=(await call('RESIDENT',`/invoices/${id}`)).data;assert.equal(extended.IsOverdue,0);assert.equal(extended.StatusID,1);assert.equal(extended.DueDate.slice(0,10),dates.future);
 assert((await call('RESIDENT','/notifications?limit=100')).data.some(n=>n.EntityID===id));
 await call('RESIDENT',`/invoices/${id}/extensions`,409,'POST',body);
 await call('RESIDENT',`/invoices/${id}/payment-submission`,201,'POST');
 await pool.request().input('ID',sql.Int,id).query('UPDATE Invoice SET DueDate=DATEADD(day,-1,GETDATE()),StatusID=3 WHERE InvoiceID=@ID');
 const pending=(await call('RESIDENT',`/invoices/${id}`)).data;assert(pending.IsOverdue&&pending.PaymentSubmittedAt);
 await call('ACCOUNTANT',`/invoices/${id}/extensions/review`,409,'POST',{decision:'APPROVED',approvedDueDate:dates.future,note:'Blocked by payment'});
 await call('ACCOUNTANT',`/invoices/${id}/confirm-payment`,200,'POST',{methodId});
 assert.equal((await call('RESIDENT',`/invoices/${id}`)).data.IsPaid,true);
 // Real recipient SQL and delivery logs; inject only SMTP so no external mail leaves the test.
 const {createDelivery}=require('../services/notificationDeliveryService');
 await pool.request().input('U',sql.Int,users.RESIDENT).input('R',sql.Int,a.ResidentID).query("UPDATE Users SET Email='resident@example.invalid' WHERE UserID=@U; UPDATE Resident SET Email='resident@example.invalid' WHERE ResidentID=@R");
 await pool.request().input('U',sql.Int,users.RESIDENT_B).input('R',sql.Int,b.ResidentID).query("UPDATE Users SET Email=NULL WHERE UserID=@U; UPDATE Resident SET Email=NULL WHERE ResidentID=@R");
 const payload={title:'Test delivery',content:'Nội dung tiếng Việt',targetScope:'USER',targetUserIds:[users.RESIDENT,users.RESIDENT_B],entityType:'Invoice',entityId:id,targetPage:'fees'};
 for(const channels of [['WEB'],['EMAIL'],['WEB','EMAIL']]){
  let sends=0;const result=await createDelivery(pool,users.ADMIN,{...payload,channels},async()=>{sends++;});
  assert.equal(result.targetCount,2);assert.equal(result.webDelivered,channels.includes('WEB')?2:0);assert.equal(sends,channels.includes('EMAIL')?1:0);assert.equal(result.missingEmail,channels.includes('EMAIL')?1:0);
  const count=(await pool.request().input('ID',sql.Int,result.notificationId).query('SELECT COUNT(*) n FROM NotificationReceiver WHERE NotificationID=@ID')).recordset[0].n;
  assert.equal(count,result.webDelivered);
 }
 const failed=await createDelivery(pool,users.ADMIN,{...payload,channels:['WEB','EMAIL']},async()=>{throw Object.assign(new Error('secret should not be logged'),{code:'EAUTH'});});
 assert.equal(failed.webDelivered,2);assert.equal(failed.emailFailed,1);
 const all=await createDelivery(pool,users.ADMIN,{...payload,targetScope:'ALL',channels:['WEB']});
 const expected=(await pool.request().query('SELECT COUNT(DISTINCT u.UserID) n FROM Users u JOIN Resident r ON r.UserID=u.UserID AND r.Status=1 WHERE u.Status=1')).recordset[0].n;assert.equal(all.targetCount,expected);
 const building=(await pool.request().input('ID',sql.Int,contract.ApartmentID).query('SELECT f.BuildingID FROM Apartment a JOIN Floor f ON f.FloorID=a.FloorID WHERE a.ApartmentID=@ID')).recordset[0].BuildingID;
 const scoped=await createDelivery(pool,users.ADMIN,{...payload,targetScope:'BUILDING',targetBuildingIds:[building],channels:['WEB']});assert(scoped.targetCount>0&&scoped.targetCount<=expected);
 await call('ADMIN','/notifications',400,'POST',{...payload,channels:[]});
 // >100 vehicles/cards: exercise effective backend cap and the actual frontend helper.
 const fs=require('fs');const source=fs.readFileSync(require('path').join(__dirname,'../../frontend/src/utils/fetchAllPages.js'),'utf8');
 const {fetchAllPages}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const type=(await pool.request().query('SELECT TOP 1 VehicleTypeID FROM VehicleType ORDER BY VehicleTypeID')).recordset[0].VehicleTypeID;
 await pool.request().input('R',sql.Int,a.ResidentID).input('T',sql.Int,type).query(`DECLARE @n int=1,@v int;
  WHILE @n<=105 BEGIN
   INSERT Vehicle(ResidentID,PlateNumber,VehicleTypeID,RegisterDate,Status) VALUES(@R,CONCAT('TEST-',@n),@T,GETDATE(),1); SET @v=SCOPE_IDENTITY();
   INSERT ParkingCard(VehicleID,CardCode,IssueDate,ExpiredDate,Status) VALUES(@v,CONCAT('TEST-CARD-',@v),GETDATE(),DATEADD(year,1,GETDATE()),1);
   SET @n=@n+1;
  END`);
 const vehicles=await fetchAllPages((page,limit)=>call('RESIDENT',`/vehicles?page=${page}&limit=${limit}`));assert(vehicles.data.length>=105);
 const cards=await fetchAllPages((page,limit)=>call('RESIDENT',`/vehicles/cards?page=${page}&limit=${limit}`));assert(cards.data.length>=105);
 assert.equal(new Set(cards.data.map(c=>c.CardID)).size,cards.data.length);
 await pool.request().input('C',sql.Int,contract.ContractID).query(`DECLARE @n int=1; WHILE @n<=25 BEGIN
  INSERT Invoice(ContractID,InvoiceMonth,InvoiceYear,InvoiceDate,DueDate,TotalAmount,StatusID,WorkflowStatus) VALUES(@C,1,2100+@n,GETDATE(),DATEADD(day,1,GETDATE()),1,1,'WAITING_PAYMENT');SET @n=@n+1;END`);
 const invoices=await fetchAllPages((page,limit)=>call('RESIDENT',`/invoices?page=${page}&limit=${limit}`),20);assert(invoices.data.length>25);
 console.log('PASS: extensions, payment precedence, email channels/scopes/failure, 105 vehicles/cards, >20 invoices');
};
