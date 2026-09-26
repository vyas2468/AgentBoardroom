const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8'); const site='site_new';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const c=await b.newContext({viewport:{width:1300,height:950},colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
 await p.setInputFiles('#hxFile','real_hist.csv'); await p.waitForFunction(()=>/Loaded:/.test(document.querySelector('#hxStatus').textContent),null,{timeout:30000});
 await p.evaluate(()=>{ [...document.querySelectorAll('#tabGroups button')].find(x=>x.dataset.g==='all').click(); document.querySelector('#tab-qry').click(); });
 const out=[];
 for(const s of ['Semiconductors','Software - Infrastructure','Utilities - Regulated Electric','Aerospace & Defense','Specialty Industrial Machinery']){
   await p.evaluate(q=>{ document.querySelector('#qmInput').value=q; document.querySelector('#qmGo').click(); },'Show me the subsector web for '+s+' with AF approach'); await p.waitForTimeout(1500);
   const r=await p.evaluate(()=>{ const t=[...document.querySelectorAll('#qmThread > .qm-turn')].pop(); const svg=t.querySelector('svg[viewBox]'); if(!svg) return 'no svg'; const vb=svg.getAttribute('viewBox').split(/\s+/).map(Number); let out=0,n=0;
     svg.querySelectorAll('circle').forEach(c=>{ if(c.style.display==='none') return; n++; const x=+c.getAttribute('cx'), y=+c.getAttribute('cy'); if(x<vb[0]||y<vb[1]||x>vb[0]+vb[2]||y>vb[1]+vb[3]) out++; }); return n+' dots, '+out+' outside the frame'; });
   out.push(s+': '+r); }
 console.log(out.join('\n'));
 const t=await p.$$('#qmThread > .qm-turn'); await t[2].screenshot({path:'af_fit.png'});
 // colour-by check on the tab
 await p.evaluate(()=>{ document.querySelector('#tab-sbw').click(); }); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(!document.querySelector('#hx95AF').checked) document.querySelector('#hx95AF').click(); }); await p.waitForTimeout(400);
 const cols=async()=>p.evaluate(()=>[...document.querySelectorAll('#sbwChart circle.sbwdot')].map(d=>d.getAttribute('fill')).join(''));
 const c1=await cols(); const btns=await p.evaluate(()=>[...document.querySelectorAll('#pane-sbw button')].filter(b=>/3 ?d|3 day/i.test(b.textContent)).map(b=>b.textContent));
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('#pane-sbw button')].find(b=>/^\s*3\s*d/i.test(b.textContent)||/3 day/i.test(b.textContent)); if(b) b.click(); }); await p.waitForTimeout(500);
 const c3=await cols(); console.log('colour-by buttons found:',btns,'| colours change 1D->3D:',c1!==c3, '| note:', await p.evaluate(()=>[...document.querySelectorAll('#sbwChart svg text')].map(t=>t.textContent).find(x=>/AF Approach/.test(x))));
 await p.evaluate(()=>document.querySelector('#hx95AF').click());
 console.log('errs',errs); await b.close(); srv.close(); })();
