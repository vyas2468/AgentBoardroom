/* ================= v94: Ask the terminal, charts, cluster portfolios, hedges and signal convergence =================
   1. Charts in answers ("plot", "chart", "draw"): price rebased to 100, YTD return, relative strength against RSP, drawdown,
      rolling volatility, rolling correlation, pair spread z-score, sector baskets, the previous answer's names. Each chart is an
      SVG in the answer with a numbers table under it, and gets the page's "Save as PNG (3x)" button.
   2. Portfolios from the hierarchical clusters: "one per cluster" (the original rules pick the candidates, at most one name from
      each cluster), and "the strongest name from each rising block".
   3. Hedges and partners of a whole list: "hedges for these", "what moves with these".
   4. Signal convergence (the Signal convergence map's count of six lenses) as a field and as words: "signals converge".
   Only questions with these words reach this code; every other question is parsed as before. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var FOLLOW=/\b(these|them|those|this list|that list|the list|this portfolio|that portfolio|the portfolio|the basket|this basket|that basket|the names above|the above)\b/;

/* ---------------- 4. signal convergence ---------------- */
QM_SYM.conv={lab:"Signal convergence (lenses flagging, 0 to 6)",d:0};
var _qmEnrich94=qmEnrich;
qmEnrich=function(ctx){ var r=_qmEnrich94(ctx); try{ var by={}; SYM.forEach(function(s){ by[s.sym]=s; }); ctx.rows.forEach(function(x){ var s=by[x.sym]; var c=null; try{ c=s?cgConvergence(s).score:null; }catch(e){ c=null; } x.conv=num(c)?c:null; }); }catch(e){} return r; };
var CONV=[[/\b(?:signals? (?:are )?converg\w*|converging signals?|high (?:signal )?convergence|strong (?:signal )?convergence|several lenses|multiple lenses|lenses agree|most lenses)\b/,3,"signals converge (3 or more of the six Signal convergence lenses flag it)"],
          [/\b(?:some (?:signal )?convergence|at least two lenses|two or more lenses)\b/,2,"some convergence (2 or more of the six lenses flag it)"]];
