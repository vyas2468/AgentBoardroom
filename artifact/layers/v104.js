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

/* ================= 2b. FAST truncation (v105 speed-up, additive) =================
   buildTruncatedHx() above re-parses the ENTIRE raw price-history CSV text from scratch on every
   single replay date (truncateHistoryText() re-scans every line of the raw text, then
   window.__hxApi.parse() -- hxParseCsv() from v81 -- re-tokenizes and re-validates the truncated
   subset) -- for a daily-rebalance backtest over ~260 dates against a 300k+ row price-history
   file, that is ~260 full linear passes over the whole file. buildHxFrame() below does the
   equivalent per-row work (the same bkIso() date cutoff truncateHistoryText() uses, and the same
   header lookup, symbol-regex/value-finiteness row validity and HX_KEEP=300 trailing-window trim
   hxParseCsv() -- section 1a of v81.js -- uses) exactly ONCE, into a structure kept sorted by
   date; sliceHxFrame()/buildTruncatedHxFast() then advance a pointer through that structure as
   the (always-ascending) replay date advances, which is the same total work but done once instead
   of once-per-date. This is proven equivalent, date for date, to buildTruncatedHx() above -- see
   backtest_fast_unit.js, which runs both across every eligible date of several real fixtures at
   different rebalance frequencies and asserts the resulting hx objects are deeply equal -- before
   computeUps() below is switched to call the fast path by default. buildTruncatedHx() itself is
   left completely unchanged (still exported below) as both the reference this equivalence is
   checked against and a fallback. */
var HX_KEEP_FAST=300;
function hxSymOkFast(s){ return /^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(s); }
function hxCellFast(s){ return String(s===undefined||s===null?"":s).trim().replace(/^"|"$/g,""); }
/* One pass over the raw CSV text: for every data line, the SAME date (bkIso -- the exact cutoff
   truncateHistoryText() itself uses), symbol and HClose/Open columns hxParseCsv() would read, plus
   whether hxParseCsv() would count the row as valid (symbol regex + finite value > 0). Lines with
   no parseable date are dropped entirely, exactly as truncateHistoryText() drops them from the
   truncated text before it ever reaches hxParseCsv(). Throws on a missing Date column, exactly as
   truncateHistoryText() itself throws (a v104 backtest was never resilient to that; nothing
   upstream catches it either, so this matches the existing behavior precisely). */
function buildHxFrame(priceHistoryCsvText){
  var lines=csvLines(priceHistoryCsvText);
  var frame={rows:[],ptr:0,n:0,bad:0,ds:[],dsSet:{},by:{},byO:{},hasOpens:false,error:null};
  if(!lines.length) return frame;
  var head=lines[0].split(",").map(function(c){ return c.trim(); });
  var iD=head.indexOf("Date");
  if(iD<0) throw new Error("The price-history CSV has no Date column.");
  var iS=head.indexOf("Symbol"), iC=head.indexOf("HClose");
  if(iC<0) iC=head.indexOf("Close"); if(iC<0) iC=head.indexOf("Price");
  var iO=head.indexOf("HOpen"); if(iO<0) iO=head.indexOf("Open");
  frame.hasOpens=iO>=0;
  if(iS<0||iC<0){
    var g=[]; if(iS<0) g.push("no Symbol column"); if(iC<0) g.push("no HClose column");
    frame.error="This does not look like the part E history file: "+g.join(", ")+". The header was: "+lines[0].slice(0,160);
    return frame;
  }
  for(var i=1;i<lines.length;i++){
    if(!lines[i]) continue;
    var cells=lines[i].split(",");
    var iso=bkIso(cells[iD]); if(!iso) continue;
    var sym=hxCellFast(cells[iS]).toUpperCase();
    var v=parseFloat(hxCellFast(cells[iC]));
    var ok=hxSymOkFast(sym)&&isFinite(v)&&v>0;
    var open=null;
    if(iO>=0){ var o=parseFloat(hxCellFast(cells[iO])); if(isFinite(o)&&o>0) open=o; }
    frame.rows.push({iso:iso,sym:sym,v:v,open:open,ok:ok});
  }
  frame.rows.sort(function(a,b){ return a.iso<b.iso?-1:(a.iso>b.iso?1:0); }); // stable: ties keep file order
  return frame;
}
/* Advances frame's pointer to include every row with iso<=d (rows are sorted ascending, and d only
   ever grows across a single backtest's date loop, so this never re-scans a row twice), then
   reproduces hxParseCsv()'s own gates/output construction from what has accumulated so far. */
