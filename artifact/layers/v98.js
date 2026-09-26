/* ================= v98: smarter Ask the terminal - adaptive portfolios, connections, themes and rotation =================
   1. Spelling: more terms are known to the page's own spelling corrector (hierarchical, sentiment, convergence, diversified,
      subsector names ...); when a word is corrected the answer says how it was read.
   2. "hsmart": an adaptive multi-factor portfolio for stocks or ETFs. The weights come from the words in the question
      (momentum, convergence, direction, subsector rotation, low volatility), then names are picked one by one so the
      portfolio stays diversified by correlation, sector, subsector, Hidden Group and price cluster. Every pick says why.
   3. "hconn": how two names, two subsectors / sectors, or two themes are connected (direct evidence, correlation path,
      bridge names).
   4. "htheme": cross-sector theme baskets (fixed lists of subsectors): strength, members, rotation between themes,
      leading and lagging subsectors, strongest names in the weakest groups.
   5. ETF tickers in answer tables open their tear sheets; the tab strip can be folded away.
   Only questions with these words reach this code: every other question is parsed exactly as before. */
(function(){
try{
var A=window.__hxApi||{};
function H(){ try{ return A.get?A.get():null; }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function pc(v,d){ return num(v)?((v>0?"+":"")+v.toFixed(d===undefined?1:d)+"%"):"–"; }
function f2(v,d){ return num(v)?v.toFixed(d===undefined?2:d):"–"; }
function mean(a){ var v=a.filter(num); return v.length?v.reduce(function(p,q){ return p+q; },0)/v.length:null; }
var FOLLOW=/\b(these|them|those|this list|that list|the list|this portfolio|that portfolio|the basket|the names above|the above)\b/;

/* ---------------- 1. spelling ---------------- */
var MORE=("hierarchical hierarchy sentiment convergence converging diversified diversify diversification relationship relationships "+
  "connected connection connections connects bridge bridges rotation rotating themes strengthening weakening improving deteriorating "+
  "infrastructure semiconductors semiconductor defensives defensive cyclicals cyclical software insurance services credit utilities "+
  "industrials financials healthcare materials leaders laggards leading lagging strongest weakest momentum portfolio portfolios "+
  "correlation correlated anomaly subsector subsectors between breadth").split(" ");
try{ MORE.forEach(function(w){ if(!QMX_VOCSET[w]){ QMX_VOC.push(w); QMX_VOCSET[w]=1; } }); }catch(e){}
var EXPL=[[/\b(?:hirarichal|hierachical|hierarachial|heirarchical|hierarcical|hirarchical|hierarchal|hirearchical|hierarichal|herarchical|hierachal)\b/g,"hierarchical"],
  [/\b(?:sentimant|sentement|sentimet|sentiement|sentimnt)\b/g,"sentiment"],[/\b(?:convergance|convergense|convergnce|convergience|converence)\b/g,"convergence"],
  [/\b(?:diversifed|diversfied|diversifyed|diversifide|diverisfied|diversifiied)\b/g,"diversified"],[/\b(?:conected|connnected|conneted|connectd)\b/g,"connected"],
  [/\b(?:portfolo|portfoilo|protfolio|porfolio|portfoli|portolio|portfollio)\b/g,"portfolio"],[/\b(?:corelation|corrlation|corellation|correlaton|coreltion|corralation)\b/g,"correlation"],
  [/\b(?:rotaion|rotatoin|rotaton)\b/g,"rotation"],[/\b(?:thems|theems)\b/g,"themes"],[/\b(?:etf's)\b/g,"etfs"]];
var _qmNorm98=qmNorm;
/* subsector-name words (services, semiconductors, ...) are corrected in their own step, and never by only adding or dropping
   letters at the end, so ordinary words such as "market" or "healthy" are never turned into "markets" or "health" */
var DYN=null, DYNL=[];
var KNOWN=null;
function addDyn(ctx){ if(DYN||!ctx) return; DYN={}; KNOWN={};
  try{ var txt=[]; try{ txt=txt.concat(QM_EXAMPLES); }catch(e){} try{ txt=txt.concat(QMX_EX20); }catch(e){} try{ var el=document.getElementById("hx93Tiles"); if(el) txt.push(el.textContent); }catch(e){}
    txt.join(" ").toLowerCase().replace(/[a-z]{6,}/g,function(w){ KNOWN[w]=1; return w; }); }catch(e){}
  try{ ctx.indNames.forEach(function(k){ String(k).toLowerCase().split(/[^a-z]+/).forEach(function(w){ if(w.length>=6&&!DYN[w]){ DYN[w]=1; DYNL.push(w); } }); }); }catch(e){} }
function dynFix(w){ if(!DYN||w.length<6||DYN[w]||QMX_VOCSET[w]||(KNOWN&&KNOWN[w])) return w; var lim=w.length>=9?2:1, best=null, bd=9, tie=false;
  DYNL.forEach(function(v){ if(v.charAt(0)!==w.charAt(0)||Math.abs(v.length-w.length)>lim||v.indexOf(w)===0||w.indexOf(v)===0) return; var d=qmOsa(w,v); if(d<=lim){ if(d<bd){ bd=d; best=v; tie=false; } else if(d===bd&&v!==best) tie=true; } });
  if(!best||tie) return w; var f=qmFuzzy(w); return f!==w?w:best; }
function fixWord(w){ var x=w; EXPL.forEach(function(p){ x=x.replace(new RegExp(p[0].source),p[1]); }); if(x===w) x=dynFix(w); return x; }
qmNorm=function(q){ var s=String(q||"").toLowerCase(); EXPL.forEach(function(p){ s=s.replace(p[0],p[1]); }); s=s.replace(/[a-z]{6,}/g,dynFix); return _qmNorm98(s); };
var READAS=null;
function readAs(q){ var s=String(q||"").toLowerCase(), out=[]; (s.match(/[a-z']+/g)||[]).forEach(function(w){ var x=fixWord(w); if(x===w) x=qmFuzzy(w); if(x!==w&&x.indexOf(w)!==0&&w.indexOf(x)!==0&&out.every(function(o){ return o[0]!==w; })) out.push([w,x]); }); return out; }
var _qmAsk98=qmAsk;
qmAsk=function(question,done){
  try{ addDyn(qmBuildCtx()); }catch(e){}
  /* a bare "IT" in a question about sectors or subsectors means the IT Sector, not the ticker IT (Gartner) */
  try{ var qs0=String(question||""); if(/\bIT\b(?! [Ss]ector)/.test(qs0)&&(/sub ?-?sectors?|\bsectors?\b|\bindustr/i.test(qs0.replace(/\bIT [Ss]ector\b/g,""))||(/\b(?:links?|connect\w*|between|bridg\w*|in common)\b/i.test(qs0)&&!(qs0.replace(/\bIT\b/g,"").match(/\b[A-Z]{2,5}\b/g)||[]).length))&&!/\bIT (?:stock|shares|ticker)\b|gartner/i.test(qs0)) question=qs0.replace(/\bIT\b(?! [Ss]ector)/g,"information technology sector");
    if(/\bIT [Ss]ector\b/.test(String(question))&&!/\bIT (?:stock|shares|ticker)\b|gartner/i.test(String(question))) question=String(question).replace(/\bIT [Ss]ector\b/g,"information technology sector"); }catch(e){}
  var ra=[]; try{ ra=readAs(question); }catch(e){}
  return _qmAsk98(question,function(r){ READAS=(ra.length&&r&&r.spec)?ra:null; done(r); });
};
var _qmRun98=qmRun;
qmRun=function(spec,ctx){ var res=_qmRun98.apply(this,arguments); try{ if(READAS&&res&&res.notes){ res.notes.unshift("Spelling: read "+READAS.map(function(p){ return "“"+p[0]+"” as “"+p[1]+"”"; }).join(", ")+"."); } }catch(e){} READAS=null; return res; };

/* ---------------- 5a. ETF tickers open their tear sheets ---------------- */
var ETS=null, ETX=null;
function etfSet(){ try{ var X=moX(); if(X===ETX&&ETS) return ETS; var o={}; (X&&X.etfSym||[]).forEach(function(s){ o[s.sym]=1; }); ETX=X; ETS=o; return o; }catch(e){ return {}; } }
var _qmCell98=qmCell;
qmCell=function(head,c){ if(head==="Symbol"&&!qmIsTk(String(c))&&etfSet()[String(c)]) return qmTk(String(c)); return _qmCell98(head,c); };

/* ---------------- shared extra portfolio conditions (used by the smart builder and the block / cluster portfolios) ---------------- */
var PC=[
 ["fresh",/\b(?:fresh|new|young|recent|just turned)(?: trend)? (?:up ?trend|uptrend|trend up)s?\b/,"in a fresh uptrend (10 sessions or less)",function(r){ return r.trend==="up"&&num(r.tb)&&r.tb<=10; }],
 ["estab",/\b(?:established|mature|long[- ]running|steady) (?:up ?trend|uptrend)s?\b/,"in an established uptrend (30 sessions or more)",function(r){ return r.trend==="up"&&num(r.tb)&&r.tb>=30; }],
 ["up",/\buptrends?\b|\btrending up\b|\btrend up\b/,"in an uptrend",function(r){ return r.trend==="up"; }],
 ["improving",/\bimproving\b(?! sub ?sectors?)/,"Early Warning direction improving",function(r){ return r.dir==="improving"; }],
 ["notdet",/\bnot deteriorating\b/,"not deteriorating",function(r){ return r.dir!=="deteriorating"; }],
 ["strength",/\bstrengthening\b/,"strengthening (score above zero)",function(r){ return num(r.sev)?r.sev>0:(num(r.rec)&&r.rec>0); }],
 ["anom",/\banomal\w*\b|\bunusual\b/,"anomalous (graph anomaly 0.30 or more)",function(r){ return num(r.ga)&&r.ga>=0.3; }],
 ["conv",/\bsignals? (?:are )?converg\w*\b|\bsignal convergence\b|\bconverging signals?\b/,"where signals converge (3 or more lenses)",function(r){ return num(r.conv)&&r.conv>=3; }],
 ["notext",/\bnot (?:extended|stretched)\b|\bunextended\b/,"not extended (under 1 ATR above the trend line)",function(r){ return num(r.atr)&&r.atr<1; }],
 ["neartl",/\bnear (?:its |the )?trend ?line\b|\bpull ?backs?\b|\bdips?\b/,"near its trend line (within 0.5 ATR)",function(r){ return num(r.atr)&&Math.abs(r.atr)<=0.5; }],
 ["notob",/\bnot overbought\b/,"not overbought",function(r){ return !r.obs; }],
 ["oversold",/\boversold\b/,"oversold",function(r){ return !!r.oss; }],
 ["hivol",/\bhigh vol\w*\b|\bvolatile\b/,"high volatility (score 67 or more)",function(r){ return num(r.vol)&&r.vol>=67; }],
 ["liquid",/\bliquid\b|\bheavily traded\b|\bhigh turnover\b/,"liquid (top third by 20-day turnover)",function(r){ return num(r.liq)&&r.liq>=66.7; }],
 ["indep",/\bindependent\b|\bidiosyncratic\b|\blow (?:market|beta to the market) correlation\b|\bdecoupled\b/,"independent of the market (60-bar correlation 0.30 or less)",function(r){ return num(r.cu60)&&r.cu60<=0.3; }],
 ["hi52",/\bnear (?:its |their |the )?(?:52[- ]week|yearly|annual) highs?\b|\bnew highs?\b|\bat highs?\b/,"within 5% of the 52-week high",function(r){ return num(r.hi52)&&r.hi52>=-5; }],
 ["ytdpos",/\bpositive (?:ytd|year to date)\b|\bup (?:ytd|year to date|this year)\b|\bytd (?:winners|gainers)\b/,"up year to date",function(r){ return num(r.ytd)&&r.ytd>0; }],
 ["beat",/\bbeating the market\b|\boutperform\w* (?:the market|rsp)\b|\brelative strength\b/,"beating RSP over 3 months",function(r){ var M=null; try{ M=A.metrics(); }catch(e){} var b=M&&M.bench&&M.by[M.bench]; return num(r.m3)&&b&&num(b.m3)&&r.m3>b.m3; }],
 ["lowdd",/\blow drawdowns?\b|\bshallow drawdowns?\b|\bsmall drawdowns?\b/,"12-month drawdown better than -20%",function(r){ return num(r.dd12)&&r.dd12>-20; }],
 ["lowbeta",/\blow beta\b/,"low beta (under 0.8 to RSP)",function(r){ return num(r.beta)&&r.beta<0.8; }]];
function pcParse(t,skip){ var out=[]; PC.forEach(function(p){ if(skip&&skip.indexOf(p[0])>=0) return; if(p[0]==="up"&&(out.indexOf("fresh")>=0||out.indexOf("estab")>=0)) return; if(p[0]==="improving"&&/\bnot improving\b/.test(t)) return; if(p[1].test(t)) out.push(p[0]); }); return out; }
function pcTest(k,r){ for(var i=0;i<PC.length;i++) if(PC[i][0]===k) return PC[i][3](r); return true; }
function pcLab(k){ for(var i=0;i<PC.length;i++) if(PC[i][0]===k) return PC[i][2]; return k; }
window.__pcond={parse:pcParse,test:pcTest,label:pcLab};
/* ---------------- shared: themes ---------------- */
function I(){ var a=[].slice.call(arguments); return function(r){ return a.indexOf(r.ind)>=0; }; }
function S(){ var a=[].slice.call(arguments); return function(r){ return a.indexOf(r.sec)>=0; }; }
function OR(){ var f=[].slice.call(arguments); return function(r){ return f.some(function(g){ return g(r); }); }; }
var T_SEMI=I("Semiconductors","Semiconductor Equipment & Materials","Computer Hardware","Electronic Components"),
    T_PWR=I("Utilities - Independent Power Producers","Utilities - Regulated Electric","Electrical Equipment & Parts","Specialty Industrial Machinery","Engineering & Construction","REIT - Specialty");
var THEMES=[
 {k:"aiinfra",n:"AI infrastructure (chips + power)",re:/\bai infra\w*\b|\bai build ?out\b|\bai (?:capex|stack)\b/,f:OR(T_SEMI,T_PWR),etf:"SMH, XLU"},
 {k:"semis",n:"AI and semiconductors",re:/\bai (?:chips?|semis?|hardware)\b|\bsemis\b|\bsemiconductors? theme\b|\bchips?(?:makers?)?\b|\bsemiconductor(?:s)? (?:and|&) ai\b|\bai and semiconductors\b/,f:T_SEMI,etf:"SMH, SOXX"},
 {k:"power",n:"AI power and data centres",re:/\bai power\b|\bdata cent(?:er|re)s?\b|\bpower (?:demand|build ?out|and data)\b|\belectrification\b|\bgrid\b/,f:T_PWR,etf:"XLU"},
 {k:"software",n:"Software and cloud",re:/\bsoftware\b|\bcloud\b|\bsaas\b/,f:I("Software - Infrastructure","Software - Application","Information Technology Services"),etf:"VGT"},
 {k:"internet",n:"Internet and media",re:/\binternet\b|\bmedia\b|\bstreaming\b|\bdigital ads?\b/,f:I("Internet Content & Information","Internet Retail","Entertainment","Advertising Agencies","Electronic Gaming & Multimedia"),etf:"XLC"},
 {k:"growth",n:"Growth (tech and internet)",re:/\bgrowth\b/,f:OR(S("ITSector"),I("Internet Content & Information","Internet Retail","Entertainment","Electronic Gaming & Multimedia")),etf:"QQQ, VUG"},
 {k:"defensive",n:"Defensives",re:/\bdefensives?\b|\bsafe havens?\b|\blow beta\b/,f:OR(S("Utilities","ConsStaples"),I("Drug Manufacturers - General","Healthcare Plans","Medical Distribution","Waste Management","Telecom Services")),etf:"XLU, XLP, XLV"},
 {k:"rates",n:"Rate-sensitive",re:/\brate[- ]sensitive\b|\binterest[- ]rate\w*\b|\brates? (?:plays?|trade)\b/,f:OR(I("Banks - Regional","Banks - Diversified","Credit Services","Residential Construction","Building Products & Equipment"),function(r){ return /^REIT/.test(r.ind); }),etf:"KRE, IYR, XHB"},
 {k:"cyclical",n:"Industrial cyclicals",re:/\bcyclicals?\b|\bindustrial cyclicals?\b|\breopening\b/,f:I("Specialty Industrial Machinery","Farm & Heavy Construction Machinery","Railroads","Integrated Freight & Logistics","Trucking","Airlines","Steel","Copper","Chemicals","Specialty Chemicals","Building Materials","Industrial Distribution"),etf:"XLI, XLB, IYT"},
 {k:"consumer",n:"Consumer spending",re:/\bconsumer spending\b|\bconsumer (?:theme|cyclicals?)\b|\bthe consumer\b|\bretail(?:ers)?\b/,f:OR(S("ConsumerDisc"),I("Travel Services","Lodging")),etf:"XLY, XRT"},
 {k:"energy",n:"Energy and commodities",re:/\bcommodit\w*\b|\benergy and (?:commodities|materials)\b|\breal assets\b|\binflation (?:plays?|trade|hedges?)\b/,f:OR(S("Energy"),I("Gold","Copper","Steel","Agricultural Inputs","Chemicals")),etf:"XLE, XOP, GDX"},
 {k:"health",n:"Healthcare innovation",re:/\bhealth ?care innovation\b|\bmedtech\b|\bbiotech\w*\b|\bmedical devices? theme\b/,f:I("Biotechnology","Medical Devices","Diagnostics & Research","Medical Instruments & Supplies","Health Information Services"),etf:"XBI"},
 {k:"defence",n:"Defence and aerospace",re:/\bdefen[cs]e (?:and aerospace|theme|stocks)\b|\baerospace\b|\bdefen[cs]e\b/,f:I("Aerospace & Defense","Security & Protection Services"),etf:"ITA"},
 {k:"fintech",n:"Payments and markets",re:/\bpayments?\b|\bfintech\b|\bexchanges?\b|\bcapital markets theme\b/,f:I("Credit Services","Financial Data & Stock Exchanges","Capital Markets"),etf:"XLF"}];
var TH_BY={}; THEMES.forEach(function(t){ TH_BY[t.k]=t; });
function themesIn(t){ var out=[], s=t; THEMES.forEach(function(th){ var re=new RegExp(th.re.source,"g"), m; while((m=re.exec(s))){ out.push({th:th,i:m.index}); break; } });
  out.sort(function(a,b){ return a.i-b.i; }); var seen={}, res=[];
  out.forEach(function(o){ if(seen[o.th.k]) return; if(o.th.k==="semis"&&out.some(function(x){ return x.th.k==="aiinfra"; })) return; if(o.th.k==="power"&&out.some(function(x){ return x.th.k==="aiinfra"; })) return; seen[o.th.k]=1; res.push(o.th.k); });
  return res; }

/* ---------------- shared: returns, correlation, groups ---------------- */
var RC={};
function rets(sym,w){ var h=H(); if(!h||!h.syms[sym]) return null; var key=sym+"|"+w+"|"+h.dates.length+"|"+h.savedAt; if(RC[key]) return RC[key]; var L=h.dates.length-1, a=[], col=h.syms[sym]; for(var i=Math.max(1,L-w+1);i<=L;i++){ var r=A.ret(col,i); a.push(r===null||r===undefined?null:r); } RC[key]=a; return a; }
function cor(s1,s2,w){ var a=rets(s1,w||252), b=rets(s2,w||252); if(!a||!b) return null; var n=0,sa=0,sb=0,saa=0,sbb=0,sab=0; for(var i=0;i<a.length&&i<b.length;i++){ var x=a[i], y=b[i]; if(x===null||y===null) continue; n++; sa+=x; sb+=y; saa+=x*x; sbb+=y*y; sab+=x*y; }
  if(n<30) return null; var cv=sab/n-sa/n*sb/n, va=saa/n-sa*sa/n/n, vb=sbb/n-sb*sb/n/n; return (va>0&&vb>0)?cv/Math.sqrt(va*vb):null; }
function basketRets(list,w){ var h=H(); if(!h) return null; var L=h.dates.length-1, out=[]; var cols=list.map(function(s){ return h.syms[s]; }).filter(Boolean); if(!cols.length) return null;
  for(var i=Math.max(1,L-w+1);i<=L;i++){ var s=0,k=0; cols.forEach(function(c){ var r=A.ret(c,i); if(r!==null&&r!==undefined){ s+=r; k++; } }); out.push(k?s/k:null); } return out; }
function corArr(a,b){ var n=0,sa=0,sb=0,saa=0,sbb=0,sab=0; for(var i=0;i<a.length&&i<b.length;i++){ var x=a[i], y=b[i]; if(x===null||y===null) continue; n++; sa+=x; sb+=y; saa+=x*x; sbb+=y*y; sab+=x*y; } if(n<15) return null; var cv=sab/n-sa/n*sb/n, va=saa/n-sa*sa/n/n, vb=sbb/n-sb*sb/n/n; return (va>0&&vb>0)?cv/Math.sqrt(va*vb):null; }
var GC=null;
function groups(){ var h=H(), st=(h?h.savedAt+"|"+h.dates.length:"")+"|"+(typeof U!=="undefined"&&U?U.date:""); if(GC&&GC.st===st) return GC;
  var hg={}, cl={}, nb={}, fl={};
  try{ if(swOk()&&moX().stockKeys.indexOf("peer")>=0) relClusters("stocks",0.6).clusters.forEach(function(c){ c.members.forEach(function(r){ hg[r.sym]=c.id; }); }); }catch(e){}
  try{ var CLS=window.__hxClusters, Mc=h&&CLS&&CLS.build("252"); if(Mc){ var g=CLS.flat(Mc,0.5); Mc.names.forEach(function(x,k){ cl[x.sym]=g[k]; }); } }catch(e){}
  try{ var pool=buildVectors(); pool.forEach(function(s){ nb[s.sym]=pool.filter(function(o){ return o!==s; }).map(function(o){ return {s:o.sym,d:dist2(s._v,o._v)}; }).sort(function(a,b){ return a.d-b.d; }).slice(0,5).map(function(x){ return x.s; }); }); }catch(e){}
  try{ SYM.forEach(function(s){ try{ fl[s.sym]=cgConvergence(s).flags; }catch(e){} }); }catch(e){}
  GC={st:st,hg:hg,cl:cl,nb:nb,fl:fl}; return GC; }
var FLN={ta:"Trend age",sd:"Structural drift",ms:"Momentum shape",sm:"Structure map",an:"Anomaly",at:"Attention"};
function sendOf(ctx,list,label){ var by=ctx.bySym, it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
function etfRows(){ var X=moX(), k={}; if(!X||!X.etfKeys||!X.etf) return []; X.etfKeys.forEach(function(x,i){ k[x]=i; }); var M=null; try{ M=A.metrics(); }catch(e){}
  return X.etf.map(function(a){ var s=a[k.sym], m=M&&M.by?M.by[s]:null; return {sym:s,rec:a[k.rec],prev:a[k.prev],d:a[k.d],dir:a[k.dir]||"n/a",r1:a[k.r1],r5:a[k.r5],r10:a[k.r10],vol:a[k.vol],ga:a[k.ga],cu60:a[k.cu60],grp:(typeof moEtfGroupOf==="function"?moEtfGroupOf(s):""),
    m1:m&&!m.stale?m.m1:null,m3:m&&!m.stale?m.m3:null,ytd:m&&!m.stale?m.ytd:null,vol12:m&&!m.stale?m.vol12:null}; }); }
function pctRank(list,get){ var v=list.map(get).filter(num).sort(function(a,b){ return a-b; }); return function(x){ if(!num(x)||v.length<2) return null; var lo=0,hi=v.length; while(lo<hi){ var m=(lo+hi)>>1; if(v[m]<x) lo=m+1; else hi=m; } return lo/(v.length-1); }; }
function grpStat(rows){ var st=0,wk=0,im=0,de=0,ad=0,dc=0; rows.forEach(function(r){ if(num(r.sev)){ if(r.sev>0) st++; else if(r.sev<0) wk++; } if(r.dir==="improving") im++; else if(r.dir==="deteriorating") de++; if(num(r.r1)){ if(r.r1>0) ad++; else if(r.r1<0) dc++; } });
  var n=rows.length||1; return {n:rows.length,st:st,wk:wk,net:st-wk,netP:(st-wk)/n*100,im:im,de:de,imP:im/n*100,ad:ad,dc:dc,r5:mean(rows.map(function(r){ return r.r5; })),m1:mean(rows.map(function(r){ return r.m1; })),m3:mean(rows.map(function(r){ return r.m3; })),ytd:mean(rows.map(function(r){ return r.ytd; })),conv:mean(rows.map(function(r){ return r.conv; })),str:mean(rows.map(function(r){ return r.str; }))}; }

/* ---------------- parse ---------------- */
var _qmParseX98=qmParseX, MYQ=null, AFQ=false;
function mark(sp){ MYQ=sp; return sp; }
function nOf(t,def){ var m=t.match(/\b(\d{1,2}) ?(?:stocks?|names?|etfs?|holdings?|positions?|picks?|tickers?)\b/)||t.match(/\b(?:portfolio|basket) of (\d{1,2})\b/)||t.match(/\btop (\d{1,2})\b/); return m?Math.max(2,Math.min(40,+m[1])):def; }
function winOf(t){ if(/\bthis week\b|\b5 ?d(?:ays?)?\b|\bweekly\b|\bpast week\b|\blast week\b/.test(t)) return "5d"; if(/\b3 months?\b|\bquarter\b|\b3m\b/.test(t)) return "m3"; if(/\bytd\b|\byear to date\b|\bthis year\b/.test(t)) return "ytd"; if(/\bthis month\b|\b1 month\b|\bmonth\b|\b1m\b/.test(t)) return "m1"; return null; }
qmParseX=function(q){
  MYQ=null; AFQ=false;
  try{
    var t=qmT(q), C=QM_CTX||qmBuildCtx(); if(!C) return _qmParseX98(q);
    var tks=[]; try{ tks=A.tickers?A.tickers(q):[]; }catch(e){} tks=tks.filter(function(s){ return !new RegExp("\\b"+s+" sector","i").test(q); });
    (String(q).match(/\b(?:to|and|with|vs\.?|versus) ([A-Z])\b/g)||[]).forEach(function(m){ var s1=m.slice(-1); if(C.bySym[s1]&&tks.indexOf(s1)<0) tks.push(s1); });
    var th=themesIn(t), ii=qmIndMentions(t,C), sm=qmSecMentions(t), ss=sm.inn||[];
    var PORT=/\b(?:portfolio|portfolios|basket)\b/.test(t)&&!FOLLOW.test(t);
    var BUILD=/\b(?:build|create|construct|make|give|design|put together|assemble|want|suggest|pick)\b|\bportfolio (?:of|for|from|with|using)\b/.test(t);
    /* hedge for a portfolio of named tickers: hand the list to the existing hedge question */
    if(/\bhedg\w*\b/.test(t)&&PORT&&tks.length>=2) return {kind:"hcport",mode:"hedge",syms:tks.slice(0,50),n:nOf(t,10),cross:/\b(?:other|another|different) sectors?\b|\boutside\b/.test(t)};
    /* Subsector Web in Alex's style for this one answer */
    if(/\bweb\b/.test(t)&&/\baf approach\b|\baf\b|\balex\w*\b|\bcorrelation tree\b|\bmst\b/.test(t)) AFQ=true;
    /* ---- connections ---- */
    var CONN=/\bconnect\w*\b|\blink(?:s|ed|ing)?\b|\bbridg\w*\b|\brelated\b|\bin common\b|\bties? between\b|\btied\b/.test(t)&&!PORT&&!/\bcorrelation matrix\b|\bmap\b|\bweb\b/.test(t);
    if(CONN&&tks.length===2&&!/\bpairs?\b/.test(t)) return mark({kind:"hconn",mode:"pair",a:tks[0],b:tks[1]});
    if(CONN&&!tks.length&&!/\bpairs?\b/.test(t)&&/\bwhat (?:links|connects|ties|joins)\b|\bconnections? between\b|\blinks? between\b|\bbridg\w*\b|\bhow (?:are|is|do) .+ (?:connected|linked|related|connect|link)\b|\bin common\b/.test(t)){ var G=[], rest=" "+t.replace(/-/g," ").replace(/\s+/g," ").trim()+" ";
      ii.forEach(function(k){ G.push({t:"ind",k:k}); rest=rest.split(C.indNorm[k]).join(" "); });
      var th2=themesIn(rest); if(/\btheme/.test(t)||th2.some(function(k){ return k==="aiinfra"||k==="power"||k==="semis"; })) th2.forEach(function(k){ G.push({t:"theme",k:k}); var re=new RegExp(TH_BY[k].re.source,"g"); rest=rest.replace(re," "); });
      (qmSecMentions(rest).inn||[]).forEach(function(k){ var key=qmSecKey(k)||k; if(!G.some(function(g){ return g.t==="sec"&&g.k===key; })) G.push({t:"sec",k:key}); });
      if(G.length===2) return mark({kind:"hconn",mode:"groups",g:G}); }
    /* ---- best name in each group ---- */
    var EA=t.match(/\b(?:best|strongest|top|leading)(?: \d)? (?:stock|name|pick|company|ticker)s? (?:in|from|for|of) (?:each|every) (?:(rising|falling|improving|deteriorating|strong|weak) )?(sub ?sectors?|sectors?|themes?|hidden groups?|clusters?)\b/);
    if(EA) return mark({kind:"hsmart",mode:"each",uni:"stocks",by:/sub/.test(EA[2])?"ind":(/sector/.test(EA[2])?"sec":(/theme/.test(EA[2])?"theme":(/hidden/.test(EA[2])?"hg":"cl"))),dir:EA[1]||null,t:t});
    /* ---- themes and rotation ---- */
    var THW=/\bthemes?\b|\bnarratives?\b/.test(t), ROT=/\brotat\w*\b|\bmoney (?:is )?(?:moving|flowing|going)\b|\bflows? (?:from|into)\b/.test(t);
    if(PORT&&th.length&&(THW||th[0]==="aiinfra"||th[0]==="power")) return mark({kind:"hsmart",uni:"stocks",n:nOf(t,10),theme:th[0],t:t});
    if(ROT&&!PORT){ var fm=t.match(/\bfrom (.+?) (?:in)?to (.+?)(?:\?| $|$)/), pair=null;
      if(fm){ var a1=themesIn(" "+fm[1]+" "), b1=themesIn(" "+fm[2]+" "), sa=qmSecMentions(" "+fm[1]+" ").inn||[], sb=qmSecMentions(" "+fm[2]+" ").inn||[];
        var ga=a1.length?{t:"theme",k:a1[0]}:(sa.length?{t:"sec",k:qmSecKey(sa[0])||sa[0]}:null), gb=b1.length?{t:"theme",k:b1[0]}:(sb.length?{t:"sec",k:qmSecKey(sb[0])||sb[0]}:null); if(ga&&gb) pair=[ga,gb]; }
      if(!pair&&th.length>=2) pair=[{t:"theme",k:th[0]},{t:"theme",k:th[1]}];
      if(pair) return mark({kind:"htheme",mode:"rot2",g:pair});
      return mark({kind:"htheme",mode:"rotation",win:winOf(t)||"m1",level:/\bsub ?sectors?\b|\bindustr/.test(t)?"ind":(/\bsectors?\b/.test(t)&&!THW?"sec":"theme")}); }
    if(/\b(?:leading|lagging|leaders?|laggards?|outperform\w*|underperform\w*)\b/.test(t)&&/\bsub ?sectors?\b|\bindustries\b|\bsectors\b|\bthemes\b/.test(t)&&!tks.length&&!PORT&&!/\bstocks?\b|\bnames\b|\bsymbols\b/.test(t))
      return mark({kind:"htheme",mode:"rank",level:/\bthemes?\b/.test(t)?"theme":(/\bsub ?sectors?\b|\bindustr/.test(t)?"ind":"sec"),win:winOf(t)||"5d",both:/\bleading\b.*\blagging\b|\bleaders?\b.*\blaggards?\b|\band which\b/.test(t),asc:/\blagging\b|\blaggards?\b|\bunderperform/.test(t)&&!/\bleading\b|\bleaders?\b/.test(t)});
    var LL=t.match(/\b(strongest|best|leading|top)\b (?:\d+ )?(?:stocks|names|symbols|companies)? ?(?:in|from|within|of) the (weakest|worst|lagging|falling|weak) (sub ?sectors?|sectors?|themes?)\b/)||t.match(/\b(weakest|worst|lagging)\b (?:\d+ )?(?:stocks|names|symbols|companies)? ?(?:in|from|within|of) the (strongest|best|leading|rising|strong) (sub ?sectors?|sectors?|themes?)\b/);
    if(LL) return mark({kind:"htheme",mode:"against",pick:/strongest|best|leading|top/.test(LL[1])?"strong":"weak",level:/sub/.test(LL[3])?"ind":(/theme/.test(LL[3])?"theme":"sec"),n:nOf(t,10)});
    if(THW&&!PORT&&!/\banomaly themes?\b/.test(t)){
      if(th.length===1&&!/\bthemes\b|\ball themes\b|\bwhich themes?\b|\brank\b/.test(t)) return mark({kind:"htheme",mode:"detail",k:th[0]});
      return mark({kind:"htheme",mode:"list",win:winOf(t)||"m1",asc:/\bweak\w*\b|\blagging\b|\bworst\b|\bdeteriorat\w*\b/.test(t)&&!/\bstrong\w*\b/.test(t),by:/\bstrengthen\w*|\bimprov\w*/.test(t)?"sent":null}); }
    if(/\bshow (?:me )?the (.+?) (?:theme|basket)\b/.test(t)&&th.length===1) return mark({kind:"htheme",mode:"detail",k:th[0]});
    /* ---- mixed ETFs + stocks, smart long / short ---- */
    if(PORT&&/\betfs?\b/.test(t)&&/\bstocks?\b|\bequit\w*\b|\bnames\b/.test(t)&&!/\blong[ -]short\b/.test(t)){
      var me=t.match(/\b(\d{1,2}) ?etfs?\b/), ms=t.match(/\b(\d{1,2}) ?(?:stocks?|equit\w*|names)\b/);
      return mark({kind:"hsmart",mix:{etf:me?Math.max(1,Math.min(20,+me[1])):5,stk:ms?Math.max(1,Math.min(30,+ms[1])):5},t:t}); }
    if(PORT&&/\blong[ -\/]?(?:and )?short\b/.test(t)&&/\bsmart\b|\badaptive\b/.test(t)){
      var ln=t.match(/\b(\d{1,2}) ?(?:longs?|stocks?|names|etfs?)\b/); return mark({kind:"hsmart",uni:/\betfs?\b/.test(t)?"etf":"stocks",ls:{n:ln?Math.max(2,Math.min(20,+ln[1])):5},t:t}); }
    /* ---- adaptive portfolio ---- */
    if(PORT&&!/\brisk level\b|\blong[ -]short\b|\bshort\b|\b(?:one|1) (?:stock |name )?(?:per|from each|in each|for each) (?:cluster|block|bloc)\b|\bfrom each (?:rising|falling) (?:block|cluster)\b|\b(?:each|every) (?:rising |falling |directional )?(?:block|bloc)s?\b|\bpairs?\b|\bhedg\w*\b/.test(t)){
      var ETF=/\betfs?\b|\bfunds\b|\bexchange traded\b/.test(t);
      var F={conv:/\bconverg\w*\b|\blenses\b/.test(t),hg:/\bhidden groups?\b/.test(t),cl:/\bclusters?\b|\bhierarch\w*\b|\bdendrogram\b/.test(t),corr:/\blow(?:er)? correlat\w*\b|\buncorrelated\b|\bdiversif\w*\b|\bnot correlated\b|\bindependent\b/.test(t),
        sec:/\bacross (?:sectors|subsectors|industries)\b|\bmax(?:imum)? \d+ per (?:sector|subsector)\b|\bdifferent (?:sectors|subsectors)\b|\bno more than \d+ (?:per|in each|from each) (?:sector|subsector)\b/.test(t),rot:/\brising sub ?sectors?\b|\bsub ?sectors? (?:is |are |that are )?rising\b|\brotation\b|\bimproving sub ?sectors?\b/.test(t),
        mom:/\bmomentum\b|\bleaders?\b|\bstrong(?:est)?\b|\bstrength\b/.test(t),def:/\bdefensive\b|\blow vol\w*\b|\bcalm\w*\b|\bsteady\b|\blow risk\b/.test(t),dir:/\bimproving\b|\bstrengthening\b/.test(t)};
      var nF=Object.keys(F).filter(function(k){ return F[k]; }).length, SMART=/\bsmart\b|\badaptive\b|\bmulti[- ]?factor\b|\bblended\b|\bintelligent\b/.test(t);
      if(ETF||SMART||nF>=3||F.hg||(F.cl&&F.corr)||(F.conv&&(F.rot||F.sec||F.corr)))
        return mark({kind:"hsmart",uni:ETF?"etf":"stocks",n:nOf(t,ETF?0:10),t:t});
    }
  }catch(e){}
  return _qmParseX98(q);
};
QMX_KINDS.hsmart=1; QMX_KINDS.hconn=1; QMX_KINDS.htheme=1;
var _qmValidateAny98=qmValidateAny;
qmValidateAny=function(raw){ if(!raw||(raw.kind!=="hsmart"&&raw.kind!=="hconn"&&raw.kind!=="htheme")) return _qmValidateAny98(raw); try{ return {spec:JSON.parse(JSON.stringify(raw))}; }catch(e){ return {error:"The query could not be checked: "+e.message}; } };
try{ var _qmIgn98=qmIgn; qmIgn=function(q){ var a=_qmIgn98(q); try{ if(MYQ) a=a.filter(function(x){ return !/cluster conditions|horizons longer|data the scan does not carry/.test(x); }); }catch(e){} return a; }; }catch(e){}

/* ---------------- run ---------------- */
var _qmRunX98=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!spec||(spec.kind!=="hsmart"&&spec.kind!=="hconn"&&spec.kind!=="htheme")){
    if(!AFQ) return _qmRunX98(spec,ctx,res,t0);
    var on=false; try{ on=localStorage.getItem("alexaligned.sbw.af")==="1"; }catch(e){}
    window.__afForce=true; var r0; try{ r0=_qmRunX98(spec,ctx,res,t0); } finally { window.__afForce=false; AFQ=false; }
    try{ if(!on&&typeof sbwRender==="function") sbwRender(); }catch(e){}
    try{ if(r0&&r0.notes&&/hx95|sbw|web/i.test(JSON.stringify(spec))) r0.notes.unshift("AF Approach (this answer only): purple links are the strongest daily-return correlations inside the subsector (a correlation tree over 252 bars, needs the price history), laid out as chains; green up / red down on the day. Your Subsector Web switch is unchanged."); }catch(e){}
    return r0; }
  try{ var cd=String(ctx.date||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if(cd) ctx=Object.create(ctx,{date:{value:(cd[3].length===2?"20"+cd[3]:cd[3])+"-"+("0"+cd[1]).slice(-2)+"-"+("0"+cd[2]).slice(-2)}}); }catch(e){}
  var h=H();
  function fin(n){ res.cov=qmCovX(ctx,h?"Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).":"Price history (part E) not loaded: correlation, 1 to 3 month and YTD parts are left out."); res.rows=n; res.qualifying=n; res.ms=Date.now()-t0; return res; }
  try{
    if(spec.kind==="hsmart") return fin(runSmart(spec,ctx,res));
    if(spec.kind==="hconn") return fin(runConn(spec,ctx,res));
    return fin(runTheme(spec,ctx,res));
  }catch(e){ res.lead="This question could not be answered: "+hE(e.message); return fin(0); }
};

/* ================= smart portfolio ================= */
function runSmart(spec,ctx,res){
  if(spec.mix||spec.ls) return runCombo(spec,ctx,res);
  var SHORT=spec.side==="short", t=SHORT?" portfolio ":(spec.t||""), G=groups(), h=H(), etf=spec.uni==="etf";
  var rows=etf?etfRows():ctx.rows.slice();
  var notes=[], read=[];
  /* hard filters */
  var sm=qmSecMentions(t), ii=qmIndMentions(t,ctx), th=spec.theme?TH_BY[spec.theme]:null;
  if(!etf){
    if(th){ rows=rows.filter(th.f); read.push(["Theme",th.n+" ("+rows.length+" names)"]); }
    else{ if(ii.length){ rows=rows.filter(function(r){ return ii.indexOf(r.ind)>=0; }); read.push(["Subsectors",ii.join(", ")]); }
      else if((sm.inn||[]).length){ var ks=sm.inn.map(function(v){ return qmSecKey(v)||v; }); rows=rows.filter(function(r){ return ks.indexOf(r.sec)>=0; }); read.push(["Sectors",ks.map(qmSecName).join(", ")]); } }
    if((sm.out||[]).length){ var ko=sm.out.map(function(v){ return qmSecKey(v)||v; }); rows=rows.filter(function(r){ return ko.indexOf(r.sec)<0; }); read.push(["Excluding",ko.map(qmSecName).join(", ")]); }
  }
  var exm=t.match(/\b(?:excluding|except|without|not) ([a-z0-9 ,]+)/), exT=[]; if(exm){ (exm[1].toUpperCase().match(/[A-Z]{1,5}/g)||[]).forEach(function(s){ if((ctx.bySym[s]||etfSet()[s])&&exT.indexOf(s)<0) exT.push(s); }); rows=rows.filter(function(r){ return exT.indexOf(r.sym)<0; }); }
  var hard=[];
  if(SHORT){ rows=rows.filter(function(r){ return r.dir!=="improving"&&(etf||r.trend!=="up"); }); hard.push(etf?"not improving":"not improving and not in an uptrend"); }
  if(/\bimproving\b/.test(t)&&!/\bimproving sub ?sectors?\b/.test(t)){ rows=rows.filter(function(r){ return r.dir==="improving"; }); hard.push("Early Warning direction improving"); }
  else if(/\bstrengthening\b/.test(t)){ rows=rows.filter(function(r){ return etf?num(r.rec)&&r.rec>0:num(r.sev)&&r.sev>0; }); hard.push("strengthening (score above zero)"); }
  if(!etf&&/\b(?:fresh|new|young|recent|just turned)(?: trend)? (?:up ?trend|uptrend|trend up)s?\b/.test(t)){ rows=rows.filter(function(r){ return r.trend==="up"&&num(r.tb)&&r.tb<=10; }); hard.push("in a fresh uptrend (10 sessions or less)"); }
  else if(!etf&&/\buptrends?\b|\btrending up\b|\btrend up\b/.test(t)){ rows=rows.filter(function(r){ return r.trend==="up"; }); hard.push("in an uptrend"); }
  if(/\banomal\w*\b|\bunusual\b/.test(t)){ rows=rows.filter(function(r){ return num(r.ga)&&r.ga>=0.3; }); hard.push("anomalous (graph anomaly 0.30 or more)"); }
  if(!etf&&/\brising sub ?sectors?\b|\bsub ?sectors? (?:is |are |that are )?rising\b|\bimproving sub ?sectors?\b/.test(t)){ rows=rows.filter(function(r){ var g=ctx.indStats[r.ind]; return g&&g.bias==="improving"; }); hard.push("in a rising subsector (most members improving)"); }
  pcParse(t,["fresh","up","improving","strength","anom","conv","estab"].concat(etf?["notext","neartl","notob","oversold","liquid","hi52","beat","lowdd","lowbeta","estab"]:[])).forEach(function(k){ var n0=rows.length; rows=rows.filter(function(r){ return pcTest(k,r); }); hard.push(pcLab(k)); });
  if(!etf&&/\b(?:established|mature|long[- ]running) (?:up ?trend|uptrend)s?\b/.test(t)){ rows=rows.filter(function(r){ return pcTest("estab",r); }); hard.push(pcLab("estab")); }
  var convHard=!etf&&/\b(?:where |with |whose )?signals? (?:converge|are converging)\b|\bsignal convergence\b|\bconverging signals?\b/.test(t);
  if(convHard){ var cc=rows.filter(function(r){ return num(r.conv)&&r.conv>=3; }); if(cc.length>=Math.max(4,(spec.n||10))){ rows=cc; hard.push("signals converge (3 or more of the six lenses)"); } else { cc=rows.filter(function(r){ return num(r.conv)&&r.conv>=2; }); rows=cc; hard.push("signal convergence of 2 or more lenses (3 or more left too few names)"); } }
  if(!rows.length){ res.lead="No "+(etf?"ETFs":"stocks")+" pass "+(hard.join(", ")||"the filters")+" on this bar."; return 0; }
  var N=spec.n||(etf?Math.min(8,rows.length):10);
  /* adaptive weights from the words */
  var W={mom:1,conv:etf?0:1,dir:1,rot:etf?0:1,sent:etf?1:0,low:0.5}, why={mom:"base",conv:"base",dir:"base",rot:"base",sent:"base",low:"base"};
  function boost(k,x,w){ if(W[k]!==undefined){ W[k]*=x; why[k]=w; } }
  if(/\bmomentum\b|\bleaders?\b|\bstrong(?:est)?\b|\bstrength\b|\bgrowth\b/.test(t)) boost("mom",3,"you asked for momentum / strength");
  if(/\bconverg\w*\b|\blenses\b/.test(t)&&!etf) boost("conv",3,"you asked for signal convergence");
  if(/\bimproving\b|\bstrengthening\b|\bturning up\b/.test(t)) boost("dir",2.5,"you asked for improving names");
  if(/\brising\b|\brotation\b|\bimproving sub ?sectors?\b|\bsector strength\b/.test(t)&&!etf) boost("rot",2.5,"you asked for rising subsectors / rotation");
  if(/\bdefensive\b|\blow vol\w*\b|\bcalm\w*\b|\bsteady\b|\blow risk\b|\bconservative\b|\bsafe\b/.test(t)){ boost("low",5,"you asked for low risk"); W.mom*=0.6; if(why.mom==="base") why.mom="lowered: you asked for low risk"; }
  if(/\baggressive\b|\bhigh risk\b/.test(t)){ boost("mom",2,"you asked for an aggressive tilt"); W.low=0; why.low="off: aggressive"; }
  if(etf&&/\bsew\b|\bsentiment\b|\bscore\b/.test(t)) boost("sent",2.5,"you asked for the SEW score");
  if(th) boost("mom",1.5,"theme portfolio: favour the theme's leaders");
  /* factor values, as percentiles within the candidates' universe */
  var uni=etf?etfRows():ctx.rows;
  var pStr=pctRank(uni,function(r){ return etf?mean([r.r10,r.m1,r.m3]):r.str; }), pM3=pctRank(uni,function(r){ return r.m3; }), pYtd=pctRank(uni,function(r){ return r.ytd; });
  var pVol=pctRank(uni,function(r){ return num(r.vol12)?r.vol12:r.vol; }), pRec=pctRank(uni,function(r){ return r.rec; });
  var indNet={}; if(!etf) Object.keys(ctx.indStats).forEach(function(k){ var g=ctx.indStats[k]; indNet[k]=g.cov?(g.impr-g.det)/g.cov:0; });
  var pRot=pctRank(Object.keys(indNet).map(function(k){ return {v:indNet[k]}; }),function(o){ return o.v; });
  rows.forEach(function(r){
    var mom=etf?pStr(r):mean([num(r.str)?r.str/100:null,pM3(r.m3),pYtd(r.ytd)]);
    var f={mom:mom,conv:num(r.conv)?r.conv/6:null,dir:r.dir==="improving"?1:(r.dir==="deteriorating"?0:0.5),rot:etf?null:pRot(indNet[r.ind]),sent:etf?pRec(r.rec):null,low:(function(){ var v=pVol(num(r.vol12)?r.vol12:r.vol); return num(v)?1-v:null; })()};
    if(SHORT) ["mom","dir","rot","sent"].forEach(function(k){ if(num(f[k])) f[k]=1-f[k]; });
    var s=0, w=0, parts=[]; Object.keys(W).forEach(function(k){ if(!W[k]||!num(f[k])) return; s+=W[k]*f[k]; w+=W[k]; parts.push([k,W[k]*f[k],f[k]]); });
    r._f=f; r._s=w?s/w*100:0; parts.sort(function(a,b){ return b[1]-a[1]; }); r._why=parts.slice(0,3).filter(function(p){ return p[2]>=0.55; }).map(function(p){ return (SHORT?{mom:"weak momentum",conv:"convergence "+(num(r.conv)?r.conv+"/6":""),dir:"deteriorating",rot:"falling subsector",sent:"weak SEW score",low:"low volatility"}:{mom:"momentum",conv:"convergence "+(num(r.conv)?r.conv+"/6":""),dir:"improving",rot:"rising subsector",sent:"SEW score",low:"low volatility"})[p[0]]; });
  });
  rows.sort(function(a,b){ return b._s-a._s; });
  /* constraints */
  var mx=t.match(/\b(?:max(?:imum)?|at most|no more than) (\d+) (?:per|in each|from each|from any|from one) sector\b/), maxSec=mx?+mx[1]:(/\bacross sectors\b|\bdiversif\w*\b|\bdifferent sectors\b/.test(t)?Math.max(1,Math.ceil(N/4)):Math.max(2,Math.ceil(N/3)));
  var mxI=t.match(/\b(?:max(?:imum)?|at most|no more than) (\d+) (?:per|in each|from each) sub ?sector\b/), maxInd=mxI?+mxI[1]:(/\bdifferent sub ?sectors\b/.test(t)?1:2);
  var maxHg=/\bhidden groups?\b/.test(t)?1:2, oneCl=/\bclusters?\b|\bhierarch\w*\b|\bdendrogram\b/.test(t);
  var lowCorr=/\blow(?:er)? correlat\w*\b|\buncorrelated\b|\bdiversif\w*\b|\bnot correlated\b|\bindependent\b|\bclusters?\b|\bhierarch\w*\b/.test(t), lam=lowCorr?3:1.2;
  if(th){ maxSec=Math.max(maxSec,Math.ceil(N/2)); maxInd=mxI?maxInd:Math.max(2,Math.ceil(N/3)); }
  var pick=[], cnt={sec:{},ind:{},hg:{},cl:{},grp:{}}, skipped={sec:0,ind:0,hg:0,cl:0,dup:0};
  for(var i=0;i<rows.length&&pick.length<N;i++){
    var best=null, bestV=-1e9;
    rows.forEach(function(r){ if(r._used) return;
      if(etf){ if((cnt.grp[r.grp]||0)>=Math.max(2,Math.ceil(N/2))) return; }
      else{ if((cnt.sec[r.sec]||0)>=maxSec) return; if((cnt.ind[r.ind]||0)>=maxInd) return; var g=G.hg[r.sym]; if(g!==undefined&&(cnt.hg[g]||0)>=maxHg) return; var c=G.cl[r.sym]; if(oneCl&&c!==undefined&&(cnt.cl[c]||0)>=1) return; }
      var mc=0; if(h) pick.forEach(function(p){ var x=cor(r.sym,p.sym,252); if(num(x)&&x>mc) mc=x; }); r._mc=pick.length?mc:null;
      if(etf&&mc>0.95) return;
      var v=r._s-lam*100*Math.max(0,mc-0.3)*0.5; if(v>bestV){ bestV=v; best=r; } });
    if(!best) break; best._used=true; pick.push(best);
    if(etf) cnt.grp[best.grp]=(cnt.grp[best.grp]||0)+1; else{ cnt.sec[best.sec]=(cnt.sec[best.sec]||0)+1; cnt.ind[best.ind]=(cnt.ind[best.ind]||0)+1; var g2=G.hg[best.sym]; if(g2!==undefined) cnt.hg[g2]=(cnt.hg[g2]||0)+1; var c2=G.cl[best.sym]; if(c2!==undefined) cnt.cl[c2]=(cnt.cl[c2]||0)+1; }
  }
  rows.forEach(function(r){ delete r._used; });
  if(!pick.length){ res.lead="The constraints left no names; loosen them (for example allow more per sector)."; return 0; }
  pick.forEach(function(p){ var mc=null; if(h) pick.forEach(function(o){ if(o===p) return; var x=cor(p.sym,o.sym,252); if(num(x)&&(mc===null||x>mc)) mc=x; }); p._mc=mc; });
  function avgPair(list){ if(!h) return null; var s=0,k=0; for(var a=0;a<list.length;a++) for(var b=a+1;b<list.length;b++){ var x=cor(list[a].sym,list[b].sym,252); if(num(x)){ s+=x; k++; } } return k?s/k:null; }
  var plain=rows.slice(0,pick.length), ap=avgPair(pick), apP=avgPair(plain);
  /* weights */
  var wMode=/\binverse vol\w*\b|\brisk parity\b|\bvolatility weighted\b|\bequal risk\b/.test(t)?"inverse volatility":(/\bscore weighted\b|\bconviction\b|\bweighted by (?:score|conviction)\b/.test(t)?"score":"equal");
  var raw=pick.map(function(p){ if(wMode==="inverse volatility"){ var v=num(p.vol12)?p.vol12:null; return v?1/v:null; } if(wMode==="score") return p._s; return 1; });
  if(raw.some(function(x){ return !num(x); })){ raw=pick.map(function(){ return 1; }); if(wMode!=="equal") notes.push("Weights: "+wMode+" needs the price history for every name, so equal weights are used."); wMode="equal"; }
  var tw=raw.reduce(function(p,q){ return p+q; },0); pick.forEach(function(p,k){ p._w=raw[k]/tw*100; });
  var secs={}, hgs={}; pick.forEach(function(p){ secs[etf?p.grp:p.sec]=1; if(G.hg[p.sym]!==undefined) hgs[G.hg[p.sym]]=1; });
  res.lead="A "+pick.length+"-"+(etf?"ETF":"stock")+" adaptive portfolio"+(th?" in the "+th.n+" theme":"")+(hard.length?" from "+rows.length+" candidates that are "+hard.join(", "):" from "+rows.length+" candidates")+": ranked by a blended score whose weights follow your words, then picked one at a time to stay diversified. "+
    (num(ap)?"Average pairwise correlation <b>"+ap.toFixed(2)+"</b> (252 bars)"+(num(apP)?" against "+apP.toFixed(2)+" for the plain top "+pick.length+" by score":"")+"; ":"")+Object.keys(secs).length+" "+(etf?"ETF groups":"sectors")+(etf?"":", "+Object.keys(hgs).length+" Hidden Groups")+".";
  if(pick.length<N) res.lead+=" Only "+pick.length+" of the "+N+" asked for fit the rules and the diversification limits.";
  var head=etf?["Rank","Symbol","Group","Score","Why","SEW score","Direction","10D","1M","3M","Max corr in portfolio","Weight"]:["Rank","Symbol","Sector","Subsector","Score","Why","Direction","Convergence","Strength pct","1M","3M","Max corr in portfolio","Weight"];
  res.table={head:head,align:etf?["r","l","l","r","l","r","l","r","r","r","r","r"]:["r","l","l","l","r","l","l","r","r","r","r","r","r"],hxColor:etf?{5:"sign",6:"dir",7:"sign",8:"sign",9:"sign"}:{6:"dir",9:"sign",10:"sign"},
    body:pick.map(function(p,k){ return etf?[String(k+1),p.sym,p.grp,p._s.toFixed(0),p._why.join(", ")||"balanced",f2(p.rec,1),p.dir,pc(p.r10,2),pc(p.m1),pc(p.m3),f2(p._mc),p._w.toFixed(1)+"%"]:
      [String(k+1),p.sym,qmSecName(p.sec),p.ind,p._s.toFixed(0),p._why.join(", ")||"balanced",p.dir,num(p.conv)?p.conv+"/6":"–",num(p.str)?p.str.toFixed(0):"–",pc(p.m1),pc(p.m3),f2(p._mc),p._w.toFixed(1)+"%"]; })};
  var wl={mom:"Momentum (strength percentile"+(h?", 3M and YTD return":"")+")",conv:"Signal convergence (lenses flagging)",dir:"Early Warning direction",rot:"Subsector rotation (share of the subsector improving)",sent:"SEW score",low:"Low volatility"};
  res.extra=[{title:"How your question was read (weights are relative; the score is 0 to 100)",table:{head:["Part","Setting","Because"],align:["l","l","l"],
    body:Object.keys(W).filter(function(k){ return W[k]>0; }).map(function(k){ return ["Weight: "+wl[k],W[k].toFixed(1),why[k]==="base"?"default":why[k]]; })
      .concat(read.map(function(x){ return [x[0],x[1],"named in the question"]; }))
      .concat(hard.map(function(x){ return ["Filter",x,"named in the question"]; }))
      .concat(etf?[["Limit","at most "+Math.max(2,Math.ceil(N/2))+" per ETF group; near-identical funds (correlation above 0.95) are not doubled up","diversification"]]:[["Limit","at most "+maxSec+" per sector, "+maxInd+" per subsector, "+maxHg+" per Hidden Group"+(oneCl?", 1 per price cluster (252-bar dendrogram cut at 0.5)":""),"diversification"]])
      .concat([["Correlation penalty",h?(lowCorr?"strong":"mild")+": each pick is marked down by its highest correlation to the names already picked":"off (load the price history)",lowCorr?"you asked for low correlation / clusters / diversification":"default"],["Weights",wMode,wMode==="equal"?"default (ask for inverse volatility or score weighted)":"named in the question"]])}}];
  if(exT.length) notes.push("Excluded: "+exT.join(", ")+".");
  notes.push("Adaptive: the words in your question change the weights (for example “defensive” raises low volatility and lowers momentum; “converge” raises signal convergence), so two differently worded questions give different, explained portfolios. Not a forecast and not backtested.");
  res.notes=res.notes.concat(notes);
  if(!etf) res.send=sendOf(ctx,pick.map(function(p){ return p.sym; }),"adaptive portfolio");
  return pick.length;
}

/* mixed ETFs + stocks, and smart long / short: run the builder for each part and put the parts together */
function runCombo(spec,ctx,res){
  var parts=spec.mix?[{lab:"Stocks",sp:{kind:"hsmart",uni:"stocks",n:spec.mix.stk,t:spec.t}},{lab:"ETFs",sp:{kind:"hsmart",uni:"etf",n:spec.mix.etf,t:spec.t}}]
    :[{lab:"Long",sp:{kind:"hsmart",uni:spec.uni||"stocks",n:spec.ls.n,t:spec.t}},{lab:"Short",sp:{kind:"hsmart",uni:spec.uni||"stocks",n:spec.ls.n,t:spec.t,side:"short"}}];
  var out=[], total=0;
  parts.forEach(function(p){ var r={notes:[],extra:[],bullets:[]}; var n=runSmart(p.sp,ctx,r); out.push({p:p,r:r,n:n,syms:r.table?r.table.body.map(function(row){ return row[1]; }):[]}); total+=n; });
  if(!total){ res.lead="No names passed the rules for either part."; return 0; }
  var h=H(), all=[]; out.forEach(function(o){ o.syms.forEach(function(s){ all.push(s); }); });
  var ap=null; if(h){ var s2=0,k=0; for(var a=0;a<all.length;a++) for(var b=a+1;b<all.length;b++){ var c=cor(all[a],all[b],252); if(num(c)){ s2+=c; k++; } } ap=k?s2/k:null; }
  if(spec.mix){
    /* weight each part by its share of the names; each part keeps its own weighting inside */
    out.forEach(function(o){ if(!o.r.table) return; var share=o.n/total, wi=o.r.table.head.indexOf("Weight"); o.r.table.body.forEach(function(row){ var w=parseFloat(row[wi]); if(num(w)) row[wi]=(w*share).toFixed(1)+"%"; }); });
    res.lead="A mixed portfolio of "+out[0].n+" stocks and "+out[1].n+" ETFs, each part built by the adaptive builder with the same conditions and then weighted by its share of the names ("+(out[0].n/total*100).toFixed(0)+"% stocks, "+(out[1].n/total*100).toFixed(0)+"% ETFs)."+(num(ap)?" Average pairwise correlation across all "+all.length+" holdings: <b>"+ap.toFixed(2)+"</b> (252 bars).":"");
  } else {
    var nl=out[0].n, ns=out[1].n, cross=null; if(h){ var lb=basketRets(out[0].syms,252), sb=basketRets(out[1].syms,252); if(lb&&sb) cross=corArr(lb,sb); }
    var Mm=null; try{ Mm=A.metrics(); }catch(e){} var beta=function(list){ return mean(list.map(function(s){ var m=Mm&&Mm.by?Mm.by[s]:null; return m&&!m.stale?m.beta:null; })); }, bl=beta(out[0].syms), bs=beta(out[1].syms);
    res.lead="A smart long / short portfolio: "+nl+" longs chosen with your conditions, "+ns+" shorts scored the opposite way (weak momentum, deteriorating, falling subsectors; never improving or in an uptrend). Equal gross on each side (dollar neutral)."+(num(cross)?" The long and short baskets correlate <b>"+cross.toFixed(2)+"</b> (252 bars), so the short side hedges "+(cross>=0.5?"much":(cross>=0.25?"some":"little"))+" of the long side's market move.":"")+(num(bl)&&num(bs)?" Average beta to RSP: longs "+bl.toFixed(2)+", shorts "+bs.toFixed(2)+".":"");
  }
  var first=out[0].r; res.table=first.table; if(res.table) res.table=JSON.parse(JSON.stringify(res.table));
  res.extra=[{title:out[0].p.lab+": "+(first.lead||"").replace(/<[^>]+>/g,"").slice(0,200),table:{head:["Part"],align:["l"],body:[]}}].slice(0,0);
  res.drillLead=out[0].p.lab+" ("+out[0].n+")";
  if(out[1].r.table) res.extra.push({title:out[1].p.lab+" ("+out[1].n+")"+(spec.ls?": scored for weakness":""),table:out[1].r.table});
  (out[0].r.extra||[]).slice(0,1).forEach(function(x){ res.extra.push({title:out[0].p.lab+" part - "+x.title,table:x.table}); });
  res.notes=res.notes.concat(out[1].r.notes.filter(function(x){ return !/^Adaptive:/.test(x); })).concat(out[0].r.notes);
  var items=[]; out.forEach(function(o,i){ o.syms.forEach(function(s){ if(ctx.bySym[s]) items.push({sym:s,side:(spec.ls&&i===1)?"short":"long",w:null}); }); });
  if(items.length) res.send={label:spec.ls?"smart long / short":"mixed portfolio (stocks)",items:items.slice(0,50)};
  return total;
}

/* ================= connections ================= */
function runConn(spec,ctx,res){
  var h=H(), G=groups(), by=ctx.bySym;
  if(spec.mode==="pair"){
    var a=spec.a, b=spec.b, ra=by[a], rb=by[b], ev=[];
    function nm(s){ return by[s]?qmSecName(by[s].sec)+" / "+by[s].ind:(etfSet()[s]?"ETF":"not in the scan"); }
    ev.push(["Sectors",a+": "+nm(a)+"; "+b+": "+nm(b),ra&&rb&&ra.ind===rb.ind?"same subsector":(ra&&rb&&ra.sec===rb.sec?"same sector":"different sectors")]);
    var c60=cor(a,b,60), c252=cor(a,b,252);
    if(h){ var rk=null; if(num(c252)){ var all=ctx.rows.filter(function(r){ return r.sym!==a; }).map(function(r){ return cor(a,r.sym,252); }).filter(num).sort(function(x,y){ return y-x; }); rk=all.indexOf(c252)+1; }
      ev.push(["Daily-return correlation","60 bars "+f2(c60)+"; 252 bars "+f2(c252)+(rk?" (rank "+rk+" of "+(ctx.rows.length-1)+" for "+a+")":""),num(c252)?(c252>=0.6?"strongly tied":(c252>=0.4?"moderately tied":(c252>=0.2?"loosely tied":"barely tied"))):"–"]); }
    var la=(G.nb[a]||[]).indexOf(b)>=0||(G.nb[b]||[]).indexOf(a)>=0; ev.push(["Behaviour look-alike",la?"yes":"no",la?"their scan profiles are among each other's 5 closest":""]);
    var hg=G.hg[a]!==undefined&&G.hg[a]===G.hg[b]; ev.push(["Hidden Group",hg?"same group":"different or none",""]);
    var cl=G.cl[a]!==undefined&&G.cl[a]===G.cl[b]; if(h) ev.push(["Price cluster (252-bar dendrogram)",cl?"same cluster":"different clusters",""]);
    var pe=(ra&&ra.peer===b)||(rb&&rb.peer===a); ev.push(["Closest return peer (scan)",pe?"yes":"no",ra&&ra.peer?a+"'s peer is "+ra.peer:""]);
    var fa=G.fl[a], fb=G.fl[b], sh=fa&&fb?Object.keys(FLN).filter(function(k){ return fa[k]&&fb[k]; }).map(function(k){ return FLN[k]; }):[]; ev.push(["Shared signal lenses",sh.length?sh.join(", "):"none",""]);
    if(ra&&rb) ev.push(["Direction today",a+" "+ra.dir+", "+b+" "+rb.dir,ra.dir===rb.dir?"moving the same way":""]);
    /* strongest correlation path */
    var path=null; if(h) path=corrPath(ctx,a,b);
    var direct=(num(c252)&&c252>=0.5)||hg||cl||la||pe;
    res.lead=a+" and "+b+": "+(direct?"<b>directly connected</b>":(path&&path.length>2?"<b>connected indirectly</b> through "+path.slice(1,-1).map(function(x){ return x.s; }).join(" → "):"<b>not meaningfully connected</b>"))+"; "+[num(c252)?"correlation "+c252.toFixed(2)+" over 252 bars":null,hg?"same Hidden Group":null,cl?"same price cluster":null,la?"behaviour look-alikes":null,sh.length?"shared lenses: "+sh.join(", "):null].filter(Boolean).join("; ")+".";
    res.table={head:["Evidence","Result","Reading"],align:["l","l","l"],body:ev};
    if(path&&path.length>2) res.extra=[{title:"Strongest correlation path (252 bars; each step is a pair with correlation of at least 0.5)",table:{head:["Step","From","To","Correlation","To's sector / subsector"],align:["r","l","l","r","l"],body:path.slice(1).map(function(x,k){ return [String(k+1),path[k].s,x.s,f2(x.r),nm(x.s)]; })}}];
    res.notes.push("Direct = correlation of 0.5 or more, or the same Hidden Group, price cluster, look-alike or return peer. The path joins the two through the strongest chain of highly correlated names, which shows how a move could travel between them.");
    res.send=sendOf(ctx,path?path.map(function(x){ return x.s; }):[a,b],"connection");
    return ev.length;
  }
  /* groups */
  var gs=spec.g.map(function(g){ var mem, name; if(g.t==="theme"){ mem=ctx.rows.filter(TH_BY[g.k].f); name=TH_BY[g.k].n+" theme"; } else if(g.t==="ind"){ mem=ctx.rows.filter(function(r){ return r.ind===g.k; }); name=g.k; } else { mem=ctx.rows.filter(function(r){ return r.sec===g.k; }); name=qmSecName(g.k); } return {name:name,mem:mem}; });
  var A1=gs[0], B1=gs[1];
  if(!A1.mem.length||!B1.mem.length){ res.lead="One of the two groups has no names in the scan."; return 0; }
  if(!h){ res.lead="Links between groups are measured on the daily price history (part E), which is not loaded in this view."; return 0; }
  var sa=A1.mem.map(function(r){ return r.sym; }).filter(function(s){ return h.syms[s]; }), sb=B1.mem.map(function(r){ return r.sym; }).filter(function(s){ return h.syms[s]; });
  var ba=basketRets(sa,252), bb=basketRets(sb,252), bc=corArr(ba,bb), bc60=corArr(ba.slice(-60),bb.slice(-60));
  var pairs=[]; sa.forEach(function(x){ sb.forEach(function(y){ if(x===y) return; var c=cor(x,y,252); if(num(c)) pairs.push({a:x,b:y,c:c}); }); }); pairs.sort(function(p,q){ return q.c-p.c; });
  function bridges(from,toBasket){ return from.map(function(s){ return {s:s,c:corArr(rets(s,252),toBasket)}; }).filter(function(o){ return num(o.c); }).sort(function(p,q){ return q.c-p.c; }).slice(0,5); }
  var brA=bridges(sa,bb), brB=bridges(sb,ba);
  var hgs={}; A1.mem.forEach(function(r){ var g=G.hg[r.sym]; if(g!==undefined) (hgs[g]=hgs[g]||{a:[],b:[]}).a.push(r.sym); }); B1.mem.forEach(function(r){ var g=G.hg[r.sym]; if(g!==undefined) (hgs[g]=hgs[g]||{a:[],b:[]}).b.push(r.sym); });
  var shared=Object.keys(hgs).filter(function(k){ return hgs[k].a.length&&hgs[k].b.length; });
  res.lead="<b>"+hE(A1.name)+"</b> and <b>"+hE(B1.name)+"</b>: their equal-weight baskets correlate <b>"+f2(bc)+"</b> over 252 bars ("+f2(bc60)+" over 60), "+(num(bc)?(bc>=0.6?"strongly tied":(bc>=0.4?"moderately tied":"loosely tied")):"")+". "+(pairs.length?"The tightest cross pair is "+pairs[0].a+" – "+pairs[0].b+" ("+pairs[0].c.toFixed(2)+")":"")+(shared.length?"; "+shared.length+" Hidden Group"+(shared.length>1?"s span":" spans")+" both":"")+".";
  res.table={head:["Rank","Symbol","In","Symbol ","In ","Correlation (252 bars)"],align:["r","l","l","l","l","r"],hxColor:{5:"sign"},body:pairs.slice(0,10).map(function(p,k){ return [String(k+1),p.a,by[p.a].ind,p.b,by[p.b].ind,p.c.toFixed(2)]; })};
  res.table.head[3]="Symbol";
  res.extra=[{title:"Bridge names: members of each group that move most like the other group's basket",table:{head:["Symbol","Group","Subsector","Correlation to the other basket"],align:["l","l","l","r"],hxColor:{3:"sign"},body:brA.map(function(o){ return [o.s,A1.name,by[o.s].ind,o.c.toFixed(2)]; }).concat(brB.map(function(o){ return [o.s,B1.name,by[o.s].ind,o.c.toFixed(2)]; }))}}];
  if(shared.length) res.extra.push({title:"Hidden Groups with members in both",table:{head:["Group","In "+A1.name,"In "+B1.name],align:["l","l","l"],body:shared.slice(0,8).map(function(k){ return ["#"+k,hgs[k].a.join(", "),hgs[k].b.join(", ")]; })}});
  res.notes.push("Bridge names are the ones a move in one group is most likely to travel through. Correlation is of daily returns; it says the names move together, not why.");
  res.send=sendOf(ctx,brA.concat(brB).map(function(o){ return o.s; }),"bridge names");
  return pairs.length;
}
var PATHC=null;
function corrPath(ctx,a,b){ var h=H(); if(!h) return null; var syms=ctx.rows.map(function(r){ return r.sym; }).filter(function(s){ return h.syms[s]; }); [a,b].forEach(function(s){ if(syms.indexOf(s)<0&&h.syms[s]) syms.push(s); });
  var st=h.savedAt+"|"+h.dates.length+"|"+syms.length; if(!PATHC||PATHC.st!==st){ var E={}; syms.forEach(function(s){ E[s]=[]; });
    for(var i=0;i<syms.length;i++) for(var j=i+1;j<syms.length;j++){ var c=cor(syms[i],syms[j],252); if(num(c)&&c>=0.5){ E[syms[i]].push({s:syms[j],r:c}); E[syms[j]].push({s:syms[i],r:c}); } } PATHC={st:st,E:E}; }
  var E2=PATHC.E; if(!E2[a]||!E2[b]) return null; var dist={}, prev={}, done={}; dist[a]=0; var Q=[a];
  while(Q.length){ Q.sort(function(x,y){ return dist[x]-dist[y]; }); var u=Q.shift(); if(done[u]) continue; done[u]=1; if(u===b) break;
    E2[u].forEach(function(e){ var d=dist[u]+(1-e.r)+0.15; if(dist[e.s]===undefined||d<dist[e.s]){ dist[e.s]=d; prev[e.s]={p:u,r:e.r}; Q.push(e.s); } }); }
  if(dist[b]===undefined) return null; var out=[{s:b,r:prev[b]?prev[b].r:null}], x=b; while(prev[x]){ x=prev[x].p; out.unshift({s:x,r:prev[x]?prev[x].r:null}); } out[0].r=null;
  /* r on each element is the correlation of the step INTO it */
  for(var k=out.length-1;k>0;k--) out[k].r=cor(out[k-1].s,out[k].s,252);
  return out; }

/* ================= themes ================= */
function runTheme(spec,ctx,res){
  var h=H(), M=null; try{ M=A.metrics(); }catch(e){} var bench=M&&M.bench, bm=bench&&M.by[bench]?M.by[bench]:null;
  function gOf(g){ if(g.t==="theme") return {name:TH_BY[g.k].n,rows:ctx.rows.filter(TH_BY[g.k].f)}; if(g.t==="ind") return {name:g.k,rows:ctx.rows.filter(function(r){ return r.ind===g.k; })}; return {name:qmSecName(g.k),rows:ctx.rows.filter(function(r){ return r.sec===g.k; })}; }
  function coh(rows){ if(!h) return null; var s=rows.map(function(r){ return r.sym; }).filter(function(x){ return h.syms[x]; }).slice(0,40), t=0,k=0; for(var i=0;i<s.length;i++) for(var j=i+1;j<s.length;j++){ var c=cor(s[i],s[j],60); if(num(c)){ t+=c; k++; } } return k?t/k:null; }
  var WL={"5d":"5D","m1":"1M","m3":"3M","ytd":"YTD"};
  function wv(st,w){ return w==="5d"?st.r5:st[w]; }
  function units(level){ if(level==="theme") return THEMES.map(function(th){ return {k:th.k,name:th.n,rows:ctx.rows.filter(th.f),etf:th.etf}; });
    var key=level==="ind"?"ind":"sec", G={}; ctx.rows.forEach(function(r){ (G[r[key]]=G[r[key]]||[]).push(r); }); return Object.keys(G).filter(function(k){ return G[k].length>=2; }).map(function(k){ return {k:k,name:level==="ind"?k+" ("+qmSecName(G[k][0].sec)+")":qmSecName(k),rows:G[k]}; }); }
  if(spec.mode==="list"||spec.mode==="rank"||spec.mode==="rotation"){
    var level=spec.level||"theme", win=spec.win||"m1"; if(!h&&win!=="5d") win="5d";
    var U2=units(level); U2.forEach(function(u){ u.st=grpStat(u.rows); u.v=wv(u.st,win); u.rel=num(u.st.m1)&&bm&&num(bm.m1)?u.st.m1-bm.m1:null; u.acc=num(u.st.m1)&&num(u.st.m3)?u.st.m1-u.st.m3/3:null; });
    var pv=pctRank(U2,function(u){ return u.v; }), pn=pctRank(U2,function(u){ return u.st.netP; }), pi=pctRank(U2,function(u){ return u.st.imP; }), pa=pctRank(U2,function(u){ return u.acc; });
    U2.forEach(function(u){ u.score=spec.mode==="rotation"?mean([pa(u.acc),pi(u.st.imP),pv(u.st.r5)]):(spec.by==="sent"?mean([pn(u.st.netP),pi(u.st.imP)]):mean([pv(u.v),pn(u.st.netP),pi(u.st.imP)])); });
    if(spec.mode==="rank") U2.forEach(function(u){ u.score=num(u.v)?u.v:-1e9; });
    U2.sort(function(a,b){ return spec.asc?(a.score-b.score):(b.score-a.score); });
    var lab={theme:"theme",ind:"subsector",sec:"sector"}[level];
    function rowOf(u,k){ return [String(k+1),u.name,String(u.st.n),pc(u.st.r5,2),pc(u.st.m1),pc(u.st.m3),pc(u.st.ytd),num(u.rel)?pc(u.rel):"–",pc(u.st.netP,0),u.st.imP.toFixed(0)+"%",num(u.st.conv)?u.st.conv.toFixed(1):"–",num(u.acc)?pc(u.acc):"–",level==="theme"?f2(coh(u.rows)):"",u.etf||""]; }
    var head=["Rank",lab.charAt(0).toUpperCase()+lab.slice(1),"Names","5D","1M","3M","YTD","1M vs "+(bench||"RSP"),"Net sentiment","Improving","Mean convergence","Acceleration (1M − 3M/3)",level==="theme"?"Cohesion (60-bar corr)":"",level==="theme"?"ETF proxy":""];
    var col={3:"sign",4:"sign",5:"sign",6:"sign",7:"sign",8:"sign",11:"sign"};
    if(level!=="theme"){ head=head.slice(0,12); }
    function trim(r){ return level==="theme"?r:r.slice(0,12); }
    if(spec.mode==="rotation"){
      var inn=U2.slice(0,Math.min(5,Math.ceil(U2.length/3))), out=U2.slice(-Math.min(5,Math.ceil(U2.length/3))).reverse();
      res.lead="Where money is rotating ("+lab+"s, bar "+ctx.date+"): <b>into</b> "+inn.slice(0,3).map(function(u){ return u.name; }).join(", ")+"; <b>out of</b> "+out.slice(0,3).map(function(u){ return u.name; }).join(", ")+". Rotation here means the last month is better (or worse) than the 3-month pace, with the direction readings and the last 5 days agreeing.";
      res.table={head:head,align:head.map(function(x,i){ return i<2||i===13?"l":"r"; }),hxColor:col,body:inn.map(function(u,k){ return trim(rowOf(u,k)); })};
      res.extra=[{title:"Rotating out (weakest first)",table:{head:head,align:head.map(function(x,i){ return i<2||i===13?"l":"r"; }),hxColor:col,body:out.map(function(u,k){ return trim(rowOf(u,k)); })}}];
      if(!h) res.notes.push("Without the price history only the 5-day return and the direction readings are used.");
      return U2.length; }
    if(spec.mode==="rank"&&spec.both){
      var n2=Math.min(10,Math.floor(U2.length/2)), lead=U2.slice(0,n2), lag=U2.slice(-n2).reverse();
      res.lead="Leading and lagging "+lab+"s over "+WL[win]+" (bar "+ctx.date+"): leading "+lead.slice(0,3).map(function(u){ return u.name+" "+pc(u.v); }).join(", ")+"; lagging "+lag.slice(0,3).map(function(u){ return u.name+" "+pc(u.v); }).join(", ")+".";
      res.table={head:head,align:head.map(function(x,i){ return i<2||i===13?"l":"r"; }),hxColor:col,body:lead.map(function(u,k){ return trim(rowOf(u,k)); })};
      res.extra=[{title:"Lagging (weakest first)",table:{head:head,align:head.map(function(x,i){ return i<2||i===13?"l":"r"; }),hxColor:col,body:lag.map(function(u,k){ return trim(rowOf(u,k)); })}}];
      res.notes.push("Ranked on the "+WL[win]+" equal-weight return, net sentiment and the share improving (average of their percentiles).");
      return U2.length; }
    res.lead=(level==="theme"?"Cross-sector themes":"All "+lab+"s")+" ranked "+(spec.asc?"weakest":"strongest")+" first"+(spec.by==="sent"?" on sentiment (net strengthening and share improving)":" on "+WL[win]+" return, net sentiment and share improving")+", bar "+ctx.date+". "+(spec.asc?"Weakest":"Strongest")+": "+U2.slice(0,3).map(function(u){ return u.name; }).join(", ")+".";
    res.table={head:head,align:head.map(function(x,i){ return i<2||i===13?"l":"r"; }),hxColor:col,body:U2.slice(0,level==="ind"?25:U2.length).map(function(u,k){ return trim(rowOf(u,k)); })};
    if(level==="theme") res.notes.push("Themes are fixed baskets of subsectors that cut across sectors (for example AI power = independent power producers, regulated electric utilities, electrical equipment, industrial machinery, engineering and data-centre REITs). Ask “show me the AI power theme” for its members, “is money rotating from growth into defensives?”, or “build a theme portfolio for AI infrastructure”. For themes found from prices instead, ask “blocks rising together”.");
    return U2.length;
  }
  if(spec.mode==="detail"){
    var th=TH_BY[spec.k], rows=ctx.rows.filter(th.f), st=grpStat(rows);
    rows.sort(function(a,b){ return (b.str||0)-(a.str||0); });
    var inds={}; rows.forEach(function(r){ inds[r.ind]=(inds[r.ind]||0)+1; });
    res.lead="<b>"+hE(th.n)+"</b>: "+st.n+" names across "+Object.keys(inds).length+" subsectors ("+Object.keys(inds).join(", ")+"). Net sentiment "+pc(st.netP,0)+", "+st.imP.toFixed(0)+"% improving; 5D "+pc(st.r5,2)+(h?", 1M "+pc(st.m1)+", 3M "+pc(st.m3)+", YTD "+pc(st.ytd):"")+(bm&&num(st.m1)?" ("+pc(st.m1-bm.m1)+" against "+bench+" over 1M)":"")+". Cohesion (mean 60-bar correlation) "+f2(coh(rows))+". ETF proxy: "+th.etf+".";
    res.table={head:["Symbol","Subsector","Sector","Direction","Strength pct","Convergence","1D","5D","1M","3M","YTD"],align:["l","l","l","l","r","r","r","r","r","r","r"],hxColor:{3:"dir",6:"sign",7:"sign",8:"sign",9:"sign",10:"sign"},
      body:rows.map(function(r){ return [r.sym,r.ind,qmSecName(r.sec),r.dir,num(r.str)?r.str.toFixed(0):"–",num(r.conv)?r.conv+"/6":"–",pc(r.r1,2),pc(r.r5,2),pc(r.m1),pc(r.m3),pc(r.ytd)]; })};
    var subs=Object.keys(inds).map(function(k){ var s2=grpStat(rows.filter(function(r){ return r.ind===k; })); return [k,String(s2.n),pc(s2.netP,0),s2.imP.toFixed(0)+"%",pc(s2.r5,2),pc(s2.m1),pc(s2.m3)]; });
    res.extra=[{title:"By subsector inside the theme",table:{head:["Subsector","Names","Net sentiment","Improving","5D","1M","3M"],align:["l","r","r","r","r","r","r"],hxColor:{2:"sign",4:"sign",5:"sign",6:"sign"},body:subs}}];
    res.notes.push("Sorted by strength percentile. Ask “build a theme portfolio for "+th.n.toLowerCase()+"” for a diversified pick from it.");
    res.send=sendOf(ctx,rows.map(function(r){ return r.sym; }),th.n);
    return rows.length;
  }
  if(spec.mode==="rot2"){
    var g1=gOf(spec.g[0]), g2=gOf(spec.g[1]), s1=grpStat(g1.rows), s2=grpStat(g2.rows);
    var W=[["5 days","r5"],["1 month","m1"],["3 months","m3"],["YTD","ytd"]], body=[], votes=0, n=0;
    W.forEach(function(w){ var a=s1[w[1]], b=s2[w[1]]; if(!num(a)||!num(b)) return; var d=b-a; if(w[1]!=="ytd"){ n++; if(d>0) votes++; } body.push([w[0],pc(a,2),pc(b,2),pc(d,2),d>0?g2.name:g1.name]); });
    body.push(["Net sentiment",pc(s1.netP,0),pc(s2.netP,0),pc(s2.netP-s1.netP,0),s2.netP>s1.netP?g2.name:g1.name]);
    body.push(["Improving share",s1.imP.toFixed(0)+"%",s2.imP.toFixed(0)+"%",pc(s2.imP-s1.imP,0),s2.imP>s1.imP?g2.name:g1.name]);
    var sv=(s2.netP>s1.netP?1:0)+(s2.imP>s1.imP?1:0), short=num(s1.r5)&&num(s2.r5)?s2.r5>s1.r5:null, mid=num(s1.m1)&&num(s2.m1)?s2.m1>s1.m1:null;
    var verdict=(votes===n&&n>0&&sv>=1)?"Yes":((short||mid)&&sv>=1?"Partly / early":((votes===0&&sv===0)?"No":"Mixed"));
    res.lead="Is money rotating from <b>"+hE(g1.name)+"</b> into <b>"+hE(g2.name)+"</b>? <b>"+verdict+"</b>. "+g2.name+" beat "+g1.name+" over "+votes+" of "+n+" windows"+(num(s1.r5)&&num(s2.r5)?" (last 5 days "+pc(s2.r5-s1.r5,2)+")":"")+", and the direction readings favour "+(sv===2?g2.name:(sv===0?g1.name:"neither clearly"))+".";
    res.table={head:["Measure",g1.name,g2.name,"Difference ("+g2.name+" − "+g1.name+")","Favours"],align:["l","r","r","r","l"],hxColor:{3:"sign"},body:body};
    res.notes.push("Equal-weight baskets. Yes = the second group led in every window and at least one direction reading; Partly / early = it leads recently but not over every window. Ask “plot” for a chart of two sectors.");
    return body.length;
  }
  if(spec.mode==="against"){
    var U3=units(spec.level); U3.forEach(function(u){ u.st=grpStat(u.rows); u.sc=mean([u.st.netP/100,u.st.imP/100,num(u.st.m1)?u.st.m1/20:u.st.r5/10]); });
    U3.sort(function(a,b){ return spec.pick==="strong"?a.sc-b.sc:b.sc-a.sc; });
    var grpN=U3.slice(0,spec.level==="ind"?5:3), cand=[]; grpN.forEach(function(u){ u.rows.forEach(function(r){ cand.push({r:r,u:u}); }); });
    cand.sort(function(a,b){ return spec.pick==="strong"?(b.r.str||0)-(a.r.str||0):(a.r.str||0)-(b.r.str||0); }); cand=cand.slice(0,spec.n||10);
    var lab2={theme:"themes",ind:"subsectors",sec:"sectors"}[spec.level];
    res.lead=(spec.pick==="strong"?"The strongest names in the weakest ":"The weakest names in the strongest ")+lab2+" ("+grpN.map(function(u){ return u.name; }).join(", ")+"): names going against their group, bar "+ctx.date+".";
    res.table={head:["Rank","Symbol","Group","Group net sentiment","Strength pct","Direction","Convergence","5D","1M"],align:["r","l","l","r","r","l","r","r","r"],hxColor:{3:"sign",5:"dir",7:"sign",8:"sign"},
      body:cand.map(function(o,k){ return [String(k+1),o.r.sym,o.u.name,pc(o.u.st.netP,0),num(o.r.str)?o.r.str.toFixed(0):"–",o.r.dir,num(o.r.conv)?o.r.conv+"/6":"–",pc(o.r.r5,2),pc(o.r.m1)]; })};
    res.notes.push("Groups ranked on net sentiment, share improving and 1-month return; names ranked on strength percentile. Relative strength inside a weak group can mean leadership, or simply a lag.");
    res.send=sendOf(ctx,cand.map(function(o){ return o.r.sym; }),"against the group");
    return cand.length;
  }
  return 0;
}
/* best name in each group (subsector, sector, theme, Hidden Group, price cluster) */
var _runSmart0=runSmart;
runSmart=function(spec,ctx,res){
  if(spec.mode!=="each") return _runSmart0(spec,ctx,res);
  var G=groups(), key=spec.by, byK={};
  ctx.rows.forEach(function(r){ var k=key==="ind"?r.ind:(key==="sec"?r.sec:(key==="hg"?G.hg[r.sym]:(key==="cl"?G.cl[r.sym]:null))); if(key==="theme"){ THEMES.forEach(function(th){ if(th.f(r)) (byK[th.k]=byK[th.k]||[]).push(r); }); return; } if(k===undefined||k===null) return; (byK[k]=byK[k]||[]).push(r); });
  var list=Object.keys(byK).map(function(k){ var rows=byK[k], st=grpStat(rows), g=key==="ind"?ctx.indStats[k]:null; return {k:k,rows:rows,st:st,bias:g?g.bias:(st.im*2>st.n?"improving":(st.de*2>st.n?"deteriorating":"mixed"))}; }).filter(function(o){ return o.rows.length>=2; });
  if(spec.dir==="rising"||spec.dir==="improving"||spec.dir==="strong") list=list.filter(function(o){ return o.bias==="improving"; });
  if(spec.dir==="falling"||spec.dir==="deteriorating"||spec.dir==="weak") list=list.filter(function(o){ return o.bias==="deteriorating"; });
  var name={ind:"subsector",sec:"sector",theme:"theme",hg:"Hidden Group",cl:"price cluster"}[key];
  if(!list.length){ res.lead="No "+(spec.dir?spec.dir+" ":"")+name+"s on this bar."; return 0; }
  var out=list.map(function(o){ var b=o.rows.slice().sort(function(a,c){ return (c.str||0)-(a.str||0)+((c.conv||0)-(a.conv||0))*5; })[0]; return {o:o,b:b}; }).sort(function(a,c){ return (c.b.str||0)-(a.b.str||0); });
  function gName(o){ return key==="sec"?qmSecName(o.k):(key==="theme"?TH_BY[o.k].n:(key==="hg"?"Hidden Group #"+o.k:(key==="cl"?"Cluster #"+o.k:o.k))); }
  res.lead="The strongest name in each "+(spec.dir?spec.dir+" ":"")+name+" ("+out.length+"), bar "+ctx.date+": ranked by strength percentile, ties broken by signal convergence.";
  res.table={head:["Rank","Symbol",name.charAt(0).toUpperCase()+name.slice(1),"Group improving","Strength pct","Convergence","Direction","5D","1M"],align:["r","l","l","r","r","r","l","r","r"],hxColor:{6:"dir",7:"sign",8:"sign"},
    body:out.map(function(x,k){ return [String(k+1),x.b.sym,gName(x.o),x.o.st.imP.toFixed(0)+"%",num(x.b.str)?x.b.str.toFixed(0):"–",num(x.b.conv)?x.b.conv+"/6":"–",x.b.dir,pc(x.b.r5,2),pc(x.b.m1)]; })};
  if(key==="ind") res.notes.push("Rising subsector = a strict majority of its Early Warning-covered members improving (the page's usual rule).");
  res.send=sendOf(ctx,out.map(function(x){ return x.b.sym; }),"best in each "+name);
  return out.length;
};

/* ---------------- 5b. fold the tab strip ---------------- */
function tabInit(){
  var nav=document.querySelector("nav.tabs[role=tablist]"), grp=document.getElementById("tabGroups"); if(!nav||!grp||document.getElementById("hx98Fold")) return;
  var css=document.createElement("style");
  css.textContent="nav.tabs.hx98col .tab:not([aria-selected=\"true\"]){display:none!important}#hx98Fold{margin-left:auto}#hx98More{background:none;border:0;border-bottom:2px solid transparent;padding:9px 12px;font:inherit;font-size:13px;color:var(--accent);cursor:pointer}nav.tabs:not(.hx98col) #hx98More{display:none}";
  document.head.appendChild(css);
  var b=document.createElement("button"); b.type="button"; b.id="hx98Fold"; b.title="Show or hide the row of tabs (the open tab stays visible)";
  var more=document.createElement("button"); more.type="button"; more.id="hx98More"; more.title="Show all tabs";
  function lsg(){ try{ return localStorage.getItem("alexaligned.tabs.folded")==="1"; }catch(e){ return false; } }
  function set(f){ nav.classList.toggle("hx98col",f); try{ localStorage.setItem("alexaligned.tabs.folded",f?"1":"0"); }catch(e){}
    b.textContent=f?"▾ Show tabs":"▴ Hide tabs"; b.setAttribute("aria-pressed",f?"true":"false"); more.textContent="▾ all tabs"; }
  b.addEventListener("click",function(){ set(!nav.classList.contains("hx98col")); });
  more.addEventListener("click",function(){ set(false); });
  grp.appendChild(b); nav.appendChild(more);
  set(lsg());
  /* keep the button at the end if the groups row is rebuilt */
  if(typeof MutationObserver!=="undefined") new MutationObserver(function(){ if(b.parentNode!==grp||grp.lastChild!==b) grp.appendChild(b); }).observe(grp,{childList:true});
}
tabInit(); setTimeout(function(){ try{ tabInit(); }catch(e){} },0);
}catch(e){ try{ console.warn("v98 layer skipped:",e); }catch(_){} }
})();
