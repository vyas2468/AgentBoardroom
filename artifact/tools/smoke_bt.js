const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const pg=await b.newPage({viewport:{width:1300,height:1000}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('dialog',d=>d.accept());
  const url='http://127.0.0.1:'+srv.address().port+'/';
  await pg.goto(url);
  await pg.evaluate(()=>localStorage.removeItem('alexaligned.tracker.v1'));

  const scanText=fs.readFileSync('fixtures_backtest/sample_scan_1day.csv','utf8');
  await pg.evaluate(s=>{ window.__bt.realIngestAndReload(s); }, scanText);
  await pg.waitForTimeout(1000);
  await pg.setInputFiles('#hxFile','real_hist.csv'); await pg.waitForTimeout(7000);

  await pg.evaluate(()=>document.querySelector('#tab-qry').click());
  const n0=await pg.evaluate(()=>document.querySelectorAll('#qmThread .qm-turn').length);
  await pg.evaluate(()=>{ document.querySelector('#qmInput').value='Build a smart portfolio of 8 stocks in an uptrend, pulling back, ranked by strength'; document.querySelector('#qmGo').click(); });
  await pg.waitForFunction(n=>document.querySelectorAll('#qmThread .qm-turn').length>n,n0,{timeout:15000});
  const tracked=await pg.evaluate(()=>{ const a=document.querySelectorAll('#qmThread .qm-turn'); const x=a[a.length-1]; const bt=x.querySelector('[data-trk]'); if(bt){ bt.click(); return true; } return false; });
  console.log('TRACKED A PORTFOLIO:',tracked);
  await pg.waitForTimeout(300);

  await pg.evaluate(()=>document.querySelector('#tab-ptk').click());
  await pg.waitForTimeout(500);
  const beforeOverview=await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText);
  console.log('LIVE OVERVIEW BEFORE (first 400 chars):\n',beforeOverview.slice(0,400));

  const hasBtSection=await pg.evaluate(()=>!!document.getElementById('bt104Wrap'));
  console.log('BACKTEST SECTION PRESENT:',hasBtSection);

  await pg.setInputFiles('#bt104File1','bt_synth_scan_full.csv');
  await pg.setInputFiles('#bt104File2','bt_synth_hist.csv');
  await pg.evaluate(()=>document.getElementById('bt104Run').click());
  await pg.waitForFunction(()=>{ var w=document.getElementById('bt104Wrap'); return w&&!/Running/.test(w.innerText); },null,{timeout:20000});
  const afterBt=await pg.evaluate(()=>document.getElementById('bt104Wrap').innerText);
  console.log('BACKTEST RESULT AREA (first 900 chars):\n',afterBt.slice(0,900));

  const afterOverview=await pg.evaluate(()=>document.querySelector('#pane-ptk').innerText);
  const liveUnaffected = beforeOverview.split('\n').slice(0,6).join('\n') === afterOverview.split('\n').slice(0,6).join('\n');
  console.log('LIVE TRACKER TOP LINES UNCHANGED AFTER BACKTEST:',liveUnaffected);

  console.log('PAGE ERRORS:',errs);
  await b.close(); srv.close();
})();
