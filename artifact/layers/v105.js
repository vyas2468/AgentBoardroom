/* ================= v105: Ask the terminal, "leader page" diagnostic render =================
   A second answer style for the existing combined-anomaly-score group ranking (the same query the compact
   prose answer already gives: "Which subsector in X had the highest combined anomaly score?", the base engine's
   qmParse group branch with level sector/industry, sort gaMean, drill). Nothing about that existing compact style
   changes: this is a NEW kind ("gadiag"), reached only when the question also asks for a "leader page", so every
   question that does not say that renders exactly as it did before (byte-identical).
   The leader page reuses the exact same computed data the compact style uses: ctx.indStats / ctx.secStats
   (qmGroupStats, built once in qmBuildCtx) for group means, member counts and per-symbol rows -- nothing here
   recomputes a mean or a count a second way. It only lays that same data out as seven sections: title, a one-line
   context bar, a "Leader" paragraph, a one-row subsector/sector summary table, an "Every company" member table,
   a coverage checklist, and a one-line "Metric" footnote. */
(function(){
try{
if(typeof QM_CTX==="undefined"||typeof qmBuildCtx!=="function") return;
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var ELEV=0.3; /* the scan's own "anomalous" threshold, already used elsewhere (v102: ga>=0.3) */

/* ---------------- parse: only questions that ask for a "leader page" ---------------- */
function gdTickers(q,ctx){
  var out=[]; (String(q||"").match(/[A-Za-z0-9]+(?:[.\-][A-Za-z0-9]+)*/g)||[]).forEach(function(w){ var u=w.toUpperCase();
    if(w!==u||!/[A-Z]/.test(u)) return; if(ctx.bySym[u]&&out.indexOf(u)<0) out.push(u); });
  return out;
}
function gdParse(q){
  var ctx=QM_CTX; if(!ctx) return null;
  var t=qmT(q); if(!/\bleader page\b/.test(t)) return null;
  var SM=qmSecMentions(t), parentSec=SM.inn.length?SM.inn[0]:null;
  var rankMode=/\bcombined\b/.test(t)&&/\banomal\w*/.test(t)&&/\bscore\b/.test(t)&&(/\bhighest\b/.test(t)||/\blowest\b/.test(t));
  var level=(/\bsubsector\b/.test(t)||/\bindustry\b/.test(t))?"industry":(/\bsector\b/.test(t)?"sector":null);
  var o={kind:"gadiag"};
  if(rankMode){
    o.mode="rank"; o.level=level||"industry"; o.parentSec=parentSec;
    o.dir=/\blowest\b/.test(t)?"asc":"desc";
    o.bias=/\bimproving\b/.test(t)?"improving":(/\bdeteriorating\b/.test(t)?"deteriorating":"any");
    var mn=t.match(/\bat least (\d{1,2})\b[^.]{0,24}\bmembers?\b/); o.minN=mn?parseInt(mn[1],10):1;
    var has5dReturn=/\b5[- ]?d(?:ay)?s?\b.*\breturn\b|\bover the last 5 trading days\b/.test(t);
    var has5dAsExtra=/\band 5[- ]?d(?:ay)?s?\b.*\breturn\b/.test(t);
    o.retField=has5dReturn&&!has5dAsExtra?"r5":"r1";
    var extra=[];
    if(has5dAsExtra) extra.push("r5");
    if(/\bsector\b[^.]{0,20}\bvolume\b|\bvolume\b[^.]{0,20}\bsector\b|,\s*sector,?\s*(?:and\s*)?volume/.test(t)) extra=extra.concat(["sec","liq"]);
    o.extraCols=extra;
    return o;
  }
  /* singular: a specific named group */
  o.mode="named";
  var tk=gdTickers(q,ctx);
  if(tk.length){ var row=ctx.bySym[tk[0]]; if(!row) return {_err:tk[0]+" is not in the loaded scan."}; o.level="industry"; o.targetKey=row.ind; return o; }
  var im=qmIndMentions(t,ctx);
  if(im.length){ o.level="industry"; o.targetKey=im[0]; return o; }
  if(parentSec&&level==="sector"){ o.level="sector"; o.targetKey=parentSec; return o; }
  return null;
}
var _qmParseX105=qmParseX;
qmParseX=function(q){ try{ var r=gdParse(q); if(r) return r; }catch(e){} return _qmParseX105(q); };

/* ---------------- validate ---------------- */
QMX_KINDS.gadiag=1;
var _qmValidateAny105=qmValidateAny;
qmValidateAny=function(raw){
  if(!(raw&&raw.kind==="gadiag")) return _qmValidateAny105(raw);
  try{
    var ctx=QM_CTX, sp={kind:"gadiag",mode:raw.mode==="rank"?"rank":"named"};
    sp.level=raw.level==="sector"?"sector":"industry";
    if(sp.mode==="named"){
      sp.targetKey=String(raw.targetKey||"");
      var ok=sp.level==="sector"?(ctx.secStats&&ctx.secStats[sp.targetKey]):(ctx.indStats&&ctx.indStats[sp.targetKey]);
      if(!ok) return {error:"No "+(sp.level==="sector"?"sector":"subsector")+" called "+sp.targetKey+" in the loaded scan."};
      return {spec:sp};
    }
    sp.parentSec=raw.parentSec?(qmSecKey(raw.parentSec)||raw.parentSec):null;
    if(sp.parentSec&&ctx.secStats&&!ctx.secStats[sp.parentSec]) return {error:"No sector called "+raw.parentSec+" in the loaded scan."};
    sp.dir=raw.dir==="asc"?"asc":"desc";
    sp.bias=["improving","deteriorating"].indexOf(raw.bias)>=0?raw.bias:"any";
    var mn=parseInt(raw.minN,10); sp.minN=isFinite(mn)?Math.max(1,Math.min(50,mn)):1;
    sp.retField=raw.retField==="r5"?"r5":"r1";
    sp.extraCols=(raw.extraCols||[]).filter(function(k){ return ["r5","sec","liq"].indexOf(k)>=0; });
    return {spec:sp};
  }catch(e){ return {error:"The query could not be checked: "+e.message}; }
};

/* ---------------- run: the same qmGroupStats data every other Ask answer uses ---------------- */
function gdScopeRows(ctx,level,parentSec){
  if(level==="industry"&&parentSec) return ctx.rows.filter(function(r){ return r.sec===parentSec; });
  return ctx.rows;
}
var _qmRunX105=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="gadiag")) return _qmRunX105(spec,ctx,res,t0);
  var iso=String(ctx.date||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  var cutoff=iso?((iso[3].length===2?"20"+iso[3]:iso[3])+"-"+("0"+iso[1]).slice(-2)+"-"+("0"+iso[2]).slice(-2)):ctx.date;
  res.cutoff=cutoff; res.lead=""; res.notes=res.notes||[]; res.bullets=[]; res.table=null;
  var statsAll=spec.level==="sector"?ctx.secStats:ctx.indStats;
  var unit=spec.level==="sector"?"sector":"subsector";
  var scopeAll=Object.keys(statsAll).map(function(k){ return statsAll[k]; }).filter(function(g){ return g.cov>=2; });
  var scoped=spec.level==="industry"&&spec.mode==="rank"&&spec.parentSec?scopeAll.filter(function(g){ return g.sec===spec.parentSec; }):scopeAll;

  var g0=null, N=scoped.length, rankOf=null, dimLabel=null, matched=null;
  if(spec.mode==="named"){
    g0=statsAll[spec.targetKey]; dimLabel=spec.level==="sector"?qmSecName(g0.key):g0.key;
    /* rank it among its own peers for context, even though this question named one group directly */
    var peers=spec.level==="industry"&&g0.sec?scopeAll.filter(function(g){ return g.sec===g0.sec; }):scopeAll;
    var sorted=peers.slice().sort(function(a,b){ return qmNum(b.gaMean)-qmNum(a.gaMean)||0; }).filter(function(g){ return qmNum(g.gaMean); });
    rankOf=sorted.findIndex(function(g){ return g.key===g0.key; })+1; N=sorted.length;
  } else {
    var pool=scoped.filter(function(g){ return qmNum(g.gaMean); });
    if(spec.bias!=="any") pool=pool.filter(function(g){ return g.bias===spec.bias; });
    if(spec.minN>1) pool=pool.filter(function(g){ return g.n>=spec.minN; });
    pool.sort(function(a,b){ return spec.dir==="asc"?a.gaMean-b.gaMean:b.gaMean-a.gaMean; });
    matched=pool.length; g0=pool[0]||null;
    dimLabel=spec.parentSec?qmSecName(spec.parentSec):"All sectors";
    if(g0){
      var full=scoped.filter(function(g){ return qmNum(g.gaMean); }).sort(function(a,b){ return spec.dir==="asc"?a.gaMean-b.gaMean:b.gaMean-a.gaMean; });
      rankOf=full.findIndex(function(g){ return g.key===g0.key; })+1; N=full.length;
    }
  }
  if(!g0){
    res.lead="No "+unit+" matched"+(spec.mode==="rank"&&spec.parentSec?" in "+qmSecName(spec.parentSec):"")+(spec.mode==="rank"&&spec.bias!=="any"?" with a "+spec.bias+" bias":"")+(spec.mode==="rank"&&spec.minN>1?" with at least "+spec.minN+" members":"")+".";
    res.cov=""; res.rows=0; res.qualifying=0; res.ms=Date.now()-t0; return res;
  }

  var groupName=spec.level==="sector"?qmSecName(g0.key):g0.key;
  var members=g0.rows.slice().sort(function(a,b){ return (qmNum(b.ga)?b.ga:-1)-(qmNum(a.ga)?a.ga:-1); });
  var scoredN=members.filter(function(r){ return qmNum(r.ga); }).length;
  var elevN=members.filter(function(r){ return qmNum(r.ga)&&r.ga>=ELEV; }).length;
  var retField=spec.mode==="rank"?spec.retField:"r1";
  var retMeanTxt=retField==="r1"?qmN(g0.r1Mean,2,true):qmN(qmMean(members.map(function(r){ return r.r5; })),2,true);
  var retAvailN=members.filter(function(r){ return qmNum(r[retField]); }).length;

  var scopeRows=gdScopeRows(ctx,spec.level,spec.mode==="rank"?spec.parentSec:(spec.level==="industry"?g0.sec:null));
  var scopeScored=scopeRows.filter(function(r){ return qmNum(r.ga); }).length;

  var title=hE(dimLabel)+" "+unit+" anomaly diagnostic";
  var ctxBar="Viewer cutoff "+hE(cutoff)+" | Graph Anomalies | "+hE(dimLabel);
  var leadTxt;
  if(spec.mode==="rank"){
    leadTxt=hE(groupName)+" ranks #"+rankOf+" of "+N+" "+hE(dimLabel)+" "+unit+"s by mean Graph Anomalies score"+
      (spec.bias!=="any"?" among "+spec.bias+"-bias "+unit+"s":"")+(spec.minN>1?" with at least "+spec.minN+" members":"")+
      ". Its "+g0.n+" member"+(g0.n===1?"":"s")+" "+(g0.n===1?"has":"all have")+" Graph scores and "+(retField==="r1"?"one-day":"five-day")+" returns. "+
      "The score measures anomaly intensity; the return shows the separate price direction.";
  } else {
    leadTxt=hE(groupName)+(spec.level==="industry"&&g0.sec?" ("+hE(qmSecName(g0.sec))+")":"")+" is #"+rankOf+" of "+N+" "+unit+"s"+
      (spec.level==="industry"&&g0.sec?" in "+hE(qmSecName(g0.sec)):"")+" by mean Graph Anomalies score. Its "+g0.n+" member"+(g0.n===1?"":"s")+" "+(g0.n===1?"has":"all have")+
      " Graph scores and one-day returns. The score measures anomaly intensity; the return shows the separate price direction.";
  }

  var sumHead=[unit.charAt(0).toUpperCase()+unit.slice(1),"Mean Graph score","Members scored","Mean "+(retField==="r1"?"1D":"5D")+" return","Elevated Anomalies"];
  var sumRow=[groupName,qmN(g0.gaMean,4),scoredN+"/"+g0.n,retMeanTxt,elevN+"/"+g0.n];
  var sumTable={head:sumHead,align:["l","r","r","r","r"],body:[sumRow]};

  var memHead=["Graph rank","Symbol","Graph score",(retField==="r1"?"1D":"5D")+" return"];
  var memAlign=["r","l","r","r"];
  (spec.extraCols||[]).forEach(function(k){
    if(k==="r5"&&retField!=="r5"){ memHead.push("5D return"); memAlign.push("r"); }
    if(k==="sec"){ memHead.push("Sector"); memAlign.push("l"); }
    if(k==="liq"){ memHead.push("Liquidity (20D turnover) pctl"); memAlign.push("r"); }
  });
  var memBody=members.map(function(r,i){
    var row=[String(i+1),r.sym,qmN(r.ga,4),qmN(r[retField],2,true)];
    (spec.extraCols||[]).forEach(function(k){
      if(k==="r5"&&retField!=="r5") row.push(qmN(r.r5,2,true));
      if(k==="sec") row.push(qmSecName(r.sec));
      if(k==="liq") row.push(qmNum(r.liq)?qmN(r.liq,0):"–");
    });
    return row;
  });
  var memTable={head:memHead,align:memAlign,body:memBody};

  var covHead=["Check","Result"], covBody=[];
  covBody.push([hE(dimLabel)+" Graph scores",scopeScored+"/"+scopeRows.length+" available; "+(scopeRows.length-scopeScored)+" missing"]);
  if(spec.mode==="rank") covBody.push([hE(dimLabel)+" "+unit+"s ranked",N+"; leader page returned 1"]);
  else covBody.push([hE(dimLabel)+" "+unit+"s evaluated",N+"; leader page returned 1"]);
  covBody.push([hE(groupName)+" "+(retField==="r1"?"1D":"5D")+" returns",retAvailN+"/"+g0.n+" available; cutoff "+hE(cutoff)]);
  var covTable={head:covHead,align:["l","l"],body:covBody};

  var metricTxt="“Combined” uses the Viewer Graph Anomalies chart definition: the mean member Graph score, not the sum. "+
    "The "+hE(dimLabel)+" ranking status is "+(spec.mode==="rank"&&matched!==null&&matched<N?"partial ("+matched+" of "+N+" "+unit+"s passed the filters)":"complete")+".";

  res.diag={title:title,ctxBar:ctxBar,lead:leadTxt,sumTable:sumTable,memTable:memTable,covTable:covTable,metric:metricTxt};
  res.lead=leadTxt; res.rows=members.length; res.qualifying=N; res.cov=""; res.ms=Date.now()-t0;
  return res;
};

/* ---------------- render: a 7-section leader page instead of the usual lead/bullets/table ---------------- */
var _qmHtml105=qmHtml, _qmText105=qmText;
qmHtml=function(res){
  if(!(res&&res.spec&&res.spec.kind==="gadiag"&&res.diag)) return _qmHtml105(res);
  var d=res.diag;
  var h='<h3 style="margin:2px 0 2px">'+d.title+'</h3>'+
    '<p class="mini" style="color:var(--ink-2);margin:0 0 10px">'+d.ctxBar+'</p>'+
    '<h4 style="margin:10px 0 4px">Leader</h4><p class="qm-lead">'+d.lead+'</p>'+
    '<h4 style="margin:10px 0 4px">'+(res.spec.level==="sector"?"Sector":"Subsector")+' summary</h4>'+qmTableHtml(d.sumTable)+
    '<p class="mini">1 rows</p>'+
    '<h4 style="margin:10px 0 4px">Every company</h4>'+qmTableHtml(d.memTable)+
    '<p class="mini">'+d.memTable.body.length+' rows</p>'+
    '<h4 style="margin:10px 0 4px">Coverage</h4>'+qmTableHtml(d.covTable)+
    '<p class="mini">'+d.covTable.body.length+' rows</p>'+
    '<h4 style="margin:10px 0 4px">Metric</h4><p class="qm-note">'+d.metric+'</p>'+
    '<p class="qm-note">Data cutoff: <b>'+hE(res.cutoff)+'</b>. Computed in the page from the loaded scan ('+res.ms+' ms). Not a forecast, not backtested.</p>';
  return h;
};
qmText=function(res){
  if(!(res&&res.spec&&res.spec.kind==="gadiag"&&res.diag)) return _qmText105(res);
  var d=res.diag, L=[d.title,d.ctxBar,"","Leader",d.lead,"",(res.spec.level==="sector"?"Sector":"Subsector")+" summary",
    d.sumTable.head.join(" | "),d.sumTable.body[0].join(" | "),"1 rows","","Every company",d.memTable.head.join(" | ")];
  d.memTable.body.forEach(function(r){ L.push(r.join(" | ")); });
  L.push(d.memTable.body.length+" rows","","Coverage",d.covTable.head.join(" | "));
  d.covTable.body.forEach(function(r){ L.push(r.join(" | ")); });
  L.push(d.covTable.body.length+" rows","","Metric",d.metric,"","Data cutoff: "+res.cutoff+".");
  return L.join("\n");
};

/* ---------------- a new tile: "Anomaly leader pages" ---------------- */
try{
  var GD_Q=[
    "Show the anomaly leader page for the Travel Services subsector.",
    "Show the leader page for NVDA's subsector.",
    "Which subsector in Industrials had the highest combined anomaly score? Show the leader page.",
    "Which industry had the highest combined anomaly score in the Technology sector? Show the leader page.",
    "Which subsector in Energy had the lowest combined anomaly score? Show the leader page.",
    "Which subsector in Financials had the highest combined anomaly score, only counting subsectors with at least 5 members? Show the leader page.",
    "Which subsector in Healthcare had the highest combined anomaly score among improving names only? Show the leader page.",
    "Which subsector in Consumer Discretionary had the highest combined anomaly score? Show the leader page with symbols, 1D return, and 5D return.",
    "Which subsector in Financials had the highest combined anomaly score? Show the leader page with symbols, sector, and volume.",
    "Which subsector in Utilities had the highest combined anomaly score? Show the leader page using the 5-day return."
  ];
  function gdInit(){
    var box=document.getElementById("qmEx20"); if(!box||document.getElementById("hx105Tiles")) return false;
    var el=document.createElement("details"); el.id="hx105Tiles"; el.open=true; el.style.marginTop="10px";
    el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600">Anomaly leader pages: '+GD_Q.length+' example questions. Run one, or Edit it into your own</summary>'+
      '<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);margin-top:10px">'+
      '<div class="mini" style="margin-bottom:6px;color:var(--ink-2)">A structured, multi-table read of a group-anomaly ranking: a title, a leader paragraph, a one-row summary, the full member table, a coverage checklist and a metric definition -- an alternative to the usual short-answer style. Say &ldquo;leader page&rdquo; in your own question to get this layout for a combined-anomaly-score query.</div>'+
      GD_Q.map(function(q){ return '<div style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:3px 0"><span style="flex:1;color:var(--ink)">'+hE(q)+'</span><button type="button" class="up-link-btn" data-hx105run="'+hE(q)+'">Run</button><button type="button" class="up-link-btn" data-hx105edit="'+hE(q)+'">Edit</button></div>'; }).join("")+
      '</div>';
    box.parentNode.insertBefore(el,box);
    el.addEventListener("click",function(e){
      var r=e.target.closest?e.target.closest("[data-hx105run],[data-hx105edit]"):null; if(!r) return; e.preventDefault();
      var q=r.getAttribute("data-hx105run")||r.getAttribute("data-hx105edit");
      if(r.hasAttribute("data-hx105run")){ try{ qmSubmit(q); }catch(err){} }
      else { var inp=document.getElementById("qmInput"); if(inp){ inp.value=q; inp.focus(); try{ inp.setSelectionRange(q.length,q.length); }catch(err){} inp.scrollIntoView({behavior:"smooth",block:"center"}); } }
    });
    return true;
  }
  if(!gdInit()){ var tries=0, iv=setInterval(function(){ tries++; if(gdInit()||tries>40) clearInterval(iv); },250); }
}catch(e){ try{ console.warn("v105 tile disabled: "+(e&&e.message)); }catch(e2){} }

/* v106 hook: the two pieces of this layer's "leader page" parsing that a later layer needs to reuse are
   (1) reading a NAMED PARENT SECTOR out of the question text and checking it is a real sector in the loaded
   scan (the same phrase-matching + validation gdParse/qmValidateAny105 already do above, via qmSecMentions().inn
   and ctx.secStats), and (2) the "at least N members" minimum-group-size phrase (the same regex `o.minN` above
   already parses). Exposed once here so v106 (general sector + minimum-size scoping on the default Ask answer)
   does not re-implement either match a second time; nothing above changes shape or behaviour. */
try{
  window.__gaScope=window.__gaScope||{};
  window.__gaScope.parentSecOf=function(t,ctx){
    ctx=ctx||QM_CTX; if(!ctx) return null;
    var SM=qmSecMentions(t); if(!SM.inn.length) return null;
    var k=SM.inn[0];
    return (ctx.secStats&&ctx.secStats[k])?k:null;
  };
  window.__gaScope.minNOf=function(t){
    var mn=t.match(/\bat least (\d{1,2})\b[^.]{0,24}\bmembers?\b/); return mn?parseInt(mn[1],10):null;
  };
}catch(e){}
}catch(e){ try{ console.warn("v105 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
