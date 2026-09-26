const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage({viewport:{width:1300,height:1000}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.accept());
const url='http://127.0.0.1:'+srv.address().port+'/';
async function loadScan(f){ const s=fs.readFileSync(f,'utf8'); await pg.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),s); await pg.reload(); await pg.waitForTimeout(1500); await pg.setInputFiles('#hxFile','real_hist.csv'); await pg.waitForTimeout(7000); }
async function ask(q){ await pg.evaluate(()=>document.querySelector('#tab-qry').click()); const n0=await pg.evaluate(()=>document.querySelectorAll('#qmThread .qm-turn').length); await pg.evaluate(q=>{document.querySelector('#qmInput').value=q;document.querySelector('#qmGo').click();},q); await pg.waitForFunction(n=>document.querySelectorAll('#qmThread .qm-turn').length>n,n0); }
async function tab(){ await pg.evaluate(()=>document.querySelector('#tab-ptk').click()); await pg.waitForTimeout(500); return pg.evaluate(()=>document.querySelector('#pane-ptk').innerText); }
await pg.goto(url); await pg.evaluate(()=>localStorage.removeItem('alexaligned.tracker.v1'));
await loadScan('db/scan_d1.json');
await ask("Show me top 10 stocks in an uptrend, pulling back, rank by strength");
let t=await pg.evaluate(()=>{ const a=document.querySelectorAll('#qmThread .qm-turn'); const x=a[a.length-1]; const bt=x.querySelector('[data-trk]'); const txt=bt?bt.textContent:''; if(bt) bt.click(); return txt+' | '+x.querySelector('.hx103').innerText; }); console.log('TRACK1:',t);
await ask("Build a smart portfolio of 8 stocks in an uptrend, pulling back, ranked by strength");
t=await pg.evaluate(()=>{ const a=document.querySelectorAll('#qmThread .qm-turn'); const x=a[a.length-1]; const bt=x.querySelector('[data-trk]'); if(bt) bt.click(); return x.querySelector('.hx103').innerText; }); console.log('TRACK2:',t);
console.log('STATE1:',await pg.evaluate(()=>JSON.stringify(window.__trk.state().ports.map(p=>[p.name,p.ups.map(u=>u.d+':'+u.picks.map(x=>x.s).join(' '))]))));
await loadScan('db/scan_d2.json');
await tab(); await pg.evaluate(()=>document.querySelector('[data-trkupd]').click()); await pg.waitForTimeout(800);
let txt=await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText); console.log('TAB AFTER UPDATE (d2):\n'+txt.slice(0,3500));
await pg.evaluate(()=>document.querySelector('[data-trkupd]').click()); await pg.waitForTimeout(500);
console.log('SAME DATE AGAIN:',(await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText)).split('\n').filter(l=>/replaced|older/.test(l)).join(' | '));
console.log('STATE2:',await pg.evaluate(()=>JSON.stringify(window.__trk.state().ports.map(p=>[p.ups.length,p.ups.map(u=>u.d+' exits:'+JSON.stringify(u.exits))]))));
await loadScan('db/scan_d1.json'); await tab(); await pg.evaluate(()=>document.querySelector('[data-trkupd]').click()); await pg.waitForTimeout(500);
console.log('OLDER SCAN:',(await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText)).split('\n').filter(l=>/older/.test(l)).join(' | '));
await pg.evaluate(()=>document.querySelector('#tab-ptk').click()); const el=await pg.$('#pane-ptk'); await el.screenshot({path:'trk_tab.png'});
console.log('errors',errs); await b.close(); srv.close(); })();
