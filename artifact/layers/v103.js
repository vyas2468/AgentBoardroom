/* ================= v103: Portfolio Tracker (phase 1) =================
   - "Track this portfolio / list" button under portfolio and list answers: saves the frozen query (the exact spec the
     engine ran), today's picks and the scan date as the first update.
   - "Portfolio Tracker" tab (group Tracking & history): Update all tracked (re-runs every frozen query on the loaded
     scan), overview of every tracked portfolio, and per portfolio: latest BUY / HOLD / SELL with reasons, pending
     orders, holdings, closed trades, equity curve against RSP, CSV export, rename, delete.
   - Only the decisions are stored (one record per update date); holdings, trades, prices and metrics are recomputed
     from them and the part E history every time (engine below, a pure function tested on made-up data).
   - Execution: fills at the next day's open after the signal (part E opens; next close if opens are not loaded),
     10 basis points cost per side, equal weights, sell when a name drops off the list. Storage: account store
     (doc tracker/main) with a browser copy, merged by last update time; writes only on Track / Update / Rename /
     Delete. */
(function(){
try{
var A=window.__hxApi||{};
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function H(){ try{ return A.get?A.get():null; }catch(e){ return null; } }
function ctxNow(){ try{ return QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){ return null; } }
function iso(d){ var s=String(d||"").trim(), m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[3]).slice(-2);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/); if(m) return (m[3].length===2?"20"+m[3]:m[3])+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2); return null; }
function scanDate(){ var c=ctxNow(); return iso((typeof U!=="undefined"&&U&&U.date)?U.date:(c&&c.date)); }
function pct(v,d){ return num(v)?((v>0?"+":"")+v.toFixed(d===undefined?2:d)+"%"):"–"; }
function money(v){ return num(v)?v.toLocaleString("en-US",{maximumFractionDigits:0}):"–"; }

/* ================= engine (pure) =================
   port: {settings:{entry:"open"|"close",cost:bps,notional}, ups:[{d:"YYYY-MM-DD",picks:[{s,side}],exits:{sym:reason}}]}
   hx:   {dates:[...ISO], syms:{sym:[close...]}, opens:{sym:[open...]}|undefined}, bench: symbol */
function pkeyOf(d,mode){ if(mode==="weekly"){ var m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return d; var dt=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); var dow=(dt.getUTCDay()+6)%7; dt.setUTCDate(dt.getUTCDate()-dow); return dt.getUTCFullYear()+"-"+("0"+(dt.getUTCMonth()+1)).slice(-2)+"-"+("0"+dt.getUTCDate()).slice(-2); }
  if(mode==="monthly") return String(d).slice(0,7);
  if(mode==="quarterly"){ var mm=+String(d).slice(5,7); return String(d).slice(0,4)+"-Q"+(Math.floor((mm-1)/3)+1); }
  if(mode==="yearly") return String(d).slice(0,4);
  return d; }
/* keep only the ups[] entries that trigger a trade event at this rebalance rhythm: the first entry always,
   then the first entry of each new period (week/month/quarter/year) that differs from the previously kept
   entry's period. Entries not selected are dropped from the trade timeline only; the caller still marks
   positions to market every day from hx, and the stored ups[] itself is never touched. */
function filterRebal(list,mode){ if(!mode||mode==="daily"||!list.length) return list; var outp=[], prevKey=null;
  list.forEach(function(u){ var k=pkeyOf(u.d,mode); if(prevKey===null||k!==prevKey){ outp.push(u); prevKey=k; } }); return outp; }
