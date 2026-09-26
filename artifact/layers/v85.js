/* ================= v85: Ask the terminal, pairs-trade test from the part E price history =================
   One new question kind, "pairx". Works for any two symbols in the loaded history, for three or more named symbols (every pair among
   them), for the previous answer's list ("pair test these") or for a sector or subsector ("best pairs trades in Semiconductors").
   Engle-Granger cointegration on log prices in both directions with a bootstrap p-value, beta stability across the two halves of
   the window, spread mean and volatility shift, mean crossings, half-life and the current spread z-score, each with a stated gate.
   Only questions that ask for a pair test reach this code; every other question is parsed exactly as before. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
var W=252, BOOT1=499, BOOT_LIST=199, SHORTLIST=25, MAXPOOL=90;
var GATE={p:0.05,beta:25,shift:1,volLo:0.5,volHi:2,cross:12,hlLo:1,hlHi:60};
var PX_RE=/\b(?:pairs?[- ]?trad(?:e|es|ing)|pair[- ]?(?:test|tests|check|diagnostic|analysis)|spread (?:test|check|diagnostic|characteristics?|analysis)|cointegrat\w*|mean[- ]revert\w* pairs?|eligible (?:for |as )?(?:a )?pairs?)\b/;

/* ---------- statistics (plain arrays, no library) ---------- */
function mean(a){ var s=0; for(var i=0;i<a.length;i++) s+=a[i]; return s/a.length; }
function sd(a){ var m=mean(a), s=0; for(var i=0;i<a.length;i++) s+=(a[i]-m)*(a[i]-m); return Math.sqrt(s/(a.length-1)); }
function ols(x,y){ var mx=mean(x), my=mean(y), sxy=0, sxx=0, i; for(i=0;i<x.length;i++){ sxy+=(x[i]-mx)*(y[i]-my); sxx+=(x[i]-mx)*(x[i]-mx); }
  var b=sxx>0?sxy/sxx:0, a=my-b*mx, r=new Array(x.length); for(i=0;i<x.length;i++) r[i]=y[i]-a-b*x[i]; return {a:a,b:b,res:r}; }
