/* ================= v83: Ask the terminal, plain-English concepts and 30 more examples =================
   Each concept is a named combination of fields the scan already carries, read before the existing word rules so it can be
   combined with everything else Ask understands (portfolio, risk level, spectrum, sectors, subsectors, counts, cross-sector links).
   One new derived field: srel = a stock's severity minus the median severity of its own sector. Nothing else changes. */
(function(){
try{
QM_SYM.srel={lab:"Severity vs own sector median",d:0};
var _qmEnrich83=qmEnrich;
qmEnrich=function(ctx){
  var r=_qmEnrich83(ctx);
  try{ ctx.rows.forEach(function(x){ var g=ctx.secStats&&ctx.secStats[x.sec]; x.srel=(g&&qmNum(g.sevMed)&&qmNum(x.sev))?x.sev-g.sevMed:null; }); }catch(e){}
  return r;
};
/* [pattern, filters, words]  the first filter carries the plain-English description; the others print their own rule */
var V83=[
 [/\b(?:not|no longer|isn't|without being) (?:over-?)?(?:extended|stretched)\b/,[{f:"atr",op:"<",v:1}],"not extended (less than 1 ATR above its trend line)"],
 [/\b(?:strong and (?:improving|rising|strengthening)|improving and strong|strengthening leaders)\b/,[{f:"str",op:">=",v:70},{f:"dir",op:"=",v:"improving"}],"strong and improving: strength percentile 70 or more"],
 [/\b(?:(?:weak|lagging) and (?:falling|deteriorating|weakening|declining)|(?:falling|deteriorating) laggards)\b/,[{f:"str",op:"<=",v:30},{f:"dir",op:"=",v:"deteriorating"}],"weak and falling: strength percentile 30 or less"],
 [/\b(?:recovering|recovery|turning up|turned up|bouncing back|bottoming|basing)\b/,[{f:"trend",op:"=",v:"down"},{f:"c3",op:">=",v:10}],"recovering: still in a downtrend"],
 [/\b(?:rolling over|rolled over|topping(?: out)?|turning down|turned down|losing steam|running out of steam)\b/,[{f:"trend",op:"=",v:"up"},{f:"c3",op:"<=",v:-10}],"rolling over: still in an uptrend"],
 [/\b(?:breaking out|breakouts?|broke out)\b/,[{f:"trend",op:"=",v:"up"},{f:"tb",op:"<=",v:5},{f:"atr",op:">",v:0}],"breaking out: an uptrend"],
 [/\b(?:breaking down|breakdowns?|broke down)\b(?! through cluster)/,[{f:"trend",op:"=",v:"down"},{f:"tb",op:"<=",v:5},{f:"atr",op:"<",v:0}],"breaking down: a downtrend"],
 [/\b(?:leading (?:its|their) (?:own )?sectors?|ahead of (?:its|their) (?:own )?sectors?|sector leaders?|outperforming (?:its|their) (?:own )?sectors?)\b/,[{f:"srel",op:">=",v:15}],"ahead of its own sector (severity 15 or more above the sector median)"],
 [/\b(?:lagging (?:its|their) (?:own )?sectors?|behind (?:its|their) (?:own )?sectors?|sector laggards?|underperforming (?:its|their) (?:own )?sectors?)\b/,[{f:"srel",op:"<=",v:-15}],"behind its own sector (severity 15 or more below the sector median)"],
 [/\b(?:healthy|quality|orderly|clean) up ?trends?\b/,[{f:"trend",op:"=",v:"up"},{f:"atr",op:">=",v:0},{f:"atr",op:"<=",v:2},{f:"dir",op:"!=",v:"deteriorating"}],"a healthy uptrend: in an uptrend",1],
 [/\b(?:steady|stable|persistent|durable) up ?trends?\b/,[{f:"trend",op:"=",v:"up"},{f:"tb",op:">=",v:20},{f:"vol",op:"<=",v:50}],"a steady uptrend: in an uptrend",1],
 [/\b(?:high[- ]conviction|conviction names|conviction picks|best setups?)\b/,[{f:"cpct",op:">=",v:90},{f:"attn",op:">=",v:3}],"high conviction (the Conviction shortlist idea): composite percentile 90 or more"],
 [/\b(?:bounce candidates?|mean[- ]reversion candidates?|snap[- ]?back candidates?|oversold bounces?)\b/,[{f:"r10",op:"<=",v:-8},{f:"c3",op:">=",v:10}],"bounce candidates: down 8% or more over 10 days"],
 [/\b(?:momentum leaders?|top momentum|leading momentum)\b/,[{f:"relp",op:">=",v:80}],"momentum leaders (relative momentum percentile 80 or more)"],
 [/\b(?:extended and (?:fading|decelerating|slowing)|over-?extended and (?:fading|decelerating|slowing)|stretched and (?:fading|slowing))\b/,[{f:"atr",op:">=",v:1},{f:"c3",op:"<=",v:-10}],"extended and fading: 1 ATR or more above its trend line"]
];
/* concept words are known words, so the spelling fixer never "corrects" them (it read conviction as conditions) */
try{ "conviction breakout breakouts rolling rolled recovering recovery bottoming topping laggards laggard leaders leader healthy steady persistent durable bounce bounces bouncing snapback outperforming underperforming orderly quality stretched setups".split(" ").forEach(function(w){ QMX_VOCSET[w]=1; }); }catch(e){}
var V83_LIST=V83.map(function(c){ return c[2].split(":")[0].replace(/ \(.*$/,""); });
var _qmConds83=qmConds;
qmConds=function(t){
  var s=String(t), add=[];
  /* per-sector and per-subsector caps are read elsewhere; hide them here so "low volatility, max 2 per sector" does not become volatility at most 2 */
  s=s.replace(/\b(?:max(?:imum)?|at most|no more than|up to|limit(?:ed)? to|not more than|one|1) (?:\d+ )?(?:stocks? |names? )?(?:per|from each|in each|for each|from any one|in any one|from a single) (?:sector|subsector|industry)\b/g,function(m){ return new Array(m.length+1).join(" "); });
  V83.forEach(function(c){
    var re=new RegExp(c[0].source,"g");
    if(!re.test(s)) return;
    s=s.replace(new RegExp(c[0].source,"g"),function(m){ if(c[3]) return m.replace(/^\S+/,function(w){ return new Array(w.length+1).join(" "); }); return new Array(m.length+1).join(" "); });
    c[1].forEach(function(f,i){ var o={f:f.f,op:f.op,v:f.v,kw:1}; if(i===0) o.txt=c[2]; if(!add.some(function(a){ return a.f===o.f&&a.op===o.op; })) add.push(o); });
  });
  var r=_qmConds83(s);
  if(add.length){
    var own=r.filters.filter(function(f){ return !f.kw; });
    add=add.filter(function(a,i){ return !own.some(function(f){ return f.f===a.f; }); });
    if(add.length&&!add[0].txt){ var src=V83.filter(function(c){ return c[1].some(function(f){ return f.f===add[0].f&&f.op===add[0].op; }); })[0]; if(src) add[0].txt=src[2].split(":")[0]+": "+qmFT({f:add[0].f,op:add[0].op,v:add[0].v}); }
    r.filters=add.concat(r.filters.filter(function(f){ return !(f.kw&&add.some(function(a){ return a.f===f.f; })); }));
  }
  return r;
};
/* the Claude fallback learns the new field and words */
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","srel = severity minus the median severity of the stock's own sector. Concept words the rules already turn into filters: "+V83_LIST.join(", ")+".\n\nQ: "); }catch(e){}

/* a per-subsector cap is a subsector rule: do not add the "you mentioned subsectors but gave no subsector rule" note */
var _qmParseX83=qmParseX;
qmParseX=function(q){ var r=_qmParseX83(q); try{ if(r&&r.subNote&&/\b(?:per|each|from each|in each|for each|in any one|from any one|from a single) (?:subsectors?|industry|industries)\b/i.test(String(q))) r.subNote=false; }catch(e){} return r; };

/* ---------- 30 more examples ---------- */
var V83_EX=[
 "Build a conservative 10 stock portfolio of strong and improving stocks.",
 "Build an aggressive 8 stock portfolio of stocks breaking out.",
 "Show 10 recovering stocks in Healthcare.",
 "Show 10 stocks rolling over in Financials.",
 "How many stocks are rolling over, by sector?",
 "How many stocks are recovering, by subsector?",
 "Show the risk spectrum with 5 steady uptrend stocks each.",
 "Build a moderate 12 stock portfolio of healthy uptrends, max 2 per sector.",
 "Build a conservative 10 stock short portfolio of weak and falling stocks.",
 "Show 10 weak and falling stocks with a larger anomaly.",
 "Show 10 stocks leading their sector with low volatility.",
 "Show 10 stocks lagging their sector that are accelerating.",
 "Which 10 stocks are extended and fading?",
 "Show 10 bounce candidates above cluster one.",
 "Show 10 momentum leaders in a fresh uptrend.",
 "Show high conviction stocks in an uptrend.",
 "Show 10 stocks breaking down with high volatility.",
 "Give me 10 stocks with a steady uptrend of at least 30 sessions, sorted by trend length.",
 "Show 10 decelerating stocks in rising subsectors.",
 "Show 10 recovering stocks with the lowest volatility.",
 "Tickers whose neighbours are in a different sector and rising.",
 "Top 10 anomaly hidden groups that cross sectors.",
 "Hidden groups that cross sectors with stocks rolling over.",
 "Top 10 subsector pairs with the most tickers connected and above cluster 1.",
 "Which subsectors in different sectors move most alike?",
 "Which two sectors have at least 30% of their tickers connected?",
 "Which Industrials stocks are connected to Financials and improving?",
 "How is NVDA connected to other sectors?",
 "Compare Energy and Materials.",
 "Which sectors behave most alike today?"];
try{ V83_EX.forEach(function(q){ if(QMX_EX20.indexOf(q)<0) QMX_EX20.push(q); }); }catch(e){}
try{ var sm=document.querySelector("#qmEx20 summary"); if(sm) sm.textContent=QMX_EX20.length+" example questions: click Run, or Copy and paste your own edit"; }catch(e){}
}catch(e){ try{ console.warn("v83 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