function engine(port,hx,bench){
  var S=port.settings||{}, entry=S.entry||"open", bps=num(S.cost)?S.cost:10, N0=S.notional||100000, rebal=S.rebalance||"daily", wm=S.weight||"eq";
  var out={equity:[],trades:[],holdings:[],pending:[],flags:[],orders:null,stats:null,fillNote:""};
  var upsAll=(port.ups||[]).slice().sort(function(a,b){ return a.d<b.d?-1:(a.d>b.d?1:0); });
  if(!upsAll.length) return out;
  var ups=filterRebal(upsAll,rebal);
  var last=ups[ups.length-1], prev=ups.length>1?ups[ups.length-2]:null, key=function(p){ return p.s+"|"+(p.side||"long"); };
  /* latest orders from the decision records (valid with or without prices) */
  var pk={}, lk={}; if(prev) prev.picks.forEach(function(p){ pk[key(p)]=p; }); last.picks.forEach(function(p){ lk[key(p)]=p; });
  out.orders={d:last.d,buy:last.picks.filter(function(p){ return !pk[key(p)]; }),hold:last.picks.filter(function(p){ return pk[key(p)]; }),
    sell:prev?prev.picks.filter(function(p){ return !lk[key(p)]; }).map(function(p){ return {s:p.s,side:p.side,why:(last.exits||{})[p.s]||"no longer in the list"}; }):[]};
  if(!hx||!hx.dates||!hx.dates.length) return out;
  var D=hx.dates, L=D.length-1, C=hx.syms||{}, O=hx.opens||null;
  if(entry==="open"&&!O) out.fillNote="The loaded part E history has no opens, so orders fill at the next day's close. Load the part E file again to fill at the open.";
  function idxAfter(d){ for(var i=0;i<=L;i++) if(D[i]>d) return i; return -1; }
  function idxOnOrAfter(d){ for(var i=0;i<=L;i++) if(D[i]>=d) return i; return -1; }
  function close(s,i){ var c=C[s]; return c&&num(c[i])?c[i]:null; }
  function lastClose(s,i){ var c=C[s]; if(!c) return null; for(var j=i;j>=0;j--) if(num(c[j])) return c[j]; return null; }
  function execPx(s,i){ if(entry==="open"){ if(O&&O[s]&&num(O[s][i])) return O[s][i]; return close(s,i); } return close(s,i); }
  /* realized volatility of daily returns, trailing window ending at bar i: up to 63 returns, min 20 required
     (fewer/gaps -> null, and callers fall back to raw weight 1 for that symbol only) */
  function volOf(s,i){ var c=C[s]; if(!c) return null; var rets=[];
    for(var j=i;j>0&&rets.length<63;j--){ var a=c[j],b=c[j-1]; if(num(a)&&num(b)&&b!==0) rets.unshift((a-b)/b); }
    if(rets.length<20) return null;
    var m=rets.reduce(function(x,y){ return x+y; },0)/rets.length, va=rets.reduce(function(x,y){ return x+(y-m)*(y-m); },0)/(rets.length-1);
    return Math.sqrt(va); }
  var sched=ups.map(function(u){ return {u:u,i:entry==="open"?idxAfter(u.d):idxOnOrAfter(u.d)}; });
  sched.filter(function(x){ return x.i<0; }).forEach(function(x){ out.pending.push({d:x.u.d,n:x.u.picks.length,msg:entry==="open"?(O?"fills at the next open after ":"fills at the next close after (no opens in the loaded history) ")+x.u.d+" (not in the loaded history yet)":"fills at the close of "+x.u.d+" (not in the loaded history yet)"}); });
  var run=sched.filter(function(x){ return x.i>=0; }); if(!run.length) return out;
  var i0=run[0].i, cash=N0, pos={}, lastPx={}, tradedNotional=0, bSh=null, bench0=null;
  var bpx0=execPx(bench,i0); if(num(bpx0)){ bSh=N0/bpx0; bench0=bpx0; }
  for(var i=i0;i<=L;i++){
    run.filter(function(x){ return x.i===i; }).forEach(function(x){
      var tk={}; x.u.picks.forEach(function(p){ tk[key(p)]=p; });
      /* sells first */
      Object.keys(pos).forEach(function(k){ if(tk[k]) return; var p=pos[k], px=execPx(p.s,i), gap=false; if(!num(px)){ px=lastClose(p.s,i)||p.px; gap=true; }
        var val=Math.abs(p.sh)*px, cost=val*bps/1e4; tradedNotional+=val;
        if(p.side==="short") cash-=val+cost; else cash+=val-cost;
        var ret=p.side==="short"?(p.px-px)/p.px*100:(px-p.px)/p.px*100;
        out.trades.push({s:p.s,side:p.side,inD:p.d,inPx:p.px,outD:D[i],outPx:px,ret:ret,days:i-p.i,why:((x.u.exits||{})[p.s]||"no longer in the list")+(gap?" (data gap: sold at the last known price)":"")});
        delete pos[k]; });
      /* buys: sized by the weight source (eq/rank/iv). raw weight per pick in x.u.picks order (already rank
         order), normalized to sum to 1 across ALL current picks (held + new); "eq" gives raw=1 for every pick,
         which reduces to the original V/n equal-weight target exactly. Held positions keep their original
         entry sizing untouched; only a fresh buy's target size uses the normalized weight. */
      var V=cash; Object.keys(pos).forEach(function(k){ var p=pos[k], px=execPx(p.s,i)||lastClose(p.s,i)||p.px; V+=p.sh*px; });
      var n=x.u.picks.length, buys=x.u.picks.filter(function(p){ return !pos[key(p)]; }); if(!n||!buys.length) return;
      var raws=x.u.picks.map(function(p,idx){ if(wm==="rank") return (n-idx)+n/2; if(wm==="iv"){ var vol=volOf(p.s,i); return (num(vol)&&vol>0)?1/vol:1; } return 1; });
      var sumRaw=raws.reduce(function(a,b){ return a+b; },0)||1, wgt={}; x.u.picks.forEach(function(p,idx){ wgt[key(p)]=raws[idx]/sumRaw; });
      var needL=0; buys.forEach(function(p){ if(p.side!=="short") needL+=V*wgt[key(p)]*(1+bps/1e4); });
      var scale=needL>0?Math.min(1,Math.max(0,cash)/needL):1; if(scale<0.999) out.flags.push(D[i]+": not enough cash for full-size buys; buys scaled to "+(scale*100).toFixed(0)+"%");
      buys.forEach(function(p){ var px=execPx(p.s,i); if(!num(px)){ out.flags.push(D[i]+": "+p.s+" had no price, not bought"); return; }
        var tgt=V*wgt[key(p)], val=p.side==="short"?tgt:tgt*scale, sh=val/px, cost=val*bps/1e4; tradedNotional+=val;
        if(p.side==="short"){ cash+=val-cost; pos[key(p)]={s:p.s,side:"short",sh:-sh,px:px,d:D[i],i:i}; } else { cash-=val+cost; pos[key(p)]={s:p.s,side:"long",sh:sh,px:px,d:D[i],i:i}; } });
    });
    var v=cash; Object.keys(pos).forEach(function(k){ var p=pos[k], c=close(p.s,i); if(num(c)){ var lp=lastPx[k]; if(num(lp)&&Math.abs(c/lp-1)>0.4) out.flags.push(D[i]+": "+p.s+" moved "+pct((c/lp-1)*100,0)+" in one day (check for a split or merger in the history)"); lastPx[k]=c; } v+=p.sh*(num(c)?c:(lastPx[k]||p.px)); });
    var bc=close(bench,i); out.equity.push({d:D[i],v:v,b:bSh&&num(bc)?bSh*bc:null});
  }
  Object.keys(pos).forEach(function(k){ var p=pos[k], c=lastClose(p.s,L)||p.px, ret=p.side==="short"?(p.px-c)/p.px*100:(c-p.px)/p.px*100;
    if(!num(close(p.s,L))) out.flags.push(p.s+": no price on the last bar (valued at the last known close)");
    out.holdings.push({s:p.s,side:p.side,d:p.d,px:p.px,sh:p.sh,last:c,value:p.sh*c,ret:ret,days:L-p.i}); });
  /* stats */
  var E=out.equity, v0=N0, vN=E.length?E[E.length-1].v:N0, peak=-Infinity, mdd=0, rs=[];
  E.forEach(function(e,j){ if(e.v>peak) peak=e.v; mdd=Math.min(mdd,(e.v/peak-1)*100); if(j) rs.push(e.v/E[j-1].v-1); });
  var m=rs.length?rs.reduce(function(a,b){ return a+b; },0)/rs.length:0, sd=rs.length>1?Math.sqrt(rs.reduce(function(a,b){ return a+(b-m)*(b-m); },0)/(rs.length-1)):0;
  var bN=E.length&&num(E[E.length-1].b)?E[E.length-1].b:null, wins=out.trades.filter(function(t){ return t.ret>0; });
  var avgV=E.length?E.reduce(function(a,e){ return a+e.v; },0)/E.length:N0;
  out.stats={start:E.length?E[0].d:null,end:E.length?E[E.length-1].d:null,days:E.length,value:vN,ret:(vN/v0-1)*100,bench:bN?(bN/N0-1)*100:null,
    mdd:mdd,vol:sd*Math.sqrt(252)*100,sharpe:sd>0?m/sd*Math.sqrt(252):null,trades:out.trades.length,win:out.trades.length?wins.length/out.trades.length*100:null,
    avgWin:wins.length?wins.reduce(function(a,t){ return a+t.ret; },0)/wins.length:null,avgLoss:out.trades.length>wins.length?out.trades.filter(function(t){ return t.ret<=0; }).reduce(function(a,t){ return a+t.ret; },0)/(out.trades.length-wins.length):null,
    avgDays:out.trades.length?out.trades.reduce(function(a,t){ return a+t.days; },0)/out.trades.length:null,turnover:avgV?tradedNotional/avgV*100:null,holdings:out.holdings.length};
  return out;
}

