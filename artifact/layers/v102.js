/* ================= v102: query fixes and list tools, round 2 =================
   Question rewrites (each answer says how it was read):
     "Show 15 strong and improving stocks" keeps 15 (the number after show / list / find was lost before)
     "top 2 per sector by 5D return"        -> the top names by 5D return, at most 2 per sector
     "fast above slow"                      -> fast cycle line above the slow DSP line
     "bullish trend flip"                   -> a fresh uptrend (started within 10 sessions)
     "rank by A, then by B"                 -> two-key ranking (A first, B breaks ties)
   Screen fixes: "not in an uptrend / downtrend", "not overbought / oversold" now invert the filter instead of dropping "not".
   New question kinds (kind "hx102"):
     gcount  "Which sector has the most improving tickers and the fewest anomalies?"   two or more counts per group
     cols    "Show trend length, severity and YTD for these" / "... for the top 10 improving stocks"
     dual    "12-1 month momentum leaders beating RSP, else cash"                        dual momentum baseline
   Charts and list tools on a screen in one sentence: "risk return scatter of strong and improving stocks",
   "scorecard of the top 10 improving stocks", "exit check on stocks in a fresh uptrend" (the screen runs first).
   Exposure of a list adds Hidden Group and price-cluster overlap and five names that would diversify it. */
