/* ================= v87: hidden price relationships from the part E history =================
   One engine, computed once per loaded history, feeds two things:
   1. Ask the terminal, a new question kind "hrel" reached only by these phrasings (every other question is parsed as before):
      peers    "what moves with NVDA", "most correlated with NVDA", "hedges for NVDA", "... in other sectors"
      pmisfit  "which stocks trade like another sector" (by price, not by profile)
      change   "which relationships are breaking down / forming", "what is NVDA decoupling from"
      leadlag  "what leads Semiconductors", "what does NVDA lead", "lead-lag between subsectors"
      pgroups  "price groups", "clusters by returns" (groups found from a year of returns, not the 60-day closest peer)
   2. Two new read-only blocks: "Hidden price relationships" on the Relationship Map tab and "Price-history groups" on Hidden Groups.
   Nothing existing is changed; every block stays hidden until a history is loaded. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var W1=252, W2=60;

/* ---------------- engine ---------------- */
var ENG=null;
function stamp(){ var h=H(); return h?String(h.savedAt)+"|"+h.dates.length:""; }
function ctxNow(){ try{ return QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){ return null; } }
function rets(sym,w){ var h=H(), c=h.syms[sym], L=h.dates.length-1, o=new Array(w); for(var i=0;i<w;i++){ var j=L-w+1+i; o[i]=j>=1?A.ret(c,j):null; } return o; }
function zOf(r){ for(var i=0;i<r.length;i++) if(r[i]===null) return null; var m=0,k; for(k=0;k<r.length;k++) m+=r[k]; m/=r.length; var s=0; for(k=0;k<r.length;k++) s+=(r[k]-m)*(r[k]-m); s=Math.sqrt(s); if(!(s>0)) return null; return r.map(function(x){ return (x-m)/s; }); }
function dot(a,b){ var d=0; for(var i=0;i<a.length;i++) d+=a[i]*b[i]; return d; }
function corrN(x,y){ var a=[],b=[]; for(var i=0;i<x.length;i++) if(x[i]!==null&&y[i]!==null){ a.push(x[i]); b.push(y[i]); } return a.length>=Math.max(20,x.length*0.8)?A.corr(a,b):null; }
/* equal-weight daily return of a list of names; null on a day none of them traded */
function basket(list,w,skip){ var h=H(), L=h.dates.length-1, o=new Array(w); for(var i=0;i<w;i++){ var j=L-w+1+i, s=0, k=0; list.forEach(function(sym){ if(sym===skip) return; var r=j>=1?A.ret(h.syms[sym],j):null; if(r!==null){ s+=r; k++; } }); o[i]=k?s/k:null; } return o; }
function eng(){
  var st=stamp(); if(!st) return null; if(ENG&&ENG.st===st) return ENG;
  var h=H(), C=ctxNow(); if(!C) return null;
  var by={}; C.rows.forEach(function(r){ by[r.sym]=r; });
  var etf={}; try{ var X=moX(); if(X&&X.etfSym) X.etfSym.forEach(function(e){ etf[e.sym]=1; }); }catch(e){}
  var syms=Object.keys(h.syms).filter(function(s){ return by[s]||etf[s]; }).sort();
  var Z1={}, Z2={}, S=[];
  syms.forEach(function(s){ var a=zOf(rets(s,W1)); if(!a) return; var b=zOf(rets(s,W2)); if(!b) return; Z1[s]=a; Z2[s]=b; S.push(s); });
  var top={}, bot={}, brk=[], frm=[], edges=[];
  S.forEach(function(s){ top[s]=[]; bot[s]=[]; });
  function keep(arr,it,k,desc){ arr.push(it); if(arr.length>k*3){ arr.sort(desc?function(p,q){ return q.r1-p.r1; }:function(p,q){ return p.r1-q.r1; }); arr.length=k; } }
  for(var i=0;i<S.length;i++){ var a=S[i], za=Z1[a], ya=Z2[a];
    for(var j=i+1;j<S.length;j++){ var b=S[j], r1=dot(za,Z1[b]), r2=dot(ya,Z2[b]);
      keep(top[a],{s:b,r1:r1,r2:r2},12,true); keep(top[b],{s:a,r1:r1,r2:r2},12,true);
      keep(bot[a],{s:b,r1:r1,r2:r2},8,false); keep(bot[b],{s:a,r1:r1,r2:r2},8,false);
      if(by[a]&&by[b]){
        if(r1>=0.5&&r2<=r1-0.3) brk.push({a:a,b:b,r1:r1,r2:r2});
        if(r2>=0.6&&r2>=r1+0.3) frm.push({a:a,b:b,r1:r1,r2:r2});
        if(r1>=0.45) edges.push({a:a,b:b,r:r1});
      } } }
  S.forEach(function(s){ top[s].sort(function(p,q){ return q.r1-p.r1; }); top[s]=top[s].slice(0,12); bot[s].sort(function(p,q){ return p.r1-q.r1; }); bot[s]=bot[s].slice(0,8); });
  brk.sort(function(p,q){ return (q.r1-q.r2)-(p.r1-p.r2); }); frm.sort(function(p,q){ return (q.r2-q.r1)-(p.r2-p.r1); });
  /* sector and subsector baskets (scan stocks only) */
  var secM={}, indM={}; C.rows.forEach(function(r){ if(!Z1[r.sym]) return; (secM[r.sec]=secM[r.sec]||[]).push(r.sym); (indM[r.ind]=indM[r.ind]||[]).push(r.sym); });
  ENG={st:st,C:C,by:by,etf:etf,S:S,Z1:Z1,Z2:Z2,top:top,bot:bot,brk:brk,frm:frm,edges:edges,secM:secM,indM:indM,cache:{}};
  return ENG;
}
function ec(key,fn){ var E=eng(); if(!E) return null; if(!(key in E.cache)) E.cache[key]=fn(E); return E.cache[key]; }
function secName(k){ try{ return qmSecName(k); }catch(e){ return k; } }
function secOf(E,s){ return E.by[s]?secName(E.by[s].sec):(E.etf[s]?"ETF":""); }

