// Additive, repeatable migrations for the existing SQL Server schema; never reset data.
require('dotenv').config({path:require('path').join(__dirname,'..','.env')});
const fs=require('node:fs');
const path=require('node:path');
const {getPool,closePool}=require('../config/db');
(async()=>{
 try {
  const pool=await getPool();
  for(const name of ['20260922_complete_workflows.sql','20260923_core_roles_equipment_tickets.sql']){
   await pool.request().query(fs.readFileSync(path.join(__dirname,'..','migrations',name),'utf8'));
   console.log(`Applied: ${name}`);
  }
 } finally {await closePool();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