function sliceHxFrame(frame,d){
  if(frame.error) return {error:frame.error};
  if(!frame.rows.length&&frame.ptr===0&&frame.n===0){ /* nothing to advance into either way */ }
  var rows=frame.rows;
  while(frame.ptr<rows.length&&rows[frame.ptr].iso<=d){
    var r=rows[frame.ptr]; frame.ptr++; frame.n++;
    if(!r.ok){ frame.bad++; continue; }
    (frame.by[r.sym]=frame.by[r.sym]||{})[r.iso]=r.v;
    if(!frame.dsSet[r.iso]){ frame.dsSet[r.iso]=1; frame.ds.push(r.iso); }
    if(frame.hasOpens&&r.open!==null) (frame.byO[r.sym]=frame.byO[r.sym]||{})[r.iso]=r.open;
  }
  if(frame.n===0) return {error:"The file is empty."};
  var gates=[];
  var all=frame.ds, dates=all.length>HX_KEEP_FAST?all.slice(all.length-HX_KEEP_FAST):all.slice();
  var syms=Object.keys(frame.by).sort(), last=dates[dates.length-1];
  if(syms.length<50) gates.push("only "+syms.length+" symbols (at least 50 expected)");
  if(dates.length<60) gates.push("only "+dates.length+" bars (at least 60 expected; part E asks for 280)");
  if(frame.n&&frame.bad/frame.n>0.05) gates.push(frame.bad+" of "+frame.n+" rows could not be read");
  var onLast=syms.filter(function(s){ return frame.by[s][last]!==undefined; }).length;
  if(syms.length&&onLast/syms.length<0.8) gates.push("only "+onLast+" of "+syms.length+" symbols have the newest bar "+last);
  if(gates.length) return {error:gates.join(" | ")};
  var out={};
  syms.forEach(function(s){ var m=frame.by[s]; out[s]=dates.map(function(dd){ var v=m[dd]; return v===undefined?null:Math.round(v*1e4)/1e4; }); });
  var opens=null;
  if(frame.hasOpens){ opens={}; syms.forEach(function(s){ var m=frame.byO[s]||{}; opens[s]=dates.map(function(dd){ var v=m[dd]; return v===undefined?null:Math.round(v*1e4)/1e4; }); }); }
  var hx={v:1,dates:dates,syms:out,lastDate:last,nSyms:syms.length,bars:dates.length,rows:frame.n,badRows:frame.bad};
  if(opens) hx.opens=opens;
  return {hx:hx};
}
function buildTruncatedHxFast(frame,d){
  var r=sliceHxFrame(frame,d);
  if(r.error) return {error:"history truncated to "+d+": "+r.error};
  return {hx:r.hx};
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
/* computeUps(port, mergedHistoricalCsvText, priceHistoryCsvText, preGroupedScan) -> {
     ok:bool, notReproducible:string|null, error:string|null, dates:[...], ups:[...]|null, group:..., advisory:... }
   The per-date "what does this spec pick, point in time" loop, split out of backtestPortfolio() below so BOTH the
   full backtest (which then runs engine() over the result) and the new weights-only fast export (which does not)
   share the exact same picks -- the no-look-ahead replay logic is never duplicated. Field-by-field identical to
   what backtestPortfolio() computed inline before this split (same var names, same order, same early returns) --
   only the buildTruncatedHx() call was swapped for the equivalent-but-faster buildHxFrame()/buildTruncatedHxFast()
   pair (Optimization A; see the "2b. FAST truncation" comment above for the equivalence argument and
   backtest_fast_unit.js for the check this was verified against before being made the default). Never mutates
   port. Never leaves S/U/SEC/SYM/HX/HXM/HXC/QM_CTX changed after it returns (every substitution goes through
   replayDate(), which restores in a finally). */
function computeUps(port,mergedHistoricalCsvText,priceHistoryCsvText,preGroupedScan){
  var out={ok:false,notReproducible:null,error:null,dates:[],ups:null,group:null,advisory:null};
  var trk=window.__trk;
  if(!trk||typeof trk.picksOf!=="function"||typeof trk.filterRebal!=="function"){
    out.error="The portfolio tracker engine is not available."; return out;
  }
  /* v104 SPEED note: preGroupedScan (if supplied by the caller) is the already-computed groupScanByDate() result for
     this exact merged scan CSV text, reused as-is to skip a full re-parse when the same file is run again. out.group
     is always set to whatever grouping ends up used, so the caller can cache it keyed to the file's identity. */
  var g;
  if(preGroupedScan){ g=preGroupedScan; }
  else { try{ g=groupScanByDate(mergedHistoricalCsvText); }catch(e){ out.error="Could not read the merged historical scan CSV: "+e.message; return out; } }
  out.group=g;
  if(!g.dates.length){ out.error="No usable dated rows found in the historical scan CSV."; return out; }
  var mode=(port.settings&&port.settings.rebalance)||"daily";
  var eligible;
  try{ eligible=eligibleDates(g.dates,mode); }catch(e){ out.error=e.message; return out; }
  if(!eligible.length){ out.error="No rebalance-eligible dates were found for this portfolio's rebalance setting ("+mode+")."; return out; }
  var allHistDatesAsc=histDatesOf(priceHistoryCsvText);
  var rep=checkReproducibility(port,g,allHistDatesAsc,eligible);
  if(rep.blocking){ out.notReproducible=rep.blocking; out.dates=eligible; return out; }
  if(rep.advisory) out.advisory=rep.advisory;

  /* v105 SPEED (Optimization A): one frame built ONCE for the whole replay, instead of a full truncate+reparse of
     the raw CSV text on every eligible date. See buildHxFrame()'s own comment above. */
  var frame=buildHxFrame(priceHistoryCsvText);

  var ups=[];
  for(var i=0;i<eligible.length;i++){
    var d=eligible[i];
    var rows=g.byDate[d];
    var scanText=csvSerialize(g.header,rows);
    var hxRes=buildTruncatedHxFast(frame,d);
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
  out.dates=eligible; out.ups=ups; out.ok=true;
  return out;
}

/* backtestPortfolio(port, mergedHistoricalCsvText, priceHistoryCsvText) -> {
     ok:bool, notReproducible:string|null, error:string|null, dates:[...], ups:[...], result:(engine() output) }
   Unchanged in behavior from before the v105 split above: computeUps() for the picks, then the one, unchanged
   trk.engine() call over the whole picks timeline for the trade/cost/P&L/stats simulation. */
function backtestPortfolio(port,mergedHistoricalCsvText,priceHistoryCsvText,preGroupedScan){
  var pre=computeUps(port,mergedHistoricalCsvText,priceHistoryCsvText,preGroupedScan);
  var out={ok:false,notReproducible:pre.notReproducible,error:pre.error,dates:pre.dates,ups:pre.ups,result:null,advisory:pre.advisory,group:pre.group};
  if(!pre.ok) return out;
  var trk=window.__trk;
  if(!trk||typeof trk.engine!=="function"){ out.error="The portfolio tracker engine is not available."; return out; }

  var fullRes;
  try{ fullRes=window.__hxApi.parse(priceHistoryCsvText); }catch(e){ out.error="Could not parse the full price-history file: "+e.message; return out; }
  if(fullRes.gates&&fullRes.gates.length){ out.error="Could not parse the full price-history file: "+fullRes.gates.join(" | "); return out; }

  var pseudoPort={settings:port.settings||{},ups:pre.ups.filter(function(u){ return !u.skipped; })};
  if(!pseudoPort.ups.length){ out.error="Every replay date was skipped (see reasons on each ups[] entry) -- nothing to compute."; return out; }
  var result;
  try{ result=trk.engine(pseudoPort,fullRes.hx,"RSP"); }catch(e){ out.error="engine() threw: "+e.message; return out; }
  out.result=result; out.ok=true;
  return out;
}

/* ================= 5b. weights-only fast export (Optimization B) =================
   backtestWeightsOnly(port, mergedHistoricalCsvText, priceHistoryCsvText, preGroupedScan) -> {
     ok:bool, notReproducible, error, dates, ups, weights:[{d,s,side,weight}]|null, advisory, group }
   Runs the SAME no-look-ahead pick-selection loop as backtestPortfolio() (via the shared computeUps()) to get
   ups[], then, instead of calling trk.engine() for the full trade/cost/P&L/stats simulation, computes ONLY the
   per-date target weights using the exact same shared helpers engine() itself now calls (window.__trk.
   idxAfterOf/idxOnOrAfterOf/makeVolOf/weightRowsFor, extracted verbatim from v103.js's engine() -- see that
   file's "v105 hooks" comment) -- so the weighting formula is reused, never re-derived, and cannot drift from
   what engine() would compute. The resulting weights[] is built in exactly the same order/shape as engine()'s own
   out.weights (same {d,s,side,weight} records, same iteration order: ascending fill index, picks in rank order
   within each date), so weightsCsvOf() (below) produces a byte-identical CSV either way -- see
   backtest_weights_only_unit.js for the direct comparison this was checked against. */
function backtestWeightsOnly(port,mergedHistoricalCsvText,priceHistoryCsvText,preGroupedScan){
  var pre=computeUps(port,mergedHistoricalCsvText,priceHistoryCsvText,preGroupedScan);
  var out={ok:false,notReproducible:pre.notReproducible,error:pre.error,dates:pre.dates,ups:pre.ups,weights:null,advisory:pre.advisory,group:pre.group};
  if(!pre.ok) return out;
  var trk=window.__trk;
  if(!trk||typeof trk.idxAfterOf!=="function"||typeof trk.idxOnOrAfterOf!=="function"||typeof trk.makeVolOf!=="function"||typeof trk.weightRowsFor!=="function"){
    out.error="The portfolio tracker weighting helpers are not available."; return out;
  }
  var fullRes;
  try{ fullRes=window.__hxApi.parse(priceHistoryCsvText); }catch(e){ out.error="Could not parse the full price-history file: "+e.message; return out; }
  if(fullRes.gates&&fullRes.gates.length){ out.error="Could not parse the full price-history file: "+fullRes.gates.join(" | "); return out; }
  var hx=fullRes.hx;
  var upsAll=pre.ups.filter(function(u){ return !u.skipped; });
  if(!upsAll.length){ out.error="Every replay date was skipped (see reasons on each ups[] entry) -- nothing to compute."; return out; }
  var S=port.settings||{}, entry=S.entry||"open", rebal=S.rebalance||"daily", wm=S.weight||"eq";
  if(!hx||!hx.dates||!hx.dates.length){ out.weights=[]; out.ok=true; return out; }
  var ups=trk.filterRebal(upsAll,rebal);
  var D=hx.dates, C=hx.syms||{};
  var volOf=trk.makeVolOf(C);
  var sched=ups.map(function(u){ return {u:u,i:entry==="open"?trk.idxAfterOf(D,u.d):trk.idxOnOrAfterOf(D,u.d)}; });
  var run=sched.filter(function(x){ return x.i>=0; }).sort(function(a,b){ return a.i-b.i; });
  var weights=[];
  run.forEach(function(x){
    var n=x.u.picks.length; if(!n) return;
    trk.weightRowsFor(x.u.picks,wm,x.i,volOf).forEach(function(w){ weights.push({d:D[x.i],s:w.s,side:w.side,weight:w.weight}); });
  });
  out.weights=weights; out.ok=true;
  return out;
}

window.__bt={replayDate:replayDate,backtestPortfolio:backtestPortfolio,backtestWeightsOnly:backtestWeightsOnly,
  computeUps:computeUps,groupScanByDate:groupScanByDate,
  buildTruncatedHx:buildTruncatedHx,buildHxFrame:buildHxFrame,buildTruncatedHxFast:buildTruncatedHxFast,
  eligibleDates:eligibleDates,checkReproducibility:checkReproducibility,bkIso:bkIso,
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
var BT={portId:null,f1:null,f2:null,running:false,out:null,err:null,
  /* Optimization B state: a SEPARATE run/result from the full "Run backtest" above -- clicking either button never
     touches the other's state, so both can be inspected independently and neither's rendering changes when the
     other runs. */
  wRunning:false,wOut:null,wErr:null};
/* v104 SPEED: in-memory cache of the parsed file inputs, keyed by (name+size+lastModified) so re-clicking "Run
   backtest" with the SAME two File objects (BT.f1/BT.f2 persist across clicks) skips the FileReader read and, for
   the merged scan CSV, the groupScanByDate() re-parse -- reusing the exact same parsed structure instead. Picking a
   different file (any of name/size/lastModified differs) or clearing the input naturally misses the cache, since
   the key no longer matches; nothing needs to be explicitly invalidated. */
var FCACHE={f1:null,f2:null};
function fkeyOf(f){ return f?(f.name+"|"+f.size+"|"+f.lastModified):null; }

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
  h.push('<p style="margin:6px 0"><button type="button" class="btn" id="bt104Run"'+(BT.running?" disabled":"")+'>'+(BT.running?"Running…":"Run backtest")+'</button> '+
    '<button type="button" class="btn ghost" id="bt104Weights"'+(BT.out&&BT.out.ok?"":" disabled")+'>Download Terminal_Weights.csv</button>'+
    (BT.f1&&BT.f2?' <span class="mini">'+hE(BT.f1.name)+" + "+hE(BT.f2.name)+"</span>":' <span class="mini">Choose both files first.</span>')+'</p>');
  if(BT.err) h.push('<p class="mini" style="color:var(--neg)">Could not run: '+hE(BT.err)+'</p>');
  h.push('<p style="margin:10px 0 6px;padding-top:8px;border-top:1px dashed var(--line)">'+
    '<button type="button" class="btn ghost" id="bt105WeightsOnly" style="border-style:dashed"'+(BT.wRunning||!BT.f1||!BT.f2?" disabled":"")+'>'+
    (BT.wRunning?"Computing weights…":"⚡ Export weights only (fast)")+'</button> '+
    '<span class="mini">Same picks, same weight formula, but skips the trade/cost/P&amp;L simulation — just the picks and their target weights, faster for a large price-history file. Produces the same Terminal_Weights.csv.</span></p>');
  if(BT.wErr) h.push('<p class="mini" style="color:var(--neg)">Could not compute weights: '+hE(BT.wErr)+'</p>');
  var wr=BT.wOut;
  if(wr&&wr.notReproducible){
    h.push('<div class="mini" style="margin:8px 0;padding:8px 10px;border-left:3px solid var(--neg)"><b>Not reproducible point-in-time:</b> '+hE(wr.notReproducible)+'</div>');
  } else if(wr&&wr.error){
    h.push('<p class="mini" style="color:var(--neg)">Weights-only export error: '+hE(wr.error)+'</p>');
  } else if(wr&&wr.ok){
    h.push('<p class="mini">Weights ready: '+wr.dates.length+' rebalance-eligible date(s) from '+hE(wr.dates[0])+' to '+hE(wr.dates[wr.dates.length-1])+', '+wr.weights.length+' (date, symbol) row(s). <button type="button" class="btn ghost" id="bt105WeightsOnlyDl">Download Terminal_Weights.csv</button></p>');
  }
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
      ["Closed trades / win rate",st.trades+" / "+(num(st.win)?st.win.toFixed(0)+"%":"–")],
      ["Avg win / avg loss",(num(st.avgWin)?pct(st.avgWin):"–")+" / "+(num(st.avgLoss)?pct(st.avgLoss):"–")],
      ["Win/loss ratio",(num(st.avgWin)&&num(st.avgLoss)&&st.avgLoss!==0)?Math.abs(st.avgWin/st.avgLoss).toFixed(2):"–"]
    ]));
    h.push(btChart(r.result.equity,"Backtest value vs RSP (both = 100 at the first fill)"));
    if(r.result.trades&&r.result.trades.length){
      h.push('<h4 style="margin:14px 0 4px">Closed trades</h4>'+btTbl(
        ["Symbol","Side","Entry date","Entry price","Exit date","Exit price","Return","Bars held","Why it was sold"],
        r.result.trades.map(function(t){ return [t.s,t.side,t.inD,num(t.inPx)?t.inPx.toFixed(2):"–",t.outD,num(t.outPx)?t.outPx.toFixed(2):"–",pct(t.ret),String(t.days),t.why]; })
      ));
      h.push('<p class="mini">No "reason for entry" column yet — the engine only records why a position was SOLD (the "Why it was sold" column, same as the live Portfolio Tracker\'s own closed-trades table), not why it was originally picked. Ask if you want that added.</p>');
    }
    if(r.result.holdings&&r.result.holdings.length){
      h.push('<h4 style="margin:14px 0 4px">Open positions at end of backtest</h4>'+btTbl(
        ["Symbol","Entry date","Entry price","Current/last price","Unrealized return","Days held"],
        r.result.holdings.map(function(x){ return [x.s,x.d,num(x.px)?x.px.toFixed(2):"–",num(x.last)?x.last.toFixed(2):"–",pct(x.ret),String(x.days)]; })
      ));
      h.push('<p class="mini">Still open when the replay window ended — never sold, so not in the closed-trades table above (this is what a result like "0 closed trades, +72.73% return" is actually holding).</p>');
    }
  }
  return h.join("");
}

