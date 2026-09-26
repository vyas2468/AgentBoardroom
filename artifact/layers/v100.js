/* ================= v100: query fixes from the owner's own questions =================
   Rewrites phrasings the base reader misses into ones it knows, adds "sector breadth" as a rank, fixes "correlation to
   sector", explains short lists, and widens single-name subsector convergence maps. Only these phrasings are touched. */
(function(){
try{
var NOTE=null;
function rw(q){
  var s=String(q||""), n=[];
  function rep(re,to,lab){ if(re.test(s)){ s=s.replace(re,to); n.push(lab); } }
  rep(/\b(?:price (?:is )?)?(?:at or )?above (?:the )?(?:stepma )?(?:alex )?upper (?:ring|band)(?: ([123]))?\b/gi,function(m,k){ return "above band "+(k||1); },"Alex upper band read as “above band N” (band 1 unless named)");
  rep(/\b(?:price (?:is )?)?(?:at or )?below (?:the )?(?:stepma )?(?:alex )?lower (?:ring|band)(?: ([123]))?\b/gi,function(m,k){ return "below band "+(k||1); },"Alex lower band read as “below band N”");
  rep(/\babove (?:the |its )?stepma(?: trend| line| trend line)?\b/gi,"above its trend line","“above StepMA” read as above its trend line");
  rep(/\bbelow (?:the |its )?stepma(?: trend| line| trend line)?\b/gi,"below its trend line","“below StepMA” read as below its trend line");
  rep(/\bcluster strength\b/gi,"cluster balance","“cluster strength” read as cluster balance");
  rep(/\btrend strength\b/gi,"trend length","“trend strength” read as trend length (sessions in the trend)");
  rep(/\b(?:breadth of (?:its |the |their )?sector|sector'?s? breadth)\b/gi,"sector breadth","");
  return {q:s,notes:n};
}
var _ask=qmAsk;
qmAsk=function(question,done){ var r=rw(question); NOTE=r.notes.filter(Boolean); return _ask(r.q,done); };

/* sector breadth as a rankable field: its sector's net share of improving members */
try{ QM_SYM.secb={lab:"Sector breadth (net % improving)",d:0}; QMX_FIELDS.unshift(["secb",/sector breadth/]); }catch(e){}
var _en=qmEnrich;
qmEnrich=function(ctx){ var r=_en(ctx); try{ ctx.rows.forEach(function(x){ var g=ctx.secStats&&ctx.secStats[x.sec]; x.secb=g&&g.cov?Math.round((g.impr-g.det)/g.cov*100)+(typeof x.str==="number"?x.str/1000:0):null; }); }catch(e){} return r; };

var _px=qmParseX;
qmParseX=function(q){
  var sp=_px(q);
  try{ var t=qmT(q);
    /* "correlation to sector" means the 60-bar tie to its own sector, not to the universe */
    if(sp&&sp.sort&&sp.sort.f==="cu60"&&/correlation (?:to|with) (?:its |own |the )?sector/.test(t)) sp.sort.f="cs60";
    /* an explicit "rank / sort / order by X" wins over adjectives such as "liquid" or "anomalous" */
    if(sp&&(sp.kind==="screen"||sp.kind==="portfolio")&&sp.sort){ var mm=t.match(/\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?) by (?:the |its |their )?([a-z0-9 %\-]+?)(?:,|\.|;| then\b|$)/);
      if(mm){ var ph=" "+mm[1].trim()+" ", fk=null;
        if(/^ strength( percentile| score)? $/.test(ph)) fk="str"; else if(/^ risk( percentile| score)? $/.test(ph)) fk="risk";
        else { try{ for(var i=0;i<QMX_FIELDS.length;i++){ if(new RegExp(QMX_FIELDS[i][1].source).test(ph)){ fk=QMX_FIELDS[i][0]; break; } } }catch(e){} }
        if(fk&&fk!=="cu60"&&sp.sort.f!==fk&&QM_SYM[fk]){ sp.sort={f:fk,d:/\b(?:lowest|least|smallest|weakest|ascending|bottom)\b/.test(t)?"asc":"desc"}; sp.sortGiven=true; }
        /* the adjective is kept as a filter once an explicit ranking replaces it */
        if(fk&&Array.isArray(sp.filters)){ var hasF=function(f){ return sp.filters.some(function(x){ return x&&x.f===f; }); };
          if(/\banomal\w*\b|\bunusual\b/.test(t)&&sp.sort.f!=="ga"&&!hasF("ga")) sp.filters.push({f:"ga",op:">=",v:0.3,txt:"anomalous (graph anomaly 0.30 or more)"});
          if(/\bliquid\b/.test(t)&&sp.sort.f!=="liq"&&!hasF("liq")&&QM_SYM.liq) sp.filters.push({f:"liq",op:">=",v:66.7,txt:"liquid (top third by 20-day turnover)"}); } } }
    if(sp&&Array.isArray(sp.filters)&&/\babove (?:its|the|their) trend line\b/.test(t)&&!sp.filters.some(function(f){ return f&&f.f==="atr"&&(f.op===">"||f.op===">="); })&&sp.filters.some(function(f){ return f&&f.f==="atr"; }))
      sp.filters.push({f:"atr",op:">",v:0,txt:"above its trend line"});
    /* "rank by cluster balance / sector breadth": the base ranker does not take these two */
    if(sp&&(sp.kind==="screen"||sp.kind==="portfolio")&&sp.sort){
      if(/\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?) by (?:the |its )?cluster balance\b/.test(t)){ sp.sort={f:"bal",d:/\b(?:lowest|weakest|ascending)\b/.test(t)?"asc":"desc"}; sp.sortGiven=true; }
      if(/\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?) by (?:the |its )?sector breadth\b/.test(t)){ sp.sort={f:"secb",d:/\b(?:lowest|weakest|ascending)\b/.test(t)?"asc":"desc"}; sp.sortGiven=true; } }
    /* a ticker alone in its subsector: draw its sector's convergence map instead */
    if(sp&&sp.kind==="hview"&&sp.view==="conv"&&sp.target&&sp.target.t==="sym"){ var C=QM_CTX||qmBuildCtx(), r0=C&&C.bySym[sp.target.v];
      if(r0&&C.rows.filter(function(x){ return x.ind===r0.ind; }).length<2){ sp._w=sp.target.v+" is the only "+r0.ind+" name, so its whole sector is drawn"; sp.target={t:"sec",v:r0.sec}; } }
  }catch(e){}
  return sp;
};
var _run=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  var r=_run(spec,ctx,res,t0);
  try{ if(r&&r.notes){
      if(NOTE&&NOTE.length) r.notes.unshift("Read as: "+NOTE.join("; ")+".");
      if(spec&&spec._w) r.notes.unshift(spec._w+".");
      if(spec&&spec.kind==="screen"&&(spec.maxSec||spec.maxInd)&&r.table&&r.table.body&&spec.n&&r.table.body.length<spec.n&&r.table.body.length>0)
        r.notes.push("Only "+r.table.body.length+" names fit: with at most "+(spec.maxSec?spec.maxSec+" per sector":spec.maxInd+" per subsector")+", the qualifying names ran out.");
  } }catch(e){}
  NOTE=null; return r;
};
/* ---- "every symbol in every sector / subsector": the universe grouped sector -> subsector ---- */
try{
  var _px2=qmParseX;
  qmParseX=function(q){ try{ var t=qmT(q);
      if((/\b(?:every|all)(?: the| of the)? (?:symbols?|stocks?|tickers?|names|companies|etfs?|funds)\b/.test(t)||/\blist (?:all|every)\b/.test(t))&&/\bsub ?-?sectors?\b|\bsectors?\b|\bindustr|\bgroups?\b|\betfs?\b/.test(t)&&!/\b(?:top|best|rank|ranked|portfolio|correlat|count|how many|which|highest|lowest|most|least)\b/.test(t)&&!FOLLOWQ.test(t))
        return {kind:"hlist",sub:/\bsub ?-?sectors?\b|\bindustr|\bgroups?\b/.test(t),scope:/\betfs? only\b|\bonly etfs?\b|\b(?:every|all)(?: the)? (?:etfs?|funds)\b/.test(t)&&!/\bstocks?\b/.test(t)?"etf":(/\bstocks? only\b|\bonly stocks?\b|\b(?:every|all)(?: the)? stocks?\b/.test(t)&&!/\betfs?\b/.test(t)?"stocks":"both"),t:t}; }catch(e){}
    return _px2(q); };
  var FOLLOWQ=/\b(these|them|those)\b/;
  QMX_KINDS.hlist=1;
  var ESET=null; function etfs(){ if(ESET) return ESET; ESET={}; try{ (moX().etfSym||[]).forEach(function(x){ ESET[x.sym]=1; }); }catch(e){} return ESET; }
  var _qc=qmCell; qmCell=function(h,c){ if(h==="Symbols"){ var E=etfs(); return String(c).split(", ").map(function(x){ return (qmIsTk(x)||E[x])?qmTk(x):esc(x); }).join(", "); } return _qc(h,c); };
  var _va=qmValidateAny; qmValidateAny=function(raw){ if(raw&&raw.kind==="hlist") return {spec:JSON.parse(JSON.stringify(raw))}; return _va(raw); };
  var _rx=qmRunX; qmRunX=function(spec,ctx,res,t0){
    if(!(spec&&spec.kind==="hlist")) return _rx(spec,ctx,res,t0);
    var P=window.__pcond, keys=P?P.parse(spec.t,[]):[], sc=spec.scope||"both", rows=[];
    if(sc!=="etf") rows=ctx.rows.filter(function(r){ return keys.every(function(k){ return P.test(k,r); }); }).map(function(r){ return {sym:r.sym,sec:r.sec,ind:r.ind}; });
    var etfN=0; if(sc!=="stocks"){ try{ var X=moX(), ek={}; (X.etfKeys||[]).forEach(function(k,i){ ek[k]=i; });
      (X.etf||[]).forEach(function(a){ var e={sym:a[ek.sym],dir:a[ek.dir]||"n/a",rec:a[ek.rec]}; if(!keys.every(function(k){ return P.test(k,e); })) return; etfN++; rows.push({sym:e.sym,sec:"ETF",ind:(typeof moEtfGroupOf==="function"?moEtfGroupOf(e.sym):"ETFs")||"ETFs"}); }); }catch(e){} }
    var G={}; rows.forEach(function(r){ var k=r.sec+"|"+(spec.sub?r.ind:""); (G[k]=G[k]||[]).push(r.sym); });
    var ks=Object.keys(G).sort(function(a,b){ var A=a.split("|"),B=b.split("|"); var ea=A[0]==="ETF"?1:0, eb=B[0]==="ETF"?1:0; return (ea-eb)||(A[0]==="ETF"?0:qmSecName(A[0]).localeCompare(qmSecName(B[0])))||A[1].localeCompare(B[1]); });
    var secN=function(k){ return k==="ETF"?"ETFs":qmSecName(k); };
    res.lead=(sc==="etf"?"Every ETF":(sc==="stocks"?"Every stock":"Every symbol (stocks and ETFs)"))+(keys.length?" that is "+keys.map(function(k){ return P.label(k); }).join(", "):"")+" by sector"+(spec.sub?" and subsector (ETFs by fund group)":"")+": <b>"+rows.length+"</b> names"+(sc==="both"?" ("+(rows.length-etfN)+" stocks, "+etfN+" ETFs)":"")+" in "+Object.keys(G).length+" groups. Click any ticker for its tear sheet.";
    res.table={head:spec.sub?["Sector","Subsector","Names","Symbols"]:["Sector","Names","Symbols"],align:spec.sub?["l","l","r","l"]:["l","r","l"],
      body:ks.map(function(k){ var A=k.split("|"), L=G[k].slice().sort(); return spec.sub?[secN(A[0]),A[1],String(L.length),L.join(", ")]:[secN(A[0]),String(L.length),L.join(", ")]; })};
    res.notes.push("The last column lists the symbols (click one for its tear sheet; Up / Down then steps through that row). Add conditions to narrow it, e.g. \u201cevery symbol in every sector and subsector that is improving\u201d; say \u201cstocks only\u201d or \u201cETFs only\u201d (or \u201call ETFs by group\u201d) for one universe. ETFs only take direction and strengthening conditions. Copy as CSV exports the table.");
    res.send={label:"universe listing",items:rows.filter(function(r){ return r.sec!=="ETF"; }).slice(0,50).map(function(r){ return {sym:r.sym,side:"long",w:null}; })};
    res.cov=qmCovX(ctx,""); res.rows=rows.length; res.qualifying=rows.length; res.ms=Date.now()-t0; return res; };
}catch(e){}
/* ---- tear-sheet stepping: ↑ / ↓ move through the tickers of the table (or list / map) the tear sheet was opened from ---- */
try{
  var TL=null;
  function listFrom(el){ var box=el.closest("table")||el.closest("svg")||el.closest("ul,ol")||el.closest(".qm-a")||el.closest(".block")||el.parentNode, seen={}, out=[];
    [].slice.call(box.querySelectorAll("[data-tear]")).forEach(function(x){ var v=x.getAttribute("data-tear"); if(v&&!seen[v]){ seen[v]=1; out.push(v); } }); return out; }
  function badge(){ try{ var b=document.getElementById("tearBody"); if(!b||!TL) return; var i=TL.indexOf(tearOpenSym); if(i<0) return; var d=document.getElementById("hx100Nav");
      if(!d){ d=document.createElement("div"); d.id="hx100Nav"; d.style.cssText="font:600 11.5px var(--mono,monospace);color:var(--ink-3);margin:0 0 6px;"; }
      d.textContent=(i+1)+" / "+TL.length+"  \u00b7  \u2191 \u2193 to move through this list"; b.insertBefore(d,b.firstChild); }catch(e){} }
  document.addEventListener("click",function(e){ var t=e.target.closest?e.target.closest("[data-tear]"):null; if(!t) return;
    var tw=document.getElementById("tearWrap"); if(tw&&tw.contains(t)){ TL=null; return; }
    var l=listFrom(t); TL=l.length>1?l:null; setTimeout(badge,0); },true);
  document.addEventListener("keydown",function(e){
    if(e.key!=="ArrowDown"&&e.key!=="ArrowUp") return; var tw=document.getElementById("tearWrap"); if(!tw||tw.hidden||!TL) return;
    var tg=e.target&&e.target.tagName; if(/INPUT|TEXTAREA|SELECT/.test(tg||"")) return;
    var i=TL.indexOf(tearOpenSym); if(i<0) return; var j=e.key==="ArrowDown"?Math.min(TL.length-1,i+1):Math.max(0,i-1);
    e.preventDefault(); if(j!==i){ openTear(TL[j]); badge(); } });
}catch(e){}
}catch(e){ try{ console.warn("v100 layer skipped:",e); }catch(_){} }
})();
