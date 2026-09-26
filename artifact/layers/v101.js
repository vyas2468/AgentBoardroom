/* ================= v101: three new chart types, and tools for "these" (the previous answer) or a named list =================
   New question kind "hx101", reached only by these phrasings (every other question is parsed as before):
     charts  "risk return scatter of these", "scatter of strength vs risk for Energy"      quadrant scatter over the universe
             "treemap of the market", "market map of these coloured by 1 month"          sector treemap sized by turnover
             "scorecard of these", "compare these", "factor grid of AAPL MSFT NVDA"      colour-coded factor grid
     lists   "breadth for these", "sentiment for AAPL MSFT NVDA"                         breadth table of the list
             "rank these by risk", "re-rank these by 3 month return"                     the list, re-ordered
             "exit check on these", "which of these should I exit"                       HOLD / WATCH / EXIT with reasons
             "exposure of these", "sector breakdown of these"                            sector weights against the universe
             "relative strength leaderboard of these / of Energy"                        returns against the benchmark
   Every chart is an SVG inside the answer (dots and boxes open tear sheets; Save as PNG works). */
(function(){
try{
var A=window.__hxApi||{};
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function H(){ try{ return A.get?A.get():null; }catch(e){ return null; } }
function ctxNow(){ try{ return QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){ return null; } }
function sg(v,d){ return num(v)?((v>0?"+":"")+(+v).toFixed(d===undefined?1:d)):"\u2013"; }
function f0(v,d){ return num(v)?(+v).toFixed(d||0):"\u2013"; }
var FOLLOW=/\b(these|them|those|this list|that list|the list|this portfolio|that portfolio|the portfolio|the basket|this basket|that basket|the names above|the above)\b/;
var SECCOL=["#3b82f6","#f59e0b","#10b981","#ef4444","#a855f7","#06b6d4","#84cc16","#f97316","#ec4899","#14b8a6","#eab308","#8b5cf6"];
function secCol(C){ var ks=[]; C.rows.forEach(function(r){ if(ks.indexOf(r.sec)<0) ks.push(r.sec); }); ks.sort(); return function(sec){ return SECCOL[Math.max(0,ks.indexOf(sec))%SECCOL.length]; }; }
function pctOf(rows,f){ var v=rows.map(function(r){ return r[f]; }).filter(num).sort(function(a,b){ return a-b; }); return function(x){ if(!num(x)||v.length<2) return null; var lo=0,hi=v.length; while(lo<hi){ var m=(lo+hi)>>1; if(v[m]<x) lo=m+1; else hi=m; } return lo/(v.length-1); }; }
function lab(f){ return (QM_SYM[f]&&QM_SYM[f].lab)||f; }
function isPct(f){ return /^(?:r1|r3|r5|r10|m1|m3|m6|m12|ytd|dd12|ddy|vol12|voly|dspd|b1u|b1l|fastd)$/.test(f); }
function fmtF(f,v){ if(!num(v)) return "\u2013"; if(f==="vol12"||f==="voly") return (+v).toFixed(1)+"%"; if(isPct(f)) return sg(v,2)+"%"; var d=QM_SYM[f]?QM_SYM[f].d:1; return (+v).toFixed(d===undefined?1:d); }
/* diverging colour: t in [-1,1], red - neutral - green */
function mix(a,b,t){ var pa=[parseInt(a.slice(1,3),16),parseInt(a.slice(3,5),16),parseInt(a.slice(5,7),16)], pb=[parseInt(b.slice(1,3),16),parseInt(b.slice(3,5),16),parseInt(b.slice(5,7),16)]; return "#"+pa.map(function(x,i){ return ("0"+Math.round(x+(pb[i]-x)*t).toString(16)).slice(-2); }).join(""); }
function divCol(t){ if(!num(t)) return "#52525b"; t=Math.max(-1,Math.min(1,t)); return t>=0?mix("#4b5563","#16a34a",t):mix("#4b5563","#dc2626",-t); }
function wrap(svg){ return '<div class="chart-scroll hx94plot" style="margin:8px 0">'+svg+'</div>'; }

/* ---- which names the question is about ---- */
function target(q,t,C,allowAll){
  var tk=[]; try{ tk=(A.tickers?A.tickers(q):[]).filter(function(x){ return !new RegExp("\\b"+x.toLowerCase().replace(/[.\-]/g,"\\$&")+" sector\\b").test(t); }); }catch(e){ tk=[]; }
  var stk=tk.filter(function(s){ return C.bySym[s]; }), last=null; try{ last=A.last?A.last():null; }catch(e){ last=null; }
  if(stk.length) return {syms:stk,from:"named",label:stk.length<=6?stk.join(", "):stk.length+" named stocks",skipped:tk.filter(function(s){ return !C.bySym[s]; })};
  if(FOLLOW.test(t)&&last&&last.syms&&last.syms.length){ var ls=last.syms.filter(function(s,i,a){ return C.bySym[s]&&a.indexOf(s)===i; }); return {syms:ls,from:"last",label:"the previous answer's "+ls.length+" names",skipped:last.syms.filter(function(s){ return !C.bySym[s]; })}; }
  var ii=qmIndMentions(t,C); if(ii.length) return {syms:C.rows.filter(function(r){ return ii.indexOf(r.ind)>=0; }).map(function(r){ return r.sym; }),from:"group",label:ii.join(", "),skipped:[]};
  var ss=qmSecMentions(t).inn; if(ss.length){ var ks=ss.map(function(v){ return qmSecKey(v)||v; }); return {syms:C.rows.filter(function(r){ return ks.indexOf(r.sec)>=0; }).map(function(r){ return r.sym; }),from:"group",label:ks.map(qmSecName).join(", "),skipped:[]}; }
  if(allowAll) return {syms:C.rows.map(function(r){ return r.sym; }),from:"all",label:"the whole universe",skipped:[]};
  return null;
}
function isList(tg){ return tg&&(tg.from==="named"||tg.from==="last"); }
function horizon(t){ return /\bytd\b|\byear[- ]to[- ]date\b/.test(t)?"ytd":(/\b(?:12|twelve)[- ]?months?\b|\b1 ?y(?:ear)?\b|\bone year\b/.test(t)?"m12":(/\b(?:6|six)[- ]?months?\b/.test(t)?"m6":(/\b(?:3|three)[- ]?months?\b|\bquarter\b/.test(t)?"m3":(/\b(?:1|one)[- ]?months?\b|\bmonth\b/.test(t)?"m1":(/\b(?:5|five)[- ]?days?\b|\bweek\b/.test(t)?"r5":(/\b(?:10|ten)[- ]?days?\b/.test(t)?"r10":(/\btoday\b|\b1 ?d(?:ay)?\b|\bone day\b|\bdaily\b/.test(t)?"r1":null)))))));
}
function fieldOf(w){ var hz=horizon(w); if(hz&&/\breturns?\b|\bperformance\b|\bmove\b|\bgains?\b/.test(w)) return hz;
  if(/\bconvergence\b|\blenses\b/.test(w)) return "conv"; if(/\bbeta\b/.test(w)) return "beta"; if(/\bdraw ?downs?\b/.test(w)) return "dd12"; if(/\bmomentum\b/.test(w)) return H()?"m3":"str";
  if(/\bvolatil\w*\b/.test(w)&&H()) return "vol12";
  try{ var rk=qmRankX(w); if(rk&&QM_SYM[rk.f]&&rk.f!=="_nb") return rk.f; }catch(e){}
  return hz; }

/* ---- parse ---- */
var _qmParseX101=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q), C=ctxNow(); if(!C) return _qmParseX101(q);
    var SCAT=/\bscatter(?:plot)?\b|\bbubble (?:chart|plot)\b|\bquadrant (?:chart|plot|map|view)\b|\brisk[- ](?:vs\.? |versus |and |\/ ?)?(?:return|reward|strength)\b(?= (?:chart|plot|map|graph|view)\b)/;
    var TREE=/\btree ?map\b|\bmarket map\b|\bheat ?map of (?:the )?(?:market|these|those|them|stocks|sectors?|the universe)\b/;
    var SC=/\bscore ?cards?\b|\bheat ?grid\b|\bfactor (?:grid|heat ?map|table|profile)\b|\bcompare (?:these|them|those)\b|\bcomparison (?:grid|chart|table)\b|\bside[- ]by[- ]side\b/;
    if(!/\bcorrelat\w*\b/.test(t)){
      if(SCAT.test(t)){ var tg=target(q,t,C,true); var ax=null, vs=t.match(/\b(?:of |for |showing |plot )?([a-z0-9 ]{2,40}?) (?:vs\.?|versus|against) ([a-z0-9 ]{2,40}?)(?: (?:of|for|in|on|scatter|chart|plot)\b|$)/);
        if(vs){ var fy=fieldOf(vs[1]), fx=fieldOf(vs[2]); if(fy&&fx&&fy!==fx) ax={y:fy,x:fx}; }
        if(!ax) ax=/\breturns?\b|\breward\b|\bperformance\b/.test(t)?{y:horizon(t)||(H()?"m3":"r10"),x:H()?"vol12":"volp"}:{y:"str",x:"risk"};
        return {kind:"hx101",mode:"scatter",syms:tg.syms,from:tg.from,label:tg.label,skipped:tg.skipped,x:ax.x,y:ax.y}; }
      if(TREE.test(t)){ var tg2=target(q,t,C,true), cm=t.match(/\b(?:colou?r(?:ed|s)?|shaded?) by ([a-z0-9 ]+)/), cf=cm?fieldOf(cm[1]):null;
        if(!cf) cf=horizon(t)||(/\bstrength\b/.test(t)?"str":(/\bdirection\b|\bearly warning\b/.test(t)?"dirn":"r1"));
        return {kind:"hx101",mode:"tree",syms:tg2.syms,from:tg2.from,label:tg2.label,skipped:tg2.skipped,color:cf,size:/\bequal(?:ly)?(?:[- ]weight\w*| size\w*)?\b/.test(t)?"eq":"tov"}; }
      if(SC.test(t)){ var tg3=target(q,t,C,false); if(tg3) return {kind:"hx101",mode:"score",syms:tg3.syms,from:tg3.from,label:tg3.label,skipped:tg3.skipped}; }
    }
    var tl=target(q,t,C,false);
    /* rolling correlation of one or many tickers / sectors / subsectors / "these" against a reference (pairs stay with the existing chart) */
    if(/\brolling correlations?\b|\brolling corr\b|\bcorrelation over time\b/.test(t)){
      var tkR=[]; try{ tkR=A.tickers(q).filter(function(x){ return C.bySym[x]&&!new RegExp("\\b"+x.toLowerCase()+" sector\\b").test(t); }); }catch(e){}
      var refT=null, rm=String(q).match(/\b(?:to|vs\.?|versus|against|with) ([A-Z][A-Z0-9.\-]{0,5})\s*(?:over|in|during|for|$|[?.!,])/);
      if(rm&&tkR.indexOf(rm[1])>=0&&rm[1]!=="RSP"&&rm[1]!=="SPY"){ refT=rm[1]; tkR=tkR.filter(function(x){ return x!==refT; }); }
      var refS=/\b(?:to|vs\.?|versus|against|with) (?:its|their|each name's|own|the) ?(?:own )?sectors?(?: baskets?)?\b/.test(t), refB=/\b(?:to|vs\.?|versus|against|with) (?:the )?(?:rsp|spy|market|benchmark|index|s&p)\b/.test(t);
      var iiR=qmIndMentions(t,C), ssR=(qmSecMentions(t).inn||[]).map(function(v){ return qmSecKey(v)||v; }), lastR=null; try{ lastR=A.last?A.last():null; }catch(e){}
      var TG=[]; tkR.forEach(function(x){ TG.push({t:"sym",v:x}); }); iiR.forEach(function(x){ TG.push({t:"ind",v:x}); }); if(!iiR.length||refS) ssR.forEach(function(x){ if(!refS||!TG.length) TG.push({t:"sec",v:x}); });
      if(!TG.length&&FOLLOW.test(t)&&lastR&&lastR.syms) lastR.syms.filter(function(x){ return C.bySym[x]; }).slice(0,12).forEach(function(x){ TG.push({t:"sym",v:x}); });
      var explicit=refT||refS||refB;
      if(TG.length&&(TG.length===1||TG.length>=3||explicit||FOLLOW.test(t)))
        return {kind:"hx101",mode:"rcor",tg:TG.slice(0,12),ref:refT?{t:"sym",v:refT}:(refS?{t:"own"}:{t:"bench"}),w:/\b(?:20|21) (?:bars|days)\b|\b1 month\b/.test(t)?21:(/\b(?:126) (?:bars|days)\b|\b6 months?\b/.test(t)?126:(/\b(?:252) (?:bars|days)\b|\b12 months?\b|\b1 year\b/.test(t)?252:63)),syms:TG.filter(function(g){ return g.t==="sym"; }).map(function(g){ return g.v; }).concat(["__x"]).filter(function(x){ return x!=="__x"||true; }),label:""};
    }
    var WIN=/\b(?:60|63) (?:bars|days)\b|\b3 months?\b|\bquarter\b/.test(t)?63:(/\b126 (?:bars|days)\b|\b6 months?\b/.test(t)?126:252);
    /* spread of a whole list against its equal-weight basket; "spread of NVDA vs these" */
    if(/\bspreads?\b|\bstretched\b/.test(t)){
      var lastS=null; try{ lastS=A.last?A.last():null; }catch(e){}
      var tkS=[]; try{ tkS=A.tickers(q).filter(function(x){ return C.bySym[x]; }); }catch(e){}
      var vsL=/\b(?:vs\.?|versus|against|to|relative to) (?:these|them|those|the basket|the list|their basket|this list|the rest)\b/.test(t)&&lastS&&lastS.syms&&lastS.syms.length>=2;
      if(vsL&&tkS.length===1) return {kind:"hx101",mode:"spread",syms:lastS.syms.filter(function(x){ return C.bySym[x]; }),focus:tkS[0],from:"last",label:"the previous answer's names",skipped:[],win:WIN};
      if(tl&&(isList(tl)&&tl.syms.length>=3||tl.from==="group"&&tl.syms.length>=3)&&(tl.from!=="named"||tkS.length>=3)) return {kind:"hx101",mode:"spread",syms:tl.syms.slice(0,60),from:tl.from,label:tl.label,skipped:tl.skipped,win:WIN};
    }
    /* relative strength against each name's own sector basket */
    if(tl&&/\brelative strength\b|\brs\b|\boutperform\w*\b|\bleaders?\b/.test(t)&&/\b(?:vs\.?|versus|against|relative to|compared (?:to|with)|within|inside) (?:their |its |the |each name's |own )*(?:own )?(?:sectors?|sector baskets?|sector peers|peers)\b/.test(t))
      return {kind:"hx101",mode:"rsec",syms:tl.syms.slice(0,80),from:tl.from,label:tl.label,skipped:tl.skipped,win:WIN};
    if(tl&&(isList(tl)||tl.from==="group")){
      if(/\brelative strength (?:leaderboard|ranking|rankings|table|league)\b|\brs (?:leaderboard|ranking|table)\b|\bleaderboard\b/.test(t)) return {kind:"hx101",mode:"rsl",syms:tl.syms,from:tl.from,label:tl.label,skipped:tl.skipped,n:(t.match(/\btop (\d{1,2})\b/)||[])[1]||0};
    }
    if(isList(tl)&&tl.syms.length){
      var T0={syms:tl.syms,from:tl.from,label:tl.label,skipped:tl.skipped};
      if(/\b(?:breadth|sentiment)\b/.test(t)) return Object.assign({kind:"hx101",mode:"breadth",level:/\bsub ?-?sectors?\b|\bindustr\w*\b/.test(t)?"ind":"sec"},T0);
      if(/\bexit (?:check|review|signals?|scan|list)\b|\b(?:hold|keep) or (?:sell|exit|cut|fold)\b|\b(?:sell|exit|cut) or (?:hold|keep)\b|\bwhich (?:of (?:these|them|those) )?(?:should|to|would) (?:i |we )?(?:exit|sell|cut|drop|trim)\b|\bshould (?:i|we) (?:still )?(?:hold|exit|sell|keep)\b|\bstill (?:hold|holding|valid|in (?:an )?up ?trend)\b|\bhealth check\b/.test(t)) return Object.assign({kind:"hx101",mode:"exit"},T0);
      if(/\bexposures?\b|\bsector (?:mix|breakdown|split|allocation|weights?|concentration)\b|\b(?:breakdown|allocation|concentration) (?:of|for|by)\b|\bhow (?:concentrated|diversified)\b/.test(t)) return Object.assign({kind:"hx101",mode:"expo"},T0);
      var rr=t.match(/\b(?:re-?rank|rank|sort|order|reorder|re-?order)(?:ed)? (?:these|them|those|the list|this list|the names above|the basket|the portfolio)(?: again)? (?:by|on|using|for) ([a-z0-9 \-]+)/);
      if(rr){ var ff=fieldOf(rr[1]); if(ff){ var asc=/\b(?:least|lowest|smallest|weakest|worst|bottom|ascending|calmest|lower)\b/.test(rr[1]); if(/^(?:risk|vol|volp|vol12|beta)$/.test(ff)&&!/\b(?:most|highest|riskiest|descending)\b/.test(rr[1])) asc=true; return Object.assign({kind:"hx101",mode:"rank",f:ff,d:asc?"asc":"desc"},T0); } }
    }
  }catch(e){}
  return _qmParseX101(q);
};
QMX_KINDS.hx101=1;
var _qmValidateAny101=qmValidateAny;
qmValidateAny=function(raw){ if(!(raw&&raw.kind==="hx101")) return _qmValidateAny101(raw); return {spec:JSON.parse(JSON.stringify(raw))}; };

/* status colours on the exit table: a plain-text cell gets its colour after the table is built */
var _qmTableHtml101=qmTableHtml;
qmTableHtml=function(t){ var h=_qmTableHtml101(t); try{ if(t&&t.hx101st){ h=h.replace(/>(HOLD|WATCH|EXIT)<\/td>/g,function(m,w){ return '><b style="color:'+(w==="HOLD"?"var(--pos)":(w==="EXIT"?"var(--neg)":"#f59e0b"))+'">'+w+'</b></td>'; }); } }catch(e){} return h; };

/* ---- charts ---- */
function scatterSvg(C,syms,fx,fy,title,colS){
  var W=940,Hh=580,ml=62,mr=150,mt=34,mb=48,pw=W-ml-mr,ph=Hh-mt-mb, all=C.rows.filter(function(r){ return num(r[fx])&&num(r[fy]); });
  if(!all.length) return "";
  function ext(f){ var v=all.map(function(r){ return r[f]; }).sort(function(a,b){ return a-b; }); var lo=v[Math.floor(v.length*0.01)], hi=v[Math.ceil(v.length*0.99)-1]; if(syms.length<all.length*0.9) syms.forEach(function(s){ var r=C.bySym[s]; if(r&&num(r[f])){ lo=Math.min(lo,r[f]); hi=Math.max(hi,r[f]); } }); if(hi===lo){ hi+=1; lo-=1; } var pad=(hi-lo)*0.04; return [lo-pad,hi+pad]; }
  var ex=ext(fx), ey=ext(fy); function X(v){ return ml+(Math.max(ex[0],Math.min(ex[1],v))-ex[0])/(ex[1]-ex[0])*pw; } function Y(v){ return mt+ph-(Math.max(ey[0],Math.min(ey[1],v))-ey[0])/(ey[1]-ey[0])*ph; }
  function med(f){ var v=all.map(function(r){ return r[f]; }).sort(function(a,b){ return a-b; }); return v[Math.floor(v.length/2)]; }
  var mx=med(fx), my=isPct(fy)&&ey[0]<0&&ey[1]>0?0:med(fy);
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:1000px;display:block;background:var(--surface)">','<text x="12" y="20" font-size="13" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  for(var g=0;g<=4;g++){ var gx=ex[0]+(ex[1]-ex[0])*g/4, gy=ey[0]+(ey[1]-ey[0])*g/4;
    s.push('<line x1="'+X(gx).toFixed(1)+'" y1="'+mt+'" x2="'+X(gx).toFixed(1)+'" y2="'+(mt+ph)+'" stroke="var(--line)" stroke-width="0.6"/><text x="'+X(gx).toFixed(1)+'" y="'+(mt+ph+14)+'" font-size="10" text-anchor="middle" fill="var(--ink-3)">'+hE(fmtF(fx,gx))+'</text>');
    s.push('<line x1="'+ml+'" y1="'+Y(gy).toFixed(1)+'" x2="'+(ml+pw)+'" y2="'+Y(gy).toFixed(1)+'" stroke="var(--line)" stroke-width="0.6"/><text x="'+(ml-6)+'" y="'+(Y(gy)+3).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--ink-3)">'+hE(fmtF(fy,gy))+'</text>'); }
  s.push('<line x1="'+X(mx).toFixed(1)+'" y1="'+mt+'" x2="'+X(mx).toFixed(1)+'" y2="'+(mt+ph)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/><line x1="'+ml+'" y1="'+Y(my).toFixed(1)+'" x2="'+(ml+pw)+'" y2="'+Y(my).toFixed(1)+'" stroke="var(--ink-3)" stroke-dasharray="4 3"/>');
  var lowGood=/^(?:risk|vol|volp|vol12|voly|beta)$/.test(fx);
  var qn=[["high "+lab(fy).toLowerCase().split(" (")[0]+", "+(lowGood?"low ":"low ")+lab(fx).toLowerCase().split(" (")[0],ml+6,mt+14,"start"],["high / high",ml+pw-6,mt+14,"end"],["low / low",ml+6,mt+ph-6,"start"],["low "+lab(fy).toLowerCase().split(" (")[0]+", high "+lab(fx).toLowerCase().split(" (")[0],ml+pw-6,mt+ph-6,"end"]];
  qn.forEach(function(x){ s.push('<text x="'+x[1]+'" y="'+x[2]+'" font-size="10.5" font-weight="700" text-anchor="'+x[3]+'" fill="var(--ink-3)" opacity=".85">'+hE(x[0])+'</text>'); });
  var inSet={}; syms.forEach(function(x){ inSet[x]=1; }); var full=syms.length>=all.length*0.9;
  all.forEach(function(r){ if(inSet[r.sym]&&!full) return; s.push('<circle data-tear="'+hE(r.sym)+'" cx="'+X(r[fx]).toFixed(1)+'" cy="'+Y(r[fy]).toFixed(1)+'" r="'+(full?3.4:2.6)+'" fill="'+(full?colS(r.sec):"var(--ink-3)")+'" opacity="'+(full?0.75:0.28)+'" style="cursor:pointer"><title>'+hE(r.sym+": "+fmtF(fx,r[fx])+", "+fmtF(fy,r[fy]))+'</title></circle>'); });
  if(!full){ var pts=syms.map(function(x){ return C.bySym[x]; }).filter(function(r){ return r&&num(r[fx])&&num(r[fy]); }), showLab=pts.length<=60;
    pts.forEach(function(r){ var cx=X(r[fx]), cy=Y(r[fy]); s.push('<circle data-tear="'+hE(r.sym)+'" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="6" fill="'+colS(r.sec)+'" stroke="var(--surface)" stroke-width="1.2" style="cursor:pointer"><title>'+hE(r.sym+" \u2013 "+qmSecName(r.sec)+": "+lab(fx)+" "+fmtF(fx,r[fx])+", "+lab(fy)+" "+fmtF(fy,r[fy]))+'</title></circle>'+(showLab?'<text data-tear="'+hE(r.sym)+'" x="'+(cx+8).toFixed(1)+'" y="'+(cy+3.5).toFixed(1)+'" font-size="10" font-weight="700" fill="var(--ink)" style="cursor:pointer">'+hE(r.sym)+'</text>':'')); }); }
  s.push('<text x="'+(ml+pw/2)+'" y="'+(Hh-10)+'" font-size="11.5" text-anchor="middle" fill="var(--ink-2)">'+hE(lab(fx))+' \u2192</text><text transform="translate(14 '+(mt+ph/2)+') rotate(-90)" font-size="11.5" text-anchor="middle" fill="var(--ink-2)">'+hE(lab(fy))+' \u2192</text>');
  var secs={}; (full?all:syms.map(function(x){ return C.bySym[x]; }).filter(Boolean)).forEach(function(r){ secs[r.sec]=1; }); var ly=mt+6;
  Object.keys(secs).sort().forEach(function(k){ s.push('<circle cx="'+(W-mr+14)+'" cy="'+ly+'" r="5" fill="'+colS(k)+'"/><text x="'+(W-mr+24)+'" y="'+(ly+4)+'" font-size="10.5" fill="var(--ink-2)">'+hE(qmSecName(k))+'</text>'); ly+=16; });
  if(!full){ s.push('<circle cx="'+(W-mr+14)+'" cy="'+(ly+4)+'" r="3" fill="var(--ink-3)" opacity=".4"/><text x="'+(W-mr+24)+'" y="'+(ly+8)+'" font-size="10.5" fill="var(--ink-3)">rest of the universe</text>'); }
  s.push('</svg>'); return wrap(s.join(""));
}
function squarify(items,x,y,w,h){
  var out=[], tot=0; items.forEach(function(i){ tot+=i.v; }); if(!(tot>0)||w<=0||h<=0) return out;
  var sc=w*h/tot, rest=items.map(function(i){ return {it:i,a:i.v*sc}; });
  function worst(row,sh){ var s=0,mx=0,mn=Infinity; row.forEach(function(r){ s+=r.a; if(r.a>mx) mx=r.a; if(r.a<mn) mn=r.a; }); return Math.max(sh*sh*mx/(s*s),s*s/(sh*sh*mn)); }
  while(rest.length){ var sh=Math.min(w,h), row=[], wv=Infinity, i=0;
    while(i<rest.length){ var cand=row.concat([rest[i]]), nw=worst(cand,sh); if(row.length&&nw>wv) break; row=cand; wv=nw; i++; }
    var ra=0; row.forEach(function(r){ ra+=r.a; }); var th=ra/sh;
    if(w>=h){ var yy=y; row.forEach(function(r){ var hh=r.a/th; out.push({it:r.it,x:x,y:yy,w:th,h:hh}); yy+=hh; }); x+=th; w-=th; }
    else{ var xx=x; row.forEach(function(r){ var ww=r.a/th; out.push({it:r.it,x:xx,y:y,w:ww,h:th}); xx+=ww; }); y+=th; h-=th; }
    rest=rest.slice(i); }
  return out;
}
var TREE_RANGE={r1:3,r3:5,r5:6,r10:8,m1:12,m3:20,m6:30,m12:40,ytd:30,dspd:10};
function treeColor(C,f){
  if(f==="dirn") return {t:function(r){ return r.dir==="improving"?0.8:(r.dir==="deteriorating"?-0.8:0); },lab:"Early Warning direction (green improving, red deteriorating, grey stable)"};
  if(TREE_RANGE[f]) return {t:function(r){ return num(r[f])?r[f]/TREE_RANGE[f]:null; },lab:lab(f)+" (full colour at \u00B1"+TREE_RANGE[f]+"%)"};
  var p=pctOf(C.rows,f), inv=/^(?:risk|vol|volp|vol12|voly|beta)$/.test(f);
  return {t:function(r){ var v=p(r[f]); return num(v)?(inv?0.5-v:v-0.5)*2:null; },lab:lab(f)+" as a universe percentile"+(inv?" (green = lower)":"")};
}
function treeSvg(C,syms,f,size,title){
  var W=1000,Hh=620, set={}; syms.forEach(function(s){ set[s]=1; });
  var rows=C.rows.filter(function(r){ return set[r.sym]; }), col=treeColor(C,f);
  function sz(r){ return size==="eq"?1:(num(r.tov)&&r.tov>0?Math.sqrt(r.tov):1); }
  var G={}; rows.forEach(function(r){ (G[r.sec]=G[r.sec]||[]).push(r); });
  var secs=Object.keys(G).map(function(k){ var v=0; G[k].forEach(function(r){ v+=sz(r); }); return {k:k,v:v}; }).sort(function(a,b){ return b.v-a.v; });
  var s=['<svg viewBox="0 0 '+W+' '+(Hh+44)+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:1100px;display:block;background:var(--surface)">','<text x="8" y="18" font-size="13" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  squarify(secs,4,26,W-8,Hh).forEach(function(b){ var k=b.it.k;
    s.push('<rect x="'+b.x.toFixed(1)+'" y="'+b.y.toFixed(1)+'" width="'+b.w.toFixed(1)+'" height="'+b.h.toFixed(1)+'" fill="var(--panel)" stroke="var(--surface)" stroke-width="2"/>');
    var hd=b.h>40&&b.w>50?15:0; if(hd) s.push('<text x="'+(b.x+4).toFixed(1)+'" y="'+(b.y+11).toFixed(1)+'" font-size="10.5" font-weight="700" fill="var(--ink-2)">'+hE(qmSecName(k).slice(0,Math.floor(b.w/6.5)))+'</text>');
    var it=G[k].map(function(r){ return {r:r,v:sz(r)}; }).sort(function(a,c){ return c.v-a.v; });
    squarify(it,b.x+1,b.y+hd+1,b.w-2,b.h-hd-2).forEach(function(c){ var r=c.it.r, tv=col.t(r), fs=Math.max(0,Math.min(16,Math.min(c.w/(r.sym.length*0.68),c.h/2.1)));
      var val=f==="dirn"?(r.dir||""):fmtF(f,r[f]);
      s.push('<g data-tear="'+hE(r.sym)+'" style="cursor:pointer"><rect x="'+c.x.toFixed(1)+'" y="'+c.y.toFixed(1)+'" width="'+Math.max(0,c.w-1).toFixed(1)+'" height="'+Math.max(0,c.h-1).toFixed(1)+'" fill="'+divCol(tv)+'"><title>'+hE(r.sym+" \u2013 "+r.ind+": "+(f==="dirn"?r.dir:lab(f)+" "+val))+'</title></rect>'+
        (fs>=6?'<text x="'+(c.x+c.w/2).toFixed(1)+'" y="'+(c.y+c.h/2+(fs>=9&&c.h>fs*2.4?-1:fs*0.35)).toFixed(1)+'" font-size="'+fs.toFixed(1)+'" font-weight="700" text-anchor="middle" fill="#fff" pointer-events="none">'+hE(r.sym)+'</text>':'')+
        (fs>=9&&c.h>fs*2.4?'<text x="'+(c.x+c.w/2).toFixed(1)+'" y="'+(c.y+c.h/2+fs*0.95).toFixed(1)+'" font-size="'+(fs*0.62).toFixed(1)+'" text-anchor="middle" fill="#fff" opacity=".9" pointer-events="none">'+hE(val)+'</text>':'')+'</g>'); }); });
  var lx=8, ly=Hh+40; [-1,-0.5,0,0.5,1].forEach(function(v,i){ s.push('<rect x="'+(lx+i*34)+'" y="'+(ly-11)+'" width="32" height="12" fill="'+divCol(v)+'"/>'); });
  s.push('<text x="'+(lx+178)+'" y="'+ly+'" font-size="10.5" fill="var(--ink-2)">Colour: '+hE(col.lab)+'. Box size: '+(size==="eq"?"equal":"20-day turnover (square root)")+'. Click a box for its tear sheet.</text></svg>');
  return wrap(s.join(""));
}
/* scorecard metrics: [field, header, good direction] */
var SCM=[["str","Strength",1],["risk","Risk",-1],["conv","Converg.",1],["sev","SEW score",1],["tb","Trend age",0],["atr","vs trend (ATR)",1],["dspd","vs RMESA %",1],["r1","1D %",1],["r5","5D %",1],["m1","1M %",1],["m3","3M %",1],["ytd","YTD %",1],["dd12","12M max DD %",1],["beta","Beta",-1],["liq","Liquidity",1]];
function scoreData(C,syms){
  var cols=SCM.filter(function(m){ return syms.some(function(s){ var r=C.bySym[s]; return r&&num(r[m[0]]); }); }), P={};
  cols.forEach(function(m){ P[m[0]]=pctOf(C.rows,m[0]); });
  var rows=syms.map(function(s){ var r=C.bySym[s]; if(!r) return null; var sc=0,k=0, cells=cols.map(function(m){ var v=r[m[0]], p=P[m[0]](v), g=m[2]===0||!num(p)?null:(m[2]>0?p:1-p); if(num(g)){ sc+=g; k++; } return {v:v,g:g}; }); return {r:r,cells:cells,score:k?sc/k*100:null}; }).filter(Boolean);
  rows.sort(function(a,b){ return (num(b.score)?b.score:-1)-(num(a.score)?a.score:-1); });
  return {cols:cols,rows:rows};
}
function cellTxt(f,v){ if(!num(v)) return "\u2013"; if(f==="tb") return String(Math.round(v)); if(f==="beta"||f==="atr") return (+v).toFixed(2); if(isPct(f)) return sg(v,1); return (+v).toFixed(0); }
function scoreSvg(D,title,trend){
  var cw=62, lw=66, sw=54, top=104, rh=22, W=lw+sw+D.cols.length*cw+10, Hh=top+D.rows.length*rh+30;
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:'+Math.max(700,W)+'px;display:block;background:var(--surface)">','<text x="8" y="18" font-size="13" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  var hdr=[["Score",lw]].concat(D.cols.map(function(m,i){ return [m[1],lw+sw+i*cw]; }));
  hdr.forEach(function(h,i){ var x=(i===0?lw:h[1])+(i===0?sw:cw)/2; s.push('<text transform="translate('+x.toFixed(1)+' '+(top-8)+') rotate(-35)" font-size="10.5" font-weight="700" fill="var(--ink-2)">'+hE(h[0])+'</text>'); });
  D.rows.forEach(function(o,j){ var y=top+j*rh;
    s.push('<text data-tear="'+hE(o.r.sym)+'" x="8" y="'+(y+15)+'" font-size="11" font-weight="700" fill="var(--ink)" style="cursor:pointer">'+hE(o.r.sym)+'</text>');
    s.push('<rect x="'+lw+'" y="'+y+'" width="'+(sw-2)+'" height="'+(rh-2)+'" fill="'+divCol(num(o.score)?(o.score-50)/50:null)+'"/><text x="'+(lw+sw/2-1)+'" y="'+(y+14.5)+'" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">'+(num(o.score)?o.score.toFixed(0):"\u2013")+'</text>');
    o.cells.forEach(function(c,i){ var f=D.cols[i][0], x=lw+sw+i*cw, bg=num(c.g)?divCol((c.g-0.5)*2):(f==="tb"?"var(--panel)":"#52525b");
      var tx=f==="tb"&&num(c.v)?(o.r.trend==="down"?"down ":"")+Math.round(c.v):cellTxt(f,c.v);
      s.push('<rect x="'+x+'" y="'+y+'" width="'+(cw-2)+'" height="'+(rh-2)+'" fill="'+bg+'"><title>'+hE(o.r.sym+" \u2013 "+lab(f)+": "+tx+(num(c.g)?" (better than "+Math.round(c.g*100)+"% of the universe)":""))+'</title></rect><text x="'+(x+cw/2-1)+'" y="'+(y+14.5)+'" font-size="10" text-anchor="middle" fill="'+(f==="tb"?"var(--ink)":"#fff")+'" pointer-events="none">'+hE(tx)+'</text>'); }); });
  s.push('<text x="8" y="'+(Hh-10)+'" font-size="10.5" fill="var(--ink-3)">Green: better than most of the universe on that column; red: worse (risk, beta and drawdown count lower as better). Score: the average of those percentiles.</text></svg>');
  return wrap(s.join(""));
}
function barsSvg(items,title,fmt){ /* horizontal diverging bars: items [{k,v,c?}] */
  var n=items.length, W=900, lw=150, rh=20, top=34, Hh=top+n*rh+24, mx=0; items.forEach(function(i){ if(num(i.v)) mx=Math.max(mx,Math.abs(i.v)); }); if(!mx) mx=1;
  var neg=items.some(function(i){ return num(i.v)&&i.v<0; }), x0=neg?lw+(W-lw-60)/2:lw, sc=(neg?(W-lw-60)/2:(W-lw-60))/mx;
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:1000px;display:block;background:var(--surface)">','<text x="8" y="18" font-size="13" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  s.push('<line x1="'+x0+'" y1="'+(top-4)+'" x2="'+x0+'" y2="'+(top+n*rh)+'" stroke="var(--ink-3)"/>');
  items.forEach(function(i,j){ var y=top+j*rh, v=num(i.v)?i.v:0, w=Math.abs(v)*sc, x=v>=0?x0:x0-w;
    s.push('<text'+(i.tear?' data-tear="'+hE(i.k)+'" style="cursor:pointer"':'')+' x="'+(lw-8)+'" y="'+(y+13)+'" font-size="10.5" font-weight="700" text-anchor="end" fill="var(--ink)">'+hE(i.k)+'</text><rect x="'+x.toFixed(1)+'" y="'+(y+3)+'" width="'+Math.max(0.5,w).toFixed(1)+'" height="'+(rh-6)+'" fill="'+(i.c||(v>=0?"#16a34a":"#dc2626"))+'" rx="2"/><text x="'+(v>=0?x0+w+4:x0-w-4).toFixed(1)+'" y="'+(y+13)+'" font-size="10" text-anchor="'+(v>=0?"start":"end")+'" fill="var(--ink-2)">'+hE(fmt(i.v,i))+'</text>'); });
  s.push('</svg>'); return wrap(s.join(""));
}
function lineSvg(series,dates,a,title,fmt,refs){
  var W=940,Hh=460,ml=56,mr=74,mt=30,mb=34,pw=W-ml-mr,ph=Hh-mt-mb, L=dates.length-1, lo=Infinity, hi=-Infinity;
  series.forEach(function(sr){ for(var i=a;i<=L;i++){ var v=sr.v[i]; if(num(v)){ if(v<lo) lo=v; if(v>hi) hi=v; } } }); (refs||[]).forEach(function(r){ if(r.v<lo) lo=r.v; if(r.v>hi) hi=r.v; });
  if(!isFinite(lo)) return ""; if(hi===lo){ hi+=1; lo-=1; } var pad=(hi-lo)*0.05; lo-=pad; hi+=pad;
  function X(i){ return ml+(i-a)/(L-a)*pw; } function Y(v){ return mt+ph-(v-lo)/(hi-lo)*ph; }
  var s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:1000px;display:block;background:var(--surface)">','<text x="10" y="18" font-size="13" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>'];
  for(var g=0;g<=4;g++){ var gv=lo+(hi-lo)*g/4; s.push('<line x1="'+ml+'" y1="'+Y(gv).toFixed(1)+'" x2="'+(ml+pw)+'" y2="'+Y(gv).toFixed(1)+'" stroke="var(--line)" stroke-width="0.6"/><text x="'+(ml-6)+'" y="'+(Y(gv)+3).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--ink-3)">'+hE(fmt(gv))+'</text>'); }
  for(var k=0;k<=4;k++){ var di=Math.round(a+(L-a)*k/4); s.push('<text x="'+X(di).toFixed(1)+'" y="'+(mt+ph+16)+'" font-size="10" text-anchor="middle" fill="var(--ink-3)">'+hE(dates[di])+'</text>'); }
  (refs||[]).forEach(function(r){ s.push('<line x1="'+ml+'" y1="'+Y(r.v).toFixed(1)+'" x2="'+(ml+pw)+'" y2="'+Y(r.v).toFixed(1)+'" stroke="'+(r.c||"var(--ink-3)")+'" stroke-dasharray="4 3"/>'+(r.t?'<text x="'+(ml+4)+'" y="'+(Y(r.v)-3).toFixed(1)+'" font-size="9.5" fill="var(--ink-3)">'+hE(r.t)+'</text>':'')); });
  var ends=[];
  series.forEach(function(sr){ var d="", on=false, last=null; for(var i=a;i<=L;i++){ var v=sr.v[i]; if(!num(v)){ on=false; continue; } d+=(on?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1); on=true; last={i:i,v:v}; }
    s.push('<path d="'+d+'" fill="none" stroke="'+sr.c+'" stroke-width="'+(sr.w||1.6)+'"'+(sr.dash?' stroke-dasharray="5 3"':'')+' opacity="'+(sr.o||0.95)+'"><title>'+hE(sr.k)+'</title></path>'); if(last) ends.push({k:sr.k,y:Y(last.v),c:sr.c,tear:sr.tear}); });
  ends.sort(function(p,q){ return p.y-q.y; }); for(var e=1;e<ends.length;e++) if(ends[e].y-ends[e-1].y<11) ends[e].y=ends[e-1].y+11;
  ends.forEach(function(e2){ s.push('<text'+(e2.tear?' data-tear="'+hE(e2.k)+'" style="cursor:pointer"':'')+' x="'+(W-mr+4)+'" y="'+(e2.y+3.5).toFixed(1)+'" font-size="10.5" font-weight="700" fill="'+e2.c+'">'+hE(e2.k)+'</text>'); });
  s.push('</svg>'); return wrap(s.join(""));
}
/* equal-weight basket index (1 at bar a) from daily returns of the names with data */
function basketIdx(h,syms,a){ var L=h.dates.length-1, B=[], v=1; for(var i=0;i<=L;i++) B.push(null); B[a]=1;
  for(var i2=a+1;i2<=L;i2++){ var s0=0,k=0; syms.forEach(function(x){ var c=h.syms[x]; if(!c) return; var r=A.ret(c,i2); if(r!==null&&num(r)){ s0+=r; k++; } }); v*=1+(k?s0/k:0); B[i2]=v; } return B; }
function priceRel(h,sym,B,a){ var c=h.syms[sym], L=h.dates.length-1, out=[], base=null, last=null; for(var i=0;i<=L;i++) out.push(null); if(!c) return out;
  for(var i2=a;i2<=L;i2++){ var p=c[i2]; if(p===null||p===undefined) p=last; if(p===null||p===undefined) continue; last=p; if(base===null) base=p/B[i2]; out[i2]=p/B[i2]/base*100; } return out; }
function zOf(arr,a){ var L=arr.length-1, v=[]; for(var i=a;i<=L;i++) if(num(arr[i])&&arr[i]>0) v.push(Math.log(arr[i])); if(v.length<20) return null; var m=v.reduce(function(x,y){ return x+y; },0)/v.length, sd=Math.sqrt(v.reduce(function(x,y){ return x+(y-m)*(y-m); },0)/(v.length-1)); return sd>0?(v[v.length-1]-m)/sd:null; }
function relRet(h,sym,w){ var c=h.syms[sym]; if(!c) return null; var L=h.dates.length-1, a=L-w; if(a<0) return null; var li=L; while(li>a&&c[li]===null) li--; if(li<L-3||c[a]===null||c[a]===undefined||!c[a]) return null; return (c[li]/c[a]-1)*100; }

/* rolling correlation: each target (ticker, or a sector / subsector equal-weight basket) against a reference */
function runRcor(spec,ctx,res,fin,by){
  var h=H(); if(!h){ res.lead="Rolling correlation is computed from the part E price history; load it on the Price history tab."; return fin(0); }
  var L=h.dates.length-1, W=spec.w, span=Math.min(252,L-W-1); if(span<20){ res.lead="Not enough price history for a "+W+"-bar rolling window."; return fin(0); }
  var a=L-span, cache={};
  function rets(key,mem){ if(cache[key]) return cache[key]; var out=[]; for(var i=0;i<=L;i++){ var s0=0,k=0; mem.forEach(function(x){ var c=h.syms[x]; if(!c) return; var r=A.ret(c,i); if(r!==null&&num(r)){ s0+=r; k++; } }); out.push(k?s0/k:null); } cache[key]=out; return out; }
  function memOf(g){ if(g.t==="sym") return [g.v]; if(g.t==="ind") return ctx.rows.filter(function(r){ return r.ind===g.v; }).map(function(r){ return r.sym; }); if(g.t==="sec") return ctx.rows.filter(function(r){ return r.sec===g.v; }).map(function(r){ return r.sym; }); return []; }
  function nameOf(g){ return g.t==="sec"?qmSecName(g.v):g.v; }
  var bn=(A.bench&&A.bench())||"RSP";
  function refOf(g){ if(spec.ref.t==="sym") return {k:spec.ref.v,m:[spec.ref.v]}; if(spec.ref.t==="own"){ var sec=g.t==="sym"?(by[g.v]||{}).sec:(g.t==="ind"?((ctx.rows.filter(function(r){ return r.ind===g.v; })[0])||{}).sec:null); if(sec) return {k:qmSecName(sec)+" basket",m:memOf({t:"sec",v:sec}),own:true}; } return {k:bn,m:[bn]}; }
  function roll(x,y){ var out=[]; for(var i=0;i<=L;i++) out.push(null); for(var j=a;j<=L;j++){ var xa=[],ya=[]; for(var i2=j-W+1;i2<=j;i2++){ if(i2<1) continue; var p=x[i2], q2=y[i2]; if(num(p)&&num(q2)){ xa.push(p); ya.push(q2); } } out[j]=xa.length>=Math.min(20,W-1)?A.corr(xa,ya):null; } return out; }
  var ser=[], rows=[];
  spec.tg.forEach(function(g,i){ var m=memOf(g).filter(function(x){ return h.syms[x]; }); if(!m.length) return; var rf=refOf(g); if(rf.own&&g.t==="sec") rf={k:bn,m:[bn]};
    var mr=rf.m.filter(function(x){ return h.syms[x]; }); if(!mr.length) return;
    var x=rets(g.t+":"+g.v,m), y=rets("ref:"+rf.k,rf.own&&g.t==="sym"?mr.filter(function(z){ return z!==g.v; }):mr), R=roll(x,y), v=[]; for(var j=a;j<=L;j++) if(num(R[j])) v.push(R[j]); if(!v.length) return;
    var avg=v.reduce(function(p,c){ return p+c; },0)/v.length, now=R[L], ago=R[Math.max(a,L-21)];
    ser.push({k:nameOf(g),v:R,c:SECCOL[i%SECCOL.length],tear:g.t==="sym"});
    rows.push({g:g,row:[nameOf(g)+(g.t!=="sym"?" ("+m.length+" names)":""),rf.k,f0(now,2),num(now)&&num(ago)?sg(now-ago,2):"\u2013",f0(avg,2),f0(Math.min.apply(null,v),2),f0(Math.max.apply(null,v),2)],now:now}); });
  if(!ser.length){ res.lead="No price history for those names."; return fin(0); }
  var refTxt=spec.ref.t==="sym"?spec.ref.v:(spec.ref.t==="own"?(rows.length===1?rows[0].row[1]:"each one's own sector basket"):bn);
  res.hxPlot=lineSvg(ser,h.dates,a,"Rolling "+W+"-bar correlation of daily returns with "+refTxt,function(v){ return v.toFixed(2); },[{v:0,t:"0"},{v:0.5,t:"0.5"}]);
  rows.sort(function(p,q2){ return (num(q2.now)?q2.now:-9)-(num(p.now)?p.now:-9); });
  var hi=rows[0], lo=rows[rows.length-1];
  res.lead="Rolling "+W+"-bar correlation with <b>"+hE(refTxt)+"</b>"+(rows.length>1?": highest now <b>"+hE(hi.row[0])+"</b> ("+hi.row[2]+"), lowest <b>"+hE(lo.row[0])+"</b> ("+lo.row[2]+").":": <b>"+hE(hi.row[0])+"</b> is at "+hi.row[2]+" now, against "+hi.row[4]+" on average over the last "+span+" bars (range "+hi.row[5]+" to "+hi.row[6]+").");
  res.table={head:["Target","Against","Now","Change over 1 month","Average","Lowest","Highest"],align:["l","l","r","r","r","r","r"],hxColor:{3:"sign"},body:rows.map(function(r){ return r.row; })};
  res.notes.push("Each point is the correlation of daily returns over the previous "+W+" bars; sectors and subsectors are equal-weight baskets of their scanned stocks (a name is left out of its own sector basket). Say \u201Cto its sector\u201D, \u201Cto NVDA\u201D or \u201Cto RSP\u201D for the reference, and \u201C1 month\u201D, \u201C6 months\u201D or \u201C12 months\u201D for the window. Pairs (\u201Crolling correlation of NVDA and AMD\u201D) use the pair chart.");
  var ss=spec.tg.filter(function(g){ return g.t==="sym"; }).map(function(g){ return g.v; }); res.send=ss.length?{label:"rolling correlation",items:ss.map(function(s){ return {sym:s,side:"long",w:null}; })}:null;
  return fin(rows.length);
}
/* ---- run ---- */
var _qmRunX101=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hx101")) return _qmRunX101(spec,ctx,res,t0);
  var h=H(), by=ctx.bySym;
  function fin(n){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> \u00D7 <b>"+h.bars+" bars</b>"+(A.cut?" to <b>"+A.cut()+"</b>":"")+" (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=n; res.ms=Date.now()-t0; return res; }
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  if(spec.mode==="rcor") return runRcor(spec,ctx,res,fin,by);
  var syms=(spec.syms||[]).filter(function(s,i,a){ return by[s]&&a.indexOf(s)===i; }), L=spec.label||"";
  if(spec.skipped&&spec.skipped.length) res.notes.push("Not in the loaded stock scan, so left out: "+spec.skipped.slice(0,20).join(", ")+(spec.skipped.length>20?" and "+(spec.skipped.length-20)+" more":"")+".");
  if(!syms.length){ res.lead="None of those names are in the loaded stock scan."+(spec.from==="last"?" Ask for a list of stocks first, then this question.":""); return fin(0); }
  var colS=secCol(ctx);
  if(spec.mode==="scatter"){
    var fx=spec.x, fy=spec.y;
    if(!ctx.rows.some(function(r){ return num(r[fx]); })||!ctx.rows.some(function(r){ return num(r[fy]); })){ res.lead="That chart needs "+(!h?"the part E price history (load it on the Price history tab)":"fields this scan does not carry")+" for "+lab(fx)+" or "+lab(fy)+"."; return fin(0); }
    var title=lab(fy)+" against "+lab(fx)+(spec.from==="all"?", every stock":", "+L);
    res.hxPlot=scatterSvg(ctx,syms,fx,fy,title,colS);
    var pts=syms.map(function(s){ return by[s]; }).filter(function(r){ return num(r[fx])&&num(r[fy]); });
    var mxv=ctx.rows.map(function(r){ return r[fx]; }).filter(num).sort(function(a,b){ return a-b; }), myv=ctx.rows.map(function(r){ return r[fy]; }).filter(num).sort(function(a,b){ return a-b; });
    var mx=mxv[Math.floor(mxv.length/2)], my=isPct(fy)&&myv[0]<0&&myv[myv.length-1]>0?0:myv[Math.floor(myv.length/2)];
    var sweet=pts.filter(function(r){ return r[fy]>=my&&r[fx]<=mx; });
    res.lead="<b>"+hE(lab(fy))+"</b> against <b>"+hE(lab(fx))+"</b> for "+hE(L)+": "+pts.length+" names drawn"+(spec.from==="all"?"":" over the rest of the universe (grey)")+"; "+sweet.length+" sit in the top-left quadrant (higher "+lab(fy).toLowerCase().split(" (")[0]+", lower "+lab(fx).toLowerCase().split(" (")[0]+").";
    var P=pctOf(ctx.rows,fx), Q=pctOf(ctx.rows,fy);
    var body=pts.map(function(r){ var qd=(r[fy]>=my?"high ":"low ")+lab(fy).toLowerCase().split(" (")[0]+", "+(r[fx]<=mx?"low ":"high ")+lab(fx).toLowerCase().split(" (")[0]; return {r:r,row:[r.sym,qmSecName(r.sec),fmtF(fx,r[fx]),fmtF(fy,r[fy]),qd]}; });
    body.sort(function(a,b){ return (Q(b.r[fy])-P(b.r[fx]))-(Q(a.r[fy])-P(a.r[fx])); });
    if(spec.from==="all"){ body=body.slice(0,25); res.notes.push("The table lists the 25 names furthest into the top-left (highest "+lab(fy).toLowerCase()+" percentile minus "+lab(fx).toLowerCase()+" percentile)."); }
    res.table={head:["Symbol","Sector",lab(fx),lab(fy),"Quadrant"],align:["l","l","r","r","l"],body:body.map(function(b){ return b.row; })};
    res.notes.push("Dashed lines: the universe median of each axis"+(isPct(fy)&&my===0?" (zero for the return axis)":"")+". Dots are coloured by sector; click one for its tear sheet. Name the axes with \u201Cscatter of 1 month return vs beta for these\u201D; \u201Crisk return scatter\u201D uses 3-month return against 12-month volatility.");
    res.send=send(body.map(function(b){ return b.r.sym; }),"scatter: "+L); return fin(pts.length);
  }
  if(spec.mode==="tree"){
    var f=spec.color; if(f!=="dirn"&&!ctx.rows.some(function(r){ return num(r[f]); })){ res.lead="Colouring by "+lab(f)+" needs the part E price history; load it on the Price history tab, or colour by today's move."; return fin(0); }
    var title2="Market map of "+L+", coloured by "+(f==="dirn"?"Early Warning direction":lab(f));
    res.hxPlot=treeSvg(ctx,syms,f,spec.size,title2);
    var G={}; syms.forEach(function(s){ var r=by[s]; (G[r.sec]=G[r.sec]||[]).push(r); });
    var body2=Object.keys(G).map(function(k){ var m=G[k], v=m.map(function(r){ return f==="dirn"?(r.dir==="improving"?1:(r.dir==="deteriorating"?-1:0)):r[f]; }).filter(num), av=v.length?v.reduce(function(a,b){ return a+b; },0)/v.length:null, up=v.filter(function(x){ return x>0; }).length, dn=v.filter(function(x){ return x<0; }).length;
      var srt=m.filter(function(r){ return num(f==="dirn"?r.str:r[f]); }).sort(function(a,b){ return f==="dirn"?b.str-a.str:b[f]-a[f]; });
      return {av:av,row:[qmSecName(k),String(m.length),f==="dirn"?sg(av*100,0)+"% net improving":fmtF(f,av),up+" / "+dn,srt.length?srt[0].sym:"\u2013",srt.length>1?srt[srt.length-1].sym:"\u2013"]}; });
    body2.sort(function(a,b){ return (num(b.av)?b.av:-1e9)-(num(a.av)?a.av:-1e9); });
    res.lead="Market map of <b>"+hE(L)+"</b> ("+syms.length+" stocks), coloured by "+(f==="dirn"?"Early Warning direction":hE(lab(f)))+"; boxes are "+(spec.size==="eq"?"equal size":"sized by 20-day turnover")+" and grouped by sector.";
    res.table={head:["Sector","Names",f==="dirn"?"Direction":"Average "+lab(f),"Up / down","Best","Worst"],align:["l","r","r","l","l","l"],hxColor:{2:"sign"},body:body2.map(function(b){ return b.row; })};
    res.notes.push("Say \u201Ccoloured by 1 month\u201D, \u201Cby strength\u201D, \u201Cby direction\u201D or \u201Cequal size\u201D to change the map; \u201Ctreemap of these\u201D draws the previous answer's names. The Treemap tab has the full interactive version.");
    res.send=null; return fin(syms.length);
  }
  if(spec.mode==="score"){
    var list=syms.slice(0,40); if(syms.length>40) res.notes.push("The first 40 of "+syms.length+" names are drawn.");
    var D=scoreData(ctx,list);
    res.hxPlot=scoreSvg(D,"Scorecard of "+L+" (colour: percentile against the whole universe)");
    res.lead="Scorecard of <b>"+hE(L)+"</b>: "+D.rows.length+" names on "+D.cols.length+" measures, best overall first. Strongest: <b>"+D.rows[0].r.sym+"</b> (score "+f0(D.rows[0].score)+")"+(D.rows.length>1?"; weakest: <b>"+D.rows[D.rows.length-1].r.sym+"</b> (score "+f0(D.rows[D.rows.length-1].score)+")":"")+".";
    res.table={head:["Symbol","Score"].concat(D.cols.map(function(m){ return lab(m[0]); })),align:["l","r"].concat(D.cols.map(function(){ return "r"; })),body:D.rows.map(function(o){ return [o.r.sym,f0(o.score)].concat(o.cells.map(function(c,i){ return cellTxt(D.cols[i][0],c.v); })); })};
    if(!h) res.notes.push("Load the part E price history for the 1M, 3M, YTD, drawdown and beta columns.");
    res.notes.push("Score is the plain average of each column's universe percentile (risk, beta and drawdown flipped so higher is better; trend age is shown but not scored). A comparison, not a forecast.");
    res.send=send(D.rows.map(function(o){ return o.r.sym; }),"scorecard of "+L); return fin(D.rows.length);
  }
  if(spec.mode==="breadth"){
    var keyOf=spec.level==="ind"?function(r){ return r.ind; }:function(r){ return r.sec; }, G2={}, rows=syms.map(function(s){ return by[s]; });
    rows.forEach(function(r){ var k=keyOf(r); (G2[k]=G2[k]||[]).push(r); });
    function line(name,m){ var st=m.filter(function(r){ return num(r.sev)&&r.sev>0; }).length, wk=m.filter(function(r){ return num(r.sev)&&r.sev<0; }).length, im=m.filter(function(r){ return r.dir==="improving"; }).length, de=m.filter(function(r){ return r.dir==="deteriorating"; }).length,
        ad=m.filter(function(r){ return num(r.r1)&&r.r1>0; }).length, dc=m.filter(function(r){ return num(r.r1)&&r.r1<0; }).length, tl=m.filter(function(r){ return num(r.atr)&&r.atr>0; }).length, up=m.filter(function(r){ return r.trend==="up"; }).length;
      return {net:st-wk,st:st,wk:wk,im:im,de:de,ad:ad,dc:dc,tl:tl,up:up,row:[name,String(m.length),String(st),String(wk),sg(st-wk,0),String(im),String(de),im*2>m.length?"improving":(de*2>m.length?"deteriorating":"stable/mixed"),String(ad),String(dc),sg(ad-dc,0),tl+" of "+m.length,up+" of "+m.length]}; }
    var body3=Object.keys(G2).map(function(k){ return line(spec.level==="ind"?k:qmSecName(k),G2[k]); }).sort(function(a,b){ return b.net-a.net; }), tot=line("All "+rows.length+" names",rows);
    res.lead="Breadth of <b>"+hE(L)+"</b>: "+tot.st+" strengthening, "+tot.wk+" weakening (net "+sg(tot.net,0)+"); "+tot.im+" improving, "+tot.de+" deteriorating; "+tot.ad+" up and "+tot.dc+" down on the day; "+tot.tl+" of "+rows.length+" above their trend line.";
    res.table={head:[spec.level==="ind"?"Subsector":"Sector","Names","Strengthening","Weakening","Net","Improving","Deteriorating","Direction","Advancing","Declining","Net 1D","Above trend line","In an uptrend"],align:["l","r","r","r","r","r","r","l","r","r","r","r","r"],hxColor:{2:"pos",3:"neg",4:"sign",5:"pos",6:"neg",7:"dir",8:"pos",9:"neg",10:"sign"},body:body3.map(function(b){ return b.row; }).concat([tot.row])};
    var nm=rows.slice().sort(function(a,b){ return (num(b.sev)?b.sev:-999)-(num(a.sev)?a.sev:-999); });
    res.extra=[{title:"Each name",table:{head:["Symbol","Sector","Recent score","Direction","1D return","Trend"],align:["l","l","r","l","r","l"],hxColor:{2:"sign",3:"dir",4:"sign"},body:nm.map(function(r){ return [r.sym,qmSecName(r.sec),sg(r.sev,0),r.dir||"\u2013",num(r.r1)?sg(r.r1,2)+"%":"\u2013",(r.trend==="down"?"down ":(r.trend==="up"?"up ":""))+(num(r.tb)?r.tb+" sessions":"")]; })}}];
    res.notes.push("Same measures as the sector breadth table, restricted to these names: strengthening / weakening is the recent SEW score above / below zero, improving / deteriorating the Early Warning direction, advancing / declining the day's move. Say \u201Cby subsector\u201D for subsector rows.");
    res.send=send(syms,"breadth of "+L); return fin(rows.length);
  }
  if(spec.mode==="rank"){
    var fr=spec.f; if(!ctx.rows.some(function(r){ return num(r[fr]); })){ res.lead="Ranking by "+lab(fr)+" needs the part E price history; load it on the Price history tab."; return fin(0); }
    var rs=syms.map(function(s){ return by[s]; }), has=rs.filter(function(r){ return num(r[fr]); }), no=rs.filter(function(r){ return !num(r[fr]); });
    has.sort(function(a,b){ return spec.d==="asc"?a[fr]-b[fr]:b[fr]-a[fr]; });
    res.lead=hE(L.charAt(0).toUpperCase()+L.slice(1))+", re-ranked by <b>"+hE(lab(fr).toLowerCase())+"</b>, "+(spec.d==="asc"?"lowest":"highest")+" first.";
    res.table={head:["Rank","Symbol",lab(fr),"Sector","Subsector","Strength pct","Risk pct","Direction"],align:["r","l","r","l","l","r","r","l"],hxColor:{6:"dir"},body:has.concat(no).map(function(r,i){ return [String(i+1),r.sym,fmtF(fr,r[fr]),qmSecName(r.sec),r.ind,f0(r.str),f0(r.risk),r.dir||"\u2013"]; })};
    if(no.length) res.notes.push("No value for "+no.map(function(r){ return r.sym; }).join(", ")+" (listed last).");
    res.send=send(has.concat(no).map(function(r){ return r.sym; }),"re-ranked by "+lab(fr)); return fin(has.length);
  }
  if(spec.mode==="exit"){
    var out=syms.map(function(s){ var r=by[s], why=[];
      var below=num(r.atr)&&r.atr<=0; if(below) why.push("below its trend line");
      if(r.dir==="deteriorating") why.push("Early Warning deteriorating");
      if(num(r.sev)&&r.sev<0) why.push("weakening (SEW score below zero)");
      if(num(r.dspd)&&r.dspd<0) why.push("below its RMESA line");
      if(num(r.d1)&&r.d1<0) why.push("below cluster 1");
      if(r.trend==="down") why.push("trend down"+(num(r.tb)?" "+r.tb+" sessions":""));
      if(num(r.str)&&r.str<40) why.push("strength percentile "+Math.round(r.str));
      var st=(below&&(r.dir==="deteriorating"||(num(r.sev)&&r.sev<0)))||why.length>=4?"EXIT":(why.length?"WATCH":"HOLD");
      return {r:r,st:st,why:why}; });
    var ord={EXIT:0,WATCH:1,HOLD:2}; out.sort(function(a,b){ return ord[a.st]-ord[b.st]||b.why.length-a.why.length; });
    var cnt={HOLD:0,WATCH:0,EXIT:0}; out.forEach(function(o){ cnt[o.st]++; });
    res.lead="Exit check of <b>"+hE(L)+"</b>: <b>"+cnt.HOLD+"</b> hold, <b>"+cnt.WATCH+"</b> watch, <b>"+cnt.EXIT+"</b> exit signals on this bar.";
    res.table={hx101st:true,head:["Symbol","Status","Warnings","Trend","vs trend line (ATR)","Direction","Recent score","Strength pct"],align:["l","l","l","l","r","l","r","r"],hxColor:{5:"dir",6:"sign"},
      body:out.map(function(o){ var r=o.r; return [r.sym,o.st,o.why.join("; ")||"none",(r.trend||"")+(num(r.tb)?" "+r.tb+" sessions":""),num(r.atr)?(+r.atr).toFixed(2):"\u2013",r.dir||"\u2013",sg(r.sev,0),f0(r.str)]; })};
    res.notes.push("Rules (mechanical, not advice): EXIT when a name is below its trend line (StepMA) and weakening or deteriorating, or has four or more warnings; WATCH with one to three warnings; HOLD with none. Warnings: below the trend line, Early Warning deteriorating, SEW score below zero, below the RMESA line, below cluster 1, trend down, strength percentile under 40.");
    res.send=send(out.map(function(o){ return o.r.sym; }),"exit check of "+L); return fin(out.length);
  }
  if(spec.mode==="expo"){
    var n=syms.length, G3={}, U={}, uN=ctx.rows.length; syms.forEach(function(s){ var r=by[s]; (G3[r.sec]=G3[r.sec]||[]).push(r); }); ctx.rows.forEach(function(r){ U[r.sec]=(U[r.sec]||0)+1; });
    function avg(m,f){ var v=m.map(function(r){ return r[f]; }).filter(num); return v.length?v.reduce(function(a,b){ return a+b; },0)/v.length:null; }
    var secs=Object.keys(U).map(function(k){ var m=G3[k]||[], w=m.length/n*100, uw=U[k]/uN*100; return {k:k,m:m,w:w,uw:uw}; }).sort(function(a,b){ return b.w-a.w||b.uw-a.uw; });
    var hhi=0; secs.forEach(function(x){ hhi+=(x.w/100)*(x.w/100); });
    var inds={}; syms.forEach(function(s){ inds[by[s].ind]=(inds[by[s].ind]||0)+1; }); var topI=Object.keys(inds).sort(function(a,b){ return inds[b]-inds[a]; });
    var items=secs.filter(function(x){ return x.m.length||x.uw>=4; }).map(function(x){ return {k:qmSecName(x.k),v:x.w-x.uw,w:x.w}; });
    res.hxPlot=barsSvg(items,"Sector weight of "+L+" against the universe (equal weights): over / under, in percentage points",function(v,i){ return (v>0?"+":"")+v.toFixed(1)+" pts ("+i.w.toFixed(0)+"%)"; });
    var avgC=null; if(h&&n>=2&&n<=80){ var s0=0,k0=0; for(var a=0;a<n;a++) for(var b=a+1;b<n;b++){ var ca=h.syms[syms[a]], cb=h.syms[syms[b]]; if(!ca||!cb) continue; var L0=h.dates.length-1, xa=[], xb=[]; for(var i=L0-251;i<=L0;i++){ if(i<1) continue; var p=A.ret(ca,i), q2=A.ret(cb,i); if(p!==null&&q2!==null){ xa.push(p); xb.push(q2); } } var c=A.corr(xa,xb); if(num(c)){ s0+=c; k0++; } } avgC=k0?s0/k0:null; }
    var all=syms.map(function(s){ return by[s]; });
    res.lead="Exposure of <b>"+hE(L)+"</b> ("+n+" names, equal weights): <b>"+secs.filter(function(x){ return x.m.length; }).length+"</b> sectors and "+topI.length+" subsectors; largest sector <b>"+qmSecName(secs[0].k)+"</b> at "+secs[0].w.toFixed(0)+"% (universe "+secs[0].uw.toFixed(0)+"%); effective number of sectors "+(hhi?(1/hhi).toFixed(1):"\u2013")+(num(avgC)?"; average pairwise correlation "+avgC.toFixed(2)+" (252 bars)":"")+".";
    res.table={head:["Sector","Names","Weight","Universe weight","Over / under","Avg strength pct","Avg risk pct","Improving","Avg 1M"],align:["l","r","r","r","r","r","r","r","r"],hxColor:{4:"sign",8:"sign"},
      body:secs.filter(function(x){ return x.m.length; }).map(function(x){ var a1=avg(x.m,"m1"); return [qmSecName(x.k),String(x.m.length),x.w.toFixed(1)+"%",x.uw.toFixed(1)+"%",sg(x.w-x.uw,1)+" pts",f0(avg(x.m,"str")),f0(avg(x.m,"risk")),x.m.filter(function(r){ return r.dir==="improving"; }).length+" of "+x.m.length,num(a1)?sg(a1,2)+"%":"\u2013"]; })};
    var b1=avg(all,"beta");
    res.extra=[{title:"Portfolio averages and the most repeated subsectors",table:{head:["Measure","Value"],align:["l","l"],body:[["Average strength percentile",f0(avg(all,"str"))],["Average risk percentile",f0(avg(all,"risk"))],["Average beta to the benchmark",num(b1)?b1.toFixed(2):"\u2013 (load the price history)"],["Names in an uptrend",all.filter(function(r){ return r.trend==="up"; }).length+" of "+n],["Improving / deteriorating",all.filter(function(r){ return r.dir==="improving"; }).length+" / "+all.filter(function(r){ return r.dir==="deteriorating"; }).length],["Subsectors with 2 or more names",topI.filter(function(k){ return inds[k]>=2; }).map(function(k){ return k+" ("+inds[k]+")"; }).join(", ")||"none"]]}}];
    res.notes.push("Equal weights are assumed. Universe weight is the sector's share of all scanned stocks; the effective number of sectors is 1 divided by the sum of squared sector weights (higher is more spread). Ask \u201Chow correlated are these\u201D for the full matrix.");
    res.send=send(syms,"exposure of "+L); return fin(n);
  }
  if(spec.mode==="spread"){
    if(!h){ res.lead="The spread against the basket is computed from the part E price history; load it on the Price history tab."; return fin(0); }
    var LL=h.dates.length-1, a=Math.max(0,LL-spec.win), have=syms.filter(function(x){ return h.syms[x]; });
    var foc=spec.focus&&h.syms[spec.focus]?spec.focus:null, bk=have.filter(function(x){ return x!==foc; });
    if(bk.length<2){ res.lead="Need at least two other names with price history to form the basket."; return fin(0); }
    var B=basketIdx(h,bk,a), names=foc?[foc]:have, rows2=names.map(function(x){ var R=priceRel(h,x,B,a), z=zOf(R,a), lastv=R[LL]; return {s:x,R:R,z:z,rel:num(lastv)?lastv-100:null}; }).filter(function(o){ return num(o.z); });
    if(!rows2.length){ res.lead="Not enough price history for these names over "+spec.win+" bars."; return fin(0); }
    rows2.sort(function(p,q2){ return q2.z-p.z; });
    var show=foc?rows2:(rows2.length>12?rows2.slice(0,6).concat(rows2.slice(-6)):rows2);
    var ttl=foc?foc+" against an equal-weight basket of "+bk.length+" names ("+spec.win+" bars, basket = 100)":"Each name against the list's equal-weight basket ("+spec.win+" bars, basket = 100)";
    res.hxPlot=lineSvg(show.map(function(o,i){ return {k:o.s,v:o.R,c:SECCOL[i%SECCOL.length],tear:true,w:foc?2.2:1.5}; }),h.dates,a,ttl,function(v){ return v.toFixed(0); },[{v:100,t:"basket"}]);
    function tag(z){ return z>=2?"stretched above":(z<=-2?"stretched below":(z>=1?"leaning above":(z<=-1?"leaning below":"in line"))); }
    var up=rows2.filter(function(o){ return o.z>=2; }), dn=rows2.filter(function(o){ return o.z<=-2; });
    res.lead=foc?"<b>"+foc+"</b> against an equal-weight basket of "+hE(L)+" ("+bk.length+" names, "+spec.win+" bars): "+sg(rows2[0].rel,1)+"% relative to the basket, z-score <b>"+rows2[0].z.toFixed(2)+"</b> ("+tag(rows2[0].z)+").":
      "Spread of <b>"+hE(L)+"</b> against their own equal-weight basket ("+spec.win+" bars): "+up.length+" stretched above (z 2 or more)"+(up.length?": "+up.map(function(o){ return o.s; }).join(", "):"")+"; "+dn.length+" stretched below"+(dn.length?": "+dn.map(function(o){ return o.s; }).join(", "):"")+".";
    res.table={head:["Symbol","Sector","Relative to basket","Z-score of the spread","Reading"],align:["l","l","r","r","l"],hxColor:{2:"sign",3:"sign"},body:rows2.map(function(o){ return [o.s,qmSecName(by[o.s].sec),sg(o.rel,1)+"%",o.z.toFixed(2),tag(o.z)]; })};
    if(!foc&&rows2.length>12) res.notes.push("The chart draws the 6 most stretched above and below; the table has all "+rows2.length+".");
    res.notes.push("Spread = the name's price divided by the equal-weight basket of the "+(foc?"other names":"list")+", indexed to 100 at the start; the z-score is today's log spread against its own mean and spread over the window. A plain price ratio: no fitted hedge ratio, so a negative hedge ratio cannot occur. Say \u201C6 months\u201D or \u201C3 months\u201D for a shorter window. Not a trade signal on its own.");
    res.send=send(foc?syms:rows2.map(function(o){ return o.s; }),"spread vs basket"); return fin(rows2.length);
  }
  if(spec.mode==="rsec"){
    if(!h){ res.lead="Relative strength against the sector is computed from the part E price history; load it on the Price history tab."; return fin(0); }
    var L2=h.dates.length-1, a2=Math.max(0,L2-spec.win), SB={}, bn2=(A.bench&&A.bench())||"RSP", b63=relRet(h,bn2,63);
    function secB(sec){ if(!SB[sec]){ var mem=ctx.rows.filter(function(r){ return r.sec===sec&&h.syms[r.sym]; }).map(function(r){ return r.sym; }); SB[sec]={m:mem,B:basketIdx(h,mem,a2),r:{}}; [21,63,126].forEach(function(w){ var s0=0,k=0; mem.forEach(function(x){ var v=relRet(h,x,w); if(num(v)){ s0+=v; k++; } }); SB[sec].r[w]=k?s0/k:null; }); } return SB[sec]; }
    var rr2=syms.filter(function(x){ return h.syms[x]; }).map(function(x){ var r=by[x], sb=secB(r.sec), o={s:x,r:r,sb:sb}; [21,63,126].forEach(function(w){ var v=relRet(h,x,w); o[w]=num(v)&&num(sb.r[w])?v-sb.r[w]:null; }); o.R=priceRel(h,x,sb.B,a2); var e=o.R[L2], e21=o.R[Math.max(a2,L2-21)]; o.slope=num(e)&&num(e21)&&e21?(e/e21-1)*100:null; o.lead=num(sb.r[63])&&num(b63)&&sb.r[63]<b63&&num(o[63])&&o[63]>0; return o; }).filter(function(o){ return num(o[63])||num(o[21]); });
    if(!rr2.length){ res.lead="No price history for these names."; return fin(0); }
    rr2.sort(function(p,q2){ return (num(q2[63])?q2[63]:-1e9)-(num(p[63])?p[63]:-1e9); });
    var sh2=rr2.length>12?rr2.slice(0,6).concat(rr2.slice(-6)):rr2;
    res.hxPlot=lineSvg(sh2.map(function(o,i){ return {k:o.s,v:o.R,c:SECCOL[i%SECCOL.length],tear:true}; }),h.dates,a2,"Each name divided by its own sector's equal-weight basket ("+spec.win+" bars, sector = 100)",function(v){ return v.toFixed(0); },[{v:100,t:"own sector"}]);
    var ld=rr2.filter(function(o){ return o.lead; });
    res.lead="Relative strength of <b>"+hE(L)+"</b> against each name's own sector: "+rr2.filter(function(o){ return num(o[63])&&o[63]>0; }).length+" of "+rr2.length+" beat their sector over 3 months"+(ld.length?"; leaders inside sectors that trail "+bn2+": <b>"+ld.map(function(o){ return o.s; }).join(", ")+"</b>":"")+".";
    res.table={head:["Symbol","Sector","1M vs sector","3M vs sector","6M vs sector","RS line, last month","Sector 3M vs "+bn2,"Note"],align:["l","l","r","r","r","r","r","l"],hxColor:{2:"sign",3:"sign",4:"sign",5:"sign",6:"sign"},
      body:rr2.map(function(o){ return [o.s,qmSecName(o.r.sec),sg(o[21],1),sg(o[63],1),sg(o[126],1),num(o.slope)?sg(o.slope,1)+"%":"\u2013",num(o.sb.r[63])&&num(b63)?sg(o.sb.r[63]-b63,1):"\u2013",o.lead?"leader in a lagging sector":(num(o[21])&&num(o[63])?(o[21]>0&&o[63]>0?"beating its sector":(o[21]<0&&o[63]<0?"trailing its sector":"mixed")):"")]; })};
    if(rr2.length>12) res.notes.push("The chart draws the 6 strongest and 6 weakest against their sector; the table has all "+rr2.length+".");
    res.notes.push("Sector basket: the equal-weight average of every scanned stock in that sector (from the part E history). Columns are the name's return minus its sector basket's, in percentage points; the RS line is price divided by the sector basket (100 at the window start). A leader in a lagging sector beats its sector over 3 months while the sector trails "+bn2+".");
    res.send=send(rr2.map(function(o){ return o.s; }),"RS vs sector"); return fin(rr2.length);
  }
  if(spec.mode==="rsl"){
    if(!h){ res.lead="The relative strength leaderboard is computed from the part E price history; load it on the Price history tab."; return fin(0); }
    var bn=(A.bench&&A.bench())||"RSP"; var bR={21:relRet(h,bn,21),63:relRet(h,bn,63),126:relRet(h,bn,126)};
    if(!num(bR[63])){ res.lead="The benchmark ("+bn+") is not in the loaded price history."; return fin(0); }
    var lb=syms.map(function(s){ var o={s:s,r:by[s]}; [21,63,126].forEach(function(w){ var x=relRet(h,s,w); o[w]=num(x)&&num(bR[w])?x-bR[w]:null; }); var parts=[[o[21],0.25],[o[63],0.5],[o[126],0.25]].filter(function(p){ return num(p[0]); }), sw=0, sv=0; parts.forEach(function(p){ sv+=p[0]*p[1]; sw+=p[1]; }); o.c=sw?sv/sw:null; return o; }).filter(function(o){ return num(o.c); });
    lb.sort(function(a,b){ return b.c-a.c; });
    var N=+spec.n||0, shown=lb; if(N) shown=lb.slice(0,N); else if(lb.length>40){ shown=lb.slice(0,20).concat(lb.slice(-10)); res.notes.push("The 20 leaders and the 10 laggards of "+lb.length+" are shown; say \u201Ctop 40\u201D for more."); }
    res.hxPlot=barsSvg(shown.map(function(o){ return {k:o.s,v:o.c,tear:true,c:o.c>=0?(num(o[21])&&o[21]>=0?"#16a34a":"#86efac"):(num(o[21])&&o[21]<0?"#dc2626":"#fca5a5")}; }),"Relative strength against "+bn+": blended excess return (25% 1M, 50% 3M, 25% 6M)",function(v){ return (v>0?"+":"")+v.toFixed(1)+" pts"; });
    res.lead="Relative strength leaderboard of <b>"+hE(L)+"</b> against <b>"+bn+"</b>: "+lb.filter(function(o){ return o.c>0; }).length+" of "+lb.length+" names beat it on the blended measure; leader <b>"+lb[0].s+"</b> ("+sg(lb[0].c,1)+" pts), laggard <b>"+lb[lb.length-1].s+"</b> ("+sg(lb[lb.length-1].c,1)+" pts).";
    res.table={head:["Rank","Symbol","Sector","Blended RS (pts)","1M vs "+bn,"3M vs "+bn,"6M vs "+bn,"RS trend"],align:["r","l","l","r","r","r","r","l"],hxColor:{3:"sign",4:"sign",5:"sign",6:"sign",7:"dir"},
      body:shown.map(function(o){ var tr=num(o[21])&&num(o[63])?(o[21]>0&&o[63]>0?"rising":(o[21]<0&&o[63]<0?"falling":(o[21]>0?"improving":"fading"))):"\u2013"; return [String(lb.indexOf(o)+1),o.s,qmSecName(o.r.sec),sg(o.c,1),sg(o[21],1),sg(o[63],1),sg(o[126],1),tr]; })};
    res.notes.push("Excess return is the name's price return minus "+bn+"'s over 21, 63 and 126 bars (percentage points); the blend weights them 25 / 50 / 25. RS trend: rising when it beats "+bn+" over both 1M and 3M, falling when it trails over both, improving when only the 1M is ahead, fading when only the 3M is. Light bars: the last month disagrees with the blend.");
    res.send=send(lb.map(function(o){ return o.s; }),"RS leaders of "+L); return fin(lb.length);
  }
  return fin(0);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Charts and list tools: {\"kind\":\"hx101\",\"mode\":\"scatter\"|\"tree\"|\"score\"|\"breadth\"|\"rank\"|\"exit\"|\"expo\"|\"rsl\",\"syms\":[tickers],\"label\":\"...\",\"x\":field,\"y\":field,\"color\":field,\"f\":field,\"d\":\"asc\"|\"desc\"}.\nQ: "); }catch(e){}
}catch(e){ try{ console.warn("v101 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
