/* ================= v81: Ask the terminal, third layer =================
   1  Price history (optional RealTest part E, one row per symbol per bar). Parsed here, kept in IndexedDB on this device and
      mirrored in parts to the artifact store (collection hist). Never localStorage, so the scan's own storage cannot fill up.
      Adds long-horizon fields: YTD, 1/3/6/12 month returns, annualised volatility, max drawdown, correlation and beta to RSP.
   2  kind "diag": the diagnostic of a list (typed tickers, or the tickers of the previous answer): group and per-symbol returns,
      volatility, drawdown and correlation to RSP over YTD and 12 months.
   3  kind "xlink": cross-sector connections. Which stocks link to other sectors or subsectors, how one ticker is connected,
      hidden groups that cross sectors, cohorts that mix sectors, and misfits that behave like another sector.
   4  Follow-ups on the previous answer's tickers ("these", "them", "those").
   5  The Claude fallback is told every field the engine knows, generated from QM_SYM.
   Contract kept: text -> spec -> validated -> computed here -> fixed layout. This layer only WRAPS the v70/v72 functions: a
   question it does not claim goes to them unchanged, and any error inside it falls back to them. */
var HX=null, HXM=null, HXC=null, QMV_LAST=null;
(function(){
try{
var HX_BENCH_PREF=["RSP","SPY"];
/* new words for the existing misspelling corrector (qmFuzzy reads these two globals at call time) */
(function(){ var add="connected connection connections linked hidden cohort cohorts misfit misfits drawdown drawdowns diagnostic diagnose annualised annualized similar similarly behaving behaves behave together between industry industries history distance correlations benchmark connectivity".split(" ");
  add.forEach(function(w){ if(QMX_VOC.indexOf(w)<0) QMX_VOC.push(w); }); var o={}; QMX_VOC.forEach(function(w){ o[w]=1; }); QMX_VOCSET=o; })();
function hxE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
function hxPad(x){ x=String(x); return x.length<2?"0"+x:x; }
function hxDate(s){
  s=String(s||"").trim().replace(/^"|"$/g,"");
  var m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+"-"+hxPad(m[2])+"-"+hxPad(m[3]);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/); if(m) return (m[3].length===2?"20"+m[3]:m[3])+"-"+hxPad(m[1])+"-"+hxPad(m[2]);
  m=s.match(/^(\d{4})(\d{2})(\d{2})$/); if(m) return m[1]+"-"+m[2]+"-"+m[3];
  return null;
}
function hxScanIso(){ try{ return hxDate(QM_CTX&&QM_CTX.date?QM_CTX.date:(U&&U.date)); }catch(e){ return null; } }

/* ---------- 1a. parse the part E CSV ---------- */
var HX_KEEP=300;
function hxParseCsv(text){
  var gates=[], lines=String(text||"").split(/\r?\n/);
  while(lines.length&&!lines[lines.length-1].trim()) lines.pop();
  if(lines.length<2) return {gates:["The file is empty."]};
  function cells(l){ return l.split(",").map(function(c){ return c.trim().replace(/^"|"$/g,""); }); }
  var head=cells(lines[0]), iD=head.indexOf("Date"), iS=head.indexOf("Symbol"), iC=head.indexOf("HClose");
  if(iC<0) iC=head.indexOf("Close"); if(iC<0) iC=head.indexOf("Price");
  if(iD<0) gates.push("no Date column"); if(iS<0) gates.push("no Symbol column"); if(iC<0) gates.push("no HClose column");
  if(gates.length) return {gates:["This does not look like the part E history file: "+gates.join(", ")+". The header was: "+lines[0].slice(0,160)]};
  var by={}, ds={}, bad=0, n=0;
  for(var i=1;i<lines.length;i++){
    if(!lines[i]) continue; var c=cells(lines[i]); n++;
    var d=hxDate(c[iD]), s=String(c[iS]||"").toUpperCase(), v=parseFloat(c[iC]);
    if(!d||!/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(s)||!isFinite(v)||v<=0){ bad++; continue; }
    (by[s]=by[s]||{})[d]=v; ds[d]=1;
  }
  var dates=Object.keys(ds).sort(); if(dates.length>HX_KEEP) dates=dates.slice(dates.length-HX_KEEP);
  var syms=Object.keys(by).sort(), last=dates[dates.length-1];
  if(syms.length<50) gates.push("only "+syms.length+" symbols (at least 50 expected)");
  if(dates.length<60) gates.push("only "+dates.length+" bars (at least 60 expected; part E asks for 280)");
  if(n&&bad/n>0.05) gates.push(bad+" of "+n+" rows could not be read");
  var onLast=syms.filter(function(s){ return by[s][last]!==undefined; }).length;
  if(syms.length&&onLast/syms.length<0.8) gates.push("only "+onLast+" of "+syms.length+" symbols have the newest bar "+last);
  if(gates.length) return {gates:gates};
  var out={};
  syms.forEach(function(s){ var m=by[s]; out[s]=dates.map(function(d){ var v=m[d]; return v===undefined?null:Math.round(v*1e4)/1e4; }); });
  return {gates:[],hx:{v:1,dates:dates,syms:out,lastDate:last,nSyms:syms.length,bars:dates.length,rows:n,badRows:bad}};
}

/* ---------- 1b. storage: IndexedDB on this device + chunked copy in the artifact store ---------- */
function hxIdb(){
  return new Promise(function(res,rej){
    try{ var r=indexedDB.open("alexaligned.hist",1);
      r.onupgradeneeded=function(){ try{ r.result.createObjectStore("kv"); }catch(e){} };
      r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); };
    }catch(e){ rej(e); }
  });
}
function hxIdbGet(){ return hxIdb().then(function(db){ return new Promise(function(res){ try{ var q=db.transaction("kv","readonly").objectStore("kv").get("current"); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ res(null); }; }catch(e){ res(null); } }); }).catch(function(){ return null; }); }
function hxIdbPut(rec){ return hxIdb().then(function(db){ return new Promise(function(res){ try{ var tx=db.transaction("kv","readwrite"); if(rec) tx.objectStore("kv").put(rec,"current"); else tx.objectStore("kv").delete("current"); tx.oncomplete=function(){ res(true); }; tx.onerror=function(){ res(false); }; }catch(e){ res(false); } }); }).catch(function(){ return false; }); }
function hxSound(h){ return !!(h&&h.v===1&&h.dates&&h.dates.length>=60&&h.syms&&typeof h.syms==="object"); }
function hxMirror(rec){
  if(!(window.claude&&typeof window.claude.use==="function")) return Promise.resolve("no store in this view");
  return window.claude.use("db").then(function(db){
    if(!db) return "no store in this view";
    var chars=JSON.stringify(rec).length;
    return upChunkWrite(db,"hist","current",rec).then(function(n){
      return db.doc("hist/current").set({savedAt:rec.savedAt,source:rec.source,chunked:true,n:n,chars:chars,lastDate:rec.hx.lastDate,nSyms:rec.hx.nSyms,bars:rec.hx.bars}).then(function(){ return "saved to the shared store"; });
    });
  }).catch(function(e){ return "not saved to the shared store ("+((e&&e.code)||"refused")+")"; });
}
function hxFromStore(){
  if(!(window.claude&&typeof window.claude.use==="function")) return Promise.resolve(null);
  return window.claude.use("db").then(function(db){
    if(!db) return null;
    return db.doc("hist/current").get().then(function(d){
      var h=d&&d.exists&&d.data?d.data():null; if(!h||!h.chunked||!(h.n>0)) return null;
      return upChunkRead(db,"hist","current",h.n).then(function(full){
        if(!full||full.savedAt!==h.savedAt||JSON.stringify(full).length!==h.chars||!hxSound(full.hx)) return null;
        return full;
      });
    });
  }).catch(function(){ return null; });
}
function hxSet(rec){ HX=rec?rec.hx:null; HX&&(HX.savedAt=rec.savedAt,HX.source=rec.source); HXM=null; HXC=null; hxLabels(); hxStatus(); }
function hxBoot(){
  hxStatus("Looking for stored price history\u2026");
  hxIdbGet().then(function(loc){
    if(loc&&hxSound(loc.hx)) hxSet(loc); else hxStatus();
    return hxFromStore().then(function(sh){
      if(sh&&(!loc||!loc.savedAt||sh.savedAt>loc.savedAt)){ hxSet(sh); hxIdbPut(sh); }
    });
  }).catch(function(){ hxStatus(); });
}

/* ---------- 1c. long-horizon metrics, computed once per history ---------- */
function hxBench(){ if(!HX) return null; for(var i=0;i<HX_BENCH_PREF.length;i++) if(HX.syms[HX_BENCH_PREF[i]]) return HX_BENCH_PREF[i]; return null; }
function hxYtdBase(){ var D=HX.dates, y=D[D.length-1].slice(0,4), b=-1; for(var i=0;i<D.length;i++) if(D[i].slice(0,4)<y) b=i; return b; }
function hxRet(c,i){ return (i>0&&c[i]!==null&&c[i-1]!==null&&c[i-1]>0)?c[i]/c[i-1]-1:null; }
function hxSd(a){ if(a.length<2) return null; var m=0,i; for(i=0;i<a.length;i++) m+=a[i]; m/=a.length; var s=0; for(i=0;i<a.length;i++) s+=(a[i]-m)*(a[i]-m); return Math.sqrt(s/(a.length-1)); }
function hxCorr(x,y){ var n=x.length; if(n<20) return null; var mx=0,my=0,i; for(i=0;i<n;i++){ mx+=x[i]; my+=y[i]; } mx/=n; my/=n; var sxy=0,sxx=0,syy=0; for(i=0;i<n;i++){ var a=x[i]-mx,b=y[i]-my; sxy+=a*b; sxx+=a*a; syy+=b*b; } return (sxx>0&&syy>0)?sxy/Math.sqrt(sxx*syy):null; }
function hxBeta(x,y){ var n=x.length; if(n<20) return null; var mx=0,my=0,i; for(i=0;i<n;i++){ mx+=x[i]; my+=y[i]; } mx/=n; my/=n; var sxy=0,syy=0; for(i=0;i<n;i++){ sxy+=(x[i]-mx)*(y[i]-my); syy+=(y[i]-my)*(y[i]-my); } return syy>0?sxy/syy:null; }
/* one price path from index a to b: return, annualised volatility and max drawdown, all in percent */
function hxPath(c,a,b){
  if(a<0||b<=a||c[a]===null||c[b]===null) return null;
  var rs=[], peak=c[a], dd=0, i;
  for(i=a+1;i<=b;i++){ var r=hxRet(c,i); if(r!==null) rs.push(r); if(c[i]!==null){ if(c[i]>peak) peak=c[i]; var x=c[i]/peak-1; if(x<dd) dd=x; } }
  var sd=hxSd(rs);
  return {ret:(c[b]/c[a]-1)*100,vol:sd===null?null:sd*Math.sqrt(252)*100,dd:dd*100,n:rs.length};
}
function hxMetrics(){
  if(!HX) return null; if(HXM&&HXM.stamp===HX.savedAt) return HXM;
  var D=HX.dates, L=D.length-1, yb=hxYtdBase(), a12=L-252, bench=hxBench(), bc=bench?HX.syms[bench]:null, by={};
  Object.keys(HX.syms).forEach(function(s){
    var c=HX.syms[s], li=L; while(li>=0&&c[li]===null) li--;
    if(li<L-3){ by[s]={stale:true,last:li>=0?D[li]:null}; return; }
    function rn(k){ return (li-k>=0&&c[li-k]!==null)?(c[li]/c[li-k]-1)*100:null; }
    var Y=yb>=0?hxPath(c,yb,li):null, T=a12>=0?hxPath(c,a12,li):null;
    if(T&&T.n<200) T=null;
    var mx=null; for(var i=Math.max(0,li-251);i<=li;i++) if(c[i]!==null&&(mx===null||c[i]>mx)) mx=c[i];
    var o={ytd:Y?Y.ret:null,voly:Y?Y.vol:null,ddy:Y?Y.dd:null,m1:rn(21),m3:rn(63),m6:rn(126),m12:rn(252),vol12:T?T.vol:null,dd12:T?T.dd:null,
      hi52:(mx&&li>=200)?(c[li]/mx-1)*100:null,crsp:null,beta:null};
    if(bc&&s!==bench){ var xs=[],ys=[]; for(var j=Math.max(1,L-251);j<=L;j++){ var p=hxRet(c,j),q=hxRet(bc,j); if(p!==null&&q!==null){ xs.push(p); ys.push(q); } }
      if(xs.length>=120){ o.crsp=hxCorr(xs,ys); o.beta=hxBeta(xs,ys); } }
    by[s]=o;
  });
  HXM={stamp:HX.savedAt,by:by,yb:yb,a12:a12,bench:bench,L:L};
  return HXM;
}
/* equal-weight, rebalanced daily: each day's return is the plain mean of the members that traded that day */
function hxGroupPath(syms,a,L){
  if(a<0) return null; var eq=1, peak=1, dd=0, rs=[], used={};
  for(var i=a+1;i<=L;i++){ var s=0,k=0; syms.forEach(function(x){ var r=hxRet(HX.syms[x],i); if(r!==null){ s+=r; k++; used[x]=1; } });
    if(!k){ rs.push(null); continue; } var r0=s/k; rs.push(r0); eq*=1+r0; if(eq>peak) peak=eq; var d=eq/peak-1; if(d<dd) dd=d; }
  var v=rs.filter(function(x){ return x!==null; }), sd=hxSd(v);
  return {ret:(eq-1)*100,vol:sd===null?null:sd*Math.sqrt(252)*100,dd:dd*100,rs:rs,n:Object.keys(used).length};
}

