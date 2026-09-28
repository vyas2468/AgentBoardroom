/* ================= v106: Ask the terminal, named-sector scoping on the DEFAULT answer path =================
   The bug: "Which subsector in Industrials had the highest combined anomaly score? List the symbols and 1D
   return." falls all the way through every qmParseX layer (nothing there recognises it) to the base page's own
   qmParse(), which builds a plain group-ranking spec (kind: null, level: "industry", sort.f: "gaMean", a drill
   into member symbols) -- but that spec has no idea "Industrials" was named, so it ranks ALL 88 subsectors in
   the whole scan and can return a leader from any sector (Energy, in the reported case). The "leader page"
   feature (v105, kind "gadiag") already parses and applies a named parent sector (and an "at least N members"
   minimum group size) correctly, but only when the question also says "leader page" -- everyone else's plain
   question still gets the ungapped answer.

   The fix does not touch qmParse or qmRun (orig.html), and does not re-implement v105's phrase matching: it
   calls v105's own parentSec / minN regexes via the window.__gaScope hook at the end of v105.js. What IS new
   here is a small, honest new kind, "gascope" ("group answer, scoped"), used ONLY to give this one case a place
   to hook qmRunX (kind: null bypasses qmRunX entirely inside orig.html's own qmRun, so there is no other legal
   way to intervene without editing the base page). Once inside qmRunX, gascope does not re-render anything of
   its own: it trims a COPY of ctx.indStats/ctx.indNames down to the industries that belong to the named sector
   and/or meet the minimum member count -- exactly the same two-step filter gadiag already proves correct
   (scopeAll.filter(sec) then filter(n>=minN)) -- and then calls the real, unmodified qmRun(spec,ctx) on that
   trimmed copy with the kind stripped back to null, so 100% of the actual ranking, drill, table and prose
   comes from the base engine's own group-ranking code, rendered by the base engine's own unmodified qmHtml/
   qmText (kind "gascope" is never checked by any renderer, so it prints exactly like an ordinary compact
   answer -- never the "leader page" 7-section layout). Everything else -- bias, direction, limit, drill
   sort/filters, "and 5D return" style extra asks -- is whatever qmParse() already read from the question;
   this layer does not touch any of it.

   This only fires for the exact case that was silently dropping the sector: qmParseX returned null (no
   portfolio, screen, count, compare, explain, gadiag, or any other kind matched) AND the question NAMES A
   SECTOR, AND the base qmParse() spec that would otherwise run is a bare group ranking (kind falsy, level
   "industry"). Every other path -- portfolios, screens, compares, counts, explains, symbol-level questions
   (which already reach a named sector via the existing "screen" kind's secIn), and "leader page" gadiag
   questions -- is untouched, because qmParseX for all of those already returns non-null before this layer's
   own code ever runs. A plain question that names no sector still returns null here exactly as before, so its
   answer is byte-for-byte unchanged -- this is deliberate and matches the brief's own constraint: an "at least
   N members" floor by itself, with no named sector, is NOT enough to engage this layer (it keeps today's
   behaviour, which is to ignore that phrase, exactly as before); minN only ever composes with a named sector,
   never substitutes for one. */
(function(){
try{
if(typeof QM_CTX==="undefined"||typeof qmParseX!=="function"||typeof qmParse!=="function") return;

QMX_KINDS.gascope=1;

var _qmParseX106=qmParseX;
qmParseX=function(q){
  var prev=_qmParseX106(q);
  if(prev) return prev; /* something else already understood this question -- leave it completely alone */
  try{
    var ctx=QM_CTX; if(!ctx) return null;
    var t=qmT(q), GA=window.__gaScope;
    var parentSec=GA&&GA.parentSecOf?GA.parentSecOf(t,ctx):null;
    if(!parentSec) return null; /* the critical constraint: ONLY a question that names a sector may change behaviour here.
      An "at least N members" floor with no named sector keeps its old (ignored) treatment exactly as before. */
    var minN=GA&&GA.minNOf?GA.minNOf(t):null;
    /* qmParse()'s own ascending/descending detector treats the bare word "least" (anywhere, including inside
       "at least") as a request for the lowest value -- gadiag avoids this because it never reuses qmParse's
       direction logic at all (its own dir is only /\blowest\b/). This layer DOES reuse qmParse's direction (so
       it never has its own, second copy of "highest/lowest" phrasing to keep in sync with the base engine), so
       the one adaptation this composition needs is to blank the "at least N ... members" phrase out of the text
       qmParse sees -- exactly the same blanking technique orig.html's own qmConds() already uses for spent
       phrases -- so "highest ... at least 5 members" is not misread as "lowest". The minN count itself still
       comes from the ORIGINAL text via the shared hook above. */
    var qForBase=minN?q.replace(/\bat least \d{1,2}\b[^.]{0,24}\bmembers?\b/i," "):q;
    var base=qmParse(qForBase);
    if(!base||base._err||base.kind) return base; /* only the plain group-ranking answer needs this; leave lookups/neighbours alone */
    if(base.level!=="industry") return base; /* scoping a sector-level ranking, or a symbol list, by a "parent sector" or member count is not this fix's job */
    return {kind:"gascope",level:base.level,bias:base.bias,filters:base.filters,sort:base.sort,limit:base.limit,drill:base.drill,
      parentSec:parentSec,minN:minN||1};
  }catch(e){}
  return null;
};

var _qmValidateAny106=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="gascope")) return _qmValidateAny106(raw);
  try{
    var stripped={}; for(var k in raw){ if(k!=="kind"&&k!=="parentSec"&&k!=="minN") stripped[k]=raw[k]; }
    var v=qmValidate(stripped); /* the exact same base-engine validator a plain group ranking already goes through */
    if(v.error) return v;
    var sp=v.spec, ctx=QM_CTX; sp.kind="gascope";
    sp.parentSec=(raw.parentSec&&ctx.secStats&&ctx.secStats[raw.parentSec])?raw.parentSec:null;
    var mn=parseInt(raw.minN,10); sp.minN=isFinite(mn)?Math.max(1,Math.min(50,mn)):1;
    if(!sp.parentSec&&sp.minN<=1) return {error:"No sector or minimum group size was recognised for this query."};
    return {spec:sp};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

var _qmRunX106=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="gascope")) return _qmRunX106(spec,ctx,res,t0);
  var ctx2={}; for(var k in ctx) ctx2[k]=ctx[k];
  if(spec.level==="industry"&&(spec.parentSec||spec.minN>1)){
    var keep={};
    ctx.indNames.forEach(function(k2){
      var g=ctx.indStats[k2];
      if(spec.parentSec&&g.sec!==spec.parentSec) return;
      if(spec.minN>1&&g.rows.length<spec.minN) return;
      keep[k2]=g;
    });
    ctx2.indStats=keep; ctx2.indNames=Object.keys(keep);
  }
  var raw={}; for(var k3 in spec){ if(k3!=="kind"&&k3!=="parentSec"&&k3!=="minN") raw[k3]=spec[k3]; }
  raw.kind=null;
  return qmRun(raw,ctx2); /* the real, unmodified base group-ranking + drill + rendering, on the trimmed scope */
};

