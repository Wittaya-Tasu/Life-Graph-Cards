// Owner login/session/logout UI; server-side authorization remains in GAS.

// Owner login: a visual gate for public chart code, server-enforced authorization for saves.
window.PromyanOwner = (() => {
  const PROTOCOL = 'promyan-auth-v1';
  const KEY = 'promyan-v95-owner-session';
  let session = null, expiryTimer = null, busy = false, generation = 0;
  const el = id => document.getElementById(id);
  function message(text, error=false) {
    el('owner-login-message').textContent = text;
    el('owner-login-message').classList.toggle('owner-error',error);
  }
  function valid(s) {
    return s && typeof s.token === 'string' && /^[a-f0-9]{64}$/.test(s.token)
      && Number.isFinite(s.expiresAt) && s.expiresAt > Date.now();
  }
  function lock(text='', error=false) {
    generation++; clearTimeout(expiryTimer); session = null;
    try { sessionStorage.removeItem(KEY); } catch {}
    el('owner-app').hidden = true; el('owner-app').inert = true;
    el('owner-session-bar').hidden = true; el('owner-login').hidden = false;
    document.body.classList.add('owner-locked');
    el('owner-password').value=''; message(text,error);
    el('owner-username').focus();
  }
  function open(s, focus=false) {
    if (!valid(s)) return lock('หมดเวลาใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง');
    // Persist before exposing the UI; unavailable storage fails closed.
    sessionStorage.setItem(KEY,JSON.stringify(s)); session=s;
    el('owner-login').hidden=true; el('owner-app').hidden=false; el('owner-app').inert=false;
    el('owner-session-bar').hidden=false; document.body.classList.remove('owner-locked');
    el('owner-password').value=''; message(''); clearTimeout(expiryTimer);
    expiryTimer=setTimeout(()=>lock('หมดเวลาใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง'),s.expiresAt-Date.now());
    if (focus) el('main-view-title').focus();
  }
  async function request(action, fields={}) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),90000);
    try {
      const response=await fetch(DATABASE_URL,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({protocol:PROTOCOL,action,...fields}),signal:controller.signal});
      if(!response.ok) throw Error('network');
      const r=await response.json();
      if(!r || r.protocol!==PROTOCOL || typeof r.ok!=='boolean') throw Error('protocol');
      return r;
    } finally { clearTimeout(timer); }
  }
  function errorText(r) {
    if(r.code==='AUTH_NOT_CONFIGURED')return 'ยังไม่ได้ตั้งค่าบัญชีใน GAS กรุณารัน setupOwnerAccount ก่อน';
    if(r.code==='RATE_LIMITED')return 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอประมาณ '+Math.max(1,Math.ceil((r.retryAfterSeconds||900)/60))+' นาที';
    if(r.code==='INVALID_CREDENTIALS')return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    if(r.code==='BUSY')return 'ระบบกำลังทำงาน กรุณาลองใหม่สักครู่';
    return 'ยังเข้าสู่ระบบไม่ได้ กรุณาตรวจสอบการตั้งค่า GAS แล้วลองใหม่';
  }
  async function login(event) {
    event.preventDefault(); if(busy)return; busy=true;
    const op=++generation, button=el('owner-submit'); button.disabled=true; button.setAttribute('aria-busy','true');
    message('กำลังตรวจสอบ…');
    try {
      const bytes=new Uint8Array(32); crypto.getRandomValues(bytes);
      const sessionCandidate=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
      const r=await request('login',{username:el('owner-username').value.trim(),password:el('owner-password').value,sessionCandidate});
      if(op!==generation)return;
      if(!r.ok)return message(errorText(r),true);
      if(r.status!=='authenticated' || r.token!==sessionCandidate || !valid(r))throw Error('receipt');
      open({token:r.token,expiresAt:r.expiresAt},true);
    } catch { if(op===generation)message('ยังเข้าสู่ระบบไม่ได้ ตรวจสอบอินเทอร์เน็ต URL และการ Deploy GAS แล้วลองใหม่',true); }
    finally { el('owner-password').value=''; button.disabled=false; button.removeAttribute('aria-busy'); busy=false; }
  }
  async function logout() {
    if(busy || databaseSaving)return;
    const token=session && session.token; if(!token)return lock();
    const button=el('owner-logout'); button.disabled=true;
    try {
      const r=await request('logout',{token});
      if(!r.ok && r.code!=='UNAUTHORIZED')throw Error('revoke');
      lock('ออกจากระบบแล้ว');
      // A deliberate logout clears client/chart data and pending save IDs from this tab.
      sessionStorage.removeItem(DATABASE_SESSION_KEY);
      location.reload();
    } catch { lock('ปิดหน้าการใช้งานแล้ว แต่ยังยืนยันการยกเลิกสิทธิ์บนเซิร์ฟเวอร์ไม่ได้ สิทธิ์เดิมจะหมดอายุภายใน 8 ชั่วโมง',true); }
    finally { button.disabled=false; }
  }
  async function init() {
    el('owner-login-form').addEventListener('submit',login);
    el('owner-logout').addEventListener('click',logout);
    el('owner-show-password').addEventListener('click',()=>{
      const show=el('owner-password').type==='password'; el('owner-password').type=show?'text':'password';
      el('owner-show-password').textContent=show?'ซ่อน':'แสดง';
      el('owner-show-password').setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');
      el('owner-show-password').setAttribute('aria-pressed',String(show));
    });
    const op=++generation;
    try {
      const stored=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(!valid(stored))return lock();
      busy=true; el('owner-submit').disabled=true; message('กำลังตรวจสอบสิทธิ์…');
      const r=await request('session',{token:stored.token});
      if(op!==generation)return;
      if(r.ok && r.status==='authenticated' && Number.isFinite(r.expiresAt))open({token:stored.token,expiresAt:r.expiresAt});
      else lock('กรุณาเข้าสู่ระบบอีกครั้ง');
    } catch { lock('ตรวจสอบสิทธิ์ไม่ได้ กรุณาเข้าสู่ระบบอีกครั้ง',true); }
    finally { busy=false; el('owner-submit').disabled=false; }
  }
  document.addEventListener('DOMContentLoaded',init);
  return {token(){if(!valid(session)){lock('กรุณาเข้าสู่ระบบก่อนบันทึก');return null;}return session.token;},lock};
})();