(function(){
try{
var A=window.__hxApi||{}, X=window.__hx101; if(!X) return;
var num=X.num, hE=X.hE, sg=X.sg, f0=X.f0;
function H(){ try{ return A.get?A.get():null; }catch(e){ return null; } }
function ctxNow(){ try{ return QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){ return null; } }
var RWN=[], TWO=null, INNER=false;

/* ---- rewrites ---- */
function fld(w){ if(/correlat\w* (?:to|with) (?:its |their |the |own )*sectors?\b|\bsector correlation\b/.test(w)) return "cs60"; return X.fieldOf(w); }
function rw(q){
  var s=String(q||""), n=[], two=null;
  function rep(re,to,lab){ if(re.test(s)){ s=s.replace(re,to); if(lab) n.push(lab); } }
  rep(/\b(show|display|find|list|get)(?: me)? (\d{1,2}) (?!stocks?\b|names?\b|tickers?\b|symbols?\b|companies\b|sub ?sectors?\b|sectors?\b|industr|groups?\b|pairs?\b|etfs?\b|clusters?\b|blocks?\b|themes?\b|hidden\b)/i,function(m,a,k){ return a+" me "+k+" "; },"");
  rep(/\b(?:has |have |just |recently )*(?:crossed|crosses|crossing) (?:up )?(?:above|over|through) (?:the |its |their )?(?:dsp|rmesa(?: fir)?|spectral ma|slow line)(?: line)?\b/gi,"dsp cross up","“crossed above the DSP” read as a fresh cross up through the DSP line on this bar (the scan's cross event)");
  rep(/\b(?:has |have |just |recently )*(?:crossed|crosses|crossing) (?:down )?(?:below|under|through) (?:the |its |their )?(?:dsp|rmesa(?: fir)?|spectral ma|slow line)(?: line)?\b/gi,"dsp cross down","“crossed below the DSP” read as a fresh cross down through the DSP line on this bar (the scan's cross event)");
  rep(/\b(?:pulling|pulled|pulls) back\b|\bpulling in\b/gi,"pullback","“pulling back” read as a pullback (near its trend line)");
  rep(/\bfast (?:line )?(?:is )?above (?:the )?slow(?: line)?\b/gi,"fast cycle above slow","“fast above slow” read as the fast cycle line above the slow DSP line");
  rep(/\bfast (?:line )?(?:is )?below (?:the )?slow(?: line)?\b/gi,"fast cycle below slow","“fast below slow” read as the fast cycle line below the slow DSP line");
  rep(/\b(?:a )?bullish trend (?:flip|change|reversal)s?\b|\btrend (?:has )?(?:just )?flipped (?:to )?(?:up|bullish)\b/gi,"a fresh uptrend","“bullish trend flip” read as a fresh uptrend (started within the last 10 sessions)");
  var tk=s.match(/,?\s*\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?) by ([a-z0-9 \-]+?),? then (?:by )?([a-z0-9 \-]+?)(?=[,.?!]|$)/i);
  if(tk){ var fa=fld(tk[1].toLowerCase()), fb=fld(tk[2].toLowerCase());
    if(fa&&fb&&fa!==fb){ function dir(w,f){ return /\b(?:least|lowest|smallest|weakest|ascending|calmest|lower)\b/.test(w)||(/^(?:risk|vol|volp|vol12|beta)$/.test(f)&&!/\b(?:most|highest|riskiest)\b/.test(w))?"asc":"desc"; }
      two={a:fa,b:fb,da:dir(tk[1].toLowerCase(),fa),db:dir(tk[2].toLowerCase(),fb)}; s=s.replace(tk[0],", rank by two-key score"); n.push("Ranked by "+X.lab(fa).toLowerCase()+" ("+(two.da==="asc"?"lowest":"highest")+" first), then "+X.lab(fb).toLowerCase()+" breaks ties"); } }
  return {q:s,notes:n,two:two};
}
try{ QM_SYM.indUp={lab:"Subsector direction (1 rising, -1 falling)",d:0}; var _en2=qmEnrich; qmEnrich=function(ctx){ var r=_en2(ctx); try{ ctx.rows.forEach(function(x){ var g=ctx.indStats&&ctx.indStats[x.ind]; x.indUp=g?(g.bias==="improving"?1:(g.bias==="deteriorating"?-1:0)):null; }); }catch(e){} return r; }; }catch(e){}
try{ QM_SYM.twok={lab:"Two-key rank",d:0}; QMX_FIELDS.unshift(["twok",/\b(?:two|2)\W*key score/]); }catch(e){}
var _ask=qmAsk;
qmAsk=function(question,done){ var r={q:question,notes:[],two:null}; try{ r=rw(question); }catch(e){} RWN=r.notes; TWO=r.two; return _ask(r.q,done); };
var _run=qmRun;
qmRun=function(spec,ctx){
  if(TWO&&!INNER){ try{ var pa=X.pctOf(ctx.rows,TWO.a), pb=X.pctOf(ctx.rows,TWO.b); ctx.rows.forEach(function(r){ var a=pa(r[TWO.a]), b=pb(r[TWO.b]); if(!num(a)){ r.twok=null; return; } if(TWO.da==="asc") a=1-a; b=num(b)?(TWO.db==="asc"?1-b:b):0; r.twok=Math.round(a*1000)*1000+Math.round(b*999); });
    QM_SYM.twok.lab="Two-key rank ("+X.lab(TWO.a)+", then "+X.lab(TWO.b)+")"; }catch(e){} }
  var r=_run(spec,ctx);
  if(!INNER){ try{ if(RWN.length&&r&&r.notes) r.notes.unshift("Read as: "+RWN.join("; ")+"."); if(TWO&&r&&r.table&&r.table.head&&r.table.head.some(function(h){ return /two-key/i.test(h); })){ var ia=X.lab(TWO.a), ib=X.lab(TWO.b), bi=r.table.head.findIndex(function(h){ return /two-key/i.test(h); }), si=r.table.head.findIndex(function(h){ return /^symbol$/i.test(h); });
      if(bi>=0&&si>=0){ r.table.head.splice(bi,1,ia,ib); if(r.table.align) r.table.align.splice(bi,1,"r","r"); r.table.body.forEach(function(row){ var x=ctx.bySym[row[si]]; row.splice(bi,1,x?X.fmtF(TWO.a,x[TWO.a]):"–",x?X.fmtF(TWO.b,x[TWO.b]):"–"); }); } } }catch(e){} RWN=[]; }
  return r;
};

/* ---- run a screen inside another answer ---- */
function runInner(q2,ctx){ INNER=true; try{ var sp=qmParseX(q2); if(!sp||sp._err) return null; var v=qmValidateAny(sp); if(v.error) return null; var r=qmRun(v.spec,ctx); if(!r||!r.table) return null; var si=r.table.head.findIndex(function(h){ return /^symbol$/i.test(h); }); if(si<0) return null; return r.table.body.map(function(row){ return row[si]; }).filter(function(s){ return ctx.bySym[s]; }); }catch(e){ return null; } finally{ INNER=false; } }
function innerQ(t){
  var t2=t.replace(/,?\s*\b(?:colou?red|shaded|sized) by [a-z0-9 ]+/g,"").replace(/[?.!]+$/,"").trim();
  var m=t2.match(/\b(?:of|for|on|among|across|from)\s+((?:the\s+)?(?:top\s+\d{1,2}\s+|\d{1,2}\s+)?(?:[a-z0-9&\-]+\s+){0,8}?(?:stocks|names|companies)(?:\s+(?:that are|which are|with|in|above|below|where|near|not|and|showing|having)\b[^,]*)?)$/);
  if(!m) return null; var rest=m[1]; if(X.FOLLOW.test(rest)) return null;
  if(!/\b(?:strong|weak|improving|deteriorating|uptrend|downtrend|trend|cluster|converg|anomal|volatil|liquid|momentum|leaders?|breaking|recovering|rolling|oversold|overbought|extended|pullback|fresh|established|steady|quiet|accelerat|above|below|near|risk|beta|return|strength|strengthening|weakening|rising|falling|highest|lowest|best|worst)\w*/.test(rest)) return null;
  var q2=/\d/.test(rest)?"show me "+rest.replace(/^the\s+/,""):"show me 40 "+rest;
  try{ var sp=qmParseX(q2); if(!sp||sp._err||sp.kind!=="screen"||!(sp.filters&&sp.filters.length||sp.sort)) return null; }catch(e){ return null; }
  return {rest:rest,q2:q2};
}

/* ---- group counts ---- */
var GC=[["notdet",/\bnot deteriorating\b/,"not deteriorating",function(r){ return r.dir!=="deteriorating"; }],
 ["improving",/\bimprov\w*\b/,"improving",function(r){ return r.dir==="improving"; }],
 ["deteriorating",/\bdeteriorat\w*\b/,"deteriorating",function(r){ return r.dir==="deteriorating"; }],
 ["anom",/\banomal\w*\b/,"anomalies (graph anomaly 0.30+)",function(r){ return num(r.ga)&&r.ga>=0.3; }],
 ["up",/\buptrends?\b|\btrending up\b/,"in an uptrend",function(r){ return r.trend==="up"; }],
 ["down",/\bdowntrends?\b|\btrending down\b/,"in a downtrend",function(r){ return r.trend==="down"; }],
 ["conv",/\bsignals? (?:that )?converg\w*\b|\bconverging signals?\b/,"signals converge (3+ lenses)",function(r){ return num(r.conv)&&r.conv>=3; }],
 ["strg",/\bstrengthening\b/,"strengthening (SEW above zero)",function(r){ return num(r.sev)&&r.sev>0; }],
 ["weak",/\bweakening\b/,"weakening (SEW below zero)",function(r){ return num(r.sev)&&r.sev<0; }],
 ["c1",/\babove cluster (?:one|1)\b/,"above cluster 1",function(r){ return num(r.d1)&&r.d1>0; }],
 ["tl",/\babove (?:its |their |the )?trend ?lines?\b/,"above the trend line",function(r){ return num(r.atr)&&r.atr>0; }]];
function gcParse(t){
  var lvl=/\bsub ?-?sectors?\b|\bindustr\w*\b/.test(t)?"ind":(/\bsectors?\b/.test(t)?"sec":null); if(!lvl) return null;
  var found=[], used=t;
  GC.forEach(function(c){ var m=c[1].exec(used); if(!m) return; if(c[0]==="deteriorating"&&/\bnot deteriorating\b/.test(t)&&!/\b(?!not )\w+ deteriorat/.test(t.replace(/\bnot deteriorating\b/g,""))) return;
    var pre=t.slice(Math.max(0,m.index-30),m.index), d=/\b(?:fewest|least|lowest|smallest|minimum|fewer)\b(?![\s\S]*\b(?:most|highest|largest|greatest)\b)/.test(pre)?"asc":(/\b(?:most|highest|largest|greatest|more)\b/.test(pre)?"desc":null);
    found.push({k:c[0],i:m.index,lab:c[2],f:c[3],d:d}); used=used.slice(0,m.index)+used.slice(m.index,m.index+m[0].length).replace(/./g," ")+used.slice(m.index+m[0].length); });
  found.sort(function(a,b){ return a.i-b.i; });
  var countQ=/\b(?:most|fewest|least|count|number of|how many|rank)\b/.test(t);
  if(found.length>=2&&countQ||found.length>=1&&/\bcount (?:the )?(?:number of )?anomal/.test(t)&&found.length>=2) return {lvl:lvl,conds:found.map(function(c){ return {k:c.k,d:c.d}; })};
  return null;
}

/* ---- parse ---- */
var _p=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q), C=ctxNow();
    if(C&&!INNER){
      /* group counts with two or more conditions */
      if(!/\b(?:stocks?|names|tickers?|symbols?)\b/.test(t)||/\b(?:number of|most|fewest|how many|count)\b/.test(t)){ var g=gcParse(t); if(g) return {kind:"hx102",mode:"gcount",lvl:g.lvl,conds:g.conds}; }
      /* top N per sector (or subsector) by a measure */
      var tps=t.match(/\b(?:top|best|leading|highest|lowest|worst|bottom) (?:max(?:imum)? |at most )?(\d) (?:names? |stocks? |tickers? )?(?:per|in each|from each|for each|of each) (sub ?-?sector|sector|industry)s? (?:by|on|ranked by|for) ([a-z0-9 \-]+?)\s*$/);
      if(tps){ var ff=fld(tps[3]); if(ff&&QM_SYM[ff]) return {kind:"hx102",mode:"topsec",n:+tps[1],lvl:/sub|industry/.test(tps[2])?"ind":"sec",f:ff,d:/\b(?:lowest|worst|bottom)\b/.test(t)||/^(?:risk|vol|volp|vol12|beta)$/.test(ff)&&!/\bhighest\b/.test(t)?"asc":"desc"}; }
      /* dual momentum */
      if(/\bdual momentum\b|\b12[- ](?:minus[- ])?1(?: month)? momentum\b|\babsolute momentum\b/.test(t)){ var nm=t.match(/\b(?:top|best) (\d{1,2})\b|\b(\d{1,2}) (?:stocks|names|leaders)\b/); var lim={}; [["cl",/\b(?:max(?:imum)?|at most|no more than) (\d) (?:per|in each|from each) (?:price )?cluster\b|\b(\d) per (?:price )?cluster\b/],["hg",/\b(?:max(?:imum)?|at most|no more than) (\d) (?:per|in each|from each) hidden group\b|\b(\d) per hidden group\b/],["ind",/\b(?:max(?:imum)?|at most|no more than) (\d) (?:per|in each|from each) sub ?-?sector\b|\b(\d) per sub ?-?sector\b/],["sec",/\b(?:max(?:imum)?|at most|no more than) (\d) (?:per|in each|from each) sector\b|\b(\d) per sector\b/]].forEach(function(x){ var m=t.match(x[1]); if(m) lim[x[0]]=+(m[1]||m[2]); });
        var wm=/\binverse vol\w*\b|\brisk[- ]weighted\b|\brisk parity\b|\bvolatility weighted\b/.test(t)?"iv":(/\bweight(?:ed|ing)?\b|\bscore weighted\b|\brank weighted\b/.test(t)?"rank":"eq");
        var pk=[]; try{ pk=window.__pcond?window.__pcond.parse(t,[])||[]:[]; }catch(e){ pk=[]; }
        var ssD=(qmSecMentions(t).inn||[]).map(function(v){ return qmSecKey(v)||v; }), iiD=qmIndMentions(t,C)||[];
        var ex={lowvol:/\blow(?:er)? vol\w*\b|\bcalm\w*\b|\bquiet\b/.test(t),lowcorr:/\blow(?:er)? correlat\w*\b|\buncorrelated\b|\bdiversif\w*\b/.test(t),rising:/\brising sub ?sectors?\b|\bimproving sub ?sectors?\b/.test(t),breadth:/\b(?:strong|positive|good|improving) (?:sector )?breadth\b|\bsector breadth\b/.test(t),conv:/\bconverg\w*\b|\bsignal convergence\b/.test(t)};
        return {kind:"hx102",mode:"dual",n:nm?+(nm[1]||nm[2]):10,lim:lim,wm:wm,conds:pk,secs:ssD,inds:iiD,ex:ex}; }
      /* chosen columns */
      var tq=String(q).toLowerCase().replace(/[^a-z0-9%,&\- ]/g," ").replace(/\s+/g," ").trim(), cm=tq.match(/^(?:show|add|display|give|include)(?: me)?(?: the)? ([a-z0-9 ,\-%&]+?) (?:columns? )?(?:for|of|on) (.+)$/);
      if(cm&&!/\b(?:map|matrix|chart|plot|scatter|scorecard|web|graph|treemap|breadth|sentiment|spread|leaderboard|portfolio|basket|diagnos\w*|correlat\w*|exposure|pairs?)\b/.test(t)){
        var parts=cm[1].split(/\s*,\s*|\s+and\s+/).filter(Boolean), fs=[], ok=parts.length>=1;
        parts.forEach(function(p){ if(/\b(?:rank|place|position) (?:in|inside|within) (?:its |their )?sector\b|\bsector rank\b/.test(p)){ fs.push("_secrank"); return; } if(/\bstocks?\b|\bnames\b|^\d+ (?!months?\b|days?\b|weeks?\b|years?\b|d\b|m\b)/.test(p)){ ok=false; return; } var f=X.fieldOf(p)||(/^(?:ytd|year to date|1m|3m|6m|12m|5d|1d|10d)$/.test(p.trim())?X.horizon(p.trim()==="ytd"||p.trim()==="year to date"?"ytd":p.replace(/(\d+)([dm])/,function(m,a,b){ return a+(b==="d"?" day":" month"); })):null); if(f&&QM_SYM[f]) fs.push(f); else ok=false; });
        if(ok&&fs.length){ var obj=cm[2].replace(/[?.!]+$/,"");
          if(X.FOLLOW.test(obj)){ var tl=X.target(q,t,C,false); if(tl&&tl.syms.length) return {kind:"hx102",mode:"cols",fs:fs,syms:tl.syms,label:tl.label}; }
          var tl2=X.target(q,obj,C,false); if(tl2&&(tl2.from==="named"||tl2.from==="group")) return {kind:"hx102",mode:"cols",fs:fs,syms:tl2.syms,label:tl2.label};
          var iq=innerQ("for "+obj); if(iq) return {kind:"hx102",mode:"cols",fs:fs,inner:iq.q2,rest:iq.rest}; } }
      /* charts and list tools on a screen in one sentence */
      if(/\bscatter|\bbubble|\bquadrant|\btree ?map|\bmarket map|\bheat ?map|\bscore ?card|\bheat ?grid|\bfactor (?:grid|heat|table|profile)|\bcompare\b|\bbreadth|\bsentiment|\bexit (?:check|review)|\bshould i\b|\bexposure|\bsector (?:mix|breakdown)|\bleaderboard|\brelative strength|\bre-?rank|\brank (?:these|them)|\bsort (?:these|them)/.test(t)&&!X.FOLLOW.test(t)){
        var iq2=innerQ(t);
        if(iq2){ var save=A.last, ph=C.rows.slice(0,3).map(function(r){ return r.sym; }), sp=null;
          try{ A.last=function(){ return {syms:ph}; }; sp=_p(t.replace(iq2.rest,"these")); }catch(e){ sp=null; } finally{ A.last=save; }
          if(sp&&sp.kind==="hx101"){ sp.inner=iq2.q2; sp.rest=iq2.rest; sp.skipped=[]; return sp; } } }
    }
  }catch(e){}
  var sp0=_p(q);
  try{ var tt=qmT(q);
    /* connections (and any spec with filters) in rising / falling subsectors */
    if(sp0&&!sp0._err&&sp0.kind==="xlink"&&Array.isArray(sp0.filters)&&!sp0.filters.some(function(f){ return f&&f.f==="indUp"; })){
      if(/\b(?:rising|improving) sub ?sectors?\b|\bsub ?sectors? (?:that are |which are |are )?(?:rising|improving)\b/.test(tt)) sp0.filters.push({f:"indUp",op:"=",v:1,txt:"in a rising subsector (most of its names improving)"});
      else if(/\b(?:falling|deteriorating) sub ?sectors?\b|\bsub ?sectors? (?:that are |which are |are )?(?:falling|deteriorating)\b/.test(tt)) sp0.filters.push({f:"indUp",op:"=",v:-1,txt:"in a falling subsector (most of its names deteriorating)"}); }
    /* "pulling back (in an uptrend)": near the trend line and down over 5 days, when the reader set no position filter */
    if(sp0&&!sp0._err&&Array.isArray(sp0.filters)&&(sp0.kind==="screen"||sp0.kind==="portfolio")&&/\bpullback\b/.test(tt)&&!/\bpullback\b/.test(qmT(String(q).replace(/\bpull ?backs?\b/gi,"")))&&!sp0.filters.some(function(f){ return f&&f.f==="atr"; })){
      sp0.filters.push({f:"atr",op:"<=",v:0.5,txt:"pulling back: within half an ATR of its trend line"}); sp0.filters.push({f:"atr",op:">=",v:-0.5,txt:"not more than half an ATR below it"}); sp0.filters.push({f:"r5",op:"<",v:0,txt:"down over the last 5 days"}); }
    /* "above its trend line" and "near its trend line" together: keep both */
    if(sp0&&!sp0._err&&Array.isArray(sp0.filters)&&/\babove (?:its|the|their) trend ?line\b/.test(tt)&&/\bnear (?:its|the|their) trend ?line\b|\bpullback/.test(tt)){
      var seen={}; sp0.filters=sp0.filters.filter(function(f){ var k=f?f.f+"|"+f.op+"|"+f.v:""; if(seen[k]) return false; seen[k]=1; return true; });
      if(!sp0.filters.some(function(f){ return f&&f.f==="atr"&&(f.op===">"||f.op===">=")&&f.v>=0; })) sp0.filters.push({f:"atr",op:">",v:0,txt:"above its trend line"}); }
  }catch(e){}
  /* two-key ranking (set up by the rewrite) */
  try{ if(TWO&&sp0&&(sp0.kind==="screen"||sp0.kind==="portfolio")&&/\b(?:two|2)\W*key\b/.test(qmT(q))){ sp0.sort={f:"twok",d:"desc"}; sp0.sortGiven=true; } }catch(e){}
  /* "not in an uptrend / downtrend", "not overbought / oversold": invert the one filter the base reader kept without its "not" */
  try{ var tn=qmT(q);
    if(sp0&&!sp0._err&&Array.isArray(sp0.filters)){
      [["uptrend",/\bnot (?:in )?(?:an? )?up ?trend\b/,function(f){ return f.f==="trend"&&f.v==="up"&&f.op==="="; },"not in an uptrend"],
       ["downtrend",/\bnot (?:in )?(?:a )?down ?trend\b/,function(f){ return f.f==="trend"&&f.v==="down"&&f.op==="="; },"not in a downtrend"],
       ["overbought",/\bnot overbought\b/,function(f){ return /^overbought/.test(f.txt||""); },null],
       ["oversold",/\bnot oversold\b/,function(f){ return /^oversold/.test(f.txt||""); },null]].forEach(function(c){
        if(!c[1].test(tn)) return; var rest=tn.replace(new RegExp(c[1].source,"g")," "); if(new RegExp("\\b"+c[0].replace("trend"," ?trend")+"\\b").test(rest)) return;
        var hit=sp0.filters.filter(c[2]); if(hit.length!==1) return; var f=hit[0], inv={">=":"<","<=":">",">":"<=","<":">=","=":"!="}[f.op]; if(!inv) return; f.op=inv; f.txt=c[3]||("not "+String(f.txt||c[0]).replace(/\((.*)\)/,function(m,x){ return "(the opposite of "+x+")"; })); }); } }catch(e){}
  return sp0;
};
QMX_KINDS.hx102=1;
/* "not in an uptrend": the filter already reads "is not"; say so in the answer */
var _ft=qmFilterTxt; qmFilterTxt=function(f){ if(f&&f.f==="trend"&&f.op==="!=") return "not in "+(f.v==="up"?"a fast Trend Filter uptrend":"a fast Trend Filter downtrend"); return _ft(f); };
var _va=qmValidateAny;
qmValidateAny=function(raw){ if(!(raw&&raw.kind==="hx102")) return _va(raw); return {spec:JSON.parse(JSON.stringify(raw))}; };

