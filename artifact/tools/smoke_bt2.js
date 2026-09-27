const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const pg=await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const url='http://127.0.0.1:'+srv.address().port+'/';
  await pg.goto(url); await pg.waitForTimeout(600);

  /* inject a plain, non-cluster tracked portfolio directly (equivalent to what "Track this list" would save for a
     simple ranked-screen answer), so the UI-driven backtest exercises the fully-reproducible, successful path */
  await pg.evaluate(()=>{
    var ST=window.__trk.state();
    ST.ports.push({id:"smoketest1",name:"Severity >= 45 screen",q:"test",kind:"list",
      spec:{filters:[{f:"sev",op:">=",v:45}],sort:{f:"sev",d:"desc"},limit:50},
      created:"2026-02-02",settings:{entry:"open",cost:0,notional:100000,rebalance:"daily"},
      ups:[{d:"2026-02-02",picks:[],exits:{}}]});
    window.__trk.render();
  });
  await pg.evaluate(()=>document.querySelector('#tab-ptk').click());
  await pg.waitForTimeout(300);

  await pg.evaluate(()=>{ var sel=document.getElementById('bt104Sel'); sel.value='smoketest1'; sel.dispatchEvent(new Event('change')); });
  await pg.setInputFiles('#bt104File1','bt_synth_scan_full.csv');
  await pg.setInputFiles('#bt104File2','bt_synth_hist.csv');
  await pg.evaluate(()=>document.getElementById('bt104Run').click());
  await pg.waitForFunction(()=>{ var w=document.getElementById('bt104Wrap'); return w&&!/Running/.test(w.innerText); },null,{timeout:20000});
  const html=await pg.evaluate(()=>document.getElementById('bt104Wrap').innerHTML);
  const text=await pg.evaluate(()=>document.getElementById('bt104Wrap').innerText);
  console.log('RESULT TEXT (first 1200 chars):\n',text.slice(0,1200));
  console.log('HAS SVG CHART:',/<svg/.test(html));
  console.log('HAS STATS TABLE:',/Sharpe-style ratio/.test(text));
  console.log('PAGE ERRORS:',errs);
  await b.close(); srv.close();
})();
