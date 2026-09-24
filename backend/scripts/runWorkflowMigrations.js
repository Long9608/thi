// Additive, repeatable migrations for the existing SQL Server schema; never reset data.
require('dotenv').config({path:require('path').join(__dirname,'..','.env')});
const fs=require('node:fs');
const path=require('node:path');
const {getPool,closePool}=require('../config/db');
const {splitSqlBatches}=require('../utils/sqlBatches');
(async()=>{
 try {
  const pool=await getPool();
  for(const name of require('./workflowMigrationList')){
   const source=fs.readFileSync(path.join(__dirname,'..','migrations',name),'utf8');
   if (/^\s*USE\s+/im.test(source)) throw new Error(`Database switching prohibited: ${name}`);
   for (const batch of splitSqlBatches(source)) await pool.request().batch(batch);
   console.log(`Applied: ${name}`);
  }
 } finally {await closePool();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