/* ---- run ---- */
var _rx=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(spec&&(spec.kind==="hx101"||spec.kind==="hx102")&&spec.inner){
    var got=runInner(spec.inner,ctx);
    if(!got||!got.length){ res.lead="No stocks pass “"+hE(spec.rest||spec.inner)+"” on this bar, so there is nothing to draw."; res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; res.cov=qmCovX(ctx,""); return res; }
    spec.syms=got; spec.label=got.length+" “"+(spec.rest||"")+"”"; spec.from="screen";
    res.notes.push("First ran the screen “"+(spec.inner.replace(/^show me /,""))+"” ("+got.length+" names), then drew the answer for them.");
  }
  if(spec&&spec.kind==="hx101"&&spec.mode==="expo"){ var r0=_rx(spec,ctx,res,t0); try{ expoMore(spec,ctx,r0); }catch(e){} return r0; }
  if(!(spec&&spec.kind==="hx102")) return _rx(spec,ctx,res,t0);
  var h=H(), by=ctx.bySym;
  function fin(n){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=n; res.ms=Date.now()-t0; return res; }
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  if(spec.mode==="gcount"){
    var C2=spec.conds.map(function(c){ var d=GC.filter(function(x){ return x[0]===c.k; })[0]; return {k:c.k,d:c.d,lab:d[2],f:d[3]}; });
    var G={}; ctx.rows.forEach(function(r){ var k=spec.lvl==="ind"?r.ind:r.sec; (G[k]=G[k]||[]).push(r); });
    var rows=Object.keys(G).map(function(k){ var m=G[k], cs=C2.map(function(c){ return m.filter(c.f).length; }), all=m.filter(function(r){ return C2.every(function(c){ return c.f(r); }); }).length; return {k:k,m:m,cs:cs,all:all}; });
    var anyDir=C2.some(function(c){ return c.d; });
    rows.sort(function(a,b){ if(!anyDir) return b.all-a.all||b.cs[0]-a.cs[0]; for(var i=0;i<C2.length;i++){ var d=C2[i].d||"desc", x=d==="asc"?a.cs[i]-b.cs[i]:b.cs[i]-a.cs[i]; if(x) return x; } return b.m.length-a.m.length; });
    var top=rows[0], nm=function(k){ return spec.lvl==="ind"?k:qmSecName(k); };
    res.lead=anyDir?"<b>"+hE(nm(top.k))+"</b> comes first: "+C2.map(function(c,i){ return top.cs[i]+" "+c.lab.split(" (")[0]; }).join(", ")+" of "+top.m.length+" names (ranked by "+C2.map(function(c){ return (c.d==="asc"?"fewest ":"most ")+c.lab.split(" (")[0]; }).join(", then ")+").":
      "Counts per "+(spec.lvl==="ind"?"subsector":"sector")+" for "+C2.map(function(c){ return c.lab.split(" (")[0]; }).join(" and ")+"; most names meeting all of them first: <b>"+hE(nm(top.k))+"</b> ("+top.all+").";
    res.table={head:[spec.lvl==="ind"?"Subsector":"Sector","Names"].concat(C2.map(function(c){ return c.lab.charAt(0).toUpperCase()+c.lab.slice(1); })).concat(["All together","Share (all)"]),align:["l","r"].concat(C2.map(function(){ return "r"; })).concat(["r","r"]),
      body:rows.map(function(o){ return [nm(o.k)+(spec.lvl==="ind"?" ("+qmSecName(o.m[0].sec)+")":""),String(o.m.length)].concat(o.cs.map(String)).concat([String(o.all),(o.all/o.m.length*100).toFixed(0)+"%"]); })};
    res.notes.push("Every condition you named is counted separately, and “all together” counts names meeting all of them. "+(anyDir?"Ranked on the first condition (most or fewest as you asked), ties broken by the next.":"Ranked by “all together”.")+" Anomaly means graph anomaly 0.30 or more.");
    res.send=null; return fin(rows.length);
  }
  if(spec.mode==="topsec"){
    var f=spec.f; if(!ctx.rows.some(function(r){ return num(r[f]); })){ res.lead="Ranking by "+X.lab(f)+" needs the part E price history; load it on the Price history tab."; return fin(0); }
    var G2={}; ctx.rows.forEach(function(r){ if(!num(r[f])) return; var k=spec.lvl==="ind"?r.ind:r.sec; (G2[k]=G2[k]||[]).push(r); });
    var out=[]; Object.keys(G2).sort().forEach(function(k){ var m=G2[k].sort(function(a,b){ return spec.d==="asc"?a[f]-b[f]:b[f]-a[f]; }); m.slice(0,spec.n).forEach(function(r,i){ out.push({k:k,i:i+1,r:r,of:m.length}); }); });
    if(spec.lvl==="ind") out.sort(function(a,b){ return spec.d==="asc"?a.r[f]-b.r[f]:b.r[f]-a.r[f]; });
    res.lead="The "+(spec.d==="asc"?"lowest":"top")+" "+spec.n+" per "+(spec.lvl==="ind"?"subsector":"sector")+" by <b>"+hE(X.lab(f).toLowerCase())+"</b>: "+out.length+" names from "+Object.keys(G2).length+" "+(spec.lvl==="ind"?"subsectors":"sectors")+".";
    var dup=f==="str";
    res.table={head:[spec.lvl==="ind"?"Subsector":"Sector","Rank in group","Symbol",X.lab(f)].concat(dup?[]:["Strength pct"]).concat(["Direction"]),align:["l","l","l","r"].concat(dup?[]:["r"]).concat(["l"]),hxColor:dup?{4:"dir"}:{5:"dir"},body:out.map(function(o){ return [spec.lvl==="ind"?o.k:qmSecName(o.k),o.i+" of "+o.of,o.r.sym,X.fmtF(f,o.r[f])].concat(dup?[]:[f0(o.r.str)]).concat([o.r.dir||"\u2013"]); })};
    res.notes.push("Each group's names are ranked on "+X.lab(f).toLowerCase()+" inside that group only; say \u201Cper subsector\u201D for subsectors, \u201Clowest\u201D to reverse.");
    res.send=send(out.map(function(o){ return o.r.sym; }),"top per group"); return fin(out.length);
  }
  if(spec.mode==="cols"){
    var syms=(spec.syms||[]).filter(function(s,i,a){ return by[s]&&a.indexOf(s)===i; }); if(!syms.length){ res.lead="None of those names are in the loaded stock scan."; return fin(0); }
    var need=spec.fs.filter(function(f){ return f!=="_secrank"&&!ctx.rows.some(function(r){ return num(r[f]); }); });
    var SR={}; if(spec.fs.indexOf("_secrank")>=0){ var bs={}; ctx.rows.forEach(function(r){ (bs[r.sec]=bs[r.sec]||[]).push(r); }); Object.keys(bs).forEach(function(k){ bs[k].slice().sort(function(a,b){ return (num(b.str)?b.str:-1)-(num(a.str)?a.str:-1); }).forEach(function(r,i){ SR[r.sym]=(i+1)+" of "+bs[k].length; }); }); }
    function hd(f){ return f==="_secrank"?"Rank in its sector (strength)":X.lab(f); }
    res.lead=(spec.rest?"The "+syms.length+" names from “"+hE(spec.rest)+"”":hE(String(spec.label||"").charAt(0).toUpperCase()+String(spec.label||"").slice(1)))+" with "+spec.fs.map(function(f){ return hd(f).toLowerCase(); }).join(", ")+".";
    res.table={head:["Symbol","Sector"].concat(spec.fs.map(hd)).concat(["Strength pct"]),align:["l","l"].concat(spec.fs.map(function(f){ return f==="_secrank"?"l":"r"; })).concat(["r"]),
      body:syms.map(function(s){ var r=by[s]; return [s,qmSecName(r.sec)].concat(spec.fs.map(function(f){ return f==="_secrank"?(SR[s]||"–"):(f==="tb"&&num(r.tb)?(r.trend==="down"?"down ":"")+r.tb+" sessions":X.fmtF(f,r[f])); })).concat([f0(r.str)]); })};
    if(need.length) res.notes.push("Load the part E price history for: "+need.map(function(f){ return X.lab(f); }).join(", ")+".");
    res.send=send(syms,"columns"); return fin(syms.length);
  }
  if(spec.mode==="dual"){
    if(!h){ res.lead="Dual momentum needs the part E price history (12-month and 1-month returns); load it on the Price history tab."; return fin(0); }
    var bn=(A.bench&&A.bench())||"RSP", b12=X.relRet(h,bn,252), b1=X.relRet(h,bn,21), N=Math.max(1,Math.min(30,spec.n||10));
    if(!num(b12)){ res.lead="The benchmark "+bn+" needs at least 252 bars of history."; return fin(0); }
    var bm=((1+b12/100)/(1+(num(b1)?b1:0)/100)-1)*100;
    var PC=window.__pcond, conds=(spec.conds||[]).filter(function(k){ return PC; }), lim=spec.lim||{}, wm=spec.wm||"eq";
    var ex=spec.ex||{}, secs=spec.secs||[], inds=spec.inds||[], vmed=null;
    if(ex.lowvol){ var vv=ctx.rows.map(function(r){ return num(r.vol12)?r.vol12:null; }).filter(num).sort(function(a,b){ return a-b; }); vmed=vv.length?vv[Math.floor(vv.length/2)]:null; }
    var cand=ctx.rows.filter(function(r){ if(inds.length&&inds.indexOf(r.ind)<0) return false; if(!inds.length&&secs.length&&secs.indexOf(r.sec)<0) return false;
      if(ex.lowvol&&num(vmed)&&!(num(r.vol12)&&r.vol12<=vmed)) return false; if(ex.rising&&r.indUp!==1) return false; if(ex.breadth&&!(num(r.secb)&&r.secb>0)) return false; if(ex.conv&&conds.indexOf("conv")<0&&!(num(r.conv)&&r.conv>=3)) return false; return true; }).filter(function(r){ return conds.every(function(k){ try{ return PC.test(k,r); }catch(e){ return true; } }); }).map(function(r){ var a=X.relRet(h,r.sym,252), c=X.relRet(h,r.sym,21); if(!num(a)||!num(c)) return null; return {r:r,m12:a,m121:((1+a/100)/(1+c/100)-1)*100}; }).filter(Boolean).sort(function(a,b){ return b.m121-a.m121; });
    var CL={}, HG={}; if(lim.cl){ try{ var CLS=window.__hxClusters, Mc=CLS&&CLS.build("252"); if(Mc){ var g=CLS.flat(Mc,0.5); Mc.names.forEach(function(x,k){ CL[x.sym]=g[k]; }); } }catch(e){} }
    if(lim.hg){ try{ relClusters("stocks",0.6).clusters.forEach(function(c){ c.members.forEach(function(m){ HG[m.sym]=c.id; }); }); }catch(e){} }
    var cnt={cl:{},hg:{},ind:{},sec:{}}, top=[], skip=0;
    function cor252(a,b){ var ca=h.syms[a], cb=h.syms[b]; if(!ca||!cb) return null; var L2=h.dates.length-1, xa=[], xb=[]; for(var i=L2-251;i<=L2;i++){ if(i<1) continue; var p=A.ret(ca,i), q2=A.ret(cb,i); if(p!==null&&q2!==null){ xa.push(p); xb.push(q2); } } return A.corr(xa,xb); }
    cand.forEach(function(o){ if(top.length>=N) return; if(ex.lowcorr&&top.some(function(p){ var c=cor252(p.r.sym,o.r.sym); return num(c)&&c>0.6; })){ skip++; return; } var keys={cl:CL[o.r.sym],hg:HG[o.r.sym],ind:o.r.ind,sec:o.r.sec}, ok=true;
      Object.keys(lim).forEach(function(k){ var v=keys[k]; if(v!==undefined&&v!==null&&(cnt[k][v]||0)>=lim[k]) ok=false; }); if(!ok){ skip++; return; }
      Object.keys(lim).forEach(function(k){ var v=keys[k]; if(v!==undefined&&v!==null) cnt[k][v]=(cnt[k][v]||0)+1; }); top.push(o); });
    var keep=top.filter(function(o){ return o.m121>bm&&o.m121>0; });
    var raw=top.map(function(o,k){ if(wm==="rank") return (top.length-k)+top.length/2; if(wm==="iv"){ var v=num(o.r.vol12)?o.r.vol12:o.r.vol; return num(v)&&v>0?1/v:1; } return 1; }), rs=raw.reduce(function(a,b){ return a+b; },0)||1;
    top.forEach(function(o,k){ o.w=raw[k]/rs*100*(top.length/N); }); var cashW=100-keep.reduce(function(a,o){ return a+o.w; },0);
    var rules=[]; conds.forEach(function(k){ try{ rules.push(PC.label(k)); }catch(e){} }); Object.keys(lim).forEach(function(k){ rules.push("at most "+lim[k]+" per "+{cl:"price cluster (252-bar dendrogram cut at 0.5)",hg:"Hidden Group",ind:"subsector",sec:"sector"}[k]); });
    if(inds.length) rules.unshift("in "+inds.join(", ")); else if(secs.length) rules.unshift("in "+secs.map(qmSecName).join(", "));
    if(ex.lowvol) rules.push("low volatility (12-month volatility at or below the universe median)"); if(ex.rising) rules.push("in rising subsectors"); if(ex.breadth) rules.push("sector breadth positive (more improving than deteriorating)"); if(ex.conv&&conds.indexOf("conv")<0) rules.push("signals converge (3 or more lenses)"); if(ex.lowcorr) rules.push("low correlation (no two picks correlated above 0.60 over 252 bars)");
    rules.push({eq:"equal weights",rank:"weighted by momentum rank (the first "+((N+N/2)/(1+N/2)).toFixed(1)+" times the last)",iv:"inverse-volatility weights"}[wm]);
    res.lead="Dual momentum ("+N+" slots): the strongest 12-1 month momentum names"+(rules.length?" ("+rules.join("; ")+")":"")+", each kept only if it beats "+bn+"'s 12-1 momentum ("+sg(bm,1)+"%) and is positive; <b>"+keep.length+"</b> kept, cash <b>"+Math.max(0,cashW).toFixed(1)+"%</b>.";
    res.table={head:["Rank","Symbol","Sector","12-1 month momentum","12M return","1M return","Beats "+bn+"?","Weight"],align:["r","l","l","r","r","r","l","r"],hxColor:{3:"sign",4:"sign",5:"sign"},
      body:top.map(function(o,i){ var k=keep.indexOf(o)>=0; return [String(i+1),o.r.sym,qmSecName(o.r.sec),sg(o.m121,1)+"%",sg(o.m12,1)+"%",sg(((1+o.m12/100)/(1+o.m121/100)-1)*100,1)+"%",k?"yes":"no \u2192 cash",k?o.w.toFixed(1)+"%":"0% (cash)"]; }).concat(cashW>0.05?[["","CASH","","","","","",cashW.toFixed(1)+"%"]]:[])};
    if(skip) res.notes.push(skip+" stronger names were skipped to respect the limits.");
    if(top.length<N) res.notes.push("Only "+top.length+" names passed the conditions and limits; the empty slots are cash.");
    res.notes.push("12-1 month momentum: the 12-month return excluding the latest month (skips the short-term reversal month). Relative momentum picks the strongest; absolute momentum sends a slot to cash when the name does not beat "+bn+" (and zero). A baseline for backtests, not advice.");
    res.send=send(keep.map(function(o){ return o.r.sym; }),"dual momentum"); return fin(top.length);
  }
  return fin(0);
};

