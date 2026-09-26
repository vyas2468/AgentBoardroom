/* ================= v95: maps inside Ask answers, and the "AF Approach" switch on the Subsector Web =================
   1. Ask the terminal can draw, inside the answer (dots open tear sheets; every drawing has Save as PNG):
      - a relationship map of a ticker, a subsector or a sector   ("relationship map of NVDA / of Credit Services / of Energy")
      - a signal convergence map of a ticker, subsector or sector ("signal convergence map of Financials")
      - a correlation matrix of a sector or subsector              ("correlation matrix of Energy", clustered, with blocs)
      - hidden groups for a sector, a ticker, or all               ("hidden groups map for Financials", "all hidden groups map")
   2. "AF Approach" switch on the Subsector Web (off by default: the existing view is unchanged). When on, companies inside each
      industry are linked by their strongest daily-return correlations (a minimum spanning tree over 252 bars), only the most central
      name keeps its line to the industry circle, dots are green or red by the day's move, and when one industry is isolated the
      names are laid out along those chains. It redraws on top of the finished drawing; turning it off redraws the original.
   Only questions with these words reach the new code; every other question is parsed as before. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v)&&isFinite(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function ctxNow(){ try{ return QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){ return null; } }
/* 252-bar daily return correlation from the part E history */
function retsW(sym,w){ var h=H(); if(!h||!h.syms[sym]) return null; var c=h.syms[sym], L=h.dates.length-1, o=[]; for(var i=L-w+1;i<=L;i++) o.push(A.ret(c,i)); return o; }
function pc(x,y){ if(!x||!y) return null; var a=[],b=[]; for(var i=0;i<x.length;i++) if(x[i]!==null&&y[i]!==null){ a.push(x[i]); b.push(y[i]); } return a.length>=Math.max(20,x.length*0.8)?A.corr(a,b):null; }
function corrMat(syms,w){ var V=syms.map(function(s){ return retsW(s,w); }), R={}; for(var i=0;i<syms.length;i++) for(var j=i+1;j<syms.length;j++){ var r=pc(V[i],V[j]); R[i+","+j]=r; R[j+","+i]=r; } return R; }
function mst(syms,R){ var par={}, edges=[], out=[]; syms.forEach(function(s,i){ par[i]=i; }); function f(x){ while(par[x]!==x) x=par[x]; return x; }
  for(var i=0;i<syms.length;i++) for(var j=i+1;j<syms.length;j++){ var r=R[i+","+j]; if(num(r)) edges.push({a:i,b:j,r:r}); }
  edges.sort(function(p,q){ return q.r-p.r; }); edges.forEach(function(e){ if(f(e.a)!==f(e.b)){ par[f(e.a)]=f(e.b); out.push(e); } }); return out; }
var PURPLE="#a78bfa", GREEN="#4ade80", RED="#f87171";