function btAppendUI(){
  var pane=document.getElementById("pane-ptk"); if(!pane) return;
  var div=document.getElementById("bt104Wrap");
  if(!div){ div=document.createElement("div"); div.id="bt104Wrap"; pane.appendChild(div); }
  div.innerHTML=btSection();
}

/* Terminal_Weights.csv contract (for the RealTest DataValueFile a teammate builds from this): header
   "Date,Symbol,Weight", one row per (rebalance date, symbol) pick, Date=YYYY-MM-DD, Weight=decimal fraction of
   portfolio value (0.125 = 1/8). One row per date per symbol HELD that date -- a symbol still held on a later
   date without a changed weight still gets its own fresh row for that later date, not only on the date it was
   bought. r.result.weights (added additively to engine()'s output, v103.js) already carries exactly this: it is
   populated for every current pick on every rebalance date the replay actually processed, using the SAME eq/rank/iv
   formula the engine uses to size real buys -- reused here verbatim, never recomputed differently. */
/* Shared by BOTH export paths: the full "Run backtest" -> Download button (rows = r.result.weights, from
   trk.engine()'s out.weights) and the weights-only fast export (rows = backtestWeightsOnly()'s out.weights) --
   same rows shape ({d,s,side,weight}), same sort, same formatting either way, so the two paths' CSVs can only
   ever differ if the weight ROWS themselves differ (which the correctness gate below checks for). */
