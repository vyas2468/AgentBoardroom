/* ================= v104: Backtest (historical replay) =================
   Point-in-time replay of a TRACKED portfolio's frozen spec against a merged, multi-date historical scan CSV plus a
   matching part-E price-history CSV. Every piece of "what does this spec pick" and "what does a trade timeline turn
   into" logic is REUSED verbatim from the functions that already exist and are already tested:
     - upParseCSV(text)            -- scan CSV -> {universe,sectors,symbols,extra}, the exact shape S/U/SEC/SYM
                                       already are (orig.html part A/B). Same function upProcessCSVText() calls on a
                                       real "Update" drop.
     - window.__hxApi.parse(text)  -- the part-E history CSV -> {dates,syms,opens,...} shape HX already is. This is
                                       hxParseCsv() from v81 (section 1a), exposed by a one-line additive hook there
                                       (see v81.js "v104 hook" comment) because it was not reachable from outside
                                       v81's closure.
     - qmBuildCtx() / qmEnrich()   -- the same two calls updateAll() (v103) makes to build the enriched row context.
     - qmValidateAny() / qmRun()   -- the same validate+run pair updateAll() makes to re-run a frozen spec.
     - window.__trk.picksOf()      -- the same picks extractor used when a portfolio is first tracked / updated.
     - window.__trk.pkeyOf() / .filterRebal() -- the same weekly/monthly/quarterly/yearly rebalance-eligible-entry
                                       filter engine() itself uses, exposed by a one-line additive hook in v103.js.
     - window.__trk.engine()       -- the pure, 40-assertion-tested trade/cost/weight engine. NEVER reimplemented.

   Safety (the load-bearing property): S, U, SEC, SYM, HX, HXM, HXC and QM_CTX are the only globals a point-in-time
   replay needs to change, and replayDate() below is the ONLY place in this layer that ever assigns them. It saves
   the live values, substitutes, runs an optional callback, and ALWAYS restores in a finally -- even if the parse,
   the callback, or anything inside it throws -- so a backtest can never leave the app's live loaded scan or price
   history altered. See backtest_unit.js for an explicit "force an error mid-replay, assert nothing changed" test.

   No-look-ahead: each replay date is built from (a) ONLY that date's own rows of the merged scan CSV and (b) a price
   history TRUNCATED to bars with Date <= that date, freshly rebuilt from the raw CSV text every time. Nothing from
   a later date is ever visible to an earlier date's computation.

   Honesty about what can and cannot be replayed: see checkReproducibility() below. A spec that diversifies by
   Hidden Group / price cluster (kinds "hsmart" and "hcport" in oneper/blocks/cluster mode) needs a 252-bar (~1
   year) price history immediately before the first replay date to compute the same 252-bar dendrogram cut the live
   page uses (window.__hxClusters, itself reading window.__hxApi / HX -- which IS truncated and substituted here,
   so when there ARE enough prior bars the recompute is exact, not approximated). When there are not enough prior
   bars, this is detected up front and the whole backtest is refused with a clear reason, rather than silently
   running the cluster logic on a too-short window. A spec whose universe is ETF-only (spec.uni==="etf") is refused
   up front if the supplied historical scan CSV has no Sector=ETF rows on the first eligible date. Everything else
   the frozen spec can test (filters, sector/subsector membership, trend/severity/composite fields, Hidden Group /
   price-cluster EXIT-reason cosmetics) is read straight off each date's own scan-CSV columns, which is exactly
   what the live engine already reads -- no separate reimplementation, so nothing else needs a special case. */
(function(){
try{

function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function money(v){ return num(v)?v.toLocaleString("en-US",{maximumFractionDigits:0}):"–"; }
function pct(v,d){ return num(v)?((v>0?"+":"")+v.toFixed(d===undefined?2:d)+"%"):"–"; }

/* Tiny date normaliser (YYYY-MM-DD or M/D/YY[YY] -> ISO). Not "column mapping" -- a pure string reformat, already
   duplicated independently at least twice in this codebase (v81's hxDate(), v103's iso()); a third tiny copy here
   is the same accepted pattern, not a reimplementation of any business rule. */
function bkIso(s){
  s=String(s===undefined||s===null?"":s).trim().replace(/^"|"$/g,"");
  var m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[3]).slice(-2);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/); if(m) return (m[3].length===2?"20"+m[3]:m[3])+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2);
  return null;
}

