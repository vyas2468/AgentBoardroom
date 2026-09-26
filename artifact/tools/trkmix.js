const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://127.0.0.1:'+srv.address().port+'/'); const s=fs.readFileSync('db/live_scan.json','utf8');
await pg.evaluate(s=>{localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)}));localStorage.removeItem('alexaligned.tracker.v1');},s); await pg.reload(); await pg.waitForTimeout(1500); await pg.setInputFiles('#hxFile','real_hist.csv'); await pg.waitForTimeout(6000);
await pg.evaluate(()=>document.querySelector('#tab-qry').click());
const lastTile=await pg.evaluate(()=>{ const c=[...document.querySelectorAll('#hx93Tiles > div > div')]; const x=c[c.length-1]; return x?x.firstElementChild.textContent:'none'; }); console.log('LAST TILE GROUP:',lastTile);
for(const q of JSON.parse(fs.readFileSync('q_trkmix.json','utf8'))){ const n0=await pg.evaluate(()=>document.querySelectorAll('#qmThread .qm-turn').length);
 await pg.evaluate(q=>{document.querySelector('#qmInput').value=q;document.querySelector('#qmGo').click();},q); await pg.waitForFunction(n=>document.querySelectorAll('#qmThread .qm-turn').length>n,n0);
 const r=await pg.evaluate(()=>{ const a=document.querySelectorAll('#qmThread .qm-turn'); const x=a[a.length-1]; const bt=x.querySelector('[data-trk]'); if(!bt) return 'NO BUTTON: '+x.querySelector('.qm-a').innerText.slice(0,120); const t=bt.textContent; bt.click(); return t+' -> '+x.querySelector('.hx103').innerText.slice(0,110); }); console.log(q.slice(0,60),'|',r); }
console.log('PICKS:',await pg.evaluate(()=>JSON.stringify(window.__trk.state().ports.map(p=>p.ups[0].picks.map(x=>x.s+(x.side==='short'?'(S)':'')).join(' ')))));
console.log('TRACKED:',await pg.evaluate(()=>window.__trk.state().ports.length),'errors',errs); await b.close(); srv.close(); })();
