/* ================= v84: the part E price history on the tear sheet and four tabs =================
   Read-only. Every block below is NEW and sits beside the existing content; no existing chart, table, number or
   control is changed. Each block stays hidden until a price history is loaded (Ask the terminal, "Load price history"),
   and re-draws when the history changes or its tab is opened. Nothing new is saved: the history is already stored. */
(function(){
try{
var A=window.__hxApi; if(!A) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function M(){ try{ return A.metrics(); }catch(e){ return null; } }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v); }
function pc(v,d){ if(!num(v)) return "&#8211;"; return '<span style="color:var(--'+(v>0?"pos":(v<0?"neg":"ink-2"))+')">'+(v>0?"+":"")+v.toFixed(d===undefined?1:d)+'%</span>'; }
function p2(v,d){ return num(v)?v.toFixed(d===undefined?2:d):"&#8211;"; }
function tk(s){ return '<strong class="num" data-tear="'+hE(s)+'" style="cursor:pointer">'+hE(s)+'</strong>'; }
function secOf(sym){ try{ var r=SYM.filter(function(x){ return x.sym===sym; })[0]; if(r) return secShort(r.sec); var X=moX(); if(X&&X.etfSym&&X.etfSym.some(function(x){ return x.sym===sym; })) return "ETF"; }catch(e){} return ""; }
function dLab(d){ try{ var p=String(d).split("-"); return +p[2]+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1]-1]+" "+p[0]; }catch(e){ return d; } }
/* daily returns over the last w bars (null where a bar is missing) */
function rets(sym,w){ var h=H(), c=h&&h.syms[sym]; if(!c) return null; var L=h.dates.length-1, o=[]; for(var i=L-w+1;i<=L;i++) o.push(i>=1?A.ret(c,i):null); return o; }
/* pairwise correlation on the bars both names traded; needs 80% of the window */
function pcor(x,y){ if(!x||!y) return null; var a=[],b=[]; for(var i=0;i<x.length;i++) if(x[i]!==null&&y[i]!==null){ a.push(x[i]); b.push(y[i]); } return a.length>=Math.max(20,Math.floor(x.length*0.8))?A.corr(a,b):null; }
/* z-scored return vectors (full windows only) so many pairs are a plain dot product */
function zvec(sym,w){ var r=rets(sym,w); if(!r) return null; for(var i=0;i<r.length;i++) if(r[i]===null) return null; var m=0; r.forEach(function(x){ m+=x; }); m/=r.length; var ss=0; r.forEach(function(x){ ss+=(x-m)*(x-m); }); ss=Math.sqrt(ss); if(!(ss>0)) return null; return r.map(function(x){ return (x-m)/ss; }); }
function dot(a,b){ var d=0; for(var i=0;i<a.length;i++) d+=a[i]*b[i]; return d; }
function stamp(){ var h=H(); return h?String(h.savedAt)+"|"+h.dates.length:""; }
var CACHE={}; function cached(key,fn){ var k=stamp()+"|"+key; if(!(k in CACHE)){ if(Object.keys(CACHE).length>200) CACHE={}; CACHE[k]=fn(); } return CACHE[k]; }
function wLab(w){ return w===60?"60 bars (about 3 months)":(w===126?"126 bars (about 6 months)":"252 bars (about a year)"); }
function srcLine(){ var h=H(), m=M(); if(!h) return ""; return "Price history "+dLab(h.dates[0])+" to "+dLab(h.dates[h.dates.length-1])+", "+h.dates.length+" bars, benchmark "+hE((m&&m.bench)||"none")+"."; }
function blockEl(id,html){ var d=document.createElement("div"); d.className="block"; d.id=id; d.hidden=true; d.innerHTML=html; return d; }
function segHtml(id,vals,labs,on){ return '<div class="seg" id="'+id+'">'+vals.map(function(v,i){ return '<button type="button" data-v="'+v+'" aria-pressed="'+(String(v)===String(on))+'">'+labs[i]+'</button>'; }).join("")+'</div>'; }
function segWire(id,fn){ $$("#"+id+" button").forEach(function(b){ b.addEventListener("click",function(){ $$("#"+id+" button").forEach(function(x){ x.setAttribute("aria-pressed",String(x===b)); }); fn(b.dataset.v); }); }); }
function tipOn(svg,fn){ svg.addEventListener("mousemove",function(e){ var h=fn(e.target); if(h) showTip(h,e.clientX,e.clientY); else hideTip(); }); svg.addEventListener("mouseleave",hideTip); }
function heat(r){ return r===null?"var(--panel)":"color-mix(in srgb,"+cssv(r>=0?"--pos":"--neg")+" "+(Math.min(1,Math.abs(r))*80).toFixed(0)+"%, var(--surface))"; }

