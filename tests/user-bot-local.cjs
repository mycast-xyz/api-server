// Dedicated loopback DB + real HTTP/WebSocket handlers. No production credentials or endpoints.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const apiRoot = path.resolve(__dirname, '..');
const chatRoot = path.resolve(apiRoot, '../vega-chat-server');
const loginRoot = path.resolve(apiRoot, '../login-server');
const fullStack = process.argv.includes('--full-stack');
const prepareJob = process.argv.includes('--prepare-job');
const serverRoot = path.dirname(apiRoot);
const req = createRequire(path.join(apiRoot, 'package.json'));
const chatRequire = createRequire(path.join(chatRoot, 'package.json'));
const mysql = req('mysql2/promise');
const express = req('express');
const mariadb = process.env.MYCAST_TEST_MARIADB_BIN;
const mysql56 = process.env.MYCAST_TEST_MYSQL56_BIN;
if (!mysql56 && (!mariadb || !fs.existsSync(path.join(mariadb,'mariadbd.exe')))) throw Error('Set MYCAST_TEST_MARIADB_BIN or MYCAST_TEST_MYSQL56_BIN to a local database bin directory.');
const state = path.join(serverRoot, '.user-bot-lab');
const data = path.join(state,mysql56 ? 'db-mysql-5.6-complete' : 'db');
fs.mkdirSync(state,{recursive:true});
const port = 13316;
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
let db, pool, repository, manager, httpServer, chatServer, loginServer, redisServer, redisProbe, RedisCacheContainer;
let loginDatabase, example;
const originalCwd = process.cwd();
const sockets = [];
const rootPassword = 'local-user-bot-only';
const keyA = 'local-owner-a-key', keyB = 'local-owner-b-key';
let checks = 0;
function pass(name) { checks++; console.log('PASS:',name); }
async function connectSocket(url) {
  const socket = new WebSocket(url); const events=[];
  socket.addEventListener('message', event => events.push(JSON.parse(event.data)));
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  sockets.push(socket);
  return { socket, events, send: (commandType,resource)=>socket.send(JSON.stringify({commandType,resource})),
    wait: async (kind, predicate=()=>true) => { for(let n=0;n<100;n++){const i=events.findIndex(e=>e.commandType===kind&&predicate(e.response));if(i>=0)return events.splice(i,1)[0];await delay(30);}throw Error('Timed out waiting for '+kind); } };
}
(async()=>{
try {
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
  if (!fs.existsSync(path.join(data,'mysql'))) {
    if (mysql56) fs.cpSync(path.resolve(mysql56,'../data'),data,{recursive:true});
    else execFileSync(path.join(mariadb,'mariadb-install-db.exe'),['--datadir='+data,'--password='+rootPassword,'--port='+port],{stdio:'pipe',windowsHide:true});
  }
  const dbArgs=['--no-defaults','--console','--bind-address=127.0.0.1','--port='+port,'--datadir='+data];
  if(mysql56)dbArgs.push('--basedir='+path.resolve(mysql56,'..'),'--innodb-file-format=Antelope','--innodb-large-prefix=0','--character-set-server=latin1','--sql-mode=IGNORE_SPACE,NO_ENGINE_SUBSTITUTION');
  db=spawn(path.join(mysql56||mariadb,mysql56?'mysqld.exe':'mariadbd.exe'),dbArgs,{windowsHide:true,stdio:['ignore','ignore','pipe']});
  db.stderr.on('data',()=>{});
  for(let n=0;n<100;n++){
    try { pool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:rootPassword,multipleStatements:true,timezone:'Z'});await pool.query('SELECT 1');break; }
    catch(error){await pool?.end();pool=null;
      if(mysql56 && error.code==='ER_ACCESS_DENIED_ERROR'){
        const initial=await mysql.createConnection({host:'127.0.0.1',port,user:'root'});
        await initial.query("UPDATE mysql.user SET Password=PASSWORD(?) WHERE User='root'",[rootPassword]);await initial.query('FLUSH PRIVILEGES');await initial.end();
      }
      if(db.exitCode!==null||n===99)throw error;await delay(100);}
  }
  const [dbVersion]=await pool.query('SELECT VERSION() AS version');console.log('LOCAL DB VERSION:',dbVersion[0].version);
  await pool.query('DROP DATABASE IF EXISTS mycast_user_bot_lab; CREATE DATABASE mycast_user_bot_lab CHARACTER SET utf8mb4; USE mycast_user_bot_lab; CREATE TABLE user(idx INT PRIMARY KEY,private_key VARCHAR(100),hash VARCHAR(100),nickname VARCHAR(64),icon VARCHAR(1000),confirm INT)');
  await pool.query('INSERT INTO user VALUES(1,?,?,?,\'\',1),(2,?,?,?,\'\',1)',[keyA,'owner-a','Owner A',keyB,'owner-b','Owner B']);
  if (fullStack) {
    await pool.query("ALTER TABLE user ADD id VARCHAR(64),ADD pw VARCHAR(64),ADD secret_key VARCHAR(100),ADD icon_border_color VARCHAR(30) DEFAULT '',ADD status_message VARCHAR(100) DEFAULT '',ADD level INT DEFAULT 1,ADD exp INT DEFAULT 0,ADD coin INT DEFAULT 0");
    await pool.query("UPDATE user SET id=CONCAT('local-user-',idx),pw=MD5('local-password-only'),secret_key=CONCAT('local-viewer-',idx)");
  }
  if(prepareJob){
    const {preparationChecks}=await import('./user-bot-preparation-checks.mjs');
    const connection=await mysql.createConnection({host:'127.0.0.1',port,user:'root',password:rootPassword,database:'mycast_user_bot_lab'});
    try{await preparationChecks({connection,stateDirectory:path.join(state,'prepare-'+require('node:crypto').randomUUID()),dumpExecutable:path.join(mysql56||mariadb,'mysqldump.exe'),dbOptions:{port,password:rootPassword},pass});}finally{await connection.end();}
  }else await pool.query(fs.readFileSync(path.join(apiRoot,'migrations/20261125-user-bots.sql'),'utf8'));
  await pool.end();
  pool=mysql.createPool({host:'127.0.0.1',port,user:'root',password:rootPassword,database:'mycast_user_bot_lab',connectionLimit:4,timezone:'Z'});
  process.env.USER_BOT_TOKEN_KEY=Buffer.alloc(32,7).toString('base64');
  Object.assign(process.env,{DATABASE_HOST:'127.0.0.1',DATABASE_PORT:String(port),DATABASE_ID:'root',DATABASE_PW:rootPassword,DATABASE_NAME:'mycast_user_bot_lab'});
  if (fullStack) Object.assign(process.env,{DB_HOST:'127.0.0.1',DB_PORT:String(port),DB_USER:'root',DB_PASSWORD:rootPassword,DB_NAME:'mycast_user_bot_lab',PASSPORT_SECRET_CODE:'isolated-local-test-only'});
  execFileSync(process.execPath,[path.join(apiRoot,'node_modules/typescript/bin/tsc')],{cwd:apiRoot,stdio:'pipe'});
  execFileSync(process.execPath,[path.join(chatRoot,'node_modules/typescript/bin/tsc')],{cwd:chatRoot,stdio:'pipe'});
  if (fullStack) {
    const redisBin = process.env.MYCAST_TEST_REDIS_BIN;
    if (!redisBin || !fs.existsSync(path.join(redisBin,'redis-server.exe'))) throw Error('Set MYCAST_TEST_REDIS_BIN for --full-stack.');
    const redisPort = 16379;
    await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(redisPort,'127.0.0.1',()=>probe.close(resolve));});
    process.env.REDIS_URL='redis://127.0.0.1:'+redisPort;
    redisServer=spawn(path.join(redisBin,'redis-server.exe'),['--bind','127.0.0.1','--port',String(redisPort),'--save','','--appendonly','no'],{cwd:state,windowsHide:true,stdio:'ignore'});
    redisProbe=chatRequire('redis').createClient({url:process.env.REDIS_URL,socket:{reconnectStrategy:()=>false}});redisProbe.on('error',()=>{});
    for(let n=0;n<50;n++){try{await redisProbe.connect();break;}catch(error){if(n===49||redisServer.exitCode!==null)throw error;await delay(100);}}
    assert.equal(await redisProbe.ping(),'PONG');pass('real isolated Redis daemon is reachable on loopback');
    execFileSync(process.execPath,[path.join(loginRoot,'node_modules/typescript/bin/tsc')],{cwd:loginRoot,stdio:'pipe'});
    process.chdir(state);
    const loginApp=require('./load-local-login.cjs')(loginRoot);
    loginDatabase=require(path.join(loginRoot,'dist/MySqlLogin.js')).MySqlLogin.getInstance();
    loginServer=loginApp.listen(0,'127.0.0.1');await once(loginServer,'listening');
    const loginBase='http://127.0.0.1:'+loginServer.address().port;
    const login=await fetch(loginBase+'/auth',{method:'POST',body:new URLSearchParams({mcid:'local-user-1',mcpw:'local-password-only'})});
    assert.equal(login.status,200);const credential=await login.json();assert.equal(credential.hash,keyA);assert.ok(credential.sid);
    const saved=JSON.parse(fs.readFileSync(path.join(state,'sessions',credential.sid+'.json'),'utf8'));assert.equal(saved.passport.user,keyA);
    const failed=await fetch(loginBase+'/auth',{method:'POST',body:new URLSearchParams({mcid:'local-user-1',mcpw:'wrong-password'})});assert.notEqual(failed.status,200);
    pass('real login routes, Passport strategy and SQL authenticate the owner and reject a wrong password');
  }
  const {UserBotRepository}=require(path.join(apiRoot,'dist/models/userbot/UserBotRepository.js'));
  const {UserBotRouter}=require(path.join(apiRoot,'dist/manager/server/route/userbot/UserBotRouter.js'));
  repository=fullStack?new UserBotRepository():new UserBotRepository(pool);
  const app=express();app.use(express.json());app.use('/user-bots',new UserBotRouter(repository).getRouter());
  httpServer=app.listen(0,'127.0.0.1');await once(httpServer,'listening');
  const base='http://127.0.0.1:'+httpServer.address().port+'/user-bots';
  async function call(owner,method='',suffix='',body){const response=await fetch(base+suffix,{method:method||'GET',headers:{Authorization:'Bearer '+owner,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:response.status,headers:response.headers,data:response.status===204?null:await response.json()};}
  assert.equal((await call('invalid')).status,401);pass('invalid owner cannot access management');
  const created=await call(keyA,'POST','',{name:'Same bot',icon:''});assert.equal(created.status,201);const id=created.data.id;
  const secret1=await call(keyA,'GET','/'+id+'/token');const token=secret1.data.token;
  assert.equal((await call(keyA,'GET','/'+id+'/token')).data.token,token);
  assert.equal(secret1.headers.get('cache-control'),'no-store');pass('owner can repeatedly retrieve current token without caching');
  assert.equal((await call(keyB,'GET','/'+id+'/token')).status,404);
  assert.equal((await call(keyB,'PUT','/'+id+'/token')).status,404);
  assert.equal((await call(keyB,'PATCH','/'+id,{name:'stolen',icon:''})).status,404);
  assert.equal((await call(keyB,'DELETE','/'+id)).status,404);
  assert.equal((await call(token,'GET')).status,401);pass('other owner and bot token cannot manage or reveal credentials');
  const [rows]=await pool.execute('SELECT * FROM user_bot_token WHERE bot_id=?',[id]);
  assert.ok(!rows[0].token_cipher.includes(token));assert.notEqual(rows[0].token_hash,token);pass('database stores encrypted token plus one-way verification hash');
  const aliases=chatRequire('module-alias');aliases.addAliases({'@app':path.join(chatRoot,'dist/app'),'@common':path.join(chatRoot,'dist/common'),'@model':path.join(chatRoot,'dist/models')});
  // Replace only the external cache transport. Real ChatQueue JSON snapshots are retained across connections.
  const cachePath=path.join(chatRoot,'dist/app/models/cache/redis/RedisCacheContainer.js');const memory=new Map();
  if (!fullStack) require.cache[cachePath]={id:cachePath,filename:cachePath,loaded:true,exports:{RedisCacheContainer:class{constructor(key){this.key=key;}setData(value){memory.set(this.key,JSON.stringify(value));}async getData(){return JSON.parse(memory.get(this.key)||'null');}}}};
  else RedisCacheContainer=require(cachePath).RedisCacheContainer;
  const {WebsocketManager}=require(path.join(chatRoot,'dist/app/controllers/websocket/WebSocketManager.js'));
  const ownerUser={idx:1,hash:'owner-a',icon:'',iconBorderColor:'',level:1,exp:0,coin:0,need:1,nickname:'Owner A',statusMessage:''};
  const login={loginWithPrivKey:async key=>key===keyA?ownerUser:null,loginWithSecretKey:async key=>key==='local-viewer-key'?ownerUser:null};
  if (fullStack) {
    const {MySqlDatabaseManager}=require(path.join(chatRoot,'dist/models/manager/MySqlDatabaseManager.js'));
    const realLogin=MySqlDatabaseManager.getInstance();realLogin.init('mycast_user_bot_lab','root',rootPassword);
    manager=new WebsocketManager(realLogin);
  } else {manager=new WebsocketManager(login);manager.db.getUserFromPrivateKey=login.loginWithPrivKey;}
  // The legacy cache loads asynchronously before accepting test messages.
  await delay(150);
  chatServer=require('node:http').createServer();manager.registerServer(chatServer);chatServer.listen(0,'127.0.0.1');await once(chatServer,'listening');
  const wsUrl='ws://127.0.0.1:'+chatServer.address().port;
  const observer=await connectSocket(wsUrl);observer.send('user-login',{channel:'chat',privateKey:keyA});await observer.wait('applyCurrentChatList');
  const old=await connectSocket(wsUrl);old.send('bot-login',{bots:[{hash:'legacy-bot',icon:'',nickname:'Legacy bot'}]});
  await observer.wait('applyCurrentBotList',list=>list.some(b=>b.hash==='legacy-bot'));
  old.send('bot-chat',{bot:'legacy-bot',type:'chat',msg:'legacy-message'});
  const legacy=await observer.wait('chat',m=>m.msg.response==='legacy-message');assert.equal(legacy.response.level,100);assert.equal(legacy.response.senderKind,undefined);pass('existing bot-login and bot-chat still work with original BOT identity');
  const userbot=await connectSocket(wsUrl);userbot.send('user-bot-login',{token});await userbot.wait('user-bot-authenticated');
  const duplicate=await connectSocket(wsUrl);duplicate.send('user-bot-login',{token});await duplicate.wait('user-bot-error');pass('duplicate bot connections are refused without replacing the active bot');
  const invalid=await connectSocket(wsUrl);invalid.send('user-bot-login',{token:'mub_'+ 'A'.repeat(43)});await invalid.wait('user-bot-error');assert.ok(!invalid.events.some(e=>e.commandType==='applyCurrentChatList'));pass('invalid bot token receives no history');
  userbot.send('user-bot-chat',{msg:'owned-message',nickname:'forged',owner:{nickname:'forged'},bot:'legacy-bot'});
  const owned=await observer.wait('chat',m=>m.msg.response==='owned-message');assert.equal(owned.response.nickname,'Same bot');assert.equal(owned.response.senderKind,'user-bot');assert.equal(owned.response.owner.nickname,'Owner A');assert.notEqual(owned.response.level,100);pass('user-bot identity and owner are stamped by server, not client fields');
  userbot.send('chat',{userKey:keyA,type:'chat',msg:'must-not-pass'});assert.equal((await userbot.wait('user-bot-error')).response.code,'SCOPE_DENIED');pass('user-bot connection cannot invoke legacy/human commands');
  userbot.send('bot-login',{bots:[{hash:'forged',icon:'',nickname:'forged'}]});assert.equal((await userbot.wait('user-bot-error')).response.code,'SCOPE_DENIED');
  old.send('bot-chat',{bot:'legacy-bot',type:'chat',msg:'legacy-cannot-claim-owner',senderKind:'user-bot',senderId:id,owner:{hash:'owner-a',nickname:'Owner A'}});
  const noClaim=await observer.wait('chat',m=>m.msg.response==='legacy-cannot-claim-owner');assert.equal(noClaim.response.senderKind,undefined);assert.equal(noClaim.response.owner,undefined);pass('legacy bot profile fields cannot claim trusted user-bot ownership');
  observer.send('chat',{userKey:keyA,type:'chat',msg:'human-message'});await userbot.wait('chat',m=>m.msg.response==='human-message');pass('normal human chat still works and reaches authenticated user-bots');
  assert.ok(!observer.events.some(e=>e.commandType==='chat'&&e.response.msg?.response==='must-not-pass'));
  for(let i=0;i<11;i++)userbot.send('user-bot-chat',{msg:'rate-message-'+i});
  await userbot.wait('user-bot-error',e=>e.code==='RATE_LIMITED');pass('per-bot posting rate limit is enforced');
  const again=await connectSocket(wsUrl);again.send('user-login',{channel:'chat',privateKey:keyA});const history=await again.wait('applyCurrentChatList');assert.ok(history.response.some(m=>m.senderId===id&&m.owner.hash==='owner-a'));pass('recent-history serialization retains user-bot ownership');
  if (fullStack) {
    let persisted;
    for(let n=0;n<50;n++){persisted=JSON.parse(await redisProbe.get('CURRENT_CHAT_LIST')||'[]');if(persisted.some(m=>m.senderId===id))break;await delay(30);}
    assert.ok(persisted.some(m=>m.senderId===id&&m.owner.hash==='owner-a'));
    const {ChatQueue}=require(path.join(chatRoot,'dist/app/models/socket/chat/ChatQueue.js'));const restored=new ChatQueue(50);
    for(let n=0;n<50&&!restored.getChats().length;n++)await delay(30);
    assert.ok(restored.getChats().some(m=>m.senderId===id&&m.owner.nickname==='Owner A'));pass('real Redis persistence and a fresh ChatQueue restore bot ownership');
  }
  const rotated=await call(keyA,'PUT','/'+id+'/token');assert.notEqual(rotated.data.token,token);
  userbot.send('user-bot-chat',{msg:'revoked-message'});await userbot.wait('user-bot-error',e=>e.code==='TOKEN_REVOKED');pass('rotation invalidates old token on existing connection before next send');
  const replacement=await connectSocket(wsUrl);replacement.send('user-bot-login',{token:rotated.data.token});await replacement.wait('user-bot-authenticated');
  assert.equal((await call(keyA,'DELETE','/'+id+'/token')).status,204);
  await replacement.wait('user-bot-error',e=>e.code==='TOKEN_REVOKED');pass('revocation terminates idle sessions within polling interval');
  assert.equal((await call(keyA,'GET','/'+id+'/token')).status,410);
  assert.equal((await call(keyA,'DELETE','/'+id)).status,204);assert.equal((await call(keyA)).data.length,0);pass('owner can delete bot without deleting chat history');
  const attempts=await Promise.all(Array.from({length:5},(_,n)=>call(keyB,'POST','',{name:'Bot '+n,icon:''})));
  assert.equal(attempts.filter(r=>r.status===201).length,3);assert.equal(attempts.filter(r=>r.status===409).length,2);pass('concurrent creation enforces owner quota transactionally');
  const extra=attempts.find(r=>r.status===201).data.id;
  const extraToken=(await call(keyB,'GET','/'+extra+'/token')).data.token;
  const malformed=await connectSocket(wsUrl);malformed.send('user-bot-login',{token:extraToken});await malformed.wait('user-bot-authenticated');
  malformed.socket.send('{broken');await malformed.wait('user-bot-error',e=>e.code==='INVALID_MESSAGE');
  old.send('bot-chat',{bot:'legacy-bot',type:'chat',msg:'legacy-after-malformed'});
  await observer.wait('chat',m=>m.msg.response==='legacy-after-malformed');pass('malformed user-bot JSON closes only its own session');
  const limited=await connectSocket(wsUrl);limited.send('user-bot-login',{token:extraToken});await limited.wait('user-bot-authenticated');
  limited.send('user-bot-chat',{type:'image',msg:'unsupported-card'});await limited.wait('user-bot-error',e=>e.code==='INVALID_MESSAGE');
  await pool.query('UPDATE user SET confirm=0 WHERE idx=2');
  limited.send('user-bot-chat',{msg:'disabled-owner'});await limited.wait('user-bot-error',e=>e.code==='TOKEN_REVOKED');
  await pool.query('UPDATE user SET confirm=1 WHERE idx=2');pass('unsupported card payloads and disabled owners cannot post');
  if(fullStack){
    const exampleRoot=path.join(chatRoot,'examples/UserBot');
    execFileSync('dotnet',['build',path.join(exampleRoot,'UserBot.csproj'),'-c','Release','--nologo'],{stdio:'pipe',windowsHide:true});
    example=spawn('dotnet',[path.join(exampleRoot,'bin/Release/net10.0/UserBot.dll')],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,MYCAST_BOT_URL:wsUrl,MYCAST_BOT_TOKEN:extraToken}});
    let output='';example.stdout.on('data',data=>output+=data.toString());example.stderr.on('data',()=>{});
    for(let n=0;n<100&&!output.includes('봇 연결 완료');n++){if(example.exitCode!==null)throw Error('C# bot example exited before authentication');await delay(30);}
    assert.ok(output.includes('봇 연결 완료'));
    example.stdin.write('local-csharp-example\n');
    const sent=await observer.wait('chat',m=>m.msg.response==='local-csharp-example');assert.equal(sent.response.owner.nickname,'Owner B');assert.equal(sent.response.senderKind,'user-bot');
    pass('real C# bot example authenticates and posts with server-stamped ownership');
    example.kill();await once(example,'exit');example=null;
  }
  await pool.query('RENAME TABLE user_bot_token TO user_bot_token_offline,user_bot TO user_bot_offline');
  try {
    const unavailable=await connectSocket(wsUrl);unavailable.send('user-bot-login',{token:extraToken});await unavailable.wait('user-bot-error',e=>e.code==='UNAVAILABLE');
    assert.equal((await call(keyA)).status,503);
    old.send('bot-chat',{bot:'legacy-bot',type:'chat',msg:'legacy-without-new-schema'});
    await observer.wait('chat',m=>m.msg.response==='legacy-without-new-schema');
    observer.send('chat',{userKey:keyA,type:'chat',msg:'human-without-new-schema'});
    await observer.wait('chat',m=>m.msg.response==='human-without-new-schema');
    pass('missing new schema disables only user-bots; legacy bot and human messages still work');
  } finally { await pool.query('RENAME TABLE user_bot_offline TO user_bot,user_bot_token_offline TO user_bot_token'); }
  console.log('PASS: '+checks+' local HTTP/SQL/WebSocket integration checks; no production connection.');
} finally {
  for(const socket of sockets)socket.close();
  if(example&&example.exitCode===null){example.kill();await once(example,'exit');}
  await manager?.closeUserBots();
  if(httpServer)await new Promise(resolve=>httpServer.close(resolve));
  if(chatServer)await new Promise(resolve=>chatServer.close(resolve));
  if(repository)await repository.close();
  if(fullStack||!repository)await pool?.end();
  if(loginServer)await new Promise(resolve=>loginServer.close(resolve));
  await loginDatabase?.close();
  if(RedisCacheContainer)await RedisCacheContainer.closeAll();
  if(redisProbe?.isOpen)await redisProbe.quit();
  if(redisServer && redisServer.exitCode===null){redisServer.kill();await once(redisServer,'exit');}
  if(db && db.exitCode===null) {
    let shutdown;
    try { shutdown=await mysql.createConnection({host:'127.0.0.1',port,user:'root',password:rootPassword});await shutdown.query('SHUTDOWN'); }
    catch { /* The server may close the connection while acknowledging shutdown. */ }
    finally { shutdown?.destroy(); }
    if(db.exitCode===null)await Promise.race([once(db,'exit'),delay(5000)]);
    if(db.exitCode===null){db.kill();await once(db,'exit');}
  }
  process.chdir(originalCwd);
}
})().then(()=>process.exit(0),error=>{console.error(error.stack);process.exit(1);});
