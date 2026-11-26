import assert from 'node:assert/strict';
import { readFile, rename, access, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareUserBot } from '../scripts/prepare-user-bot.mjs';

export async function preparationChecks({connection,stateDirectory,dumpExecutable,dbOptions,pass}){
  const output=[];
  const options={connection,stateDirectory,log:line=>output.push(line),backup:async file=>{
    execFileSync(dumpExecutable,['--single-transaction','--routines','--triggers','--host=127.0.0.1','--port='+dbOptions.port,'--user=root','--result-file='+file,'--databases','mycast_user_bot_lab'],{env:{...process.env,MYSQL_PWD:dbOptions.password},windowsHide:true,stdio:'pipe'});
  }};
  const count=async()=>Number((await connection.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('user_bot','user_bot_token')"))[0][0].n);
  const first=await prepareUserBot(options);
  assert.equal(first.ready,false);assert.equal(await count(),0);await assert.rejects(access(first.keyFile));
  pass('dedicated job check mode makes no file or schema changes');
  await assert.rejects(prepareUserBot({...options,apply:true,backup:async()=>{throw Error('simulated backup failure');}}));
  assert.equal(await count(),0);await assert.rejects(access(first.keyFile));
  pass('failed backup blocks key creation and DB changes');
  const applied=await prepareUserBot({...options,apply:true});
  assert.equal(await count(),2);assert.ok((await stat(applied.backupFile)).size>32);
  const key=(await readFile(applied.keyFile,'utf8')).trim();assert.equal(Buffer.from(key,'base64').length,32);
  const backup=await readFile(applied.backupFile,'utf8');assert.ok(backup.includes('CREATE TABLE `user`'));
  pass('dedicated job creates a real mysqldump backup, two tables and a persistent key');
  assert.equal((await prepareUserBot(options)).ready,true);
  const again=await prepareUserBot({...options,apply:true});assert.equal(again.backupFile,null);assert.equal((await readFile(again.keyFile,'utf8')).trim(),key);
  pass('repeat check/apply preserves the key and existing schema without another migration');
  await assert.rejects(prepareUserBot({...options,apply:true,inlineKey:randomBytes(32).toString('base64')}),/keys differ/);
  assert.equal((await readFile(applied.keyFile,'utf8')).trim(),key);
  pass('conflicting configured keys never replace the persistent key');
  const id=randomUUID();await connection.execute('INSERT INTO user_bot(id,owner_idx,name) VALUES(?,1,?)',[id,'preparation-fixture']);
  await connection.execute('INSERT INTO user_bot_token(bot_id,token_hash,token_cipher) VALUES(?,?,?)',[id,'a'.repeat(64),'fixture-only']);
  await rename(applied.keyFile,applied.keyFile+'.saved');
  try{await assert.rejects(prepareUserBot({...options,apply:true}),/encryption key is missing/);await assert.rejects(access(applied.keyFile));}
  finally{await rename(applied.keyFile+'.saved',applied.keyFile);}
  pass('missing key with existing tokens refuses regeneration');
  await connection.execute('DELETE FROM user_bot_token WHERE bot_id=?',[id]);await connection.execute('DELETE FROM user_bot WHERE id=?',[id]);
  await connection.query('ALTER TABLE user_bot MODIFY name VARCHAR(65) NOT NULL');
  try{await assert.rejects(prepareUserBot({...options,apply:true}),/columns differ/);}
  finally{await connection.query('ALTER TABLE user_bot MODIFY name VARCHAR(64) NOT NULL');}
  pass('unexpected existing schema is rejected without destructive automatic repair');
  await writeFile(applied.keyFile,'invalid\n');
  try{await assert.rejects(prepareUserBot({...options,apply:true}),/key is invalid/);assert.equal(await readFile(applied.keyFile,'utf8'),'invalid\n');}
  finally{await writeFile(applied.keyFile,key+'\n');}
  pass('corrupt persistent keys fail instead of silently rotating');
  await connection.query('DROP TABLE user_bot_token');
  const partial=await prepareUserBot({...options,apply:true});assert.equal(await count(),2);assert.ok(partial.backupFile);assert.equal((await readFile(partial.keyFile,'utf8')).trim(),key);
  pass('a partial first migration resumes after backup without replacing the key');
  assert.equal(output.some(line=>line.includes(key)),false);
  pass('preparation logs contain no encryption key');
}
