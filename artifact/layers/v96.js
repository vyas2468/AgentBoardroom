/* ================= v96: Alex-style colour-coded sentiment and breadth tables in Ask the terminal =================
   New question kind "htable", reached only by these phrasings (every other question is parsed as before):
     overall  "overall sentiment", "market breadth", "breadth table"      Overall Sentiment + One-Day Breadth (stocks and ETFs)
     etf      "ETF SEW summary", "ETF scores table", "improving ETFs"    equity and non-equity ETF tables: recent score, direction,
                                                                          previous-session score, delta
     sector   "sentiment by sector", "breadth by subsector in Energy"    strengthening / weakening / net, improving / deteriorating,
                                                                          advancing / declining / net, prior day and change
     stock    "SEW summary for Energy", "weakening stocks table in Financials", "strengthening stocks table"
   Tables are the page's normal tables (Copy and CSV work) with Alex's colour coding: green for strengthening, advancing, improving
   and positive numbers; amber for stable/mixed; red for weakening, declining, deteriorating and negative numbers. */
(function(){
try{
var A=window.__hxApi||{};
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function H(){ try{ return A.get?A.get():null; }catch(e){ return null; } }
function sg(v,d){ return num(v)?((v>0?"+":"")+(+v).toFixed(d||0)):"–"; }
var AMBER="#f59e0b";
/* colour-coded version of the page's own table, only for tables that ask for it */
var _qmTableHtml96=qmTableHtml;
qmTableHtml=function(t){
  if(!t||!t.hxColor) return _qmTableHtml96(t);
  function col(kind,c){ var s=String(c);
    if(kind==="pos") return "var(--pos)"; if(kind==="neg") return "var(--neg)";
    if(kind==="sign"){ var v=parseFloat(s.replace(/[^0-9.+\-]/g,"")); return !num(v)||v===0?null:(v>0?"var(--pos)":"var(--neg)"); }
    if(kind==="dir"){ var x=s.toLowerCase(); return /improv|strength|advanc|rising|up\b/.test(x)?"var(--pos)":(/deterior|weak|declin|falling|down\b/.test(x)?"var(--neg)":(/stable|mixed|flat/.test(x)?AMBER:null)); }
    return null; }
  return '<div class="tbl-scroll"><table class="qm-tbl"><thead><tr>'+t.head.map(function(h,i){ return '<th'+(t.align[i]==="r"?' class="num"':'')+'>'+esc(h)+'</th>'; }).join("")+'</tr></thead><tbody>'+
    t.body.map(function(r){ return '<tr>'+r.map(function(c,i){ var k=t.hxColor[i], cc=k?col(k,c):null; var inner=qmCell(t.head[i],c); var st=(t.align[i]==="r"?"":"text-align:left;")+(cc?"color:"+cc+";font-weight:600":""); return '<td'+(t.align[i]==="r"?' class="num"':'')+(st?' style="'+st+'"':'')+'>'+inner+'</td>'; }).join("")+'</tr>'; }).join("")+'</tbody></table></div>';
};

var ETF_NAMES={XLC:"Communication Services Select Sector SPDR",XLY:"Consumer Discretionary Select Sector SPDR",XLP:"Consumer Staples Select Sector SPDR",XLE:"Energy Select Sector SPDR",XLF:"Financial Select Sector SPDR",XLV:"Health Care Select Sector SPDR",XLI:"Industrial Select Sector SPDR",XLK:"Technology Select Sector SPDR",XLB:"Materials Select Sector SPDR",XLRE:"Real Estate Select Sector SPDR",XLU:"Utilities Select Sector SPDR",
  XRT:"SPDR S&P Retail",XHB:"SPDR S&P Homebuilders",XOP:"SPDR S&P Oil & Gas Exploration & Production",OIH:"VanEck Oil Services",KRE:"SPDR S&P Regional Banking",XBI:"SPDR S&P Biotech",ITA:"iShares US Aerospace & Defense",IYT:"iShares Transportation Average",SMH:"VanEck Semiconductor",SOXX:"iShares Semiconductor",XME:"SPDR S&P Metals & Mining",GDX:"VanEck Gold Miners",IYM:"iShares US Basic Materials",IYR:"iShares US Real Estate",ARKK:"ARK Innovation",MAGS:"Roundhill Magnificent Seven",
  VOO:"Vanguard S&P 500",IVV:"iShares Core S&P 500",VTI:"Vanguard Total Stock Market",RSP:"Invesco S&P 500 Equal Weight",DIA:"SPDR Dow Jones Industrial Average",QQQ:"Invesco QQQ Trust",IWM:"iShares Russell 2000",IJH:"iShares Core S&P Mid-Cap",MDY:"SPDR S&P MidCap 400",IJR:"iShares Core S&P Small-Cap",IJS:"iShares S&P Small-Cap 600 Value",
  VUG:"Vanguard Growth",IWF:"iShares Russell 1000 Growth",SPYG:"SPDR Portfolio S&P 500 Growth",MTUM:"iShares MSCI USA Momentum Factor",VTV:"Vanguard Value",IWD:"iShares Russell 1000 Value",SCHD:"Schwab US Dividend Equity",
  VWO:"Vanguard FTSE Emerging Markets",EEM:"iShares MSCI Emerging Markets",IEMG:"iShares Core MSCI Emerging Markets",ACWI:"iShares MSCI ACWI",FXI:"iShares China Large-Cap",EWT:"iShares MSCI Taiwan",
  TLT:"iShares 20+ Year Treasury Bond",HYG:"iShares iBoxx High Yield Corporate Bond",LQD:"iShares iBoxx Investment Grade Corporate Bond",USO:"United States Oil Fund",SPY:"SPDR S&P 500 ETF Trust",VGT:"Vanguard Information Technology",GLD:"SPDR Gold Shares",IAU:"iShares Gold Trust",SLV:"iShares Silver Trust",IEF:"iShares 7-10 Year Treasury Bond",SHY:"iShares 1-3 Year Treasury Bond",BIL:"SPDR Bloomberg 1-3 Month T-Bill",UNG:"United States Natural Gas Fund",IBB:"iShares Biotechnology",QQQM:"Invesco NASDAQ 100",SCHG:"Schwab US Large-Cap Growth",EWJ:"iShares MSCI Japan",EWY:"iShares MSCI South Korea",EZU:"iShares MSCI Eurozone",VT:"Vanguard Total World Stock",OEF:"iShares S&P 100",IOO:"iShares Global 100",IWB:"iShares Russell 1000",ITOT:"iShares Core S&P Total US Stock Market"};

function priorAdvDec(syms){ var h=H(); if(!h) return null; var L=h.dates.length-1, a=0, d=0; syms.forEach(function(s){ var c=h.syms[s]; if(!c) return; var r=A.ret(c,L-1); if(r===null) return; if(r>0) a++; else if(r<0) d++; }); return {adv:a,dec:d,date:h.dates[L-1],cur:h.dates[L]}; }
function priorDateOf(){ var h=H(); return h?h.dates[h.dates.length-2]:""; }

/* ---- parse ---- */
var _qmParseX96=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q), C=QM_CTX||qmBuildCtx(), ii=C?qmIndMentions(t,C):[], ss=qmSecMentions(t).inn;
    var dirF=/\bweaken\w*\b/.test(t)?"weakening":(/\bstrength\w*\b/.test(t)&&!/\bstrengthening and weakening\b/.test(t)?"strengthening":(/\bimprov\w*\b/.test(t)?"improving":(/\bdeteriorat\w*\b/.test(t)?"deteriorating":(/\bstable\b|\bmixed\b/.test(t)?"stable/mixed":null))));
    var nm=t.match(/\b(?:top|first|show|list) (\d{1,3})\b/)||t.match(/\b(\d{1,3}) (?:stocks|names|etfs|rows)\b/), n=nm?Math.max(1,Math.min(200,+nm[1])):0;
    if(/\boverall sentiment\b|\bmarket (?:breadth|sentiment)\b|\bbreadth (?:table|summary|overview)\b|\bsentiment (?:table|summary|overview)\b|\bone[- ]day breadth\b|\badvancing (?:and|vs\.?|versus) declining\b/.test(t)&&!ss.length&&!ii.length&&!/\bby (?:sector|subsector|industry)\b/.test(t))
      return {kind:"htable",mode:"overall"};
    if(/\betfs?\b/.test(t)&&/\bsew\b|\bscores? (?:table|summary)\b|\bsummary\b|\btable\b|\bdirection\b|\b(?:improving|deteriorating|stable|strengthening|weakening) etfs?\b|\betfs? (?:that are )?(?:improving|deteriorating|strengthening|weakening)\b/.test(t))
      return {kind:"htable",mode:"etf",dir:dirF,grp:/\bnon[- ]?equity\b|\bbonds?\b|\bcommodit\w*\b|\brates?\b/.test(t)?"non":(/\bequity\b/.test(t)?"eq":"all"),n:n};
    if(/\b(?:sentiment|breadth|strengthening and weakening|advancing and declining|sew)\b/.test(t)&&/\bby (?:sector|subsector|industry|industries)\b|\bper (?:sector|subsector)\b|\bsector (?:breadth|sentiment)\b|\bsubsector (?:breadth|sentiment)\b/.test(t))
      return {kind:"htable",mode:"sector",level:/\bsub ?sector|\bindustr/.test(t)?"ind":"sec",secIn:ss.map(function(v){ return qmSecKey(v)||v; })};
    if(/\bsew (?:summary|table)\b|\b(?:stock|stocks) sew\b|\b(?:strengthening|weakening|improving|deteriorating) (?:stocks|names) (?:table|summary)\b|\bscores? table\b|\bsew\b/.test(t))
      return {kind:"htable",mode:"stock",dir:dirF,secIn:ss.map(function(v){ return qmSecKey(v)||v; }),ind:ii,n:n};
  }catch(e){}
  return _qmParseX96(q);
};
QMX_KINDS.htable=1;
/* "sentiment" here is the scan's own strengthening / weakening breadth, not news sentiment: drop that one "not applied" note */
try{ var _qmIgn96=qmIgn; qmIgn=function(q){ var a3=_qmIgn96(q); try{ var tt=qmT(q); if(/\boverall sentiment\b|\bmarket (?:breadth|sentiment)\b|\bsentiment (?:table|summary|overview|by)\b|\b(?:sector|subsector) sentiment\b|\bsew\b/.test(tt)) a3=a3.filter(function(x){ return !/sentiment/.test(x); }); }catch(e){} return a3; }; }catch(e){}
var _qmValidateAny96=qmValidateAny;
qmValidateAny=function(raw){ if(!(raw&&raw.kind==="htable")) return _qmValidateAny96(raw); return {spec:JSON.parse(JSON.stringify(raw))}; };
var _qmRunX96=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="htable")) return _qmRunX96(spec,ctx,res,t0);
  function fin(n){ res.cov=qmCovX(ctx,H()?"Prior one-day breadth from the part E price history.":"Load the part E price history for the prior one-day breadth."); res.rows=n; res.qualifying=n; res.ms=Date.now()-t0; return res; }
  function iso(d){ var m=String(d||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if(!m) return String(d||""); var y=m[3].length===2?"20"+m[3]:m[3]; return y+"-"+("0"+m[1]).slice(-2)+"-"+("0"+m[2]).slice(-2); }
  var X=moX(), B=X&&X.breadth, date=iso((typeof U!=="undefined"&&U&&U.date)?U.date:(X&&X.date)||""), pdate=priorDateOf();
  var eki={}; if(X&&X.etfKeys) X.etfKeys.forEach(function(k,i){ eki[k]=i; });
  var etfs=X&&X.etf?X.etf.map(function(a){ return {sym:a[eki.sym],rec:a[eki.rec],prev:a[eki.prev],d:a[eki.d],dir:a[eki.dir]||"",r1:a[eki.r1]}; }):[];
  var by={}; ctx.rows.forEach(function(r){ by[r.sym]=r; });
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  if(spec.mode==="overall"){
    if(!B){ res.lead="The breadth block needs the Unified v4 scan."; return fin(0); }
    var pS=priorAdvDec(ctx.rows.map(function(r){ return r.sym; })), pE=priorAdvDec(etfs.map(function(e){ return e.sym; }));
    res.lead="Overall sentiment and one-day breadth, bar "+date+".";
    res.table={head:["Model","Strengthening","Weakening","Net breadth","Prior breadth","Change","Current cutoff","Prior cutoff"],align:["l","r","r","r","r","r","l","l"],hxColor:{1:"pos",2:"neg",3:"sign",4:"sign",5:"sign"},
      body:[["S&P 500 + Nasdaq-100",String(B.stock.bull),String(B.stock.bear),sg(B.stock.net),sg(B.stock.prior),sg(B.stock.chg),date,pdate||"–"],["ETF",String(B.etf.bull),String(B.etf.bear),sg(B.etf.net),sg(B.etf.prior),sg(B.etf.chg),date,pdate||"–"]]};
    function one(lab,b,p){ var pn=p?p.adv-p.dec:null; return [lab,String(b.adv),String(b.dec),sg(b.net1),sg(pn),num(pn)?sg(b.net1-pn):"–",date,p?p.date:"–"]; }
    res.extra=[{title:"One-Day Breadth",table:{head:["Universe","Advancing","Declining","Net breadth","Prior breadth","Change","Current cutoff","Prior cutoff"],align:["l","r","r","r","r","r","l","l"],hxColor:{1:"pos",2:"neg",3:"sign",4:"sign",5:"sign"},body:[one("S&P 500 + Nasdaq-100",B.stock,pS),one("ETF",B.etf,pE)]}},
      {title:"Direction (Early Warning)",table:{head:["Universe","Improving","Deteriorating","Net","Median score","Scored / total"],align:["l","r","r","r","r","r"],hxColor:{1:"pos",2:"neg",3:"sign",4:"sign"},body:[["S&P 500 + Nasdaq-100",String(B.stock.impr),String(B.stock.det),sg(B.stock.impr-B.stock.det),sg(B.stock.sevMed),B.stock.scored+" / "+B.stock.total],["ETF",String(B.etf.impr),String(B.etf.det),sg(B.etf.impr-B.etf.det),sg(B.etf.sevMed),B.etf.scored+" / "+B.etf.total]]}}];
    res.notes.push("Strengthening / weakening: names whose recent score is above / below zero; net breadth is the difference, prior breadth the same count on the previous scan bar (from the scan). One-day breadth counts names up and down on the day; its prior day comes from the part E history. Ask “sentiment by sector” or “ETF SEW summary” next.");
    return fin(2);
  }
  if(spec.mode==="etf"){
    if(!etfs.length){ res.lead="No ETF rows on this bar (load the Unified v4 scan)."; return fin(0); }
    var list=etfs.filter(function(e){ if(spec.dir==="strengthening") return e.rec>0; if(spec.dir==="weakening") return e.rec<0; if(spec.dir) return e.dir===spec.dir; return true; });
    function isNon(s){ var g=moEtfGroupOf(s); return g==="Bonds and commodities"; }
    function tbl(rows){ rows.sort(function(p,q){ return (num(q.rec)?q.rec:-999)-(num(p.rec)?p.rec:-999); }); if(spec.n) rows=rows.slice(0,spec.n);
      return {head:["Symbol","Full ETF name","Group","Recent score","Direction","Previous-session score","Delta"],align:["l","l","l","r","l","r","r"],hxColor:{3:"sign",4:"dir",5:"sign",6:"sign"},
        body:rows.map(function(e){ return [e.sym,ETF_NAMES[e.sym]||"",moEtfGroupOf(e.sym),sg(e.rec,1),e.dir||"–",sg(e.prev,1),sg(e.d,1)]; })}; }
    var eq=list.filter(function(e){ return !isNon(e.sym); }), non=list.filter(function(e){ return isNon(e.sym); });
    var shownL=spec.grp==="non"?non:(spec.grp==="eq"?eq:list);
    var imp=shownL.filter(function(e){ return e.dir==="improving"; }).length, det=shownL.filter(function(e){ return e.dir==="deteriorating"; }).length;
    res.lead=(spec.grp==="non"?"Non-equity ":(spec.grp==="eq"?"Equity ":""))+"ETF SEW summary, bar "+date+(spec.dir?", "+spec.dir+" only":"")+": "+shownL.length+" ETFs, "+imp+" improving, "+det+" deteriorating, "+(shownL.length-imp-det)+" stable/mixed. Sorted by recent score.";
    if(spec.grp!=="non"){ res.table=tbl(eq); res.drillLead="Equity ETFs: sector, industry, broad market, style and international"; }
    if(spec.grp!=="eq"){ var tn=tbl(non); if(spec.grp==="non") res.table=tn; else res.extra=[{title:"Non-equity ETFs: bonds and commodities",table:tn}]; }
    res.notes.push("Recent score and previous-session score are the scan's SEW score for each ETF on this bar and the one before; delta is the change. Direction is the Early Warning direction. Only the ETFs in the scan are listed (this universe has "+etfs.length+").");
    res.send=null; return fin(list.length);
  }
  if(spec.mode==="sector"){
    var keyOf=spec.level==="ind"?function(r){ return r.ind; }:function(r){ return r.sec; };
    var rows0=ctx.rows.filter(function(r){ return !spec.secIn.length||spec.secIn.indexOf(r.sec)>=0; }), G={};
    rows0.forEach(function(r){ var k=keyOf(r); (G[k]=G[k]||[]).push(r); });
    var h=H(), L=h?h.dates.length-1:0;
    var body=Object.keys(G).map(function(k){ var m=G[k], st=m.filter(function(r){ return num(r.sev)&&r.sev>0; }).length, wk=m.filter(function(r){ return num(r.sev)&&r.sev<0; }).length,
      im=m.filter(function(r){ return r.dir==="improving"; }).length, de=m.filter(function(r){ return r.dir==="deteriorating"; }).length,
      ad=m.filter(function(r){ return num(r.r1)&&r.r1>0; }).length, dc=m.filter(function(r){ return num(r.r1)&&r.r1<0; }).length, pa=null;
      if(h){ var a=0,d=0; m.forEach(function(r){ var c=h.syms[r.sym]; if(!c) return; var x=A.ret(c,L-1); if(x===null) return; if(x>0) a++; else if(x<0) d++; }); pa=a-d; }
      var bias=im*2>m.length?"improving":(de*2>m.length?"deteriorating":"stable/mixed");
      return {k:k,row:[spec.level==="ind"?k+" ("+qmSecName(m[0].sec)+")":qmSecName(k),String(m.length),String(st),String(wk),sg(st-wk),String(im),String(de),bias,String(ad),String(dc),sg(ad-dc),sg(pa),num(pa)?sg(ad-dc-pa):"–"],net:st-wk}; });
    body.sort(function(p,q){ return q.net-p.net; });
    res.lead="Sentiment and breadth by "+(spec.level==="ind"?"subsector":"sector")+(spec.secIn.length?" in "+spec.secIn.map(qmSecName).join(", "):"")+", bar "+date+", strongest net first.";
    res.table={head:[spec.level==="ind"?"Subsector":"Sector","Names","Strengthening","Weakening","Net","Improving","Deteriorating","Direction","Advancing","Declining","Net 1D","Prior 1D","Change"],align:["l","r","r","r","r","r","r","l","r","r","r","r","r"],hxColor:{2:"pos",3:"neg",4:"sign",5:"pos",6:"neg",7:"dir",8:"pos",9:"neg",10:"sign",11:"sign",12:"sign"},body:body.map(function(x){ return x.row; })};
    res.notes.push("Strengthening / weakening: recent score above / below zero. Improving / deteriorating: Early Warning direction; Direction is the majority. Advancing / declining: up or down on the day; the prior day's net comes from the part E history ("+(pdate||"not loaded")+").");
    return fin(body.length);
  }
  if(spec.mode==="stock"){
    var list2=ctx.rows.filter(function(r){ if(spec.ind.length&&spec.ind.indexOf(r.ind)<0) return false; if(!spec.ind.length&&spec.secIn.length&&spec.secIn.indexOf(r.sec)<0) return false;
      if(spec.dir==="strengthening") return num(r.sev)&&r.sev>0; if(spec.dir==="weakening") return num(r.sev)&&r.sev<0; if(spec.dir) return r.dir===spec.dir; return true; });
    list2.sort(function(p,q){ return (num(q.sev)?q.sev:-999)-(num(p.sev)?p.sev:-999); }); if(spec.dir==="weakening") list2.reverse();
    var N=spec.n||60, shown=list2.slice(0,N);
    res.lead="SEW summary of "+list2.length+" stocks"+(spec.ind.length?" in "+spec.ind.join(", "):(spec.secIn.length?" in "+spec.secIn.map(qmSecName).join(", "):""))+(spec.dir?", "+spec.dir:"")+", bar "+date+(list2.length>N?"; the first "+N+" shown":"")+".";
    res.table={head:["Symbol","Sector","Subsector","Recent score","Direction","Score 3 bars ago","Change (3 bars)","1D return","5D return"],align:["l","l","l","r","l","r","r","r","r"],hxColor:{3:"sign",4:"dir",5:"sign",6:"sign",7:"sign",8:"sign"},
      body:shown.map(function(r){ var c3=num(r.c3)?r.c3:null; return [r.sym,qmSecName(r.sec),r.ind,sg(r.sev,0),r.dir||"–",num(c3)&&num(r.sev)?sg(r.sev-c3,0):"–",sg(c3,0),num(r.r1)?sg(r.r1,2)+"%":"–",num(r.r5)?sg(r.r5,2)+"%":"–"]; })};
    res.notes.push("Recent score is each stock's SEW score on this bar; the scan carries its 3-bar change, so the comparison column is 3 bars back (the ETF table has the true previous session). Direction is the Early Warning direction.");
    res.send=send(shown.map(function(r){ return r.sym; }),"SEW table"); return fin(shown.length);
  }
  return fin(0);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Colour-coded tables: {\"kind\":\"htable\",\"mode\":\"overall\"|\"etf\"|\"sector\"|\"stock\",\"dir\":\"strengthening\"|\"weakening\"|\"improving\"|\"deteriorating\"|\"stable/mixed\"|null,\"level\":\"sec\"|\"ind\",\"secIn\":[...],\"ind\":[...],\"grp\":\"all\"|\"eq\"|\"non\",\"n\":number}\n\nQ: "); }catch(e){}
}catch(e){ try{ console.warn("v96 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