/* ---------------- a new tile: "Sector-scoped combos" ----------------
   Plain (non-"leader page") questions that combine a named parent sector with another modifier a bare
   group-ranking question already supports -- direction, bias, an extra-field ask, a minimum member count --
   to show the fix is a general, composable capability and not a special case for one exact phrasing.
   Wording notes (each verified against the running page before being listed here, the same standard v105's
   own tile used): the minimum-member-count example adds "List the symbols and 1D return" so it reads as the
   same singular "which one" answer as the others (without it the base engine returns a plain ranked list,
   which is a correct but differently-shaped answer); "List the symbols, 1D return, and 5D return" is kept
   verbatim even though the base engine's compact answer style does not add a fifth-day column for this phrasing
   today (a pre-existing base-engine limit, unrelated to sector scoping -- see the header comment above) -- the
   sector is still correctly respected, which is what this tile demonstrates. */
try{
  var GS_Q=[
    "Which subsector in Industrials had the highest combined anomaly score? List the symbols and 1D return.",
    "Which subsector in Energy had the lowest combined anomaly score? List the symbols and 1D return.",
    "Which subsector in Healthcare had the highest combined anomaly score among improving names only? List the symbols and 1D return.",
    "Which subsector in Financials had the highest combined anomaly score? List the symbols, 1D return, and 5D return.",
    "Which subsector in Technology had the highest combined anomaly score, only counting subsectors with at least 5 members? List the symbols and 1D return."
  ];
  function hE106(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function gsInit(){
    var box=document.getElementById("qmEx20"); if(!box||document.getElementById("hx106Tiles")) return false;
    var el=document.createElement("details"); el.id="hx106Tiles"; el.open=true; el.style.marginTop="10px";
    el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600">Sector-scoped combos: '+GS_Q.length+' example questions. Run one, or Edit it into your own</summary>'+
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);margin-top:10px">'+
      '<div class="mini" style="margin-bottom:6px;color:var(--ink-2)">Plain questions (no &ldquo;leader page&rdquo; needed) that name a sector for a subsector ranking, and combine it with another condition the same answer style already supports: direction, bias, an extra field, a minimum member count.</div>'+
      GS_Q.map(function(q){ return '<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:3px 0"><span style="flex:1;color:var(--ink)">'+hE106(q)+'</span><button type="button" class="up-link-btn" data-hx106run="'+hE106(q)+'">Run</button><button type="button" class="up-link-btn" data-hx106edit="'+hE106(q)+'">Edit</button></div>'; }).join("")+
      '</div>';
    box.parentNode.insertBefore(el,box);
    el.addEventListener("click",function(e){
      var r=e.target.closest?e.target.closest("[data-hx106run],[data-hx106edit]"):null; if(!r) return; e.preventDefault();
      var q=r.getAttribute("data-hx106run")||r.getAttribute("data-hx106edit");
      if(r.hasAttribute("data-hx106run")){ try{ qmSubmit(q); }catch(err){} }
      else { var inp=document.getElementById("qmInput"); if(inp){ inp.value=q; inp.focus(); try{ inp.setSelectionRange(q.length,q.length); }catch(err){} inp.scrollIntoView({behavior:"smooth",block:"center"}); } }
    });
    return true;
  }
  if(!gsInit()){ var tries106=0, iv106=setInterval(function(){ tries106++; if(gsInit()||tries106>40) clearInterval(iv106); },250); }
}catch(e){ try{ console.warn("v106 tile disabled: "+(e&&e.message)); }catch(e2){} }
}catch(e){ try{ console.warn("v106 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
