const { test, expect } = require('playwright/test');
const {routeFonts}=require('./fonts.cjs');

// Deterministic interaction tests: placeholder card art + capture stub.
// These do NOT certify the real card images, CDN availability or exported layout.
const fixtureImage = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="300"><rect width="180" height="300" fill="#d9e2ed"/><text x="25" y="150" font-size="20">TEST CARD</text></svg>';
const captureStub = `window.html2canvas = async () => {
  if (window.__captureShouldFail) throw Error('Simulated capture failure');
  const canvas = document.createElement('canvas'); canvas.width=16; canvas.height=16;
  canvas.getContext('2d').fillRect(0,0,16,16); return canvas;
};`;
let pageErrors=[];
let externalWrites=[];
test.beforeEach(async ({ page }) => {
  pageErrors=[]; externalWrites=[];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => dialog.dismiss());
  await page.route('**/*', async route => {
    if(await routeFonts(route)) return;
    const req=route.request(), url=new URL(req.url());
    if (/script\.google\.com/.test(url.hostname)) {
      externalWrites.push(req.url()); return route.abort();
    }
    if (url.pathname.includes('html2canvas')) return route.fulfill({contentType:'application/javascript',body:captureStub});
    if (/\/images\//.test(url.pathname)) return route.fulfill({contentType:'image/svg+xml',body:fixtureImage});
    if (url.hostname !== '127.0.0.1') return route.fulfill({contentType:'text/css',body:''});
    return route.continue();
  });
  await page.goto('/');
});
test.afterEach(async () => {
  expect(pageErrors, 'No uncaught JavaScript errors').toEqual([]);
  expect(externalWrites, 'Never write real Google Sheet data during tests').toEqual([]);
});
async function generate(page) {
  await page.getByLabel('1. วันที่เกิด',{exact:true}).selectOption('422');
  await page.getByLabel('2. วันเกิด',{exact:true}).selectOption('107');
  await page.getByLabel('3. เดือนเกิด',{exact:true}).selectOption('205');
  await page.getByLabel('4. ปีนักษัตร',{exact:true}).selectOption('301');
  await page.getByLabel('5. ปี พ.ศ. เกิด',{exact:true}).fill('2527');
  await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
  await expect(page.locator('#main-board .card-item').first()).toBeVisible();
}
async function seven(page) {
  await generate(page);
  await page.getByRole('button',{name:'เลข 7 ตัว',exact:true}).click();
  await expect(page.locator('.seven-strength-result')).toHaveCount(7);
}