/* ADF with one lagged difference, no constant (residuals already have mean zero): t-statistic of gamma */
function adfT(e){
  var S11=0,S12=0,S22=0,S1y=0,S2y=0,m=0,t;
  for(t=2;t<e.length;t++){ var x1=e[t-1], x2=e[t-1]-e[t-2], y=e[t]-e[t-1]; S11+=x1*x1; S12+=x1*x2; S22+=x2*x2; S1y+=x1*y; S2y+=x2*y; m++; }
  var det=S11*S22-S12*S12; if(!(det>0)||m<10) return null;
  var g=(S1y*S22-S2y*S12)/det, f=(S2y*S11-S1y*S12)/det, rss=0;
  for(t=2;t<e.length;t++){ var r=(e[t]-e[t-1])-g*e[t-1]-f*(e[t-1]-e[t-2]); rss+=r*r; }
  var s2=rss/(m-2), v=s2*S22/det; return v>0?g/Math.sqrt(v):null;
}
function egT(y,x){ return adfT(ols(x,y).res); }
function rng(seed){ var s=seed>>>0; return function(){ s=(s+0x6D2B79F5)>>>0; var t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function hash(str){ var h=2166136261>>>0; for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h; }
/* bootstrap p-value under "no cointegration": two independent random walks built from each name's own resampled daily log changes */
function bootP(tObs,y,x,B,seed){
  if(tObs===null) return null;
  var dy=[],dx=[],i,k; for(i=1;i<y.length;i++){ dy.push(y[i]-y[i-1]); dx.push(x[i]-x[i-1]); }
  var R=rng(seed), n=y.length, sy=new Array(n), sx=new Array(n), hit=0, done=0;
  for(k=0;k<B;k++){ sy[0]=0; sx[0]=0; for(i=1;i<n;i++){ sy[i]=sy[i-1]+dy[(R()*dy.length)|0]; sx[i]=sx[i-1]+dx[(R()*dx.length)|0]; }
    var t=egT(sy,sx); if(t===null) continue; done++; if(t<=tObs) hit++; }
  return done?(hit+1)/(done+1):null;
}
function halfLife(e){ var x=[],d=[]; for(var t=1;t<e.length;t++){ x.push(e[t-1]); d.push(e[t]-e[t-1]); } var b=ols(x,d).b; return b<0?-Math.log(2)/b:null; }
function crossings(e){ var c=0; for(var t=1;t<e.length;t++) if((e[t]>0)!==(e[t-1]>0)) c++; return c; }

/* ---------- aligned data ---------- */
/* the last W+1 bars on which both names have a close; null if fewer than 200 */
function joint(a,b,w){
  var h=H(), ca=h.syms[a], cb=h.syms[b], L=h.dates.length-1, ia=[], i;
  for(i=L;i>=0&&ia.length<w+1;i--) if(ca[i]!==null&&cb[i]!==null&&ca[i]>0&&cb[i]>0) ia.push(i);
  if(ia.length<200||ia[0]<L-3) return null; ia.reverse();
  return {idx:ia,la:ia.map(function(j){ return Math.log(ca[j]); }),lb:ia.map(function(j){ return Math.log(cb[j]); })};
}
function retCorr(a,b,from){
  var h=H(), ca=h.syms[a], cb=h.syms[b], L=h.dates.length-1, xs=[], ys=[];
  for(var i=Math.max(1,from);i<=L;i++){ var p=A.ret(ca,i), q=A.ret(cb,i); if(p!==null&&q!==null){ xs.push(p); ys.push(q); } }
  return xs.length>=20?A.corr(xs,ys):null;
}
function rolling60(a,b){
  var h=H(), ca=h.syms[a], cb=h.syms[b], L=h.dates.length-1, best=null, now=null;
  for(var e=Math.max(61,L-W+1);e<=L;e++){ var xs=[],ys=[]; for(var i=e-59;i<=e;i++){ var p=A.ret(ca,i), q=A.ret(cb,i); if(p!==null&&q!==null){ xs.push(p); ys.push(q); } }
    var r=xs.length>=48?A.corr(xs,ys):null; if(r===null) continue; if(!best||r>best.r) best={r:r,d:h.dates[e]}; if(e===L) now=r; }
  return {peak:best,now:now};
}

/* ---------- one pair ---------- */
function quick(a,b){ var J=joint(a,b,W); if(!J) return null; var t1=egT(J.la,J.lb), t2=egT(J.lb,J.la); return {J:J,t1:t1,t2:t2,tMin:Math.min(t1===null?0:t1,t2===null?0:t2)}; }
function full(a,b,B,q){
  q=q||quick(a,b); if(!q) return null; var J=q.J, n=J.la.length, h=Math.floor(n/2);
  var seed=hash(a+"|"+b);
  var p1=bootP(q.t1,J.la,J.lb,B,seed), p2=bootP(q.t2,J.lb,J.la,B,seed^0x9E3779B9);
  var fit=ols(J.lb,J.la), e=fit.res, s=sd(e);
  var b1=ols(J.lb.slice(0,h),J.la.slice(0,h)).b, b2=ols(J.lb.slice(h),J.la.slice(h)).b;
  var e1=e.slice(0,h), e2=e.slice(h), s1=sd(e1), s2=sd(e2);
  var o={a:a,b:b,n:n,from:H().dates[J.idx[0]],to:H().dates[J.idx[n-1]],t1:q.t1,t2:q.t2,p1:p1,p2:p2,beta:fit.b,b1:b1,b2:b2,
    bchg:Math.abs(b1)>1e-9?Math.abs(b2-b1)/Math.abs(b1)*100:null,shift:s>0?Math.abs(mean(e2)-mean(e1))/s:null,vr:s1>0?s2/s1:null,
    cross:crossings(e),hl:halfLife(e),z:s>0?e[n-1]/s:null};
  var e2r=ols(J.la,J.lb).res, s2r=sd(e2r); o.zRev=s2r>0?e2r[n-1]/s2r:null;
  var pm=Math.min(p1===null?1:p1,p2===null?1:p2);
  o.pMin=pm;
  o.g={coint:pm<=GATE.p, beta:o.bchg!==null&&o.bchg<=GATE.beta, shift:o.shift!==null&&o.shift<=GATE.shift, vol:o.vr!==null&&o.vr>=GATE.volLo&&o.vr<=GATE.volHi,
    cross:o.cross>=GATE.cross, hl:o.hl!==null&&o.hl>=GATE.hlLo&&o.hl<=GATE.hlHi};
  o.stable=o.g.beta&&o.g.shift&&o.g.vol;
  o.ok=o.g.coint&&o.stable&&o.g.cross&&o.g.hl;
  return o;
}
function zLab(z){ if(z===null) return "–"; var a=Math.abs(z); return a>=3?"Large dislocation":(a>=2?"Dislocated":(a>=1?"Stretched":"Near normal")); }
function PF(b){ return b?"Pass":"Fail"; }
function fails(o){ var f=[]; if(!o.g.coint) f.push("no cointegration"); if(!o.g.beta) f.push("unstable beta"); if(!o.g.shift) f.push("spread mean moved"); if(!o.g.vol) f.push("spread volatility changed"); if(!o.g.cross) f.push("too few mean crossings"); if(!o.g.hl) f.push("half-life out of range"); return f; }
function sameGroup(a,b){ try{ if(!(swOk()&&moX().stockKeys.indexOf("peer")>=0)) return null; var R=relClusters("stocks",0.6); for(var i=0;i<R.clusters.length;i++){ var c=R.clusters[i], s=c.members.map(function(r){ return r.sym; }); var ia=s.indexOf(a)>=0, ib=s.indexOf(b)>=0; if(ia||ib) return {same:ia&&ib,id:c.id,n:s.length}; } return {same:false}; }catch(e){ return null; } }

/* ---------- parse, validate, run ---------- */
var _qmParseX85=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q);
    if(PX_RE.test(t)){
      var tk=A.tickers(q), last=A.last(), follow=/\b(these|them|those|this list|that list|the list|the names above|the above|that basket|this basket)\b/.test(t)&&last&&last.syms&&last.syms.length;
      var nm=t.match(/\b(?:top|best|first|show|list) (\d{1,2})\b/), n=nm?Math.max(1,Math.min(50,+nm[1])):15;
      if(tk.length>=2) return {kind:"pairx",syms:tk.slice(0,20),from:"named",n:n};
      if(tk.length===1&&!follow&&!(QM_CTX&&(qmIndMentions(t,QM_CTX).length||qmSecMentions(t).inn.length))) return {_err:"A pair test needs two tickers, for example “pair test MGM LVS”. You can also name a subsector (“best pairs trades in Semiconductors”) or say “pair test these” after a list."};
      if(follow) return {kind:"pairx",syms:last.syms.slice(0,20),from:"last",n:n};
      var ctx=QM_CTX, ind=ctx?qmIndMentions(t,ctx):[], sec=qmSecMentions(t).inn;
      if(ind.length||sec.length) return {kind:"pairx",ind:ind,sec:ind.length?[]:sec,n:n,from:"group"};
      return {_err:"Name two tickers (“pair test MGM LVS”), several tickers (every pair among them is tested), a subsector or sector (“best pairs trades in Semiconductors”), or say “pair test these” after a list."};
    }
  }catch(e){}
  return _qmParseX85(q);
};
QMX_KINDS.pairx=1;
var _qmValidateAny85=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="pairx")) return _qmValidateAny85(raw);
  try{
    var h=H(), ctx=QM_CTX, err=[], sp={kind:"pairx",n:Math.max(1,Math.min(50,parseInt(raw.n,10)||15)),from:raw.from||"named"};
    if(raw.ind&&raw.ind.length||raw.sec&&raw.sec.length){
      sp.ind=(raw.ind||[]).filter(function(k){ return ctx.indNames.indexOf(k)>=0; }); sp.sec=(raw.sec||[]).map(function(v){ return qmSecKey(v)||v; }).filter(function(k){ return ctx.rows.some(function(r){ return r.sec===k; }); });
      sp.syms=ctx.rows.filter(function(r){ return sp.ind.length?sp.ind.indexOf(r.ind)>=0:sp.sec.indexOf(r.sec)>=0; }).map(function(r){ return r.sym; });
      if(!sp.ind.length&&!sp.sec.length) return {error:"That sector or subsector is not in the loaded scan."};
    } else {
      sp.syms=(Array.isArray(raw.syms)?raw.syms:[]).map(function(x){ return String(x).toUpperCase(); }).filter(function(x,i,a){ return a.indexOf(x)===i; });
    }
    if(h) sp.syms=sp.syms.filter(function(x){ var ok=!!h.syms[x]; if(!ok) err.push(x); return ok; });
    if(h&&sp.syms.length<2) return {error:"A pair test needs at least two symbols that are in the loaded price history"+(err.length?" (not found: "+err.join(", ")+")":"")+"."};
    if(sp.syms.length>MAXPOOL) return {error:"That group has "+sp.syms.length+" names in the price history; the pair search is limited to "+MAXPOOL+". Name a subsector instead."};
    return {spec:sp,warn:err};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};