/* ================= 1. safe substitution ================= */
/* replayDate(dateStr, scanCsvTextForThatDate, truncatedHx, runFn):
   Parses ONE date's scan CSV with the real upParseCSV(), substitutes S/U/SEC/SYM/HX/HXM/HXC/QM_CTX for the
   duration of this call, builds ctx via qmBuildCtx()+qmEnrich() (QM_CTX is set to it because qmValidate() itself
   reads the QM_CTX GLOBAL, not a parameter -- see orig.html's qmValidate() reading QM_CTX.bySym directly), then:
     - if runFn is given, calls runFn(ctx) and returns its result (this is how backtestPortfolio() safely runs
       qmValidateAny()+qmRun() against the point-in-time state, exactly as updateAll() runs them against the live
       state, without ever touching the live globals from outside this function);
     - else returns ctx itself.
   The finally block ALWAYS restores every substituted global before this function returns to its caller. */
function replayDate(dateStr,scanCsvTextForThatDate,truncatedHx,runFn){
  var saved={S:S,U:U,SEC:SEC,SYM:SYM,HX:HX,HXM:HXM,HXC:HXC,QM_CTX:QM_CTX};
  try{
    var scan=upParseCSV(scanCsvTextForThatDate);
    S=scan; U=scan.universe; SEC=scan.sectors; SYM=scan.symbols;
    HX=truncatedHx||null; HXM=null; HXC=null;
    var ctx=qmBuildCtx();
    if(ctx) qmEnrich(ctx);
    QM_CTX=ctx;
    if(typeof runFn==="function") return runFn(ctx);
    return ctx;
  } finally {
    S=saved.S; U=saved.U; SEC=saved.SEC; SYM=saved.SYM;
    HX=saved.HX; HXM=saved.HXM; HXC=saved.HXC; QM_CTX=saved.QM_CTX;
  }
}

