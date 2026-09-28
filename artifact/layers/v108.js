/* ================= v108: Ask the terminal, leader-page layout by default + an anomaly-count metric =================
   PART A -- the reported gap: "Which subsector in Industrials had the highest combined anomaly score? List the
   symbols and 1D return." (no "leader page" phrase) already answers correctly (v106 fixed the wrong-sector bug),
   but as the plain compact table -- the user wants the SAME structured "leader page" layout (v105: title, Leader
   paragraph, one-row summary, full member table, coverage checklist, metric footnote) to be the default for this
   exact question shape, not something that only appears when the words "leader page" are typed.
   The fix does not duplicate v105's rendering, validation, or its "leader page" trigger phrase in any way: it
   only changes WHICH spec gets built, for one narrow, unambiguous case. v106's own gascope path already proves a
   named sector plus a bare "combined anomaly score" ranking is exactly the case v105's kind "gadiag" (mode "rank")
   already renders in full -- so instead of building v106's own compact "gascope" spec for this one case, this
   layer builds the SAME gadiag-shaped spec v105's "leader page" phrase already builds, then returns it as-is
   through the untouched, already-tested v105 validate/run/render pipeline (registered earlier in the qmParseX/
   qmValidateAny/qmRunX chains, so a spec of kind "gadiag" from here is indistinguishable from one v105 built
   itself). Two return-detail regexes (a "5-day return" and a "sector, volume" extra-column ask) are restated
   from v105's own gdParse rather than exported as a new hook, matching the size of restatement v106 already did
   for its own "at least N members" text-blanking -- nothing else about v105's rendering is touched or copied.
   Deliberately narrow, so every other shape of question is completely unaffected: only when the base engine's own
   bare group ranking (kind falsy, from qmParse) is level "industry", sorted by "gaMean" (combined anomaly score),
   has no other filters, AND asks for exactly one leader (limit 1 -- the shape "List the symbols..." already
   produces, since asking for a plain ranked list of several subsectors, or a metric that is not the anomaly
   score, is not this diagnostic's job) does this layer redirect at all; every other named-sector bare ranking
   (a different metric, or a top-N list) still gets v106's existing compact gascope answer, byte-for-byte.

   PART B -- a new metric: "anomaly count" (or "number of anomalies", "most anomalies", ...) at sector/subsector
   level, distinct from "combined anomaly score" (the existing MEAN reading). Uses the same 0.3 "elevated" cutoff
   v105's leader page already uses for its own "Elevated Anomalies" column -- one new group-level field, computed
   the same way every other group mean in this file is (a count over the group's own already-built rows, no new
   per-symbol calculation). A count-based question never redirects to the leader page above (its whole layout is
   built around a mean Graph score, not a count), so it always renders as an ordinary compact group ranking --
   the same generic table gaMean/volMean/sevMed rankings already use. */
(function(){
try{
if(typeof QM_CTX==="undefined"||typeof qmParse!=="function"||typeof qmParseX!=="function"||typeof QM_GRP==="undefined") return;

/* ---------------- Part B: anomaly count, a new group field ---------------- */
var HZ108_ELEV=0.3; /* the scan's own "anomalous" threshold, already used by v105's leader page */
QM_GRP.anomN={lab:"Anomaly count (score ≥ "+HZ108_ELEV+")",d:0};

if(typeof qmEnrich==="function"){
  var _qmEnrich108=qmEnrich;
  qmEnrich=function(ctx){
    var r=_qmEnrich108(ctx);
    try{
      function addAnomN(stats){
        Object.keys(stats||{}).forEach(function(k){
          var g=stats[k];
          g.anomN=g.rows.filter(function(row){ return qmNum(row.ga)&&row.ga>=HZ108_ELEV; }).length;
        });
      }
      addAnomN(ctx.indStats); addAnomN(ctx.secStats);
    }catch(e){}
    return r;
  };
}

var HZ108_COUNT_RE=/\b(?:anomaly count|anomal\w* count|number of anomal\w*|count of anomal\w*|how many anomal\w*|most anomal\w*|(?:elevated|abnormal) anomal\w*|anomalous (?:names|stocks|symbols|companies))\b/;
var _qmParse108=qmParse;
qmParse=function(q){
  var sp=_qmParse108(q);
  try{
    if(sp&&!sp.kind&&sp.level!=="symbol"&&sp.sort&&sp.sort.f==="gaMean"&&HZ108_COUNT_RE.test(qmT(q))) sp.sort.f="anomN";
  }catch(e){}
  return sp;
};

/* ---------------- Part A: default to the leader-page layout for a bare "combined anomaly score" leader ask ---------------- */
function hz108RetField(t){ /* restated from v105's gdParse -- see header comment */
  var has5dReturn=/\b5[- ]?d(?:ay)?s?\b.*\breturn\b|\bover the last 5 trading days\b/.test(t);
  var has5dAsExtra=/\band 5[- ]?d(?:ay)?s?\b.*\breturn\b/.test(t);
  return has5dReturn&&!has5dAsExtra?"r5":"r1";
}
function hz108ExtraCols(t){
  var has5dAsExtra=/\band 5[- ]?d(?:ay)?s?\b.*\breturn\b/.test(t);
  var extra=[];
  if(has5dAsExtra) extra.push("r5");
  if(/\bsector\b[^.]{0,20}\bvolume\b|\bvolume\b[^.]{0,20}\bsector\b|,\s*sector,?\s*(?:and\s*)?volume/.test(t)) extra=extra.concat(["sec","liq"]);
  return extra;
}

var _qmParseX108=qmParseX;
qmParseX=function(q){
  /* checked before the rest of the chain for the same reason v107's hrsplit trigger is: v106's own gascope
     already answers this exact question shape successfully (that is the bug being fixed here is about LAYOUT,
     not correctness), so waiting for the rest of the chain to return null would never reach this branch. */
  try{
    var ctx=QM_CTX;
    if(ctx){
      var t=qmT(q), GA=window.__gaScope;
      var parentSec=GA&&GA.parentSecOf?GA.parentSecOf(t,ctx):null;
      if(parentSec){
        var minN=GA&&GA.minNOf?GA.minNOf(t):null;
        var qForBase=minN?q.replace(/\bat least \d{1,2}\b[^.]{0,24}\bmembers?\b/i," "):q;
        var base=qmParse(qForBase);
        if(base&&!base._err&&!base.kind&&base.level==="industry"&&base.sort&&base.sort.f==="gaMean"&&base.limit===1&&(!base.filters||!base.filters.length)){
          return {kind:"gadiag",mode:"rank",level:"industry",parentSec:parentSec,
            dir:base.sort.d,bias:(base.bias==="improving"||base.bias==="deteriorating")?base.bias:"any",
            minN:minN||1,retField:hz108RetField(t),extraCols:hz108ExtraCols(t)};
        }
      }
    }
  }catch(e){}
  return _qmParseX108(q);
};
}catch(e){ try{ console.warn("v108 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
