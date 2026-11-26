// Dedicated Jenkins job only. Existing build/postbuild scripts do not invoke this file.
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, open, lstat, chmod } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

export const defaultStateDirectory = '/var/lib/jenkins/mycast-data/user-bot';
const migrationFile = fileURLToPath(new URL('../migrations/20261125-user-bots.sql', import.meta.url));
const columns = {
  user_bot: { id: 'char(36)', owner_idx: 'int', name: 'varchar(64)', icon: 'varchar(1000)', deleted_at: 'datetime', created_at: 'datetime' },
  user_bot_token: { bot_id: 'char(36)', token_hash: 'char(64)', token_cipher: 'text', expires_at: 'datetime', revoked_at: 'datetime' }
};
const normalize = value => String(value).replace(/^int\(\d+\)$/, 'int');
const validKey = value => /^[A-Za-z0-9+/]{43}=$/.test(value) && Buffer.from(value, 'base64').length === 32;

async function inspect(connection) {
  const [tables] = await connection.query("SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('user_bot','user_bot_token')");
  for (const table of tables) {
    const expected = columns[table.TABLE_NAME];
    if (table.ENGINE !== 'InnoDB' || !table.TABLE_COLLATION?.startsWith('utf8mb4_')) throw Error('Existing user-bot table engine/charset differs; review manually.');
    const [actual] = await connection.execute('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [table.TABLE_NAME]);
    if (actual.length !== Object.keys(expected).length || actual.some(c => expected[c.COLUMN_NAME] !== normalize(c.COLUMN_TYPE))) throw Error('Existing user-bot columns differ; no automatic alteration performed.');
    for (const c of actual) {
      if (['id','bot_id','token_hash'].includes(c.COLUMN_NAME) && c.COLLATION_NAME !== 'ascii_bin') throw Error('Existing user-bot identity collation differs.');
      const nullable = ['deleted_at','expires_at','revoked_at'].includes(c.COLUMN_NAME);
      if ((c.IS_NULLABLE === 'YES') !== nullable) throw Error('Existing user-bot nullability differs.');
    }
    const primary = actual.filter(c=>c.COLUMN_KEY==='PRI').map(c=>c.COLUMN_NAME);
    if (primary.length!==1 || primary[0] !== (table.TABLE_NAME==='user_bot'?'id':'bot_id')) throw Error('Existing user-bot primary key differs.');
    const [indexes] = await connection.execute('SELECT INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? GROUP BY INDEX_NAME,NON_UNIQUE',[table.TABLE_NAME]);
    if (table.TABLE_NAME==='user_bot' && !indexes.some(i=>i.cols==='owner_idx,deleted_at')) throw Error('Existing user-bot owner index is missing.');
    if (table.TABLE_NAME==='user_bot_token') {
      if (!indexes.some(i=>Number(i.NON_UNIQUE)===0&&i.cols==='token_hash')) throw Error('Existing token unique index is missing.');
      const [foreign] = await connection.query("SELECT COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_bot_token' AND REFERENCED_TABLE_NAME IS NOT NULL");
      if (!foreign.some(f=>f.COLUMN_NAME==='bot_id'&&f.REFERENCED_TABLE_NAME==='user_bot'&&f.REFERENCED_COLUMN_NAME==='id')) throw Error('Existing token ownership constraint is missing.');
    }
  }
  return tables.map(t=>t.TABLE_NAME);
}

async function existingKey(file) {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Key path must be a regular file.');
    if (process.platform!=='win32' && (stat.mode&0o077)) throw Error('Key file permissions must be 0600.');
    const key = (await readFile(file,'utf8')).trim();
    if (!validKey(key)) throw Error('Existing token key is invalid; refusing to replace it.');
    return key;
  } catch (error) { if(error.code==='ENOENT')return null;throw error; }
}

