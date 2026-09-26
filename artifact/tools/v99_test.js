const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8'); const site='site_new';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const c=await b.newContext({viewport:{width:1300,height:950},colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ [...document.querySelectorAll('#tabGroups button')].find(x=>x.dataset.g==='all').click(); document.querySelector('#tab-qry').click(); });
 const ev=(f,a)=>p.evaluate(f,a); const L=()=>ev(()=>window.__hx99.list());
 // create tile
 await ev(()=>{ document.querySelector('#hx99New').value='Favourites'; document.querySelector('#hx99My [data-a="new"]').click(); });
 console.log('1 create:', JSON.stringify(await L()));
 // ask two questions, save both via ☆ Save
 for(const q of ['Overall sentiment','Sentiment by sector']){ await ev(q=>{ document.querySelector('#qmInput').value=q; document.querySelector('#qmGo').click(); },q); await p.waitForTimeout(700); }
 console.log('save buttons:', await ev(()=>document.querySelectorAll('#qmThread .hx99s').length));
 for(const k of [0,1]){ await ev(k=>{ document.querySelectorAll('#qmThread > .qm-turn')[k].querySelector('.hx99s').click(); },k); await ev(k=>document.querySelectorAll('#qmThread > .qm-turn')[k].querySelector('.hx99go').click(),k); }
 // save 2nd again into a NEW tile via picker
 await ev(()=>{ const t=document.querySelectorAll('#qmThread > .qm-turn')[1]; t.querySelector('.hx99s').click(); const pk=t.querySelector('.hx99pick'); const s=pk.querySelector('select'); s.value='__new'; s.dispatchEvent(new Event('change')); pk.querySelector('input').value='Breadth'; pk.querySelector('.hx99go').click(); });
 console.log('2 saved:', JSON.stringify(await L()));
 await p.screenshot({path:'v99_turn.png',clip:{x:0,y:0,width:1300,height:10}}).catch(()=>{});
 // add typed question, move up, remove, rename, run, edit
 await ev(()=>{ const card=document.querySelector('#hx99My .hx99t[data-t="0"]'); card.querySelector('.hx99add').value='Which themes are strengthening?'; card.querySelector('[data-a="add"]').click(); });
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="0"] .hx99q[data-j="2"] [data-a="up"]').click());
 console.log('3 add+up:', JSON.stringify((await L())[0]));
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="0"] .hx99q[data-j="2"] [data-a="rm"]').click());
 await ev(()=>{ const card=document.querySelector('#hx99My .hx99t[data-t="1"]'); card.querySelector('[data-a="ren"]').click(); card.querySelector('.hx99ren input').value='Breadth tables'; card.querySelector('[data-a="rengo"]').click(); });
 console.log('4 rm+rename:', JSON.stringify(await L()));
 const n0=await ev(()=>document.querySelectorAll('#qmThread > .qm-turn').length);
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="0"] .hx99q[data-j="1"] [data-a="run"]').click()); await p.waitForTimeout(800);
 console.log('5 run:', await ev(n=>{ const a=document.querySelectorAll('#qmThread > .qm-turn'); return a.length>n? a[a.length-1].querySelector('.qm-q').textContent : 'no new turn'; },n0));
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="0"] .hx99q[data-j="0"] [data-a="edit"]').click());
 console.log('6 edit -> input:', await ev(()=>document.querySelector('#qmInput').value));
 // delete needs two clicks
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="1"] [data-a="del"]').click());
 console.log('7 after 1 click:', (await L()).length, await ev(()=>document.querySelector('#hx99My .hx99t[data-t="1"] [data-a="del"]').textContent));
 await ev(()=>document.querySelector('#hx99My .hx99t[data-t="1"] [data-a="del"]').click());
 console.log('   after confirm:', JSON.stringify(await L()));
 // backup / restore
 const bk=JSON.stringify(await L());
 await p.reload(); await p.waitForTimeout(1500); await ev(()=>document.querySelector('#tab-qry').click());
 console.log('8 after reload:', JSON.stringify(await L()), '| summary:', await ev(()=>document.querySelector('#hx99My summary').textContent));
 await ev(()=>localStorage.removeItem('alexaligned.mytiles.v1')); await p.reload(); await p.waitForTimeout(1500); await ev(()=>document.querySelector('#tab-qry').click());
 await ev(b=>{ document.querySelector('#hx99My [data-a="paste"]').click(); document.querySelector('#hx99PasteIn').value=b; document.querySelector('#hx99My [data-a="pastego"]').click(); },bk);
 console.log('9 restored:', JSON.stringify(await L()));
 await ev(()=>document.querySelector('#hx99My').scrollIntoView()); await p.waitForTimeout(200);
 await p.locator('#hx99My').screenshot({path:'v99_panel.png'});
 console.log('errs',errs); await b.close(); srv.close(); })();