/* ================= storage ================= */
var LK="alexaligned.tracker.v1", ST={ports:[],updatedAt:0}, DB=null, CLOUD="local";
function lsLoad(){ try{ var j=JSON.parse(localStorage.getItem(LK)||"null"); if(j&&Array.isArray(j.ports)) ST=j; }catch(e){} }
function lsSave(){ try{ localStorage.setItem(LK,JSON.stringify(ST)); }catch(e){} }
function save(){ ST.updatedAt=Date.now(); lsSave(); if(DB){ CLOUD="saving"; status(); try{ DB.doc("tracker/main").set(JSON.parse(JSON.stringify(ST))).then(function(){ CLOUD="synced"; status(); },function(){ CLOUD="error"; status(); }); }catch(e){ CLOUD="error"; status(); } } }
lsLoad();
try{ if(window.claude&&window.claude.use) window.claude.use("db").then(function(db){ if(!db){ CLOUD="local"; status(); return; } DB=db;
  db.doc("tracker/main").get().then(function(sn){ var d=sn&&sn.exists?sn.data():null; if(d&&Array.isArray(d.ports)&&(+d.updatedAt||0)>(+ST.updatedAt||0)){ ST=d; lsSave(); render(); } CLOUD="synced"; status(); },function(){ CLOUD="error"; status(); }); },function(){}); }catch(e){}