test('empty inputs announce an error and focus the missing field', async ({page}) => {
  await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('กรุณาเลือก');
  await expect(page.locator('#sel-date')).toBeFocused();
  await expect(page.locator('#sel-date')).toHaveAttribute('aria-invalid','true');
});
test('builds a complete board and clears the error', async ({page}) => {
  await generate(page);
  await expect(page.getByRole('status')).toContainText('แผนผังพร้อมใช้งาน');
  await expect(page.locator('#app-error')).toBeHidden();
  await expect(page.locator('#main-board [data-row="5"].card-item')).toHaveCount(12);
});
test('rejects an out-of-range birth year', async ({page}) => {
  await generate(page);
  await page.locator('#birth-be-year').fill('9999');
  await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
  await expect(page.locator('#birth-be-year')).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('2400–2600');
});
test('no 22-topic dropdown; seven numerical score cards remain', async ({page}) => {
  await seven(page);
  await expect(page.locator('#seven-topic-select')).toHaveCount(0);
  await expect(page.getByRole('meter')).toHaveCount(7);
  const scores=await page.getByRole('meter').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('aria-valuenow'))));
  expect(scores.every(n=>Number.isFinite(n)&&n>=0&&n<=100)).toBeTruthy();
});
test('graph cards support Enter and Space with toggle state', async ({page}) => {
  await generate(page);
  const card=page.locator('#main-board .card-item[data-row="5"]').first();
  await card.press('Enter'); await expect(card).toHaveAttribute('aria-pressed','true');
  await card.press('Space'); await expect(card).toHaveAttribute('aria-pressed','false');
});
test('seven-number card and base 8/9 controls highlight linked groups', async ({page}) => {
  await seven(page);
  const card=page.locator('#main-board .click-to-highlight-seven-group').first();
  await card.press('Enter'); await expect(card).toHaveAttribute('aria-pressed','true');
  await card.press('Space'); await expect(card).toHaveAttribute('aria-pressed','false');
  const house=page.locator('.nine-base-name').first();
  await house.press('Enter'); await expect(house).toHaveAttribute('aria-pressed','true');
});
test('diagonal control and good-card filter report their states', async ({page}) => {
  await generate(page);
  const diagonal=page.getByRole('button',{name:'แสดงไพ่กราฟชีวิตแบบแนวทแยง',exact:true});
  await diagonal.click(); await expect(diagonal).toHaveAttribute('aria-pressed','true');
  const filter=page.getByRole('button',{name:'แสดงไพ่ดีและดีมาก',exact:true});
  await filter.click(); await expect(filter).toHaveAttribute('aria-pressed','true');
  await filter.click(); await expect(filter).toHaveAttribute('aria-pressed','false');
});
test('age change preserves client fields, manual numbers and keyboard focus', async ({page}) => {
  await generate(page);
  await page.getByLabel('ชื่อเจ้าชะตา',{exact:true}).fill('ผู้ทดสอบจำลอง');
  await page.locator('.number-dropdown').first().selectOption('9');
  const age=await page.locator('.age-button').nth(1).getAttribute('data-age');
  await page.locator('.age-button').nth(1).press('Enter');
  await expect(page.locator('.age-button[data-age="'+age+'"]')).toBeFocused();
  await expect(page.getByLabel('ชื่อเจ้าชะตา',{exact:true})).toHaveValue('ผู้ทดสอบจำลอง');
  await expect(page.locator('.number-dropdown').first()).toHaveValue('9');
  await page.getByRole('button',{name:'อายุปัจจุบัน',exact:true}).click();
  await expect(page.locator('.age-button.is-current')).toHaveAttribute('aria-pressed','true');
});
test('graph12 navigation manages focus and keyboard card state', async ({page}) => {
  await generate(page);
  await page.getByRole('button',{name:'ฐานกราฟ12ใบ',exact:true}).click();
  await expect(page.locator('#graph12-title')).toBeFocused();
  await expect(page.locator('.graph12-card')).toHaveCount(12);
  await page.getByRole('button',{name:'วันอาทิตย์',exact:true}).click();
  const card=page.locator('.graph12-card[data-pos="วาสนา"]');
  await card.press('Enter'); await expect(card).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'กลับกระดานหลัก',exact:true}).click();
  await expect(page.locator('.btn-graph12')).toBeFocused();
});
test('graph12 age rerender retains focus', async ({page}) => {
  await generate(page);
  await page.getByRole('button',{name:'ฐานกราฟ12ใบ',exact:true}).click();
  const age=await page.locator('.graph12-age-button').nth(1).getAttribute('data-graph12-age');
  await page.locator('.graph12-age-button').nth(1).press('Enter');
  await expect(page.locator('[data-graph12-age="'+age+'"]')).toBeFocused();
});
test('all generated fields and images have accessible names', async ({page}) => {
  await seven(page);
  const missing=await page.locator('input, select, img').evaluateAll(nodes=>nodes.filter(n=>{
    if(n.tagName==='IMG') return !n.hasAttribute('alt');
    return !(n.getAttribute('aria-label')||n.getAttribute('aria-labelledby')||n.labels?.length);
  }).map(n=>n.outerHTML));
  expect(missing).toEqual([]);
});
test('skip link is keyboard reachable and focuses main heading', async ({page}) => {
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-view-title')).toBeFocused();
});
test('main PNG workflow cleans up temporary elements (capture mocked)', async ({page}) => {
  await generate(page);
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'บันทึกภาพ',exact:true}).click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator('.temp-span')).toHaveCount(0);
  await expect(page.getByLabel('ชื่อเจ้าชะตา',{exact:true})).toBeVisible();
});
test('main PNG failure restores form controls (capture mocked)', async ({page}) => {
  await generate(page);
  await page.evaluate(()=>{window.__captureShouldFail=true;});
  await page.getByRole('button',{name:'บันทึกภาพ',exact:true}).click();
  await expect(page.locator('#export-area')).not.toHaveClass(/capture-safe-mode/);
  await expect(page.locator('.temp-span')).toHaveCount(0);
});
test('graph12 PNG workflow restores the save button (capture mocked)', async ({page}) => {
  await generate(page);
  await page.getByRole('button',{name:'ฐานกราฟ12ใบ',exact:true}).click();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'บันทึกเป็นภาพ',exact:true}).click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator('#graph12-save-button')).toBeEnabled();
});
test('reduced motion and keyboard focus indicator are present', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await generate(page);
  const card=page.locator('#main-board .card-item[data-row="5"]').first();
  await card.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(card).toBeFocused();
  const css=await card.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,transition:getComputedStyle(el).transitionDuration, reduce:matchMedia('(prefers-reduced-motion: reduce)').matches}));
  expect(css.reduce).toBe(true);
  expect(css.outline).not.toBe('none'); expect(css.transition).toBe('0s');
});