/* ================= 2. AF Approach on the Subsector Web ================= */
var AF=false; try{ AF=localStorage.getItem("alexaligned.sbw.af")==="1"; }catch(e){}
function afApply(){
  var svg=$("#sbwChart svg"); if(!svg||!AF||svg.getAttribute("data-af")) return; svg.setAttribute("data-af","1");
  var C=ctxNow(), by={}; if(C) C.rows.forEach(function(r){ by[r.sym]=r; });
  var dots=[].slice.call(svg.querySelectorAll("circle.sbwdot")), lines=[].slice.call(svg.querySelectorAll("line")), pos={};
  dots.forEach(function(d){ pos[d.getAttribute("data-s")]={el:d,x:+d.getAttribute("cx"),y:+d.getAttribute("cy"),r:+d.getAttribute("r")}; });
  var spoke={}, hubs={}, centre=null;
  lines.forEach(function(l){ var x2=l.getAttribute("x2"), y2=l.getAttribute("y2"); for(var s in pos){ if(pos[s].el.getAttribute("cx")===x2&&pos[s].el.getAttribute("cy")===y2){ spoke[s]=l; var k=l.getAttribute("x1")+","+l.getAttribute("y1"); (hubs[k]=hubs[k]||[]).push(s); break; } } });
  lines.forEach(function(l){ var k=l.getAttribute("x2")+","+l.getAttribute("y2"); if(hubs[k]&&!centre) centre={x:+l.getAttribute("x1"),y:+l.getAttribute("y1")}; });
  var first=dots[0], hist=!!H(), iso=false; try{ iso=!!sbwInd; }catch(e){}
  var ns="http://www.w3.org/2000/svg";
  Object.keys(hubs).forEach(function(k){
    var syms=hubs[k].filter(function(s){ return pos[s]; }), hx=+k.split(",")[0], hy=+k.split(",")[1];
    if(iso&&syms.every(function(s){ return spoke[s]&&spoke[s].getAttribute("stroke-opacity")==="0.08"; })) return; /* dimmed (not the selected industry) */
    if(!hist||syms.length<2) return;
    var R=corrMat(syms,252), T=mst(syms,R);
    var avg=syms.map(function(s,i){ var t=0,n=0; syms.forEach(function(o,j){ if(i!==j&&num(R[i+","+j])){ t+=R[i+","+j]; n++; } }); return n?t/n:-9; });
    var root=0; avg.forEach(function(v,i){ if(v>avg[root]) root=i; });
    if(iso&&centre){
      /* lay the tree out along chains away from the sector centre, like Alex's view */
      var ux=hx-centre.x, uy=hy-centre.y, L0=Math.sqrt(ux*ux+uy*uy)||1; ux/=L0; uy/=L0; var px=-uy, py=ux;
      var adj={}; syms.forEach(function(s,i){ adj[i]=[]; }); T.forEach(function(e){ adj[e.a].push(e.b); adj[e.b].push(e.a); });
      var depth={}, order=[root]; depth[root]=0; for(var q=0;q<order.length;q++) adj[order[q]].forEach(function(n){ if(depth[n]===undefined){ depth[n]=depth[order[q]]+1; order.push(n); } });
      var lanes={}, laneOf={}; laneOf[root]=0; var nextLane=1;
      order.forEach(function(i){ if(i===root) return; var parent=adj[i].filter(function(n){ return depth[n]===depth[i]-1; })[0]; var pl=laneOf[parent]; var used=lanes[parent+"|"]||0;
        laneOf[i]=used===0?pl:(nextLane%2?1:-1)*Math.ceil(nextLane/2)+pl; if(used>0) nextLane++; lanes[parent+"|"]=used+1; });
      order.forEach(function(i){ var s=syms[i], p=pos[s], d=depth[i], x=hx+ux*(60+d*70)+px*laneOf[i]*55, y=hy+uy*(60+d*70)+py*laneOf[i]*55;
        p.el.setAttribute("cx",x.toFixed(1)); p.el.setAttribute("cy",y.toFixed(1)); p.x=x; p.y=y;
        [].slice.call(svg.querySelectorAll("text.sbwlab")).forEach(function(t){ if(t.textContent===s){ t.setAttribute("x",x.toFixed(1)); t.setAttribute("y",(y+p.r+12).toFixed(1)); t.setAttribute("text-anchor","middle"); } }); });
    }
    syms.forEach(function(s,i){ var l=spoke[s]; if(!l) return; if(i===root){ l.setAttribute("x2",pos[s].x.toFixed(1)); l.setAttribute("y2",pos[s].y.toFixed(1)); l.setAttribute("stroke",PURPLE); l.setAttribute("stroke-opacity","0.9"); l.setAttribute("stroke-width","1.8"); } else l.style.display="none"; });
    T.forEach(function(e){ var a=pos[syms[e.a]], b=pos[syms[e.b]], ln=document.createElementNS(ns,"line");
      ln.setAttribute("x1",a.x.toFixed(1)); ln.setAttribute("y1",a.y.toFixed(1)); ln.setAttribute("x2",b.x.toFixed(1)); ln.setAttribute("y2",b.y.toFixed(1));
      ln.setAttribute("stroke",PURPLE); ln.setAttribute("stroke-width",(1+Math.max(0,e.r)*2.2).toFixed(1)); ln.setAttribute("stroke-opacity","0.85");
      var tt=document.createElementNS(ns,"title"); tt.textContent=syms[e.a]+" \u2013 "+syms[e.b]+": correlation "+e.r.toFixed(2)+" (252 bars)"; ln.appendChild(tt); if(first) first.parentNode.insertBefore(ln,first); });
  });
  dots.forEach(function(d){ var r=by[d.getAttribute("data-s")]; if(r&&num(r.r1)){ d.setAttribute("fill",r.r1>=0?GREEN:RED); d.setAttribute("fill-opacity","0.95"); } });
  var note=document.createElementNS(ns,"text"); note.setAttribute("x","12"); note.setAttribute("y","18"); note.setAttribute("font-size","11"); note.setAttribute("fill","#a78bfa"); note.setAttribute("font-weight","700");
  note.textContent="AF Approach: purple links = strongest daily-return correlations (tree, 252 bars)"+(hist?"":" \u2013 load the price history for the links")+"; green up / red down on the day; size = graph anomaly";
  svg.appendChild(note);
}
window.__afApply=afApply;
function afInit(){
  var iso=$("#sbxIso"), nm=$("#sbwNames"); var anchor=(iso&&iso.closest("label"))||(nm&&nm.closest("label")); if(!anchor||$("#hx95AF")) return;
  var lab=document.createElement("label"); lab.className="sw-toggle"; lab.title="AF Approach: link each industry's companies by their strongest daily-return correlations (a tree from the part E history), keep only the most central name's line to the industry circle, colour dots green or red by the day's move, and lay names out along the chains when one industry is isolated. Off = the existing view.";
  lab.innerHTML='<input type="checkbox" id="hx95AF"'+(AF?" checked":"")+'> AF Approach'; anchor.parentNode.insertBefore(lab,anchor.nextSibling);
  $("#hx95AF").addEventListener("change",function(){ AF=this.checked; try{ localStorage.setItem("alexaligned.sbw.af",AF?"1":"0"); }catch(e){} try{ sbwRender(); }catch(e){} afApply(); });
  var host=$("#sbwChart"); if(host&&typeof MutationObserver!=="undefined") new MutationObserver(function(){ afApply(); }).observe(host,{childList:true});
}
try{ afInit(); }catch(e){}
v63Watch("tab-sbw",function(){ setTimeout(function(){ try{ afInit(); afApply(); }catch(e){} },0); });
window.addEventListener("hxchange",function(){ setTimeout(function(){ try{ var s=$("#sbwChart svg"); if(s&&AF){ sbwRender(); afApply(); } }catch(e){} },0); });

