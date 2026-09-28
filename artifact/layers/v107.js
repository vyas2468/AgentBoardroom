/* ================= v107: Ask the terminal, trailing-horizon returns + a hierarchy/return-split diagnostic =================
   PART A -- root cause of the reported bug ("Software infrastructure trailing 12m [return]" answered with a plain
   1-day-return sort, and "...trailing 30d returns" answered with a strength-percentile sort): naming one subsector
   with no other list word ("stocks"/"symbols"/...) makes qmParseX build a "screen" spec (base engine, orig.html,
   around the qmRankX/qmHz functions) -- a plain symbol screen filtered to that subsector. Its sort field comes from
   qmRankX(), which itself calls qmHz() for the return's time horizon -- but qmHz only ever recognises 1/3/5/10-day
   and "week" phrasing. A horizon it does not recognise ("12m", "30d", "6 months", "ytd", ...) makes qmHz fall back
   to "r1" (1-day return) when the question also uses a return word ("return(s)", "gain(s)", "performance", ...),
   or makes qmRankX's own RET-detector never fire at all (nothing to match) when the question has no such word ("...
   trailing 12m" alone) -- and a screen with no recognised sort field defaults to "str" (strength percentile). Both
   of the reported symptoms are this one gap, not two different bugs.
   THE FIX does not touch qmRankX's own field map or qmConds/qmParseX (orig.html): qmHz is wrapped to try the
   existing function first (so every horizon it already understands -- 1/3/5/10 day, week, two weeks -- is
   completely unchanged), then falls back to a new set of longer-horizon phrases mapped to the SAME per-symbol
   fields the tear sheet and portfolio tools already use (m1/m3/m6/m12/ytd, added to QM_SYM by v81) plus one new
   field this layer adds, d30 (a genuine 30-TRADING-SESSION return -- distinct from m1's 21-session "1 month" --
   computed the same way v81's own m1/m3/m6/m12 are, via the same exposed window.__hxApi.get() price array, so a
   literal "30d"/"30 day" question is answered by an actual 30-session return, not a reused 21-session one wearing
   a different label). qmRankX itself is wrapped too, but only to cover the "no return word at all" case ("...
   trailing 12m" alone): if the original qmRankX (which, calling qmHz internally, already benefits from the
   wrapped version above) still returns nothing AND the question both names a horizon and contains the word
   "trailing", this layer builds the same {f,d} shape qmRankX already returns, reusing its own asc/desc word
   lists -- nothing here re-implements the RET map or any of qmRankX's existing field detection.

   PART B -- a new diagnostic modelled on the user's example: for a named parent sector (or the whole universe),
   cross the EXISTING Hidden Groups / DVCWP cluster membership (relClusters(), already used by v81/v84/v85/v91/v95/
   v98/v102 -- reused verbatim here, not re-implemented) against a chosen return horizon (default trailing 12M,
   or YTD): each qualifying cluster (>=2 members inside the scoped universe) gets a mean return and a positive/
   negative member split, then a per-member table tags every name with its cluster id, sector and the same return
   figure. Sector scoping, when a sector is named, reuses v106's own window.__gaScope.parentSecOf hook (the same
   phrase-matching "leader page" and gascope already share) rather than a third copy of that regex. */