test('no visible level badges overlay cards; accessible descriptions remain', async ({page}) => {
  await seven(page);
  await expect(page.locator('.card-a11y-status')).toHaveCount(0);
  await expect(page.locator('#main-board .card-item[data-row="2"]').first()).toHaveAttribute('aria-label',/ระดับ/);
  await expect(page.locator('#main-board .pos-label').first()).toBeVisible();
});

const databaseProtocol='promyan-save-v1';
async function databaseMock(page, handler, health={protocol:databaseProtocol,ok:true,ready:true}) {
  const requests=[];
  await page.route('https://script.google.com/**', async route => {
    const reply = body => route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
    if(route.request().method()==='GET') return reply(health);
    const body=route.request().postDataJSON();requests.push(body);
    return handler(route,body,reply,requests);
  });
  return requests;
}
function receipt(body, extra={}) {
  return {protocol:databaseProtocol,ok:true,verified:true,status:'saved',requestId:body.requestId,row:2,savedAt:'2026-09-20T12:00:00Z',...extra};
}
async function fillClient(page) {
  await generate(page);
  await page.getByLabel('ชื่อเจ้าชะตา',{exact:true}).fill('ผู้ทดสอบจำลอง');
  await page.getByLabel('วันเดือนปีเกิดเจ้าชะตา',{exact:true}).fill('22/4/2527');
}
test('confirmed save shows success only with matching readback receipt', async ({page}) => {
  const requests=await databaseMock(page,(_route,body,reply)=>reply(receipt(body)));
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Google Sheet ยืนยันการบันทึกแล้ว');
  expect(requests).toHaveLength(1);
  await expect(page.getByRole('status')).toContainText(requests[0].requestId);
});
test('old backend is detected before sending any client data', async ({page}) => {
  const requests=await databaseMock(page,()=>{throw Error('must not POST');},{ok:true});
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('ต้องติดตั้งและ Deploy');
  expect(requests).toHaveLength(0);
});
test('empty client information never sends a request', async ({page}) => {
  const requests=await databaseMock(page,()=>{throw Error('must not POST');});
  await generate(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('กรุณาระบุชื่อ');
  await expect(page.getByLabel('ชื่อเจ้าชะตา',{exact:true})).toBeFocused();
  expect(requests).toHaveLength(0);
});
test('wrong receipt ID never shows success', async ({page}) => {
  await databaseMock(page,(_route,body,reply)=>reply(receipt(body,{requestId:'wrong'})));
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('ยังยืนยันผลไม่ได้');
  await expect(page.getByRole('button',{name:'บันทึก Google Sheet',exact:true})).toBeEnabled();
});
test('missing verification flag never shows success', async ({page}) => {
  await databaseMock(page,(_route,body,reply)=>reply(receipt(body,{verified:false})));
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('ยังยืนยันผลไม่ได้');
});
test('lost response and retry keep one request ID, including after reload', async ({page}) => {
  const requests=await databaseMock(page,(route,body,reply,all)=>all.length===1?route.abort('failed'):reply(receipt(body,{status:'duplicate'})));
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('ยังยืนยันผลไม่ได้');
  await page.reload(); await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('ยืนยันว่ารายการนี้บันทึกไว้แล้ว');
  expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
});
test('malformed server response never shows success', async ({page}) => {
  await databaseMock(page,route=>route.fulfill({status:200,contentType:'text/html',headers:{'Access-Control-Allow-Origin':'*'},body:'<html>Login required</html>'}));
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('ยังยืนยันผลไม่ได้');
});
test('timeout restores the button and preserves the retry ID', async ({page}) => {
  await page.clock.install();
  const requests=await databaseMock(page,()=>{});
  await fillClient(page);
  await page.getByRole('button',{name:'บันทึก Google Sheet',exact:true}).click();
  await expect.poll(()=>requests.length).toBe(1);
  await expect(page.locator('.btn-db')).toBeDisabled();
  await page.clock.fastForward(21000);
  await expect(page.getByRole('alert')).toContainText('ยังยืนยันผลไม่ได้');
  await expect(page.locator('.btn-db')).toBeEnabled();
});