/* ================= 1. maps inside Ask answers ================= */
var FL={ta:"Trend age",sd:"Structural drift",ms:"Momentum shape",sm:"Structure map",an:"Anomaly",at:"Attention"};
function conv(sym){ try{ var s=SYM.filter(function(x){ return x.sym===sym; })[0]; return s?cgConvergence(s):null; }catch(e){ return null; } }
var NB=null;
function behaviourNb(k){ if(NB) return NB; NB={}; try{ var pool=buildVectors(); pool.forEach(function(s){ NB[s.sym]=pool.filter(function(o){ return o!==s; }).map(function(o){ return {s:o.sym,d:dist2(s._v,o._v)}; }).sort(function(a,b){ return a.d-b.d; }).slice(0,k||4).map(function(x){ return x.s; }); }); }catch(e){} return NB; }
var SECCOL=["#3b82f6","#f59e0b","#10b981","#ef4444","#a855f7","#06b6d4","#84cc16","#f97316","#ec4899","#14b8a6","#eab308","#8b5cf6"];
/* generic network drawing: groups (hubs) on a ring, members around them; or an ego layout around one name */
function network(o){
  var W=960, Hh=o.h||640, cx=W/2, cy=Hh/2+10, s=['<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+hE(o.title)+'" style="width:100%;height:auto;max-width:1000px;display:block;background:var(--surface)">'];
  s.push('<text x="14" y="20" font-size="13" font-weight="700" fill="var(--ink)">'+hE(o.title)+'</text>');
  var P={};
  if(o.ego){
    P[o.ego]={x:cx,y:cy}; var ring=o.nodes.filter(function(n){ return n.id!==o.ego; });
    ring.forEach(function(n,i){ var a=-Math.PI/2+i*2*Math.PI/Math.max(1,ring.length), Rr=n.far?270:190; P[n.id]={x:cx+Rr*Math.cos(a),y:cy+Rr*0.78*Math.sin(a)}; });
  } else {
    var G=o.groups, RG=G.length===1?0:Math.min(250,90+G.length*22);
    G.forEach(function(g,gi){ var a=-Math.PI/2+gi*2*Math.PI/G.length, gx=cx+RG*Math.cos(a), gy=cy+RG*0.8*Math.sin(a); g.x=gx; g.y=gy;
      var mem=o.nodes.filter(function(n){ return n.group===g.id; }), rr=G.length===1?Math.min(250,70+mem.length*9):Math.min(110,34+mem.length*6);
      mem.forEach(function(n,i){ var b=a+(G.length===1?0:Math.PI)+((i+0.5)/mem.length-0.5)*(G.length===1?2*Math.PI:Math.PI*1.1)+(G.length===1?0:Math.PI); P[n.id]={x:gx+rr*Math.cos(b),y:gy+rr*0.85*Math.sin(b)}; }); });
    var out=o.nodes.filter(function(n){ return n.group==="__out"; }); out.forEach(function(n,i){ var a=-Math.PI/2+i*2*Math.PI/Math.max(1,out.length); P[n.id]={x:cx+400*Math.cos(a),y:cy+(Hh/2-40)*Math.sin(a)}; });
    G.forEach(function(g){ o.nodes.filter(function(n){ return n.group===g.id; }).forEach(function(n){ s.push('<line x1="'+g.x.toFixed(1)+'" y1="'+g.y.toFixed(1)+'" x2="'+P[n.id].x.toFixed(1)+'" y2="'+P[n.id].y.toFixed(1)+'" stroke="var(--line-strong)" stroke-width="0.8" stroke-opacity=".5"/>'); }); });
  }
  (o.edges||[]).forEach(function(e){ var a=P[e.a], b=P[e.b]; if(!a||!b) return; s.push('<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="'+(e.c||PURPLE)+'" stroke-width="'+(e.w||1.5)+'"'+(e.dash?' stroke-dasharray="5 4"':'')+' stroke-opacity=".85"><title>'+hE(e.t||"")+'</title></line>'); });
  (o.groups||[]).forEach(function(g){ if(g.x===undefined) return; s.push('<circle cx="'+g.x.toFixed(1)+'" cy="'+g.y.toFixed(1)+'" r="'+(g.r||22)+'" fill="'+(g.fill||"#6d4a9c")+'" fill-opacity=".85" stroke="var(--ink-2)" stroke-width="1.5"/><text x="'+g.x.toFixed(1)+'" y="'+(g.y+(g.r||22)+13).toFixed(1)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink)">'+hE(g.label.length>26?g.label.slice(0,25)+"\u2026":g.label)+'</text>'+(g.inner?'<text x="'+g.x.toFixed(1)+'" y="'+(g.y+4).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">'+hE(g.inner)+'</text>':'')); });
  o.nodes.forEach(function(n){ var p=P[n.id]; if(!p) return; s.push('<circle data-tear="'+hE(n.id)+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(n.r||8).toFixed(1)+'" fill="'+n.c+'" fill-opacity="'+(n.o||0.9)+'" stroke="'+(n.ring||"var(--surface)")+'" stroke-width="'+(n.ring?2.5:1)+'" style="cursor:pointer"><title>'+hE(n.tip||n.id)+'</title></circle><text x="'+p.x.toFixed(1)+'" y="'+(p.y+(n.r||8)+11).toFixed(1)+'" text-anchor="middle" font-size="'+(n.id===o.ego?12:9.5)+'" font-weight="'+(n.id===o.ego?700:500)+'" fill="var(--ink-2)" pointer-events="none">'+hE(n.id)+'</text>'); });
  (o.legend||[]).forEach(function(l,i){ s.push('<text x="14" y="'+(Hh-12-i*15)+'" font-size="10.5" fill="'+(l.c||"var(--ink-3)")+'">'+hE(l.t)+'</text>'); });
  s.push('</svg>'); return '<div class="chart-scroll hx94plot" style="margin:8px 0">'+s.join("")+'</div>';
}
function secColor(C){ var ks=[]; C.rows.forEach(function(r){ if(ks.indexOf(r.sec)<0) ks.push(r.sec); }); ks.sort(); return function(sec){ return SECCOL[Math.max(0,ks.indexOf(sec))%SECCOL.length]; }; }
function convColor(sc){ return sc>=4?"#ef4444":(sc===3?"#f97316":(sc===2?"#eab308":(sc===1?"#64748b":"#334155"))); }
/* clustered heatmap for a list of names */
function heat(syms,R,title,bloc){
  var n=syms.length, idx=syms.map(function(s,i){ return i; });
  /* simple average linkage for the order */
  var cl=idx.map(function(i){ return [i]; });
  function d(a,b){ var t=0,k=0; a.forEach(function(x){ b.forEach(function(y){ var r=R[x+","+y]; t+=1-(num(r)?r:0); k++; }); }); return t/k; }
  var blocs=[];
  while(cl.length>1){ var bi=0,bj=1,bd=Infinity; for(var i=0;i<cl.length;i++) for(var j=i+1;j<cl.length;j++){ var x=d(cl[i],cl[j]); if(x<bd){ bd=x; bi=i; bj=j; } } var m=cl[bi].concat(cl[bj]); if(bd<=0.5&&m.length>=2) blocs=blocs.filter(function(b){ return !(b.every(function(z){ return m.indexOf(z)>=0; })); }).concat([m]); cl.splice(bj,1); cl[bi]=m; }
  var ord=cl[0], pos={}; ord.forEach(function(x,k){ pos[x]=k; });
  var cell=Math.max(9,Math.min(26,860/Math.max(1,n))), lab=58, W=lab+n*cell, fs=Math.max(7,Math.min(11,cell*0.45));
  var s=['<svg viewBox="0 0 '+W+' '+(W+22)+'" role="img" aria-label="'+hE(title)+'" style="width:100%;height:auto;max-width:'+Math.round(Math.max(480,W*1.3))+'px;display:block;background:var(--surface)">'];
  s.push('<text x="4" y="14" font-size="12" font-weight="700" fill="var(--ink)">'+hE(title)+'</text>');
  var y0=22;
  ord.forEach(function(x,k){ s.push('<text data-tear="'+hE(syms[x])+'" x="'+(lab-3)+'" y="'+(y0+lab+k*cell+cell/2+fs/3).toFixed(1)+'" text-anchor="end" font-size="'+fs.toFixed(1)+'" fill="var(--ink-2)" style="cursor:pointer">'+hE(syms[x])+'</text><text data-tear="'+hE(syms[x])+'" transform="translate('+(lab+k*cell+cell/2+fs/3).toFixed(1)+','+(y0+lab-3)+') rotate(-90)" font-size="'+fs.toFixed(1)+'" fill="var(--ink-2)" style="cursor:pointer">'+hE(syms[x])+'</text>'); });
  for(var a=0;a<n;a++) for(var b=0;b<n;b++){ var r=a===b?null:R[ord[a]+","+ord[b]], fill=a===b?"var(--sunken)":(!num(r)?"var(--panel)":"color-mix(in srgb,"+cssv(r>=0?"--pos":"--neg")+" "+(Math.min(1,Math.abs(r))*85).toFixed(0)+"%, var(--surface))");
    s.push('<rect x="'+(lab+b*cell).toFixed(1)+'" y="'+(y0+lab+a*cell).toFixed(1)+'" width="'+cell.toFixed(1)+'" height="'+cell.toFixed(1)+'" fill="'+fill+'" stroke="var(--surface)" stroke-width="0.5"><title>'+hE(syms[ord[a]]+" \u00D7 "+syms[ord[b]]+(num(r)?": "+r.toFixed(2):""))+'</title></rect>');
    if(cell>=22&&num(r)) s.push('<text x="'+(lab+b*cell+cell/2).toFixed(1)+'" y="'+(y0+lab+a*cell+cell/2+3).toFixed(1)+'" text-anchor="middle" font-size="8" fill="var(--ink)" pointer-events="none">'+r.toFixed(2)+'</text>'); }
  blocs.forEach(function(m){ var ks=m.map(function(x){ return pos[x]; }), st=Math.min.apply(null,ks), en=Math.max.apply(null,ks); if(en-st+1!==m.length) return; s.push('<rect x="'+(lab+st*cell).toFixed(1)+'" y="'+(y0+lab+st*cell).toFixed(1)+'" width="'+((en-st+1)*cell).toFixed(1)+'" height="'+((en-st+1)*cell).toFixed(1)+'" fill="none" stroke="var(--accent)" stroke-width="1.8"/>'); });
  s.push('</svg>');
  bloc.list=blocs.map(function(m){ return m.map(function(x){ return syms[x]; }); });
  return '<div class="chart-scroll hx94plot" style="margin:8px 0">'+s.join("")+'</div>';
}