function weightsCsvRows(rows){
  var sorted=(rows||[]).slice().sort(function(a,b){ return a.d<b.d?-1:(a.d>b.d?1:(a.s<b.s?-1:(a.s>b.s?1:0))); });
  var L=["Date,Symbol,Weight"];
  sorted.forEach(function(w){ L.push([w.d,csvQuote(w.s),num(w.weight)?w.weight.toFixed(6):"0"].join(",")); });
  return L.join("\r\n");
}
function weightsCsvOf(r){ return weightsCsvRows((r&&r.result&&r.result.weights)||[]); }
/* v105 fix: a raw anchor-click Blob download is silently blocked in this Artifact's sandboxed iframe (no thrown
   exception, so the bare try/catch below hid the failure completely -- "nothing happens" when the button is
   clicked). window.__trk.download (v103.js) is the ALREADY-PROVEN path this page's own "Download CSV" button
   (Portfolio Tracker) uses: it tries the claude.ai `downloads` runtime capability first (window.claude.use(
   "downloads") -> dl.save({filename,data})), which works from inside the sandbox, and only falls back to the same
   anchor-click approach if that capability is unavailable. Reused here verbatim instead of a second, broken
   reimplementation; the local fallback below only fires if the v103 hook itself is ever missing. */
function bkDownload(name,text){
  if(window.__trk&&typeof window.__trk.download==="function"){ window.__trk.download(name,text); return; }
  try{
    var a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([text],{type:"text/csv"}));
    a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
  }catch(e){}
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
  if(e.target&&e.target.id==="bt104Sel"){ BT.portId=e.target.value; BT.out=null; BT.err=null; BT.wOut=null; BT.wErr=null; btAppendUI(); return; }
  if(e.target&&e.target.id==="bt104File1"){ BT.f1=(e.target.files&&e.target.files[0])||null; BT.wOut=null; BT.wErr=null; btAppendUI(); return; }
  if(e.target&&e.target.id==="bt104File2"){ BT.f2=(e.target.files&&e.target.files[0])||null; BT.wOut=null; BT.wErr=null; btAppendUI(); return; }
});
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#bt104Run"):null; if(!t) return;
  if(!BT.f1||!BT.f2||BT.running) return;
  var ST=window.__trk.state(), port=(ST&&ST.ports||[]).filter(function(p){ return p.id===BT.portId; })[0];
  if(!port){ BT.err="Pick a portfolio first."; btAppendUI(); return; }
  BT.running=true; BT.err=null; BT.out=null; btAppendUI();
  var k1=fkeyOf(BT.f1), k2=fkeyOf(BT.f2);
  var c1=(FCACHE.f1&&FCACHE.f1.key===k1)?FCACHE.f1:null;
  var c2=(FCACHE.f2&&FCACHE.f2.key===k2)?FCACHE.f2:null;
  var p1=c1?Promise.resolve(c1.text):readFile(BT.f1);
  var p2=c2?Promise.resolve(c2.text):readFile(BT.f2);
  Promise.all([p1,p2]).then(function(texts){
    if(!c1){ c1={key:k1,text:texts[0],group:null}; FCACHE.f1=c1; }
    if(!c2){ c2={key:k2,text:texts[1]}; FCACHE.f2=c2; }
    var res;
    try{ res=backtestPortfolio(port,texts[0],texts[1],c1.group); }catch(err){ BT.err=err&&err.message?err.message:String(err); BT.running=false; btAppendUI(); return; }
    if(res&&res.group) c1.group=res.group;
    BT.out=res; BT.running=false; btAppendUI();
  },function(err){ BT.err=err&&err.message?err.message:String(err); BT.running=false; btAppendUI(); });
});
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#bt104Weights"):null; if(!t) return;
  if(!BT.out||!BT.out.ok) return;
  var ST=window.__trk.state(), port=(ST&&ST.ports||[]).filter(function(p){ return p.id===BT.portId; })[0];
  var slug=((port&&port.name)||BT.portId||"portfolio").replace(/[^a-z0-9]+/gi,"_").replace(/^_+|_+$/g,"").slice(0,40)||"portfolio";
  bkDownload("Terminal_Weights_"+slug+".csv",weightsCsvOf(BT.out));
});
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#bt105WeightsOnly"):null; if(!t) return;
  if(!BT.f1||!BT.f2||BT.wRunning) return;
  var ST=window.__trk.state(), port=(ST&&ST.ports||[]).filter(function(p){ return p.id===BT.portId; })[0];
  if(!port){ BT.wErr="Pick a portfolio first."; btAppendUI(); return; }
  BT.wRunning=true; BT.wErr=null; BT.wOut=null; btAppendUI();
  var k1=fkeyOf(BT.f1), k2=fkeyOf(BT.f2);
  var c1=(FCACHE.f1&&FCACHE.f1.key===k1)?FCACHE.f1:null;
  var c2=(FCACHE.f2&&FCACHE.f2.key===k2)?FCACHE.f2:null;
  var p1=c1?Promise.resolve(c1.text):readFile(BT.f1);
  var p2=c2?Promise.resolve(c2.text):readFile(BT.f2);
  Promise.all([p1,p2]).then(function(texts){
    if(!c1){ c1={key:k1,text:texts[0],group:null}; FCACHE.f1=c1; }
    if(!c2){ c2={key:k2,text:texts[1]}; FCACHE.f2=c2; }
    var res;
    try{ res=backtestWeightsOnly(port,texts[0],texts[1],c1.group); }catch(err){ BT.wErr=err&&err.message?err.message:String(err); BT.wRunning=false; btAppendUI(); return; }
    if(res&&res.group) c1.group=res.group;
    BT.wOut=res; BT.wRunning=false; btAppendUI();
  },function(err){ BT.wErr=err&&err.message?err.message:String(err); BT.wRunning=false; btAppendUI(); });
});
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest("#bt105WeightsOnlyDl"):null; if(!t) return;
  if(!BT.wOut||!BT.wOut.ok) return;
  var ST=window.__trk.state(), port=(ST&&ST.ports||[]).filter(function(p){ return p.id===BT.portId; })[0];
  var slug=((port&&port.name)||BT.portId||"portfolio").replace(/[^a-z0-9]+/gi,"_").replace(/^_+|_+$/g,"").slice(0,40)||"portfolio";
  bkDownload("Terminal_Weights_"+slug+".csv",weightsCsvRows(BT.wOut.weights));
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