/* ================= picks from an answer ================= */
var TRACK_KINDS={portfolio:"portfolio",hsmart:"portfolio",hcport:"portfolio",screen:"list",hx102:"list"};
function picksOf(res){
  var out=[], seen={}; function add(s,side){ var k=s+"|"+side; if(seen[k]||!s) return; seen[k]=1; out.push({s:s,side:side}); }
  function fromTable(t,side){ if(!t||!t.head) return false; var si=t.head.findIndex(function(h){ return /^symbol$/i.test(h); }); if(si<0) return false; t.body.forEach(function(r){ var s=String(r[si]||""); if(/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)) add(s,side); }); return true; }
  if(res.send&&res.send.items&&res.send.items.length) res.send.items.forEach(function(it){ add(it.sym,it.side==="short"?"short":"long"); });
  else fromTable(res.table,"long");
  (res.extra||[]).forEach(function(x){ var tt=String(x.title||""); if(/^short\b/i.test(tt)) fromTable(x.table,"short"); else if(/^etfs?\b/i.test(tt)) fromTable(x.table,"long"); });
  return out;
}
function trackable(res){ var sp=res&&res.spec; if(!sp) return null; var k=TRACK_KINDS[sp.kind]; if(!k) return null; if(sp.kind==="hx102"&&!/^(?:dual|topsec)$/.test(sp.mode)) return null; if(sp.kind==="hcport"&&!/^oneper$/.test(String(sp.mode||""))&&!/port|block|cluster/i.test(String(sp.mode||""))) return null; if(sp.kind==="dual") k="portfolio"; if(sp.kind==="hx102"&&sp.mode==="dual") k="portfolio"; return k; }
var REG={}, RID=0;
var _html=qmHtml;
qmHtml=function(res){ var h=_html(res); try{ var k=trackable(res), pk=k?picksOf(res):[]; if(k&&pk.length){ var id="t"+(++RID); REG[id]={spec:JSON.parse(JSON.stringify(res.spec)),picks:pk,kind:k};
  h+='<p class="hx103" style="margin:6px 0"><button type="button" class="btn" data-trk="'+id+'">📌 Track this '+k+'</button></p>'; } }catch(e){} return h; };
document.addEventListener("click",function(e){ var b=e.target&&e.target.closest?e.target.closest("[data-trk]"):null; if(!b) return; e.preventDefault(); var r=REG[b.getAttribute("data-trk")]; if(!r) return;
  var d=scanDate(); if(!d){ b.textContent="No scan date: load a scan first"; return; }
  var turn=b.closest(".qm-turn"), q=turn&&turn.querySelector(".qm-q")?turn.querySelector(".qm-q").textContent.trim():"Tracked "+r.kind;
  var id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  LASTMSG=[]; ST.ports.push({id:id,name:q.slice(0,160),q:q,kind:r.kind,spec:r.spec,created:d,settings:{entry:"open",cost:10,notional:100000},ups:[{d:d,picks:r.picks,exits:{}}]}); save(); SEL=id; render();
  var p=b.parentNode; p.innerHTML='Tracked as “'+hE(q.slice(0,160))+'” ('+r.picks.length+' names, signal '+d+'). <button type="button" class="btn ghost" data-trkgo="1">Open the Portfolio Tracker</button>'; });

/* ================= update all ================= */
function reasonFor(spec,ctx,s,N){ var r=ctx.bySym[s]; if(!r){ try{ var X=moX(), ek={}; if(X&&X.etf&&X.etfKeys){ var si=X.etfKeys.indexOf("sym"); X.etf.forEach(function(a){ ek[a[si]]=1; }); } if(ek[s]) return "ETF not picked this time (outranked, no longer improving, or a limit)"; }catch(e){} return "missing from the scan"; }
  if(Array.isArray(spec.filters)){ var bad=spec.filters.filter(function(f){ try{ return !qmTest(r,f); }catch(e){ return false; } }); if(bad.length) return "no longer "+bad.map(function(f){ try{ return f.txt||qmFilterTxt(f); }catch(e){ return f.f; } }).join("; "); }
  try{ var PC=window.__pcond; if(PC&&spec.t){ var ks=PC.parse(spec.t,[])||[], fl=ks.filter(function(k){ try{ return !PC.test(k,r); }catch(e){ return false; } }); if(fl.length) return "no longer "+fl.map(function(k){ return PC.label(k); }).join("; ");
    if(!Array.isArray(spec.filters)) return "not picked this time (outranked by stronger candidates or a diversification limit)"; } }catch(e){}
  if(!Array.isArray(spec.filters)) return "not picked this time (outranked or a limit)";
  return "still qualifies but fell out of the "+(N?"top "+N:"list")+" (outranked or a limit)"; }
function updateAll(){
  /* the same fresh, enriched context Ask builds for every question */
  var ctx=null; try{ ctx=qmBuildCtx(); if(ctx){ qmEnrich(ctx); QM_CTX=ctx; } }catch(e){ ctx=null; }
  var d=scanDate(), msgs=[]; if(!ctx||!d){ return ["Load a scan first."]; }
  ST.ports.forEach(function(p){ var ups=p.ups, lastU=ups[ups.length-1];
    if(lastU&&d<lastU.d){ msgs.push(p.name+": the loaded scan ("+d+") is older than its last update ("+lastU.d+"), so it was not updated."); return; }
    var res=null; try{ var v=qmValidateAny(JSON.parse(JSON.stringify(p.spec))); if(v.error){ msgs.push(p.name+": "+v.error); return; } res=qmRun(v.spec,ctx); }catch(e){ msgs.push(p.name+": could not be run ("+e.message+")"); return; }
    var pk=picksOf(res||{}), prevU=lastU&&lastU.d===d?ups[ups.length-2]:lastU, ex={}, ks={}; pk.forEach(function(x){ ks[x.s+"|"+x.side]=1; });
    if(prevU) prevU.picks.forEach(function(x){ if(!ks[x.s+"|"+x.side]) ex[x.s]=reasonFor(p.spec,ctx,x.s,p.spec.n||pk.length); });
    var rec={d:d,picks:pk,exits:ex}; if(lastU&&lastU.d===d){ ups[ups.length-1]=rec; msgs.push(p.name+": update for "+d+" replaced ("+pk.length+" names)."); } else { ups.push(rec); msgs.push(p.name+": updated for "+d+" ("+pk.length+" names"+(pk.length?"":"; nothing qualifies, everything goes to cash")+")."); } });
  if(ST.ports.length) save(); return msgs.length?msgs:["Nothing is tracked yet. Ask for a portfolio and press “Track this portfolio”."];
}