/* exposure of a list: Hidden Group / price cluster overlap, and names that would diversify it */
function expoMore(spec,ctx,res){
  var by=ctx.bySym, syms=(spec.syms||[]).filter(function(s){ return by[s]; }); if(syms.length<2) return;
  var inSet={}, rows=[]; syms.forEach(function(s){ inSet[s]=1; });
  try{ relClusters("stocks",0.6).clusters.forEach(function(c){ var m=c.members.filter(function(r){ return inSet[r.sym]; }).map(function(r){ return r.sym; }); if(m.length>=2) rows.push(["Hidden Group #"+c.id,m.join(", "),m.length+" of "+syms.length]); }); }catch(e){}
  var h=H(); try{ var CLS=window.__hxClusters, Mc=h&&CLS&&CLS.build("252"); if(Mc){ var g=CLS.flat(Mc,0.5), cl={}; Mc.names.forEach(function(x,k){ if(inSet[x.sym]) (cl[g[k]]=cl[g[k]]||[]).push(x.sym); }); Object.keys(cl).forEach(function(k){ if(cl[k].length>=2) rows.push(["Price cluster "+k+" (252 bars)",cl[k].join(", "),cl[k].length+" of "+syms.length]); }); } }catch(e){}
  res.extra=res.extra||[];
  res.extra.push({title:"Overlap: names in the same Hidden Group or price cluster (they tend to move together)",table:{head:["Group","Names from the list","Share"],align:["l","l","r"],body:rows.length?rows:[["none","no two names share a Hidden Group or a price cluster","–"]]}});
  if(rows.length){ var big=rows.slice().sort(function(a,b){ return parseInt(b[2],10)-parseInt(a[2],10); })[0]; if(parseInt(big[2],10)/syms.length>=0.4) res.notes.push("Concentration: "+big[0]+" holds "+big[2]+" names of the list.");
  }
  if(!h) return;
  var L=h.dates.length-1; function rs(s){ var c=h.syms[s]; if(!c) return null; var o=[]; for(var i=L-251;i<=L;i++) o.push(i>0?A.ret(c,i):null); return o; }
  var R={}; syms.forEach(function(s){ R[s]=rs(s); });
  function avgC(s){ var a=rs(s); if(!a) return null; var t2=0,k=0; syms.forEach(function(x){ var b=R[x]; if(!b) return; var xa=[],xb=[]; for(var i=0;i<a.length;i++) if(num(a[i])&&num(b[i])){ xa.push(a[i]); xb.push(b[i]); } var c=A.corr(xa,xb); if(num(c)){ t2+=c; k++; } }); return k?t2/k:null; }
  var U={}, n=syms.length; ctx.rows.forEach(function(r){ U[r.sec]=(U[r.sec]||0)+1; }); var W={}; syms.forEach(function(s){ W[by[s].sec]=(W[by[s].sec]||0)+1; });
  var cand=ctx.rows.filter(function(r){ return !inSet[r.sym]&&num(r.str)&&r.str>=70&&(r.dir==="improving"||r.trend==="up")&&h.syms[r.sym]; }).sort(function(a,b){ return b.str-a.str; }).slice(0,80);
  var sc=cand.map(function(r){ var c=avgC(r.sym); return {r:r,c:c,uw:(W[r.sec]||0)/n-(U[r.sec]/ctx.rows.length)}; }).filter(function(o){ return num(o.c); }).sort(function(a,b){ return (a.c+a.uw*0.5)-(b.c+b.uw*0.5); }).slice(0,5);
  if(sc.length) res.extra.push({title:"Five names that would diversify it (strong, improving or in an uptrend; lowest average correlation to the list; under-weighted sectors first)",table:{head:["Symbol","Sector","Avg correlation to the list (252 bars)","Strength pct","Direction","Trend"],align:["l","l","r","r","l","l"],hxColor:{4:"dir"},
    body:sc.map(function(o){ return [o.r.sym,qmSecName(o.r.sec),o.c.toFixed(2),f0(o.r.str),o.r.dir||"–",(o.r.trend||"")+(num(o.r.tb)?" "+o.r.tb+" sessions":"")]; })}});
}
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Group counts and list columns: {\"kind\":\"hx102\",\"mode\":\"gcount\",\"lvl\":\"sec\"|\"ind\",\"conds\":[{\"k\":\"improving\"|\"anom\"|\"up\"|...,\"d\":\"desc\"|\"asc\"}]} or {\"kind\":\"hx102\",\"mode\":\"cols\",\"fs\":[fields],\"syms\":[tickers]} or {\"kind\":\"hx102\",\"mode\":\"dual\",\"n\":10}.\nQ: "); }catch(e){}
}catch(e){ try{ console.warn("v102 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