try{ "converge converging convergence lenses lens".split(" ").forEach(function(w){ QMX_VOCSET[w]=1; }); }catch(e){}
var _qmConds94=qmConds;
qmConds=function(t){
  var s=String(t), add=null;
  CONV.forEach(function(c){ if(add) return; var re=new RegExp(c[0].source,"g"); if(re.test(s)){ s=s.replace(new RegExp(c[0].source,"g"),function(m){ return new Array(m.length+1).join(" "); }); add={f:"conv",op:">=",v:c[1],kw:1,txt:c[2]}; } });
  var r=_qmConds94(s);
  if(add&&!r.filters.some(function(f){ return f.f==="conv"; })) r.filters=[add].concat(r.filters);
  return r;
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","conv = Signal convergence count (0 to 6 lenses flagging the name). “signals converge” means conv 3 or more.\n\nQ: "); }catch(e){}

/* ---------------- series helpers ---------------- */
function idxRange(win,L){ if(win==="ytd"){ var yb=A.ytdBase(); return yb>=0?yb:Math.max(0,L-252); } if(win==="all") return 0; return Math.max(0,L-(+win)); }
function winOf(t,def){ if(/\b60\b|\b3 months?\b|\bthree months?\b/.test(t)) return "60"; if(/\b126\b|\b6 months?\b|\bsix months?\b/.test(t)) return "126"; if(/\b20\b|\bmonth\b|\b1 month\b/.test(t)&&!/\b12 months?\b/.test(t)) return "21"; if(/\bytd\b|\byear to date\b|\bthis year\b/.test(t)) return "ytd"; if(/\b252\b|\b12 months?\b|\ba year\b|\bone year\b|\blast year\b/.test(t)) return "252"; return def; }
function wLab(w){ return w==="ytd"?"YTD":(w==="all"?"all history":(w==="21"?"1 month":w+" bars")); }
var PAL=["#3b82f6","#f59e0b","#10b981","#ef4444","#a855f7","#06b6d4","#84cc16","#f97316"];
function basketCloses(list,a,L){ var h=H(), v=[], eq=100; for(var i=a;i<=L;i++){ if(i===a){ v.push(100); continue; } var s=0,k=0; list.forEach(function(x){ var r=A.ret(h.syms[x],i); if(r!==null){ s+=r; k++; } }); eq*=1+(k?s/k:0); v.push(eq); } return v; }

/* ---------------- the SVG line chart ---------------- */
function chart(series,o){
  var h=H(), W=920, Hh=340, ml=58, mr=86, mt=34, mb=40, iw=W-ml-mr, ih=Hh-mt-mb, lo=Infinity, hi=-Infinity, n=0;
  series.forEach(function(s){ n=Math.max(n,s.v.length); s.v.forEach(function(v){ if(num(v)){ if(v<lo) lo=v; if(v>hi) hi=v; } }); });
  (o.refs||[]).forEach(function(r){ if(r.v<lo) lo=r.v; if(r.v>hi) hi=r.v; });
  if(!(hi>lo)){ hi=lo+1; lo=lo-1; } var pad=(hi-lo)*0.06; hi+=pad; lo-=pad;
  function X(k){ return ml+k*iw/Math.max(1,n-1); } function Y(v){ return mt+(hi-v)*ih/(hi-lo); }
  var st=(hi-lo)/5, p10=Math.pow(10,Math.floor(Math.log(st)/Math.LN10)), step=[1,2,2.5,5,10].map(function(m){ return m*p10; }).filter(function(x){ return x>=st; })[0]||st;
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(o.title)+'" style="width:100%;height:auto;max-width:980px;display:block;background:var(--surface)">'];
  s.push('<text x="'+ml+'" y="18" font-size="13" font-weight="700" fill="var(--ink)">'+hE(o.title)+'</text>');
  for(var g=Math.ceil(lo/step)*step; g<=hi; g+=step){ var y=Y(g).toFixed(1); s.push('<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)" stroke-width="0.7"/><text x="'+(ml-6)+'" y="'+(+y+3.5)+'" text-anchor="end" font-size="10.5" fill="var(--ink-3)">'+(o.fmt?o.fmt(g):+g.toFixed(2))+'</text>'); }
  var d0=o.dates||[]; for(var q=0;q<6;q++){ var k=Math.round(q*(n-1)/5); if(d0[k]){ var xx=X(k).toFixed(1); s.push('<line x1="'+xx+'" x2="'+xx+'" y1="'+mt+'" y2="'+(mt+ih)+'" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="2 3"/><text x="'+xx+'" y="'+(Hh-mb+16)+'" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">'+hE(d0[k])+'</text>'); } }
  (o.refs||[]).forEach(function(r){ var y=Y(r.v).toFixed(1); s.push('<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="'+(r.c||"var(--ink-2)")+'" stroke-width="1.1" stroke-dasharray="5 4"/>'+(r.l?'<text x="'+(W-mr+4)+'" y="'+(+y+3.5)+'" font-size="10" fill="'+(r.c||"var(--ink-2)")+'">'+hE(r.l)+'</text>':'')); });
  var ends=[];
  series.forEach(function(se){ var dd="",pen=false; se.v.forEach(function(v,k){ if(!num(v)){ pen=false; return; } dd+=(pen?"L":"M")+X(k).toFixed(1)+" "+Y(v).toFixed(1); pen=true; });
    s.push('<path d="'+dd+'" fill="none" stroke="'+se.c+'" stroke-width="'+(se.dash?1.4:1.9)+'"'+(se.dash?' stroke-dasharray="5 4"':'')+'/>');
    var last=null; for(var k2=se.v.length-1;k2>=0;k2--) if(num(se.v[k2])){ last={k:k2,v:se.v[k2]}; break; } if(last) ends.push({y:Y(last.v),t:se.name+" "+(o.fmt?o.fmt(last.v):last.v.toFixed(2)),c:se.c}); });
  ends.sort(function(a,b){ return a.y-b.y; }); for(var e=1;e<ends.length;e++) if(ends[e].y-ends[e-1].y<12) ends[e].y=ends[e-1].y+12;
  ends.forEach(function(e2){ s.push('<text x="'+(W-mr+4)+'" y="'+(e2.y+3.5).toFixed(1)+'" font-size="10.5" font-weight="700" fill="'+e2.c+'">'+hE(e2.t)+'</text>'); });
  s.push('</svg>');
  return '<div class="chart-scroll hx94plot" style="margin:8px 0">'+s.join("")+'</div>';
}