var HX_FIELDS={ytd:{lab:"YTD return",d:2,pct:1},m1:{lab:"1M return (21 bars)",d:2,pct:1},m3:{lab:"3M return (63 bars)",d:2,pct:1},m6:{lab:"6M return (126 bars)",d:2,pct:1},
  m12:{lab:"12M return (252 bars)",d:2,pct:1},voly:{lab:"YTD volatility (annualised %)",d:2},vol12:{lab:"12M volatility (annualised %)",d:2},
  ddy:{lab:"YTD max drawdown",d:2,pct:1},dd12:{lab:"12M max drawdown",d:2,pct:1},crsp:{lab:"Correlation to RSP (12M daily)",d:3},beta:{lab:"Beta to RSP (12M daily)",d:2},
  hi52:{lab:"Distance from 52-week high",d:2,pct:1}};
Object.keys(HX_FIELDS).forEach(function(k){ QM_SYM[k]=HX_FIELDS[k]; });
function hxLabels(){ var b=hxBench()||"RSP"; QM_SYM.crsp.lab="Correlation to "+b+" (12M daily)"; QM_SYM.beta.lab="Beta to "+b+" (12M daily)"; }
QMX_KINDS.diag=1; QMX_KINDS.xlink=1;

var _qmEnrich=qmEnrich;
qmEnrich=function(ctx){
  var r=_qmEnrich(ctx);
  try{ var M=hxMetrics(); ctx.rows.forEach(function(row){ var m=M?M.by[row.sym]:null; Object.keys(HX_FIELDS).forEach(function(k){ row[k]=(m&&!m.stale&&qmNum(m[k]))?m[k]:null; }); }); }catch(e){}
  return r;
};
var _qmIgn=qmIgn;
qmIgn=function(q){ var a=_qmIgn(q); if(HX) a=a.filter(function(x){ return x.indexOf("horizons longer than 10 days")<0&&x.indexOf("beta (")!==0; }); return a; };

/* ---------- 3. cross-sector links ---------- */
function hxRowsBy(){ var ctx=QM_CTX, o={}; (ctx?ctx.rows:[]).forEach(function(r){ o[r.sym]=r; }); return o; }
function hxProfileNb(k){
  var pool=buildVectors(), out={};
  pool.forEach(function(s){ out[s.sym]=pool.filter(function(o){ return o!==s; }).map(function(o){ return {s:o.sym,d:dist2(s._v,o._v)}; })
    .sort(function(a,b){ return a.d-b.d||(a.s<b.s?-1:1); }).slice(0,k); });
  return out;
}
/* top-k return-correlated names from the price history, over the last w bars; only names with a full window */
function hxCorrNb(w,k){
  if(!HX) return null; var key=HX.savedAt+"|"+w+"|"+k; HXC=HXC||{}; if(HXC[key]) return HXC[key];
  var L=HX.dates.length-1, a=L-w; if(a<1) return null;
  var by=hxRowsBy(), syms=Object.keys(by).filter(function(s){ return HX.syms[s]; }), Z={};
  syms.forEach(function(s){ var c=HX.syms[s], r=[]; for(var i=a+1;i<=L;i++){ var x=hxRet(c,i); if(x===null) return; r.push(x); }
    var m=0; r.forEach(function(x){ m+=x; }); m/=r.length; var ss=0; r.forEach(function(x){ ss+=(x-m)*(x-m); }); ss=Math.sqrt(ss); if(!(ss>0)) return;
    Z[s]=r.map(function(x){ return (x-m)/ss; }); });
  var ks=Object.keys(Z).sort(), n=ks.length, best={};
  ks.forEach(function(s){ best[s]=[]; });
  function push(s,o,v){ var b=best[s]; b.push({s:o,v:v}); if(b.length>k*3){ b.sort(function(p,q){ return q.v-p.v; }); b.length=k; } }
  for(var i=0;i<n;i++){ var zi=Z[ks[i]]; for(var j=i+1;j<n;j++){ var zj=Z[ks[j]], d=0; for(var t=0;t<zi.length;t++) d+=zi[t]*zj[t]; push(ks[i],ks[j],d); push(ks[j],ks[i],d); } }
  ks.forEach(function(s){ best[s].sort(function(p,q){ return q.v-p.v||(p.s<q.s?-1:1); }); best[s]=best[s].slice(0,k); });
  HXC[key]=best; return best;
}
function hxLinks(level,thr){
  var ctx=QM_CTX, by=hxRowsBy(), L={}, src={peer:0,rev:0,grp:0,corr60:0,corr252:0,prof:0};
  ctx.rows.forEach(function(r){ L[r.sym]={}; });
  function cross(a,b){ return level==="industry"?(a.ind!==b.ind):(a.sec!==b.sec); }
  function add(a,b,type,v,w){ var ra=by[a], rb=by[b]; if(!ra||!rb||a===b||!cross(ra,rb)) return;
    var e=L[a][b]||(L[a][b]={s:b,types:[],v:null,w:0}); if(e.types.indexOf(type)<0){ e.types.push(type); e.w+=w; }
    if(qmNum(v)&&(e.v===null||v>e.v)) e.v=v; }
  ctx.rows.forEach(function(r){ if(r.peer&&by[r.peer]){ add(r.sym,r.peer,"closest return peer (60 bars)",r.peerV,3); add(r.peer,r.sym,"picked as closest peer by it",r.peerV,2); } });
  var groups=null;
  try{ if(swOk()&&moX().stockKeys.indexOf("peer")>=0){ groups=relClusters("stocks",thr);
    groups.clusters.forEach(function(c){ if(c.members.length>40) return; c.members.forEach(function(m){ c.members.forEach(function(o){ add(m.sym,o.sym,"same hidden group #"+c.id,c.avgV,2); }); }); }); } }catch(e){ groups=null; }
  var c60=hxCorrNb(60,5), c252=hxCorrNb(252,5);
  if(c60) Object.keys(c60).forEach(function(s){ c60[s].forEach(function(x){ add(s,x.s,"top 5 return correlation, 60 bars",x.v,2); }); });
  if(c252) Object.keys(c252).forEach(function(s){ c252[s].forEach(function(x){ add(s,x.s,"top 5 return correlation, 252 bars",x.v,2); }); });
  var pn=null; try{ pn=hxProfileNb(5); }catch(e){}
  if(pn) Object.keys(pn).forEach(function(s){ pn[s].forEach(function(x){ add(s,x.s,"profile look-alike (top 5)",null,1); }); });
  return {L:L,by:by,groups:groups,hasCorr:!!c60,hasProf:!!pn};
}
function hxGroupOf(groups,sym){ if(!groups) return null; for(var i=0;i<groups.clusters.length;i++){ var c=groups.clusters[i]; for(var j=0;j<c.members.length;j++) if(c.members[j].sym===sym) return c; } return null; }

