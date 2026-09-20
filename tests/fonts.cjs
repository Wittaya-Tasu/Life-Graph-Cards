// Local font fixtures keep Thai browser/PNG tests independent of Google Fonts.
const fs=require('node:fs');
const css=Object.entries({sarabun:[400,600,700,800],kanit:[500,600,700]}).flatMap(([family,weights])=>
  weights.map(weight=>fs.readFileSync(require.resolve('@fontsource/'+family+'/'+weight+'.css'),'utf8')
    .replaceAll('url(./files/','url(http://127.0.0.1:9535/test-fonts/'+family+'/files/'))).join('\n');
async function routeFonts(route) {
  const url=new URL(route.request().url());
  if(url.hostname==='fonts.googleapis.com') {
    await route.fulfill({contentType:'text/css',body:css});return true;
  }
  const match=url.pathname.match(/^\/test-fonts\/(sarabun|kanit)\/files\/([a-z0-9-]+\.woff2?)$/);
  if(match) {
    await route.fulfill({contentType:match[2].endsWith('woff2')?'font/woff2':'font/woff',body:fs.readFileSync(require.resolve('@fontsource/'+match[1]+'/files/'+match[2]))});return true;
  }
  return false;
}
module.exports={routeFonts};
