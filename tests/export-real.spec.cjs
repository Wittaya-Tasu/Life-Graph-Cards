const {seedSession,routeSession}=require('./auth-fixture.cjs');
const {test,expect}=require('playwright/test');
const fs=require('node:fs');
const {routeFonts}=require('./fonts.cjs');
const renderer=fs.readFileSync(require.resolve('html2canvas/dist/html2canvas.min.js'),'utf8');
const image='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="300"><rect width="180" height="300" fill="#dde7ef"/><path d="M20 20H160V280H20Z" fill="none" stroke="#203a57" stroke-width="5"/><text x="35" y="150" font-size="20">TEST CARD</text></svg>';
test.beforeEach(async({page})=>{
  await seedSession(page);
  await page.route('**/*',async route=>{
    if(await routeSession(route))return;
    if(await routeFonts(route))return;
    const url=new URL(route.request().url());
    if(url.pathname.includes('html2canvas'))return route.fulfill({contentType:'application/javascript',body:renderer});
    if(url.pathname.includes('/images/'))return route.fulfill({contentType:'image/svg+xml',body:image});
    if(url.hostname!=='127.0.0.1')return route.fulfill({contentType:'text/css',body:''});
    return route.continue();
  });
  await page.goto('/');
  await page.getByLabel('1. วันที่เกิด',{exact:true}).selectOption('422');
  await page.getByLabel('2. วันเกิด',{exact:true}).selectOption('107');
  await page.getByLabel('3. เดือนเกิด',{exact:true}).selectOption('205');
  await page.getByLabel('4. ปีนักษัตร',{exact:true}).selectOption('301');
  await page.getByLabel('5. ปี พ.ศ. เกิด',{exact:true}).fill('2527');
  await page.getByRole('button',{name:'ประมวลผล',exact:true}).click();
});
async function checkDownload(page,testInfo,button,name) {
  const pending=page.waitForEvent('download');await button.click();const download=await pending;
  const file=testInfo.outputPath(name+'.png');await download.saveAs(file);
  expect(await download.failure()).toBeNull();
  const bytes=fs.readFileSync(file);
  expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(500);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(300);
  expect(bytes.length).toBeGreaterThan(10000);
  await testInfo.attach(name+'-png',{path:file,contentType:'image/png'});
  await expect(page.locator('.capture-safe-mode')).toHaveCount(0);
  await expect(page.locator('.card-a11y-status')).toHaveCount(0);
}
test('real html2canvas exports seven-mode PNG with fixture card artwork',async({page},testInfo)=>{
  await page.getByRole('button',{name:'เลข 7 ตัว',exact:true}).click();
  await page.locator('#main-board .click-to-highlight-seven-group').first().press('Enter');
  await checkDownload(page,testInfo,page.getByRole('button',{name:'บันทึกภาพ',exact:true}),'seven');
  await expect(page.locator('.seven-strength-result')).toHaveCount(7);
  await page.screenshot({path:testInfo.outputPath('seven-screen.png')});
});
test('real html2canvas exports graph12 PNG with fixture card artwork',async({page},testInfo)=>{
  await page.getByRole('button',{name:'ฐานกราฟ12ใบ',exact:true}).click();
  await checkDownload(page,testInfo,page.getByRole('button',{name:'บันทึกเป็นภาพ',exact:true}),'graph12');
});