/* ---------- parsing ---------- */
var HX_FOLLOW_RE=/\b(these|them|those|this list|that list|the list|the selection|this selection|the names above|the above|that basket|this basket|the basket)\b/;
var HX_LINKW=/\b(neighbou?rs?|neighbors?|connected|connections?|connects?|linked|links?|ties|tied|related|relationships?|correlated|peers?|hidden groups?|blocs?|cohorts?|look[- ]?alikes?|radar|move together|moves with|trade together|misfits?|behave like)\b/;
var HX_CROSSW=/\b(?:(?:other|different|another|outside (?:of )?(?:its|their|the)(?: own)?) (?:sectors?|subsectors?|industr(?:y|ies))|cross[- ]?(?:sector|subsector|industry)|across (?:sectors|subsectors|industries)|span\w* (?:several |multiple |more than one |many )?(?:sectors|subsectors)|mix(?:es|ing)? (?:the most )?sectors|more than one sector|multiple sectors|several sectors)\b/;
function hxTickers(q){ var out=[], ctx=QM_CTX; (String(q||"").match(/[A-Za-z0-9]+(?:[.\-][A-Za-z0-9]+)*/g)||[]).forEach(function(w){ var u=w.toUpperCase(); if(w!==u||!/[A-Z]/.test(u)||u.length<2) return; if(((ctx&&ctx.bySym[u])||(HX&&HX.syms[u]))&&out.indexOf(u)<0) out.push(u); }); return out; }
/* long-horizon phrases, matched on the lower-cased raw question so the spans can be blanked in the original text */
var HXP=[
  ["voly",/\b(?:ytd|year[- ]to[- ]date) (?:annuali[sz]ed |realised |realized )?vol(?:atility)?\b/],
  ["ddy",/\b(?:ytd|year[- ]to[- ]date) (?:max(?:imum)? )?draw[- ]?downs?\b/],
  ["vol12",/\b(?:(?:12|twelve)[- ]?months?|1[- ]?year|one[- ]year|trailing (?:12 months?|year)|annual|annuali[sz]ed|realised|realized|historical) (?:annuali[sz]ed )?vol(?:atility)?\b/],
  ["dd12",/\b(?:(?:(?:12|twelve)[- ]?months?|1[- ]?year|one[- ]year|trailing) )?(?:max(?:imum)? )?draw[- ]?downs?\b/],
  ["beta",/\bbetas?(?: (?:to|vs|versus|against) (?:rsp|spy|the market|the index|the equal[- ]weight(?:ed)? index))?\b/],
  ["crsp",/\bcorrelation (?:to|with|vs|versus|against) (?:rsp|the equal[- ]weight(?:ed)? (?:index|s&p|benchmark)|the benchmark)\b/],
  ["hi52",/\b(?:distance (?:from|to|below) (?:the |its )?)?52[- ]?week highs?\b|\boff (?:the |its |their )?highs?\b/],
  ["ytd",/\b(?:ytd|year[- ]to[- ]date|this year'?s?|since (?:the start of the year|january|jan 1))(?: returns?| gains?| performance| change| move)?\b/],
  ["m12",/\b(?:(?:12|twelve)[- ]?months?|1[- ]?year|one[- ]year|trailing (?:12 months?|year)|past year|last 12 months|annual)(?: returns?| gains?| performance| change| move)?\b/],
  ["m6",/\b(?:6|six)[- ]?months?(?: returns?| gains?| performance| change| move)?\b|\bhalf[- ]year\b/],
  ["m3",/\b(?:3|three)[- ]?months?(?: returns?| gains?| performance| change| move)?\b|\b(?:past |last )?quarter(?:ly)?(?: returns?| performance)?\b/],
  ["m1",/\b(?:1|one)[- ]?months?(?: returns?| gains?| performance| change| move)?\b|\b(?:past|last) month\b|\bmonthly(?: returns?| performance)?\b/]];
var HX_WORDS=/\b(ytd|year[- ]to[- ]date|months?|monthly|quarter\w*|1[- ]year|one[- ]year|52[- ]?week|draw[- ]?downs?|annuali[sz]ed|betas?|since january|this year|rsp|equal[- ]weight(?:ed)? index|off (?:the |its |their )?highs?)\b/;
function hxOp(s){ return qmOpOf(s); }
function hxParseHist(q,t){
  var low=String(q||"").toLowerCase(), blanks=[], F=[], sort=null;
  var OP="(no worse than|no deeper than|better than|worse than|shallower than|deeper than|below|under|less than|lower than|smaller than|at most|no more than|up to|above|over|greater than|more than|higher than|larger than|at least|exceeding|of at least|<=|>=|<|>)";
  var SUP=/\b(most|highest|best|top|biggest|largest|strongest|greatest|least|lowest|smallest|worst|weakest|bottom|deepest|shallowest|furthest|closest)\b/g;
  function blankLow(a,b){ a=Math.max(0,a); low=low.slice(0,a)+new Array(b-a+1).join(" ")+low.slice(b); blanks.push([a,b]); }
  HXP.forEach(function(p){
    var guard=0, m;
    while(guard++<20){
      var re=new RegExp(p[1].source,"g"); m=re.exec(low); if(!m) break;
      var s=m.index, e=s+m[0].length; if(e<=s) break;
      var tail=low.slice(e,e+48), mm=tail.match(new RegExp("^\\s*(?:is |are |was |of |at )?(?:a |an )?"+OP+"\\s*(?:-|minus )?\\$?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:%|percent|pct)?"));
      var lead=low.slice(Math.max(0,s-34),s), wi=lead.match(/within (\d+(?:\.\d+)?) ?(?:%|percent) of (?:its |the |their )?$/);
      if(p[0]==="hi52"&&wi){ F.push({f:"hi52",op:">=",v:-parseFloat(wi[1]),txt:"within "+wi[1]+"% of its 52-week high"}); blankLow(s-wi[0].length,e); continue; }
      if(mm){
        var v=parseFloat(mm[2]), op=hxOp(mm[1]), isDD=(p[0]==="ddy"||p[0]==="dd12"), wd=mm[1];
        /* "better than" / "worse than": for a drawdown, better means shallower; for anything else, better means higher */
        if(/^(?:better than|shallower than|no deeper than|no worse than)$/.test(wd)) op=isDD?"<":">";
        else if(/^(?:worse than|deeper than)$/.test(wd)) op=isDD?">":"<";
        var neg=/(?:-|minus )\s*\$?\s*\d/.test(mm[0]), txt;
        if(p[0]==="ddy"||p[0]==="dd12"){ /* "drawdown under 15%" means a drawdown no deeper than 15% */ var shallow=(op==="<"||op==="<="); v=-Math.abs(v); op=shallow?">=":"<=";
          txt=(p[0]==="ddy"?"YTD":"12M")+" max drawdown "+(shallow?"no deeper than ":"at least ")+Math.abs(v)+"%"; }
        else if(p[0]==="hi52"){ var near=(op==="<"||op==="<="); v=-Math.abs(v); op=near?">=":"<="; txt=(near?"within ":"at least ")+Math.abs(v)+"% "+(near?"of":"below")+" its 52-week high"; }
        else if(neg) v=-v;
        if(!txt){ var OPT={">":"above","<":"below",">=":"at or above","<=":"at or below"}, FL=HX_FIELDS[p[0]]; txt=(/^[A-Z][a-z]/.test(FL.lab)?FL.lab.charAt(0).toLowerCase()+FL.lab.slice(1):FL.lab)+" "+OPT[op]+" "+v+(FL.pct||/%\)$/.test(FL.lab)?"%":""); }
        var o={f:p[0],op:op,v:v}; if(txt) o.txt=txt; F.push(o); blankLow(s,e+mm[0].length);
      } else {
        var pre=low.slice(Math.max(0,s-30),s), all=pre.match(SUP), sup=all?all[all.length-1]:null;
        if(sup&&!sort){ var lo=/least|lowest|smallest|worst|weakest|bottom/.test(sup);
          if(p[0]==="ddy"||p[0]==="dd12") lo=/biggest|largest|worst|deepest|most/.test(sup);
          if(p[0]==="hi52") lo=/furthest|most|biggest|largest/.test(sup);
          sort={f:p[0],d:lo?"asc":"desc"}; }
        else if(!sort&&/\b(performers?|gainers?|losers?|winners?|leaders?|laggards?)\b/.test(low.slice(e,e+30))&&/^(ytd|m1|m3|m6|m12)$/.test(p[0])) sort={f:p[0],d:/losers?|laggards?/.test(low.slice(e,e+30))?"asc":"desc"};
        blankLow(s,e);
      }
    }
  });
  var q2=String(q||""); blanks.sort(function(a,b){ return b[0]-a[0]; }).forEach(function(b){ q2=q2.slice(0,Math.max(0,b[0]))+" "+q2.slice(b[1]); });
  return {filters:F,sort:sort,q2:q2.replace(/\s+/g," "),hit:!!(F.length||sort||blanks.length)};
}
function hxNoHistErr(){ return {_err:"That question needs the daily price history (returns beyond 10 days, year-to-date, 12 months, drawdown, beta, correlation to RSP). It is not loaded in this view. Run RealTest part E (Run workflow tab, section \u201CPart E: price history\u201D), then click \u201CLoad price history\u201D on this tab and pick AlexAligned_Unified_v7E_history.csv."}; }
/* common misspellings of this layer's own words; applied only to questions this layer reads, never to the older parsers */
var HX_TYPO=[[/\bhidd?e?n\b/gi,"hidden"],[/\bdiff?e?re?a?nt\b/gi,"different"],[/\bcon+e?ct(?:ed|d)\b/gi,"connected"],[/\bcon+ecti?ons?\b/gi,"connections"],[/\bnei?gh?b(?:o|ou)?rs?\b/gi,"neighbours"],
  [/\bneigh?bou?rs?\b/gi,"neighbours"],[/\bcor+ela?t/gi,"correlat"],[/\bsimm?[iu]la?r(ly)?\b/gi,"similar$1"],[/\bbeha?vi?o?u?r/gi,"behaviour"],[/\bbeha?ving\b/gi,"behaving"],[/\bcoh[ao]rts?\b/gi,"cohorts"],
  [/\bmis+fits?\b/gi,"misfits"],[/\bdraw ?d[ow]{2}ns?\b/gi,"drawdown"],[/\bdiagn?o?st?i?c?s?\b/gi,"diagnostic"],[/\bsub ?sect?e?o?rs\b/gi,"subsectors"],[/\bsub ?sect?e?o?r\b/gi,"subsector"],
  [/\bsect?e?o?rs\b/gi,"sectors"],[/\bsect?e?o?r\b/gi,"sector"],[/\bind[au]st?r[iy]e?s\b/gi,"industries"],[/\banoth?er\b/gi,"another"],[/\bwhic?h\b/gi,"which"],[/\bwich\b/gi,"which"]];
function hxTypos(q){ var s=String(q||""); HX_TYPO.forEach(function(p){ var one=new RegExp(p[0].source,"i"); s=s.replace(p[0],function(m){ return (m.length<=5&&m===m.toUpperCase())?m:m.replace(one,p[1]); }); }); return s; }
function hxParse(q){
  if(!QM_CTX) return null;
  q=hxTypos(q);
  var t=qmT(q), tk=hxTickers(q), follow=HX_FOLLOW_RE.test(t)&&QMV_LAST&&QMV_LAST.syms.length>0;
  var legacyFollow=/^ (?:same|now|but|and|instead|also|make it|change|swap|switch|again|redo|next|more|another|what about|how about|show more|the rest|exclud\w*|without|except|drop|remove|only|max|cap) /.test(t);
  var wantsDiag=/\b(diagnos\w*|tear ?down|performance (?:of|for|summary)|stats (?:for|on|of)|statistics (?:for|on|of)|how (?:have|has|did) [a-z ]{0,30}(?:done|performed|fared)|risk and return|return and risk)\b/.test(t);
  /* xlink: cross-sector connections */
  var linkW=HX_LINKW.test(t), crossW=HX_CROSSW.test(t), grpW=/\bhidden groups?\b|\bblocs?\b/.test(t), cohW=/\bcohorts?\b/.test(t), misW=/\bmisfits?\b|\bbehaves? like (?:another|a different|other) sectors?\b|\blook like (?:another|a different) sector\b/.test(t);
  var connW=/\b(connected|connections?|connects?|linked|links|ties|tied|related|relationships?)\b/.test(t);
  var PR=hxParsePairs(q,t); if(PR) return PR;
  var ci=t.search(/\b(connected|linked|tied|related|correlated|neighbou?rs?|neighbors?)\b/), tgtSec=ci>=0&&qmSecMentions(t.slice(ci)).inn.length>0;
  if(misW||grpW||cohW||(linkW&&(crossW||tgtSec)&&!tk.length)||(tk.length&&connW&&(crossW||/\bhow\b|\bwhat\b|\bwhich\b/.test(t)))||(follow&&linkW&&crossW)){
    return hxParseLink(q,t,tk,follow,{grpW:grpW,cohW:cohW,misW:misW});
  }
  /* diagnostic of a list */
  if(wantsDiag||(follow&&HX_WORDS.test(t)&&!/\b(which|that|with|where|whose|in an?)\b/.test(t))){
    if(!HX&&HX_WORDS.test(t)&&!wantsDiag) return hxNoHistErr();
    var syms=tk.length?tk:(follow?QMV_LAST.syms.slice():[]);
    if(!syms.length) return {_err:"Name the tickers (for example \u201Cdiagnostic of NDSN ITW IEX\u201D) or ask for a list first and then say \u201Cgive me a diagnostic of these\u201D."};
    return {kind:"diag",syms:syms.slice(0,60),from:tk.length?"named":"last"};
  }
  /* long-horizon conditions and rankings */
  if(HX_WORDS.test(t)){
    var H=hxParseHist(q,t);
    if(H.hit){
      if(!HX) return hxNoHistErr();
      if(tk.length&&!H.filters.length&&!H.sort&&!/\b(stocks|symbols|names|companies|tickers|which|list|screen|portfolio)\b/.test(t)) return {kind:"diag",syms:tk.slice(0,60),from:"named"};
      var sp=null; try{ sp=_qmParseX(H.q2); }catch(e){ sp=null; }
      if(sp&&!sp._err) sp=JSON.parse(JSON.stringify(sp));
      if(sp&&sp._err) return sp;
      if(!sp||!sp.kind||["screen","portfolio","count","spectrum"].indexOf(sp.kind)<0){
        var SM=qmSecMentions(t), C=qmConds(qmT(H.q2));
        var wCount=/ (how many|what (?:share|percent|percentage|proportion|fraction) of|count of|count the|number of) /.test(t);
        sp={kind:wCount?"count":"screen",filters:C.filters,secIn:SM.inn,secOut:SM.out,indIn:qmIndMentions(t,QM_CTX),bias:C.bias,anyTrend:C.anyTrend,n:qmNX(t)||10,exTk:[],onlyTk:[]};
        if(wCount) sp.group=/ by (?:subsector|industry|industries) /.test(t)?"industry":"sector";
        var rk=wCount?null:qmRankX(qmT(H.q2)); if(rk&&/\b(least|lowest|most|highest|smallest|largest|biggest|calmest|quietest|weakest|strongest|top|bottom|best|worst)\b/.test(qmT(H.q2))){ sp.sort=rk; sp.sortGiven=true; }
        if(sp.bias!=="any"&&!sp.anyTrend&&!sp.filters.some(function(f){ return f.f==="trend"; })) sp.filters=sp.filters.concat([{f:"trend",op:"=",v:sp.bias==="improving"?"up":"down",auto:1}]);
      }
      sp.filters=(sp.filters||[]).concat(H.filters.filter(function(f){ return !(sp.filters||[]).some(function(g){ return g.f===f.f&&g.op===f.op&&g.v===f.v; }); }));
      if(H.sort&&(sp.kind==="screen"||sp.kind==="portfolio")){ sp.sort=H.sort; sp.sortGiven=true; }
      if(sp.kind==="screen"&&!sp.sort){ var f0=H.filters[0]; sp.sort=f0?{f:f0.f,d:(f0.op==="<"||f0.op==="<=")?"asc":"desc"}:{f:"str",d:"desc"}; sp.sortGiven=!!f0; }
      if(follow&&!tk.length) sp.onlyTk=QMV_LAST.syms.slice();
      return sp;
    }
  }
  /* "which of these are in an uptrend" and the like: the previous answer's tickers become the universe */
  if(follow&&!legacyFollow&&!tk.length){
    var q3=String(q).replace(/\b(of |from |among |in )?(these|them|those|this list|that list|the list|the selection|this selection|the names above|the above|that basket|this basket|the basket)\b/gi," ");
    var s3=null; try{ s3=_qmParseX(q3); }catch(e){ s3=null; }
    if(s3&&!s3._err&&(s3.kind==="screen"||s3.kind==="count"||s3.kind==="portfolio")){ s3.onlyTk=QMV_LAST.syms.slice(); if(s3.kind==="screen") s3.n=Math.max(s3.n||10,Math.min(50,QMV_LAST.syms.length)); return s3; }
  }
  return null;
}
/* "rising" / "falling" about stocks (not subsectors) read as the Early Warning direction, the same field "improving" / "deteriorating" use */
function hxDirWords(t){ return t.replace(/\b(rising|going up|advancing|strengthening)\b/g,"improving").replace(/\b(falling|going down|declining|weakening)\b/g,"deteriorating"); }
function hxParseLink(q,t,tk,follow,w){
  var ctx=QM_CTX, lvl=/\b(?:other|different|another|outside|cross)[- ](?:\w+ ){0,2}(?:subsectors?|industr(?:y|ies))\b/.test(t)?"industry":"sector";
  var mode=w.misW?"misfit":(w.grpW?"groups":(w.cohW?"cohort":(tk.length?"focus":"list")));
  var src="all"; if(/\bcorrelat\w*|\breturn peers?\b/.test(t)&&mode==="list") src="corr"; if(/\b(profile|behavio\w*|look[- ]?alikes?|radar)\b/.test(t)&&mode==="list") src="prof";
  /* sectors named before the link word are the stocks' own; sectors after it are where the links must reach */
  var li=t.search(HX_LINKW), SM=qmSecMentions(t), own=[], tgt=[];
  if(SM.all.length){ QMX_SEC.forEach(function(p){ var re=new RegExp(p[1].source,"g"), m; while((m=re.exec(t))){ var k=p[0]; if(SM.out.indexOf(k)>=0) continue; if(li>=0&&m.index>li){ if(tgt.indexOf(k)<0) tgt.push(k); } else if(own.indexOf(k)<0) own.push(k); } }); }
  var thrM=t.match(/\b(?:link strength|threshold|strength|correlation|at) (?:of |above |at least |>=? ?)?(0?\.\d+)\b/), thr=thrM?Math.max(0.3,Math.min(0.95,parseFloat(thrM[1]))):0.6;
  var C=qmConds(hxDirWords(t.replace(HX_LINKW," ").replace(/\bcorrelat\w*\b/g," ")));
  var filters=C.filters.filter(function(f){ return f.f!=="cu60"&&f.f!=="cs60"; });
  var gsort=null; if(mode==="groups"){ var rk=qmRankX(t.replace(HX_LINKW," ").replace(/\b(?:cross|crossing|span\w*|sectors?|subsectors?|different|other)\b/g," ")); if(rk&&QM_SYM[rk.f]&&rk.f!=="_nb") gsort=rk; }
  var sp={kind:"xlink",mode:mode,gsort:gsort,level:lvl,src:src,secIn:own,secTarget:tgt,secOut:SM.out,filters:filters,n:qmNX(t)||(mode==="groups"||mode==="cohort"?12:15),thr:thr,focus:tk[0]||null};
  if(follow&&!tk.length&&(mode==="list"||mode==="misfit")) sp.onlyTk=QMV_LAST.syms.slice();
  return sp;
}


/* ---------- group pairs: which two sectors or subsectors are connected, or move / behave alike ---------- */
function hxParsePairs(q,t){
  var lvl=/\b(subsectors?|industr(?:y|ies))\b/.test(t)?"industry":(/\bsectors?\b/.test(t)?"sector":null); if(!lvl) return null;
  var plural=/\b(sectors|subsectors|industries|pairs?)\b/.test(t);
  var simW=/\b(similar(?:ly)?|alike|same way|same direction|in sync|in step|mov\w* together|trade together|behav\w*(?: \w+)? (?:similarly|alike|the same)|correlated with each other|most correlated)\b/.test(t);
  var pairW=/\b(pairs?|2 (?:sectors|subsectors|industries)|each other|one another|between (?:sectors|subsectors|industries)|with each other)\b/.test(t);
  var pctM=t.match(/\b(?:at least|more than|over|above|minimum of|min) (\d{1,3}(?:\.\d+)?) ?(?:%|percent)/)||t.match(/\b(\d{1,3}(?:\.\d+)?) ?(?:%|percent) (?:or more|and above|plus)\b/);
  var connAny=/\b(connected|connections?|connectivity|linked|links|tied|related|neighbou?rs?|neighbors?)\b/.test(t);
  if(!((simW&&plural)||(connAny&&plural&&(pairW||pctM)))) return null;
  var measure=simW&&!(connAny&&pctM)?"sim":"conn";
  var simKind=(/\b(behav\w*|profile|alike|similar(?:ly)?)\b/.test(t)&&!/\b(mov\w*|returns?|correlat\w*|in sync|in step|trade)\b/.test(t))?"behave":"move";
  var cross=lvl==="industry"&&/\b(?:different|other|another|separate) (?:parent )?sectors?\b|\bnot in the same (?:parent )?sector\b|\beven if\b|\boutside (?:their|its) (?:own )?(?:parent )?sector\b|\bacross sectors\b|\bcross[- ]sector\b|\bnot (?:part of|in) (?:their|its) (?:own )?parent\b/.test(t);
  var nM=t.match(/\b(\d{1,2}) pairs?\b/)||t.match(/\b(?:top|best|first) (\d{1,2})\b/), mnM=t.match(/\bat least (\d{1,2}) (?:names|stocks|members|tickers|companies)\b/), mcM=t.match(/\bcorrelation (?:of )?(?:at least|above|over|>=?) ?(-?0?\.\d+)\b/);
  var src="all"; if(/\bcorrelat\w*|\breturn peers?\b/.test(t)&&measure==="conn") src="corr"; if(/\b(profile|look[- ]?alikes?)\b/.test(t)&&measure==="conn") src="prof";
  var SM=qmSecMentions(t), pf=[];
  try{ var tc=hxDirWords(t.replace(HX_LINKW," ").replace(/\bcorrelat\w*\b/g," ").replace(/\b(?:at least|more than|over|above|minimum of|min) \d{1,3}(?:\.\d+)? ?(?:%|percent)|\b\d{1,3}(?:\.\d+)? ?(?:%|percent) (?:or more|and above|plus)\b/g," ").replace(/\b(?:similar(?:ly)?|alike|behav\w*|mov\w*|in sync|in step|trade together)\b/g," "));
    pf=qmConds(tc).filters.filter(function(f){ return f.f!=="cu60"&&f.f!=="cs60"; }); }catch(e){ pf=[]; }
  return {kind:"xlink",mode:"pairs",measure:measure,simKind:simKind,level:lvl,crossParent:cross,minShare:pctM?parseFloat(pctM[1]):0,minN:mnM?parseInt(mnM[1],10):(lvl==="industry"?3:1),
    minCorr:mcM?parseFloat(mcM[1]):null,n:nM?parseInt(nM[1],10):10,src:src,thr:0.6,secIn:SM.inn,secTarget:[],secOut:SM.out,filters:pf};
}
function hxGroupsOf(level,spec){
  var g={}; QM_CTX.rows.forEach(function(r){ if(spec.secOut&&spec.secOut.indexOf(r.sec)>=0) return; if(spec.filters&&spec.filters.length&&!spec.filters.every(function(f){ return qmTest(r,f); })) return; var k=level==="industry"?r.ind:r.sec; if(!k||k==="Unassigned") return; (g[k]=g[k]||{k:k,sec:r.sec,rows:[]}).rows.push(r); });
  Object.keys(g).forEach(function(k){ if(g[k].rows.length<spec.minN) delete g[k]; });
  return g;
}
function hxPairName(level,G){ return level==="industry"?G.k+" ("+qmSecName(G.sec)+")":qmSecName(G.k); }
function hxRunPairs(spec,ctx,res,t0){
  var lv=spec.level, G=hxGroupsOf(lv,spec), keys=Object.keys(G).sort(), unit=lv==="industry"?"subsector":"sector", pairs=[];
  function okPair(a,b){ if(spec.crossParent&&G[a].sec===G[b].sec) return false; if(spec.secIn.length&&spec.secIn.indexOf(G[a].sec)<0&&spec.secIn.indexOf(G[b].sec)<0) return false; return true; }
  if(spec.measure==="conn"){
    var X=hxLinks(lv,spec.thr), key=function(r){ return lv==="industry"?r.ind:r.sec; }, reach={}, links={}, best={};
    function keepType(ty){ if(spec.src==="corr") return /peer|correlation/.test(ty); if(spec.src==="prof") return /profile/.test(ty); return true; }
    keys.forEach(function(A){ G[A].rows.forEach(function(r){ var seen={}; Object.keys(X.L[r.sym]||{}).forEach(function(o){ var e=X.L[r.sym][o]; if(!e.types.some(keepType)) return; var B=key(X.by[o]); if(!G[B]) return;
      seen[B]=1; var pk=A<B?A+"|"+B:B+"|"+A; links[pk]=(links[pk]||0)+1; if(qmNum(e.v)&&(!best[pk]||e.v>best[pk].v)) best[pk]={v:e.v,a:r.sym,b:o}; if(!best[pk]) best[pk]={v:null,a:r.sym,b:o}; });
      Object.keys(seen).forEach(function(B){ (reach[A]=reach[A]||{})[B]=((reach[A]||{})[B]||0)+1; }); }); });
    for(var i=0;i<keys.length;i++) for(var j=i+1;j<keys.length;j++){ var A=keys[i], B=keys[j]; if(!okPair(A,B)) continue;
      var ab=(reach[A]||{})[B]||0, ba=(reach[B]||{})[A]||0; if(!ab&&!ba) continue; var nA=G[A].rows.length, nB=G[B].rows.length, sh=(ab+ba)/(nA+nB)*100;
      if(sh<spec.minShare) continue; pairs.push({A:A,B:B,ab:ab,ba:ba,nA:nA,nB:nB,sh:sh,l:links[A+"|"+B]/2,b:best[A+"|"+B]}); }
    pairs.sort(function(p,q){ return q.sh-p.sh||q.l-p.l||(p.A+p.B<q.A+q.B?-1:1); });
    var out=pairs.slice(0,spec.n);
    res.lead=pairs.length?("<b>"+pairs.length+"</b> "+unit+" pairs"+(spec.minShare?" have at least "+spec.minShare+"% of their names linked to the other":" are linked")+(spec.crossParent?" across parent sectors":"")+". The "+out.length+" most connected:"):
      ("No "+unit+" pair"+(spec.minShare?" has "+spec.minShare+"% or more of its names linked to the other":" is linked")+(spec.crossParent?" across parent sectors":"")+". Try a lower share.");
    if(spec.filters&&spec.filters.length) res.notes.push("Only names meeting "+spec.filters.map(qmFT).join(" and ")+" were counted, both as members of a "+unit+" and as the linked names; the other names were left out before the shares were worked out.");
    res.table={head:["Rank",unit==="sector"?"Sector A":"Subsector A",unit==="sector"?"Sector B":"Subsector B","Names linked","A names linked to B","B names linked to A","Links","Strongest link"],align:["r","l","l","r","r","r","r","l"],
      body:out.map(function(p,i){ var b=p.b; return [String(i+1),hxPairName(lv,G[p.A]),hxPairName(lv,G[p.B]),qmN(p.sh,0)+"%",p.ab+" of "+p.nA,p.ba+" of "+p.nB,String(Math.round(p.l)),b?(b.a+" – "+b.b+(qmNum(b.v)?" "+qmN(b.v,2):"")):"–"]; })};
    res.notes.push("Names linked: the share of the two groups’ names (together) that have at least one link into the other group. A link is any of: the closest return peer RealTest found (60 bars) either way, the same Hidden Group (link 0.60), "+(X.hasCorr?"the five most return-correlated names over 60 and 252 bars (price history), ":"")+"or a top-5 profile look-alike"+(spec.src==="corr"?"; here only return-correlation links were counted, as asked":(spec.src==="prof"?"; here only profile look-alikes were counted, as asked":""))+". "+(lv==="industry"?"Subsectors with fewer than "+spec.minN+" names are left out, because one name would decide the share. ":"")+"A link shows co-movement or a shared profile today, not a business relationship.");
    if(!X.hasCorr) res.notes.push("The price history is not loaded, so return correlation comes only from each stock’s single closest peer. Load part E for the full correlation links.");
    var it=[]; out.slice(0,3).forEach(function(p){ G[p.A].rows.concat(G[p.B].rows).forEach(function(r){ if(it.length<50&&!it.some(function(x){ return x.sym===r.sym; })) it.push({sym:r.sym,side:"long",w:null}); }); });
    res.send=it.length?{label:"most connected "+unit+" pairs",items:it}:null;
    res.cov=qmCovX(ctx,"<b>"+keys.length+"</b> "+unit+"s evaluated, "+(keys.length*(keys.length-1)/2)+" pairs."); res.rows=out.length; res.qualifying=pairs.length; res.ms=Date.now()-t0; return res;
  }
  /* similar: returns moving together (group equal-weight daily returns), or behaving alike (group mean profile) */
  var pool=null, vec={}, prof={};
  try{ pool=buildVectors(); pool.forEach(function(s){ vec[s.sym]=s._v; }); }catch(e){}
  keys.forEach(function(k){ var vs=G[k].rows.map(function(r){ return vec[r.sym]; }).filter(function(v){ return v; }); if(!vs.length) return; var m=vs[0].map(function(){ return 0; });
    vs.forEach(function(v){ v.forEach(function(x,i){ m[i]+=x/vs.length; }); }); prof[k]=m; });
  function series(k,w){ if(!HX) return null; var L=HX.dates.length-1, a=L-w; if(a<1) return null; var out=[];
    for(var i=a+1;i<=L;i++){ var s=0,n=0; G[k].rows.forEach(function(r){ var c=HX.syms[r.sym]; if(!c) return; var x=hxRet(c,i); if(x!==null){ s+=x; n++; } }); out.push(n?s/n:null); } return out; }
  function cor(x,y){ if(!x||!y) return null; var a=[],b=[]; for(var i=0;i<x.length;i++) if(x[i]!==null&&y[i]!==null){ a.push(x[i]); b.push(y[i]); } return hxCorr(a,b); }
  var S60={}, S252={}; if(HX) keys.forEach(function(k){ S60[k]=series(k,60); S252[k]=series(k,252); });
  var MX=null; try{ var XX=moX(); if(lv==="sector"&&XX&&XX.matrix&&XX.matrix.keys) MX=XX.matrix; }catch(e){}
  function mcor(a,b){ if(!MX) return null; var i=MX.keys.indexOf(a), j=MX.keys.indexOf(b); return (i>=0&&j>=0&&MX.v[i])?MX.v[i][j]:null; }
  var kind=spec.simKind; if(kind==="move"&&!HX&&!MX) kind="behave";
  for(var i2=0;i2<keys.length;i2++) for(var j2=i2+1;j2<keys.length;j2++){ var A2=keys[i2], B2=keys[j2]; if(!okPair(A2,B2)) continue;
    var c60=HX?cor(S60[A2],S60[B2]):mcor(A2,B2), c252=HX?cor(S252[A2],S252[B2]):null, d=null;
    if(prof[A2]&&prof[B2]){ d=0; prof[A2].forEach(function(x,ii){ d+=(x-prof[B2][ii])*(x-prof[B2][ii]); }); d=Math.sqrt(d); }
    if(kind==="move"&&!qmNum(c60)) continue; if(kind==="behave"&&!qmNum(d)) continue;
    if(spec.minCorr!==null&&!(qmNum(c60)&&c60>=spec.minCorr)) continue;
    pairs.push({A:A2,B:B2,c60:c60,c252:c252,d:d}); }
  pairs.sort(kind==="move"?function(p,q){ return q.c60-p.c60||(p.A+p.B<q.A+q.B?-1:1); }:function(p,q){ return p.d-q.d||(p.A+p.B<q.A+q.B?-1:1); });
  var out2=pairs.slice(0,spec.n);
  if(spec.filters&&spec.filters.length) res.notes.push("Only names meeting "+spec.filters.map(qmFT).join(" and ")+" were used to build each "+unit+".");
  res.lead="The "+out2.length+" "+unit+" pairs that "+(kind==="move"?"move most alike (their daily returns track each other most closely)":"behave most alike today (closest average profile)")+(spec.crossParent?", in different parent sectors":"")+":";
  res.table={head:["Rank",unit==="sector"?"Sector A":"Subsector A",unit==="sector"?"Sector B":"Subsector B","Return correlation, 60 bars","Return correlation, 252 bars","Profile distance","Names"],align:["r","l","l","r","r","r","r"],
    body:out2.map(function(p,i){ return [String(i+1),hxPairName(lv,G[p.A]),hxPairName(lv,G[p.B]),qmN(p.c60,3),qmN(p.c252,3),qmN(p.d,2),G[p.A].rows.length+" + "+G[p.B].rows.length]; })};
  res.notes.push((kind==="move"?(HX?"Return correlation: each group is an equal-weight basket of its names, rebalanced daily; the column is the correlation of the two baskets’ daily returns over the last 60 (and 252) bars, from the price history.":"Return correlation: the 11 by 11 sector matrix RealTest computes on sector average returns over 60 bars (the price history is not loaded; load part E for subsector pairs and the 252-bar column)."):
    "Behaving alike: each group’s average of the nine standardised profile features its names carry today (composite rank, severity, structure vote, cluster balance, relative momentum, acceleration, band position, anomaly, 60-day momentum); the smaller the distance, the more alike.")+
    (spec.simKind==="move"&&kind==="behave"?" You asked about moving together, but subsector return correlation needs the price history, which is not loaded, so the pairs are ranked by profile instead.":"")+
    (lv==="industry"?" Subsectors with fewer than "+spec.minN+" names are left out.":"")+" Similarity is co-movement, not a reason; it can change quickly.");
  var it2=[]; out2.slice(0,3).forEach(function(p){ G[p.A].rows.concat(G[p.B].rows).forEach(function(r){ if(it2.length<50&&!it2.some(function(x){ return x.sym===r.sym; })) it2.push({sym:r.sym,side:"long",w:null}); }); });
  res.send=it2.length?{label:unit+" pairs that "+(kind==="move"?"move":"behave")+" alike",items:it2}:null;
  res.cov=qmCovX(ctx,"<b>"+keys.length+"</b> "+unit+"s evaluated, "+pairs.length+" pairs qualified."); res.rows=out2.length; res.qualifying=pairs.length; res.ms=Date.now()-t0; return res;
}

/* ---------- validation ---------- */
function hxValidate(raw){
  var ctx=QM_CTX, err=[], sp={kind:raw.kind};
  if(raw.kind==="diag"){
    var s=Array.isArray(raw.syms)?raw.syms:[]; if(!s.length&&QMV_LAST) s=QMV_LAST.syms;
    sp.syms=s.map(function(x){ return String(x).toUpperCase(); }).filter(function(x,i,a){ return a.indexOf(x)===i; })
      .filter(function(x){ var ok=!!((ctx&&ctx.bySym[x])||(HX&&HX.syms[x])); if(!ok) err.push("ticker "+x); return ok; }).slice(0,60);
    sp.from=raw.from==="last"?"last":"named";
    if(!sp.syms.length) return {error:err.length?"None of those tickers are in the loaded scan or price history: "+err.join(", ")+".":"No tickers to diagnose. Name them, or ask for a list first."};
    return {spec:sp,warn:err};
  }
  sp.mode=["list","focus","groups","cohort","misfit","pairs"].indexOf(raw.mode)>=0?raw.mode:"list";
  sp.measure=raw.measure==="sim"?"sim":"conn"; sp.simKind=raw.simKind==="behave"?"behave":"move"; sp.crossParent=!!raw.crossParent;
  var ms=parseFloat(raw.minShare); sp.minShare=isFinite(ms)?Math.max(0,Math.min(100,ms)):0; var mn=parseInt(raw.minN,10); sp.minN=isFinite(mn)?Math.max(1,Math.min(50,mn)):(raw.level==="industry"?3:1);
  var mc=parseFloat(raw.minCorr); sp.minCorr=isFinite(mc)?Math.max(-1,Math.min(1,mc)):null;
  sp.level=raw.level==="industry"?"industry":"sector"; sp.src=["all","corr","prof"].indexOf(raw.src)>=0?raw.src:"all";
  function keys(a){ return (a||[]).map(function(v){ var k=qmSecKey(v); if(!k) err.push("sector "+v); return k; }).filter(function(k){ return k; }); }
  sp.secIn=keys(raw.secIn); sp.secTarget=keys(raw.secTarget); sp.secOut=keys(raw.secOut);
  sp.filters=qmFilters(raw.filters,"symbol",err);
  var n=parseInt(raw.n,10); sp.n=isFinite(n)?Math.max(1,Math.min(50,n)):15;
  var th=parseFloat(raw.thr); sp.thr=isFinite(th)?Math.max(0.3,Math.min(0.95,th)):0.6;
  sp.focus=raw.focus?String(raw.focus).toUpperCase():null;
  if(sp.focus&&!ctx.bySym[sp.focus]) return {error:"No stock called "+sp.focus+" in the loaded scan."};
  if(sp.mode==="focus"&&!sp.focus) return {error:"Name the ticker to connect, for example \u201Chow is NVDA connected to other sectors\u201D."};
  sp.gsort=(raw.gsort&&QM_SYM[raw.gsort.f]&&raw.gsort.f!=="_nb")?{f:raw.gsort.f,d:raw.gsort.d==="asc"?"asc":"desc"}:null;
  sp.onlyTk=(raw.onlyTk||[]).map(function(x){ return String(x).toUpperCase(); }).filter(function(x){ return ctx.bySym[x]; });
  if(err.length) return {error:"The query used something this scan does not have: "+err.join("; ")+"."};
  return {spec:sp};
}

/* ---------- running ---------- */
function hxCut(){ return HX?HX.dates[HX.dates.length-1]:null; }
function hxRunDiag(spec,ctx,res,t0){
  if(!HX){ res.lead="A diagnostic needs the daily price history, which is not loaded in this view."; res.notes.push(hxNoHistErr()._err);
    res.cov=qmCovX(ctx,""); res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; return res; }
  var M=hxMetrics(), L=M.L, bench=M.bench, have=spec.syms.filter(function(s){ return HX.syms[s]&&!M.by[s].stale; }), miss=spec.syms.filter(function(s){ return have.indexOf(s)<0; });
  var src=spec.from==="last"&&QMV_LAST?" from the previous answer ("+QMV_LAST.label+")":"";
  res.lead="Diagnostic of <b>"+have.length+"</b> "+(have.length===1?"name":"names")+src+", equal-weighted"+(bench?", against <b>"+bench+"</b>":"")+":";
  function f(v,d,p){ return qmN(v,d,p); }
  var rows=[];
  [["YTD",M.yb],["Trailing 12 months",M.a12]].forEach(function(P){
    if(P[1]<0){ rows.push([P[0],"\u2013","\u2013","\u2013","\u2013","\u2013","\u2013"]); return; }
    var G=hxGroupPath(have,P[1],L), B=bench?hxPath(HX.syms[bench],P[1],L):null, cr=null;
    if(G&&bench){ var xs=[],ys=[]; for(var i=P[1]+1;i<=L;i++){ var g=G.rs[i-P[1]-1], b=hxRet(HX.syms[bench],i); if(g!==null&&b!==null){ xs.push(g); ys.push(b); } } cr=hxCorr(xs,ys); }
    rows.push([P[0],f(G&&G.ret,2,1),B?f(B.ret,2,1):"\u2013",f(G&&G.vol,2)+"%",B?f(B.vol,2)+"%":"\u2013",f(G&&G.dd,2,1),f(cr,3)]);
  });
  res.table={head:["Period","Group return",(bench||"Benchmark")+" return","Group ann. vol.",(bench||"Benchmark")+" ann. vol.","Group max drawdown","Correlation"],align:["l","r","r","r","r","r","r"],body:rows};
  var by=hxRowsBy();
  res.extra=[{title:"Per symbol",table:{head:["Symbol","YTD return","YTD vol.","YTD drawdown","12M return","12M vol.","12M drawdown","Corr. to "+(bench||"benchmark"),"Beta","Sector"],align:["l","r","r","r","r","r","r","r","r","l"],
    body:have.map(function(s){ var m=M.by[s], r=by[s]; return [s,f(m.ytd,2,1),qmNum(m.voly)?f(m.voly,2)+"%":"\u2013",f(m.ddy,2,1),f(m.m12,2,1),qmNum(m.vol12)?f(m.vol12,2)+"%":"\u2013",f(m.dd12,2,1),f(m.crsp,3),f(m.beta,2),r?qmSecName(r.sec):"ETF / not in scan"]; })}}];
  res.notes.push("Group: every name weighted equally and rebalanced daily, so each day\u2019s group return is the plain mean of the members\u2019 daily returns. Returns are price only (no dividends). Annualised volatility is the standard deviation of daily returns times the square root of 252. Max drawdown is the deepest fall from a running peak inside the period. Correlation is between the group\u2019s and "+(bench||"the benchmark")+"\u2019s daily returns over the same days. YTD starts at the last close of the previous year ("+(M.yb>=0?HX.dates[M.yb]:"not in the history")+"); 12 months is the last 252 bars.");
  if(miss.length) res.notes.push("Not in the price history, or no bar in the last three sessions, so left out: "+miss.join(", ")+".");
  var sc=hxScanIso(); if(sc&&sc!==hxCut()) res.notes.push("The price history ends "+hxCut()+" but the loaded scan bar is "+sc+". Run part E after the same import as the scan to line them up.");
  res.send={label:"diagnostic list",items:have.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; })};
  res.cov="Price history: <b>"+HX.nSyms+" symbols</b> \u00D7 <b>"+HX.bars+" bars</b> to <b>"+hxCut()+"</b> (part E). Scan universe: "+ctx.rows.length+" symbols.";
  res.rows=have.length; res.qualifying=have.length; res.ms=Date.now()-t0; return res;
}
function hxPoolFor(spec,ctx){
  var pool=ctx.rows.slice(), steps=[];
  if(spec.onlyTk&&spec.onlyTk.length){ pool=pool.filter(function(r){ return spec.onlyTk.indexOf(r.sym)>=0; }); steps.push("among the "+spec.onlyTk.length+" names of the previous answer"); }
  if(spec.secIn.length){ pool=pool.filter(function(r){ return spec.secIn.indexOf(r.sec)>=0; }); steps.push("in "+spec.secIn.map(qmSecName).join(" or ")); }
  if(spec.secOut.length){ pool=pool.filter(function(r){ return spec.secOut.indexOf(r.sec)<0; }); steps.push("excluding "+spec.secOut.map(qmSecName).join(" and ")); }
  spec.filters.forEach(function(f){ pool=pool.filter(function(r){ return qmTest(r,f); }); steps.push(qmFT(f)); });
  return {pool:pool,steps:steps};
}
var HX_SRC_NOTE="Link types, strongest first: the closest return peer RealTest found over 60 bars (weight 3) and the reverse, a name that picked this one as its closest peer (2); membership of the same Hidden Group, names joined by closest-peer links at the link strength shown (2); with the price history loaded, the five most return-correlated names over 60 and over 252 bars (2 each); and profile look-alikes, the five names nearest on the nine-feature profile the Cohorts tab and AI Snapshot use (1). The cross-link score adds the weights of every distinct link to another ";
function hxRunLink(spec,ctx,res,t0){
  if(spec.mode==="pairs") return hxRunPairs(spec,ctx,res,t0);
  var lvlW=spec.level==="industry"?"subsector":"sector", by=hxRowsBy();
  if(spec.mode==="groups"){
    if(!(swOk()&&moX().stockKeys.indexOf("peer")>=0)){ res.lead="This scan has no closest-peer links, so Hidden Groups cannot be built. Load the v4 or v7 scan with Update."; res.cov=qmCovX(ctx,""); res.ms=Date.now()-t0; return res; }
    var R=relClusters("stocks",spec.thr), cl=R.clusters.filter(function(c){ return c.nSec>1; });
    if(spec.secIn.length) cl=cl.filter(function(c){ return spec.secIn.some(function(k){ return c.secs[k]; }); });
    if(spec.secTarget.length) cl=cl.filter(function(c){ return spec.secTarget.every(function(k){ return c.secs[k]; }); });
    var gfl=spec.filters||[], gpass=function(c){ return c.members.filter(function(m){ var r=by[m.sym]; return r&&gfl.every(function(f){ return qmTest(r,f); }); }); };
    if(gfl.length) cl=cl.filter(function(c){ return gpass(c).length>0; });
    var gs=spec.gsort, gval=function(c){ if(!gs) return null; var v=c.members.map(function(m){ var r=by[m.sym]; return r?r[gs.f]:null; }).filter(qmNum); return v.length?v.reduce(function(a,b){ return a+b; },0)/v.length:null; };
    if(spec.focus){ var g=hxGroupOf(R,spec.focus);
      if(!g){ res.lead="<b>"+spec.focus+"</b> is in no Hidden Group at a link strength of "+qmN(spec.thr,2)+": its closest-peer link is weaker than that, and no other name picked it."; }
      else { res.lead="<b>"+spec.focus+"</b> is in Hidden Group #"+g.id+": <b>"+g.members.length+"</b> names across <b>"+g.nSec+"</b> "+(g.nSec===1?"sector":"sectors")+", mean link "+qmN(g.avgV,2)+".";
        res.table={head:["Symbol","Sector","Subsector","Direction","Closest peer","Link"],align:["l","l","l","l","l","r"],
          body:g.members.map(function(m){ var r=by[m.sym]||{}; return [m.sym,qmSecName(m.sec),r.ind||"",m.dir||"",r.peer||"",qmN(r.peerV,2)]; })};
        res.send={label:"hidden group #"+g.id,items:g.members.filter(function(m){ return by[m.sym]; }).map(function(m){ return {sym:m.sym,side:"long",w:null}; })}; }
    } else {
      if(gs){ cl.forEach(function(c){ c._gv=gval(c); }); cl=cl.filter(function(c){ return qmNum(c._gv); }); cl.sort(function(a,b){ return (gs.d==="asc"?a._gv-b._gv:b._gv-a._gv)||(a.id-b.id); }); }
      else cl.sort(function(a,b){ return b.nSec-a.nSec||b.members.length-a.members.length||(b.avgV-a.avgV); });
      var out=cl.slice(0,spec.n);
      res.lead=cl.length?("<b>"+cl.length+"</b> Hidden Groups cross sector lines at a link strength of "+qmN(spec.thr,2)+(spec.secIn.length||spec.secTarget.length?" and touch "+spec.secIn.concat(spec.secTarget).map(qmSecName).join(" and "):"")+(gfl.length?", with at least one member meeting: "+hxE(gfl.map(qmFT).join(" and ")):"")+". The "+out.length+(gs?" with the "+(gs.d==="asc"?"lowest":"highest")+" mean "+QM_SYM[gs.f].lab.toLowerCase()+":":" spanning the most sectors:")):("No Hidden Group crosses sector lines at a link strength of "+qmN(spec.thr,2)+". Try a lower strength, for example \u201Chidden groups that cross sectors at 0.5\u201D.");
      var gh=["Group","Names","Sectors","Sector mix","Mean link","Improving / deteriorating"], ga=["r","r","r","l","r","l"];
      if(gs){ gh.push("Mean "+QM_SYM[gs.f].lab.toLowerCase()); ga.push("r"); } if(gfl.length){ gh.push("Members passing"); ga.push("r"); } gh.push("Members"); ga.push("l");
      res.table={head:gh,align:ga,
        body:out.map(function(c){ var mix=Object.keys(c.secs).sort(function(a,b){ return c.secs[b]-c.secs[a]||(a<b?-1:1); }).map(function(k){ return qmSecName(k)+" "+c.secs[k]; }).join(", ");
          var row=["#"+c.id,String(c.members.length),String(c.nSec),mix,qmN(c.avgV,2),c.imp+" / "+c.det]; if(gs) row.push(qmN(c._gv,QM_SYM[gs.f].d)); if(gfl.length) row.push(gpass(c).length+" of "+c.members.length);
          row.push(c.members.map(function(m){ return m.sym; }).join(" ")); return row; })};
      if(gfl.length) res.notes.push("Groups are kept when at least one member meets: "+gfl.map(qmFT).join(" and ")+"; the \u201CMembers passing\u201D column says how many.");
      if(gs) res.notes.push("Ranked by the plain mean of the members\u2019 "+QM_SYM[gs.f].lab.toLowerCase()+", "+(gs.d==="asc"?"lowest":"highest")+" first. "+(gs.f==="vol"?QM_VOLDEF:""));
      var items=[]; out.forEach(function(c){ c.members.forEach(function(m){ if(by[m.sym]&&items.length<50) items.push({sym:m.sym,side:"long",w:null}); }); });
      if(items.length) res.send={label:"cross-sector hidden groups",items:items};
    }
    res.notes.push("A Hidden Group is the same thing the Hidden Groups tab draws: names joined whenever one is the other\u2019s closest return-correlated peer (60 bars, from RealTest) at or above the link strength. Groups are numbered as on that tab at the same strength (the tab defaults to 0.60). It shows who moves with whom now, not why, and not that it will continue.");
    res.cov=qmCovX(ctx,"<b>"+R.clusters.length+"</b> groups of two or more names at this strength."); res.rows=(res.table?res.table.body.length:0); res.qualifying=cl.length; res.ms=Date.now()-t0; return res;
  }
  if(spec.mode==="cohort"){
    var pool=buildVectors(), km=kmeans(pool,COHK), cs=[];
    for(var c=0;c<km.k;c++){ var mem=pool.filter(function(s,i){ return km.assign[i]===c; }); if(!mem.length) continue; var secs={}; mem.forEach(function(s){ secs[s.sec]=(secs[s.sec]||0)+1; });
      var ord=Object.keys(secs).sort(function(a,b){ return secs[b]-secs[a]||(a<b?-1:1); }); cs.push({c:c,mem:mem,secs:secs,ord:ord,label:cohortLabel(km.cent[c]),dom:ord[0]/*most common sector*/,domSh:secs[ord[0]]/mem.length,cent:km.cent[c]}); }
    if(spec.focus){ var me=null, mc=null; cs.forEach(function(g){ g.mem.forEach(function(s){ if(s.sym===spec.focus){ me=s; mc=g; } }); });
      if(!mc){ res.lead="<b>"+spec.focus+"</b> is not in the cohort pool."; }
      else { var mates=mc.mem.filter(function(s){ return s.sym!==spec.focus&&s.sec!==me.sec; }).map(function(s){ return {s:s,d:dist2(me._v,s._v)}; }).sort(function(a,b){ return a.d-b.d||(a.s.sym<b.s.sym?-1:1); }).slice(0,spec.n);
        res.lead="<b>"+spec.focus+"</b> ("+qmSecName(me.sec)+") is in the cohort \u201C"+hxE(mc.label)+"\u201D with "+(mc.mem.length-1)+" others. Its closest cohort-mates from other sectors:";
        res.table={head:["Rank","Symbol","Sector","Subsector","Profile distance"],align:["r","l","l","l","r"],body:mates.map(function(x,i){ var r=by[x.s.sym]||{}; return [String(i+1),x.s.sym,qmSecName(x.s.sec),r.ind||"",qmN(Math.sqrt(x.d),2)]; })};
        res.send=mates.length?{label:"cross-sector cohort-mates of "+spec.focus,items:mates.filter(function(x){ return by[x.s.sym]; }).map(function(x){ return {sym:x.s.sym,side:"long",w:null}; })}:null; }
    } else {
      cs.sort(function(a,b){ return Object.keys(b.secs).length-Object.keys(a.secs).length||a.domSh-b.domSh; });
      res.lead="The <b>"+cs.length+"</b> behavioural cohorts (as on the Cohorts tab, "+COHK+" cohorts), most sector-mixed first:";
      res.table={head:["Cohort","Profile","Names","Sectors","Largest sector share","Sector mix"],align:["r","l","r","r","r","l"],
        body:cs.map(function(g,i){ return [String(i+1),g.label,String(g.mem.length),String(g.ord.length),qmSecName(g.dom)+" "+qmN(g.domSh*100,0)+"%",g.ord.slice(0,5).map(function(k){ return qmSecName(k)+" "+g.secs[k]; }).join(", ")+(g.ord.length>5?" +"+(g.ord.length-5)+" more":"")]; })};
    }
    res.notes.push("Cohorts group stocks by today\u2019s behaviour on nine scan features (composite rank, severity, structure vote, cluster balance, relative momentum, acceleration, band position, anomaly, 60-day momentum), each standardised across the universe, with a fixed-seed k-means (the Cohorts tab\u2019s setting decides how many). Sector plays no part, so a mixed cohort is a behaviour shared across sector lines. One bar, no forecast.");
    res.cov=qmCovX(ctx,""); res.rows=res.table?res.table.body.length:0; res.qualifying=res.rows; res.ms=Date.now()-t0; return res;
  }
  if(spec.mode==="misfit"){
    var P0=hxPoolFor(spec,ctx), inP={}; P0.pool.forEach(function(r){ inP[r.sym]=1; });
    var mf=neighbourMisfits(buildVectors()).filter(function(x){ return inP[x.s.sym]&&(!spec.secTarget.length||spec.secTarget.indexOf(x.like)>=0); });
    var out2=mf.slice(0,spec.n);
    res.lead=mf.length?("<b>"+mf.length+"</b> stocks behave more like another sector than their own"+(P0.steps.length?" ("+hxE(P0.steps.join("; "))+")":"")+". The first "+out2.length+":"):"No stock behaves more like another sector than its own"+(P0.steps.length?" among those "+hxE(P0.steps.join("; ")):"")+".";
    res.table={head:["Rank","Symbol","Own sector","Behaves like","Of its 5 look-alikes","Look-alikes"],align:["r","l","l","l","r","l"],
      body:out2.map(function(x,i){ return [String(i+1),x.s.sym,qmSecName(x.s.sec),qmSecName(x.like),String(x.n),x.peers.join(" ")]; })};
    res.send=out2.length?{label:"sector misfits",items:out2.map(function(x){ return {sym:x.s.sym,side:"long",w:null}; })}:null;
    res.notes.push("A misfit (the same rule as the Cohorts tab): of a stock\u2019s five nearest names on the nine-feature profile, at least three sit in one other sector and at most one in its own. It says the stock is trading like that sector today, not that it belongs there.");
    res.cov=qmCovX(ctx,""); res.rows=out2.length; res.qualifying=mf.length; res.ms=Date.now()-t0; return res;
  }
  var X=hxLinks(spec.level,spec.thr);
  function keepType(ty){ if(spec.src==="corr") return /peer|correlation/.test(ty); if(spec.src==="prof") return /profile/.test(ty); return true; }
  function linksOf(sym){ return Object.keys(X.L[sym]||{}).map(function(k){ var e=X.L[sym][k], ty=e.types.filter(keepType); if(!ty.length) return null;
      var w=0; ty.forEach(function(t){ w+=/closest return peer/.test(t)?3:(/profile/.test(t)?1:2); }); return {s:e.s,types:ty,v:e.v,w:w}; })
    .filter(function(e){ return e&&(!spec.secTarget.length||spec.secTarget.indexOf(X.by[e.s].sec)>=0); })
    .sort(function(a,b){ return b.w-a.w||((b.v===null?-9:b.v)-(a.v===null?-9:a.v))||(a.s<b.s?-1:1); }); }
  if(spec.mode==="focus"){
    var me2=X.by[spec.focus], ls=linksOf(spec.focus), out3=ls.slice(0,spec.n), g2=hxGroupOf(X.groups,spec.focus);
    res.lead="<b>"+spec.focus+"</b> is in "+hxE(me2.ind)+" ("+qmSecName(me2.sec)+"). "+(ls.length?"It has <b>"+ls.length+"</b> "+(ls.length===1?"link":"links")+" to other "+lvlW+"s"+(spec.secTarget.length?" in "+spec.secTarget.map(qmSecName).join(" or "):"")+"; strongest first:":"It has no link to another "+lvlW+(spec.secTarget.length?" in "+spec.secTarget.map(qmSecName).join(" or "):"")+" in this scan.");
    res.table={head:["Rank","Symbol","Sector","Subsector","How they are linked","Correlation","Link weight"],align:["r","l","l","l","l","r","r"],
      body:out3.map(function(e,i){ var r=X.by[e.s]; return [String(i+1),e.s,qmSecName(r.sec),r.ind,e.types.join("; "),qmN(e.v,2),String(e.w)]; })};
    if(g2) res.bullets.push(["Hidden group","#"+g2.id+", "+g2.members.length+" names across "+g2.nSec+(g2.nSec===1?" sector":" sectors")]);
    res.bullets.push(["Correlation to the universe (60 bars)",qmN(me2.cu60,3)],["Correlation to its own sector (60 bars)",qmN(me2.cs60,3)]);
    res.send=out3.length?{label:"cross-"+lvlW+" links of "+spec.focus,items:out3.map(function(e){ return {sym:e.s,side:"long",w:null}; })}:null;
  } else {
    var P=hxPoolFor(spec,ctx), rows=P.pool.map(function(r){ var ls2=linksOf(r.sym), sc=0, secs={}; ls2.forEach(function(e){ sc+=e.w; secs[spec.level==="industry"?X.by[e.s].ind:X.by[e.s].sec]=1; });
        return {r:r,ls:ls2,sc:sc,nT:Object.keys(secs).length}; }).filter(function(x){ return x.ls.length>0; });
    rows.sort(function(a,b){ return b.sc-a.sc||b.nT-a.nT||(a.r.sym<b.r.sym?-1:1); });
    var out4=rows.slice(0,spec.n);
    var tgtTxt=spec.secTarget.length?" in "+spec.secTarget.map(qmSecName).join(" or "):" in other "+lvlW+"s";
    res.lead=rows.length?("<b>"+rows.length+"</b> of "+P.pool.length+" stocks"+(P.steps.length?" ("+hxE(P.steps.join("; "))+")":"")+" have neighbours"+tgtTxt+". The "+out4.length+" most connected across "+lvlW+" lines:"):("No stock"+(P.steps.length?" that is "+hxE(P.steps.join("; ")):"")+tgtTxt+" was found.");
    res.table={head:["Rank","Symbol","Sector","Subsector","Cross-link score","Other "+lvlW+"s reached","Strongest cross link","Hidden group"],align:["r","l","l","l","r","r","l","l"],
      body:out4.map(function(x,i){ var e=x.ls[0], er=X.by[e.s], g3=hxGroupOf(X.groups,x.r.sym);
        return [String(i+1),x.r.sym,qmSecName(x.r.sec),x.r.ind,String(x.sc),String(x.nT),e.s+" ("+(spec.level==="industry"?er.ind:qmSecName(er.sec))+"): "+e.types[0]+(qmNum(e.v)?" "+qmN(e.v,2):""),g3?"#"+g3.id+" ("+g3.nSec+" sectors)":"\u2013"]; })};
    var peerX=P.pool.filter(function(r){ return r.peer&&X.by[r.peer]&&(spec.level==="industry"?X.by[r.peer].ind!==r.ind:X.by[r.peer].sec!==r.sec); }).length;
    res.bullets.push(["Closest return peer is in another "+lvlW,peerX+" of "+P.pool.length+" stocks"]);
    if(X.groups){ var gx=X.groups.clusters.filter(function(c){ return c.nSec>1; }).length; res.bullets.push(["Hidden groups crossing sector lines (link "+qmN(spec.thr,2)+")",String(gx)]); }
    res.send=out4.length?{label:"stocks with cross-"+lvlW+" links",items:out4.map(function(x){ return {sym:x.r.sym,side:"long",w:null}; })}:null;
  }
  res.notes.push(HX_SRC_NOTE+lvlW+(spec.src==="corr"?" (here only the return-correlation links were counted, as asked)":(spec.src==="prof"?" (here only the profile look-alikes were counted, as asked)":""))+". "+(X.hasCorr?"The price history is loaded, so full return correlations were used.":"The price history is not loaded, so return correlation comes only from each stock\u2019s single closest peer; load part E to add the five most correlated names over 60 and 252 bars.")+" A link shows co-movement, not a business relationship, and not that it will last.");
  res.cov=qmCovX(ctx,""); res.rows=res.table?res.table.body.length:0; res.qualifying=res.rows; res.ms=Date.now()-t0; return res;
}