/* ================= 1. tear sheet: "Price history (part E)" ================= */
function tearPeers(sym){
  return cached("peers|"+sym,function(){
    var h=H(), me=rets(sym,252), m=M(), out=[]; if(!me) return out;
    Object.keys(h.syms).forEach(function(s){ if(s===sym||(m&&s===m.bench)) return; var r=pcor(me,rets(s,252)); if(r!==null) out.push({s:s,r:r}); });
    out.sort(function(a,b){ return b.r-a.r||(a.s<b.s?-1:1); }); return out.slice(0,5);
  });
}
function spark(sym){
  var h=H(), m=M(), c=h.syms[sym], b=m&&m.bench&&m.bench!==sym?h.syms[m.bench]:null, L=h.dates.length-1, a=0;
  while(a<L&&(c[a]===null||(b&&b[a]===null))) a++;
  if(L-a<20) return "";
  var W=300,Hh=96,pl=4,pr=40,pt=8,pb=16, s1=[],s2=[],lo=Infinity,hi=-Infinity,i;
  for(i=a;i<=L;i++){ var v=c[i]!==null?c[i]/c[a]*100:null; s1.push(v); var u=b&&b[i]!==null?b[i]/b[a]*100:null; s2.push(u);
    [v,u].forEach(function(z){ if(z!==null){ if(z<lo) lo=z; if(z>hi) hi=z; } }); }
  if(!(hi>lo)) return "";
  function X(k){ return pl+k*(W-pl-pr)/(s1.length-1); } function Y(v){ return pt+(hi-v)*(Hh-pt-pb)/(hi-lo); }
  function line(arr){ var d="",pen=false; arr.forEach(function(v,k){ if(v===null){ pen=false; return; } d+=(pen?"L":"M")+X(k).toFixed(1)+" "+Y(v).toFixed(1); pen=true; }); return d; }
  var yb=-1; try{ yb=A.ytdBase(); }catch(e){}
  var out=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(sym)+' price rebased to 100 against the benchmark" style="width:100%;height:auto;max-width:360px;display:block">'];
  out.push('<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(100).toFixed(1)+'" y2="'+Y(100).toFixed(1)+'" stroke="var(--line-strong)" stroke-dasharray="3 3" stroke-width="0.8"/>');
  if(yb>a&&yb<L){ var xy=X(yb-a).toFixed(1); out.push('<line x1="'+xy+'" x2="'+xy+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--line-strong)" stroke-width="0.8"/><text x="'+(+xy+3)+'" y="'+(Hh-5)+'" font-size="9" fill="var(--ink-3)">year start</text>'); }
  if(b) out.push('<path d="'+line(s2)+'" fill="none" stroke="var(--ink-3)" stroke-width="1.2" stroke-dasharray="4 3"/>');
  out.push('<path d="'+line(s1)+'" fill="none" stroke="var(--accent)" stroke-width="1.8"/>');
  var e1=s1[s1.length-1], e2=s2[s2.length-1];
  if(e1!==null) out.push('<text x="'+(W-pr+3)+'" y="'+(Y(e1)+3).toFixed(1)+'" font-size="9.5" font-weight="700" fill="var(--accent)">'+e1.toFixed(0)+'</text>');
  if(b&&e2!==null&&Math.abs(Y(e2)-Y(e1))>9) out.push('<text x="'+(W-pr+3)+'" y="'+(Y(e2)+3).toFixed(1)+'" font-size="9.5" fill="var(--ink-3)">'+e2.toFixed(0)+'</text>');
  out.push('<text x="'+pl+'" y="'+(Hh-5)+'" font-size="9" fill="var(--ink-3)">'+hE(dLab(h.dates[a]))+'</text></svg>');
  return '<div style="font-size:11.5px;color:var(--ink-2);margin:2px 0 4px"><span style="color:var(--accent);font-weight:700">&#9472; '+hE(sym)+'</span>'+(b?' &nbsp; <span style="color:var(--ink-3)">- - '+hE(m.bench)+'</span>':'')+' &nbsp; both start at 100</div>'+out.join("");
}
function tearBlock(sym){
  var h=H(); if(!h||!h.syms[sym]) return "";
  var m=M(), o=m&&m.by[sym]; if(!o) return "";
  var head='<h3 style="margin-top:16px">Price history (part E)</h3>';
  if(o.stale) return head+'<p style="margin:0;font-size:12.5px;color:var(--ink-3)">The loaded history for '+hE(sym)+' stops at '+hE(o.last?dLab(o.last):"an earlier bar")+', so no current figures are shown.</p>';
  var bn=m.bench, bo=bn&&bn!==sym?m.by[bn]:null;
  function vs(k){ return pc(o[k])+(bo&&!bo.stale&&num(bo[k])?' <span style="color:var(--ink-3);font-size:11.5px">'+hE(bn)+' '+(bo[k]>0?"+":"")+bo[k].toFixed(1)+'%</span>':""); }
  var kv=[["YTD return",vs("ytd")],["1M / 3M return",pc(o.m1)+" / "+pc(o.m3)],["6M / 12M return",pc(o.m6)+" / "+pc(o.m12)],
    ["Max drawdown YTD / 12M",pc(o.ddy)+" / "+pc(o.dd12)],["Volatility YTD / 12M",(num(o.voly)?o.voly.toFixed(1)+"%":"&#8211;")+" / "+(num(o.vol12)?o.vol12.toFixed(1)+"%":"&#8211;")+' <span style="color:var(--ink-3);font-size:11.5px">annualised</span>'],
    ["From 52-week high",pc(o.hi52)]];
  if(bo) kv.push(["Correlation / beta to "+hE(bn),p2(o.crsp)+" / "+p2(o.beta)+' <span style="color:var(--ink-3);font-size:11.5px">12M daily</span>']);
  var peers=tearPeers(sym);
  return head+'<p style="margin:0 0 6px;font-size:11.5px;color:var(--ink-3)">'+srcLine()+' Descriptive, not a signal.</p>'+spark(sym)+
    '<dl class="kv">'+kv.map(function(r){ return '<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>'; }).join("")+'</dl>'+
    (peers.length?'<p style="margin:8px 0 0;font-size:12px;color:var(--ink-2)"><strong>Moves most like it</strong> (daily returns, 252 bars): '+peers.map(function(p){ var sc=secOf(p.s); return tk(p.s)+' <span class="mini">'+p.r.toFixed(2)+(sc?" "+hE(sc):"")+'</span>'; }).join(" &nbsp;")+'</p>':"");
}
var _moTearGraph84=moTearGraph;
moTearGraph=function(sym){ var base=_moTearGraph84(sym), add=""; try{ add=tearBlock(sym); }catch(e){ add=""; } return base+add; };

/* ================= 2. Correlation matrix: real daily returns ================= */
var cmW=252;
function cmMount(){
  var pane=$("#pane-cm"); if(!pane||$("#hx84Cm")) return;
  var el=blockEl("hx84Cm",
    '<div class="block-head"><h2>Real daily-return correlation, from your part E price history</h2><span class="count" id="hx84CmNote"></span></div>'+
    '<p class="lede">The matrix above correlates each name&rsquo;s saved <em>severity</em> (or composite) across your saved runs. This one uses the actual daily price returns from the '+
    'price history you loaded: the same sixty names in the same sector order, so the two can be read side by side. Teal is positive, red negative; hover a cell for the pair. '+
    'The tables underneath search <strong>all</strong> stocks, not just the sixty.</p>'+
    '<div class="controls"><div class="ctl-grp"><span class="ctl-lab">Window</span>'+segHtml("hx84CmWin",[60,126,252],["60 bars","126 bars","252 bars"],252)+'</div></div>'+
    '<div class="tm-shell"><div class="chart-scroll" id="hx84CmHeat"></div></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px;margin-top:12px">'+
    ['up','cross','down'].map(function(k){ return '<div><h3 style="margin:0 0 6px">'+(k==="up"?"Most co-moving pairs":(k==="cross"?"Most co-moving pairs across sectors":"Most diverging pairs"))+'</h3><div class="tbl-scroll"><table id="hx84Cm_'+k+'"><thead><tr><th style="text-align:left">Pair</th><th style="text-align:left">Sectors</th><th>Correlation</th></tr></thead><tbody></tbody></table></div></div>'; }).join("")+'</div>');
  var fig=pane.querySelector(":scope > figure"); if(fig) pane.insertBefore(el,fig); else pane.appendChild(el);
  segWire("hx84CmWin",function(v){ cmW=+v; cmDraw(); });
}
function cmAll(w){
  return cached("cmall|"+w,function(){
    var rows=SYM.filter(function(s){ return s.sec!=="Benchmark"; }), Z=[], i,j;
    rows.forEach(function(s){ var z=zvec(s.sym,w); if(z) Z.push({s:s,z:z}); });
    var up=[],dn=[],cr=[];
    function keep(arr,item,better,k){ arr.push(item); if(arr.length>k*4){ arr.sort(better); arr.length=k; } }
    for(i=0;i<Z.length;i++) for(j=i+1;j<Z.length;j++){ var r=dot(Z[i].z,Z[j].z), it={a:Z[i].s,b:Z[j].s,r:r};
      keep(up,it,function(p,q){ return q.r-p.r; },15); keep(dn,it,function(p,q){ return p.r-q.r; },15);
      if(Z[i].s.sec!==Z[j].s.sec) keep(cr,it,function(p,q){ return q.r-p.r; },15); }
    up.sort(function(p,q){ return q.r-p.r; }); dn.sort(function(p,q){ return p.r-q.r; }); cr.sort(function(p,q){ return q.r-p.r; });
    return {up:up.slice(0,15),down:dn.slice(0,15),cross:cr.slice(0,15),n:Z.length};
  });
}
function cmDraw(){
  cmMount(); var el=$("#hx84Cm"); if(!el) return;
  var h=H(); if(!h||(typeof cmUni!=="undefined"&&cmUni==="etfs")||h.dates.length<cmW+1){ el.hidden=true; return; }
  el.hidden=false;
  var pool=cmTopPool(), n=pool.length, V=pool.map(function(s){ return rets(s.sym,cmW); }), R={}, i,j;
  for(i=0;i<n;i++) for(j=i+1;j<n;j++) R[i+","+j]=pcor(V[i],V[j]);
  var cell=Math.max(6,Math.min(16,900/Math.max(1,n))), W=cell*n, s=['<svg viewBox="0 0 '+W+' '+W+'" role="img" aria-label="Daily return correlation of the same sixty names, ordered by sector." style="width:100%;height:auto;min-width:420px">'];
  for(i=0;i<n;i++) for(j=0;j<n;j++){ var r=i===j?null:(i<j?R[i+","+j]:R[j+","+i]);
    s.push('<rect class="hx84c" data-i="'+i+'" data-j="'+j+'" x="'+(j*cell).toFixed(1)+'" y="'+(i*cell).toFixed(1)+'" width="'+cell.toFixed(1)+'" height="'+cell.toFixed(1)+'" fill="'+(i===j?"var(--sunken)":heat(r))+'" stroke="var(--surface)" stroke-width="0.5"/>'); }
  var prev=null; pool.forEach(function(p,k){ if(p.sec!==prev){ s.push('<line x1="0" y1="'+(k*cell).toFixed(1)+'" x2="'+W+'" y2="'+(k*cell).toFixed(1)+'" stroke="var(--line-strong)"/><line x1="'+(k*cell).toFixed(1)+'" y1="0" x2="'+(k*cell).toFixed(1)+'" y2="'+W+'" stroke="var(--line-strong)"/>'); prev=p.sec; } });
  s.push('</svg>'); var host=$("#hx84CmHeat"); host.innerHTML=s.join("");
  tipOn(host.querySelector("svg"),function(t){ if(!(t.classList&&t.classList.contains("hx84c"))) return null; var a=+t.getAttribute("data-i"), b=+t.getAttribute("data-j"); if(a===b) return null; var r=a<b?R[a+","+b]:R[b+","+a];
    return '<div class="t">'+hE(pool[a].sym)+' &times; '+hE(pool[b].sym)+'</div><dl><dt>Return correlation</dt><dd>'+(r===null?"not enough shared bars":r.toFixed(2))+'</dd><dt>Window</dt><dd>'+wLab(cmW)+'</dd><dt>Sectors</dt><dd>'+hE(secShort(pool[a].sec))+' / '+hE(secShort(pool[b].sec))+'</dd></dl>'; });
  var all=cmAll(cmW);
  ["up","cross","down"].forEach(function(k){ var tb=$("#hx84Cm_"+k+" tbody"); if(!tb) return;
    tb.innerHTML=all[k].length?all[k].map(function(p){ return '<tr><td style="text-align:left">'+tk(p.a.sym)+' &times; '+tk(p.b.sym)+'</td><td style="text-align:left;color:var(--ink-2);font-size:12px">'+hE(secShort(p.a.sec))+' / '+hE(secShort(p.b.sec))+'</td><td class="num">'+p.r.toFixed(2)+'</td></tr>'; }).join(""):'<tr><td colspan="3" style="text-align:center;color:var(--ink-3)">No pairs with a full window.</td></tr>'; });
  $("#hx84CmNote").textContent=wLab(cmW)+" · "+all.n+" stocks with a full window · "+srcLine();
}

/* ================= 3. Hidden Groups: do the groups hold up over a longer history? ================= */
function hgMount(){
  var t=$("#hgTbl"), blk=t&&t.closest(".block"); if(!blk||$("#hx84Hg")) return;
  var el=blockEl("hx84Hg",'<div class="block-head"><h3>Every group, checked against the part E price history</h3><span class="count" id="hx84HgNote"></span></div>'+
    '<p class="lede" style="font-size:13px">The groups above come from each name&rsquo;s single closest 60-day peer. Here every group is measured from the price history instead: '+
    '<strong>Avg correlation</strong> is the mean daily-return correlation over all pairs of members, over 60 and 252 bars. A group that is still high at 252 bars has moved together for a year; '+
    'one that is only high at 60 bars is a recent relationship. The returns, volatility and drawdown are for an equal-weight basket of the members, rebalanced daily. Same group numbers as the table above.</p>'+
    '<div class="tbl-scroll"><table id="hx84HgTbl"><thead><tr><th>#</th><th style="text-align:left">Members</th><th>With history</th><th>Avg corr 60 bars</th><th>Avg corr 252 bars</th><th style="text-align:left">Over a year</th><th>YTD</th><th>12M</th><th>12M volatility</th><th>12M max DD</th><th>Corr to benchmark</th></tr></thead><tbody></tbody></table></div>');
  blk.parentNode.insertBefore(el,blk.nextSibling);
}
function avgPair(syms,w){ var V=syms.map(function(s){ return rets(s,w); }), t=0,k=0; for(var i=0;i<V.length;i++) for(var j=i+1;j<V.length;j++){ var r=pcor(V[i],V[j]); if(r!==null){ t+=r; k++; } } return k?t/k:null; }
function hgDraw(){
  hgMount(); var el=$("#hx84Hg"); if(!el) return;
  var h=H(), m=M(); if(!h||!m||!$("#hgBody")||$("#hgBody").hidden){ el.hidden=true; return; }
  var R=relClusters(hgUni,hgThr/100), L=h.dates.length-1, bc=m.bench?h.syms[m.bench]:null, yb=-1; try{ yb=A.ytdBase(); }catch(e){}
  var rows=R.clusters.map(function(c){
    var syms=c.members.map(function(r){ return r.sym; }).filter(function(s){ return h.syms[s]&&m.by[s]&&!m.by[s].stale; });
    var o={c:c,n:syms.length,c60:null,c252:null,y:null,t:null};
    if(syms.length>=2){ o.c60=avgPair(syms,60); o.c252=avgPair(syms,252); }
    if(syms.length){ var Y=yb>=0?A.groupPath(syms,yb,L):null, T=L-252>=0?A.groupPath(syms,L-252,L):null; o.y=Y; o.t=T;
      if(T&&bc){ var xs=[],ys=[]; for(var i=0;i<T.rs.length;i++){ var q=A.ret(bc,L-252+1+i); if(T.rs[i]!==null&&q!==null){ xs.push(T.rs[i]); ys.push(q); } } o.cb=xs.length>=120?A.corr(xs,ys):null; } }
    return o;
  });
  function verdict(o){ if(!num(o.c252)) return '<span style="color:var(--ink-3)">&#8211;</span>'; if(o.c252>=0.5) return '<span style="color:var(--pos);font-weight:600">holds up</span>'; if(o.c252>=0.3) return "partly"; return '<span style="color:var(--neg)">recent only</span>'; }
  function td(v,d,signPct){ if(!num(v)) return '<td class="num">&#8211;</td>'; return '<td class="num">'+(signPct?pc(v,d):v.toFixed(d))+'</td>'; }
  $("#hx84HgTbl tbody").innerHTML=rows.map(function(o){ var c=o.c;
    return '<tr><td class="num">'+c.id+'</td><td style="text-align:left">'+c.members.map(function(r){ return tk(r.sym); }).join(" ")+'</td><td class="num">'+o.n+' of '+c.members.length+'</td>'+
      td(o.c60,2)+td(o.c252,2)+'<td style="text-align:left">'+verdict(o)+'</td>'+td(o.y&&o.y.ret,1,1)+td(o.t&&o.t.ret,1,1)+'<td class="num">'+(o.t&&num(o.t.vol)?o.t.vol.toFixed(1)+'%':'&#8211;')+'</td>'+td(o.t&&o.t.dd,1,1)+td(o.cb,2)+'</tr>'; }).join("")||
    '<tr><td colspan="11" style="text-align:center;color:var(--ink-3)">No groups at this link strength.</td></tr>';
  var hold=rows.filter(function(o){ return num(o.c252)&&o.c252>=0.5; }).length, rec=rows.filter(function(o){ return num(o.c252)&&o.c252<0.3; }).length;
  $("#hx84HgNote").textContent=hold+" of "+rows.length+" groups hold up over 252 bars, "+rec+" are recent only · "+srcLine();
  el.hidden=false;
}

/* ================= 4. Relationship map: are the behaviour links also price links? ================= */
function ngMount(){
  var pane=$("#pane-ng"); if(!pane||$("#hx84Ng")) return;
  var el=blockEl("hx84Ng",'<div class="block-head"><h2>Do the map&rsquo;s behaviour links also move together in price?</h2><span class="count" id="hx84NgNote"></span></div>'+
    '<p class="lede">The map links names that <em>look alike today</em> on the nine scan features; its own text says that is not the same as being correlated. With the part E price history loaded, '+
    'every link drawn on the map is checked against the actual daily-return correlation of the two names. A link that is also a price link is a relationship; one that is not is a look-alike for now.</p>'+
    '<p class="lede" id="hx84NgSum" style="padding:10px 14px;background:var(--panel);border:1px solid var(--line);border-radius:9px"></p>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">'+
    ['conf','look'].map(function(k){ return '<div><h3 style="margin:0 0 6px">'+(k==="conf"?"Cross-sector links confirmed by price (252 bars)":"Look-alike links whose prices do not move together")+'</h3><div class="tbl-scroll"><table id="hx84Ng_'+k+'"><thead><tr><th style="text-align:left">Link</th><th style="text-align:left">Sectors</th><th>Corr 60 bars</th><th>Corr 252 bars</th></tr></thead><tbody></tbody></table></div></div>'; }).join("")+'</div>');
  var after=$("#ngmBlock"); if(after&&after.parentNode===pane) pane.insertBefore(el,after.nextSibling);
  else { var fig=pane.querySelector(":scope > figure"); if(fig) pane.insertBefore(el,fig); else pane.appendChild(el); }
}
function ngDrawHx(){
  ngMount(); var el=$("#hx84Ng"); if(!el) return;
  var h=H(); if(!h||typeof ngEdges==="undefined"||!ngEdges||!ngEdges.length||!ngIdx){ el.hidden=true; return; }
  var E=ngEdges.map(function(e){ var a=ngIdx[e.a], b=ngIdx[e.b];
    return {a:e.a,b:e.b,sa:a?a.sec:"",sb:b?b.sec:"",cross:e.cross,r60:pcor(rets(e.a,60),rets(e.b,60)),r252:pcor(rets(e.a,252),rets(e.b,252))}; });
  var got=E.filter(function(e){ return e.r252!==null; });
  if(!got.length){ el.hidden=true; return; }
  function share(list,lo,hi){ var n=list.filter(function(e){ return e.r252>=lo&&e.r252<hi; }).length; return list.length?Math.round(n/list.length*100):0; }
  var cr=got.filter(function(e){ return e.cross; }), sm=got.filter(function(e){ return !e.cross; });
  function line(lab,list){ return lab+" ("+list.length+"): <strong>"+share(list,0.5,9)+"%</strong> move together (0.5 or more), "+share(list,0.3,0.5)+"% partly (0.3 to 0.5), "+share(list,-9,0.3)+"% hardly (under 0.3)."; }
  $("#hx84NgSum").innerHTML="Of the <strong>"+E.length+"</strong> behaviour links on the map, "+got.length+" have a full year of prices for both names.<br>"+line("All links",got)+"<br>"+line("Same-sector links",sm)+"<br>"+line("Cross-sector links",cr);
  function rowsH(list){ return list.length?list.map(function(e){ return '<tr><td style="text-align:left">'+tk(e.a)+' &ndash; '+tk(e.b)+'</td><td style="text-align:left;color:var(--ink-2);font-size:12px">'+hE(secShort(e.sa))+' / '+hE(secShort(e.sb))+'</td><td class="num">'+p2(e.r60)+'</td><td class="num">'+p2(e.r252)+'</td></tr>'; }).join(""):'<tr><td colspan="4" style="text-align:center;color:var(--ink-3)">None.</td></tr>'; }
  $("#hx84Ng_conf tbody").innerHTML=rowsH(cr.slice().sort(function(p,q){ return q.r252-p.r252; }).slice(0,12).filter(function(e){ return e.r252>=0.3; }));
  $("#hx84Ng_look tbody").innerHTML=rowsH(got.slice().sort(function(p,q){ return p.r252-q.r252; }).slice(0,12).filter(function(e){ return e.r252<0.3; }));
  $("#hx84NgNote").textContent=srcLine();
  el.hidden=false;
}

/* ================= 5. Radar: a second, price-history radar beside the existing one ================= */
var HAX=[
  {k:"hy",lab:"YTD return",tip:"Return since the last close of last year: higher = risen more"},
  {k:"h12",lab:"12M return",tip:"Return over 252 bars: higher = risen more"},
  {k:"hcalm",lab:"Calm",tip:"12M volatility, reversed: higher = a calmer price"},
  {k:"hres",lab:"Resilience",tip:"12M max drawdown: higher = a shallower worst fall"},
  {k:"hhi",lab:"Near high",tip:"Distance from the 52-week high: higher = closer to it"},
  {k:"hown",lab:"Own path",tip:"1 minus the squared correlation to the benchmark: higher = less tied to the market"}];
function hRaw(k,o){ if(!o) return "&#8211;"; if(k==="hy") return pc(o.ytd); if(k==="h12") return pc(o.m12); if(k==="hcalm") return num(o.vol12)?o.vol12.toFixed(1)+"% vol":"&#8211;"; if(k==="hres") return pc(o.dd12); if(k==="hhi") return pc(o.hi52); if(k==="hown") return num(o.crsp)?"corr "+o.crsp.toFixed(2):"&#8211;"; return "&#8211;"; }
function hVal(k,o){ if(!o||o.stale) return null; var v={hy:o.ytd,h12:o.m12,hcalm:num(o.vol12)?-o.vol12:null,hres:o.dd12,hhi:o.hi52,hown:num(o.crsp)?1-o.crsp*o.crsp:null}[k]; return num(v)?v:null; }
function rdMount(){
  var body=$("#radarBody"), first=body&&body.querySelector(":scope > .block"); if(!first||$("#hx84Rd")) return;
  var el=blockEl("hx84Rd",'<div class="block-head"><h2>Price-history radar (part E)</h2><span class="count" id="hx84RdNote"></span></div>'+
    '<p class="lede" style="font-size:13px">The same names (or groups) as the radar above, drawn on six qualities measured from the price history you loaded rather than from today&rsquo;s scan: '+
    '<strong>YTD return</strong>, <strong>12M return</strong>, <strong>Calm</strong> (low 12-month volatility), <strong>Resilience</strong> (a shallow 12-month max drawdown), <strong>Near high</strong> '+
    '(close to the 52-week high) and <strong>Own path</strong> (little tied to the benchmark). Each is a 0 to 100 percentile inside the chosen universe, like the radar above. The existing radar is unchanged.</p>'+
    '<div class="tm-shell"><div class="chart-scroll" id="hx84RdChart" style="text-align:center"></div></div><div class="tbl-scroll"><table id="hx84RdTbl"></table></div>');
  first.parentNode.insertBefore(el,first.nextSibling);
}
function rdDraw(){
  rdMount(); var el=$("#hx84Rd"); if(!el) return;
  var h=H(), m=M(); if(!h||!m||!$("#radarBody")||$("#radarBody").hidden){ el.hidden=true; return; }
  var rows=moRowsFor(radarUni).filter(function(r){ return r.sym!=="SPY"; }), sorted={};
  HAX.forEach(function(a){ sorted[a.k]=rows.map(function(r){ return hVal(a.k,m.by[r.sym]); }).filter(num).sort(function(x,y){ return x-y; }); });
  function rank(k,val){ var v=sorted[k]; if(!v.length||!num(val)) return null; var lo=0; while(lo<v.length&&v[lo]<val) lo++; var hi=lo; while(hi<v.length&&v[hi]===val) hi++; return ((lo+hi-1)/2)/Math.max(1,v.length-1)*100; }
  function pOf(sym){ var o=m.by[sym], p={}; HAX.forEach(function(a){ p[a.k]=rank(a.k,hVal(a.k,o)); }); return p; }
  var polys=[], tbl=[];
  if(radarView==="groups"){
    radarGrpSel.forEach(function(g,i){ var mem=rows.filter(function(r){ return moGrpOf(r)===g; }), p={};
      HAX.forEach(function(a){ p[a.k]=swMean(mem.map(function(r){ return rank(a.k,hVal(a.k,m.by[r.sym])); }).filter(num)); });
      polys.push({label:g,color:RADAR_COL[i%3],p:p}); tbl.push({lab:hE(g),p:p,o:null}); });
  } else {
    (radarSel[radarUni]||[]).forEach(function(sym,i){ if(!m.by[sym]) return; var p=pOf(sym); polys.push({label:sym,color:RADAR_COL[i%3],p:p}); tbl.push({lab:tk(sym),p:p,o:m.by[sym]}); });
  }
  polys=polys.filter(function(P){ return HAX.some(function(a){ return num(P.p[a.k]); }); });
  if(!polys.length){ el.hidden=true; return; }
  var svg="", keep=RADAR_AX;
  try{ RADAR_AX=HAX; svg=radarSvg(polys,520,{}); } finally { RADAR_AX=keep; }
  svg=svg.replace("across eight axes","across six price-history axes");
  $("#hx84RdChart").innerHTML='<div style="margin:4px 0">'+polys.map(function(P){ return '<span style="display:inline-block;padding:2px 9px;margin:2px 5px 2px 0;border-radius:12px;border:2px solid '+P.color+';font-size:12px">'+(radarView==="groups"?hE(P.label):tk(P.label))+'</span>'; }).join("")+'</div>'+svg;
  var s=$("#hx84RdChart svg"); if(s) tipOn(s,function(t){ if(!(t.classList&&t.classList.contains("rdvtx"))) return null; var P=polys[+t.getAttribute("data-p")], a=HAX[+t.getAttribute("data-a")]; if(!P||!a) return null;
    return '<div class="t">'+hE(P.label)+' &middot; '+hE(a.lab)+'</div><dl><dt>Percentile</dt><dd>'+(num(P.p[a.k])?Math.round(P.p[a.k]):"&#8211;")+'</dd>'+(radarView==="groups"?"":'<dt>Value</dt><dd>'+hRaw(a.k,m.by[P.label])+'</dd>')+'<dt>Meaning</dt><dd>'+hE(a.tip)+'</dd></dl>'; });
  $("#hx84RdTbl").innerHTML='<thead><tr><th style="text-align:left">'+(radarView==="groups"?"Group":"Name")+'</th>'+HAX.map(function(a){ return '<th title="'+hE(a.tip)+'">'+a.lab+'</th>'; }).join("")+'</tr></thead><tbody>'+
    tbl.map(function(r){ return '<tr><td style="text-align:left">'+r.lab+'</td>'+HAX.map(function(a){ return '<td class="num">'+(num(r.p[a.k])?Math.round(r.p[a.k]):"&#8211;")+(r.o?'<br><span class="mini">'+hRaw(a.k,r.o)+'</span>':'')+'</td>'; }).join("")+'</tr>'; }).join("")+'</tbody>';
  $("#hx84RdNote").textContent=srcLine();
  el.hidden=false;
}

/* ================= wiring: redraw on history change, on tab open, and after each tab's own redraw ================= */
function safe(fn){ return function(){ try{ fn(); }catch(e){ try{ console.warn("v84: "+(e&&e.message)); }catch(e2){} } }; }
var sCm=safe(cmDraw), sHg=safe(hgDraw), sNg=safe(ngDrawHx), sRd=safe(rdDraw);
function paneOpen(id){ var p=$("#"+id); return p&&!p.hidden; }
function later(fn){ setTimeout(fn,0); }
function all(){ sCm(); sHg(); sNg(); sRd(); }
window.addEventListener("hxchange",function(){ later(all); });
v63Watch("tab-cm",function(){ later(sCm); });
v63Watch("tab-hg",function(){ later(sHg); });
v63Watch("tab-ng",function(){ later(sNg); });
v63Watch("tab-radar",function(){ later(sRd); });
function watchOut(sel,fn){ var t=$(sel); if(!t||typeof MutationObserver==="undefined") return; var q=false;
  new MutationObserver(function(){ if(q) return; q=true; setTimeout(function(){ q=false; fn(); },0); }).observe(t,{childList:true}); }
watchOut("#hgTbl tbody",sHg);
watchOut("#radarChart",sRd);
watchOut("#ngFindings tbody",sNg);
$$("#cmUniSeg button").forEach(function(b){ b.addEventListener("click",function(){ later(sCm); }); });
cmMount(); hgMount(); ngMount(); rdMount();
later(all);
}catch(e){ try{ console.warn("v84 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
