// Runs inside workflow_integration_test's rollback-only transaction.
const assert = require('node:assert/strict');
module.exports = async ({pool, sql, call, contract, a}) => {
 const failures=[];
 async function check(name, work) {
  try { await work(); console.log('AUDIT PASS:',name); }
  catch(error) { failures.push({name,message:error.message}); console.error('AUDIT FAIL:',name,error.message); }
 }
 const reads=['/apartments/statuses','/apartments/areas','/apartments/stats','/apartments/buildings','/apartments/floors','/apartments/equipment',
  '/contracts/statuses','/invoices/statuses','/invoices/payment-methods','/invoices/payment-config',
  '/vehicles/types','/vehicles/eligible-residents','/vehicles/parking-areas','/vehicles/parking-slots',
  '/services/categories','/tickets/statuses','/tickets/my-tickets','/notifications/unread-count',
  '/users/employee-roles','/users/modules','/users/audit-logs','/dashboard/revenue','/dashboard/activities','/dashboard/financial',
  '/utilities/types','/utilities/meters','/utilities/readings',
  `/residents/${a.ResidentID}/identity`,`/residents/${a.ResidentID}/family`,`/residents/${a.ResidentID}/residence-history`,
  `/contracts/${contract.ContractID}`,`/invoices/current/apartment/${contract.ApartmentID}`];
 for(const path of reads) await check('read '+path,()=>call('ADMIN',path));
 const stamp=Date.now();
 await check('building, floor and apartment CRUD',async()=>{
  const area=(await call('ADMIN','/apartments/areas')).data[0].AreaID;
  const building=(await call('ADMIN','/apartments/buildings',201,'POST',{areaId:area,buildingName:`Audit ${stamp}`,numberOfFloors:2})).data.buildingId;
  await call('ADMIN',`/apartments/buildings/${building}`,200,'PUT',{buildingName:`Audit updated ${stamp}`});
  const floor=(await call('ADMIN','/apartments/floors',201,'POST',{buildingId:building,floorNumber:1})).data.floorId;
  const apartment=(await call('ADMIN','/apartments',201,'POST',{floorId:floor,apartmentCode:`AT${stamp}`,area:50,statusId:1})).data.apartmentId;
  await call('ADMIN',`/apartments/${apartment}`,200,'PUT',{area:55});
  assert.equal((await call('ADMIN',`/apartments/${apartment}`)).data.Area,55);
  await call('ADMIN',`/apartments/floors/${floor}`,400,'DELETE');
  await call('ADMIN',`/apartments/${apartment}`,200,'DELETE');
  // A remaining empty floor must be handled as a business conflict, not SQL error.
  await call('ADMIN',`/apartments/buildings/${building}`,400,'DELETE');
  await call('ADMIN',`/apartments/floors/${floor}`,200,'DELETE');
  await call('ADMIN',`/apartments/buildings/${building}`,200,'DELETE');
 });
 const category=(await call('ADMIN','/services/categories')).data[0].CategoryID;
 await check('service prices retain decimals through create and update',async()=>{
  const id=(await call('ADMIN','/services',201,'POST',{categoryId:category,serviceName:`Audit ${stamp}`,unit:'lần',price:1234.56})).data.serviceId;
  assert.equal((await call('ADMIN',`/services/${id}`)).data.Price,1234.56);
  await call('ADMIN',`/services/${id}`,200,'PUT',{price:2345.67});
  assert.equal((await call('ADMIN',`/services/${id}`)).data.Price,2345.67);
  await call('ADMIN',`/services/${id}`,200,'DELETE');
 });
 await check('reject negative service price',()=>call('ADMIN','/services',400,'POST',{categoryId:category,serviceName:`Negative ${stamp}`,price:-1}));
 await check('vehicle CRUD and duplicate plate',async()=>{
  const type=(await call('ADMIN','/vehicles/types')).data[0].VehicleTypeID;
  const body={residentId:a.ResidentID,vehicleTypeId:type,plateNumber:`AU${stamp}`,brand:'Test'};
  const id=(await call('ADMIN','/vehicles',201,'POST',body)).data.vehicleId;
  await call('ADMIN','/vehicles',409,'POST',body);
  await call('ADMIN',`/vehicles/${id}`,200,'PUT',{brand:'Updated'});
  assert.equal((await call('ADMIN',`/vehicles/${id}`)).data.Brand,'Updated');
  await call('ADMIN',`/vehicles/${id}`,200,'DELETE');
 });
 await check('notification create, read and delete',async()=>{
  const result=await call('ADMIN','/notifications',201,'POST',{title:'Audit WEB only',content:'Rollback test',targetScope:'USER',targetUserIds:[a.UserID],channels:['WEB']});
  const id=result.data.notificationId;
  await call('RESIDENT',`/notifications/${id}`);
  await call('RESIDENT',`/notifications/${id}/read`,200,'PUT');
  await call('RESIDENT','/notifications/read-all',200,'PUT');
  await call('ADMIN',`/notifications/${id}`,200,'DELETE');
  await call('ADMIN',`/notifications/${id}`,404);
 });
 for(const path of ['/residents','/apartments','/contracts','/invoices','/services','/tickets','/notifications','/users/employees']) {
  await check('reject invalid pagination '+path,()=>call('ADMIN',`${path}?page=0&limit=0`,400));
 }
 assert.equal(failures.length,0,JSON.stringify(failures,null,2));
};