/* ---------- tickers inside member and link columns open the tear sheet, like the Symbol column ---------- */
var _qmCell=qmCell;
qmCell=function(head,c){
  var s=String(c);
  try{
    if(head==="Members"||head==="Look-alikes") return s.split(" ").map(function(w){ return qmIsTk(w)?qmTk(w):hxE(w); }).join(" ");
    if(head==="Strongest link"||head==="Strongest cross link"||head==="Closest peer"){
      var m=s.match(/^([A-Z][A-Z0-9.\-]*)(\s\u2013\s([A-Z][A-Z0-9.\-]*))?([\s\S]*)$/);
      if(m&&qmIsTk(m[1])&&(!m[3]||qmIsTk(m[3]))) return qmTk(m[1])+(m[3]?" \u2013 "+qmTk(m[3]):"")+hxE(m[4]);
    }
  }catch(e){}
  return _qmCell(head,c);
};

/* ---------- wrapping the engine ---------- */
var _qmParseX=qmParseX;
qmParseX=function(q){ var r=null; try{ r=hxParse(q); }catch(e){ r=null; } return (r!==null&&r!==undefined)?r:_qmParseX(q); };
var _qmValidateAny=qmValidateAny;
qmValidateAny=function(raw){ if(raw&&(raw.kind==="diag"||raw.kind==="xlink")){ try{ return hxValidate(raw); }catch(e){ return {error:"The query could not be checked: "+e.message}; } } return _qmValidateAny(raw); };
var _qmRunX=qmRunX;
qmRunX=function(spec,ctx,res,t0){ if(spec&&spec.kind==="diag") return hxRunDiag(spec,ctx,res,t0); if(spec&&spec.kind==="xlink") return hxRunLink(spec,ctx,res,t0); return _qmRunX(spec,ctx,res,t0); };
var _qmRun=qmRun;
qmRun=function(spec,ctx){
  var res=_qmRun(spec,ctx);
  try{ var syms=[], lab="";
    if(res&&res.send&&res.send.items&&res.send.items.length){ syms=res.send.items.map(function(x){ return x.sym; }); lab=res.send.label||""; }
    else if(res&&res.table&&res.table.head){ var ix=res.table.head.indexOf("Symbol"); if(ix>=0) res.table.body.forEach(function(r){ var s=String(r[ix]); if(ctx.bySym[s]&&syms.indexOf(s)<0) syms.push(s); }); lab=String(res.lead||"").replace(/<[^>]+>/g,"").replace(/[:.]\s*$/,""); }
    if(lab.length>70) lab=lab.slice(0,lab.lastIndexOf(" ",68)>30?lab.lastIndexOf(" ",68):68)+"\u2026";
    if(syms.length&&!(spec&&spec.kind==="diag")) QMV_LAST={syms:syms.slice(0,60),label:lab||"previous list"};
  }catch(e){}
  return res;
};

