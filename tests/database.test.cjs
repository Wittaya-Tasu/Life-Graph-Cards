const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {fixture,payload}=require('./fixture.cjs');
const protocol='promyan-save-v1';
const html=fs.readFileSync(path.join(__dirname,'../promyan_wt_tuksa9.5.html'),'utf8');
test('health exposes no stored client data',()=>{
  const f=fixture();f.post(payload());
  assert.deepEqual(f.ctx.doGet({parameter:{action:'health'}}),{protocol,ok:true,ready:true,authRequired:true});
});
test('success requires append, flush and exact readback',()=>{
  const f=fixture(),p=payload(),r=f.post(p);
  assert.equal(r.ok,true);assert.equal(r.verified,true);assert.equal(r.row,2);assert.equal(f.flushed,1);assert.equal(f.released,1);
  assert.equal(f.rows[1][1],p.name);
});
test('retry uses the same row with a duplicate receipt',()=>{
  const f=fixture(),p=payload();f.post(p);const r=f.post(p);
  assert.equal(r.status,'duplicate');assert.equal(r.row,2);assert.equal(f.rows.length,2);
});
test('same request ID with different content is rejected',()=>{
  const f=fixture(),p=payload();f.post(p);
  assert.equal(f.post({...p,note:'different'}).code,'REQUEST_ID_CONFLICT');assert.equal(f.rows.length,2);
});
test('readback mismatch never returns a successful receipt',()=>{
  const f=fixture({corrupt:true});assert.equal(f.post(payload()).code,'READBACK_FAILED');
});
test('script lock contention does not write',()=>{
  const f=fixture({busy:true});assert.equal(f.post(payload()).code,'BUSY');assert.equal(f.rows.length,1);
});
test('missing configuration and exceptions fail closed without leaking details',()=>{
  assert.equal(fixture({unconfigured:true}).post(payload()).code,'NOT_CONFIGURED');
  const f=fixture({failOpen:true}),r=f.post(payload());assert.equal(r.ok,false);assert.equal(r.code,'SAVE_NOT_CONFIRMED');assert.equal(f.released,1);
  assert.doesNotMatch(JSON.stringify(r),/private sheet/);
});
test('formula-like input is encoded as literal text',()=>{
  const f=fixture(),p={...payload(),name:'=1+1',note:"'literal"};
  assert.equal(f.ctx.promyanText_(p.name),"'=1+1");
  assert.equal(f.post(p).ok,true);assert.equal(f.rows[1][1],'=1+1');assert.equal(f.rows[1][3],"'literal");
});
test('invalid request cannot mutate a sheet',()=>{
  const f=fixture();assert.equal(f.post({...payload(),requestId:'bad'}).ok,false);assert.equal(f.rows.length,1);
});
test('existing incompatible columns are not overwritten',()=>{
  const f=fixture();f.rows[0]=['old columns'];
  assert.equal(f.post(payload()).code,'SCHEMA_MISMATCH');assert.deepEqual(f.rows,[['old columns']]);
});
test('frontend accepts only a matching verified receipt',()=>{
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const ctx=vm.createContext({console,window:{addEventListener(){}},document:{addEventListener(){}}});vm.runInContext(script,ctx);
  const receipt={protocol,ok:true,verified:true,status:'saved',requestId:payload().requestId,row:2,savedAt:'2026-09-20T12:00:00Z'};
  assert.equal(ctx.isDatabaseReceipt(receipt,receipt.requestId),true);
  for(const change of [{verified:false},{ok:false},{requestId:'wrong'},{protocol:'old'},{row:0},{row:'2'},{savedAt:'bad'},{status:'queued'}]) {
    assert.equal(Boolean(ctx.isDatabaseReceipt({...receipt,...change},receipt.requestId)),false);
  }
});

test('historical A:D values and headers survive a new save unchanged',()=>{
  const f=fixture(); f.rows.push(['เวลาเดิม','ชื่อเดิม','วันเกิดเดิม','หมายเหตุเดิม']);
  const before=JSON.stringify(f.rows); const p=payload(),r=f.post(p);
  assert.equal(r.ok,true); assert.equal(r.row,3);
  assert.equal(JSON.stringify(f.rows.slice(0,2)),before);
  assert.deepEqual(f.rows[2].slice(0,4),[p.timestamp,p.name,p.dob,p.note]);
  assert.equal(f.rows[2][4],p.requestId); assert.equal(f.rows[2][5],r.savedAt);
  assert.equal(f.post(p).status,'duplicate'); assert.equal(f.rows.length,3);
});
test('health checks real target schema without mutating the sheet',()=>{
  for(const options of [{unconfigured:true},{missingSheet:true},{failOpen:true},{empty:true}]) {
    const f=fixture(options),before=JSON.stringify(f.rows);
    assert.equal(f.ctx.doGet({parameter:{action:'health'}}).ready,false);
    assert.equal(JSON.stringify(f.rows),before);
  }
  const f=fixture(); f.rows[0][4]='existing unrelated data'; const before=JSON.stringify(f.rows);
  assert.equal(f.ctx.doGet({parameter:{action:'health'}}).code,'SCHEMA_MISMATCH');
  assert.equal(f.post(payload()).code,'SCHEMA_MISMATCH'); assert.equal(JSON.stringify(f.rows),before);
});
test('missing named sheet cannot silently create a different tab',()=>{
  const f=fixture({missingSheet:true});assert.equal(f.post(payload()).code,'SHEET_NOT_FOUND');assert.equal(f.rows.length,1);
});


