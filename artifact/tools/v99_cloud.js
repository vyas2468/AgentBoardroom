const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8'); const site='site_new';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0);
let STORE={}; // the simulated account store, shared by both "browsers"
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 async function browser(){ const c=await b.newContext({viewport:{width:1300,height:900}}); 
   await c.exposeFunction('__dbSet',(k,v)=>{ STORE[k]=JSON.parse(v); }); await c.exposeFunction('__dbGet',k=>STORE[k]?JSON.stringify(STORE[k]):null);
   await c.addInitScript(()=>{ window.claude={use:function(n){ if(n!=="db") return Promise.resolve(null); return Promise.resolve({doc:function(path){ return {get:function(){ return window.__dbGet(path).then(function(v){ var d=v?JSON.parse(v):undefined; return {exists:!!d,data:function(){ return d; }}; }); },set:function(o){ return window.__dbSet(path,JSON.stringify(o)); }}; }}); }}; });
   const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
   await p.evaluate(()=>{ [...document.querySelectorAll('#tabGroups button')].find(x=>x.dataset.g==='all').click(); document.querySelector('#tab-qry').click(); });
   return {c,p,errs}; }
 const A=await browser();
 console.log('A status:', await A.p.evaluate(()=>document.querySelector('#hx99Cloud').textContent));
 await A.p.evaluate(()=>{ document.querySelector('#hx99New').value='Favourites'; document.querySelector('#hx99My [data-a="new"]').click(); });
 await A.p.evaluate(()=>{ const card=document.querySelector('#hx99My .hx99t'); card.querySelector('.hx99add').value='Overall sentiment'; card.querySelector('[data-a="add"]').click(); });
 await A.p.waitForTimeout(900);
 console.log('A status after save:', await A.p.evaluate(()=>document.querySelector('#hx99Cloud').textContent), '| store:', JSON.stringify(STORE['mytiles/main'].tiles));
 const B=await browser(); await B.p.waitForTimeout(500);
 console.log('B (new browser, empty storage):', JSON.stringify(await B.p.evaluate(()=>window.__hx99.list())), '|', await B.p.evaluate(()=>document.querySelector('#hx99Cloud').textContent));
 // edit in B, reload A -> A picks up B's newer copy
 await B.p.evaluate(()=>{ const card=document.querySelector('#hx99My .hx99t'); card.querySelector('.hx99add').value='Which themes are strengthening?'; card.querySelector('[data-a="add"]').click(); }); await B.p.waitForTimeout(900);
 await A.p.reload(); await A.p.waitForTimeout(1800);
 console.log('A after reload:', JSON.stringify(await A.p.evaluate(()=>window.__hx99.list())));
 console.log('errs', A.errs, B.errs); await b.close(); srv.close(); })();