(function(){
try{
if(typeof QM_CTX==="undefined"||typeof qmHz!=="function"||typeof qmRankX!=="function"||typeof QM_SYM==="undefined") return;

/* ---------------- Part A: longer return horizons for the screen-kind ranker ---------------- */
QM_SYM.d30={lab:"30D return (30 sessions)",d:2,pct:1};

var HZ107=[ /* checked in order; first match wins, exactly like qmRankX's own map */
  ["d30",/\b(?:30|thirty)[- ]?(?:d|days?)\b/],
  ["ytd",/\bytd\b|\byear[- ]to[- ]date\b|\bthis year'?s?\b/],
  ["m1",/\b(?:1|one)[- ]?months?\b|\bpast month\b|\blast month\b|\bmonthly\b/],
  ["m3",/\b(?:3|three)[- ]?months?\b|\bpast quarter\b|\blast quarter\b|\bquarterly\b/],
  ["m6",/\b(?:6|six)[- ]?months?\b|\bhalf[- ]year\b/],
  ["m12",/\b(?:12|twelve)[- ]?months?\b|\b(?:1|one)[- ]?year\b|\btrailing (?:12 ?m\b|year\b)|\bpast year\b|\blast 12 months\b|\bannual\b/]
];
function hz107Of(s){ for(var i=0;i<HZ107.length;i++) if(HZ107[i][1].test(s)) return HZ107[i][0]; return null; }

var _qmHz107=qmHz;
qmHz=function(after){
  var v=_qmHz107(after); if(v) return v; /* every horizon it already knew keeps its exact old answer */
  var s=String(after||"");
  var hzf=hz107Of(s);
  if(hzf) return hzf;
  /* bare "trailing return(s)", no explicit number -- the plain-English default is a full trailing year */
  if(/\btrailing\b/.test(s.slice(0,60))) return "m12";
  return null;
};

var _qmRankX107=qmRankX;
qmRankX=function(w){
  var r=_qmRankX107(w); if(r) return r; /* covers every case the RET word triggers -- qmHz above is now already wired in */
  var hzf=hz107Of(w);
  if(hzf&&/\btrailing\b/.test(w)){
    var asc=/\b(least|lowest|smallest|weakest|worst|bottom|minimum|fewest|calmest|quietest|lower)\b/.test(w);
    var desc=/\b(most|highest|largest|biggest|top|best|strongest|greatest|maximum)\b/.test(w);
    return {f:hzf,d:asc&&!desc?"asc":"desc"};
  }
  return null;
};

/* d30 per symbol: the exact same fixed-bar-count method v81's own hxMetrics() uses for m1/m3/m6/m12 (rn(k) there),
   via the read-only window.__hxApi it already exposes -- hxMetrics()'s internal rn() is not itself exposed, so
   this restates its one-line arithmetic rather than duplicating the whole function for one more bar count. */
function hz107D30(sym){
  try{
    var A=window.__hxApi; if(!A) return null;
    var HX2=A.get(); if(!HX2||!HX2.syms||!HX2.syms[sym]) return null;
    var c=HX2.syms[sym], li=c.length-1; while(li>=0&&c[li]===null) li--;
    if(li<30||c[li-30]===null||!(c[li-30]>0)) return null;
    return (c[li]/c[li-30]-1)*100;
  }catch(e){ return null; }
}
if(typeof qmEnrich==="function"){
  var _qmEnrich107=qmEnrich;
  qmEnrich=function(ctx){
    var r=_qmEnrich107(ctx);
    try{ ctx.rows.forEach(function(row){ row.d30=hz107D30(row.sym); }); }catch(e){}
    return r;
  };
}

/* ---------------- Part B: hierarchy + return split ---------------- */
QMX_KINDS.hrsplit=1;
var HRS_TRIG=/\b(hierarchy(?: and| &|,)? return split|return split by (?:hidden )?group|cluster(?:ed)? return split|hidden group return (?:split|breakdown)|group(?:ed)? return (?:split|breakdown))\b/i;
var HRS_HZLAB={m12:"trailing 12M return",ytd:"YTD return"};

function hrsHorizon(t){ if(/\bytd\b|\byear[- ]to[- ]date\b/.test(t)) return "ytd"; return "m12"; }

var _qmParseX107=qmParseX;
qmParseX=function(q){
  /* checked BEFORE the rest of the chain: a query naming this diagnostic explicitly ("hierarchy and return
     split", "cluster return split", ...) also usually names a sector and a return word, which is exactly what
     the ordinary screen-kind ranking (fixed by Part A, above) would otherwise happily answer first -- so this
     specific, narrow trigger phrase must win before any of that runs, not fall back to it. */
  try{
    var ctx0=QM_CTX;
    if(ctx0){
      var t0=qmT(q);
      if(HRS_TRIG.test(t0)){
        var GA0=window.__gaScope, parentSec0=GA0&&GA0.parentSecOf?GA0.parentSecOf(t0,ctx0):null;
        return {kind:"hrsplit",parentSec:parentSec0,hz:hrsHorizon(t0)};
      }
    }
  }catch(e){}
  return _qmParseX107(q);
};

var _qmValidateAny107=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="hrsplit")) return _qmValidateAny107(raw);
  var ctx=QM_CTX;
  var parentSec=(raw.parentSec&&ctx.secStats&&ctx.secStats[raw.parentSec])?raw.parentSec:null;
  var hz=(raw.hz==="ytd")?"ytd":"m12";
  return {spec:{kind:"hrsplit",parentSec:parentSec,hz:hz}};
};

var _qmRunX107=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hrsplit")) return _qmRunX107(spec,ctx,res,t0);
  try{
    var hz=spec.hz, hzLab=HRS_HZLAB[hz];
    var scopeRows=ctx.rows.filter(function(r){ return !spec.parentSec||r.sec===spec.parentSec; });
    var bySym={}; scopeRows.forEach(function(r){ bySym[r.sym]=r; });
    var R=null; try{ R=relClusters("stocks",0.6); }catch(e){ R=null; }
    var clusters=(R&&R.clusters||[]).map(function(c){
      var mem=c.members.map(function(m){ return bySym[m.sym]; }).filter(function(r){ return r&&qmNum(r[hz]); });
      return {id:c.id,mem:mem};
    }).filter(function(c){ return c.mem.length>=2; });
    clusters.forEach(function(c){
      c.mean=qmMean(c.mem.map(function(r){ return r[hz]; }));
      c.pos=c.mem.filter(function(r){ return r[hz]>0; }).length;
      c.neg=c.mem.filter(function(r){ return r[hz]<0; }).length;
    });
    clusters.sort(function(a,b){ return b.mean-a.mean; });
    var scopeLab=spec.parentSec?qmSecName(spec.parentSec):"the whole universe";
    res.lead=clusters.length?
      ("Hidden Groups in "+scopeLab+", by "+hzLab+" (positive vs negative split within each group):"):
      ("No hidden group in "+scopeLab+" has at least two members with a "+hzLab+" reading on this scan.");
    res.table={head:["Cluster","Members","Mean "+hzLab,"Positive","Negative"],align:["l","r","r","r","r"],
      body:clusters.map(function(c){ return ["Hidden Group #"+c.id,String(c.mem.length),qmN(c.mean,2,1),String(c.pos),String(c.neg)]; })};
    var memberRows=[]; clusters.forEach(function(c){ c.mem.forEach(function(r){ memberRows.push([r.sym,"#"+c.id,qmSecName(r.sec),qmN(r[hz],2,1),r[hz]>0?"positive":(r[hz]<0?"negative":"flat")]); }); });
    if(memberRows.length) res.extra=[{title:"Every member, tagged with its cluster",table:{head:["Symbol","Cluster","Sector",hzLab,"Sign"],align:["l","l","l","r","l"],body:memberRows}}];
    res.notes.push("Hidden Groups come from the same DVCWP-derived clustering used elsewhere on this page (co-movement threshold 0.6); a group needs at least two members with a "+hzLab+" reading in scope to be shown.");
    res.ms=Date.now()-t0;
    return res;
  }catch(e){
    res.lead="Could not build the hierarchy/return split ("+(e&&e.message)+")."; res.table=null; res.ms=Date.now()-t0; return res;
  }
};

