const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage({viewport:{width:1300,height:1000}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.accept());
const url='http://127.0.0.1:'+srv.address().port+'/';
async function loadScan(f){ const s=fs.readFileSync(f,'utf8'); await pg.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),s); await pg.reload(); await pg.waitForTimeout(1500); await pg.setInputFiles('#hxFile','real_hist.csv'); await pg.waitForTimeout(7000); }
async function ask(q){ await pg.evaluate(()=>document.querySelector('#tab-qry').click()); const n0=await pg.evaluate(()=>document.querySelectorAll('#qmThread .qm-turn').length); await pg.evaluate(q=>{document.querySelector('#qmInput').value=q;document.querySelector('#qmGo').click();},q); await pg.waitForFunction(n=>document.querySelectorAll('#qmThread .qm-turn').length>n,n0); }
async function tab(){ await pg.evaluate(()=>document.querySelector('#tab-ptk').click()); await pg.waitForTimeout(500); }
await pg.goto(url); await pg.evaluate(()=>localStorage.removeItem('alexaligned.tracker.v1'));
await loadScan('db/scan_d1.json');
await ask("Build a smart portfolio of 8 stocks in an uptrend, pulling back, ranked by strength");
await pg.evaluate(()=>{ const a=document.querySelectorAll('#qmThread .qm-turn'); const x=a[a.length-1]; const bt=x.querySelector('[data-trk]'); if(bt) bt.click(); });
console.log('TRACKED:',await pg.evaluate(()=>JSON.stringify(window.__trk.state().ports.map(p=>[p.id,p.name,p.ups.length]))));

// manually push several ups[] entries spanning ~3 weeks to simulate daily updates
const injected = await pg.evaluate(()=>{
  const st=window.__trk.state(); const p=st.ports[st.ports.length-1];
  const base=p.ups[0]; const picks0=base.picks;
  function addDays(d,n){ const dt=new Date(d+'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate()+n); return dt.toISOString().slice(0,10); }
  const offs=[1,2,3,8,9,15]; // spans ~3 weeks forward from the tracked date, several changes per week
  offs.forEach((n,i)=>{ const d=addDays(base.d,n); const picks = i%2===0 ? picks0.slice(0,picks0.length-1) : picks0; p.ups.push({d:d,picks:JSON.parse(JSON.stringify(picks)),exits:{}}); });
  return {id:p.id, ups:p.ups.length, base:base.d};
});
console.log('INJECTED:',JSON.stringify(injected));
await tab();
await pg.evaluate(()=>{ /* select this portfolio in the detail view */ });
function stat(){ return pg.evaluate(()=>{ const st=window.__trk.state(); const p=st.ports[st.ports.length-1]; const r=window.__trk.engine(p,window.__hxApi.get(),'RSP'); return {trades:r.trades.length,holdings:r.holdings.length,orders:r.orders,value:r.stats&&r.stats.value}; }); }
let before = await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText.match(/Latest update[^\n]*/)||['(none)']);
console.log('BEFORE (daily default) latest-update line:', before[0]);
console.log('BEFORE stat:', JSON.stringify(await stat()));

// open Settings editor for this portfolio and switch to Weekly
const opened = await pg.evaluate(()=>{ const btn=document.querySelector('[data-trkset]'); if(!btn) return false; btn.click(); return true; });
console.log('SETTINGS OPENED:',opened);
await pg.waitForTimeout(200);
const hasForm = await pg.evaluate(()=>!!document.getElementById('hx103SetRebal'));
console.log('SETTINGS FORM PRESENT:',hasForm);
await pg.evaluate(()=>{ const sel=document.getElementById('hx103SetRebal'); sel.value='weekly'; sel.dispatchEvent(new Event('change')); });
const saved = await pg.evaluate(()=>{ const btn=document.querySelector('[data-trksetsave]'); if(!btn) return false; btn.click(); return true; });
console.log('SETTINGS SAVED:',saved);
await pg.waitForTimeout(300);
const settingsAfter = await pg.evaluate(()=>JSON.stringify(window.__trk.state().ports[window.__trk.state().ports.length-1].settings));
console.log('SETTINGS NOW:',settingsAfter);
let after = await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText.match(/Latest update[^\n]*/)||['(none)']);
console.log('AFTER (weekly) latest-update line:', after[0]);
console.log('AFTER stat:', JSON.stringify(await stat()));
console.log('TRADE-COUNT-LINE CHANGED (display text):', before[0]!==after[0]);
console.log('COMPUTED TRADE COUNT / VALUE CHANGED (the real assertion):', 'see BEFORE/AFTER stat above');
console.log('page errors:', errs);
await b.close(); srv.close(); })();