var _qmRunX85=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="pairx")) return _qmRunX85(spec,ctx,res,t0);
  var h=H();
  if(!h){ res.lead="A pair test needs the daily price history (part E), which is not loaded in this view."; res.notes.push("Load it in Ask the terminal with “Load price history”, then ask again.");
    res.cov=qmCovX(ctx,""); res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; return res; }
  var by={}; ctx.rows.forEach(function(r){ by[r.sym]=r; });
  function secN(s){ var r=by[s]; return r?qmSecName(r.sec):"ETF / not in scan"; }
  var gateNote="Gates: cointegration bootstrap p ≤ "+GATE.p+" in at least one direction; beta change between the two halves ≤ "+GATE.beta+"%; spread mean shift ≤ "+GATE.shift+
    " spread standard deviation; spread volatility ratio "+GATE.volLo+" to "+GATE.volHi+"; at least "+GATE.cross+" mean crossings; half-life "+GATE.hlLo+" to "+GATE.hlHi+" sessions. Spread stability = the beta, mean-shift and volatility gates together. Eligible = cointegration, stability, crossings and half-life all pass.";
  var method="Method: the last "+W+" bars on which both names traded. Spread = log price of the first name minus beta × log price of the second, beta and intercept from a least-squares fit over the whole window. Cointegration: Engle–Granger, an ADF test (one lagged difference) on that spread, both directions; the p-value is bootstrapped by rebuilding each name as a random walk from its own resampled daily changes, so it answers “how often do two unrelated names look at least this tied?”. Half-life from regressing the daily spread change on yesterday’s spread. z-score = today’s spread in standard deviations of the window. Descriptive, not a trade recommendation.";
  if(spec.syms.length===2){
    var a=spec.syms[0], b=spec.syms[1], o=full(a,b,BOOT1);
    if(!o){ res.lead="Not enough shared price history for "+a+" and "+b+" (need at least 200 common bars ending in the last three sessions)."; res.cov=qmCovX(ctx,""); res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; return res; }
    var M=A.metrics(), L=h.dates.length-1, yb=A.ytdBase(), rl=rolling60(a,b), f=fails(o);
    res.lead="<b>"+a+" – "+b+" is "+(o.ok?"currently eligible":"not currently eligible")+" as a pairs trade</b>"+(o.ok?"":": "+f.join(", "))+". Spread z-score now <b>"+qmN(o.z,2)+"</b> ("+zLab(o.z).toLowerCase()+").";
    res.table={head:["Horizon","Return correlation"],align:["l","r"],body:[["60 sessions",qmN(retCorr(a,b,L-59),3)],["120 sessions",qmN(retCorr(a,b,L-119),3)],["Year to date",yb>=0?qmN(retCorr(a,b,yb+1),3):"–"],["Trailing 12 months",qmN(retCorr(a,b,L-251),3)]]};
    res.extra=[{title:"Spread diagnostic ("+o.n+" bars, "+o.from+" to "+o.to+")",table:{head:["Test","Result","Gate"],align:["l","r","l"],body:[
      [a+" on "+b+" cointegration","ADF "+qmN(o.t1,3)+", bootstrap p "+qmN(o.p1,3),PF(o.p1!==null&&o.p1<=GATE.p)],
      [b+" on "+a+" cointegration","ADF "+qmN(o.t2,3)+", bootstrap p "+qmN(o.p2,3),PF(o.p2!==null&&o.p2<=GATE.p)],
      ["Hedge ratio (beta, whole window)",qmN(o.beta,3),""],
      ["First-half beta",qmN(o.b1,3),""],["Second-half beta",qmN(o.b2,3),""],
      ["Relative beta change",o.bchg===null?"–":qmN(o.bchg,1)+"%",PF(o.g.beta)+(o.g.beta?"":"; maximum "+GATE.beta+"%")],
      ["Half-sample mean shift",qmN(o.shift,3)+" sd",PF(o.g.shift)],
      ["Half-sample volatility ratio",qmN(o.vr,3),PF(o.g.vol)],
      ["Mean crossings",String(o.cross),PF(o.g.cross)],
      ["Estimated half-life",o.hl===null?"no mean reversion":qmN(o.hl,1)+" sessions",PF(o.g.hl)],
      ["Overall spread stability",o.stable?"True":"False",PF(o.stable)],
      ["Current spread z-score ("+a+" on "+b+")",qmN(o.z,3),zLab(o.z)],
      ["Current spread z-score ("+b+" on "+a+")",qmN(o.zRev,3),zLab(o.zRev)],
      ["Eligible as a pairs trade",o.ok?"Yes":"No",PF(o.ok)]]}},
      {title:"The two names",table:{head:["Symbol","YTD return","12M return","12M vol.","12M drawdown","Sector"],align:["l","r","r","r","r","l"],body:[a,b].map(function(s){ var m=M.by[s]||{}; return [s,qmN(m.ytd,2,1),qmN(m.m12,2,1),qmNum(m.vol12)?qmN(m.vol12,2)+"%":"–",qmN(m.dd12,2,1),secN(s)]; })}}];
    if(rl.peak) res.notes.push("The rolling 60-session return correlation peaked at "+qmN(rl.peak.r,3)+" on "+rl.peak.d+" and is "+qmN(rl.now,3)+" now"+(rl.now!==null&&rl.peak.r-rl.now>=0.2?": a weakening relationship makes the current gap less reliable as a convergence signal.":"."));
    var sg=sameGroup(a,b); if(sg) res.notes.push(sg.same?"Both are in Hidden Group "+sg.id+" ("+sg.n+" names, links of 0.60 or more).":"They are not in the same Hidden Group at links of 0.60 or more.");
    if(o.ok&&Math.abs(o.z)>=2) res.notes.push("If the spread reverted to its mean, "+(o.z<0?a:b)+" would outperform "+(o.z<0?b:a)+" (spread = "+a+" minus "+qmN(o.beta,2)+" × "+b+", in logs).");
    res.notes.push(gateNote); res.notes.push(method);
    res.send={label:"pair "+a+" – "+b,items:[{sym:a,side:"long",w:null},{sym:b,side:"long",w:null}].filter(function(x){ return by[x.sym]; })};
    res.rows=1; res.qualifying=o.ok?1:0;
  } else {
    var S=spec.syms, Q=[], i, j;
    for(i=0;i<S.length;i++) for(j=i+1;j<S.length;j++){ var qq=quick(S[i],S[j]); if(qq) Q.push({a:S[i],b:S[j],q:qq}); }
    Q.sort(function(x,y){ return x.q.tMin-y.q.tMin; });
    var R=Q.slice(0,SHORTLIST).map(function(x){ var o=full(x.a,x.b,BOOT_LIST,x.q); o.r252=retCorr(x.a,x.b,h.dates.length-252); return o; }).filter(function(o){ return o; });
    R.sort(function(x,y){ return (y.ok-x.ok)||(x.pMin-y.pMin)||(x.t1+x.t2-y.t1-y.t2); });
    var okN=R.filter(function(o){ return o.ok; }).length, where=spec.from==="group"?(spec.ind&&spec.ind.length?spec.ind.join(", "):spec.sec.map(qmSecName).join(", ")):(spec.from==="last"?"the previous answer":"the names you gave");
    res.lead="Pairs-trade test of <b>"+Q.length+"</b> pairs among "+S.length+" names in "+where+": <b>"+okN+"</b> "+(okN===1?"pair passes":"pairs pass")+" every gate"+(Q.length>SHORTLIST?" (the "+SHORTLIST+" most cointegrated-looking pairs were fully tested)":"")+".";
    res.table={head:["Pair","Eligible","Corr. 12M","Coint. p (best)","Beta change","Mean shift","Vol. ratio","Crossings","Half-life","Spread z","Sectors"],align:["l","l","r","r","r","r","r","r","r","r","l"],
      body:R.slice(0,spec.n).map(function(o){ return [o.a+" – "+o.b,o.ok?"Yes":"No: "+fails(o).join(", "),qmN(o.r252,2),qmN(o.pMin,3),o.bchg===null?"–":qmN(o.bchg,0)+"%",qmN(o.shift,2),qmN(o.vr,2),String(o.cross),o.hl===null?"none":qmN(o.hl,1),qmN(o.z,2),secN(o.a)+(secN(o.a)!==secN(o.b)?" / "+secN(o.b):"")]; })};
    res.notes.push("Ask “pair test A B” for the full table of any one pair. Bootstrap p-values here use "+BOOT_LIST+" draws per direction; the single-pair test uses "+BOOT1+", so a p near the gate can move slightly.");
    res.notes.push(gateNote); res.notes.push(method);
    var it=[]; R.filter(function(o){ return o.ok; }).forEach(function(o){ [o.a,o.b].forEach(function(s){ if(by[s]&&!it.some(function(x){ return x.sym===s; })) it.push({sym:s,side:"long",w:null}); }); });
    res.send=it.length?{label:"eligible pairs",items:it.slice(0,50)}:null;
    res.rows=R.length; res.qualifying=okN;
  }
  if(spec.warn&&spec.warn.length) res.notes.push("Not in the price history: "+spec.warn.join(", ")+".");
  res.cov="Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).";
  res.ms=Date.now()-t0; return res;
};
/* "MGM – LVS" in a Pair column opens either tear sheet */
var _qmCell85=qmCell;
qmCell=function(head,c){
  try{ if(head==="Pair"){ var m=String(c).match(/^([A-Z][A-Z0-9.\-]*) – ([A-Z][A-Z0-9.\-]*)$/); if(m&&qmIsTk(m[1])&&qmIsTk(m[2])) return qmTk(m[1])+" – "+qmTk(m[2]); } }catch(e){}
  return _qmCell85(head,c);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Pairs-trade test (cointegration, beta stability, half-life, spread z-score) from the price history: {\"kind\":\"pairx\",\"syms\":[\"A\",\"B\",...]} (two or more tickers; every pair is tested).\n\nQ: "); }catch(e){}
try{ ["Pair test MGM LVS","Pair test MGM LVS WYNN","Best pairs trades in Semiconductors","Pair test these"].forEach(function(q){ if(QMX_EX20.indexOf(q)<0) QMX_EX20.push(q); });
  var sm=document.querySelector("#qmEx20 summary"); if(sm) sm.textContent=QMX_EX20.length+" example questions: click Run, or Copy and paste your own edit"; }catch(e){}
}catch(e){ try{ console.warn("v85 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