/* ---------- 5. the Claude fallback learns every field ---------- */
(function(){
  var num=Object.keys(QM_SYM).filter(function(k){ return k.charAt(0)!=="_"; }).map(function(k){ return k+" ("+QM_SYM[k].lab+(HX_FIELDS[k]?", needs the price history":"")+")"; }).join(", ");
  var line="Symbol FIELDS, numeric: "+num+". Text fields: trend (\"up\"|\"down\"), dir (\"improving\"|\"deteriorating\"|\"stable/mixed\"), sec (Comms ConsumerDisc ConsStaples Energy Financials Healthcare Industrials ITSector Materials Utilities RealEstate), ind (exact industry name), state, act, side, ctx (\"Sector-confirmed\"|\"Isolated\"). Percent fields are in percent (10 means 10%); drawdowns are negative (-15 means a 15% fall).\n";
  var a=QM_PROMPT.indexOf("Symbol FIELDS:"), b=a>=0?QM_PROMPT.indexOf("\n",a):-1;
  var np=(a>=0&&b>a)?QM_PROMPT.slice(0,a)+line+QM_PROMPT.slice(b+1):QM_PROMPT;
  var more="Diagnostic of a list (group and per-symbol returns, volatility, drawdown, correlation to RSP over YTD and 12 months): {\"kind\":\"diag\",\"syms\":[\"TICKER\",...]} ([] means the tickers of the previous answer).\n"+
    "Cross-sector connections: {\"kind\":\"xlink\",\"mode\":\"list\"|\"focus\"|\"groups\"|\"cohort\"|\"misfit\"|\"pairs\" (pairs of sectors or subsectors; add \"measure\":\"conn\"|\"sim\", \"simKind\":\"move\"|\"behave\", \"crossParent\":true|false, \"minShare\":percent of names linked, \"minN\":smallest group size, \"minCorr\":number),\"focus\":\"TICKER\"|null,\"level\":\"sector\"|\"industry\",\"src\":\"all\"|\"corr\"|\"prof\",\"secIn\":[the stocks' own sector keys],\"secTarget\":[sector keys the links must reach],\"filters\":[...],\"n\":1-50,\"thr\":0.3-0.95 (hidden-group link strength)}\n"+
    "Q: which 2 subsectors in different sectors move most alike -> {\"kind\":\"xlink\",\"mode\":\"pairs\",\"measure\":\"sim\",\"simKind\":\"move\",\"level\":\"industry\",\"crossParent\":true,\"n\":10}\n"+
    "Q: which industrials are connected to financials -> {\"kind\":\"xlink\",\"mode\":\"list\",\"level\":\"sector\",\"secIn\":[\"Industrials\"],\"secTarget\":[\"Financials\"],\"filters\":[]}\n"+
    "Q: 10 stocks with ytd return above 10% and 12 month drawdown under 15% -> {\"kind\":\"screen\",\"n\":10,\"filters\":[{\"f\":\"ytd\",\"op\":\">\",\"v\":10},{\"f\":\"dd12\",\"op\":\">=\",\"v\":-15}],\"sort\":{\"f\":\"ytd\",\"d\":\"desc\"}}\n";
  var c=np.indexOf("If the question cannot be answered");
  if(c>=0) np=np.slice(0,c)+more+np.slice(c);
  QM_PROMPT=np;
})();

