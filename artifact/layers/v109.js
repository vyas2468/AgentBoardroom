/* ================= v109: Ask the terminal, top/bottom-N PER SUBSECTOR within a named sector =================
   The gap: "top 10 symbols per subsector by relative strength" is not the same question as either
   existing shape -- it is not a flat top-10 across the whole universe (the "screen" kind, base engine),
   and it is not a ranking of subsectors themselves (qmParse's bare group path, or gascope/gadiag,
   v106/v108). It means: for EACH subsector, rank ITS OWN members by the chosen field and show the top
   (and/or bottom) few -- a faceted list, one small table per subsector.

   SCOPED DELIBERATELY to a NAMED SECTOR ONLY (the owner's own choice): unscoped, "per subsector" spans
   the whole ~90-subsector universe, which is a dump, not a diagnostic (up to ~1,800 rows for a top-10-
   and-bottom-10 ask). A question naming no sector keeps today's exact behaviour -- this layer never
   engages, so nothing about the existing flat-top-10 "screen" answer changes for such a question.

   Reuse, not reimplementation: the sector-name phrase-matching is the SAME window.__gaScope.parentSecOf
   hook v105/v106/v107/v108 already share. The metric FIELD comes from calling the base engine's own
   qmRankX(t) -- the exact same field-detection map ("strength" -> str, "volatility" -> vol, "anomaly"
   -> ga, and, thanks to v107's own extension of qmHz, every trailing-horizon return word too) -- only
   its direction (asc/desc) is discarded, because here "top" and "bottom" are requested independently,
   not a single sort direction. No second field-detection table is written. */
(function(){
try{
if(typeof QM_CTX==="undefined"||typeof qmParseX!=="function"||typeof qmRankX!=="function"||typeof QM_SYM==="undefined") return;

QMX_KINDS.pergroup=1;

var PG_TRIG=/\bper (?:subsector|sub-sector|sub sector|industry)\b|\bby (?:subsector|sub-sector|sub sector|industry)\b/;

function pgN(t,re){ var m=t.match(re); return m?Math.max(1,Math.min(20,parseInt(m[1],10))):null; }

var _qmParseX109=qmParseX;
qmParseX=function(q){
  try{
    var ctx=QM_CTX;
    if(ctx){
      var t=qmT(q);
      if(PG_TRIG.test(t)){
        var GA=window.__gaScope, parentSec=GA&&GA.parentSecOf?GA.parentSecOf(t,ctx):null;
        if(parentSec){
          var topN=pgN(t,/\btop (\d{1,2})\b/), botN=pgN(t,/\bbottom (\d{1,2})\b/);
          if(topN||botN){
            var rr=qmRankX(t);
            if(rr&&QM_SYM[rr.f]){
              if(!topN&&/\btop\b/.test(t)) topN=5;
              if(!botN&&/\bbottom\b/.test(t)) botN=5;
              return {kind:"pergroup",parentSec:parentSec,field:rr.f,topN:topN,botN:botN};
            }
          }
        }
      }
    }
  }catch(e){}
  return _qmParseX109(q);
};

var _qmValidateAny109=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="pergroup")) return _qmValidateAny109(raw);
  try{
    var ctx=QM_CTX;
    var parentSec=raw.parentSec&&ctx.secStats&&ctx.secStats[raw.parentSec]?raw.parentSec:null;
    if(!parentSec) return {error:"No sector called "+raw.parentSec+" in the loaded scan."};
    if(!QM_SYM[raw.field]) return {error:"field "+raw.field};
    var topN=parseInt(raw.topN,10), botN=parseInt(raw.botN,10);
    topN=isFinite(topN)?Math.max(1,Math.min(20,topN)):null;
    botN=isFinite(botN)?Math.max(1,Math.min(20,botN)):null;
    if(!topN&&!botN) return {error:"Say how many per subsector you want (top N and/or bottom N)."};
    return {spec:{kind:"pergroup",parentSec:parentSec,field:raw.field,topN:topN,botN:botN}};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

var _qmRunX109=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="pergroup")) return _qmRunX109(spec,ctx,res,t0);
  try{
    var fld=spec.field, lab=QM_SYM[fld].lab;
    var bySub={};
    ctx.rows.forEach(function(r){
      if(r.sec!==spec.parentSec) return;
      if(!qmNum(r[fld])) return;
      (bySub[r.ind]=bySub[r.ind]||[]).push(r);
    });
    var subNames=Object.keys(bySub).sort();
    var parts=[];
    subNames.forEach(function(ind){
      var rows=bySub[ind].slice().sort(function(a,b){ return b[fld]-a[fld]; });
      var top=spec.topN?rows.slice(0,spec.topN):null;
      var bot=spec.botN?rows.slice(-spec.botN).reverse():null;
      parts.push({ind:ind,n:rows.length,top:top,bot:bot});
    });
    var scopeLab=qmSecName(spec.parentSec);
    var pieces=[]; if(spec.topN) pieces.push("top "+spec.topN); if(spec.botN) pieces.push("bottom "+spec.botN);
    res.lead=pieces.join(" and ")+" symbols by "+lab.toLowerCase()+", per subsector, within "+scopeLab+
      " ("+subNames.length+" subsector"+(subNames.length===1?"":"s")+" with a "+lab.toLowerCase()+" reading):";
    res.table=null;
    var extra=[];
    /* Green for the top (long-candidate) table, red for the bottom (short-candidate) table --
       reuses v96's own "pos"/"neg" hxColor modes (already used throughout Ask answers for
       exactly this green/red convention) rather than adding a new colouring rule. Top/bottom
       is already a within-subsector relative ranking, so this is a "strong here, weak here"
       read for every field, not just ones with a natural zero or 50 midpoint. */
    function tbl(rows,mode){ return {head:["Symbol",lab],align:["l","r"],hxColor:{1:mode},body:rows.map(function(r){ return [r.sym,qmUnitTxt(fld,r[fld])]; })}; }
    parts.forEach(function(p){
      var title=p.ind+" ("+p.n+" member"+(p.n===1?"":"s")+")";
      if(p.top) extra.push({title:title+" -- top "+p.top.length+" (long candidates)",table:tbl(p.top,"pos")});
      if(p.bot) extra.push({title:title+" -- bottom "+p.bot.length+" (short candidates)",table:tbl(p.bot,"neg")});
    });
    res.extra=extra;
    res.notes.push("Each subsector is ranked independently -- a subsector with very few members can show the same symbol in both its top and bottom list.");
    res.ms=Date.now()-t0;
    return res;
  }catch(e){
    res.lead="Could not build the per-subsector list ("+(e&&e.message)+")."; res.table=null; res.ms=Date.now()-t0; return res;
  }
};

