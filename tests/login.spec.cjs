const {test,expect}=require('playwright/test');
const {routeFonts}=require('./fonts.cjs');
const {fixture,PASSWORD,owner,TOKEN}=require('./fixture.cjs');
const P='promyan-auth-v1';
const photo='/assets/login-teacher.jpg';
let errors,requests;
test.beforeEach(async({page})=>{
 errors=[];requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  if(await routeFonts(route))return;
  const url=new URL(route.request().url());
  if(url.hostname==='script.google.com'){
   requests.push(route.request());
   return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({protocol:P,ok:false,code:'INVALID_CREDENTIALS'})});
  }
  if(url.pathname.includes('html2canvas'))return route.fulfill({contentType:'application/javascript',body:''});
  if(url.pathname.includes('/images/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="300"><rect width="180" height="300" fill="#dde7ef"/></svg>'});
  if(url.hostname!=='127.0.0.1')return route.fulfill({contentType:'text/css',body:''});
  return route.continue();
 });
});
test.afterEach(()=>expect(errors).toEqual([]));
async function typeLogin(page,password=PASSWORD){
 await page.locator('#owner-username').fill(owner.username);await page.locator('#owner-password').fill(password);
 await page.locator('#owner-submit').click();
}
async function useBackend(page){
 const f=fixture({noAuth:true});
 // Seed a password hash, as setupOwnerAccount would; do not bypass doPost authentication.
 f.properties.set('PROMYAN_OWNER_V1',JSON.stringify(owner));
 await page.route('https://script.google.com/**',async route=>{
  const req=route.request(),r=req.method()==='GET'?f.ctx.doGet({parameter:{action:'health'}}):f.ctx.doPost({postData:{contents:req.postData()}});
  requests.push(req);
  await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(r)});
 });return f;
}
test('photo and right-side login; no chart or save request before login',async({page},testInfo)=>{
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('#owner-login')).toBeVisible();await expect(page.locator('#owner-app')).toBeHidden();
 expect(await page.locator('#owner-app').evaluate(el=>el.inert)).toBe(true);
 await expect(page.locator('.owner-photo')).toHaveJSProperty('naturalWidth',2048);
 const card=await page.locator('.owner-login-card').boundingBox();expect(card.x).toBeGreaterThan(page.viewportSize().width*.5);
 expect(requests).toHaveLength(0);
 await page.screenshot({path:testInfo.outputPath('login-screen.png')});
 await page.locator('#owner-username').press('Tab');await expect(page.locator('#owner-password')).toBeFocused();
});
test('wrong password stays locked and clears the password field',async({page})=>{
 await page.goto('/');await typeLogin(page,'wrong');
 await expect(page.locator('#owner-login-message')).toContainText('ไม่ถูกต้อง');
 await expect(page.locator('#owner-app')).toBeHidden();await expect(page.locator('#owner-password')).toHaveValue('');
 expect(requests).toHaveLength(1);expect(requests[0].method()).toBe('POST');
});
test('show/hide password has keyboard-accessible state',async({page})=>{
 await page.goto('/');await page.locator('#owner-password').fill('example');await page.locator('#owner-show-password').press('Enter');
 await expect(page.locator('#owner-password')).toHaveAttribute('type','text');await expect(page.locator('#owner-show-password')).toHaveAttribute('aria-pressed','true');
 await page.locator('#owner-show-password').press('Enter');await expect(page.locator('#owner-password')).toHaveAttribute('type','password');
});
test('unconfigured backend and rate limit are explained without opening app',async({page})=>{
 for(const code of ['AUTH_NOT_CONFIGURED','RATE_LIMITED']){
  await page.route('https://script.google.com/**',route=>route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({protocol:P,ok:false,code,retryAfterSeconds:900})}));
  await page.goto('/');await typeLogin(page);
  await expect(page.locator('#owner-login-message')).toContainText(code==='RATE_LIMITED'?'15 นาที':'setupOwnerAccount');await expect(page.locator('#owner-app')).toBeHidden();
 }
});
test('malformed auth receipt or network failure fails closed',async({page})=>{
 await page.route('https://script.google.com/**',r=>r.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"ok":true}'}));
 await page.goto('/');await typeLogin(page);await expect(page.locator('#owner-login-message')).toContainText('ยังเข้าสู่ระบบไม่ได้');await expect(page.locator('#owner-app')).toBeHidden();
 await page.route('https://script.google.com/**',r=>r.abort());await typeLogin(page);await expect(page.locator('#owner-submit')).toBeEnabled();await expect(page.locator('#owner-app')).toBeHidden();
});
test('forged sessionStorage cannot bypass server validation',async({page})=>{
 await page.addInitScript(token=>sessionStorage.setItem('promyan-v95-owner-session',JSON.stringify({token,expiresAt:Date.now()+28800000})),TOKEN);
 await useBackend(page);await page.goto('/');await expect(page.locator('#owner-login-message')).toContainText('เข้าสู่ระบบอีกครั้ง');await expect(page.locator('#owner-app')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('promyan-v95-owner-session'))).toBeNull();
});
test('end-to-end login, verified save, duplicate, reload and logout using actual GAS logic',async({page},testInfo)=>{
 const f=await useBackend(page);await page.goto('/');await typeLogin(page);
 await expect(page.locator('#owner-app')).toBeVisible();await expect(page.locator('#owner-login')).toBeHidden();
 await page.getByLabel('1. วันที่เกิด',{exact:true}).selectOption('422');await page.getByLabel('2. วันเกิด',{exact:true}).selectOption('107');
 await page.getByLabel('3. เดือนเกิด',{exact:true}).selectOption('205');await page.getByLabel('4. ปีนักษัตร',{exact:true}).selectOption('301');
 await page.getByLabel('5. ปี พ.ศ. เกิด',{exact:true}).fill('2527');await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
 await page.getByRole('button',{name:'เลข 7 ตัว',exact:true}).click();await expect(page.getByRole('meter')).toHaveCount(7);
 await page.getByLabel('ชื่อเจ้าชะตา',{exact:true}).fill('ทดสอบ Login');
 await page.locator('.btn-db').click();await expect(page.locator('#app-status')).toContainText('ยืนยันการบันทึกแล้ว');
 await page.locator('.btn-db').click();await expect(page.locator('#app-status')).toContainText('บันทึกไว้แล้ว');expect(f.rows).toHaveLength(2);
 const cached=await page.evaluate(()=>sessionStorage.getItem('promyan-v95-save-request'));expect(cached).not.toContain('token');expect(cached).not.toContain(PASSWORD);
 await page.screenshot({path:testInfo.outputPath('after-login.png')});
 await page.reload();await expect(page.locator('#owner-app')).toBeVisible();
 const s=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('promyan-v95-owner-session')));
 await page.locator('#owner-logout').click();await expect(page.locator('#owner-login')).toBeVisible();await expect(page.locator('#owner-app')).toBeHidden();
 expect(f.post({protocol:P,action:'session',token:s.token}).code).toBe('UNAUTHORIZED');expect(f.rows).toHaveLength(2);
 expect(await page.evaluate(()=>sessionStorage.getItem('promyan-v95-save-request'))).toBeNull();
});
test('server-revoked session on save relocks and preserves pending chart for re-login',async({page})=>{
 const f=await useBackend(page);await page.goto('/');await typeLogin(page);await expect(page.locator('#owner-app')).toBeVisible();
 await page.getByLabel('1. วันที่เกิด',{exact:true}).selectOption('422');await page.getByLabel('2. วันเกิด',{exact:true}).selectOption('107');await page.getByLabel('3. เดือนเกิด',{exact:true}).selectOption('205');await page.getByLabel('4. ปีนักษัตร',{exact:true}).selectOption('301');await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
 await page.getByLabel('ชื่อเจ้าชะตา',{exact:true}).fill('Pending client');f.ctx.revokeOwnerSessions();
 await page.locator('.btn-db').click();await expect(page.locator('#owner-login-message')).toContainText('สิทธิ์หมดอายุ');expect(f.rows).toHaveLength(1);
 const before=await page.evaluate(()=>sessionStorage.getItem('promyan-v95-save-request'));
 await typeLogin(page);await expect(page.locator('#owner-app')).toBeVisible();await expect(page.getByLabel('ชื่อเจ้าชะตา',{exact:true})).toHaveValue('Pending client');
 expect(await page.evaluate(()=>sessionStorage.getItem('promyan-v95-save-request'))).toBe(before);
 await page.locator('.btn-db').click();await expect(page.locator('#app-status')).toContainText('ยืนยันการบันทึกแล้ว');expect(f.rows).toHaveLength(2);
});
test('client expiry timer locks an open chart without deleting pending input',async({page})=>{
 await page.clock.install();
 await page.route('https://script.google.com/**',route=>{
  const p=route.request().postDataJSON();
  return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({protocol:P,ok:true,status:'authenticated',token:p.sessionCandidate,expiresAt:Date.now()+30000})});
 });
 await page.goto('/');await typeLogin(page);await expect(page.locator('#owner-app')).toBeVisible();
 await page.getByLabel('5. ปี พ.ศ. เกิด',{exact:true}).fill('2527');
 await page.clock.fastForward(31000);await expect(page.locator('#owner-login')).toBeVisible();await expect(page.locator('#owner-login-message')).toContainText('หมดเวลา');
 await expect(page.getByLabel('5. ปี พ.ศ. เกิด',{exact:true})).toHaveValue('2527');
 expect(await page.evaluate(()=>sessionStorage.getItem('promyan-v95-owner-session'))).toBeNull();
});
