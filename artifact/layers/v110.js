/* ================= v110: Subsector Web - 10 day horizon + auto-leader callout, tab and Ask alike =================
   The Subsector Web tab already colours companies by 1/3/5-day return or severity (sbwH, SBW_LAB/UP/DN, orig.html) and
   already computes, on every render, the single strongest-pressure and strongest-pocket industry for the current
   horizon (sbwRender's "press"/"stren" locals feeding #sbwHead) -- this is the same idea as a competitor tool's
   "Top: Semiconductors (+10.86% adjusted)" auto-identified header, just not exposed as a 10-day option nor carried
   into the Ask-the-terminal answer. r10 (10-day return) is already a normal scan field (used all over the rest of
   the page), so this only needs to: (1) add "10 days" to the tab's existing Colour-by toggle, wired the same way as
   the other buttons; (2) let "10 day subsector web for X" (and "1 day"/"5 day"/"this week") pick that colouring in
   the Ask answer, via v94's existing mode==="sbw" handler (which already calls sbwRender() directly -- reusing the
   tab's own model and its own leader-detection, not a re-implementation); (3) carry the tab's own #sbwHead text
   (the auto-identified leader/laggard line) into the Ask answer, since v94's handler builds its own res.lead/table
   but never copied that line over. */
(function(){
try{
  if(typeof SBW_LAB==="undefined"||typeof sbwRender!=="function") return;

  /* 1. teach the horizon maps and colour scale about r10 (already a real field on every row) */
  SBW_LAB.r10="10 day return";
  SBW_UP.r10="up"; SBW_DN.r10="down";

  /* 2. add the "10 days" button to the tab's own Colour-by segment, wired exactly like the base buttons
        (seg() in orig.html attaches its own listeners once at setup time, so a button added afterwards needs
        its own listener rather than re-running seg()). */
  function addTenDayBtn(){
    var seg=document.getElementById("sbwHSeg");
    if(!seg||seg.querySelector('button[data-v="r10"]')) return true;
    var btn=document.createElement("button");
    btn.type="button"; btn.setAttribute("data-v","r10"); btn.setAttribute("aria-pressed","false");
    btn.textContent="10 days";
    seg.appendChild(btn);
    btn.addEventListener("click",function(){
      sbwH="r10";
      Array.prototype.forEach.call(seg.querySelectorAll("button"),function(x){ x.setAttribute("aria-pressed",String(x===btn)); });
      sbwRender();
    });
    return true;
  }
  if(!addTenDayBtn()){
    document.addEventListener("DOMContentLoaded",addTenDayBtn);
    setTimeout(addTenDayBtn,1200);
  }

  /* 3. Ask-the-terminal: let a horizon word pick the same colouring, and carry the tab's own auto-leader line
        into the answer. v94's qmParseX already returns {kind:"hcport",mode:"sbw",sec,ind,focus} for "subsector
        web" questions -- add an hz field to that same spec rather than re-parsing the trigger. */
  if(typeof qmParseX==="function"&&typeof qmHz==="function"&&typeof qmT==="function"){
    var _qmParseX110=qmParseX;
    qmParseX=function(q){
      var r=_qmParseX110(q);
      try{
        if(r&&r.kind==="hcport"&&r.mode==="sbw"){
          var t=qmT(q), hz=qmHz(t);
          if(!hz&&/\b(?:two|2) weeks?\b/.test(t)) hz="r10";
          else if(!hz&&/\bweek\b/.test(t)) hz="r5";
          else if(!hz&&/\bseverity\b/.test(t)) hz="rec";
          if(hz) r.hz=hz;
        }
      }catch(e){}
      return r;
    };
  }

  if(typeof qmRunX==="function"){
    var _qmRunX110=qmRunX;
    qmRunX=function(spec,ctx,res,t0){
      if(!spec||spec.kind!=="hcport"||spec.mode!=="sbw") return _qmRunX110(spec,ctx,res,t0);
      if(spec.hz&&SBW_LAB[spec.hz]) sbwH=spec.hz;
      var out=_qmRunX110(spec,ctx,res,t0);
      try{
        var head=document.getElementById("sbwHead");
        if(head&&head.innerHTML&&out&&typeof out.hxPlot==="string"){
          out.hxPlot='<p class="mini" style="margin:0 0 10px">'+head.innerHTML+'</p>'+out.hxPlot;
        }
      }catch(e){}
      return out;
    };
  }
}catch(e){ try{ console.error("v110 subsector web 10-day + leader callout failed:",e); }catch(e2){} }
})();