/* ================= 2. CSV helpers (reuse upCSVParse's tokenizer; never a second column-mapper) ================= */
function csvLines(text){ var t=String(text||"").replace(/\r\n?/g,"\n"); var ls=t.split("\n"); while(ls.length&&ls[ls.length-1]==="") ls.pop(); return ls; }
function csvQuote(v){ v=(v===undefined||v===null)?"":String(v); if(/[",\n\r]/.test(v)) return '"'+v.replace(/"/g,'""')+'"'; return v; }
function csvSerialize(header,rows){ var out=[header.map(csvQuote).join(",")]; rows.forEach(function(r){ out.push(header.map(function(h){ return csvQuote(r[h]); }).join(",")); }); return out.join("\r\n"); }

/* Groups the MERGED multi-date scan CSV by its own Date column, using upCSVParse() (the same low-level, quote-aware
   tokenizer upParseCSV() itself uses) so grouping never re-implements CSV parsing. Returns per-date row objects in
   the ORIGINAL header's column order/names so each date's subset can be re-serialized and re-fed to upParseCSV(),
   which then does 100% of the real column mapping and validation, per date, exactly as a single-day file would. */
function groupScanByDate(mergedCsvText){
  var parsed=upCSVParse(mergedCsvText), header=parsed.header, rows=parsed.rows;
  if(header.indexOf("Date")<0) throw new Error("The merged historical scan CSV has no Date column.");
  var byDate={}, order=[];
  rows.forEach(function(r){
    var iso=bkIso(r.Date); if(!iso) return;
    if(!byDate[iso]){ byDate[iso]=[]; order.push(iso); }
    byDate[iso].push(r);
  });
  order.sort();
  return {header:header,byDate:byDate,dates:order};
}

/* All distinct ISO dates present in the raw price-history CSV text (cheap header/date-only scan, no full parse). */
function histDatesOf(priceHistoryCsvText){
  var lines=csvLines(priceHistoryCsvText); if(!lines.length) return [];
  var head=lines[0].split(",").map(function(c){ return c.trim(); }), iD=head.indexOf("Date");
  if(iD<0) return [];
  var set={};
  for(var i=1;i<lines.length;i++){ if(!lines[i]) continue; var iso=bkIso(lines[i].split(",")[iD]); if(iso) set[iso]=1; }
  return Object.keys(set).sort();
}

/* Truncates the raw price-history CSV text to bars with Date <= d, using the SAME simple (non-quoted) cell split
   hxParseCsv() itself uses, so the truncated text round-trips through window.__hxApi.parse() identically to how
   the live "Load price history" file would if it only contained bars up to that date. */
function truncateHistoryText(priceHistoryCsvText,d){
  var lines=csvLines(priceHistoryCsvText); if(!lines.length) return "";
  var head=lines[0].split(",").map(function(c){ return c.trim(); }), iD=head.indexOf("Date");
  if(iD<0) throw new Error("The price-history CSV has no Date column.");
  var out=[lines[0]];
  for(var i=1;i<lines.length;i++){
    if(!lines[i]) continue;
    var iso=bkIso(lines[i].split(",")[iD]);
    if(iso&&iso<=d) out.push(lines[i]);
  }
  return out.join("\n");
}
function buildTruncatedHx(priceHistoryCsvText,d){
  var api=window.__hxApi;
  if(!api||typeof api.parse!=="function") return {error:"The price-history parser (window.__hxApi.parse) is not available."};
  var txt=truncateHistoryText(priceHistoryCsvText,d);
  var res;
  try{ res=api.parse(txt); }catch(e){ return {error:"could not parse the history truncated to "+d+": "+e.message}; }
  if(res.gates&&res.gates.length) return {error:"history truncated to "+d+": "+res.gates.join(" | ")};
  return {hx:res.hx};
}

/* ================= 3. rebalance-eligible dates (reuse filterRebal/pkeyOf verbatim, do not reimplement) ========= */
function eligibleDates(allDatesAsc,mode){
  var trk=window.__trk;
  if(!trk||typeof trk.filterRebal!=="function") throw new Error("window.__trk.filterRebal is not available (v103 hook missing).");
  var pseudo=allDatesAsc.map(function(d){ return {d:d}; });
  return trk.filterRebal(pseudo,mode).map(function(x){ return x.d; });
}

/* ================= 4. honesty check: what can/can't be point-in-time replayed ================= */
/* Returns {blocking:reason} to refuse the WHOLE backtest before running anything, or {advisory:[...]} notes to show
   alongside a backtest that did run, or {} when the spec is fully reproducible with no caveats. */
function checkReproducibility(port,scanGroup,allHistDatesAsc,eligible){
  var sp=port.spec||{}, out={};
  var usesCluster=sp.kind==="hsmart"||(sp.kind==="hcport"&&/oneper|blocks|cluster/i.test(String(sp.mode||"")));
  if(usesCluster&&eligible.length){
    var first=eligible[0];
    var priorBars=allHistDatesAsc.filter(function(d){ return d<first; }).length;
    if(priorBars<252){
      out.blocking="This portfolio's rules (kind \""+sp.kind+(sp.mode?"/"+sp.mode:"")+"\") diversify by Hidden Group / "+
        "price cluster, which needs a 252-bar (about one trading year) price history immediately BEFORE the first "+
        "replay date ("+first+") to compute the same 252-bar cluster cut the live page uses. Only "+priorBars+
        " prior bar(s) are available in the supplied price-history file before "+first+", so the earliest replay "+
        "date cannot be reproduced point-in-time. Supply a longer price-history file (covering at least a year "+
        "before the first date you want to backtest), or pick a later start date.";
      return out;
    }
  }
  if(sp.uni==="etf"&&eligible.length){
    var rows0=scanGroup.byDate[eligible[0]]||[];
    var hasEtf=rows0.some(function(r){ return r.Sector==="ETF"; });
    if(!hasEtf){
      out.blocking="This portfolio's rules pick from the ETF universe (spec.uni=\"etf\"), but the supplied historical "+
        "scan CSV has no rows with Sector=ETF on "+eligible[0]+". An ETF-only portfolio cannot be replayed from a "+
        "stocks-only scan export.";
      return out;
    }
  }
  return out;
}

/* ================= 5. the replay loop ================= */
/* backtestPortfolio(port, mergedHistoricalCsvText, priceHistoryCsvText) -> {
     ok:bool, notReproducible:string|null, error:string|null, dates:[...], ups:[...], result:(engine() output) }
   Never mutates port. Never leaves S/U/SEC/SYM/HX/HXM/HXC/QM_CTX changed after it returns (every substitution goes
   through replayDate(), which restores in a finally). */
function backtestPortfolio(port,mergedHistoricalCsvText,priceHistoryCsvText){
  var out={ok:false,notReproducible:null,error:null,dates:[],ups:null,result:null,advisory:null};
  var trk=window.__trk;
  if(!trk||typeof trk.picksOf!=="function"||typeof trk.filterRebal!=="function"||typeof trk.engine!=="function"){
    out.error="The portfolio tracker engine is not available."; return out;
  }
  var g;
  try{ g=groupScanByDate(mergedHistoricalCsvText); }catch(e){ out.error="Could not read the merged historical scan CSV: "+e.message; return out; }
  if(!g.dates.length){ out.error="No usable dated rows found in the historical scan CSV."; return out; }
  var mode=(port.settings&&port.settings.rebalance)||"daily";
  var eligible;
  try{ eligible=eligibleDates(g.dates,mode); }catch(e){ out.error=e.message; return out; }
  if(!eligible.length){ out.error="No rebalance-eligible dates were found for this portfolio's rebalance setting ("+mode+")."; return out; }
  var allHistDatesAsc=histDatesOf(priceHistoryCsvText);
  var rep=checkReproducibility(port,g,allHistDatesAsc,eligible);
  if(rep.blocking){ out.notReproducible=rep.blocking; out.dates=eligible; return out; }
  if(rep.advisory) out.advisory=rep.advisory;

  var ups=[];
  for(var i=0;i<eligible.length;i++){
    var d=eligible[i];
    var rows=g.byDate[d];
    var scanText=csvSerialize(g.header,rows);
    var hxRes=buildTruncatedHx(priceHistoryCsvText,d);
    if(hxRes.error){ ups.push({d:d,picks:[],exits:{},skipped:true,reason:hxRes.error}); continue; }
    var stepErr=null, rec=null;
    replayDate(d,scanText,hxRes.hx,function(ctx){
      if(!ctx){ stepErr="Could not build a context for "+d+" (the scan parsed but produced no usable rows)."; return; }
      var v;
      try{ v=qmValidateAny(JSON.parse(JSON.stringify(port.spec))); }catch(e){ stepErr=d+": spec validation threw ("+e.message+")"; return; }
      if(v.error){ stepErr=d+": "+v.error; return; }
      var res;
      try{ res=qmRun(v.spec,ctx); }catch(e){ stepErr=d+": could not run the spec ("+e.message+")"; return; }
      var picks;
      try{ picks=trk.picksOf(res||{}); }catch(e){ picks=[]; }
      rec={d:d,picks:picks,exits:{}};
    });
    if(stepErr){ out.error=stepErr; return out; }
    ups.push(rec);
  }
  out.dates=eligible; out.ups=ups;

  var fullRes;
  try{ fullRes=window.__hxApi.parse(priceHistoryCsvText); }catch(e){ out.error="Could not parse the full price-history file: "+e.message; return out; }
  if(fullRes.gates&&fullRes.gates.length){ out.error="Could not parse the full price-history file: "+fullRes.gates.join(" | "); return out; }

  var pseudoPort={settings:port.settings||{},ups:ups.filter(function(u){ return !u.skipped; })};
  if(!pseudoPort.ups.length){ out.error="Every replay date was skipped (see reasons on each ups[] entry) -- nothing to compute."; return out; }
  var result;
  try{ result=trk.engine(pseudoPort,fullRes.hx,"RSP"); }catch(e){ out.error="engine() threw: "+e.message; return out; }
  out.result=result; out.ok=true;
  return out;
}

window.__bt={replayDate:replayDate,backtestPortfolio:backtestPortfolio,groupScanByDate:groupScanByDate,
  buildTruncatedHx:buildTruncatedHx,eligibleDates:eligibleDates,checkReproducibility:checkReproducibility,bkIso:bkIso,
  /* test-support only (used by backtest_unit.js): S/U/SEC/SYM/HX/HXM/HXC/QM_CTX are not on window (they live in the
     shared closure this whole spliced page runs in), so a Playwright page.evaluate() from outside that closure
     cannot reach them directly. These three read-only/pass-through helpers let the test harness (a) read the exact
     same live references replayDate() itself saves and restores, to prove restore-on-error by reference equality
     from within the same in-page evaluate call, (b) build the live ctx the real Ask/tracker code already uses, to
     compare against replayDate()'s substituted ctx for the same CSV text, and (c) drive the REAL single-day ingest
     path (upParseCSV+upStore, the same two calls upProcessCSVText() makes) for that comparison. None of the three
     substitutes or mutates anything beyond what the real ingest path already does. */
  snapshot:function(){ return {S:S,U:U,SEC:SEC,SYM:SYM,HX:HX,HXM:HXM,HXC:HXC,QM_CTX:QM_CTX}; },
  liveCtx:function(){ var c=qmBuildCtx(); if(c) qmEnrich(c); return c; },
  realIngestAndReload:function(text){ var scan=upParseCSV(text); upStore(scan); location.reload(); }};

/* ================= 6. UI: "Backtest (historical replay)" section under the Portfolio Tracker tab =================
   Additive only: wraps window.__trk.render (the existing Portfolio Tracker tab renderer) so every normal render
   still happens unchanged, then appends one more section at the end of the same pane. Uses its own portfolio
   picker (not the tracker's private SEL, which is not exported) so this never depends on which portfolio the live
   tracker view happens to be showing. */
var BT={portId:null,f1:null,f2:null,running:false,out:null,err:null};

function btChart(E,title){
  if(!E||E.length<2) return '<p class="mini">Not enough bars to draw a curve.</p>';
  var e0=E[0].v||1, b0=(E[0].b!==null&&E[0].b!==undefined)?E[0].b:null;
  var P=E.map(function(p){ return {v:p.v/e0*100,b:num(b0)&&num(p.b)?p.b/b0*100:null}; });
  var W=760,H=220,ml=42,mr=10,mt=20,mb=24,pw=W-ml-mr,ph=H-mt-mb;
  var vals=[]; P.forEach(function(p){ vals.push(p.v); if(num(p.b)) vals.push(p.b); });
  var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals); if(hi===lo){ hi+=1; lo-=1; }
  function X(i){ return ml+i/(P.length-1)*pw; } function Y(v){ return mt+ph-(v-lo)/(hi-lo)*ph; }
  function path(k,c,w,dash){ var d=""; P.forEach(function(p,i){ if(!num(p[k])) return; d+=(d?"L":"M")+X(i).toFixed(1)+" "+Y(p[k]).toFixed(1); }); return d?'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 3"':'')+'/>':""; }
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:'+W+'px;display:block;background:var(--surface)">'+
    '<text x="10" y="14" font-size="12" fill="var(--ink)">'+hE(title)+'</text>'+
    path("b","var(--muted)",1.5,true)+path("v","var(--accent)",2,false)+
    '<text x="'+ml+'" y="'+(H-6)+'" font-size="10" fill="var(--muted)">'+hE(P.length?E[0].d:"")+'</text>'+
    '<text x="'+(W-mr)+'" y="'+(H-6)+'" font-size="10" text-anchor="end" fill="var(--muted)">'+hE(P.length?E[E.length-1].d:"")+'</text>'+
    '</svg>';
}
function btTbl(head,body){
  var h='<table class="tbl"><thead><tr>'+head.map(function(x){ return "<th>"+hE(x)+"</th>"; }).join("")+"</tr></thead><tbody>";
  body.forEach(function(r){ h+="<tr>"+r.map(function(x){ return "<td>"+hE(x)+"</td>"; }).join("")+"</tr>"; });
  return h+"</tbody></table>";
}

function btSection(){
  var ST=window.__trk.state(); var ports=(ST&&ST.ports)||[];
  var h=['<hr style="margin:22px 0 12px"><h3 style="margin:4px 0 4px">Backtest (historical replay)</h3>',
    '<p class="mini" style="max-width:900px">A separate, historical <b>replay</b> of a tracked portfolio\'s frozen rules against your OWN merged multi-date scan export and a matching part-E price history — not the live forward tracking above. Each replay date uses ONLY that date\'s own scan row and price bars up to and including that date; nothing later is ever visible to an earlier date.</p>'];
  if(!ports.length){ h.push('<p class="mini">Nothing tracked yet.</p>'); return h.join(""); }
  if(BT.portId===null||!ports.some(function(p){ return p.id===BT.portId; })) BT.portId=ports[ports.length-1].id;
  h.push('<p style="margin:6px 0"><label><b>Portfolio to backtest:</b> <select id="bt104Sel" style="max-width:100%;font:inherit;padding:4px 6px">'+
    ports.map(function(p){ return '<option value="'+p.id+'"'+(p.id===BT.portId?" selected":"")+'>'+hE(p.name)+'</option>'; }).join("")+
    '</select></label></p>');
  h.push('<p style="margin:6px 0"><label>Merged historical scan CSV (one row per symbol per date, many dates): <input type="file" id="bt104File1" accept=".csv,text/csv"></label></p>');
  h.push('<p style="margin:6px 0"><label>Matching part-E price-history CSV (Date,Symbol,HOpen,HHigh,HLow,HClose): <input type="file" id="bt104File2" accept=".csv,text/csv"></label></p>');
  h.push('<p style="margin:6px 0"><button type="button" class="btn" id="bt104Run"'+(BT.running?" disabled":"")+'>'+(BT.running?"Running…":"Run backtest")+'</button>'+
    (BT.f1&&BT.f2?' <span class="mini">'+hE(BT.f1.name)+" + "+hE(BT.f2.name)+"</span>":' <span class="mini">Choose both files first.</span>')+'</p>');
  if(BT.err) h.push('<p class="mini" style="color:var(--neg)">Could not run: '+hE(BT.err)+'</p>');
  var r=BT.out;
  if(r&&r.notReproducible){
    h.push('<div class="mini" style="margin:8px 0;padding:8px 10px;border-left:3px solid var(--neg)"><b>Not reproducible point-in-time:</b> '+hE(r.notReproducible)+'</div>');
  } else if(r&&r.error){
    h.push('<p class="mini" style="color:var(--neg)">Backtest error: '+hE(r.error)+'</p>');
  } else if(r&&r.ok){
    if(r.advisory&&r.advisory.length) h.push('<div class="mini" style="margin:8px 0;padding:8px 10px;border-left:3px solid var(--accent)">'+r.advisory.map(hE).join("<br>")+'</div>');
    var st=r.result.stats;
    h.push('<p class="mini">Replayed '+r.dates.length+' rebalance-eligible date(s) from '+hE(r.dates[0])+' to '+hE(r.dates[r.dates.length-1])+'.</p>');
    if(st) h.push(btTbl(["Measure","Value"],[
      ["Period",st.start+" to "+st.end+" ("+st.days+" bars)"],
      ["Value (start 100,000)",money(st.value)],["Return",pct(st.ret)],["RSP over the same days",pct(st.bench)],
      ["Max drawdown",pct(st.mdd)],["Annualised volatility",num(st.vol)?st.vol.toFixed(1)+"%":"–"],
      ["Sharpe-style ratio",num(st.sharpe)?st.sharpe.toFixed(2):"–"],
      ["Closed trades / win rate",st.trades+" / "+(num(st.win)?st.win.toFixed(0)+"%":"–")]
    ]));
    h.push(btChart(r.result.equity,"Backtest value vs RSP (both = 100 at the first fill)"));
  }
  return h.join("");
}

function btAppendUI(){
  var pane=document.getElementById("pane-ptk"); if(!pane) return;
  var div=document.getElementById("bt104Wrap");
  if(!div){ div=document.createElement("div"); div.id="bt104Wrap"; pane.appendChild(div); }
  div.innerHTML=btSection();
}

function readFile(f){
  return new Promise(function(res,rej){
    var r=new FileReader();
    r.onload=function(){ res(String(r.result)); };
    r.onerror=function(){ rej(new Error("could not read "+f.name)); };
    r.readAsText(f);
  });
}

document.addEventListener("change",function(e){
  if(e.target&&e.target.id==="bt104Sel"){ BT.portId=e.target.value; BT.out=null; BT.err=null; btAppendUI(); return; }
  if(e.target&&e.target.id==="bt104File1"){ BT.f1=(e.target.files&&e.target.files[0])||null; btAppendUI(); return; }
  if(e.target&&e.target.id==="bt104File2"){ BT.f2=(e.target.files&&e.target.files[0])||null; btAppendUI(); return; }
});
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#bt104Run"):null; if(!t) return;
  if(!BT.f1||!BT.f2||BT.running) return;
  var ST=window.__trk.state(), port=(ST&&ST.ports||[]).filter(function(p){ return p.id===BT.portId; })[0];
  if(!port){ BT.err="Pick a portfolio first."; btAppendUI(); return; }
  BT.running=true; BT.err=null; BT.out=null; btAppendUI();
  Promise.all([readFile(BT.f1),readFile(BT.f2)]).then(function(texts){
    var res;
    try{ res=backtestPortfolio(port,texts[0],texts[1]); }catch(err){ BT.err=err&&err.message?err.message:String(err); BT.running=false; btAppendUI(); return; }
    BT.out=res; BT.running=false; btAppendUI();
  },function(err){ BT.err=err&&err.message?err.message:String(err); BT.running=false; btAppendUI(); });
});