/* ================= tab ================= */
var SEL=null, LASTMSG=[], DELARM=null, RENAME=null, UNDO=null, SETTINGS_EDIT=null;
function opt(list,val){ return list.map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===val?' selected':'')+'>'+x[1]+'</option>'; }).join(""); }
function status(){ var el=document.getElementById("hx103Cloud"); if(el) el.textContent={local:"Saved in this browser",saving:"Saving to your account…",synced:"Saved to your account",error:"Account save failed (kept in this browser)"}[CLOUD]||""; }
function tbl(head,align,body,hx){ var t={head:head,align:align,body:body}; if(hx) t.hxColor=hx; try{ return qmTableHtml(t); }catch(e){ return ""; } }
function chart(E,title){ if(!E||E.length<2) return '<p class="mini">The equity curve starts once the first orders have filled (next open after the signal).</p>';
  var W=900,Hh=300,ml=56,mr=120,mt=26,mb=30,pw=W-ml-mr,ph=Hh-mt-mb, v0=E[0].v, b0=E[0].b, lo=Infinity, hi=-Infinity;
  var P=E.map(function(e){ var a=e.v/v0*100, b=num(e.b)&&num(b0)?e.b/b0*100:null; lo=Math.min(lo,a,num(b)?b:a); hi=Math.max(hi,a,num(b)?b:a); return {a:a,b:b}; }); if(hi===lo){ hi+=1; lo-=1; } var pad=(hi-lo)*0.08; lo-=pad; hi+=pad;
  function X(i){ return ml+i/(E.length-1)*pw; } function Y(v){ return mt+ph-(v-lo)/(hi-lo)*ph; }
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:980px;display:block;background:var(--surface)"><text x="10" y="17" font-size="12.5" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  for(var g=0;g<=4;g++){ var gv=lo+(hi-lo)*g/4; s.push('<line x1="'+ml+'" y1="'+Y(gv).toFixed(1)+'" x2="'+(ml+pw)+'" y2="'+Y(gv).toFixed(1)+'" stroke="var(--line)" stroke-width="0.6"/><text x="'+(ml-6)+'" y="'+(Y(gv)+3).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--ink-3)">'+gv.toFixed(1)+'</text>'); }
  [0,Math.floor((E.length-1)/2),E.length-1].forEach(function(i){ s.push('<text x="'+X(i).toFixed(1)+'" y="'+(mt+ph+16)+'" font-size="10" text-anchor="middle" fill="var(--ink-3)">'+E[i].d+'</text>'); });
  function path(k,c,w,dash){ var d=""; P.forEach(function(p,i){ if(!num(p[k])) return; d+=(d?"L":"M")+X(i).toFixed(1)+" "+Y(p[k]).toFixed(1); }); return d?'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 3"':'')+'/>':""; }
  s.push(path("b","var(--ink-3)",1.4,true)); s.push(path("a","#16a34a",2.2,false));
  var la=P[P.length-1];
  s.push('<text x="'+(W-mr+4)+'" y="'+(Y(la.a)+4).toFixed(1)+'" font-size="10.5" font-weight="700" fill="#16a34a">Portfolio '+la.a.toFixed(1)+'</text>');
  if(num(la.b)) s.push('<text x="'+(W-mr+4)+'" y="'+(Y(la.b)+14).toFixed(1)+'" font-size="10.5" fill="var(--ink-3)">RSP '+la.b.toFixed(1)+'</text>');
  s.push('</svg>'); return '<div class="chart-scroll hx94plot" style="margin:8px 0">'+s.join("")+'</div>'; }