/* sector correlation matrix from equal-weight sector baskets */
function secMatrix(w){ return ec("secmx"+w,function(E){ var ks=Object.keys(E.secM).sort(function(a,b){ return secName(a).localeCompare(secName(b)); }), B={}; ks.forEach(function(k){ B[k]=basket(E.secM[k],w); });
  var M={}; ks.forEach(function(a){ M[a]={}; ks.forEach(function(b){ M[a][b]=a===b?1:corrN(B[a],B[b]); }); }); return {ks:ks,M:M}; }); }
/* each stock against every sector basket (its own sector without itself): the "price home" */
function priceHome(){ return ec("home",function(E){
  var ks=Object.keys(E.secM), B={}, out=[];
  ks.forEach(function(k){ B[k]=basket(E.secM[k],W1); });
  E.C.rows.forEach(function(r){ if(!E.Z1[r.sym]||!E.secM[r.sec]) return; var me=rets(r.sym,W1), own=E.secM[r.sec].length>2?corrN(me,basket(E.secM[r.sec],W1,r.sym)):null; if(own===null) return;
    var best=null; ks.forEach(function(k){ if(k===r.sec) return; var c=corrN(me,B[k]); if(c!==null&&(!best||c>best.c)) best={k:k,c:c}; });
    out.push({sym:r.sym,sec:r.sec,ind:r.ind,own:own,best:best,gap:best?best.c-own:null}); });
  out.sort(function(p,q){ return (q.gap||-9)-(p.gap||-9); }); return out; }); }
/* groups from a year of returns: link two names when the correlation is at least thr and one is in the other's top five */
function priceGroups(thr){ return ec("pg"+thr,function(E){
  var par={}; function f(x){ while(par[x]!==x){ par[x]=par[par[x]]; x=par[x]; } return x; }
  E.C.rows.forEach(function(r){ if(E.Z1[r.sym]) par[r.sym]=r.sym; });
  function t5(a,b){ var t=E.top[a]; for(var i=0;i<Math.min(5,t.length);i++) if(t[i].s===b) return true; return false; }
  var used=[]; E.edges.forEach(function(e){ if(e.r>=thr&&(t5(e.a,e.b)||t5(e.b,e.a))){ par[f(e.a)]=f(e.b); used.push(e); } });
  var g={}; Object.keys(par).forEach(function(s){ var k=f(s); (g[k]=g[k]||[]).push(s); });
  var out=Object.keys(g).map(function(k){ return g[k].sort(); }).filter(function(m){ return m.length>=3; }).map(function(m){
    var set={}; m.forEach(function(s){ set[s]=1; }); var ee=used.filter(function(e){ return set[e.a]&&set[e.b]; }), secs={}, inds={};
    m.forEach(function(s){ var r=E.by[s]; secs[r.sec]=(secs[r.sec]||0)+1; inds[r.ind]=1; });
    var avg=0; ee.forEach(function(e){ avg+=e.r; }); avg=ee.length?avg/ee.length:null;
    return {m:m,nSec:Object.keys(secs).length,secs:secs,nInd:Object.keys(inds).length,avg:avg};
  });
  out.sort(function(p,q){ return ((q.nSec>1)-(p.nSec>1))||(q.m.length-p.m.length)||(q.avg-p.avg); });
  out.forEach(function(o,i){ o.id=i+1; }); return out; }); }
/* lead-lag: correlation of the leader's return k days earlier with the follower's return, k = 1..3; kept only when both halves agree */
function lagStats(x,y,k){ var n=x.length, a=[],b=[],a1=[],b1=[],a2=[],b2=[], h=Math.floor(n/2);
  for(var t=k;t<n;t++){ if(x[t-k]===null||y[t]===null) continue; a.push(x[t-k]); b.push(y[t]); if(t<h){ a1.push(x[t-k]); b1.push(y[t]); } else { a2.push(x[t-k]); b2.push(y[t]); } }
  if(a.length<120) return null; var r=A.corr(a,b), r1=a1.length>=40?A.corr(a1,b1):null, r2=a2.length>=40?A.corr(a2,b2):null;
  return {r:r,r1:r1,r2:r2,n:a.length}; }
var LL_MIN=0.2, LL_HALF=0.12;
function llOk(s){ return s&&num(s.r)&&num(s.r1)&&num(s.r2)&&Math.abs(s.r)>=LL_MIN&&Math.abs(s.r1)>=LL_HALF&&Math.abs(s.r2)>=LL_HALF&&(s.r>0)===(s.r1>0)&&(s.r>0)===(s.r2>0); }
function subBaskets(minN){ return ec("subb"+minN,function(E){ var o={}; Object.keys(E.indM).forEach(function(k){ if(E.indM[k].length>=minN) o[k]=basket(E.indM[k],W1); }); return o; }); }
function secBaskets(){ return ec("secb",function(E){ var o={}; Object.keys(E.secM).forEach(function(k){ o[k]=basket(E.secM[k],W1); }); return o; }); }
/* candidates that lead (dir "lead") or follow (dir "follow") a target series */
function leadLag(target,dir,exclude){
  var E=eng(), out=[], subs=subBaskets(3), secs=secBaskets(), tests=0;
  function tryOne(label,kind,ser){ for(var k=1;k<=3;k++){ var s=dir==="lead"?lagStats(ser,target,k):lagStats(target,ser,k); tests++; if(llOk(s)) out.push({label:label,kind:kind,k:k,r:s.r,r1:s.r1,r2:s.r2}); } }
  Object.keys(subs).forEach(function(k){ if(exclude&&exclude.ind===k) return; tryOne(k,"subsector",subs[k]); });
  Object.keys(secs).forEach(function(k){ if(exclude&&exclude.sec===k) return; tryOne(secName(k),"sector",secs[k]); });
  out.sort(function(p,q){ return Math.abs(q.r)-Math.abs(p.r); });
  var best={}; out=out.filter(function(o){ if(best[o.label]) return false; best[o.label]=1; return true; });
  return {list:out,tests:tests};
}
/* every subsector against every other: the strongest lead-lag pairs */
function llAll(){ return ec("llall",function(E){ var subs=subBaskets(3), ks=Object.keys(subs).sort(), out=[], tests=0;
  ks.forEach(function(a){ ks.forEach(function(b){ if(a===b) return; for(var k=1;k<=3;k++){ var s=lagStats(subs[a],subs[b],k); tests++; if(llOk(s)) out.push({a:a,b:b,k:k,r:s.r,r1:s.r1,r2:s.r2}); } }); });
  out.sort(function(p,q){ return Math.abs(q.r)-Math.abs(p.r); }); var seen={}; out=out.filter(function(o){ var key=o.a+"|"+o.b; if(seen[key]) return false; seen[key]=1; return true; });
  return {list:out,tests:tests}; }); }
