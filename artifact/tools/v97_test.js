const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8'); const site='site_new';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const c=await b.newContext({viewport:{width:1300,height:1000},colorScheme:'dark',acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='warning'||m.type()==='error') errs.push('console:'+m.text()); });
 await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
 await p.setInputFiles('#hxFile','real_hist.csv'); await p.waitForFunction(()=>/Loaded:/.test(document.querySelector('#hxStatus').textContent),null,{timeout:30000});
 await p.evaluate(()=>{ [...document.querySelectorAll('#tabGroups button')].find(x=>x.dataset.g==='all').click(); document.querySelector('#tab-qry').click(); }); await p.waitForTimeout(500);
 console.log('bar', await p.evaluate(()=>document.querySelector('#hx97Bar').innerText.replace(/\n/g,' | ')));
 const qs=['Overall sentiment','Top 10 stocks by YTD return','Plot NVDA and AMD price','Is PYPL an anomaly?'];
 for(const q of qs){ await p.evaluate(q=>{ document.querySelector('#qmInput').value=q; document.querySelector('#qmGo').click(); },q); await p.waitForTimeout(1200); }
 console.log('times', await p.evaluate(()=>[...document.querySelectorAll('#qmThread .hx97time')].map(e=>e.textContent)));
 // toggles
 for(const k of ['try','hx','ask']) await p.evaluate(k=>document.querySelector('#hx97s_'+k).click(),k);
 console.log('hidden', await p.evaluate(()=>({ex:getComputedStyle(document.querySelector('#qmExamples')).display, hx:getComputedStyle(document.querySelector('#hxBox')).display, note:getComputedStyle(document.querySelector('#qmNote')).display, tiles:getComputedStyle(document.querySelector('#hx93Tiles')).display})));
 await p.reload(); await p.waitForTimeout(1800); await p.evaluate(()=>{ document.querySelector('#tab-qry').click(); });
 console.log('persist', await p.evaluate(()=>[ '#qmExamples','#hxBox'].map(s=>getComputedStyle(document.querySelector(s)).display).concat([document.querySelector('#hx97s_ask').checked])));
 for(const q of qs){ await p.evaluate(q=>{ document.querySelector('#qmInput').value=q; document.querySelector('#qmGo').click(); },q); await p.waitForTimeout(1200); }
 await p.screenshot({path:'v97_top.png'});
 // remove 2nd, undo, remove again
 const n0=await p.evaluate(()=>document.querySelectorAll('#qmThread > .qm-turn').length);
 await p.evaluate(()=>document.querySelectorAll('#qmThread > .qm-turn')[1].querySelector('.hx97x').click());
 const n1=await p.evaluate(()=>document.querySelectorAll('#qmThread > .qm-turn').length);
 await p.evaluate(()=>document.querySelector('#hx97Undo').click());
 const n2=await p.evaluate(()=>[...document.querySelectorAll('#qmThread > .qm-turn .qm-q')].map(e=>e.textContent));
 console.log('remove',n0,n1,n2);
 // downloads
 for(const [id,fn] of [['#hx97Png','thread.png'],['#hx97Pdf','thread.pdf']]){ const t=Date.now(); const [d]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click(id)]); await d.saveAs(fn); console.log(fn,fs.statSync(fn).size,'bytes',Date.now()-t,'ms'); }
 const [d2]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.evaluate(()=>document.querySelectorAll('#qmThread > .qm-turn')[2].querySelector('.hx97png').click())]); await d2.saveAs('turn.png'); console.log('turn', d2.suggestedFilename());
 console.log('errs',errs); await b.close(); srv.close(); })();
