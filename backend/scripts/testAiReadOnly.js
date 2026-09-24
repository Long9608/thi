require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const express=require('express'),jwt=require('jsonwebtoken'),path=require('path');
const {spawn}=require('child_process');const db=require('../config/db');
(async()=>{
 let server;
 try{
  const pool=await db.getPool();
  const identities=(await pool.request().query(`SELECT DISTINCT u.UserID,r.RoleCode FROM Users u JOIN UserRole ur ON ur.UserID=u.UserID JOIN Role r ON r.RoleID=ur.RoleID
   WHERE u.Status=1 AND r.Status=1 AND r.RoleCode IN ('ADMIN','RESIDENT') ORDER BY u.UserID`)).recordset;
  const admin=identities.find(u=>u.RoleCode==='ADMIN'),resident=identities.find(u=>u.RoleCode==='RESIDENT');
  if(!admin||!resident)throw new Error('Need existing admin and resident identities');
  const app=express();app.use(express.json());app.use('/api',require('../routes'));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const auth=`http://127.0.0.1:${server.address().port}/api/permissions`;
  const tokens=Object.fromEntries(Object.entries({admin,resident}).map(([k,u])=>[k,jwt.sign({userId:u.UserID},process.env.JWT_SECRET,{expiresIn:'5m'})]));
  const child=spawn(path.join(__dirname,'../../ai-service/.venv/Scripts/python.exe'),['tests/live_readonly.py'],{cwd:path.join(__dirname,'../../ai-service'),windowsHide:true,env:{...process.env,AUTH_API_URL:auth,PYTHONIOENCODING:'utf-8'},stdio:['pipe','inherit','inherit']});
  child.stdin.end(JSON.stringify(tokens));
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
  if(code!==0)throw new Error(`AI test exit ${code}`);
 }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await db.closePool();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