function indLab(E,k){ var m=E.indM[k], r=m&&E.by[m[0]]; return k+(r?" ("+secName(r.sec)+")":""); }

/* ---------------- Ask: parse ---------------- */
var RX={
  pair:/\bpairs?[- ]?(?:trad|test|check)|\bcointegrat|\bspread (?:test|check|diagnostic)/,
  peers:/\b(?:most correlated|correlated with|correlation with|correlates with|moves? (?:most )?(?:with|like|in (?:sync|step|line) with)|moving with|trades? (?:with|in line with)|in sync with|in step with|tracks?|tracking|closest price (?:peers?|partners?)|price (?:peers?|partners?|twins?)|hedges? (?:for|against|to)|moves? (?:opposite|against|inversely)(?: to)?|inversely correlated|negatively correlated|least correlated|uncorrelated with)\b/,
  pmisfit:/\b(?:trades?|trading|moves?|moving|prices? (?:moves?|behaves?)) (?:more )?like (?:another|a different|other) sectors?\b|\bprice misfits?\b|\b(?:another|a different|other) sectors? by price\b|\bby price\b[^.]*\b(?:another|a different|other) sectors?\b|\bprice home\b/,
  chgA:/\b(?:relationships?|correlations?|co-?movements?|ties|links|pairs?|coupling)\b/,
  chgB:/\b(?:breaking(?: down)?|break(?:s)? down|broke(?:n)?(?: down)?|weaken\w*|fading|falling apart|diverg\w*|forming|new|emerging|strengthen\w*|tightening|building|chang\w*|shifting)\b/,
  chgC:/\bdecoupl\w*\b|\bnewly correlated\b|\bno longer (?:moves?|moving|correlated|trades?)\b/,
  ll:/\blead[- ]?lag\b|\bleading indicators?\b|\b(?:what|which|who)(?: \w+){0,3} (?:leads?|predicts?|precedes?|front[- ]?runs?)\b|\bwhat (?:does|do) .{1,50} lead\b|\b(?:what|which)(?: \w+){0,3} follows?\b|\b(?:lead|follow) each other\b|\bleads? (?:the )?(?:others|market)\b/,
  pg:/\bprice (?:groups?|communities|clusters?|blocs?)\b|\b(?:groups?|clusters?|communities|blocs?) (?:by|from|based on|using) (?:price|returns?|daily returns?)\b|\breturn (?:groups?|clusters?|communities)\b/
};
var _qmParseX87=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q);
    if(!RX.pair.test(t)){
      var tk=A.tickers(q), C=QM_CTX||ctxNow(), inds=C?qmIndMentions(t,C):[], sm=qmSecMentions(t), nm=t.match(/\b(?:top|best|first|show|list|give me) (\d{1,2})\b/)||t.match(/\b(\d{1,2}) (?:stocks|names|symbols|tickers|pairs|relationships|groups|subsectors|sectors)\b/), n=nm?Math.max(1,Math.min(50,+nm[1])):0;
      var cross=/\b(?:other|another|different) sectors?\b|\boutside (?:its|their)? ?(?:own )?sectors?\b|\bcross[- ]sectors?\b|\bacross sectors\b/.test(t);
      var recent=/\b60\b|\b3 months?\b|\bthree months?\b|\brecent(?:ly)?\b|\blately\b/.test(t);
      var mode=null, o={kind:"hrel"};
      if(RX.pmisfit.test(t)) mode="pmisfit";
      else if(RX.pg.test(t)) mode="pgroups";
      else if(RX.chgC.test(t)||(RX.chgA.test(t)&&RX.chgB.test(t)&&!/\bsubsector pairs?|\bsector pairs?/.test(t))) mode="change";
      else if(RX.ll.test(t)) mode="leadlag";
      else if(tk.length===1&&RX.peers.test(t)) mode="peers";
      if(mode){
        o.mode=mode; o.n=n||(mode==="pmisfit"?15:(mode==="pgroups"?12:10)); o.cross=cross; o.recent=recent; o.secIn=sm.inn.slice(); o.ind=inds.slice();
        if(mode==="peers"){ o.focus=tk[0]; o.etf=/\betfs?\b|\bfunds?\b/.test(t); o.dir=/\b(?:hedges?|opposite|against|inversely|negatively)\b/.test(t)?"neg":(/\b(?:least correlated|uncorrelated)\b/.test(t)?"zero":"pos"); }
        if(mode==="change"){ o.focus=tk.length===1?tk[0]:null; o.dir=/\b(?:forming|new|newly|emerging|strengthen\w*|tightening|building)\b/.test(t)?"forming":(/\bchang\w*|\bshifting\b/.test(t)?"both":"breaking"); }
        if(mode==="leadlag"){
          o.dir=/\bwhat (?:does|do) .{1,50} lead\b|\b(?:what|which)(?: \w+){0,3} follows?\b|\bfollowers? of\b/.test(t)?"follow":"lead";
          if(tk.length===1) o.target={t:"sym",v:tk[0]}; else if(inds.length) o.target={t:"ind",v:inds[0]}; else if(sm.inn.length) o.target={t:"sec",v:sm.inn[0]};
          else if(!/\blead[- ]?lag\b|\b(?:lead|follow) each other\b|\bsubsectors? (?:lead|that lead)\b|\bleads? (?:the )?others\b|\bwhich subsectors\b/.test(t)) { mode=null; }
        }
        if(mode==="pgroups"){ var tm=t.match(/\b0?\.(\d{1,2})\b/); o.thr=tm?Math.max(0.45,Math.min(0.9,parseFloat("0."+tm[1]))):0.7; }
        if(mode) return o;
      }
    }
  }catch(e){}
  return _qmParseX87(q);
};
QMX_KINDS.hrel=1;
var _qmValidateAny87=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="hrel")) return _qmValidateAny87(raw);
  try{
    var C=QM_CTX, sp={kind:"hrel",mode:["peers","pmisfit","change","leadlag","pgroups"].indexOf(raw.mode)>=0?raw.mode:null};
    if(!sp.mode) return {error:"Unknown relationship question."};
    sp.n=Math.max(1,Math.min(50,parseInt(raw.n,10)||10)); sp.cross=!!raw.cross; sp.etf=!!raw.etf; sp.recent=!!raw.recent; sp.dir=raw.dir||null;
    sp.secIn=(raw.secIn||[]).map(function(v){ return qmSecKey(v)||v; }).filter(function(k){ return C.rows.some(function(r){ return r.sec===k; }); });
    sp.ind=(raw.ind||[]).filter(function(k){ return C.indNames.indexOf(k)>=0; });
    var h=H();
    if(raw.focus){ sp.focus=String(raw.focus).toUpperCase(); if(h&&!h.syms[sp.focus]) return {error:sp.focus+" is not in the loaded price history."}; }
    if(raw.target){ sp.target={t:raw.target.t,v:raw.target.t==="sym"?String(raw.target.v).toUpperCase():raw.target.v}; if(sp.target.t==="sec") sp.target.v=qmSecKey(sp.target.v)||sp.target.v; }
    var th=parseFloat(raw.thr); sp.thr=isFinite(th)?Math.max(0.45,Math.min(0.9,th)):0.7;
    return {spec:sp};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

/* ---------------- Ask: run ---------------- */
var _qmRunX87=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hrel")) return _qmRunX87(spec,ctx,res,t0);
  var h=H();
  function done(rows,q){ res.cov="Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E)."; res.rows=rows; res.qualifying=q===undefined?rows:q; res.ms=Date.now()-t0; return res; }
  if(!h){ res.lead="This question is answered from the daily price history (part E), which is not loaded in this view."; res.notes.push("Load it in Ask the terminal with “Load price history”, then ask again."); res.cov=qmCovX(ctx,""); res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; return res; }
  var E=eng(); if(!E){ res.lead="The relationship engine could not start (no scan loaded)."; return done(0); }
  var inSec=function(s){ return !spec.secIn.length||(E.by[s]&&spec.secIn.indexOf(E.by[s].sec)>=0); };
  var inInd=function(s){ return !spec.ind.length||(E.by[s]&&spec.ind.indexOf(E.by[s].ind)>=0); };
  function sendOf(list,label){ var it=[]; list.forEach(function(s){ if(E.by[s]&&!it.some(function(x){ return x.sym===s; })) it.push({sym:s,side:"long",w:null}); }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  var wl=spec.recent?"60 bars":"252 bars";
  if(spec.mode==="peers"){
    var f=spec.focus; if(!E.Z1[f]){ res.lead=f+" does not have a full year of prices in the loaded history."; return done(0); }
    var mySec=E.by[f]?E.by[f].sec:null, cand=[], zf1=E.Z1[f], zf2=E.Z2[f];
    E.S.forEach(function(s){ if(s===f) return; if(spec.cross&&mySec&&E.by[s]&&E.by[s].sec===mySec) return; if((spec.cross||!spec.etf)&&!E.by[s]) return; if(!inSec(s)||!inInd(s)) return;
      cand.push({s:s,r1:dot(zf1,E.Z1[s]),r2:dot(zf2,E.Z2[s])}); });
    var key=spec.recent?"r2":"r1";
    if(spec.dir==="neg") cand.sort(function(p,q){ return p[key]-q[key]; }); else if(spec.dir==="zero") cand.sort(function(p,q){ return Math.abs(p[key])-Math.abs(q[key]); }); else cand.sort(function(p,q){ return q[key]-p[key]; });
    var list=cand.slice(0,spec.n);
    res.lead=(spec.dir==="neg"?"The "+list.length+" names that move most <b>opposite</b> to ":(spec.dir==="zero"?"The "+list.length+" names least tied to ":"The "+list.length+" names whose daily returns move most with "))+"<b>"+f+"</b>"+(spec.cross?" outside its own sector":"")+", ranked on "+wl+":";
    res.table={head:["Rank","Symbol","Corr. 252 bars","Corr. 60 bars","Change","Sector","Subsector"],align:["r","l","r","r","r","l","l"],
      body:list.map(function(c,i){ return [String(i+1),c.s,qmN(c.r1,3),qmN(c.r2,3),(c.r2-c.r1>=0?"+":"")+qmN(c.r2-c.r1,2),secOf(E,c.s),E.by[c.s]?E.by[c.s].ind:(E.etf[c.s]?"ETF":"")]; })};
    res.notes.push("Correlation of daily returns from the part E price history, 252 bars (about a year) and 60 bars (about three months). Change = 60-bar minus 252-bar: positive means the tie has tightened lately. "+(spec.dir==="neg"?"A negative correlation means the two tend to move in opposite directions on the same day; it is a statistical hedge, not a guaranteed one. ":"")+"Ask “pair test "+f+" "+(list[0]?list[0].s:"XYZ")+"” to test any pair for a pairs trade.");
    if(!spec.etf&&spec.dir==="pos"){ var et=E.top[f].filter(function(x){ return E.etf[x.s]; }).slice(0,5); if(et.length) res.notes.push("Closest ETFs (252 bars): "+et.map(function(x){ return x.s+" "+x.r1.toFixed(2); }).join(", ")+". Add \u201Cincluding ETFs\u201D to rank them with the stocks."); }
    res.send=sendOf(list.map(function(c){ return c.s; }),"price partners of "+f);
    return done(list.length);
  }
  if(spec.mode==="pmisfit"){
    var home=priceHome().filter(function(o){ return o.best&&o.gap>0&&inSec(o.sym)&&inInd(o.sym); });
    var L2=home.slice(0,spec.n);
    res.lead="<b>"+home.length+"</b> stocks' daily returns track another sector's basket more closely than their own sector's"+(spec.secIn.length?" (own sector "+spec.secIn.map(secName).join(", ")+")":"")+". The "+L2.length+" clearest:";
    res.table={head:["Rank","Symbol","Own sector","Corr. to own sector","Trades like","Corr. to that sector","Gap","Subsector"],align:["r","l","l","r","l","r","r","l"],
      body:L2.map(function(o,i){ return [String(i+1),o.sym,secName(o.sec),qmN(o.own,3),secName(o.best.k),qmN(o.best.c,3),"+"+qmN(o.gap,3),o.ind]; })};
    res.notes.push("Each sector is an equal-weight basket of its stocks' daily returns over the last 252 bars; a stock's own sector basket leaves the stock itself out, so it is not compared with itself. This is the price version of “which stocks behave like another sector” (which compares today's scan profile instead); names on both lists are the strongest cases.");
    res.send=sendOf(L2.map(function(o){ return o.sym; }),"stocks that trade like another sector");
    return done(L2.length,home.length);
  }
  if(spec.mode==="change"){
    function pass(p){ if(spec.focus&&p.a!==spec.focus&&p.b!==spec.focus) return false; if(spec.cross&&E.by[p.a].sec===E.by[p.b].sec) return false;
      if(spec.secIn.length&&!(spec.secIn.indexOf(E.by[p.a].sec)>=0||spec.secIn.indexOf(E.by[p.b].sec)>=0)) return false;
      if(spec.ind.length&&!(spec.ind.indexOf(E.by[p.a].ind)>=0||spec.ind.indexOf(E.by[p.b].ind)>=0)) return false; return true; }
    function tb(list){ return {head:["Pair","Corr. 252 bars","Corr. 60 bars","Change","Sectors"],align:["l","r","r","r","l"],body:list.map(function(p){ var d=p.r2-p.r1; return [p.a+" – "+p.b,qmN(p.r1,2),qmN(p.r2,2),(d>=0?"+":"")+qmN(d,2),secName(E.by[p.a].sec)+(E.by[p.a].sec!==E.by[p.b].sec?" / "+secName(E.by[p.b].sec):"")]; })}; }
    var B=E.brk.filter(pass), F=E.frm.filter(pass), sel=[];
    if(spec.focus&&E.Z1[spec.focus]){ var fz1=E.Z1[spec.focus], fz2=E.Z2[spec.focus], all=[];
      E.C.rows.forEach(function(r){ var s2=r.sym; if(s2===spec.focus||!E.Z1[s2]) return; var p={a:spec.focus,b:s2,r1:dot(fz1,E.Z1[s2]),r2:dot(fz2,E.Z2[s2])}; if(E.by[spec.focus]&&pass(p)) all.push(p); });
      B=all.filter(function(p){ return p.r1>=0.3&&p.r2<p.r1; }).sort(function(p,q){ return (q.r1-q.r2)-(p.r1-p.r2); });
      F=all.filter(function(p){ return p.r2>=0.3&&p.r2>p.r1; }).sort(function(p,q){ return (q.r2-q.r1)-(p.r2-p.r1); }); }
    function cap(list){ var c={}; return list.filter(function(p){ c[p.a]=(c[p.a]||0)+1; c[p.b]=(c[p.b]||0)+1; return spec.focus||(c[p.a]<=2&&c[p.b]<=2); }); }
    B=cap(B); F=cap(F);
    var scope=(spec.focus?" involving <b>"+spec.focus+"</b>":"")+(spec.cross?" across sectors":"")+(spec.secIn.length?" touching "+spec.secIn.map(secName).join(", "):"")+(spec.ind.length?" touching "+spec.ind.join(", "):"");
    if(spec.dir==="breaking"||spec.dir==="both"){ res.table=tb(B.slice(0,spec.n)); sel=sel.concat(B.slice(0,spec.n)); res.lead="<b>"+B.length+"</b> relationships"+scope+" are <b>breaking down</b>"+(spec.focus?" (correlated 0.30 or more over the year and weaker over the last 60 bars)":": correlated over the year (0.50 or more) but at least 0.30 weaker over the last 60 bars")+". The "+Math.min(spec.n,B.length)+" biggest drops:"; }
    if(spec.dir==="forming"){ res.table=tb(F.slice(0,spec.n)); sel=F.slice(0,spec.n); res.lead="<b>"+F.length+"</b> relationships"+scope+" are <b>forming</b>"+(spec.focus?" (correlated 0.30 or more over the last 60 bars and stronger than over the year)":": correlated 0.60 or more over the last 60 bars and at least 0.30 stronger than over the year")+". The "+Math.min(spec.n,F.length)+" biggest rises:"; }
    if(spec.dir==="both"){ res.extra=[{title:"Forming ("+F.length+")",table:tb(F.slice(0,spec.n))}]; sel=sel.concat(F.slice(0,spec.n)); }
    res.notes.push("From daily-return correlation in the part E price history, 252 bars against the last 60 bars, scan stocks only"+(spec.focus?"":"; no stock appears more than twice in a list, so one event does not fill it")+". A relationship that is breaking down makes a pairs trade or a hedge between those names less reliable; a new one may be a theme, a news event or chance, so check it with “pair test A B”.");
    var ss=[]; sel.forEach(function(p){ ss.push(p.a,p.b); }); res.send=sendOf(ss,"names in changing relationships");
    return done(sel.length,spec.dir==="forming"?F.length:B.length);
  }
  if(spec.mode==="leadlag"){
    var note="Lead-lag: the correlation between one series' return k days earlier (k = 1, 2 or 3) and the other's return today, over the last 252 bars, with subsector and sector baskets equal-weighted (subsectors with at least 3 names). Kept only when it is at least "+LL_MIN+" over the whole year AND at least "+LL_HALF+" with the same sign in each half on its own. With this many tests some will still be chance, and daily lead-lag between large caps is usually small; treat these as ideas to check, not signals.";
    if(!spec.target){
      var all=llAll(), L3=all.list.filter(function(o){ var ra=E.by[E.indM[o.a][0]], rb=E.by[E.indM[o.b][0]]; if(spec.cross&&ra&&rb&&ra.sec===rb.sec) return false; if(spec.secIn.length&&!(ra&&spec.secIn.indexOf(ra.sec)>=0||rb&&spec.secIn.indexOf(rb.sec)>=0)) return false; return true; }).slice(0,spec.n);
      res.lead="<b>"+all.list.length+"</b> subsector lead-lag relationships pass the checks out of "+all.tests+" tested. The "+L3.length+" strongest:";
      res.table={head:["Rank","Leader","Follower","Lag","Correlation","First half","Second half"],align:["r","l","l","r","r","r","r"],body:L3.map(function(o,i){ return [String(i+1),indLab(E,o.a),indLab(E,o.b),o.k+(o.k===1?" day":" days"),qmN(o.r,3),qmN(o.r1,3),qmN(o.r2,3)]; })};
      res.notes.push(note); return done(L3.length,all.list.length);
    }
    var tg=spec.target, ser=null, lab="", ex=null;
    if(tg.t==="sym"){ if(!E.Z1[tg.v]){ res.lead=tg.v+" does not have a full year of prices in the loaded history."; return done(0); } ser=rets(tg.v,W1); lab=tg.v; ex=E.by[tg.v]?{ind:E.by[tg.v].ind}:null; }
    else if(tg.t==="ind"){ var sb=subBaskets(1); ser=sb[tg.v]; lab=tg.v; ex={ind:tg.v}; }
    else { var sc=secBaskets(); ser=sc[tg.v]; lab=secName(tg.v); ex={sec:tg.v}; }
    if(!ser){ res.lead="No price series for "+hE(lab)+"."; return done(0); }
    var LL=leadLag(ser,spec.dir,ex), L4=LL.list.slice(0,spec.n);
    res.lead=L4.length?(spec.dir==="lead"?"What has tended to move <b>before</b> ":"What has tended to move <b>after</b> ")+"<b>"+hE(lab)+"</b>: "+LL.list.length+" of "+LL.tests+" tests pass the checks. The "+L4.length+" strongest:":"Nothing passes the lead-lag checks for <b>"+hE(lab)+"</b> ("+LL.tests+" tests). Its moves are not reliably "+(spec.dir==="lead"?"preceded":"followed")+" by any subsector or sector basket at a 1 to 3 day lag.";
    if(L4.length) res.table={head:["Rank",spec.dir==="lead"?"Leader":"Follower","Type","Lag","Correlation","First half","Second half"],align:["r","l","l","r","r","r","r"],body:L4.map(function(o,i){ return [String(i+1),o.kind==="subsector"?indLab(E,o.label):o.label,o.kind,o.k+(o.k===1?" day":" days"),qmN(o.r,3),qmN(o.r1,3),qmN(o.r2,3)]; })};
    res.notes.push("A positive correlation means a rise in the "+(spec.dir==="lead"?"leader":"target")+" has tended to be followed by a rise in the "+(spec.dir==="lead"?"target":"follower")+"; negative means the opposite direction. "+note);
    return done(L4.length,LL.list.length);
  }
  if(spec.mode==="pgroups"){
    var G=priceGroups(spec.thr).filter(function(g){ if(spec.cross&&g.nSec<2) return false; if(spec.secIn.length&&!g.m.some(function(s){ return spec.secIn.indexOf(E.by[s].sec)>=0; })) return false; if(spec.ind.length&&!g.m.some(function(s){ return spec.ind.indexOf(E.by[s].ind)>=0; })) return false; return true; });
    var L5=G.slice(0,spec.n);
    res.lead="<b>"+G.length+"</b> price-history groups (links of "+qmN(spec.thr,2)+" or more over 252 bars)"+(spec.cross?" that cross sectors":", "+G.filter(function(g){ return g.nSec>1; }).length+" of them crossing sectors")+". The first "+L5.length+":";
    res.table={head:["Group","Members","Size","Sectors","Subsectors","Avg link"],align:["r","l","r","l","r","r"],body:L5.map(function(g){ return [String(g.id),g.m.join(" "),String(g.m.length),Object.keys(g.secs).map(function(k){ return secName(k)+" "+g.secs[k]; }).join(", "),String(g.nInd),qmN(g.avg,2)]; })};
    res.notes.push("Two stocks are linked when their daily returns over the last 252 bars correlate at "+qmN(spec.thr,2)+" or more and one is among the other's five closest; linked names are joined into groups (A with B and B with C puts all three together). Unlike Hidden Groups, which join each name's single closest 60-day peer from RealTest, these use a full year of prices, so they show the durable blocs. Say “price groups at 0.8” for tighter groups or “at 0.6” for looser ones (below about 0.65 the groups start to chain into one large bloc).");
    var s5=[]; L5.forEach(function(g){ s5=s5.concat(g.m); }); res.send=sendOf(s5,"price-history groups");
    return done(L5.length,G.length);
  }
  return done(0);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Price relationships from the history: {\"kind\":\"hrel\",\"mode\":\"peers\"|\"pmisfit\"|\"change\"|\"leadlag\"|\"pgroups\",\"focus\":\"TICKER\" (peers, change),\"dir\":\"pos\"|\"neg\"|\"zero\" (peers) or \"breaking\"|\"forming\"|\"both\" (change) or \"lead\"|\"follow\" (leadlag),\"target\":{\"t\":\"sym\"|\"ind\"|\"sec\",\"v\":...} (leadlag),\"cross\":true|false,\"secIn\":[...],\"n\":1-50,\"thr\":0.45-0.9 (pgroups)}\n\nQ: "); }catch(e){}
try{ ["What moves with NVDA?","Hedges for NVDA in other sectors","Which stocks trade like another sector?","Which relationships are breaking down?","Which relationships are forming across sectors?","What leads Semiconductors?","Lead-lag between subsectors","Price groups that cross sectors"].forEach(function(q){ if(QMX_EX20.indexOf(q)<0) QMX_EX20.push(q); });
  var sm=document.querySelector("#qmEx20 summary"); if(sm) sm.textContent=QMX_EX20.length+" example questions: click Run, or Copy and paste your own edit"; }catch(e){}

/* ---------------- tab blocks ---------------- */
function tk(s){ return '<strong class="num" data-tear="'+hE(s)+'" style="cursor:pointer">'+hE(s)+'</strong>'; }
function heat(r){ return !num(r)?"var(--panel)":"color-mix(in srgb,"+cssv(r>=0?"--pos":"--neg")+" "+(Math.min(1,Math.abs(r))*80).toFixed(0)+"%, var(--surface))"; }
function srcLine(){ var h=H(); return h?"Price history "+h.dates[0]+" to "+h.dates[h.dates.length-1]+", "+h.dates.length+" bars.":""; }
function tbl(id,head){ return '<div class="tbl-scroll"><table id="'+id+'"><thead><tr>'+head.map(function(x,i){ return '<th'+(i===0?' style="text-align:left"':'')+'>'+x+'</th>'; }).join("")+'</tr></thead><tbody></tbody></table></div>'; }
function ask(q){ return '<span class="mini" style="display:block;margin-top:4px">Ask the terminal: <code>'+hE(q)+'</code></span>'; }
var secW="252";
function relMount(){
  var pane=$("#pane-ng"); if(!pane||$("#hx87Rel")) return;
  var el=document.createElement("div"); el.className="block"; el.id="hx87Rel"; el.hidden=true;
  el.innerHTML='<div class="block-head"><h2>Hidden price relationships (part E)</h2><span class="count" id="hx87RelNote"></span></div>'+
    '<p class="lede">Relationships the sector labels hide, measured from a year of daily prices: how the sectors themselves move together, stocks whose prices follow another sector, relationships that are breaking down or forming, and subsectors that have tended to move a day or more before others. Every ticker opens its tear sheet; each table names the Ask question that gives the full list.</p>'+
    '<div class="controls"><div class="ctl-grp"><span class="ctl-lab">Sector matrix</span><div class="seg" id="hx87SecW"><button type="button" data-v="252" aria-pressed="true">252 bars</button><button type="button" data-v="60" aria-pressed="false">60 bars</button><button type="button" data-v="chg" aria-pressed="false">Change</button></div></div></div>'+
    '<div class="tm-shell"><div class="chart-scroll" id="hx87SecMx"></div></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(520px,100%),1fr));gap:14px;margin-top:12px">'+
    '<div><h3 style="margin:0 0 6px">Stocks that trade like another sector</h3>'+tbl("hx87Mis",["Symbol","Own sector","Corr.","Trades like","Corr."])+ask("Which stocks trade like another sector?")+'</div>'+
    '<div><h3 style="margin:0 0 6px">Subsector lead-lag candidates</h3>'+tbl("hx87LL",["Leader","Follower","Lag","Corr."])+ask("Lead-lag between subsectors")+'</div>'+
    '<div><h3 style="margin:0 0 6px">Relationships breaking down</h3>'+tbl("hx87Brk",["Pair","252 bars","60 bars","Sectors"])+ask("Which relationships are breaking down?")+'</div>'+
    '<div><h3 style="margin:0 0 6px">Relationships forming</h3>'+tbl("hx87Frm",["Pair","252 bars","60 bars","Sectors"])+ask("Which relationships are forming?")+'</div></div>';
  var after=$("#hx84Ng")||$("#ngmBlock"); if(after&&after.parentNode===pane) pane.insertBefore(el,after.nextSibling); else { var fig=pane.querySelector(":scope > figure"); if(fig) pane.insertBefore(el,fig); else pane.appendChild(el); }
  $$("#hx87SecW button").forEach(function(b){ b.addEventListener("click",function(){ $$("#hx87SecW button").forEach(function(x){ x.setAttribute("aria-pressed",String(x===b)); }); secW=b.dataset.v; relDraw(); }); });
}
function relDraw(){
  relMount(); var el=$("#hx87Rel"); if(!el) return; var E=H()?eng():null; if(!E){ el.hidden=true; return; }
  var m1=secMatrix(W1), m2=secMatrix(W2), ks=m1.ks, n=ks.length, cell=46, lab=120, Wd=lab+n*cell, Hd=lab+n*cell;
  function val(a,b){ if(a===b) return null; var x=m1.M[a][b], y=m2.M[a][b]; return secW==="252"?x:(secW==="60"?y:(num(x)&&num(y)?y-x:null)); }
  var s=['<svg viewBox="0 0 '+Wd+' '+Hd+'" role="img" aria-label="Sector by sector return correlation" style="width:100%;height:auto;max-width:720px;min-width:420px">'];
  ks.forEach(function(k,i){ s.push('<text x="'+(lab-6)+'" y="'+(lab+i*cell+cell/2+4)+'" text-anchor="end" font-size="11" fill="var(--ink-2)">'+hE(secName(k))+'</text>');
    s.push('<text transform="translate('+(lab+i*cell+cell/2+4)+','+(lab-6)+') rotate(-50)" font-size="11" fill="var(--ink-2)">'+hE(secName(k))+'</text>'); });
  ks.forEach(function(a,i){ ks.forEach(function(b,j){ var v=val(a,b), fill=a===b?"var(--sunken)":(secW==="chg"?heat(num(v)?v*2:null):heat(v));
    s.push('<rect x="'+(lab+j*cell)+'" y="'+(lab+i*cell)+'" width="'+cell+'" height="'+cell+'" fill="'+fill+'" stroke="var(--surface)"/>');
    if(a!==b&&num(v)) s.push('<text x="'+(lab+j*cell+cell/2)+'" y="'+(lab+i*cell+cell/2+4)+'" text-anchor="middle" font-size="10.5" fill="var(--ink)">'+(secW==="chg"&&v>0?"+":"")+v.toFixed(2)+'</text>'); }); });
  s.push('</svg>'); $("#hx87SecMx").innerHTML=s.join("")+'<p class="mini" style="margin:6px 0 0">'+(secW==="chg"?"Change = 60-bar minus 252-bar correlation: teal cells are sectors moving together more than usual lately, red ones less. ":"Correlation of equal-weight sector baskets’ daily returns. ")+'Ask: <code>Which sectors move most alike?</code></p>';
  var mis=priceHome().filter(function(o){ return o.best&&o.gap>0; }).slice(0,10);
  $("#hx87Mis tbody").innerHTML=mis.map(function(o){ return '<tr><td style="text-align:left">'+tk(o.sym)+'</td><td>'+hE(secName(o.sec))+'</td><td class="num">'+o.own.toFixed(2)+'</td><td>'+hE(secName(o.best.k))+'</td><td class="num">'+o.best.c.toFixed(2)+'</td></tr>'; }).join("")||'<tr><td colspan="5" style="color:var(--ink-3)">None.</td></tr>';
  var ll=llAll().list.slice(0,10);
  $("#hx87LL tbody").innerHTML=ll.map(function(o){ return '<tr><td style="text-align:left" title="'+hE(indLab(E,o.a))+'">'+hE(o.a)+'</td><td title="'+hE(indLab(E,o.b))+'">'+hE(o.b)+'</td><td class="num">'+o.k+'d</td><td class="num">'+o.r.toFixed(2)+'</td></tr>'; }).join("")||'<tr><td colspan="4" style="color:var(--ink-3)">Nothing passes the checks.</td></tr>';
  function prow(p){ return '<tr><td style="text-align:left">'+tk(p.a)+' &ndash; '+tk(p.b)+'</td><td class="num">'+p.r1.toFixed(2)+'</td><td class="num">'+p.r2.toFixed(2)+'</td><td>'+hE(secName(E.by[p.a].sec))+(E.by[p.a].sec!==E.by[p.b].sec?" / "+hE(secName(E.by[p.b].sec)):"")+'</td></tr>'; }
  function capT(list){ var c={}; return list.filter(function(p){ c[p.a]=(c[p.a]||0)+1; c[p.b]=(c[p.b]||0)+1; return c[p.a]<=2&&c[p.b]<=2; }); }
  $("#hx87Brk tbody").innerHTML=capT(E.brk).slice(0,10).map(prow).join("")||'<tr><td colspan="4" style="color:var(--ink-3)">None.</td></tr>';
  $("#hx87Frm tbody").innerHTML=capT(E.frm).slice(0,10).map(prow).join("")||'<tr><td colspan="4" style="color:var(--ink-3)">None.</td></tr>';
  $("#hx87RelNote").textContent=E.S.length+" symbols with a full year · "+srcLine();
  el.hidden=false;
}
var pgThr=0.7;
function pgMount(){
  var hg=$("#hx84Hg")||($("#hgTbl")&&$("#hgTbl").closest(".block")); if(!hg||$("#hx87Pg")) return;
  var el=document.createElement("div"); el.className="block"; el.id="hx87Pg"; el.hidden=true;
  el.innerHTML='<div class="block-head"><h3>Price-history groups: blocs found from a year of daily returns</h3><span class="count" id="hx87PgNote"></span></div>'+
    '<p class="lede" style="font-size:13px">The groups above join each name to its single closest 60-day peer. These are found directly from the part E history instead: two stocks are linked when a year of daily returns correlates at the chosen level and one is among the other’s five closest, and linked names are joined into a group. Groups that cross sectors come first. They are the durable blocs, the ones most likely to still hold next month.</p>'+
    '<div class="controls"><div class="ctl-grp"><span class="ctl-lab">Link of at least</span><div class="seg" id="hx87PgThr"><button type="button" data-v="0.6" aria-pressed="false">0.60</button><button type="button" data-v="0.7" aria-pressed="true">0.70</button><button type="button" data-v="0.8" aria-pressed="false">0.80</button></div></div></div>'+
    tbl("hx87PgTbl",["#","Members","Size","Sectors","Avg link"])+ask("Price groups that cross sectors");
  hg.parentNode.insertBefore(el,hg.nextSibling);
  $$("#hx87PgThr button").forEach(function(b){ b.addEventListener("click",function(){ $$("#hx87PgThr button").forEach(function(x){ x.setAttribute("aria-pressed",String(x===b)); }); pgThr=+b.dataset.v; pgDraw(); }); });
}
function pgDraw(){
  pgMount(); var el=$("#hx87Pg"); if(!el) return; var E=H()?eng():null; if(!E||!$("#hgBody")||$("#hgBody").hidden){ el.hidden=true; return; }
  var G=priceGroups(pgThr);
  $("#hx87PgTbl tbody").innerHTML=G.slice(0,40).map(function(g){ return '<tr><td class="num">'+g.id+'</td><td style="text-align:left">'+g.m.map(tk).join(" ")+'</td><td class="num">'+g.m.length+'</td><td style="font-size:12px;color:var(--ink-2)">'+(g.nSec>1?'<span style="color:var(--accent);font-weight:600">crosses sectors</span> ':'')+Object.keys(g.secs).map(function(k){ return hE(secName(k))+" "+g.secs[k]; }).join(", ")+'</td><td class="num">'+(num(g.avg)?g.avg.toFixed(2):"&#8211;")+'</td></tr>'; }).join("")||'<tr><td colspan="5" style="color:var(--ink-3)">No groups at this link level.</td></tr>';
  $("#hx87PgNote").textContent=G.length+" groups, "+G.filter(function(g){ return g.nSec>1; }).length+" cross sectors"+(G.length>40?" (first 40 shown)":"")+" · "+srcLine();
  el.hidden=false;
}
function safe(fn){ return function(){ try{ fn(); }catch(e){ try{ console.warn("v87: "+(e&&e.message)); }catch(e2){} } }; }
var sRel=safe(relDraw), sPg=safe(pgDraw);
function paneOpen(id){ var p=$("#"+id); return p&&!p.hidden; }
window.addEventListener("hxchange",function(){ ENG=null; setTimeout(function(){ if(paneOpen("pane-ng")) sRel(); if(paneOpen("pane-hg")) sPg(); },0); });
v63Watch("tab-ng",function(){ setTimeout(sRel,0); });
v63Watch("tab-hg",function(){ setTimeout(sPg,0); });
try{ var hb=$("#hgTbl tbody"); if(hb&&typeof MutationObserver!=="undefined"){ var qd=false; new MutationObserver(function(){ if(qd) return; qd=true; setTimeout(function(){ qd=false; sPg(); },0); }).observe(hb,{childList:true}); } }catch(e){}
relMount(); pgMount();
}catch(e){ try{ console.warn("v87 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