/* v103's own click handlers call its LOCAL render() function directly (a closure variable), not
   window.__trk.render -- so wrapping window.__trk.render alone would never see those re-renders. Instead, listen
   for the exact same DOM events v103 already listens for (tab open, Update all tracked, view/rename/delete/settings,
   the portfolio-detail <select>, and the "hxchange" event v103 also reacts to) and, since these listeners are
   registered AFTER v103's (this layer is spliced in after v103.js), they run AFTER v103's own listener has already
   rebuilt #pane-ptk's innerHTML -- so appending our section here is always additive, never racing v103's render. */
try{
  var origRender=window.__trk&&window.__trk.render;
  if(typeof origRender==="function"){
    window.__trk.render=function(){ origRender(); try{ btAppendUI(); }catch(e){ try{ console.warn("v104 backtest UI: "+(e&&e.message)); }catch(e2){} } };
  }
}catch(e){}
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#tab-ptk,[data-trkupd],[data-trksel],[data-trkren],[data-trkdel],[data-trkcsv],[data-trkgo],[data-trkrensave],[data-trkcancel],[data-trkundo],[data-trkset],[data-trksetsave]"):null;
  if(!t) return;
  try{ btAppendUI(); }catch(e2){ try{ console.warn("v104 backtest UI: "+(e2&&e2.message)); }catch(e3){} }
});
document.addEventListener("change",function(e){
  if(e.target&&e.target.id==="hx103Sel"){ try{ btAppendUI(); }catch(e2){} }
});
window.addEventListener("hxchange",function(){ try{ var pn=document.getElementById("pane-ptk"); if(pn&&!pn.hidden) btAppendUI(); }catch(e){} });

}catch(e){ try{ console.warn("v104 Backtest layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
