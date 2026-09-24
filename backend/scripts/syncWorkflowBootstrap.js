// Updates the reset artifact only. NEVER executes the destructive reset SQL.
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../../ApartmentManagement_LOCAL_FULL_RESET.sql');
const marker='-- BEGIN SYNCHRONIZED WORKFLOW MIGRATIONS';
const original=fs.readFileSync(file,'utf8').split(marker)[0].trimEnd();
const migrations=require('./workflowMigrationList').map(name=>`\n-- ${name}\n${fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8').trim()}\nGO\n`).join('');
fs.writeFileSync(file,`${original}\nGO\n${marker}\n${migrations}`);
console.log('Updated reset artifact; no database commands executed.');