/* ---- parse ---- */
var _qmParseX95=qmParseX;
qmParseX=function(q){
  try{
    var t=qmT(q);
    var kind=/\brelationship (?:map|graph|network|web)\b|\bbehaviou?r (?:map|graph|network)\b|\bnetwork (?:map|graph|view) (?:of|for)\b/.test(t)?"rel":
      (/\b(?:signal )?convergence (?:map|graph|network|view|web)\b|\bsignal convergence (?:of|for|in)\b/.test(t)?"conv":
      (/\bcorrelation (?:matrix|heat ?map|map)\b|\bheat ?map of correlations?\b|\bclustered (?:correlation )?matrix\b/.test(t)?"cm":
      (/\bhidden groups? (?:map|view|picture|drawing)\b|\b(?:map|view|picture|drawing) of (?:the )?hidden groups?\b|\bhidden groups? (?:for|of|in) (?!.*\bcross)/.test(t)&&!/\bwhich hidden group\b/.test(t)?"hg":null)));
    if(kind){
      var C=ctxNow(), tk=A.tickers(q).filter(function(x){ return !new RegExp("\\b"+x.toLowerCase().replace(/[.\-]/g,"\\$&")+" sector\\b").test(t); }), ii=C?qmIndMentions(t,C):[], ss=qmSecMentions(t).inn;
      var tgt=tk.length===1?{t:"sym",v:tk[0]}:(ii.length?{t:"ind",v:ii[0]}:(ss.length?{t:"sec",v:qmSecKey(ss[0])||ss[0]}:(/\ball\b|\bevery\b|\bwhole\b/.test(t)||kind==="hg"?{t:"all"}:null)));
      if(kind==="cm"&&tk.length>=2) return _qmParseX95(q);
      if(tgt) return {kind:"hview",view:kind,target:tgt,win:/\b60\b|\b3 months?\b/.test(t)?60:(/\b126\b|\b6 months?\b/.test(t)?126:252)};
      if(kind!=="hg") return {_err:"Name a ticker, a subsector or a sector, for example \u201Crelationship map of NVDA\u201D, \u201Csignal convergence map of Financials\u201D or \u201Ccorrelation matrix of Energy\u201D."};
    }
  }catch(e){}
  return _qmParseX95(q);
};
QMX_KINDS.hview=1;
var _qmValidateAny95=qmValidateAny;
qmValidateAny=function(raw){ if(!(raw&&raw.kind==="hview")) return _qmValidateAny95(raw); return {spec:JSON.parse(JSON.stringify(raw))}; };
var _qmRunX95=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hview")) return _qmRunX95(spec,ctx,res,t0);
  var h=H(), by={}; ctx.rows.forEach(function(r){ by[r.sym]=r; });
  function fin(n){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> \u00D7 <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=n; res.ms=Date.now()-t0; return res; }
  function send(list,label){ var it=list.filter(function(s){ return by[s]; }).map(function(s){ return {sym:s,side:"long",w:null}; }); return it.length?{label:label,items:it.slice(0,50)}:null; }
  var T=spec.target, members=[], label="";
  if(T.t==="sym"){ if(!by[T.v]){ res.lead=T.v+" is not in the loaded scan."; return fin(0); } label=T.v; }
  else if(T.t==="ind"){ members=ctx.rows.filter(function(r){ return r.ind===T.v; }).map(function(r){ return r.sym; }); label=T.v; }
  else if(T.t==="sec"){ members=ctx.rows.filter(function(r){ return r.sec===T.v; }).map(function(r){ return r.sym; }); label=qmSecName(T.v); }
  else label="all";
  var colS=secColor(ctx);
  var toTab={rel:"tab-ng",conv:"tab-cg",cm:"tab-cm",hg:"tab-hg"}[spec.view];
  var btn='<p style="margin:2px 0 8px"><button type="button" class="btn ghost" data-goto="'+toTab+'">Open the full '+({rel:"Relationship map",conv:"Signal convergence map",cm:"Correlation matrix",hg:"Hidden Groups"})[spec.view]+' tab</button> <span class="mini">Dots and labels open tear sheets; the drawing has a Save as PNG button.</span></p>';

  if(spec.view==="rel"){
    var NBm=behaviourNb(4), nodes=[], edges=[], rows=[];
    if(T.t==="sym"){
      var me=T.v, set={}; set[me]=1; var list=[];
      (NBm[me]||[]).forEach(function(s){ if(!set[s]){ set[s]=1; list.push({s:s,k:"behaves like it"}); } });
      Object.keys(NBm).forEach(function(s){ if((NBm[s]||[]).indexOf(me)>=0&&!set[s]){ set[s]=1; list.push({s:s,k:"names it as a look-alike"}); } });
      if(by[me].peer&&!set[by[me].peer]&&by[by[me].peer]){ set[by[me].peer]=1; list.push({s:by[me].peer,k:"closest return peer (60 bars)"}); }
      if(h){ var mr=retsW(me,252), best=[]; ctx.rows.forEach(function(r){ if(r.sym===me) return; var c=pc(mr,retsW(r.sym,252)); if(num(c)) best.push({s:r.sym,c:c}); }); best.sort(function(p,q2){ return q2.c-p.c; }); best.slice(0,4).forEach(function(b){ if(!set[b.s]){ set[b.s]=1; list.push({s:b.s,k:"moves with it (252-bar correlation "+b.c.toFixed(2)+")",far:true}); } }); }
      nodes.push({id:me,c:colS(by[me].sec),r:14,ring:"var(--accent)",tip:me+" \u2013 "+qmSecName(by[me].sec)});
      list.forEach(function(x){ var r=by[x.s]; nodes.push({id:x.s,c:colS(r.sec),r:9,far:x.far,tip:x.s+" \u2013 "+qmSecName(r.sec)+" / "+r.ind+": "+x.k}); edges.push({a:me,b:x.s,c:/moves/.test(x.k)?"#14b8a6":(/peer/.test(x.k)?"#f59e0b":PURPLE),dash:/moves/.test(x.k),w:1.8,t:x.k}); rows.push([x.s,x.k,qmSecName(r.sec)+(r.sec!==by[me].sec?" (other sector)":""),r.ind]); });
      for(var i=0;i<list.length;i++) for(var j=i+1;j<list.length;j++){ var a=list[i].s,b=list[j].s; if((NBm[a]||[]).indexOf(b)>=0||(NBm[b]||[]).indexOf(a)>=0) edges.push({a:a,b:b,c:"var(--line-strong)",w:1,t:a+" and "+b+" also behave alike"}); }
      res.hxPlot=network({title:"Relationship map of "+me+" (behaviour look-alikes, return peer, price partners)",ego:me,nodes:nodes,edges:edges,legend:[{t:"Purple: behaviour look-alike (nine scan features)  \u00b7  amber: RealTest's closest return peer  \u00b7  teal dashed: price partner from the part E history",c:"var(--ink-3)"},{t:"Colour = sector",c:"var(--ink-3)"}]})+btn;
      res.lead="<b>"+me+"</b>'s relationship map: "+list.length+" connected names, "+list.filter(function(x){ return by[x.s].sec!==by[me].sec; }).length+" of them in other sectors.";
      res.table={head:["Symbol","Link","Sector","Subsector"],align:["l","l","l","l"],body:rows};
      res.send=send([me].concat(list.map(function(x){ return x.s; })),"relationship map of "+me); return fin(rows.length);
    }
    if(T.t==="all"){ res.lead="The full relationship map has every stock; open the Relationship map tab, or ask for a sector, a subsector or a ticker (for example \u201Crelationship map of Energy\u201D)."; res.hxPlot=btn; return fin(0); }
    var inSet={}; members.forEach(function(s){ inSet[s]=1; });
    var groups=[], gi={}; members.forEach(function(s){ var g=T.t==="sec"?by[s].ind:T.v; if(gi[g]===undefined){ gi[g]=groups.length; groups.push({id:g,label:g,r:T.t==="sec"?16:26}); } });
    var outside={};
    members.forEach(function(s){ nodes.push({id:s,group:T.t==="sec"?by[s].ind:T.v,c:colS(by[s].sec),r:7,tip:s+" \u2013 "+by[s].ind}); (NBm[s]||[]).forEach(function(o){ if(inSet[o]){ if(s<o||(NBm[o]||[]).indexOf(s)<0) edges.push({a:s,b:o,w:1.4,t:s+" and "+o+" behave alike"}); } else if(by[o]){ outside[o]=(outside[o]||[]).concat([s]); } }); });
    if(T.t==="ind") Object.keys(outside).slice(0,24).forEach(function(o){ nodes.push({id:o,group:"__out",c:colS(by[o].sec),r:6,o:0.6,tip:o+" \u2013 "+qmSecName(by[o].sec)+" / "+by[o].ind+" (outside)"}); outside[o].forEach(function(s){ edges.push({a:s,b:o,c:"var(--ink-3)",dash:true,w:1,t:s+" behaves like "+o+" (outside "+T.v+")"}); }); });
    res.hxPlot=network({title:"Relationship map of "+label+" (behaviour look-alikes)",groups:groups,nodes:nodes,edges:edges,h:T.t==="sec"?700:600,legend:[{t:"Lines: two names behave alike (among each other's four closest on the nine scan features)"+(T.t==="ind"?"; dashed: look-alikes outside the subsector":""),c:"var(--ink-3)"}]})+btn;
    members.forEach(function(s){ var nbr=NBm[s]||[]; rows.push([s,by[s].ind,nbr.filter(function(o){ return inSet[o]; }).join(" ")||"\u2013",nbr.filter(function(o){ return !inSet[o]&&by[o]; }).map(function(o){ return o+" ("+qmSecName(by[o].sec)+")"; }).join(", ")||"\u2013"]); });
    var outN=members.filter(function(s){ return (NBm[s]||[]).some(function(o){ return !inSet[o]; }); }).length;
    res.lead="Relationship map of <b>"+hE(label)+"</b>: "+members.length+" names; "+outN+" of them have look-alikes outside "+(T.t==="sec"?"the sector":"the subsector")+".";
    res.table={head:["Symbol","Subsector","Look-alikes inside","Look-alikes outside"],align:["l","l","l","l"],body:rows};
    res.send=send(members,"relationship map of "+label); return fin(rows.length);
  }
  if(spec.view==="conv"){
    var list2=T.t==="sym"?ctx.rows.filter(function(r){ return r.ind===by[T.v].ind; }).map(function(r){ return r.sym; }):(T.t==="all"?[]:members);
    if(T.t==="all"){ res.lead="The full Signal convergence map has every stock; open that tab, or ask for a sector, a subsector or a ticker."; res.hxPlot=btn; return fin(0); }
    var info=list2.map(function(s){ var c=conv(s); return {s:s,sc:c?c.score:0,fl:c?Object.keys(FL).filter(function(k){ return c.flags[k]; }).map(function(k){ return FL[k]; }):[]}; });
    var groups2=[], gi2={}; info.forEach(function(x){ var g=T.t==="sec"?by[x.s].ind:by[x.s].ind; if(gi2[g]===undefined){ gi2[g]=groups2.length; var mem=info.filter(function(y){ return by[y.s].ind===g; }), avg=mem.reduce(function(a,y){ return a+y.sc; },0)/mem.length; groups2.push({id:g,label:g,r:T.t==="sec"?15+avg*3:26,inner:avg.toFixed(1),fill:convColor(Math.round(avg))}); } });
    var nodes2=info.map(function(x){ return {id:x.s,group:by[x.s].ind,c:convColor(x.sc),r:5+x.sc*2.2,ring:x.s===T.v?"var(--accent)":null,tip:x.s+": "+x.sc+" of 6 lenses"+(x.fl.length?" ("+x.fl.join(", ")+")":"")}; });
    res.hxPlot=network({title:"Signal convergence map of "+(T.t==="sym"?T.v+"'s subsector ("+by[T.v].ind+")":label)+": how many of the six lenses flag each name",groups:groups2,nodes:nodes2,edges:[],h:T.t==="sec"?680:560,legend:[{t:"Dot size and colour = lenses flagging (grey 0-1, yellow 2, orange 3, red 4+); the number in each subsector circle is its average",c:"var(--ink-3)"}]})+btn;
    info.sort(function(p,q2){ return q2.sc-p.sc; });
    var me2=T.t==="sym"?info.filter(function(x){ return x.s===T.v; })[0]:null;
    res.lead=T.t==="sym"?"<b>"+T.v+"</b>: "+me2.sc+" of the six Signal convergence lenses flag it"+(me2.fl.length?" ("+me2.fl.join(", ")+")":"")+". Its subsector "+by[T.v].ind+" is drawn around it for comparison.":"Signal convergence map of <b>"+hE(label)+"</b>: "+info.filter(function(x){ return x.sc>=3; }).length+" of "+info.length+" names have 3 or more lenses flagging (signals converge).";
    res.table={head:["Symbol","Lenses flagging","Which lenses","Subsector"],align:["l","r","l","l"],body:info.map(function(x){ return [x.s,String(x.sc),x.fl.join(", ")||"\u2013",by[x.s].ind]; })};
    res.notes.push("The six lenses are the Signal convergence tab's: Trend age (fresh or stale trend), Structural drift, Momentum shape (reversing), Structure map (cluster balance and distance agree), Anomaly (above the universe mean) and Attention (3 or more attention flags). Convergence is a count, not a direction.");
    res.send=send(info.map(function(x){ return x.s; }),"convergence of "+label); return fin(info.length);
  }
  if(spec.view==="cm"){
    if(!h){ res.lead="A correlation matrix is drawn from the daily price history (part E), which is not loaded in this view."; return fin(0); }
    var list3=T.t==="sym"?ctx.rows.filter(function(r){ return r.ind===by[T.v].ind; }).map(function(r){ return r.sym; }):members;
    if(T.t==="all"){ res.lead="For every stock, open the Correlation matrix tab (the hierarchical clusters map). Ask for a sector or a subsector to draw it here."; res.hxPlot=btn; return fin(0); }
    list3=list3.filter(function(s){ return h.syms[s]; }); if(list3.length>90){ res.notes.push("The sector has "+list3.length+" names; the 90 with the highest strength percentile are drawn."); list3=list3.sort(function(p,q2){ return (by[q2].str||0)-(by[p].str||0); }).slice(0,90); }
    if(list3.length<2){ res.lead="Need at least two names with price history."; return fin(0); }
    var R3=corrMat(list3,spec.win), bl={}, pairs=[];
    for(var a3=0;a3<list3.length;a3++) for(var b3=a3+1;b3<list3.length;b3++){ var r3=R3[a3+","+b3]; if(num(r3)) pairs.push({a:list3[a3],b:list3[b3],r:r3}); }
    pairs.sort(function(p,q2){ return q2.r-p.r; }); var av=pairs.length?pairs.reduce(function(s2,p){ return s2+p.r; },0)/pairs.length:null;
    res.hxPlot=heat(list3,R3,"Correlation matrix of "+(T.t==="sym"?by[T.v].ind:label)+", "+spec.win+" bars, clustered (outlined: blocs averaging 0.50 or more)",bl)+btn;
    res.lead="Correlation matrix of <b>"+hE(T.t==="sym"?by[T.v].ind:label)+"</b> ("+list3.length+" names, "+spec.win+" bars): average pairwise correlation <b>"+qmN(av,2)+"</b>; "+bl.list.length+" blocs outlined.";
    res.table={head:["Pair","Correlation","Subsectors"],align:["l","r","l"],body:pairs.slice(0,12).concat(pairs.length>17?pairs.slice(-5):[]).map(function(p){ return [p.a+" \u2013 "+p.b,qmN(p.r,3),by[p.a].ind+(by[p.a].ind!==by[p.b].ind?" / "+by[p.b].ind:"")]; })};
    if(bl.list.length) res.notes.push("Blocs (average correlation 0.50 or more): "+bl.list.map(function(m){ return m.join(" "); }).join(" | ")+".");
    res.notes.push("The table lists the 12 most correlated pairs, then the 5 least. Hover a cell for the pair; click a name for its tear sheet. Say \u201C60 bars\u201D or \u201C6 months\u201D for another window.");
    res.send=send(list3,"correlation matrix of "+label); return fin(list3.length);
  }
  if(spec.view==="hg"){
    var Rg=null; try{ Rg=relClusters("stocks",0.6); }catch(e){ Rg=null; }
    if(!Rg){ res.lead="Hidden Groups need the Unified v4 scan."; return fin(0); }
    var cls=Rg.clusters.filter(function(c){ if(T.t==="all") return true; return c.members.some(function(r){ return T.t==="sym"?r.sym===T.v:(T.t==="ind"?r.ind===T.v:r.sec===T.v); }); });
    if(!cls.length){ res.lead=(T.t==="sym"?T.v+" is in no Hidden Group":"No Hidden Group touches "+hE(label))+" at a link strength of 0.60."; res.hxPlot=btn; return fin(0); }
    var show=cls.slice(0,T.t==="all"?24:12), cols=3, cw=300, chh=240, rowsN=Math.ceil(show.length/cols), W4=cols*cw, H4=rowsN*chh+30;
    var s4=['<svg viewBox="0 0 '+W4+' '+H4+'" role="img" aria-label="Hidden groups" style="width:100%;height:auto;max-width:1000px;display:block;background:var(--surface)"><text x="12" y="18" font-size="13" font-weight="700" fill="var(--ink)">Hidden Groups '+(T.t==="all"?"(the first "+show.length+" of "+cls.length+")":"touching "+hE(label))+', links of 0.60 or more</text>'];
    show.forEach(function(c,i){ var col=i%cols, row=Math.floor(i/cols), gx=col*cw+cw/2, gy=30+row*chh+chh/2+6, n=c.members.length, Rr=Math.min(86,24+n*7), P4={};
      s4.push('<rect x="'+(col*cw+6)+'" y="'+(30+row*chh+2)+'" width="'+(cw-12)+'" height="'+(chh-8)+'" rx="10" fill="'+(c.nSec>1?"var(--accent-soft)":"var(--panel)")+'" stroke="'+(c.nSec>1?"var(--accent)":"var(--line-strong)")+'"/><text x="'+(col*cw+16)+'" y="'+(30+row*chh+20)+'" font-size="11" font-weight="600" fill="var(--ink)">Group '+c.id+': '+n+' names'+(c.nSec>1?", "+c.nSec+" sectors":"")+'</text>');
      c.members.forEach(function(r,j){ var th=-Math.PI/2+j*2*Math.PI/n; P4[r.sym]={x:gx+Rr*Math.cos(th),y:gy+Rr*Math.sin(th)}; });
      c.edges.forEach(function(e){ var a=P4[e.a], b=P4[e.b]; if(a&&b) s4.push('<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="var(--ink-3)" stroke-width="'+(1+Math.max(0,e.v-0.4)*4).toFixed(1)+'" opacity=".6"/>'); });
      c.members.forEach(function(r){ var p=P4[r.sym], me=T.t==="sym"&&r.sym===T.v; s4.push('<circle data-tear="'+hE(r.sym)+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(me?13:10)+'" fill="'+colS(r.sec)+'" stroke="'+(me?"var(--accent)":"var(--surface)")+'" stroke-width="'+(me?3:1)+'" style="cursor:pointer"><title>'+hE(r.sym+" \u2013 "+qmSecName(r.sec)+" / "+r.ind)+'</title></circle><text x="'+p.x.toFixed(1)+'" y="'+(p.y+3.5).toFixed(1)+'" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" pointer-events="none">'+hE(r.sym.slice(0,4))+'</text>'); }); });
    s4.push('</svg>');
    res.hxPlot='<div class="chart-scroll hx94plot" style="margin:8px 0">'+s4.join("")+'</div>'+btn;
    res.lead=(T.t==="all"?"All Hidden Groups: <b>"+cls.length+"</b> groups, "+cls.filter(function(c){ return c.nSec>1; }).length+" crossing sectors.":"Hidden Groups touching <b>"+hE(label)+"</b>: "+cls.length+" group"+(cls.length===1?"":"s")+", "+cls.filter(function(c){ return c.nSec>1; }).length+" crossing sectors.")+" Each group joins names whose closest 60-day return peer links them (0.60 or more); dots are coloured by sector.";
    res.table={head:["Group","Members","Sectors","Type","Avg link"],align:["r","l","l","l","r"],body:cls.map(function(c){ return [String(c.id),c.members.map(function(r){ return r.sym; }).join(" "),Object.keys(c.secs).map(function(k){ return qmSecName(k)+" "+c.secs[k]; }).join(", "),c.nSec>1?"crosses sectors":"one sector",qmN(c.avgV,2)]; })};
    res.table.head[1]="Members";
    var ss4=[]; cls.forEach(function(c){ c.members.forEach(function(r){ ss4.push(r.sym); }); }); res.send=send(ss4.filter(function(x,i,a4){ return a4.indexOf(x)===i; }),"hidden groups"); return fin(cls.length);
  }
  return fin(0);
};
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Maps in the answer: {\"kind\":\"hview\",\"view\":\"rel\"|\"conv\"|\"cm\"|\"hg\",\"target\":{\"t\":\"sym\"|\"ind\"|\"sec\"|\"all\",\"v\":...},\"win\":60|126|252}\n\nQ: "); }catch(e){}
}catch(e){ try{ console.warn("v95 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
