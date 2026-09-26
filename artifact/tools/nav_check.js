const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8'); const site='site_new';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.querySelector('#tab-qry').click());
 await p.evaluate(()=>{ document.querySelector('#qmInput').value='Show me top 5 symbols improving, 1 per sector'; document.querySelector('#qmGo').click(); }); await p.waitForTimeout(700);
 const syms=await p.evaluate(()=>[...document.querySelectorAll('#qmThread .qm-turn:last-child table [data-tear]')].map(x=>x.getAttribute('data-tear')));
 await p.click('#qmThread .qm-turn:last-child table tr:nth-child(2) [data-tear]'); await p.waitForTimeout(300);
 const st=async()=>p.evaluate(()=>[document.querySelector('#tearBody').innerText.split('\n').slice(0,2).join(' | ').slice(0,70)]);
 console.log('list',syms); console.log('open', await st());
 for(const k of ['ArrowDown','ArrowDown','ArrowDown','ArrowDown','ArrowUp']){ await p.keyboard.press(k); await p.waitForTimeout(150); console.log(k, await st()); }
 await p.keyboard.press('Escape'); console.log('closed', await p.evaluate(()=>document.querySelector('#tearWrap').hidden), 'errs',errs); await b.close(); srv.close(); })();
