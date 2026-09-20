const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {fixture,payload,TOKEN,PASSWORD,owner}=require('./fixture.cjs');
const protocol='promyan-auth-v1';
const login=(f,extra={})=>f.post({protocol,action:'login',username:owner.username,password:PASSWORD,sessionCandidate:'b2'.repeat(32),...extra});
test('blank setup and unconfigured server fail closed, without altering the Sheet',()=>{
  const f=fixture({noAuth:true});assert.throws(()=>f.ctx.setupOwnerAccount(),/Username/);
  assert.equal(login(f).code,'AUTH_NOT_CONFIGURED');assert.equal(f.post(payload()).code,'UNAUTHORIZED');
  assert.equal(f.ctx.doGet({parameter:{action:'health'}}).ready,false);assert.equal(f.rows.length,1);
});
test('direct unauthenticated and forged-token saves never write or disclose receipt',()=>{
  const f=fixture();for(const token of [undefined,'','bad','f'.repeat(64)]){
    const r=f.post({...payload(),token});assert.equal(r.code,'UNAUTHORIZED');assert.equal(r.row,undefined);assert.equal(r.requestId,undefined);
  }assert.equal(f.rows.length,1);assert.equal(f.flushed,0);
});
test('production PBKDF2 matches independent Node crypto for Thai and long Unicode passwords',()=>{
  const f=fixture();for(const password of ['ทดสอบรหัสผ่าน-long','ก'.repeat(100)]){
    const actual=f.ctx.promyanPasswordHash_(password,owner.salt,600000);
    assert.equal(actual,crypto.pbkdf2Sync(password,Buffer.from(owner.salt,'hex'),600000,32,'sha256').toString('hex'));
  }
});
test('correct credentials issue a session; previous session is revoked; raw token/password never stored',()=>{
  const f=fixture(),r=login(f);assert.equal(r.ok,true);assert.equal(r.token,'b2'.repeat(32));
  assert.ok(r.expiresAt>Date.now());assert.ok(r.expiresAt<=Date.now()+28800000);
  assert.equal(f.post({...payload(),token:r.token}).status,'saved');assert.equal(f.post(payload()).code,'UNAUTHORIZED');
  const stored=JSON.stringify([...f.properties]);assert.ok(!stored.includes(PASSWORD));assert.ok(!stored.includes(r.token));
});
test('wrong user or password never grants a session and returns the same error',()=>{
  const f=fixture();assert.equal(login(f,{password:'Wrong-password-12345'}).code,'INVALID_CREDENTIALS');
  assert.equal(login(f,{username:'other-user'}).code,'INVALID_CREDENTIALS');assert.equal(f.rows.length,1);
});
test('attempt limit is persistent, global across usernames, and expires after its window',()=>{
  const f=fixture();for(let i=0;i<5;i++)assert.equal(login(f,{username:'u'+i,password:''}).code,'INVALID_CREDENTIALS');
  const r=login(f);assert.equal(r.code,'RATE_LIMITED');assert.ok(r.retryAfterSeconds>0);
  f.properties.set('PROMYAN_LOGIN_ATTEMPTS_V1',JSON.stringify({count:5,until:Date.now()-1}));
  assert.equal(login(f).ok,true);assert.equal(f.properties.has('PROMYAN_LOGIN_ATTEMPTS_V1'),false);
});
test('session expiration, logout, and manual revocation reject later saves',()=>{
  for(const mode of ['expire','logout','manual']){
    const f=fixture();assert.equal(f.post({protocol,action:'session',token:TOKEN}).ok,true);
    if(mode==='expire') {const s=JSON.parse(f.properties.get('PROMYAN_SESSION_V1'));s.expiresAt=Date.now()-1;f.properties.set('PROMYAN_SESSION_V1',JSON.stringify(s));}
    if(mode==='logout')assert.equal(f.post({protocol,action:'logout',token:TOKEN}).status,'logged_out');
    if(mode==='manual')f.ctx.revokeOwnerSessions();
    assert.equal(f.post({...payload(),token:TOKEN}).code,'UNAUTHORIZED');assert.equal(f.rows.length,1);
  }
});
test('anonymous logout cannot revoke owner session; malformed input cannot mutate data',()=>{
  const f=fixture();assert.equal(f.post({protocol,action:'logout',token:'bad'}).ok,false);
  assert.equal(f.post({protocol,action:'session',token:TOKEN}).ok,true);
  assert.equal(f.ctx.doPost({postData:{contents:'{bad'}}).ok,false);
  assert.equal(f.ctx.doPost({postData:{contents:'x'.repeat(10001)}}).code,'INVALID_BODY');
  assert.equal(f.rows.length,1);
});
test('resetting credentials preserves spreadsheet configuration and revokes all sessions',()=>{
  const f=fixture();f.ctx.promyanInstallOwner_('new-owner','New-password-123456');
  assert.equal(f.properties.get('SHEET_NAME'),'ข้อมูลเดิม');assert.equal(f.properties.get('SPREADSHEET_ID'),'test-sheet');
  assert.equal(f.post(payload()).code,'UNAUTHORIZED');assert.equal(f.properties.has('PROMYAN_SESSION_V1'),false);
  const a=JSON.parse(f.properties.get('PROMYAN_OWNER_V1'));
  assert.equal(a.verifier,crypto.pbkdf2Sync('New-password-123456',Buffer.from(a.salt,'hex'),600000,32,'sha256').toString('hex'));
});