function render(){
  var pane=document.getElementById("pane-ptk"); if(!pane) return; var hx=H(), bench=(A.bench&&A.bench())||"RSP", d=scanDate();
  var R={}; ST.ports.forEach(function(p){ try{ R[p.id]=engine(p,hx,bench); }catch(e){ R[p.id]={error:e.message}; } });
  var h=['<h2 style="margin:4px 0 6px">Portfolio Tracker</h2><p class="mini" style="max-width:900px">Track portfolios and lists from Ask the terminal. Each day: load the new scan and the part E history, then press <b>Update all tracked</b>. Every portfolio re-runs its frozen rules on the new scan: new names are bought, names that no longer qualify are sold (with the reason), the rest are held. Fills at the next day’s open after the signal, 10 bp cost per side, equal weights, 100,000 start. Forward tracking only, not a backtest.</p>',
    '<p style="margin:6px 0"><button type="button" class="btn" data-trkupd="1">Update all tracked</button> <span class="mini">Loaded scan: <b>'+hE(d||"none")+'</b> · history: <b>'+hE(hx?hx.lastDate:"not loaded")+'</b> · <span id="hx103Cloud"></span></span></p>'];
  if(UNDO) h.push('<p class="mini" style="margin:4px 0 8px;padding:6px 10px;border-left:3px solid var(--neg)">Deleted “'+hE(UNDO.p.name)+'”. <button type="button" class="btn ghost" data-trkundo="1">Undo</button></p>');
  if(LASTMSG.length) h.push('<div class="mini" style="margin:4px 0 8px;padding:6px 10px;border-left:3px solid var(--accent)">'+LASTMSG.map(hE).join("<br>")+'</div>');
  if(!ST.ports.length){ h.push('<p>Nothing is tracked yet. In Ask the terminal, build a portfolio (for example “Build a smart portfolio of 8 stocks in an uptrend, pulling back”) and press <b>📌 Track this portfolio</b> under the answer.</p>'); pane.innerHTML=h.join(""); status(); return; }
  h.push('<h3 style="margin:10px 0 4px">Overview</h3>');
  h.push(tbl(["Portfolio","Type","Started","Last update","Updates","Holdings","Value","Return","RSP","vs RSP","Max drawdown","Trades","Win rate",""],["l","l","l","l","r","r","r","r","r","r","r","r","r","l"],
    ST.ports.map(function(p){ var r=R[p.id]||{}, st=r.stats; return [p.name,p.kind,p.created,p.ups[p.ups.length-1].d,String(p.ups.length),st?String(st.holdings):String(p.ups[p.ups.length-1].picks.length)+" (pending)",st?money(st.value):"–",st?pct(st.ret):"–",st?pct(st.bench):"–",st&&num(st.bench)?pct(st.ret-st.bench):"–",st?pct(st.mdd):"–",st?String(st.trades):"0",st&&num(st.win)?st.win.toFixed(0)+"%":"–","__VIEW__"+p.id]; }),{7:"sign",9:"sign",10:"sign"}).replace(/__VIEW__([a-z0-9]+)/g,function(m,id){ return '<button type="button" class="btn ghost" data-trksel="'+id+'">View details</button>'; }));
  var p=ST.ports.filter(function(x){ return x.id===SEL; })[0]||ST.ports[ST.ports.length-1]; SEL=p.id; var r=R[p.id]||{};
  h.push('<p style="margin:10px 0"><label><b>Show the details of:</b> <select id="hx103Sel" style="max-width:100%;font:inherit;padding:4px 6px">'+ST.ports.map(function(x){ return '<option value="'+x.id+'"'+(x.id===p.id?' selected':'')+'>'+hE(x.name)+'</option>'; }).join("")+'</select></label> <span class="mini">(or use “View details” in the overview)</span></p>');
  h.push('<h3 style="margin:12px 0 4px">'+hE(p.name)+'</h3><p class="mini">Question: '+hE(p.q)+' · frozen query kind <b>'+hE(p.spec.kind)+'</b> · started '+hE(p.created)+' </p>');
  h.push('<p style="margin:4px 0">'+(RENAME===p.id?'<input id="hx103Name" type="text" value="'+hE(p.name)+'" style="font:inherit;padding:4px 6px;min-width:320px;max-width:100%"> <button type="button" class="btn" data-trkrensave="'+p.id+'">Save name</button> <button type="button" class="btn ghost" data-trkcancel="1">Cancel</button>':'<button type="button" class="btn ghost" data-trkren="'+p.id+'">Rename</button>')+
    ' <button type="button" class="btn ghost" data-trkcsv="'+p.id+'">Download CSV</button> '+
    ' <button type="button" class="btn ghost" data-trkset="'+p.id+'">Settings</button> '+
    (DELARM===p.id?'<button type="button" class="btn" data-trkdel="'+p.id+'" style="background:var(--neg);border-color:var(--neg);color:#fff">Yes, delete this portfolio</button> <button type="button" class="btn ghost" data-trkcancel="1">Cancel</button>':'<button type="button" class="btn ghost" data-trkdel="'+p.id+'">Delete</button>')+'</p>');
  if(SETTINGS_EDIT===p.id){ var ps=p.settings||{};
    h.push('<div style="margin:6px 0 10px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;max-width:560px">'+
      '<div style="display:flex;flex-wrap:wrap;gap:12px">'+
      '<label>Rebalance <select id="hx103SetRebal" style="font:inherit;padding:3px 5px">'+opt([["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["quarterly","Quarterly"],["yearly","Yearly"]],ps.rebalance||"daily")+'</select></label>'+
      '<label>Entry fill <select id="hx103SetEntry" style="font:inherit;padding:3px 5px">'+opt([["open","Next open"],["close","Next close"]],ps.entry||"open")+'</select></label>'+
      '<label>Cost (bps) <input id="hx103SetCost" type="number" min="0" step="1" value="'+(num(ps.cost)?ps.cost:10)+'" style="width:70px;font:inherit;padding:3px 5px"></label>'+
      '<label>Weight <select id="hx103SetWeight" style="font:inherit;padding:3px 5px">'+opt([["eq","Equal"],["rank","Rank-weighted"],["iv","Inverse volatility"]],ps.weight||"eq")+'</select></label>'+
      '</div><p class="mini" style="margin:8px 0 4px">Change these any time — they only change how the portfolio’s already-recorded picks are turned into trades and weights; the recorded history itself never changes.</p>'+
      '<p style="margin:4px 0"><button type="button" class="btn" data-trksetsave="'+p.id+'">Save</button> <button type="button" class="btn ghost" data-trkcancel="1">Cancel</button></p></div>'); }
  if(r.error) h.push('<p>Could not compute: '+hE(r.error)+'</p>');
  if(r.fillNote) h.push('<p class="mini">'+hE(r.fillNote)+'</p>');
  var st=r.stats; if(st) h.push(tbl(["Measure","Value"],["l","r"],[["Period",st.start+" to "+st.end+" ("+st.days+" bars)"],["Value (start 100,000)",money(st.value)],["Return",pct(st.ret)],["RSP over the same days",pct(st.bench)],["Max drawdown",pct(st.mdd)],["Annualised volatility",num(st.vol)?st.vol.toFixed(1)+"%":"\u2013"],["Sharpe-style ratio",num(st.sharpe)?st.sharpe.toFixed(2):"–"],["Closed trades / win rate",st.trades+" / "+(num(st.win)?st.win.toFixed(0)+"%":"–")],["Average win / loss",pct(st.avgWin)+" / "+pct(st.avgLoss)],["Average days held",num(st.avgDays)?st.avgDays.toFixed(1):"–"],["Turnover (traded / average value)",num(st.turnover)?st.turnover.toFixed(0)+"%":"–"]]));
  h.push(chart(r.equity,p.name.slice(0,60)+": value vs RSP (both = 100 at the first fill)"));
  var o=r.orders; if(o){ var body=[]; o.buy.forEach(function(x){ body.push(["BUY",x.s,x.side,"new in the list"]); }); o.sell.forEach(function(x){ body.push(["SELL",x.s,x.side,x.why]); }); o.hold.forEach(function(x){ body.push(["HOLD",x.s,x.side,"still in the list"]); });
    h.push('<h3 style="margin:12px 0 4px">Latest update ('+hE(o.d)+'): '+o.buy.length+' buy, '+o.hold.length+' hold, '+o.sell.length+' sell</h3>'+tbl(["Action","Symbol","Side","Why"],["l","l","l","l"],body)); }
  if(r.pending&&r.pending.length) h.push('<p class="mini">Pending: '+r.pending.map(function(x){ return x.n+" names "+x.msg; }).map(hE).join("; ")+'.</p>');
  if(r.holdings&&r.holdings.length) h.push('<h3 style="margin:12px 0 4px">Holdings</h3>'+tbl(["Symbol","Side","Entry date","Entry price","Shares","Last close","Value","Return","Days held"],["l","l","l","r","r","r","r","r","r"],r.holdings.map(function(x){ return [x.s,x.side,x.d,x.px.toFixed(2),Math.abs(x.sh).toFixed(2),x.last.toFixed(2),money(x.value),pct(x.ret),String(x.days)]; }),{7:"sign"}));
  if(r.trades&&r.trades.length) h.push('<h3 style="margin:12px 0 4px">Closed trades</h3>'+tbl(["Symbol","Side","Entry","Entry price","Exit","Exit price","Return","Days","Why it was sold"],["l","l","l","r","l","r","r","r","l"],r.trades.map(function(x){ return [x.s,x.side,x.inD,x.inPx.toFixed(2),x.outD,x.outPx.toFixed(2),pct(x.ret),String(x.days),x.why]; }),{6:"sign"}));
  if(r.flags&&r.flags.length) h.push('<p class="mini">Checks: '+r.flags.slice(0,12).map(hE).join("; ")+'.</p>');
  h.push('<p class="mini">Prices: part E opens and closes; a missing price is never invented (the last close is carried and flagged). Re-running the same scan date replaces that day’s update; an older scan is refused.</p>');
  pane.innerHTML=h.join(""); status();
}
function csvOf(p){ var r=engine(p,H(),(A.bench&&A.bench())||"RSP"), L=["type,date,symbol,side,price,shares_or_return,value_or_reason"];
  (r.trades||[]).forEach(function(t){ L.push(["trade_in",t.inD,t.s,t.side,t.inPx,"",""].join(",")); L.push(["trade_out",t.outD,t.s,t.side,t.outPx,t.ret.toFixed(4),'"'+t.why.replace(/"/g,"'")+'"'].join(",")); });
  (r.holdings||[]).forEach(function(x){ L.push(["holding",x.d,x.s,x.side,x.px,x.sh.toFixed(6),x.value.toFixed(2)].join(",")); });
  (r.equity||[]).forEach(function(e){ L.push(["equity",e.d,"","","","",e.v.toFixed(2)+(num(e.b)?"":"")].join(",")+(num(e.b)?","+e.b.toFixed(2):"")); });
  return L.join("\n"); }
function download(name,text){ try{ if(window.claude&&window.claude.use){ window.claude.use("downloads").then(function(dl){ if(dl&&dl.save) dl.save({filename:name,data:text}).catch(function(){}); else fallback(); },fallback); return; } }catch(e){} fallback();
  function fallback(){ try{ var a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type:"text/csv"})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); }catch(e){} } }
document.addEventListener("change",function(e){ if(e.target&&e.target.id==="hx103Sel"){ SEL=e.target.value; render(); } });
document.addEventListener("click",function(e){ var t=e.target&&e.target.closest?e.target.closest("[data-trkupd],[data-trksel],[data-trkren],[data-trkdel],[data-trkcsv],[data-trkgo],[data-trkrensave],[data-trkcancel],[data-trkundo],[data-trkset],[data-trksetsave]"):null; if(!t) return;
  if(t.hasAttribute("data-trkcancel")){ DELARM=null; RENAME=null; SETTINGS_EDIT=null; render(); return; }
  if(t.hasAttribute("data-trkundo")){ if(UNDO){ ST.ports.splice(Math.min(UNDO.i,ST.ports.length),0,UNDO.p); SEL=UNDO.p.id; UNDO=null; save(); render(); } return; }
  if(t.hasAttribute("data-trkrensave")){ var pr=ST.ports.filter(function(x){ return x.id===t.getAttribute("data-trkrensave"); })[0], inp=document.getElementById("hx103Name"); if(pr&&inp&&inp.value.trim()){ pr.name=inp.value.trim().slice(0,160); save(); } RENAME=null; render(); return; }
  if(t.hasAttribute("data-trkgo")){ var tb=document.getElementById("tab-ptk"); if(tb){ try{ selectTab(tb); }catch(err){} window.scrollTo({top:0,behavior:"smooth"}); render(); } return; }
  if(t.hasAttribute("data-trkupd")){ LASTMSG=updateAll(); render(); return; }
  if(t.hasAttribute("data-trksel")){ SEL=t.getAttribute("data-trksel"); render(); try{ var dd=document.getElementById("hx103Sel"); if(dd) dd.scrollIntoView({behavior:"smooth",block:"start"}); }catch(err){} return; }
  if(t.hasAttribute("data-trkset")){ SETTINGS_EDIT=t.getAttribute("data-trkset"); DELARM=null; RENAME=null; render(); return; }
  if(t.hasAttribute("data-trksetsave")){ var psid=t.getAttribute("data-trksetsave"), pset=ST.ports.filter(function(x){ return x.id===psid; })[0];
    if(pset){ pset.settings=pset.settings||{}; var rb=document.getElementById("hx103SetRebal"), en=document.getElementById("hx103SetEntry"), co=document.getElementById("hx103SetCost"), wt=document.getElementById("hx103SetWeight");
      if(rb) pset.settings.rebalance=rb.value; if(en) pset.settings.entry=en.value; if(co&&co.value!==""&&num(+co.value)) pset.settings.cost=+co.value; if(wt) pset.settings.weight=wt.value; save(); }
    SETTINGS_EDIT=null; render(); return; }
  var id=t.getAttribute("data-trkren")||t.getAttribute("data-trkdel")||t.getAttribute("data-trkcsv"), p=ST.ports.filter(function(x){ return x.id===id; })[0]; if(!p) return;
  if(t.hasAttribute("data-trkren")){ RENAME=id; DELARM=null; render(); try{ var ip=document.getElementById("hx103Name"); if(ip){ ip.focus(); ip.select(); } }catch(err){} return; }
  if(t.hasAttribute("data-trkdel")){ if(DELARM!==id){ DELARM=id; RENAME=null; render(); return; } var ix=ST.ports.indexOf(p); UNDO={p:p,i:ix}; ST.ports=ST.ports.filter(function(x){ return x.id!==id; }); DELARM=null; SEL=null; save(); render(); return; }
  if(t.hasAttribute("data-trkcsv")) download("tracker_"+p.name.replace(/[^a-z0-9]+/gi,"_").slice(0,40)+".csv",csvOf(p)); });

/* the tab (added like the Guide tab) */
(function(){ var nav=document.getElementById("tab-eng")&&document.getElementById("tab-eng").parentNode, eng=document.getElementById("pane-eng"); if(!nav||!eng||document.getElementById("tab-ptk")) return;
  var pane=document.createElement("section"); pane.className="pane"; pane.id="pane-ptk"; pane.setAttribute("role","tabpanel"); pane.setAttribute("aria-labelledby","tab-ptk"); pane.hidden=true; eng.parentNode.insertBefore(pane,eng.nextSibling);
  var t=document.createElement("button"); t.className="tab"; t.setAttribute("role","tab"); t.id="tab-ptk"; t.setAttribute("aria-controls","pane-ptk"); t.setAttribute("aria-selected","false"); t.textContent="Portfolio Tracker"; nav.appendChild(t);
  t.addEventListener("click",function(){ try{ selectTab(t); }catch(e){} render(); });
  try{ var g=TG_GROUPS.filter(function(x){ return x.k==="trk"; })[0]; if(g&&g.tabs.indexOf("ptk")<0) g.tabs.push("ptk"); }catch(e){}
})();
window.addEventListener("hxchange",function(){ try{ var pn=document.getElementById("pane-ptk"); if(pn&&!pn.hidden) render(); }catch(e){} });
try{ window.__trk={engine:engine,picksOf:picksOf,state:function(){ return ST; },updateAll:updateAll,render:render}; }catch(e){}
}catch(e){ try{ console.warn("v103 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