/* ---------------- parse ---------------- */
var PLOT=/\b(?:plot|plots|chart|charts|draw|visuali[sz]e|line chart)\b|\bgraph (?:of|the|for|showing|how)\b|\bshow me (?:a |the )?graph\b/;
var _qmParseX94=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q), tk=A.tickers(q), last=A.last(), fol=FOLLOW.test(t)&&last&&last.syms&&last.syms.length;
    var nm=t.match(/\b(\d{1,2})[- ]?(?:stocks?|names?|tickers?|symbols?)\b/)||t.match(/\b(?:top|best|first|show|list) (\d{1,2})\b/), n=nm?Math.max(1,Math.min(50,+nm[1])):0;
    /* 0. diagnostics of sectors and subsectors */
    if(/\bdiagnos\w*\b/.test(t)&&!tk.length&&!fol){
      var C0=QM_CTX||qmBuildCtx(), ss=qmSecMentions(t).inn, ii=C0?qmIndMentions(t,C0):[];
      if(ii.length&&!/\bsectors?\b(?! ?(?:and|&) ?sub)/.test(t.replace(/\bsub ?sectors?\b/g,""))){ var mem=C0.rows.filter(function(r){ return ii.indexOf(r.ind)>=0; }).map(function(r){ return r.sym; }); if(mem.length) return {kind:"diag",syms:mem.slice(0,60),from:"named"}; }
      if(ss.length||/\b(?:all|every|each) sectors?\b|\bsectors?\b|\bsubsectors?\b|\bindustr\w*\b/.test(t)) return {kind:"hcport",mode:"gdiag",secs:ss,subs:ss.length>0||/\bsubsectors?\b|\bindustr\w*\b/.test(t)};
    }
    /* 1. charts */
    if(PLOT.test(t)&&!/\bgraph anomal/.test(t)){
      var C=QM_CTX||qmBuildCtx(), sm=qmSecMentions(t).inn, syms=tk.slice(0,8), from="named";
      if(!syms.length&&fol){ syms=last.syms.slice(0,40); from="last"; }
      var type=/\bspread\b|\bz-?score\b/.test(t)?"spread":(/\brolling correlation\b|\bcorrelation\b/.test(t)?"rcorr":(/\bdrawdowns?\b|\bunderwater\b/.test(t)?"dd":(/\bvolatility\b|\bvol\b/.test(t)?"vol":(/\brelative strength\b|\bvs\.? (?:the )?(?:rsp|market|benchmark)\b|\bagainst (?:the )?(?:rsp|market|benchmark)\b|\brelative to (?:the )?(?:rsp|market|benchmark)\b|\bratio\b/.test(t)?"rs":(/\bytd\b|\byear to date\b/.test(t)&&!/\bprice\b/.test(t)?"ytd":"price")))));
      if(syms.length||sm.length>=1) return {kind:"hplot",type:type,syms:syms,secs:syms.length?[]:sm.slice(0,6),from:from,win:winOf(t,type==="ytd"?"ytd":(type==="dd"||type==="vol"||type==="rcorr"||type==="spread"?"252":"all"))};
    }
    /* 2. portfolios from the clusters */
    var portW=/\b(?:portfolio|basket|stocks|names|list)\b/.test(t);
    if(portW&&/\b(?:one|1) (?:stock |name )?(?:per|from each|in each|for each) (?:cluster|block|bloc)\b|\b(?:across|from) different clusters\b|\bno two (?:stocks |names )?(?:from|in) the same cluster\b|\bdiversif\w* (?:by|across) clusters?\b/.test(t)){
      var q2=String(q).replace(/,?\s*\b(?:with |and |taking |using )?(?:only )?(?:one|1) (?:stock |name )?(?:per|from each|in each|for each) (?:cluster|block|bloc)\b|,?\s*\b(?:from|across) different clusters\b|,?\s*\bno two (?:stocks |names )?(?:from|in) the same cluster\b|,?\s*\bdiversif\w* (?:by|across) clusters?\b/gi," ").replace(/\s+/g," ").trim();
      var inner=null; try{ inner=_qmParseX94(q2); }catch(e){ inner=null; } if(inner&&inner._err) inner=null;
      return {kind:"hcport",mode:"oneper",inner:inner,q2:q2,n:n||(inner&&inner.n)||10,win:winOf(t,"252")};
    }
    if(portW&&/\b(?:best|strongest|top|leading) (?:stock|name) (?:in|from|of) each (?:rising |falling |directional )?(?:block|cluster)\b|\b(?:one|1) (?:stock|name) from each (?:rising|falling|directional) (?:block|cluster)\b|\b(?:portfolio|basket) (?:from|of|using) (?:the )?(?:rising|falling|directional) (?:blocks|clusters)\b|\bfrom (?:the )?(?:rising|falling) (?:blocks|clusters)\b/.test(t))
      return {kind:"hcport",mode:"blocks",dir:/\bfalling\b/.test(t)?"falling":"rising",n:n||0,win:winOf(t,"ytd")};
    /* 3. hedges and partners of a whole list */
    if(fol&&/\bhedg\w*\b/.test(t)) return {kind:"hcport",mode:"hedge",syms:last.syms.slice(0,50),n:n||10,cross:/\b(?:other|another|different) sectors?\b|\boutside\b/.test(t)};
    if(fol&&/\b(?:moves?|moving|trades?) (?:most )?(?:with|like) (?:these|them|this list|the list|this portfolio|the basket)\b/.test(t)) return {kind:"hcport",mode:"partners",syms:last.syms.slice(0,50),n:n||10};
  }catch(e){}
  return _qmParseX94(q);
};
QMX_KINDS.hplot=1; QMX_KINDS.hcport=1;
var _qmValidateAny94=qmValidateAny;
qmValidateAny=function(raw){
  if(!raw||(raw.kind!=="hplot"&&raw.kind!=="hcport")) return _qmValidateAny94(raw);
  try{
    var sp=JSON.parse(JSON.stringify(raw)); delete sp.inner;
    if(raw.kind==="hcport"&&raw.mode==="oneper"){ if(!raw.inner) return {error:"The portfolio part could not be read; try for example “build a moderate 10 stock portfolio of healthy uptrends, one per cluster”."}; var v=qmValidateAny(raw.inner); if(v.error) return {error:v.error}; sp.inner=v.spec; }
    return {spec:sp};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

/* ---------------- run ---------------- */
var _qmRunX94=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!spec||(spec.kind!=="hplot"&&spec.kind!=="hcport")) return _qmRunX94(spec,ctx,res,t0);
  var h=H();
  function fin(n,q){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=q===undefined?n:q; res.ms=Date.now()-t0; return res; }
  if(!h){ res.lead="This is drawn from the daily price history (part E), which is not loaded in this view."; res.notes.push("Load it in Ask the terminal with “Load price history”, then ask again."); return fin(0); }
  var by={}; ctx.rows.forEach(function(r){ by[r.sym]=r; });
  var M=A.metrics(), bench=M&&M.bench, L=h.dates.length-1;
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  function secN(s){ return by[s]?qmSecName(by[s].sec):"ETF / other"; }
  function f2(v,d,p){ return num(v)?(p?((v>0?"+":"")+v.toFixed(d)+"%"):v.toFixed(d)):"–"; }

  if(spec.kind==="hplot"){
    var a=idxRange(spec.win,L), dates=h.dates.slice(a,L+1), series=[], names=[], extraNote="";
    var syms=(spec.syms||[]).filter(function(s){ return h.syms[s]; }), miss=(spec.syms||[]).filter(function(s){ return !h.syms[s]; });
    var basketMode=spec.from==="last"&&syms.length>8;
    function first(c){ var k=a; while(k<=L&&c[k]===null) k++; return k; }
    function add(name,v,c,dash){ series.push({name:name,v:v,c:c,dash:dash}); names.push(name); }
    var type=spec.type, title="", fmt=null, refs=[];
    if(spec.secs&&spec.secs.length&&!syms.length){
      spec.secs.forEach(function(k,i){ var key=qmSecKey(k)||k, mem=ctx.rows.filter(function(r){ return r.sec===key&&h.syms[r.sym]; }).map(function(r){ return r.sym; }); if(mem.length) add(qmSecName(key),basketCloses(mem,a,L),PAL[i%8]); });
      if(bench) add(bench,basketCloses([bench],a,L),cssv("--ink-3")||"#888",true);
      title="Sector baskets (equal weight), rebased to 100, "+wLab(spec.win); type="price";
    } else if(type==="spread"||type==="rcorr"){
      if(syms.length<2){ res.lead="A "+(type==="spread"?"spread":"rolling correlation")+" chart needs two tickers."; return fin(0); }
      var A1=syms[0], B1=syms[1], ca=h.syms[A1], cb=h.syms[B1];
      if(type==="rcorr"){
        [60,20].forEach(function(w,ii){ var v=[]; for(var i=a;i<=L;i++){ var xs=[],ys=[]; for(var j=Math.max(1,i-w+1);j<=i;j++){ var p=A.ret(ca,j), q=A.ret(cb,j); if(p!==null&&q!==null){ xs.push(p); ys.push(q); } } v.push(xs.length>=Math.max(15,w*0.8)?A.corr(xs,ys):null); } add(w+"-bar",v,PAL[ii],ii===1); });
        title="Rolling correlation of daily returns: "+A1+" and "+B1+", "+wLab(spec.win); refs=[{v:0,l:"0"}]; fmt=function(x){ return x.toFixed(2); };
      } else {
        var idx=[],la=[],lb=[]; for(var i2=Math.max(0,L-252);i2<=L;i2++) if(ca[i2]>0&&cb[i2]>0){ idx.push(i2); la.push(Math.log(ca[i2])); lb.push(Math.log(cb[i2])); }
        var mx=0,my=0; la.forEach(function(v,k){ mx+=lb[k]; my+=v; }); mx/=la.length; my/=la.length; var sxy=0,sxx=0; la.forEach(function(v,k){ sxy+=(lb[k]-mx)*(v-my); sxx+=(lb[k]-mx)*(lb[k]-mx); });
        var beta=sxx>0?sxy/sxx:0, al=my-beta*mx, e=la.map(function(v,k){ return v-al-beta*lb[k]; }), sd=Math.sqrt(e.reduce(function(s2,x){ return s2+x*x; },0)/(e.length-1));
        var z={}; idx.forEach(function(ix,k){ z[ix]=sd>0?e[k]/sd:null; }); a=idx[0]; dates=h.dates.slice(a,L+1);
        var v2=[]; for(var i3=a;i3<=L;i3++) v2.push(z[i3]===undefined?null:z[i3]); add("z-score",v2,PAL[0]);
        title="Spread z-score: log "+A1+" − "+beta.toFixed(2)+" × log "+B1+" (fitted on the last 252 bars)"; refs=[{v:2,l:"+2",c:"#ef4444"},{v:-2,l:"−2",c:"#ef4444"},{v:0,l:"mean"}]; fmt=function(x){ return x.toFixed(1); };
        res.notes.push("A z-score beyond ±2 means the spread is far from its usual level. That is only a trading idea if the pair also passes “pair test "+A1+" "+B1+"” (cointegration and stability).");
      }
    } else if(basketMode){
      add("Basket of "+syms.length,basketCloses(syms,a,L),PAL[0]); if(bench) add(bench,basketCloses([bench],a,L),cssv("--ink-3")||"#888",true);
      title="The previous answer's "+syms.length+" names as an equal-weight basket against "+(bench||"the benchmark")+", rebased to 100, "+wLab(spec.win); type="price";
      extraNote="With more than 8 names the chart shows them as one equal-weight basket (rebalanced daily); name up to 8 tickers to see each line.";
    } else {
      if(!syms.length){ res.lead="Name up to 8 tickers (or sectors) to chart, or ask for a list first and then say “plot these”."; return fin(0); }
      syms.forEach(function(sy,si){ var c=h.syms[sy], v=[], k0=first(c), bc=bench?h.syms[bench]:null;
        if(type==="price"){ for(var i0=a;i0<=L;i0++) v.push(i0>=k0&&c[i0]!==null?c[i0]/c[k0]*100:null); }
        else if(type==="ytd"){ for(var i4=a;i4<=L;i4++) v.push(i4>=k0&&c[i4]!==null?(c[i4]/c[k0]-1)*100:null); }
        else if(type==="rs"){ if(!bc) return; var kb=k0; while(kb<=L&&bc[kb]===null) kb++; for(var i5=a;i5<=L;i5++) v.push(i5>=kb&&c[i5]!==null&&bc[i5]!==null?(c[i5]/bc[i5])/(c[kb]/bc[kb])*100:null); }
        else if(type==="dd"){ var pk=null; for(var i6=a;i6<=L;i6++){ if(c[i6]!==null){ if(pk===null||c[i6]>pk) pk=c[i6]; v.push((c[i6]/pk-1)*100); } else v.push(null); } }
        else if(type==="vol"){ for(var i7=a;i7<=L;i7++){ var rs=[]; for(var j2=Math.max(1,i7-19);j2<=i7;j2++){ var r2=A.ret(c,j2); if(r2!==null) rs.push(r2); } var sd2=rs.length>=15?A.sd(rs):null; v.push(sd2===null?null:sd2*Math.sqrt(252)*100); } }
        add(sy,v,PAL[si%8]); });
      if(bench&&(type==="price"||type==="ytd")&&syms.indexOf(bench)<0){ var cb2=h.syms[bench], v3=[], kk=first(cb2); for(var i8=a;i8<=L;i8++) v3.push(i8>=kk&&cb2[i8]!==null?(type==="ytd"?(cb2[i8]/cb2[kk]-1)*100:cb2[i8]/cb2[kk]*100):null); add(bench,v3,cssv("--ink-3")||"#888",true); }
      title={price:"Price rebased to 100",ytd:"Return since the start of the window (%)",rs:"Relative strength against "+(bench||"the benchmark")+" (ratio rebased to 100; rising = beating it)",dd:"Drawdown from the running high (%)",vol:"Rolling 20-bar volatility (annualised %)"}[type]+", "+wLab(spec.win);
      if(type==="ytd"||type==="dd"){ fmt=function(x){ return (x>0?"+":"")+x.toFixed(0)+"%"; }; refs=[{v:0,l:"0"}]; }
      if(type==="vol") fmt=function(x){ return x.toFixed(0)+"%"; };
      if(type==="rs"||type==="price") refs=[{v:100,l:"100"}];
    }
    if(!series.length){ res.lead="Nothing to chart for that request."; return fin(0); }
    res.hxPlot=chart(series,{title:title,dates:dates,fmt:fmt,refs:refs});
    res.lead=title+(spec.from==="last"?" (names from the previous answer)":"")+". Hover-free and exact: the numbers are in the table below; the chart gets a Save as PNG button.";
    res.table={head:["Series","Start","End","Change","High","Low"],align:["l","r","r","r","r","r"],body:series.map(function(se){ var v=se.v.filter(num); if(!v.length) return [se.name,"–","–","–","–","–"]; var s0=v[0], e0=v[v.length-1];
      return [se.name,f2(s0,2),f2(e0,2),type==="price"||type==="rs"?f2((e0/s0-1)*100,1,1):f2(e0-s0,2),f2(Math.max.apply(null,v),2),f2(Math.min.apply(null,v),2)]; })};
    if(extraNote) res.notes.push(extraNote); if(miss.length) res.notes.push("Not in the price history: "+miss.join(", ")+".");
    res.notes.push("From the part E daily closes ("+dates[0]+" to "+dates[dates.length-1]+"). Other charts: price, YTD, relative strength (vs RSP), drawdown, volatility, rolling correlation (two names), spread (two names), sectors; add a window: YTD, 60 bars, 6 months, 12 months.");
    res.send=send(syms,"charted names"); return fin(series.length);
  }

  /* ---- cluster portfolios, hedges, partners ---- */
  var CL=window.__hxClusters;
  if(spec.mode==="oneper"){
    if(!CL){ res.lead="The clusters map is not available."; return fin(0); }
    var Mc=CL.build(spec.win); if(!Mc){ res.lead="Not enough price history for that window."; return fin(0); }
    var gid=CL.flat(Mc,0.5), pos={}; Mc.names.forEach(function(x,k){ pos[x.sym]=k; });
    var inner=JSON.parse(JSON.stringify(spec.inner)), N=spec.n; if("n" in inner) inner.n=Math.min(50,Math.max(N*4,20));
    var r0=null; try{ r0=qmRun(inner,ctx); }catch(e){ r0=null; }
    var cand=r0&&r0.send&&r0.send.items?r0.send.items.map(function(x){ return x.sym; }):[];
    var pick=[], used={}, skipped=[];
    cand.forEach(function(s){ if(pick.length>=N) return; var k=pos[s]; var g=k===undefined?"solo:"+s:gid[k]; if(used[g]!==undefined){ skipped.push(s+" (same cluster as "+used[g]+")"); return; } used[g]=s; pick.push(s); });
    if(!pick.length){ res.lead="The portfolio rules found no candidates."; return fin(0); }
    function avgC(list){ var s=0,k=0; for(var i=0;i<list.length;i++) for(var j=i+1;j<list.length;j++){ var a2=pos[list[i]], b2=pos[list[j]]; if(a2===undefined||b2===undefined) continue; s+=Mc.R[a2*Mc.n+b2]; k++; } return k?s/k:null; }
    res.lead="A "+pick.length+"-stock portfolio with <b>at most one name per cluster</b> (hierarchical clusters, "+wLab(spec.win)+", clusters cut at an average correlation of 0.50): average pairwise correlation <b>"+qmN(avgC(pick),2)+"</b> against "+qmN(avgC(cand.slice(0,Math.min(N,cand.length))),2)+" for the plain top "+Math.min(N,cand.length)+" from the same rules.";
    res.table={head:["Rank","Symbol","Rank in the rules' list","Cluster size","Cluster-mates in the rules' list","Sector","Subsector"],align:["r","l","r","r","l","l","l"],body:pick.map(function(s,i){ var k=pos[s], g=k===undefined?null:gid[k], size=g===null?1:Array.prototype.filter.call(gid,function(x){ return x===g; }).length;
      var mates=cand.filter(function(x){ return x!==s&&pos[x]!==undefined&&g!==null&&gid[pos[x]]===g; }); return [String(i+1),s,String(cand.indexOf(s)+1),String(size),mates.slice(0,6).join(" ")||"–",secN(s),by[s]?by[s].ind:""]; })};
    res.notes.push("How it was built: the candidates come from the rules for “"+(spec.q2||"")+"” ("+cand.length+" names in their own order); a name is skipped when a name already chosen sits in the same cluster of the hierarchical clusters map. "+(skipped.length?"Skipped: "+skipped.slice(0,8).join(", ")+(skipped.length>8?" …":"")+".":"No name had to be skipped."));
    res.notes.push("Next: “give me a diagnostic of these”, “how correlated are these”, or “plot these”.");
    res.send=send(pick,"one per cluster"); return fin(pick.length,cand.length);
  }
  if(spec.mode==="blocks"){
    if(!CL){ res.lead="The clusters map is not available."; return fin(0); }
    var Mb=CL.build(spec.win); if(!Mb){ res.lead="Not enough price history for that window."; return fin(0); }
    var bl=CL.blocks(Mb,0.263).filter(function(b){ return b.dir===spec.dir; }), rows=[];
    bl.forEach(function(b){ var mem=b.mem.map(function(x){ return Mb.names[x].sym; }).filter(function(s){ return by[s]; }); if(!mem.length) return;
      mem.sort(function(p,q){ var a3=by[p].str, b3=by[q].str; return spec.dir==="rising"?((num(b3)?b3:-1)-(num(a3)?a3:-1)):((num(a3)?a3:999)-(num(b3)?b3:999)); });
      rows.push({pick:mem[0],mem:mem,avg:b.avg,ret:b.ret,size:b.size}); });
    rows.sort(function(p,q){ return spec.dir==="rising"?q.ret-p.ret:p.ret-q.ret; }); if(spec.n) rows=rows.slice(0,spec.n);
    res.lead="The "+(spec.dir==="rising"?"strongest":"weakest")+" name from each <b>"+spec.dir+"</b> block of the hierarchical clusters map ("+wLab(spec.win)+"): "+rows.length+" names, one per block, so no two move as one.";
    res.table={head:["Block","Symbol","Strength pctl","Block return","Block avg corr.","Members","Sector"],align:["r","l","r","r","r","l","l"],body:rows.map(function(r,i){ return [String(i+1),r.pick,qmN(by[r.pick].str,0),qmN(r.ret,1,1),qmN(r.avg,2),r.mem.join(" "),secN(r.pick)]; })};
    res.notes.push("Blocks: dendrogram nodes of 3 or more names merging at an average correlation of about 0.74, where every member "+(spec.dir==="rising"?"rose":"fell")+" over the window. From each block the name with the "+(spec.dir==="rising"?"highest":"lowest")+" strength percentile is taken. Equal weights; a block is a theme, so one name per block avoids owning the same move twice.");
    res.send=send(rows.map(function(r){ return r.pick; }),"one per "+spec.dir+" block"); return fin(rows.length);
  }
  if(spec.mode==="gdiag"){
    var secs=(spec.secs||[]).map(function(v){ return qmSecKey(v)||v; }), all=!secs.length;
    if(all){ var sk={}; ctx.rows.forEach(function(r){ sk[r.sec]=1; }); secs=Object.keys(sk).sort(function(x,y){ return qmSecName(x).localeCompare(qmSecName(y)); }); }
    var yb=A.ytdBase(), a12=L-252, bc=bench?h.syms[bench]:null, rows2=[];
    function gline(label,mem,bold){ mem=mem.filter(function(s){ return h.syms[s]&&M.by[s]&&!M.by[s].stale; }); if(!mem.length) return null;
      var Y=yb>=0?A.groupPath(mem,yb,L):null, T=a12>=0?A.groupPath(mem,a12,L):null, cr=null;
      if(T&&bc){ var xs=[],ys=[]; for(var i=0;i<T.rs.length;i++){ var q=A.ret(bc,a12+1+i); if(T.rs[i]!==null&&q!==null){ xs.push(T.rs[i]); ys.push(q); } } cr=xs.length>=120?A.corr(xs,ys):null; }
      var srt=mem.filter(function(s){ return num(M.by[s].ytd); }).sort(function(p,q){ return M.by[q].ytd-M.by[p].ytd; });
      return [(bold?"":"\u2003")+label,String(mem.length),f2(Y&&Y.ret,1,1),f2(T&&T.ret,1,1),T&&num(T.vol)?T.vol.toFixed(1)+"%":"\u2013",f2(T&&T.dd,1,1),f2(cr,2),srt.length?srt[0]+" "+f2(M.by[srt[0]].ytd,0,1):"\u2013",srt.length?srt[srt.length-1]+" "+f2(M.by[srt[srt.length-1]].ytd,0,1):"\u2013"]; }
    if(bench){ var bl0=gline(bench+" (benchmark)",[bench],true); if(bl0) rows2.push(bl0); }
    secs.forEach(function(k){ var mem=ctx.rows.filter(function(r){ return r.sec===k; }).map(function(r){ return r.sym; }); var l=gline(qmSecName(k)+(spec.subs?" (whole sector)":""),mem,true); if(l) rows2.push(l);
      if(spec.subs){ var ids={}; ctx.rows.forEach(function(r){ if(r.sec===k) (ids[r.ind]=ids[r.ind]||[]).push(r.sym); });
        Object.keys(ids).map(function(ind){ return {ind:ind,l:gline(ind,ids[ind],false)}; }).filter(function(x){ return x.l; }).sort(function(p,q){ return parseFloat(q.l[2])-parseFloat(p.l[2]); }).forEach(function(x){ rows2.push(x.l); }); } });
    res.lead="Diagnostic of "+(all?"every sector":secs.map(qmSecName).join(", "))+(spec.subs?" and "+(all?"their":"its")+" subsectors":"")+": equal-weight baskets against "+(bench||"the benchmark")+", YTD and 12 months.";
    res.table={head:["Group","Names","YTD return","12M return","12M vol.","12M max drawdown","Corr. to "+(bench||"benchmark"),"Best YTD","Worst YTD"],align:["l","r","r","r","r","r","r","l","l"],body:rows2};
    res.notes.push("Each row is an equal-weight basket of its scan stocks, rebalanced daily (the same method as a diagnostic of a list). Subsectors are sorted by YTD return inside each sector. For the names of one subsector ask \u201Cdiagnostic of <subsector>\u201D, e.g. \u201Cdiagnostic of Semiconductors\u201D; for all sectors ask \u201Cdiagnostic of all sectors\u201D.");
    return fin(rows2.length);
  }
  if(spec.mode==="hedge"||spec.mode==="partners"){
    var list=(spec.syms||[]).filter(function(s){ return h.syms[s]; }); if(!list.length){ res.lead="The previous answer has no names with price history."; return fin(0); }
    var a4=Math.max(1,L-251), bk=[]; for(var i9=a4;i9<=L;i9++){ var s3=0,k3=0; list.forEach(function(x){ var r3=A.ret(h.syms[x],i9); if(r3!==null){ s3+=r3; k3++; } }); bk.push(k3?s3/k3:null); }
    var secs={}; list.forEach(function(x){ if(by[x]) secs[by[x].sec]=1; });
    var out=[]; Object.keys(h.syms).forEach(function(s){ if(list.indexOf(s)>=0) return; if(spec.cross&&by[s]&&secs[by[s].sec]) return; var c=h.syms[s], xs=[], ys=[]; for(var i10=a4;i10<=L;i10++){ var r4=A.ret(c,i10), b4=bk[i10-a4]; if(r4!==null&&b4!==null){ xs.push(r4); ys.push(b4); } } if(xs.length<200) return; out.push({s:s,r:A.corr(xs,ys),beta:A.beta(xs,ys)}); });
    out.sort(spec.mode==="hedge"?function(p,q){ return p.r-q.r; }:function(p,q){ return q.r-p.r; }); var L4=out.slice(0,spec.n);
    var bb=null; if(bench){ var xs2=[],ys2=[]; for(var i11=a4;i11<=L;i11++){ var b5=bk[i11-a4], r5=A.ret(h.syms[bench],i11); if(b5!==null&&r5!==null){ xs2.push(b5); ys2.push(r5); } } bb={r:A.corr(xs2,ys2),beta:A.beta(xs2,ys2)}; }
    res.lead=(spec.mode==="hedge"?"Names that moved most <b>opposite</b> to":"Names that moved most <b>with</b>")+" the previous answer's "+list.length+" names as an equal-weight basket (252 bars)"+(spec.cross?", outside the basket's sectors":"")+"."+(bb?" The basket itself: correlation "+qmN(bb.r,2)+" and beta "+qmN(bb.beta,2)+" to "+bench+(spec.mode==="hedge"?" (so a short of "+bench+" worth about "+qmN(bb.beta,2)+" × the basket is the plain market hedge).":"."):"");
    res.table={head:["Rank","Symbol","Corr. to the basket","Beta to the basket","Sector","Subsector"],align:["r","l","r","r","l","l"],body:L4.map(function(o,i){ return [String(i+1),o.s,qmN(o.r,3),qmN(o.beta,2),secN(o.s),by[o.s]?by[o.s].ind:(o.s===bench?"benchmark":"ETF")]; })};
    res.notes.push("From the part E daily returns over the last 252 bars; ETFs included. "+(spec.mode==="hedge"?"A negative correlation is a statistical offset, not a guarantee: check it over 60 bars too (“what is the correlation between A and B”).":"These are the names that would add the least diversification to the basket."));
    res.send=send(L4.map(function(o){ return o.s; }),spec.mode==="hedge"?"hedges":"partners"); return fin(L4.length);
  }
  return fin(0);
};
/* charts go straight under the lead line of the answer */
var _qmHtml94=qmHtml;
qmHtml=function(res){ var h=_qmHtml94(res); try{ if(res&&res.hxPlot){ var i=h.indexOf("</p>"); h=i>=0?h.slice(0,i+4)+res.hxPlot+h.slice(i+4):res.hxPlot+h; } }catch(e){} return h; };
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Charts: {\"kind\":\"hplot\",\"type\":\"price\"|\"ytd\"|\"rs\"|\"dd\"|\"vol\"|\"rcorr\"|\"spread\",\"syms\":[...],\"secs\":[...],\"win\":\"all\"|\"ytd\"|\"21\"|\"60\"|\"126\"|\"252\"}. Cluster portfolios and hedges: {\"kind\":\"hcport\",\"mode\":\"blocks\",\"dir\":\"rising\"|\"falling\"} or {\"kind\":\"hcport\",\"mode\":\"hedge\"|\"partners\",\"syms\":[...]}.\n\nQ: "); }catch(e){}
}catch(e){ try{ console.warn("v94 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
