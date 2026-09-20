const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../google-apps-script/Code.gs'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../promyan_wt_tuksa9.5.html'),'utf8');
const protocol='promyan-save-v1';
const crypto=require('node:crypto');
const TOKEN='a1'.repeat(32), PASSWORD='Test-owner-password-only';
const salt='ab'.repeat(32);
const owner={username:'owner-test',salt,rounds:600000,verifier:crypto.pbkdf2Sync(PASSWORD,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex')};
const payload=()=>({protocol,action:'save',token:TOKEN,requestId:'11111111-1111-4111-8111-111111111111',timestamp:'2026-09-20T12:00:00.000Z',name:'ผู้ทดสอบจำลอง',dob:'22/4/2527',note:'ทดสอบ'});
function fixture(options={}) {
  const rows=options.empty?[]:[['เวลา','ชื่อ','วันเกิด','หมายเหตุ','request_id','saved_at']];
  let flushed=0, released=0;
  const sheet={getLastRow:()=>rows.length,getRange(r,c,h,w){return {
    setNumberFormat(){return this;},
    setValues(values){values.forEach((row,i)=>{rows[r-1+i]??=[]; row.forEach((value,j)=>{rows[r-1+i][c-1+j]=String(value).replace(/^'/,'');});});return this;},
    getDisplayValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>options.corrupt&&r>1&&j===3?'corrupted':rows[r-1+i]?.[c-1+j]||''));},
    createTextFinder(needle){return {matchEntireCell(){return this;},findNext(){const i=rows.findIndex((row,index)=>index>=r-1 && row[c-1]===needle);return i<0?null:{getRow:()=>i+1};}};}
  };}};
  const properties=new Map([['SPREADSHEET_ID','test-sheet'],['SHEET_NAME','ข้อมูลเดิม'],['PROMYAN_OWNER_V1',JSON.stringify(owner)],['PROMYAN_SESSION_V1',JSON.stringify({hash:crypto.createHash('sha256').update(TOKEN).digest('hex'),expiresAt:Date.now()+28800000})]]);
  if(options.noAuth){properties.delete('PROMYAN_OWNER_V1');properties.delete('PROMYAN_SESSION_V1');}
  if(options.unconfigured){properties.delete('SPREADSHEET_ID');properties.delete('SHEET_NAME');}
  const ctx=vm.createContext({console,Utilities:{getUuid:()=>crypto.randomUUID()},
    ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {setMimeType(){return JSON.parse(text);}};}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key)||null,setProperty(key,value){properties.set(key,value);return this;},deleteProperty(key){properties.delete(key);return this;}})},
    LockService:{getScriptLock:()=>({tryLock:()=>!options.busy,waitLock(){if(options.busy)throw Error('busy');},releaseLock(){released++;}})},
    SpreadsheetApp:{openById(){if(options.failOpen)throw Error('private sheet ID');return {getSheetByName:()=>options.missingSheet?null:sheet};},flush(){flushed++;}}
  });
  vm.runInContext(source,ctx);
  return {ctx,rows,properties,get flushed(){return flushed;},get released(){return released;},post:p=>ctx.doPost({postData:{contents:JSON.stringify(p)}})};
}

module.exports={fixture,payload,TOKEN,PASSWORD,owner};
