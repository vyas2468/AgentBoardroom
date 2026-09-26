/* ================= v91: Ask the terminal, correlation numbers, matrices and low-correlation portfolios =================
   New question kind "hcorr", reached only by these phrasings (everything else is parsed as before):
     pair     "correlation between NVDA and AMD", "how correlated are XOM and CVX"   (60 / 126 / YTD / 252 bars, saved severity, rolling peak)
     matrix   "correlation matrix of XOM CVX COP SLB", "how correlated are these", "average correlation of these"
     gpairs   "most correlated pairs in Semiconductors", "least correlated pairs in Energy", "most correlated pairs across sectors"
     secpair  "correlation between Energy and Utilities"
     mkt      "least / most correlated with the market"   (12-month correlation and beta to RSP from the history)
     port     "build a moderate 10 stock portfolio of healthy uptrends with low correlation between them"
              the existing portfolio or screen rules pick the candidates (risk level, caps, filters, exactly as before), then names are
              added in that order only while their correlation to every name already chosen stays under the limit. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v); }
var CORW=/\bcorrelat\w*|\bcorr\b|\bco-?mov\w*|\bmove(?:s|d)? together\b/;
var SKIP=/\bpairs?[- ]?(?:trad|test|check)|\bcointegrat|\bspread (?:test|check|diagnostic)|\bhierarchical\b|\bclusters?\b|\bblocks?\b|\bdecoupl|\bbreaking\b|\bforming\b|\bleads?\b|\blead[- ]lag\b/;
function winOf(t,def){ if(/\b60\b|\b3 months?\b|\bthree months?\b|\brecent(?:ly)?\b/.test(t)) return "60"; if(/\b126\b|\b6 months?\b|\bsix months?\b/.test(t)) return "126"; if(/\bytd\b|\byear to date\b|\bthis year\b/.test(t)) return "ytd"; if(/\b252\b|\b12 months?\b|\ba year\b|\bone year\b|\btrailing year\b/.test(t)) return "252"; return def; }
function winRange(w){ var h=H(), L=h.dates.length-1; if(w==="ytd"){ var yb=A.ytdBase(); return {a:yb>=0?yb:L-252,L:L}; } return {a:L-(+w),L:L}; }
function wLab(w){ return w==="ytd"?"YTD":w+" bars"; }
function rets(sym,w){ var h=H(), c=h.syms[sym]; if(!c) return null; var R=winRange(w), o=[]; for(var i=R.a+1;i<=R.L;i++) o.push(i>=1?A.ret(c,i):null); return o; }
function pc(x,y){ if(!x||!y) return null; var a=[],b=[]; for(var i=0;i<x.length;i++) if(x[i]!==null&&y[i]!==null){ a.push(x[i]); b.push(y[i]); } return a.length>=Math.max(20,Math.floor(x.length*0.8))?A.corr(a,b):null; }
function basket(list,w){ var h=H(), R=winRange(w), o=[]; for(var i=R.a+1;i<=R.L;i++){ var s=0,k=0; list.forEach(function(sym){ var r=A.ret(h.syms[sym],i); if(r!==null){ s+=r; k++; } }); o.push(k?s/k:null); } return o; }
function strip(q,re){ return String(q).replace(re," ").replace(/\s+/g," ").trim(); }

/* ---------------- parse ---------------- */
var _qmParseX91=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q);
    if(CORW.test(t)&&!SKIP.test(t)){
      var tk=A.tickers(q), last=A.last(), follow=/\b(these|them|those|this list|that list|the list|the names above|the above|this basket|that basket)\b/.test(t)&&last&&last.syms&&last.syms.length;
      var C=QM_CTX||qmBuildCtx(), inds=C?qmIndMentions(t,C):[], sm=qmSecMentions(t), nm=t.match(/\b(\d{1,2})[- ]?(?:stocks?|names?|tickers?|symbols?|pairs?)\b/)||t.match(/\b(?:top|best|first|show|list) (\d{1,2})\b/);
      var n=nm?Math.max(1,Math.min(50,+nm[1])):0, lim=t.match(/\bcorrelat\w*[a-z ]{0,30}?(?:below|under|less than|at most|no more than|max(?:imum)?|<=?) ?(0?\.\d+)\b/);
      var mkt=/\b(?:with|to|against) (?:the )?(?:market|rsp|benchmark|index|s ?p ?500|universe|spy)\b/.test(t);
      /* low-correlation portfolio */
      if(/\b(?:portfolio|basket)\b/.test(t)&&!mkt&&/\b(?:low|lower|lowest|least|minimal|minimum|little|weak) (?:cross[- ]|mutual |pairwise )?correlat\w*|\buncorrelated\b|\bnot (?:very )?correlated\b|\bcorrelat\w*(?: (?:below|under|less than|at most|no more than|of) 0?\.\d+)? (?:between|among|amongst|with|to) (?:them|each other|one another|the names|the stocks)\b|\bcorrelat\w* (?:below|under|less than|at most|no more than) 0?\.\d+\b|\bdiversif\w* by correlation\b/.test(t)){
        var q2=strip(q,/\b(?:with|and|that have|having|of)?\s*(?:a\s+)?(?:low|lower|lowest|least|minimal|minimum|little|weak)?\s*(?:cross[- ]|mutual |pairwise )?(?:un)?correlat\w*(?:\s+(?:(?:between|among|amongst|with|to)\s+(?:them|each other|one another|the names|the stocks)|(?:below|under|less than|at most|no more than|of)\s+0?\.\d+)){0,2}|\bnot (?:very )?correlated\b|\bdiversif\w* by correlation\b/gi);
        var inner=null; try{ inner=_qmParseX91(q2); }catch(e){ inner=null; }
        if(!inner||inner._err) inner=null;
        return {kind:"hcorr",mode:"port",inner:inner,q2:q2,n:n||(inner&&inner.n)||10,thr:lim?parseFloat(lim[1]):0.5,win:winOf(t.slice(Math.max(0,t.search(/correlat/))),"252")};
      }
      if(/\b(?:least|lowest|low|most|highest|high)(?:ly)? correlat\w* (?:with|to) (?:the )?(?:market|rsp|benchmark|index|s ?p ?500|spy)\b/.test(t))
        return {kind:"hcorr",mode:"mkt",dir:/\b(?:least|lowest|low)\b/.test(t)?"low":"high",n:n||10,secIn:sm.inn,ind:inds};
      if(/\b(?:most|least|highest|lowest|negatively|inversely|un)[ -]?correlated pairs?\b|\bpairs?(?: that are| which are)? (?:most|least|negatively|highly) correlated\b|\bmost co-?moving pairs?\b/.test(t)&&tk.length<2||(tk.length<2&&!/\b(?:portfolio|basket)\b/.test(t)&&!/\b(?:sub ?sectors?|sectors?|industry|industries|groups?) pairs?\b|\bpairs? of (?:sub ?sectors?|sectors?|industries)\b/.test(t)&&/\b(?:highest|strongest|most|top|biggest|greatest|lowest|weakest|least)\b[a-z0-9 ]{0,40}\bcorrelat\w*|\bcross[- ]?correlat\w*/.test(t)&&/\bpairs?\b|\b(?:two|2) (?:tickers|stocks|names|symbols)\b|\bcross[- ]?correlat\w*|\bwith each other\b|\bbetween them\b|\bto each other\b|\b(?:from|in) different sectors\b|\bacross sectors\b/.test(t)))
        return {kind:"hcorr",mode:"gpairs",names:(function(){ var m=t.match(/\b(\d{1,2}) (?:tickers|stocks|names|symbols)\b/); return m?Math.max(2,Math.min(40,+m[1])):0; })(),related:/\b(?:related|linked|connected|shares?|shared|sharing|signals?|relationships?|look[- ]?alikes?|behav\w*|same cluster|same (?:price )?cluster|hidden groups?|in some way|converg\w*)\b/.test(t),relType:/\blook[- ]?alikes?\b|\bbehav\w* alike\b|\bbehaviour\b/.test(t)?"look-alike":(/\bhidden groups?\b/.test(t)?"Hidden Group":(/\bsame (?:price )?cluster\b/.test(t)?"price cluster":(/\bsignals?\b|\blens\w*\b|\bconverg\w*/.test(t)?"both flagged":""))),dir:/\b(?:least|lowest|negatively|inversely)\b/.test(t)?"low":(/\bun[ -]?correlated\b/.test(t)?"zero":"high"),n:n||10,ind:inds,secIn:sm.inn,cross:/\b(?:across|different|other|cross[- ]?) ?sectors?\b/.test(t),win:winOf(t,"252")};
      if(tk.length>=2) return {kind:"hcorr",mode:tk.length===2?"pair":"matrix",syms:tk.slice(0,20),win:winOf(t,"252")};
      if(follow) return {kind:"hcorr",mode:"matrix",syms:last.syms.slice(0,20),from:"last",win:winOf(t,"252")};
      if(!tk.length&&sm.inn.length===2&&/\bbetween\b|\band\b/.test(t)&&!/\bstocks?\b|\bnames?\b|\bsymbols?\b|\bwhich\b/.test(t)) return {kind:"hcorr",mode:"secpair",secs:sm.inn.slice(0,2)};
    }
  }catch(e){}
  return _qmParseX91(q);
};
QMX_KINDS.hcorr=1;
var _qmValidateAny91=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="hcorr")) return _qmValidateAny91(raw);
  try{
    var sp={kind:"hcorr",mode:raw.mode,n:Math.max(1,Math.min(50,parseInt(raw.n,10)||10)),win:["60","126","252","ytd"].indexOf(String(raw.win))>=0?String(raw.win):"252",dir:raw.dir||"high",
      thr:Math.max(0.1,Math.min(0.9,parseFloat(raw.thr)||0.5)),cross:!!raw.cross,related:!!raw.related,relType:raw.relType||"",names:Math.max(0,Math.min(40,parseInt(raw.names,10)||0)),from:raw.from||"named",
      secIn:(raw.secIn||[]).map(function(v){ return qmSecKey(v)||v; }),ind:raw.ind||[],secs:(raw.secs||[]).map(function(v){ return qmSecKey(v)||v; }),syms:(raw.syms||[]).map(function(s){ return String(s).toUpperCase(); })};
    if(["pair","matrix","gpairs","secpair","mkt","port"].indexOf(sp.mode)<0) return {error:"Unknown correlation question."};
    if(sp.mode==="port"){
      if(!raw.inner) return {error:"The portfolio part of that question could not be read; try for example “build a moderate 10 stock portfolio of healthy uptrends with low correlation between them”."};
      var v=qmValidateAny(raw.inner); if(v.error) return {error:v.error}; sp.inner=v.spec; sp.q2=raw.q2;
    }
    return {spec:sp};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

/* non-price links between two stocks: look-alike, hidden group, price cluster, shared signal lenses */
var LINKC=null;
function links(){
  var h=H(), st=h?String(h.savedAt)+"|"+h.dates.length:""; if(LINKC&&LINKC.st===st) return LINKC.fn;
  var nb={}, hg={}, cl={}, fl={}, FL={ta:"Trend age",sd:"Structural drift",ms:"Momentum shape",sm:"Structure map",an:"Anomaly",at:"Attention"};
  try{ var pool=buildVectors(); pool.forEach(function(s){ nb[s.sym]=pool.filter(function(o){ return o!==s; }).map(function(o){ return {s:o.sym,d:dist2(s._v,o._v)}; }).sort(function(a,b){ return a.d-b.d; }).slice(0,5).map(function(x){ return x.s; }); }); }catch(e){}
  try{ if(swOk()&&moX().stockKeys.indexOf("peer")>=0) relClusters("stocks",0.6).clusters.forEach(function(c){ c.members.forEach(function(r){ hg[r.sym]=c.id; }); }); }catch(e){}
  try{ var CLS=window.__hxClusters, Mc=CLS&&CLS.build("252"); if(Mc){ var g=CLS.flat(Mc,0.5); Mc.names.forEach(function(x,k){ cl[x.sym]=g[k]; }); } }catch(e){}
  try{ SYM.forEach(function(s){ try{ fl[s.sym]=cgConvergence(s).flags; }catch(e){} }); }catch(e){}
  var fn=function(a,b){ var w=[];
    if((nb[a]&&nb[a].indexOf(b)>=0)||(nb[b]&&nb[b].indexOf(a)>=0)) w.push("behaviour look-alike");
    if(hg[a]!==undefined&&hg[a]===hg[b]) w.push("same Hidden Group");
    if(cl[a]!==undefined&&cl[a]===cl[b]) w.push("same price cluster");
    if(fl[a]&&fl[b]){ var sh=Object.keys(FL).filter(function(k){ return fl[a][k]&&fl[b][k]; }); if(sh.length) w.push("both flagged: "+sh.map(function(k){ return FL[k]; }).join(", ")); }
    return w; };
  LINKC={st:st,fn:fn}; return fn;
}

/* ---------------- run ---------------- */
var _qmRunX91=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hcorr")) return _qmRunX91(spec,ctx,res,t0);
  var h=H();
  function fin(n,q){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=q===undefined?n:q; res.ms=Date.now()-t0; return res; }
  if(!h){ res.lead="Correlation questions are answered from the daily price history (part E), which is not loaded in this view."; res.notes.push("Load it in Ask the terminal with “Load price history”, then ask again."); return fin(0); }
  var by={}; ctx.rows.forEach(function(r){ by[r.sym]=r; });
  function secN(s){ return by[s]?qmSecName(by[s].sec):"ETF / not in scan"; }
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  var M="Correlation of daily returns from the part E price history: +1 moves identically, 0 unrelated, −1 opposite.";

  if(spec.mode==="pair"){
    var a=spec.syms[0], b=spec.syms[1]; if(!h.syms[a]||!h.syms[b]){ res.lead="Both names must be in the loaded price history ("+[a,b].filter(function(s){ return !h.syms[s]; }).join(", ")+" is not)."; return fin(0); }
    var rows=["60","126","ytd","252"].map(function(w){ return [wLab(w),qmN(pc(rets(a,w),rets(b,w)),3)]; });
    try{ var ser=hstBuildSeries(); if(ser&&ser.length>=4){ rows.push(["Saved severity ("+ser.length+" runs)",qmN(cmPairCorr(a,b,ser,1),3)]); rows.push(["Saved composite ("+ser.length+" runs)",qmN(cmPairCorr(a,b,ser,4),3)]); } else res.notes.push("The severity matrix (saved runs) needs at least 4 saved runs; "+(ser?ser.length:0)+" so far."); }catch(e){}
    var L=h.dates.length-1, peak=null, low=null, ca=h.syms[a], cb=h.syms[b];
    for(var e=Math.max(61,L-251);e<=L;e++){ var xs=[],ys=[]; for(var i=e-59;i<=e;i++){ var p=A.ret(ca,i), q=A.ret(cb,i); if(p!==null&&q!==null){ xs.push(p); ys.push(q); } } var r=xs.length>=48?A.corr(xs,ys):null; if(r===null) continue; if(!peak||r>peak.r) peak={r:r,d:h.dates[e]}; if(!low||r<low.r) low={r:r,d:h.dates[e]}; }
    var r252=pc(rets(a,"252"),rets(b,"252"));
    res.lead="<b>"+a+"</b> and <b>"+b+"</b>: daily-return correlation <b>"+qmN(r252,3)+"</b> over 252 bars ("+(r252===null?"not enough shared bars":(Math.abs(r252)>=0.7?"very closely tied":(Math.abs(r252)>=0.5?"clearly tied":(Math.abs(r252)>=0.3?"loosely tied":"barely related"))))+(r252!==null&&r252<0?", moving in opposite directions":"")+").";
    res.table={head:["Window","Correlation"],align:["l","r"],body:rows};
    if(peak) res.notes.push("Rolling 60-bar correlation over the last year: highest "+qmN(peak.r,3)+" on "+peak.d+", lowest "+qmN(low.r,3)+" on "+low.d+".");
    res.notes.push(M+" Sectors: "+secN(a)+" / "+secN(b)+". Ask “pair test "+a+" "+b+"” to check it as a pairs trade.");
    res.send=send([a,b],"pair "+a+" – "+b); return fin(1);
  }
  if(spec.mode==="matrix"){
    var S=spec.syms.filter(function(s){ return h.syms[s]; }), miss=spec.syms.filter(function(s){ return !h.syms[s]; }); S=S.slice(0,15);
    if(S.length<2){ res.lead=spec.from==="last"?"The previous answer has fewer than two names with price history ("+(S.join(", ")||"none")+"). Ask for a list first, then \u201Chow correlated are these\u201D.":"Need at least two names in the price history."; return fin(0); }
    var V=S.map(function(s){ return rets(s,spec.win); }), Rm={}, pairs=[], i2,j2;
    for(i2=0;i2<S.length;i2++) for(j2=i2+1;j2<S.length;j2++){ var r2=pc(V[i2],V[j2]); Rm[i2+","+j2]=r2; if(r2!==null) pairs.push({a:S[i2],b:S[j2],r:r2}); }
    pairs.sort(function(p,q){ return q.r-p.r; }); var avg=pairs.length?pairs.reduce(function(s,p){ return s+p.r; },0)/pairs.length:null;
    res.lead="Correlation matrix of <b>"+S.length+"</b> names"+(spec.from==="last"?" from the previous answer":"")+", "+wLab(spec.win)+": average pairwise correlation <b>"+qmN(avg,2)+"</b>"+(pairs.length?"; most tied "+pairs[0].a+" – "+pairs[0].b+" "+qmN(pairs[0].r,2)+", least tied "+pairs[pairs.length-1].a+" – "+pairs[pairs.length-1].b+" "+qmN(pairs[pairs.length-1].r,2):"")+".";
    res.table={head:["Symbol"].concat(S),align:["l"].concat(S.map(function(){ return "r"; })),body:S.map(function(s,i){ return [s].concat(S.map(function(x,j){ return i===j?"1.00":qmN(i<j?Rm[i+","+j]:Rm[j+","+i],2); })); })};
    res.extra=[{title:"Pairs, most tied first",table:{head:["Pair","Correlation","Sectors"],align:["l","r","l"],body:pairs.slice(0,20).map(function(p){ return [p.a+" – "+p.b,qmN(p.r,3),secN(p.a)+(secN(p.a)!==secN(p.b)?" / "+secN(p.b):"")]; })}}];
    res.notes.push(M+" As a rule of thumb for diversification, an average under about 0.3 is well spread and above 0.6 the names mostly move as one. See it drawn: Correlation matrix tab → Names: Your list → Use the last Ask answer."+(spec.syms.length>15?" Only the first 15 names are shown.":"")+(miss.length?" Not in the price history: "+miss.join(", ")+".":""));
    res.send=send(S,"correlation matrix names"); return fin(S.length);
  }
  if(spec.mode==="secpair"){
    var ks=spec.secs.filter(function(k){ return ctx.rows.some(function(r){ return r.sec===k; }); }); if(ks.length<2){ res.lead="Name two sectors."; return fin(0); }
    function mem(k){ return ctx.rows.filter(function(r){ return r.sec===k&&h.syms[r.sym]; }).map(function(r){ return r.sym; }); }
    var ma=mem(ks[0]), mb=mem(ks[1]);
    res.table={head:["Window","Correlation"],align:["l","r"],body:["60","126","ytd","252"].map(function(w){ return [wLab(w),qmN(pc(basket(ma,w),basket(mb,w)),3)]; })};
    res.lead="<b>"+qmSecName(ks[0])+"</b> and <b>"+qmSecName(ks[1])+"</b>: correlation of their equal-weight baskets' daily returns ("+ma.length+" and "+mb.length+" names).";
    res.notes.push("Each sector is an equal-weight basket of its scan stocks, rebalanced daily. The full 11 by 11 view is on the Relationship map tab (Hidden price relationships), with a change view of 60 against 252 bars.");
    return fin(4);
  }
  if(spec.mode==="mkt"){
    var Mx=A.metrics(), list=ctx.rows.filter(function(r){ var m=Mx.by[r.sym]; return m&&!m.stale&&num(m.crsp)&&(!spec.secIn.length||spec.secIn.indexOf(r.sec)>=0)&&(!spec.ind.length||spec.ind.indexOf(r.ind)>=0); });
    list.sort(function(p,q){ var a1=Mx.by[p.sym].crsp, b1=Mx.by[q.sym].crsp; return spec.dir==="low"?a1-b1:b1-a1; });
    var L2=list.slice(0,spec.n), bn=Mx.bench||"RSP";
    res.lead="The "+L2.length+" stocks "+(spec.dir==="low"?"<b>least</b>":"<b>most</b>")+" correlated with the market ("+bn+", 12 months of daily returns):";
    res.table={head:["Rank","Symbol","Corr. to "+bn,"Beta","12M return","12M vol.","Sector","Subsector"],align:["r","l","r","r","r","r","l","l"],body:L2.map(function(r,i){ var m=Mx.by[r.sym]; return [String(i+1),r.sym,qmN(m.crsp,3),qmN(m.beta,2),qmN(m.m12,2,1),num(m.vol12)?qmN(m.vol12,1)+"%":"–",qmSecName(r.sec),r.ind]; })};
    res.notes.push("From the part E history: correlation and beta of each stock's daily returns to "+bn+" over the last 252 bars. Low correlation means the stock's moves are mostly its own story, useful for diversification; it is not the same as low risk (check the volatility column).");
    res.send=send(L2.map(function(r){ return r.sym; }),(spec.dir==="low"?"least":"most")+" market-correlated"); return fin(L2.length,list.length);
  }
  if(spec.mode==="gpairs"){
    var pool=ctx.rows.filter(function(r){ return h.syms[r.sym]&&(!spec.ind.length||spec.ind.indexOf(r.ind)>=0)&&(spec.ind.length||!spec.secIn.length||spec.secIn.indexOf(r.sec)>=0); });
    if(!spec.ind.length&&spec.secIn.length===2) spec.cross=true;
    if(spec.ind.length===2) spec.crossInd=true;
    if(pool.length>600) pool=pool.slice(0,600);
    var Z=[]; pool.forEach(function(r){ var v=rets(r.sym,spec.win); if(!v) return; for(var k=0;k<v.length;k++) if(v[k]===null) return; var m=0; v.forEach(function(x){ m+=x; }); m/=v.length; var ss=0; v.forEach(function(x){ ss+=(x-m)*(x-m); }); ss=Math.sqrt(ss); if(!(ss>0)) return; Z.push({r:r,z:v.map(function(x){ return (x-m)/ss; })}); });
    var out=[], cmp=spec.dir==="high"?function(p,q){ return q.v-p.v; }:(spec.dir==="low"?function(p,q){ return p.v-q.v; }:function(p,q){ return Math.abs(p.v)-Math.abs(q.v); }), K=spec.related?1500:(spec.names?Math.max(spec.n,spec.names*2):spec.n);
    for(var x=0;x<Z.length;x++) for(var y=x+1;y<Z.length;y++){ if(spec.cross&&Z[x].r.sec===Z[y].r.sec) continue; if(spec.crossInd&&Z[x].r.ind===Z[y].r.ind) continue; var d=0, za=Z[x].z, zb=Z[y].z; for(var t=0;t<za.length;t++) d+=za[t]*zb[t]; out.push({a:Z[x].r,b:Z[y].r,v:d}); if(out.length>K*50){ out.sort(cmp); out.length=K; } }
    out.sort(cmp);
    var LK=null;
    if(spec.related){ LK=links(); out=out.filter(function(p){ p.why=LK(p.a.sym,p.b.sym); return spec.relType?p.why.some(function(w){ return w.indexOf(spec.relType)>=0; }):p.why.length>0; }); }
    var L3;
    if(spec.names){ var seen={}, cnt=0; L3=[]; for(var z=0;z<out.length&&cnt<spec.names;z++){ var p0=out[z]; L3.push(p0); [p0.a.sym,p0.b.sym].forEach(function(s){ if(!seen[s]){ seen[s]=1; cnt++; } }); } }
    else L3=out.slice(0,spec.n);
    var where=spec.ind.length===2?"between "+spec.ind.join(" and "):spec.ind.length?spec.ind.join(", "):spec.secIn.length===2?"between "+spec.secIn.map(qmSecName).join(" and "):(spec.secIn.length?spec.secIn.map(qmSecName).join(", "):"the whole scan");
    res.lead="The "+L3.length+" "+(spec.dir==="high"?"most correlated":(spec.dir==="low"?"least (most negatively) correlated":"least related (closest to zero)"))+(L3.length===1?" pair":" pairs")+(spec.cross&&where.indexOf("between ")!==0?" across sectors":"")+(where.indexOf("between ")===0?" ":" in ")+where+", "+wLab(spec.win)+", out of "+(Z.length*(Z.length-1)/2)+" pairs:";
    if(spec.related) res.lead=res.lead.replace(/ pairs?(?= )/,function(m){ return m+" that "+(L3.length===1?"is":"are")+" also related ("+(spec.relType==="look-alike"?"behaviour look-alikes":spec.relType==="Hidden Group"?"in the same Hidden Group":spec.relType==="price cluster"?"in the same price cluster":spec.relType==="both flagged"?"sharing at least one Signal convergence lens":"a behaviour look-alike, the same Hidden Group, the same price cluster or shared signal lenses")+")"; }).replace(" in between "," between ");
    res.table={head:["Rank","Pair","Correlation","Sectors","Subsectors"].concat(spec.related?["Also linked by"]:[]),align:["r","l","r","l","l"].concat(spec.related?["l"]:[]),body:L3.map(function(p,i){ return [String(i+1),p.a.sym+" – "+p.b.sym,qmN(p.v,3),qmSecName(p.a.sec)+(p.a.sec!==p.b.sec?" / "+qmSecName(p.b.sec):""),p.a.ind+(p.a.ind!==p.b.ind?" / "+p.b.ind:"")].concat(spec.related?[p.why.join("; ")]:[]); })};
    if(spec.related) res.notes.push("Related means at least one link besides price: behaviour look-alike (among each other's five closest on the nine scan features, as on the Relationship map), the same Hidden Group (link 0.60), the same cluster of the hierarchical clusters map (252 bars, average correlation 0.50), or both flagged by the same Signal convergence lens.");
    res.notes.push(M+" Ask “pair test A B” on any pair, or “correlation matrix of ...” for several names.");
    var ss2=[]; L3.forEach(function(p){ ss2.push(p.a.sym,p.b.sym); }); res.send=send(ss2.filter(function(s,i,a){ return a.indexOf(s)===i; }),"correlated pairs"); return fin(L3.length);
  }
  if(spec.mode==="port"){
    var inner=JSON.parse(JSON.stringify(spec.inner)), N=spec.n;
    if("n" in inner) inner.n=Math.min(50,Math.max(N*4,20));
    var r0=null; try{ r0=qmRun(inner,ctx); }catch(e){ r0=null; }
    var cand=[]; if(r0&&r0.send&&r0.send.items) cand=r0.send.items.map(function(x){ return x.sym; });
    else if(r0&&r0.table&&r0.table.head){ var ix=r0.table.head.indexOf("Symbol"); if(ix>=0) r0.table.body.forEach(function(rw){ var s=String(rw[ix]); if(by[s]&&cand.indexOf(s)<0) cand.push(s); }); }
    cand=cand.filter(function(s){ return h.syms[s]; });
    if(cand.length<2){ res.lead="The portfolio rules found too few candidates to diversify ("+cand.length+"). Loosen the question and try again."; return fin(0); }
    var V2={}; cand.forEach(function(s){ V2[s]=rets(s,spec.win); });
    var CC={}; function cc(a,b){ var k=a<b?a+"|"+b:b+"|"+a; if(!(k in CC)) CC[k]=pc(V2[a],V2[b]); return CC[k]; }
    if(cand.length<=N){ var aa=0,kk=0; for(var i4=0;i4<cand.length;i4++) for(var j4=i4+1;j4<cand.length;j4++){ var r4=pc(V2[cand[i4]],V2[cand[j4]]); if(r4!==null){ aa+=r4; kk++; } }
      res.lead="The portfolio rules for \u201C"+(spec.q2||"")+"\u201D give only <b>"+cand.length+"</b> names, so there is nothing to choose between on correlation. Their average pairwise correlation is <b>"+qmN(kk?aa/kk:null,2)+"</b> ("+wLab(spec.win)+"). Loosen a rule (for example a wider risk level or a higher per-sector cap) to give the correlation step more to choose from.";
      res.send=send(cand,"portfolio names"); return fin(cand.length); }
    var pick=[], thr=spec.thr, used=thr;
    while(pick.length<N&&used<=0.85){ cand.forEach(function(s){ if(pick.length>=N||pick.indexOf(s)>=0) return; if(pick.every(function(p){ var r=cc(s,p); return r===null||r<=used; })) pick.push(s); }); if(pick.length<N) used=Math.round((used+0.1)*10)/10; }
    function avgOf(list){ var s=0,k=0; for(var i=0;i<list.length;i++) for(var j=i+1;j<list.length;j++){ var r=cc(list[i],list[j]); if(r!==null){ s+=r; k++; } } return k?s/k:null; }
    var plain=cand.slice(0,Math.min(N,cand.length)), aP=avgOf(pick), aN=avgOf(plain);
    res.lead="A "+pick.length+"-stock portfolio chosen for <b>low correlation between its names</b>: average pairwise correlation <b>"+qmN(aP,2)+"</b> ("+wLab(spec.win)+"), against "+qmN(aN,2)+" for the plain top "+plain.length+" from the same rules. Every pair is at or under <b>"+qmN(used,2)+"</b>"+(used>thr?" (the limit of "+qmN(thr,2)+" was loosened to fill the list)":"")+".";
    res.table={head:["Rank","Symbol","Rank in the rules' list","Highest corr. to another pick","With","Avg corr. to the picks","Sector","Subsector"],align:["r","l","r","r","l","r","l","l"],
      body:pick.map(function(s,i){ var best=null; pick.forEach(function(p){ if(p===s) return; var r=cc(s,p); if(r!==null&&(!best||r>best.r)) best={r:r,p:p}; }); var tt=0,kk=0; pick.forEach(function(p){ if(p===s) return; var r=cc(s,p); if(r!==null){ tt+=r; kk++; } });
        return [String(i+1),s,String(cand.indexOf(s)+1),best?qmN(best.r,2):"–",best?best.p:"",kk?qmN(tt/kk,2):"–",by[s]?qmSecName(by[s].sec):"",by[s]?by[s].ind:""]; })};
    var secC={}; pick.forEach(function(s){ var k=by[s]?qmSecName(by[s].sec):"other"; secC[k]=(secC[k]||0)+1; });
    res.notes.push("How it was built: the candidates come from the portfolio or screen rules for “"+(spec.q2||"")+"” (risk level, caps and filters applied exactly as that question would, "+cand.length+" candidates in their own order); a name is added only if its daily-return correlation with every name already chosen is at or under the limit. Say “correlation below 0.3” for a stricter limit. Sectors: "+Object.keys(secC).map(function(k){ return k+" "+secC[k]; }).join(", ")+".");
    res.notes.push("Next: “give me a diagnostic of these” for the basket's drawdown and volatility against RSP, or draw it on the Correlation matrix tab (Your list → Use the last Ask answer). Equal weights; not a forecast.");
    res.send=send(pick,"low-correlation portfolio"); return fin(pick.length,cand.length);
  }
  return fin(0);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Correlation questions from the history: {\"kind\":\"hcorr\",\"mode\":\"pair\"|\"matrix\"|\"gpairs\"|\"secpair\"|\"mkt\"|\"port\",\"syms\":[...],\"win\":\"60\"|\"126\"|\"ytd\"|\"252\",\"dir\":\"high\"|\"low\"|\"zero\",\"secIn\":[...],\"ind\":[...],\"secs\":[two sector keys],\"cross\":true|false,\"n\":1-50,\"thr\":0.1-0.9}\n\nQ: "); }catch(e){}
try{ ["What is the correlation between NVDA and AMD?","Correlation matrix of XOM CVX COP SLB EOG","Most correlated pairs across sectors","Which stocks are least correlated with the market?","Build a moderate 10 stock portfolio of healthy uptrends with low correlation between them"].forEach(function(q){ if(QMX_EX20.indexOf(q)<0) QMX_EX20.push(q); });
  var sm=document.querySelector("#qmEx20 summary"); if(sm) sm.textContent=QMX_EX20.length+" example questions: click Run, or Copy and paste your own edit"; }catch(e){}
}catch(e){ try{ console.warn("v91 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