/* ---------------- a tile: hierarchy + return split example questions ---------------- */
try{
  var HRS_Q=[
    "Hierarchy and return split for Industrials, trailing 12M return.",
    "Cluster return split for Software infrastructure, YTD.",
    "Group return breakdown by hidden clusters, trailing 12M return."
  ];
  function hE107(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function hrsInit(){
    var box=document.getElementById("qmEx20"); if(!box||document.getElementById("hx107Tiles")) return false;
    var el=document.createElement("details"); el.id="hx107Tiles"; el.open=true; el.style.marginTop="10px";
    el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600">Hierarchy + return split: '+HRS_Q.length+' example questions. Run one, or Edit it into your own</summary>'+
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);margin-top:10px">'+
      '<div class="mini" style="margin-bottom:6px;color:var(--ink-2)">Hidden Group membership crossed with a return horizon (12M or YTD) and a positive/negative split, per group and per name.</div>'+
      HRS_Q.map(function(q){ return '<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:3px 0"><span style="flex:1;color:var(--ink)">'+hE107(q)+'</span><button type="button" class="up-link-btn" data-hx107run="'+hE107(q)+'">Run</button><button type="button" class="up-link-btn" data-hx107edit="'+hE107(q)+'">Edit</button></div>'; }).join("")+
      '</div>';
    box.parentNode.insertBefore(el,box);
    el.addEventListener("click",function(e){
      var r=e.target.closest?e.target.closest("[data-hx107run],[data-hx107edit]"):null; if(!r) return; e.preventDefault();
      var q=r.getAttribute("data-hx107run")||r.getAttribute("data-hx107edit");
      if(r.hasAttribute("data-hx107run")){ try{ qmSubmit(q); }catch(err){} }
      else { var inp=document.getElementById("qmInput"); if(inp){ inp.value=q; inp.focus(); try{ inp.setSelectionRange(q.length,q.length); }catch(err){} inp.scrollIntoView({behavior:"smooth",block:"center"}); } }
    });
    return true;
  }
  if(!hrsInit()){ var tries107=0, iv107=setInterval(function(){ tries107++; if(hrsInit()||tries107>40) clearInterval(iv107); },250); }
}catch(e){ try{ console.warn("v107 tile disabled: "+(e&&e.message)); }catch(e2){} }
}catch(e){ try{ console.warn("v107 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