export async function prepareUserBot({ connection, apply=false, stateDirectory=defaultStateDirectory, inlineKey='', backup, log=console.log }) {
  const keyFile = join(resolve(stateDirectory),'token.key');
  const [db] = await connection.query('SELECT DATABASE() AS name, VERSION() AS version');
  if (!db[0].name) throw Error('A target database is required.');
  const lockName='mycast-user-bot-'+createHash('sha256').update(db[0].name).digest('hex').slice(0,24);
  let locked=false;
  try {
    if(apply){ const [lock]=await connection.execute('SELECT GET_LOCK(?,10) AS acquired',[lockName]);if(Number(lock[0].acquired)!==1)throw Error('Another preparation is running.');locked=true; }
    const tables=await inspect(connection);
    const [owner] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user' AND COLUMN_NAME IN ('idx','private_key','hash','nickname','icon','confirm')");
    if(owner.length!==6)throw Error('The existing user schema is incompatible.');
    const key=await existingKey(keyFile);
    if(inlineKey && !validKey(inlineKey))throw Error('Configured token key is invalid.');
    if(key&&inlineKey&&key!==inlineKey)throw Error('Existing file and configured token keys differ; refusing replacement.');
    let tokenCount=0;
    if(tables.includes('user_bot_token')){const [rows]=await connection.query('SELECT COUNT(*) AS total FROM user_bot_token');tokenCount=Number(rows[0].total);}
    if(!key&&!inlineKey&&tokenCount)throw Error('Tokens exist but their encryption key is missing. Restore the original key before proceeding.');
    log('Database version: '+db[0].version);
    log('Feature tables ready: '+tables.length+'/2; persistent key ready: '+Boolean(key));
    if(!apply){log('CHECK ONLY: no database or file changes performed.');return {ready:tables.length===2&&Boolean(key),keyFile};}
    let backupFile=null;
    if(tables.length!==2){
      if(typeof backup!=='function')throw Error('A successful database backup is required before schema creation.');
      await mkdir(join(stateDirectory,'backups'),{recursive:true,mode:0o700});
      backupFile=join(stateDirectory,'backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(4).toString('hex')+'.sql');
      const file=await open(backupFile,'wx',0o600);await file.close();
      await backup(backupFile);
      const stat=await lstat(backupFile);if(!stat.isFile()||stat.size<32)throw Error('Database backup is empty; no schema changes performed.');
      log('Database backup completed.');
    }
    await mkdir(dirname(keyFile),{recursive:true,mode:0o700});
    if(!key){
      const value=inlineKey||randomBytes(32).toString('base64');
      const file=await open(keyFile,'wx',0o600);
      try{await file.writeFile(value+'\n');await file.sync();}finally{await file.close();}
      log('Persistent token key created. The value is not printed.');
    }
    if(tables.length!==2){
      const sql=await readFile(migrationFile,'utf8');
      for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await connection.query(statement);
    }
    if((await inspect(connection)).length!==2)throw Error('Feature schema verification failed.');
    if(!await existingKey(keyFile))throw Error('Persistent key verification failed.');
    await writeFile(join(stateDirectory,'ready.json'),JSON.stringify({version:1,databaseVersion:db[0].version,preparedAt:new Date().toISOString(),migrationSha256:createHash('sha256').update(await readFile(migrationFile)).digest('hex'),backupFile},null,2)+'\n',{mode:0o600});
    log('USER-BOT PREPARATION READY. Existing services were not restarted.');
    return {ready:true,keyFile,backupFile};
  } finally {if(locked)await connection.execute('SELECT RELEASE_LOCK(?)',[lockName]);}
}

async function main(){
  if(process.platform!=='linux'||process.env.JOB_BASE_NAME!=='vega-user-bot-prepare'||!process.env.JENKINS_HOME||resolve(process.env.WORKSPACE||'')!==process.cwd())throw Error('Run only in the dedicated vega-user-bot-prepare Jenkins checkout.');
  if(+process.versions.node.split('.')[0]<22)throw Error('Node.js 22 or newer is required.');
  process.umask(0o077);
  const env=dotenv.parse(await readFile(process.env.API_ENV_FILE||'/var/lib/jenkins/workspace/vega-api-server/.env','utf8'));
  if(!env.DB_NAME||!env.DB_USER)throw Error('The existing API database configuration is unavailable.');
  const options={host:env.DB_HOST||'localhost',port:Number(env.DB_PORT||3306),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME};
  const connection=await mysql.createConnection(options);
  try{
    await prepareUserBot({connection,apply:process.env.APPLY_USER_BOT_PREPARATION==='true',inlineKey:env.USER_BOT_TOKEN_KEY||'',backup:async file=>{
      try{execFileSync('mysqldump',['--single-transaction','--routines','--triggers','--hex-blob','--default-character-set=utf8mb4','--host='+options.host,'--port='+options.port,'--user='+options.user,'--result-file='+file,'--databases',options.database],{env:{...process.env,MYSQL_PWD:options.password||''},stdio:['ignore','ignore','pipe']});await chmod(file,0o600);}
      catch{throw Error('Database backup failed; schema creation was not started.');}
    }});
  }finally{await connection.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('USER-BOT PREPARATION FAILED: '+(error.message?.startsWith('Access denied')?'Database access denied.':error.code||error.message));process.exitCode=1;});
