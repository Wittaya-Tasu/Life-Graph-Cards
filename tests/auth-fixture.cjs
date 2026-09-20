const TOKEN='a1'.repeat(32);
async function seedSession(page){await page.addInitScript(token=>{if(!sessionStorage.getItem('promyan-v95-owner-session'))sessionStorage.setItem('promyan-v95-owner-session',JSON.stringify({token,expiresAt:Date.now()+28800000}));},TOKEN);}
async function routeSession(route){
  const req=route.request();
  if(!req.url().startsWith('https://script.google.com/')||req.method()!=='POST')return false;
  const p=req.postDataJSON();if(p.protocol!=='promyan-auth-v1')return false;
  if(p.action!=='session')throw Error('Unexpected auth action in regression tests');
  await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({protocol:'promyan-auth-v1',ok:true,status:'authenticated',expiresAt:Date.now()+28800000})});return true;
}
module.exports={seedSession,routeSession,TOKEN};
