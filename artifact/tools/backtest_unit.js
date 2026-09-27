const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);

const realScan=fs.readFileSync('fixtures_backtest/sample_scan_1day.csv','utf8');
const synthFull=fs.readFileSync('bt_synth_scan_full.csv','utf8');
const synthTrunc=fs.readFileSync('bt_synth_scan_trunc.csv','utf8');
const synthHist=fs.readFileSync('bt_synth_hist.csv','utf8');

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const pg=await b.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const url='http://127.0.0.1:'+srv.address().port+'/';
  await pg.goto(url); await pg.waitForTimeout(800);

  /* real ingest path: upParseCSV+upStore (same as upProcessCSVText), then a real page reload so upBootScan()
     picks the stored scan up on fresh load -- exactly what dropping the CSV in the real "Update" modal does. */
  await pg.evaluate((text)=>{ window.__bt.realIngestAndReload(text); }, realScan);
  await pg.waitForTimeout(700);

  const out=await pg.evaluate((args)=>{
    const {realScan,synthFull,synthTrunc,synthHist}=args;
    const R=[]; function ok(n,c,x){ R.push((c?"PASS ":"FAIL ")+n+(c?"":" -> "+JSON.stringify(x))); }
    function pickFields(ctx,sym){ var r=ctx&&ctx.bySym&&ctx.bySym[sym]; if(!r) return null;
      return {sec:r.sec,ind:r.ind,r1:r.r1,r5:r.r5,sev:r.sev,comp:r.comp,td:r.td,tb:r.tb,trend:r.trend,px:r.px,dir:r.dir}; }

    /* ===== 0. identical-ingest correctness: real UI path (just ran, via a page reload) vs replayDate() ===== */
    var realCtx=window.__bt.liveCtx();
    ok("0. identical-ingest: the real ingest path produced a usable ctx",!!(realCtx&&realCtx.rows&&realCtx.rows.length),realCtx&&realCtx.rows&&realCtx.rows.length);
    var SYMS_TO_CHECK=["A","AAPL","MSFT"].filter(function(s){ return realCtx&&realCtx.bySym&&realCtx.bySym[s]; });
    if(!SYMS_TO_CHECK.length&&realCtx) SYMS_TO_CHECK=Object.keys(realCtx.bySym||{}).slice(0,3);

    var snap0=window.__bt.snapshot();
    var replayCtx=window.__bt.replayDate(realCtx.date,realScan,null);
    var snap1=window.__bt.snapshot();
    ok("0. identical-ingest: replayDate returned a ctx",!!replayCtx,replayCtx);
    var allMatch=true, mism=null;
    SYMS_TO_CHECK.forEach(function(sym){
      var a=pickFields(realCtx,sym), b=pickFields(replayCtx,sym);
      var same=JSON.stringify(a)===JSON.stringify(b);
      if(!same){ allMatch=false; mism={sym:sym,a:a,b:b}; }
    });
    ok("0. identical-ingest: "+SYMS_TO_CHECK.join(",")+" match between the real ingest path and replayDate()",allMatch,mism);
    ok("0. identical-ingest: globals reference-identical before/after replayDate (no runFn given)",
      snap0.S===snap1.S&&snap0.U===snap1.U&&snap0.SEC===snap1.SEC&&snap0.SYM===snap1.SYM&&snap0.HX===snap1.HX&&snap0.QM_CTX===snap1.QM_CTX,
      {S:snap0.S===snap1.S,U:snap0.U===snap1.U,SEC:snap0.SEC===snap1.SEC,SYM:snap0.SYM===snap1.SYM,HX:snap0.HX===snap1.HX,QM_CTX:snap0.QM_CTX===snap1.QM_CTX});

    /* ===== restore-on-error: force an exception mid-replayDate (callback throws), assert nothing changed ===== */
    var s0=window.__bt.snapshot();
    var threw=false, errMsg=null;
    try{
      window.__bt.replayDate("2026-02-02",realScan,null,function(ctx){ throw new Error("forced mid-replay failure"); });
    }catch(e){ threw=true; errMsg=e.message; }
    var s1=window.__bt.snapshot();
    ok("restore-on-error: replayDate propagated the forced runFn error",threw&&errMsg==="forced mid-replay failure",errMsg);
    ok("restore-on-error: S/U/SEC/SYM/HX/HXM/HXC/QM_CTX all reference-identical to before the call",
      s0.S===s1.S&&s0.U===s1.U&&s0.SEC===s1.SEC&&s0.SYM===s1.SYM&&s0.HX===s1.HX&&s0.HXM===s1.HXM&&s0.HXC===s1.HXC&&s0.QM_CTX===s1.QM_CTX,
      {S:s0.S===s1.S,U:s0.U===s1.U,SEC:s0.SEC===s1.SEC,SYM:s0.SYM===s1.SYM,HX:s0.HX===s1.HX,HXM:s0.HXM===s1.HXM,HXC:s0.HXC===s1.HXC,QM_CTX:s0.QM_CTX===s1.QM_CTX});

    /* also force upParseCSV() ITSELF to throw (a genuinely malformed CSV, no runFn at all) to prove the try/finally
       covers the parse step too, not just a runFn throwing */
    var s2=window.__bt.snapshot();
    var threw2=false;
    try{ window.__bt.replayDate("2026-02-02","garbage,not,a,real,scan\n1,2,3,4,5",null); }catch(e){ threw2=true; }
    var s3=window.__bt.snapshot();
    ok("restore-on-error: a malformed scan CSV (upParseCSV itself throws) also propagates and restores",
      threw2&&s2.S===s3.S&&s2.HX===s3.HX&&s2.QM_CTX===s3.QM_CTX,{threw2:threw2,S:s2.S===s3.S,HX:s2.HX===s3.HX,QM_CTX:s2.QM_CTX===s3.QM_CTX});

    /* ===== eligibility churn on synthetic data: A qualifies d1 (sev 50), drops d2 (sev 10 < 45), requalifies d3 (sev 55) ===== */
    var churnPort={settings:{entry:"open",cost:0,rebalance:"daily"},
      spec:{filters:[{f:"sev",op:">=",v:45}],sort:{f:"sev",d:"desc"},limit:50}};
    var rFull=window.__bt.backtestPortfolio(churnPort,synthFull,synthHist);
    ok("churn: backtest ran ok",rFull.ok,rFull);
    if(rFull.ok){
      ok("churn: 3 replay dates found",rFull.dates.length===3,rFull.dates);
      var u1=rFull.ups[0],u2=rFull.ups[1],u3=rFull.ups[2];
      var has=function(u,sym){ return u.picks.some(function(p){ return p.s===sym; }); };
      ok("churn: A present on d1 (severity 50 >= 45)",has(u1,"A"),u1.picks.filter(function(p){return p.s==="A";}));
      ok("churn: A absent on d2 (severity 10, dropped below 45)",!has(u2,"A"),u2.picks.filter(function(p){return p.s==="A";}));
      ok("churn: A present again on d3 (severity 55, requalified)",has(u3,"A"),u3.picks.filter(function(p){return p.s==="A";}));
      ok("churn: picks stayed under the 50-name cap on every date (45 real qualifiers, so this is a genuine pass/fail test, not a limit artifact)",
        u1.picks.length<50&&u2.picks.length<50&&u3.picks.length<50,[u1.picks.length,u2.picks.length,u3.picks.length]);
      var st=rFull.result&&rFull.result.stats;
      ok("churn: engine() produced stats from the historical ups[]",!!st,st);
      var aTrades=(rFull.result.trades||[]).filter(function(t){ return t.s==="A"; });
      ok("churn: A shows a closed trade (bought after the d1 signal, sold after the d2 exit signal)",aTrades.length>=1,rFull.result.trades);
    }

    /* ===== no-look-ahead: full 3-date run vs truncated (dates 1-2 only) run must agree exactly on dates 1-2 ===== */
    var rTrunc=window.__bt.backtestPortfolio(churnPort,synthTrunc,synthHist);
    ok("no-lookahead: truncated backtest ran ok",rTrunc.ok,rTrunc);
    if(rFull.ok&&rTrunc.ok){
      ok("no-lookahead: truncated run has exactly 2 dates",rTrunc.dates.length===2,rTrunc.dates);
      ok("no-lookahead: date 1 ups[] entry identical between full and truncated runs",
        JSON.stringify(rFull.ups[0])===JSON.stringify(rTrunc.ups[0]),{full:rFull.ups[0],trunc:rTrunc.ups[0]});
      ok("no-lookahead: date 2 ups[] entry identical between full and truncated runs",
        JSON.stringify(rFull.ups[1])===JSON.stringify(rTrunc.ups[1]),{full:rFull.ups[1],trunc:rTrunc.ups[1]});
      ok("no-lookahead: truncated run's own last-update orders reference date 2",rTrunc.result.orders.d===rTrunc.dates[1],rTrunc.result.orders);
    }
    var sEnd=window.__bt.snapshot();
    ok("no-lookahead/churn/restore-on-error tests: live S/HX/QM_CTX unchanged after the whole run",
      sEnd.S===s0.S&&sEnd.HX===s0.HX&&sEnd.QM_CTX===s0.QM_CTX,{S:sEnd.S===s0.S,HX:sEnd.HX===s0.HX,QM_CTX:sEnd.QM_CTX===s0.QM_CTX});

    /* ===== weekly/monthly rebalance-eligible-date selection, cross-checked against filterRebal ===== */
    var wD=["2026-01-05","2026-01-06","2026-01-07","2026-01-08","2026-01-09","2026-01-12","2026-01-13","2026-01-14","2026-01-19","2026-01-20","2026-02-02","2026-03-04"];
    var pseudo=wD.map(function(d){ return {d:d}; });
    var weeklyElig=window.__bt.eligibleDates(wD,"weekly");
    var weeklyExpected=window.__trk.filterRebal(pseudo,"weekly").map(function(x){ return x.d; });
    ok("weekly eligibility matches filterRebal() exactly",JSON.stringify(weeklyElig)===JSON.stringify(weeklyExpected),{weeklyElig:weeklyElig,weeklyExpected:weeklyExpected});
    ok("weekly eligibility: first-of-week dates only",JSON.stringify(weeklyElig)===JSON.stringify(["2026-01-05","2026-01-12","2026-01-19","2026-02-02","2026-03-04"]),weeklyElig);
    var monthlyElig=window.__bt.eligibleDates(wD,"monthly");
    var monthlyExpected=window.__trk.filterRebal(pseudo,"monthly").map(function(x){ return x.d; });
    ok("monthly eligibility matches filterRebal() exactly",JSON.stringify(monthlyElig)===JSON.stringify(monthlyExpected),{monthlyElig:monthlyElig,monthlyExpected:monthlyExpected});
    ok("monthly eligibility: first-of-month dates only",JSON.stringify(monthlyElig)===JSON.stringify(["2026-01-05","2026-02-02","2026-03-04"]),monthlyElig);

    /* ===== reproducibility pre-flight: cluster-dependent kind with short prior history is refused up front ===== */
    var g=window.__bt.groupScanByDate(synthFull);
    var elig=window.__bt.eligibleDates(g.dates,"daily");
    var shortHistDates=["2026-01-30","2026-01-31","2026-02-01"];
    var repBlock=window.__bt.checkReproducibility({spec:{kind:"hsmart",mode:"oneper"}},g,shortHistDates,elig);
    ok("reproducibility: hsmart with <252 prior bars is blocked with a clear reason",!!repBlock.blocking&&/252-bar/.test(repBlock.blocking),repBlock);
    var repOk=window.__bt.checkReproducibility(churnPort,g,shortHistDates,elig);
    ok("reproducibility: a plain filter/sort spec (no clusters) is never blocked",!repOk.blocking,repOk);
    var repHsmartLong=window.__bt.checkReproducibility({spec:{kind:"hsmart",mode:"oneper"}},g,window.__bt.eligibleDates(["2025-01-01"],"daily").concat(Array.from({length:260}).map(function(_,i){ var d=new Date(Date.UTC(2025,0,1)+i*86400000); return d.toISOString().slice(0,10); })),elig);
    ok("reproducibility: hsmart with >=252 prior bars is NOT blocked",!repHsmartLong.blocking,repHsmartLong);

    return R;
  }, {realScan,synthFull,synthTrunc,synthHist});

  console.log(out.join("\n"));
  const fails=out.filter(l=>l.startsWith("FAIL")).length;
  console.log("\nTOTAL:",out.length,"PASS:",out.length-fails,"FAIL:",fails);
  console.log("page errors",errs);
  await b.close(); srv.close();
})();
