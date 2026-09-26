const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const live=fs.readFileSync('db/live_scan.json','utf8');
function serve(site){ return http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(site,p);if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(res);}).listen(0); }
const SY=['NVDA','KO','JNJ','XLK','FTNT'];
async function run(b,site,hist,scheme){
  const srv=serve(site); const c=await b.newContext({viewport:{width:1300,height:1100},colorScheme:scheme||'light'}); const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); });
  await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.evaluate(s=>localStorage.setItem('alexaligned.scan.v1',JSON.stringify({savedAt:'t',source:'device',scan:JSON.parse(s)})),live); await p.reload(); await p.waitForTimeout(1500);
  if(hist){ const t0=Date.now(); await p.setInputFiles('#hxFile',hist); await p.waitForFunction(()=>/Loaded:/.test((document.querySelector('#hxStatus')||{}).textContent||''),null,{timeout:30000}); await p.waitForTimeout(1000); console.log(site,'hist load ms',Date.now()-t0); }
  const out={tear:{},tabs:{}};
  for(const s of SY){ await p.evaluate(s=>{ openTear(s); },s).catch(async()=>{ await p.evaluate(s=>{ const a=document.createElement('span'); a.setAttribute('data-tear',s); document.body.appendChild(a); a.click(); a.remove(); },s); });
    out.tear[s]=await p.evaluate(()=>document.querySelector('#tearBody').innerHTML); await p.evaluate(()=>document.querySelector('#tearX').click()); }
  for(const t of ['cm','hg','ng','radar']){ const t0=Date.now(); await p.evaluate(t=>{ var g=[].find.call(document.querySelectorAll('#tabGroups button'),x=>/all/i.test(x.textContent)); if(g) g.click(); document.querySelector('#tab-'+t).click(); },t); await p.waitForTimeout(900);
    out.tabs[t]=await p.evaluate(t=>{ const pane=document.querySelector('#pane-'+t); const mine=pane.querySelector('[id^=hx84]'); const clone=pane.cloneNode(true); clone.querySelectorAll('[id^=hx9]').forEach(e=>{ const f=e.closest('figure'); if(f) f.remove(); }); clone.querySelectorAll('[id^=hx8],[id^=hx9],.hx89bar').forEach(e=>e.remove()); return {base:clone.innerHTML.length, baseText:clone.innerText, mine:mine?{hidden:mine.hidden,text:mine.innerText}:null}; },t);
    out.tabs[t].ms=Date.now()-t0; }
  out.errs=errs; await c.close(); srv.close(); return out;
}
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const hist=process.argv[2];
  const o83=await run(b,'site_83',hist), o84=await run(b,'site_new',hist), n84=await run(b,'site_new',null), n83=await run(b,'site_83',null);
  for(const s of SY){ console.log(s,'nohist tear identical:',n83.tear[s]===n84.tear[s],' hist tear prefix-equal:',o84.tear[s].startsWith(o83.tear[s].slice(0,o83.tear[s].length-12)),'extra chars',o84.tear[s].length-o83.tear[s].length); }
  for(const t of ['cm','hg','ng','radar']){ console.log(t,'nohist: mine',JSON.stringify(n84.tabs[t].mine&&n84.tabs[t].mine.hidden),'| base len 83/84',o83.tabs[t].base,o84.tabs[t].base,' text same',o83.tabs[t].baseText===o84.tabs[t].baseText,'| hist mine hidden',o84.tabs[t].mine&&o84.tabs[t].mine.hidden,'ms',o84.tabs[t].ms); }
  console.log('errs', o83.errs, o84.errs, n84.errs, n83.errs);
  fs.writeFileSync('hx84_out.json',JSON.stringify({o84,o83},null,1));
  await b.close(); })();