/* ---------------- a tile: per-subsector top/bottom examples ---------------- */
try{
  var PG_Q=[
    "Top 5 and bottom 5 symbols per subsector by relative strength in Industrials.",
    "Top 3 symbols per subsector by combined anomaly score in Financials.",
    "Bottom 5 symbols per subsector by relative strength in Technology.",
    "Top 5 symbols per subsector by volatility in Healthcare.",
    "Top 5 and bottom 5 symbols per subsector by severity in Energy.",
    "Top 5 symbols per subsector by composite in Consumer Discretionary.",
    "Top 5 symbols per subsector by trailing 12M return in Industrials.",
    "Bottom 5 symbols per subsector by trailing 30d returns in IT Sector.",
    "Top 5 and bottom 5 symbols per subsector by risk in Real Estate.",
    "Top 10 symbols per subsector by relative strength in Materials."
  ];
  function hE109(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function pgInit(){
    var box=document.getElementById("qmEx20"); if(!box||document.getElementById("hx109Tiles")) return false;
    var el=document.createElement("details"); el.id="hx109Tiles"; el.open=true; el.style.marginTop="10px";
    el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600">Top/bottom per subsector: '+PG_Q.length+' example questions. Run one, or Edit it into your own</summary>'+
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);margin-top:10px">'+
      '<div class="mini" style="margin-bottom:6px;color:var(--ink-2)">Ranks each subsector\'s OWN members separately, within a named sector -- not a flat top-N across the whole universe.</div>'+
      PG_Q.map(function(q){ return '<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:3px 0"><span style="flex:1;color:var(--ink)">'+hE109(q)+'</span><button type="button" class="up-link-btn" data-hx109run="'+hE109(q)+'">Run</button><button type="button" class="up-link-btn" data-hx109edit="'+hE109(q)+'">Edit</button></div>'; }).join("")+
      '</div>';
    box.parentNode.insertBefore(el,box);
    el.addEventListener("click",function(e){
      var r=e.target.closest?e.target.closest("[data-hx109run],[data-hx109edit]"):null; if(!r) return; e.preventDefault();
      var q=r.getAttribute("data-hx109run")||r.getAttribute("data-hx109edit");
      if(r.hasAttribute("data-hx109run")){ try{ qmSubmit(q); }catch(err){} }
      else { var inp=document.getElementById("qmInput"); if(inp){ inp.value=q; inp.focus(); try{ inp.setSelectionRange(q.length,q.length); }catch(err){} inp.scrollIntoView({behavior:"smooth",block:"center"}); } }
    });
    return true;
  }
  if(!pgInit()){ var tries109=0, iv109=setInterval(function(){ tries109++; if(pgInit()||tries109>40) clearInterval(iv109); },250); }
}catch(e){ try{ console.warn("v109 tile disabled: "+(e&&e.message)); }catch(e2){} }
}catch(e){ try{ console.warn("v109 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
