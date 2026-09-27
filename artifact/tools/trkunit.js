const { chromium } = require('playwright'); const fs=require('fs'),path=require('path'),http=require('http');
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p=='/')p='/index.html';const f=path.join('site_new',p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':'text/html'});fs.createReadStream(f).pipe(r);}).listen(0);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://127.0.0.1:'+srv.address().port+'/');await pg.waitForTimeout(800);
const out=await pg.evaluate(()=>{ const E=window.__trk.engine, R=[]; function ok(n,c,x){ R.push((c?"PASS ":"FAIL ")+n+(c?"":" -> "+JSON.stringify(x))); }
 const D=["2026-01-01","2026-01-02","2026-01-05","2026-01-06","2026-01-07","2026-01-08","2026-01-09","2026-01-12"];
 const cl={A:[100,100,100,100,100,110,110,110],B:[100,100,100,100,100,100,100,100],C:[50,50,50,50,50,50,55,60],RSP:[100,100,100,100,100,100,100,110]};
 const hx={dates:D,syms:cl,opens:JSON.parse(JSON.stringify(cl))};
 const p1={settings:{entry:"open",cost:0,notional:100000},ups:[{d:D[1],picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:D[4],picks:[{s:"B",side:"long"},{s:"C",side:"long"}],exits:{A:"no longer improving"}}]};
 let r=E(p1,hx,"RSP"); const eq=r.equity[r.equity.length-1];
 ok("1 final value 115500",Math.abs(eq.v-115500)<1e-6,eq.v); ok("1 first fill date is the open after the signal",r.equity[0].d===D[2],r.equity[0].d);
 ok("1 one closed trade A +10% in 3 days",r.trades.length===1&&r.trades[0].s==="A"&&Math.abs(r.trades[0].ret-10)<1e-9&&r.trades[0].days===3&&r.trades[0].inD===D[2]&&r.trades[0].outD===D[5],r.trades);
 ok("1 sell reason kept",r.trades[0].why==="no longer improving",r.trades[0].why);
 ok("1 holdings B 500, C 1050",r.holdings.length===2&&r.holdings.some(h=>h.s==="B"&&Math.abs(h.sh-500)<1e-9)&&r.holdings.some(h=>h.s==="C"&&Math.abs(h.sh-1050)<1e-9),r.holdings);
 ok("1 benchmark +10%",Math.abs(r.stats.bench-10)<1e-9,r.stats.bench); ok("1 return +15.5%",Math.abs(r.stats.ret-15.5)<1e-9,r.stats.ret);
 ok("1 orders buy C, hold B, sell A",r.orders.buy.map(x=>x.s).join()==="C"&&r.orders.hold.map(x=>x.s).join()==="B"&&r.orders.sell.map(x=>x.s).join()==="A",r.orders);
 ok("1 win rate 100%",r.stats.win===100,r.stats.win);
 const p2=JSON.parse(JSON.stringify(p1)); p2.ups.push({d:D[7],picks:[{s:"C",side:"long"}],exits:{B:"x"}}); r=E(p2,hx,"RSP");
 ok("2 update on the last bar is pending",r.pending.length===1&&r.pending[0].n===1,r.pending); ok("2 still 115500 (nothing filled)",Math.abs(r.equity[r.equity.length-1].v-115500)<1e-6,r.equity[r.equity.length-1].v);
 r=E({settings:{entry:"open",cost:0,notional:100000},ups:[{d:D[1],picks:[{s:"A",side:"short"}],exits:{}}]},hx,"RSP");
 ok("3 short A: value 90000 when A rises 10%",Math.abs(r.equity[r.equity.length-1].v-90000)<1e-6,r.equity[r.equity.length-1].v); ok("3 short return -10% on the holding",Math.abs(r.holdings[0].ret+10)<1e-9,r.holdings[0]);
 r=E({settings:{entry:"open",cost:10,notional:100000},ups:[{d:D[1],picks:[{s:"B",side:"long"}],exits:{}}]},hx,"RSP");
 ok("4 costs 10bp: value 100000/1.001",Math.abs(r.equity[r.equity.length-1].v-100000/1.001)<1e-6,r.equity[r.equity.length-1].v);
 r=E(p1,{dates:D,syms:cl},"RSP"); ok("5 no opens: fills at next close with a note",!!r.fillNote&&Math.abs(r.equity[r.equity.length-1].v-115500)<1e-6,[r.fillNote,r.equity[r.equity.length-1].v]);
 const cl2=JSON.parse(JSON.stringify(cl)); cl2.B[6]=null; r=E(p1,{dates:D,syms:cl2,opens:cl},"RSP"); ok("6 missing close carried (no crash, value on that day 108000... )",Math.abs(r.equity[4].v-(2500+50000+1050*55))<1e-6,r.equity[4]);
 r=E({settings:{entry:"close",cost:0,notional:100000},ups:[{d:D[1],picks:[{s:"C",side:"long"}],exits:{}}]},hx,"RSP"); ok("7 close entry fills on the signal day",r.equity[0].d===D[1]&&Math.abs(r.equity[r.equity.length-1].v-120000)<1e-6,[r.equity[0],r.equity[r.equity.length-1]]);
 r=E({settings:{entry:"open",cost:0,notional:100000},ups:[{d:D[1],picks:[{s:"A",side:"long"}],exits:{}},{d:D[3],picks:[],exits:{A:"x"}}]},hx,"RSP"); ok("8 empty update sells everything to cash",r.holdings.length===0&&Math.abs(r.equity[r.equity.length-1].v-100000)<1e-6,[r.holdings,r.equity[r.equity.length-1]]);
 const cl3=JSON.parse(JSON.stringify(cl)); cl3.B[6]=500; r=E(p1,{dates:D,syms:cl3,opens:cl},"RSP"); ok("9 a >40% one-day move is flagged",r.flags.some(f=>/moved/.test(f)),r.flags);

 /* ===== phase 2: rebalance rhythm, weight source, settings-editable-later, non-destructive ===== */
 /* 10 daily records across 3 ISO (Mon-based) weeks: wk1 Jan5-9, wk2 Jan12-14, wk3 Jan19-20 */
 var wD=["2026-01-05","2026-01-06","2026-01-07","2026-01-08","2026-01-09","2026-01-12","2026-01-13","2026-01-14","2026-01-15","2026-01-16","2026-01-19","2026-01-20","2026-01-21"];
 var wCl={A:new Array(wD.length).fill(100),B:new Array(wD.length).fill(100),C:new Array(wD.length).fill(100),RSP:new Array(wD.length).fill(100)};
 var wHx={dates:wD,syms:wCl,opens:JSON.parse(JSON.stringify(wCl))};
 var wUps=[{d:"2026-01-05",picks:[{s:"A",side:"long"}],exits:{}},{d:"2026-01-06",picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:"2026-01-07",picks:[{s:"B",side:"long"}],exits:{A:"x"}},{d:"2026-01-08",picks:[{s:"B",side:"long"},{s:"C",side:"long"}],exits:{}},{d:"2026-01-09",picks:[{s:"C",side:"long"}],exits:{}},{d:"2026-01-12",picks:[{s:"B",side:"long"}],exits:{A:"no longer improving"}},{d:"2026-01-13",picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:"2026-01-14",picks:[{s:"B",side:"long"}],exits:{}},{d:"2026-01-19",picks:[{s:"C",side:"long"}],exits:{B:"no longer improving"}},{d:"2026-01-20",picks:[{s:"C",side:"long"},{s:"A",side:"long"}],exits:{}}];
 var wPortRaw=JSON.stringify(wUps);
 r=E({settings:{entry:"open",cost:0,notional:100000,rebalance:"weekly"},ups:JSON.parse(wPortRaw)},wHx,"RSP");
 ok("weekly: only 2 closed trades (first-of-week events only)",r.trades.length===2,r.trades);
 ok("weekly: trade 1 is A closed at 2026-01-13 (fill after the 01-12 signal)",r.trades[0]&&r.trades[0].s==="A"&&r.trades[0].outD==="2026-01-13",r.trades[0]);
 ok("weekly: trade 2 is B closed at 2026-01-20 (fill after the 01-19 signal)",r.trades[1]&&r.trades[1].s==="B"&&r.trades[1].outD==="2026-01-20",r.trades[1]);
 ok("weekly: non-rebalance-day records (01-06/07/08/09/13/14/20) never trade",r.trades.every(function(t){ return ["2026-01-13","2026-01-20"].indexOf(t.outD)>=0; }),r.trades);

 /* monthly: 5 records spanning Jan/Feb/Mar 2026 */
 var mD=["2026-01-15","2026-01-16","2026-01-22","2026-01-23","2026-02-05","2026-02-06","2026-02-19","2026-02-20","2026-03-03","2026-03-04"];
 var mCl={A:new Array(mD.length).fill(100),B:new Array(mD.length).fill(100),C:new Array(mD.length).fill(100),RSP:new Array(mD.length).fill(100)};
 var mHx={dates:mD,syms:mCl,opens:JSON.parse(JSON.stringify(mCl))};
 var mUps=[{d:"2026-01-15",picks:[{s:"A",side:"long"}],exits:{}},{d:"2026-01-22",picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:"2026-02-05",picks:[{s:"B",side:"long"}],exits:{A:"x"}},{d:"2026-02-19",picks:[{s:"B",side:"long"},{s:"C",side:"long"}],exits:{}},{d:"2026-03-03",picks:[{s:"C",side:"long"}],exits:{B:"x"}}];
 r=E({settings:{entry:"open",cost:0,notional:100000,rebalance:"monthly"},ups:mUps},mHx,"RSP");
 ok("monthly: only 2 closed trades (first-of-month events only)",r.trades.length===2,r.trades);
 ok("monthly: trade 1 is A closed at 2026-02-06",r.trades[0]&&r.trades[0].s==="A"&&r.trades[0].outD==="2026-02-06",r.trades[0]);
 ok("monthly: trade 2 is B closed at 2026-03-04",r.trades[1]&&r.trades[1].s==="B"&&r.trades[1].outD==="2026-03-04",r.trades[1]);

 /* quarterly: Q1->Q2 boundary (Mar 20 kept, Mar 25 same quarter dropped, Apr 10 new quarter kept) */
 var qD=["2026-03-20","2026-03-21","2026-03-25","2026-03-26","2026-04-10","2026-04-11"];
 var qCl={A:new Array(qD.length).fill(100),B:new Array(qD.length).fill(100),RSP:new Array(qD.length).fill(100)};
 var qHx={dates:qD,syms:qCl,opens:JSON.parse(JSON.stringify(qCl))};
 var qUps=[{d:"2026-03-20",picks:[{s:"A",side:"long"}],exits:{}},{d:"2026-03-25",picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:"2026-04-10",picks:[{s:"B",side:"long"}],exits:{A:"x"}}];
 r=E({settings:{entry:"open",cost:0,notional:100000,rebalance:"quarterly"},ups:qUps},qHx,"RSP");
 ok("quarterly: only 1 closed trade (the Mar-25 same-quarter record never trades)",r.trades.length===1&&r.trades[0].s==="A"&&r.trades[0].outD==="2026-04-11",r.trades);

 /* yearly: 2026->2027 boundary */
 var yD=["2026-12-15","2026-12-16","2026-12-28","2026-12-29","2027-01-08","2027-01-09"];
 var yCl={A:new Array(yD.length).fill(100),B:new Array(yD.length).fill(100),RSP:new Array(yD.length).fill(100)};
 var yHx={dates:yD,syms:yCl,opens:JSON.parse(JSON.stringify(yCl))};
 var yUps=[{d:"2026-12-15",picks:[{s:"A",side:"long"}],exits:{}},{d:"2026-12-28",picks:[{s:"A",side:"long"},{s:"B",side:"long"}],exits:{}},{d:"2027-01-08",picks:[{s:"B",side:"long"}],exits:{A:"x"}}];
 r=E({settings:{entry:"open",cost:0,notional:100000,rebalance:"yearly"},ups:yUps},yHx,"RSP");
 ok("yearly: only 1 closed trade (the Dec-28 same-year record never trades)",r.trades.length===1&&r.trades[0].s==="A"&&r.trades[0].outD==="2027-01-09",r.trades);

 /* rank weighting: 4 fresh picks, raw=(n-idx)+n/2 normalized to V=100000, cost 0 */
 var rkD=["2026-06-01","2026-06-02","2026-06-03"];
 var rkCl={A:[100,100,100],B:[50,50,50],C:[25,25,25],D:[10,10,10],RSP:[100,100,100]};
 var rkHx={dates:rkD,syms:rkCl,opens:JSON.parse(JSON.stringify(rkCl))};
 var rkPort={settings:{entry:"open",cost:0,notional:100000,weight:"rank"},ups:[{d:rkD[0],picks:[{s:"A",side:"long"},{s:"B",side:"long"},{s:"C",side:"long"},{s:"D",side:"long"}],exits:{}}]};
 r=E(rkPort,rkHx,"RSP");
 var rkN=4, rkRaws=[0,1,2,3].map(function(idx){ return (rkN-idx)+rkN/2; }), rkSum=rkRaws.reduce(function(a,b){ return a+b; },0), rkPx={A:100,B:50,C:25,D:10};
 ["A","B","C","D"].forEach(function(s,idx){ var w=rkRaws[idx]/rkSum, expSh=100000*w/rkPx[s], h=r.holdings.filter(function(x){ return x.s===s; })[0];
   ok("rank weight "+s+" shares match (n-idx)+n/2 normalized",h&&Math.abs(h.sh-expSh)<1e-6,[h&&h.sh,expSh]); });

 /* inverse-volatility weighting: S calm (+-1%), V volatile (+-3%), 20 alternating daily returns each (mean 0),
    so sample vol ratio is exactly 3 (variance scales with amplitude^2) and iv-weights split exactly 75%/25% */
 var ivD=[]; for(var iv=0;iv<=20;iv++) ivD.push("2026-08-"+("0"+(iv+1)).slice(-2));
 var ivS=[100], ivV=[100]; for(var ik=0;ik<20;ik++){ var sgn=ik%2===0?1:-1; ivS.push(ivS[ivS.length-1]*(1+sgn*0.01)); ivV.push(ivV[ivV.length-1]*(1+sgn*0.03)); }
 var ivCl={S:ivS,V:ivV,RSP:new Array(21).fill(100)};
 var ivHx={dates:ivD,syms:ivCl,opens:JSON.parse(JSON.stringify(ivCl))};
 var ivPort={settings:{entry:"open",cost:0,notional:100000,weight:"iv"},ups:[{d:ivD[19],picks:[{s:"S",side:"long"},{s:"V",side:"long"}],exits:{}}]};
 r=E(ivPort,ivHx,"RSP");
 var ivS_h=r.holdings.filter(function(x){ return x.s==="S"; })[0], ivV_h=r.holdings.filter(function(x){ return x.s==="V"; })[0];
 ok("iv: calmer symbol S gets the larger weight",ivS_h&&ivV_h&&ivS_h.value>ivV_h.value,[ivS_h,ivV_h]);
 ok("iv: exact 75%/25% split (vol ratio is exactly 3 by construction)",ivS_h&&ivV_h&&Math.abs(ivS_h.value-75000)<1&&Math.abs(ivV_h.value-25000)<1,[ivS_h&&ivS_h.value,ivV_h&&ivV_h.value]);

 /* backward-compatibility: duplicate test 1's exact scenario; with no settings.rebalance/weight the new
    engine must still produce the pre-existing daily/equal-weight numbers byte-for-byte */
 r=E(p1,hx,"RSP");
 ok("backcompat: no settings.rebalance/weight -> same final value 115500 as the original test 1",Math.abs(r.equity[r.equity.length-1].v-115500)<1e-6,r.equity[r.equity.length-1]);
 ok("backcompat: no settings.rebalance/weight -> same trade (A +10% in 3 days) as the original test 1",r.trades.length===1&&r.trades[0].s==="A"&&Math.abs(r.trades[0].ret-10)<1e-9&&r.trades[0].days===3,r.trades);

 /* non-destructive settings change: same port object, engine() run twice with different settings.rebalance;
    port.ups must never be mutated, and the two runs must give different trade counts */
 var ndPort={settings:{entry:"open",cost:0,notional:100000,rebalance:"daily"},ups:JSON.parse(wPortRaw)};
 var ndBefore=JSON.stringify(ndPort.ups);
 var rDaily=E(ndPort,wHx,"RSP");
 var ndMid=JSON.stringify(ndPort.ups);
 ndPort.settings.rebalance="monthly";
 var rMonthly=E(ndPort,wHx,"RSP");
 var ndAfter=JSON.stringify(ndPort.ups);
 ok("non-destructive: port.ups unchanged after the daily engine() call",ndMid===ndBefore,[ndBefore,ndMid]);
 ok("non-destructive: port.ups unchanged after the monthly engine() call too",ndAfter===ndBefore,[ndBefore,ndAfter]);
 ok("non-destructive: daily and monthly give different trade counts on the same stored ups",rDaily.trades.length!==rMonthly.trades.length,[rDaily.trades.length,rMonthly.trades.length]);
 ok("non-destructive: daily gives 5 trades, monthly (all-January) gives 0 (single kept event, no rebalance)",rDaily.trades.length===5&&rMonthly.trades.length===0,[rDaily.trades.length,rMonthly.trades.length]);

 return R; });
console.log(out.join("\n")); console.log("errors",errs); await b.close(); srv.close(); })();