/* ---------- UI: the price history box and new examples on the Ask tab ---------- */
var HX_EX=["Which stocks have neighbours in other sectors?","Show hidden groups that cross sectors.","Which Industrials stocks are connected to Financials?","How is NVDA connected to other sectors?",
  "Which stocks behave like another sector?","Which cohorts mix the most sectors?","Which subsector pairs have at least 30% of their names connected?","Which subsectors in different sectors move alike?","Which sectors behave most alike?","Which are the 10 least volatile symbols in rising subsectors?","Give me a diagnostic of these.",
  "Show 10 stocks in an uptrend with a YTD return above 10% and 12 month drawdown under 15%.","What is the YTD return of NDSN?","Which 10 stocks have the highest 12 month return?"];
function hxStatus(msg){
  var el=document.getElementById("hxStatus"); if(!el) return;
  if(msg){ el.textContent=msg; return; }
  if(!HX){ el.innerHTML="Not loaded. Questions about year-to-date, 1 to 12 month returns, drawdown, beta or correlation to RSP, and the <em>diagnostic</em> of a list, need it."; return; }
  var sc=hxScanIso(), cut=hxCut();
  el.innerHTML="Loaded: <b>"+hxE(HX.nSyms)+"</b> symbols \u00D7 <b>"+hxE(HX.bars)+"</b> bars, "+hxE(HX.dates[0])+" to <b>"+hxE(cut)+"</b>"+(HX.savedAt?", saved "+hxE(String(HX.savedAt).slice(0,16).replace("T"," ")):"")+". Benchmark: <b>"+hxE(hxBench()||"none (RSP and SPY missing)")+"</b>."+
    (sc&&sc!==cut?" <span style=\"color:var(--neg)\">The scan bar is "+hxE(sc)+", so the two do not line up; run part E after the same import as the scan.</span>":"");
}
function hxLoadFile(file){
  var note=document.getElementById("hxNote");
  if(!file) return;
  if(file.size>40*1024*1024){ if(note) note.textContent="That file is over 40 MB; part E writes about 8 MB."; return; }
  if(note) note.textContent="Reading "+file.name+"\u2026";
  var fr=new FileReader();
  fr.onerror=function(){ if(note) note.textContent="Could not read the file."; };
  fr.onload=function(){
    var P; try{ P=hxParseCsv(String(fr.result||"")); }catch(e){ P={gates:["could not parse: "+e.message]}; }
    if(P.gates.length){ if(note) note.innerHTML="<span style=\"color:var(--neg)\">Not loaded. "+hxE(P.gates.join("; "))+"</span>"; return; }
    var rec={savedAt:new Date().toISOString(),source:String(file.name||"history.csv").slice(0,120),hx:P.hx};
    hxSet(rec);
    if(note) note.textContent="Loaded "+P.hx.rows+" rows"+(P.hx.badRows?" ("+P.hx.badRows+" unreadable rows skipped)":"")+". Saving\u2026";
    hxIdbPut(rec).then(function(ok){ return hxMirror(rec).then(function(sh){ if(note) note.textContent="Loaded "+P.hx.rows+" rows. "+(ok?"Kept on this device":"Not kept on this device (browser storage refused)")+"; "+sh+"."; }); });
  };
  fr.readAsText(file);
}
function hxUiInit(){
  var anchor=document.getElementById("qmEx20"); if(!anchor||document.getElementById("hxBox")) return;
  var box=document.createElement("div"); box.className="callout"; box.id="hxBox"; box.style.marginTop="12px";
  box.innerHTML='<h3>Price history for long-horizon questions (optional, RealTest part E)</h3>'+
    '<p id="hxStatus">Checking\u2026</p>'+
    '<div class="controls"><button class="btn ghost" id="hxPick" type="button">Load price history (part E CSV)</button><input type="file" id="hxFile" accept=".csv,text/csv" style="display:none">'+
    '<button class="btn ghost" id="hxForget" type="button">Forget it on this device</button><span class="count" id="hxNote"></span></div>'+
    '<p>Part E is a small separate RealTest script (see <b>Run workflow</b>) that writes one row per symbol per bar for the last 280 bars. It is never merged with the scan and never changes any other tab. Loaded here it adds: YTD, 1, 3, 6 and 12 month returns, annualised volatility, max drawdown, correlation and beta to RSP, distance from the 52-week high, and full return correlations for the cross-sector questions. It is kept in this browser (IndexedDB) and, where you can edit, in the artifact store for your other devices.</p>'+
    '<p style="margin-top:4px"><b>New questions</b>: cross-sector links, hidden groups, cohorts, misfits, a diagnostic of the last list, long-horizon screens. Click one:</p><div class="chips" id="hxEx"></div>';
  anchor.parentNode.insertBefore(box,anchor);
  var ex=document.getElementById("hxEx");
  ex.innerHTML=HX_EX.map(function(q,i){ return '<button type="button" class="chip" data-hxex="'+i+'">'+hxE(q)+'</button>'; }).join("");
  ex.addEventListener("click",function(e){ var b=e.target.closest?e.target.closest("[data-hxex]"):null; if(!b) return; var q=HX_EX[+b.getAttribute("data-hxex")]; var inp=document.getElementById("qmInput"); if(inp) inp.value=q; qmSubmit(q); });
  var fi=document.getElementById("hxFile");
  document.getElementById("hxPick").addEventListener("click",function(){ fi.value=""; fi.click(); });
  fi.addEventListener("change",function(){ hxLoadFile(fi.files&&fi.files[0]); });
  document.getElementById("hxForget").addEventListener("click",function(){ hxIdbPut(null).then(function(){ hxSet(null); var n=document.getElementById("hxNote"); if(n) n.textContent="Removed from this device. The shared copy, if any, loads again on the next visit."; }); });
  hxStatus();
}
/* ---------- the Run workflow tab: part E as an optional extra step ---------- */
var HX_RTS_NAME="AlexAligned_Unified_v7_E_History_26.09.2026.rts", HX_PS1_NAME="run_v7_history.ps1";
var HX_RTS=__HX_RTS__;
var HX_PS1=__HX_PS1__;
function hxWfInit(){
  var pane=document.getElementById("pane-wf"); if(!pane||document.getElementById("hxWf")) return;
  var blocks=pane.querySelectorAll(":scope > .block"), before=null;
  for(var i=0;i<blocks.length;i++){ var h=blocks[i].querySelector("h2"); if(h&&/If something goes wrong/.test(h.textContent)){ before=blocks[i]; break; } }
  var cmd=wfRunCmd(HX_RTS_NAME,["-apply","-scan"]);
  var d=document.createElement("div"); d.className="block"; d.id="hxWf";
  d.innerHTML='<div class="block-head"><h2>Part E: price history for Ask the terminal (optional)</h2><span class="count">separate, never merged</span></div>'+
    '<p class="lede">An extra RealTest part that only feeds the <b>Ask the terminal</b> tab\u2019s long-horizon questions (year-to-date, 12 months, drawdown, correlation to RSP, the diagnostic of a list). It reads the same shared data file as parts B and A, with <b>-apply -scan</b> and no import, and writes its <b>own</b> file, <span class="num">AlexAligned_Unified_v7E_history.csv</span>. Parts C, B and A, the merge, the ingest check and the Update button are unchanged and do not need it. Run it after the main launcher has finished, never at the same time as another RealTest job.</p>'+
    '<div class="controls"><button class="btn ghost" id="hxDlRts" type="button">Download the part E script (.rts)</button><button class="btn ghost" id="hxDlPs1" type="button">Download the part E launcher (.ps1)</button><button class="btn ghost" id="hxCpCmd" type="button">Copy the part E command</button><button class="btn ghost" id="hxCpRts" type="button">Copy the part E script text</button></div>'+
    '<div class="note-grid"><div class="note-card"><h3>1 \u00B7 Once</h3><p>Save both downloads into <span class="num">C:\\RealTest21_newerv2\\Scripts</span>. Inside the Claude viewer only certain file types can be saved, so they arrive as <span class="num">.rts.txt</span> and <span class="num">.ps1.txt</span>: delete the <span class="num">.txt</span> ending when you save or rename them. Both files are also in the GitHub repository under <span class="num">realtest/</span>.</p></div>'+
    '<div class="note-card"><h3>2 \u00B7 After each daily run</h3><p>Run <span class="num">powershell -ExecutionPolicy Bypass -File C:\\RealTest21_newerv2\\Scripts\\run_v7_history.ps1 -Ask</span>, or paste the copied command. About a minute. Good result: <b>PART E PASSED</b>, about 575 \u00D7 280 rows.</p></div>'+
    '<div class="note-card"><h3>3 \u00B7 Load it</h3><p>Ask the terminal tab \u2192 <b>Load price history</b> \u2192 pick <span class="num">AlexAligned_Unified_v7E_history.csv</span>. Other tabs do not read it.</p></div></div>'+
    '<details><summary class="mini" style="cursor:pointer">Show the part E script text</summary><pre id="hxRtsPre" style="max-height:300px;overflow:auto;font-family:var(--mono);font-size:11px;background:var(--sunken);border:1px solid var(--line);border-radius:8px;padding:10px 12px;white-space:pre-wrap"></pre></details>';
  if(before) pane.insertBefore(d,before); else pane.appendChild(d);
  document.getElementById("hxRtsPre").textContent=HX_RTS;
  var b1=document.getElementById("hxDlRts"), b2=document.getElementById("hxDlPs1"), b3=document.getElementById("hxCpCmd");
  b1.addEventListener("click",function(){ wfDownload(HX_RTS_NAME,HX_RTS,b1); });
  b2.addEventListener("click",function(){ wfDownload(HX_PS1_NAME,HX_PS1,b2); });
  b3.addEventListener("click",function(){ wfCopy(cmd,b3); });
  var b4=document.getElementById("hxCpRts"); if(b4) b4.addEventListener("click",function(){ wfCopy(HX_RTS,b4); });
}
try{ hxUiInit(); }catch(e){}
try{ hxWfInit(); }catch(e){}
try{ hxBoot(); }catch(e){}
}catch(e){ try{ console.warn("v81 Ask layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
