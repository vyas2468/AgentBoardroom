/* ================= v88: hierarchical clusters map (Alex-style), matrix legends and PNG downloads =================
   1. Correlation Matrix tab: a new "Hierarchical clusters map" block: every scan stock's daily-return correlation (YTD by default),
      ordered by average-linkage clustering, numbers in the cells, directional blocks outlined (lime = the block moved up together over
      the window, orange = down together), Find, Reset view, step through the blocks, and PNG downloads (the visible view at 3x, or the whole map).
      Drawn on a canvas that only paints what is on screen, so 500+ names stay fast.
   2. Ask the terminal: "which clusters are rising together", "directional blocks", "hierarchical clusters", "which cluster is NVDA in".
   3. A colour legend and a "Save as PNG (3x)" button for the severity matrix, the price matrix and the sector matrix,
      and "Save view as PNG (3x)" for the Subsector Web, exactly as selected.
   All new elements; nothing existing is redrawn or changed. */
(function(){
try{
var A=window.__hxApi; if(!A||!A.last) return;
function H(){ try{ return A.get(); }catch(e){ return null; } }
function num(v){ return v!==null&&v!==undefined&&!isNaN(v); }
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function barDate(){ try{ return (typeof U!=="undefined"&&U&&U.date)?U.date:""; }catch(e){ return ""; } }
function segHtml(id,vals,labs,on){ return '<div class="seg" id="'+id+'">'+vals.map(function(v,i){ return '<button type="button" data-v="'+v+'" aria-pressed="'+(String(v)===String(on))+'">'+labs[i]+'</button>'; }).join("")+'</div>'; }
function segWire(id,fn){ $$("#"+id+" button").forEach(function(b){ b.addEventListener("click",function(){ $$("#"+id+" button").forEach(function(x){ x.setAttribute("aria-pressed",String(x===b)); }); fn(b.dataset.v); }); }); }
function pngBtn(label,title,fn){ var b=document.createElement("button"); b.type="button"; b.className="btn ghost"; b.textContent=label; b.title=title; b.addEventListener("click",function(){ try{ fn(b); }catch(e){} }); return b; }

/* ---------------- colours (canvas needs plain rgb) ---------------- */
var CTX0=document.createElement("canvas").getContext("2d");
function rgb(c,fb){ try{ CTX0.fillStyle="#000"; CTX0.fillStyle=c; var v=CTX0.fillStyle; if(v.charAt(0)==="#"&&v.length===7) return [parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];
  var m=v.match(/rgba?\(([^)]+)\)/); if(m){ var p=m[1].split(",").map(parseFloat); return [p[0],p[1],p[2]]; } }catch(e){} return fb; }
function pal(){ return {pos:rgb(cssv("--pos"),[20,184,166]),neg:rgb(cssv("--neg"),[220,80,70]),bg:rgb(cssv("--surface"),[24,26,30]),ink:cssv("--ink")||"#eee",ink2:cssv("--ink-2")||"#bbb",ink3:cssv("--ink-3")||"#888",line:cssv("--line-strong")||"#555",sunk:cssv("--sunken")||"#111",acc:cssv("--accent")||"#e0a800"}; }
function mix(a,b,t){ return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
function heatRGB(P,r){ if(!num(r)) return P.bg; return mix(P.bg,r>=0?P.pos:P.neg,Math.min(1,Math.abs(r))*0.85); }
function lum(c){ return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
var LIME="#a3e635", ORANGE="#fb923c";
/* legend strip (svg) from -1 to +1 in the page's own colours */
function legendSvg(extra){
  var W=360,Hh=34, s=['<svg viewBox="0 0 '+W+' '+Hh+'" style="width:100%;max-width:360px;height:auto;display:block" role="img" aria-label="Colour scale: red is negative correlation, teal positive">','<defs><linearGradient id="hx88g'+(extra||"")+'" x1="0" x2="1"><stop offset="0" stop-color="color-mix(in srgb,var(--neg) 85%, var(--surface))"/><stop offset="0.5" stop-color="var(--surface)"/><stop offset="1" stop-color="color-mix(in srgb,var(--pos) 85%, var(--surface))"/></linearGradient></defs>'];
  s.push('<rect x="10" y="4" width="'+(W-20)+'" height="12" rx="3" fill="url(#hx88g'+(extra||"")+')" stroke="var(--line-strong)" stroke-width="0.6"/>');
  [["-1",10],["-0.5",10+(W-20)*0.25],["0",W/2],["+0.5",10+(W-20)*0.75],["+1",W-10]].forEach(function(t){ s.push('<text x="'+t[1]+'" y="30" text-anchor="middle" font-size="10" fill="var(--ink-2)">'+t[0]+'</text>'); });
  s.push('</svg>'); return s.join("");
}
function legendHtml(id,note){ return '<div id="'+id+'" style="display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;margin:6px 0 2px;font-size:12px;color:var(--ink-2)"><div style="flex:0 1 360px">'+legendSvg(id)+'</div><div>'+note+'</div></div>'; }

/* ================= 1. the clusters map ================= */
var CM={win:"ytd",cell:36,cut:0.263,dir:true,hi:null,blk:-1,data:{}};
try{ var sv=JSON.parse(localStorage.getItem("alexaligned.hcmap")||"{}"); if(sv.win) CM.win=sv.win; if(sv.cell) CM.cell=sv.cell; if(sv.cut) CM.cut=sv.cut; if(sv.dir===false) CM.dir=false; }catch(e){}
function saveCM(){ try{ localStorage.setItem("alexaligned.hcmap",JSON.stringify({win:CM.win,cell:CM.cell,cut:CM.cut,dir:CM.dir})); }catch(e){} }
function winRange(win){ var h=H(), L=h.dates.length-1, a; if(win==="ytd"){ var yb=A.ytdBase(); a=yb>=0?yb:L-252; } else a=L-(+win); return {a:Math.max(0,a),L:L}; }
function winLab(win){ return win==="ytd"?"YTD":(win+" bars"); }
function build(win){
  var h=H(); if(!h) return null; var key=String(h.savedAt)+"|"+h.dates.length+"|"+win; if(CM.data[key]) return CM.data[key];
  var C=null; try{ C=QM_CTX&&QM_CTX.rows?QM_CTX:qmBuildCtx(); }catch(e){} if(!C) return null;
  var R=winRange(win), a=R.a, L=R.L, w=L-a; if(w<20) return null;
  var names=[], Z=[], rets=[];
  C.rows.forEach(function(r){ var c=h.syms[r.sym]; if(!c) return; var v=new Array(w), ok=true, m=0; for(var i=0;i<w;i++){ var x=A.ret(c,a+1+i); if(x===null){ ok=false; break; } v[i]=x; m+=x; } if(!ok) return;
    m/=w; var ss=0; for(var k=0;k<w;k++) ss+=(v[k]-m)*(v[k]-m); ss=Math.sqrt(ss); if(!(ss>0)) return; for(var k2=0;k2<w;k2++) v[k2]=(v[k2]-m)/ss;
    names.push({sym:r.sym,sec:r.sec,ind:r.ind,ret:(c[L]/c[a]-1)*100}); Z.push(v); });
  var n=names.length, Rm=new Float32Array(n*n), i,j,t;
  for(i=0;i<n;i++){ Rm[i*n+i]=1; var zi=Z[i]; for(j=i+1;j<n;j++){ var zj=Z[j], d=0; for(t=0;t<w;t++) d+=zi[t]*zj[t]; Rm[i*n+j]=d; Rm[j*n+i]=d; } }
  /* average linkage, Lance-Williams update on distance 1 - r */
  var D=new Float64Array(n*n); for(i=0;i<n*n;i++) D[i]=1-Rm[i];
  var act=new Uint8Array(n), sz=new Int32Array(n), node=new Array(n), nodes=[];
  for(i=0;i<n;i++){ act[i]=1; sz[i]=1; node[i]={leaf:i,size:1,h:0,ord:[i]}; }
  for(var step=0;step<n-1;step++){
    var bi=-1,bj=-1,bd=Infinity;
    for(i=0;i<n;i++){ if(!act[i]) continue; var row=i*n; for(j=i+1;j<n;j++){ if(act[j]&&D[row+j]<bd){ bd=D[row+j]; bi=i; bj=j; } } }
    if(bi<0) break;
    var si=sz[bi], sj=sz[bj];
    for(var k=0;k<n;k++){ if(!act[k]||k===bi||k===bj) continue; var v2=(si*D[bi*n+k]+sj*D[bj*n+k])/(si+sj); D[bi*n+k]=v2; D[k*n+bi]=v2; }
    var nd={l:node[bi],r:node[bj],size:si+sj,h:bd,ord:node[bi].ord.concat(node[bj].ord)}; node[bi].p=nd; node[bj].p=nd; nodes.push(nd);
    node[bi]=nd; sz[bi]=si+sj; act[bj]=0;
  }
  var root=nodes.length?nodes[nodes.length-1]:node[0], ord=root.ord, pos=new Int32Array(n); ord.forEach(function(x,k){ pos[x]=k; });
  var out={names:names,n:n,R:Rm,ord:ord,pos:pos,nodes:nodes,w:w,a:a,L:L,win:win,blocks:{}};
  CM.data[key]=out; return out;
}
/* maximal dendrogram nodes of at least 3 names whose merge distance is within the cutoff; directional when every member moved the same way */
function blocks(M,cut){
  if(M.blocks[cut]) return M.blocks[cut];
  var out=[];
  M.nodes.forEach(function(nd){ if(nd.size<3||nd.h>cut) return; if(nd.p&&nd.p.h<=cut) return;
    var mem=nd.ord, st=Infinity, en=-1; mem.forEach(function(x){ var p=M.pos[x]; if(p<st) st=p; if(p>en) en=p; });
    var up=0,dn=0,tr=0; mem.forEach(function(x){ var r=M.names[x].ret; if(r>0) up++; else if(r<0) dn++; tr+=r; });
    var s=0,k=0; for(var a=0;a<mem.length;a++) for(var b=a+1;b<mem.length;b++){ s+=M.R[mem[a]*M.n+mem[b]]; k++; }
    var secs={}; mem.forEach(function(x){ secs[M.names[x].sec]=(secs[M.names[x].sec]||0)+1; });
    out.push({up:up,dn:dn,st:st,en:en,size:mem.length,mem:mem,dir:up===mem.length?"rising":(dn===mem.length?"falling":"mixed"),avg:k?s/k:null,ret:tr/mem.length,h:nd.h,secs:secs}); });
  out.sort(function(p,q){ return p.st-q.st; });
  M.blocks[cut]=out; return out;
}
function dirBlocks(M){ return blocks(M,CM.cut).filter(function(b){ return b.dir!=="mixed"; }); }
/* read-only access for v94 (portfolios built from the clusters): flat groups at a distance cut, and the blocks */
function flatAt(M,cut){ var g=new Int32Array(M.n), id=0, i; for(i=0;i<M.n;i++) g[i]=-1;
  M.nodes.forEach(function(nd){ if(nd.h>cut) return; if(nd.p&&nd.p.h<=cut) return; nd.ord.forEach(function(x){ g[x]=id; }); id++; });
  for(i=0;i<M.n;i++) if(g[i]<0) g[i]=id++; return g; }
try{ window.__hxClusters={build:function(w){ return build(w); },blocks:function(M,cut){ return blocks(M,cut); },flat:flatAt}; }catch(e){}

/* drawing: (x0,y0) = top-left of the view in map pixels; the header bands stay fixed */
function draw(g,M,x0,y0,vw,vh,cell,lab,P,opts){
  opts=opts||{}; var n=M.n, fs=Math.max(7,Math.min(11,cell*0.34)), lf=Math.max(7,Math.min(12,cell*0.36));
  g.fillStyle="rgb("+P.bg.join(",")+")"; g.fillRect(0,0,vw,vh);
  var i0=Math.max(0,Math.floor(y0/cell)), i1=Math.min(n-1,Math.ceil((y0+vh-lab)/cell)), j0=Math.max(0,Math.floor(x0/cell)), j1=Math.min(n-1,Math.ceil((x0+vw-lab)/cell));
  var showNum=cell>=26, i, j;
  g.textAlign="center"; g.textBaseline="middle"; g.font=fs+"px ui-monospace,Menlo,Consolas,monospace";
  for(i=i0;i<=i1;i++){ var oi=M.ord[i], y=lab+i*cell-y0; for(j=j0;j<=j1;j++){ var oj=M.ord[j], x=lab+j*cell-x0;
    if(i===j){ g.fillStyle=P.sunk; g.fillRect(x,y,cell,cell); if(showNum){ g.fillStyle=P.ink2; g.fillText("1.00",x+cell/2,y+cell/2); } continue; }
    var r=M.R[oi*n+oj], c=heatRGB(P,r); g.fillStyle="rgb("+c.join(",")+")"; g.fillRect(x,y,cell,cell);
    if(cell>=10){ g.strokeStyle="rgba(0,0,0,0.25)"; g.lineWidth=0.5; g.strokeRect(x+0.25,y+0.25,cell-0.5,cell-0.5); }
    if(showNum){ g.fillStyle=lum(c)>150?"#111":"#f2f2f2"; g.fillText(r.toFixed(2),x+cell/2,y+cell/2); } } }
  /* directional blocks */
  if(CM.dir){ dirBlocks(M).forEach(function(b,k){ if(b.en<i0-1&&b.en<j0-1) return; if(b.st>i1+1&&b.st>j1+1) return;
    var x=lab+b.st*cell-x0, y=lab+b.st*cell-y0, s=(b.en-b.st+1)*cell; g.strokeStyle=b.dir==="rising"?LIME:ORANGE; g.lineWidth=k===CM.blk?3.5:2.2; g.strokeRect(x+1,y+1,s-2,s-2); }); }
  if(CM.hi){ var hx=lab+CM.hi.j*cell-x0, hy=lab+CM.hi.i*cell-y0; g.strokeStyle=P.acc; g.lineWidth=3; g.strokeRect(hx+1.5,hy+1.5,cell-3,cell-3);
    g.fillStyle="rgba(224,168,0,0.10)"; g.fillRect(lab,hy,vw-lab,cell); g.fillRect(hx,lab,cell,vh-lab); }
  /* headers */
  g.fillStyle="rgb("+P.bg.join(",")+")"; g.fillRect(0,0,vw,lab); g.fillRect(0,0,lab,vh);
  g.font="600 "+lf+"px -apple-system,Segoe UI,Helvetica,Arial,sans-serif"; g.fillStyle=P.ink2;
  var every=cell>=9?1:Math.ceil(9/cell);
  for(j=j0;j<=j1;j++){ if(j%every) continue; var xx=lab+j*cell-x0+cell/2; if(xx<lab) continue; var sy=M.names[M.ord[j]].sym;
    if(cell>=34){ g.textAlign="center"; g.textBaseline="bottom"; g.fillText(sy,xx,lab-6); }
    else { g.save(); g.translate(xx,lab-4); g.rotate(-Math.PI/2); g.textAlign="left"; g.textBaseline="middle"; g.fillText(sy,0,0); g.restore(); } }
  g.textAlign="right"; g.textBaseline="middle";
  for(i=i0;i<=i1;i++){ if(i%every) continue; var yy=lab+i*cell-y0+cell/2; if(yy<lab) continue; g.fillText(M.names[M.ord[i]].sym,lab-6,yy); }
  g.strokeStyle=P.line; g.lineWidth=1; g.beginPath(); g.moveTo(lab-0.5,0); g.lineTo(lab-0.5,vh); g.moveTo(0,lab-0.5); g.lineTo(vw,lab-0.5); g.stroke();
  if(opts.corner){ g.textAlign="left"; g.textBaseline="top"; g.fillStyle=P.ink3; g.font="10px -apple-system,Segoe UI,Helvetica,Arial,sans-serif"; g.fillText(opts.corner,4,4); }
}
function labW(cell){ return cell>=34?58:(cell>=10?54:40); }
var MAPH=0;
function mapMount(){
  var pane=$("#pane-cm"); if(!pane||$("#hx88Map")) return;
  var el=document.createElement("div"); el.className="block"; el.id="hx88Map"; el.hidden=true;
  el.innerHTML='<div class="block-head"><h2>Hierarchical clusters map (part E price history)</h2><span class="count" id="hx88Note"></span></div>'+
    '<p class="lede">Every stock in the scan against every other: the correlation of their daily returns over the window, ordered by hierarchical clustering (average linkage), so names that move together sit next to each other and form bright squares on the diagonal, the way Alex&rsquo;s map reads. '+
    'The outlines are <strong>directional blocks</strong>: dendrogram nodes of three or more names that merge within the cutoff (average correlation of about '+'<span id="hx88CutR">0.74</span> or more), '+
    'outlined <span style="color:'+LIME+';font-weight:700">lime</span> when every member moved <strong>up</strong> over the window and <span style="color:'+ORANGE+';font-weight:700">orange</span> when every member moved <strong>down</strong>. Mixed blocks are not outlined. Hover a cell for the pair, click it for the tear sheets and a pair test.</p>'+
    '<div class="controls"><div class="ctl-grp"><span class="ctl-lab">Daily return correlation</span>'+segHtml("hx88Win",["ytd","60","126","252"],["YTD","60 bars","126 bars","252 bars"],CM.win)+'</div>'+
    '<div class="ctl-grp"><span class="ctl-lab">Cells</span>'+segHtml("hx88Cell",[36,14,0],["With numbers","Compact","Whole map"],CM.cell)+'</div>'+
    '<div class="ctl-grp"><span class="ctl-lab">Cutoff</span>'+segHtml("hx88Cut",["0.2","0.263","0.35"],["Tight 0.20","0.263","Loose 0.35"],String(CM.cut))+'</div>'+
    '<label class="sw-toggle"><input type="checkbox" id="hx88Dir"'+(CM.dir?" checked":"")+'> Directional clusters</label></div>'+
    '<div class="controls"><input type="text" id="hx88T1" size="8" placeholder="Ticker 1" aria-label="Ticker 1" style="font-family:var(--mono);font-size:12.5px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)">'+
    '<input type="text" id="hx88T2" size="8" placeholder="Ticker 2" aria-label="Ticker 2" style="font-family:var(--mono);font-size:12.5px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)">'+
    '<button class="btn ghost" type="button" id="hx88Find">Find</button><button class="btn ghost" type="button" id="hx88Reset">Reset view</button>'+
    '<span class="ctl-lab" style="margin-left:8px">Blocks</span><button class="btn ghost" type="button" id="hx88Prev" aria-label="Previous block">&lsaquo;</button><span class="num" id="hx88Pos" style="font-size:12px;min-width:48px;text-align:center">&#8211;</span><button class="btn ghost" type="button" id="hx88Next" aria-label="Next block">&rsaquo;</button>'+
    '<span class="count" id="hx88Msg"></span><span id="hx88Png" style="margin-left:auto;display:flex;gap:6px"></span></div>'+
    legendHtml("hx88Leg",'Cell = correlation of daily returns, &minus;1 to +1. <span style="display:inline-block;width:14px;height:10px;border:2px solid '+LIME+';vertical-align:-1px"></span> rising block &nbsp; <span style="display:inline-block;width:14px;height:10px;border:2px solid '+ORANGE+';vertical-align:-1px"></span> falling block &nbsp; <span style="display:inline-block;width:14px;height:10px;border:2px solid var(--accent);vertical-align:-1px"></span> found cell')+
    '<div id="hx88Scroll" style="position:relative;overflow:auto;height:min(78vh,820px);border:1px solid var(--line);border-radius:10px;background:var(--surface)"><div id="hx88Space" style="position:relative"><canvas id="hx88Cv" style="position:absolute;left:0;top:0"></canvas></div></div>'+
    '<p class="lede" id="hx88Info" style="font-size:13px;margin-top:8px"></p>'+
    '<div class="block-head" style="margin-top:10px"><h3>Directional blocks, in map order</h3></div><div class="tbl-scroll"><table id="hx88Tbl"><thead><tr><th>#</th><th style="text-align:left">Members</th><th>Size</th><th style="text-align:left">Direction</th><th>Avg corr.</th><th>Avg return</th><th style="text-align:left">Sectors</th><th></th></tr></thead><tbody></tbody></table></div>'+
    '<p class="mini" style="margin-top:6px">Ask the terminal: <code>Which clusters are rising together?</code> &middot; <code>Falling blocks YTD</code> &middot; <code>Which cluster is NVDA in?</code></p>';
  var price=$("#hx84Cm"); if(price&&price.parentNode===pane) pane.insertBefore(el,price.nextSibling);
  else { var sevSeg=$("#cmMetricSeg"), sb=sevSeg&&sevSeg.closest(".block"); if(sb&&sb.parentNode===pane) pane.insertBefore(el,sb); else pane.appendChild(el); }
  segWire("hx88Win",function(v){ CM.win=v; CM.hi=null; CM.blk=-1; saveCM(); mapDraw(true); });
  segWire("hx88Cell",function(v){ CM.cell=+v; saveCM(); mapDraw(true); });
  segWire("hx88Cut",function(v){ CM.cut=+v; CM.blk=-1; saveCM(); mapDraw(true); });
  $("#hx88Dir").addEventListener("change",function(){ CM.dir=this.checked; CM.blk=-1; saveCM(); mapDraw(true); });
  var sc=$("#hx88Scroll"), tick=null; sc.addEventListener("scroll",function(){ if(tick) return; tick=requestAnimationFrame(function(){ tick=null; paint(); }); },{passive:true});
  addEventListener("resize",function(){ if(!$("#hx88Map").hidden) paint(); });
  function findT(){ var M=cur(); if(!M) return; var a=($("#hx88T1").value||"").trim().toUpperCase(), b=($("#hx88T2").value||"").trim().toUpperCase(), ia=-1, ib=-1;
    M.names.forEach(function(x,k){ if(x.sym===a) ia=M.pos[k]; if(x.sym===b) ib=M.pos[k]; });
    if(ia<0){ $("#hx88Msg").textContent=a?a+" is not in the map (needs a full window of prices).":"Type a ticker."; return; }
    if(b&&ib<0){ $("#hx88Msg").textContent=b+" is not in the map."; return; }
    CM.hi={i:ia,j:ib>=0?ib:ia}; $("#hx88Msg").textContent=""; goTo(CM.hi.i,CM.hi.j); info(CM.hi.i,CM.hi.j); }
  $("#hx88Find").addEventListener("click",findT); ["hx88T1","hx88T2"].forEach(function(id){ $("#"+id).addEventListener("keydown",function(e){ if(e.key==="Enter") findT(); }); });
  $("#hx88Reset").addEventListener("click",function(){ CM.hi=null; CM.blk=-1; $("#hx88Msg").textContent=""; $("#hx88Info").innerHTML=""; sc.scrollTo({left:0,top:0}); mapDraw(false); });
  function step(d){ var M=cur(); if(!M) return; var B=dirBlocks(M); if(!B.length) return; CM.blk=((CM.blk<0?(d>0?-1:0):CM.blk)+d+B.length)%B.length; var b=B[CM.blk]; CM.hi=null; goTo(b.st,b.st,b.en-b.st+1); blockInfo(b,CM.blk,B.length); paint(); }
  $("#hx88Prev").addEventListener("click",function(){ step(-1); }); $("#hx88Next").addEventListener("click",function(){ step(1); });
  var cv=$("#hx88Cv");
  function cellAt(e){ var M=cur(); if(!M) return null; var r=cv.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, cell=curCell(M), lab=labW(cell);
    if(x<lab&&y>=lab){ var i=Math.floor((y-lab+sc.scrollTop)/cell); return i>=0&&i<M.n?{row:i}:null; }
    if(y<lab&&x>=lab){ var j=Math.floor((x-lab+sc.scrollLeft)/cell); return j>=0&&j<M.n?{col:j}:null; }
    if(x<lab||y<lab) return null; var ii=Math.floor((y-lab+sc.scrollTop)/cell), jj=Math.floor((x-lab+sc.scrollLeft)/cell); return (ii>=0&&jj>=0&&ii<M.n&&jj<M.n)?{i:ii,j:jj}:null; }
  cv.addEventListener("mousemove",function(e){ var c=cellAt(e), M=cur(); if(!c||!M){ hideTip(); return; }
    if(c.row!==undefined||c.col!==undefined){ var k=c.row!==undefined?c.row:c.col, nm=M.names[M.ord[k]]; showTip('<div class="t">'+hE(nm.sym)+'</div><dl><dt>Sector</dt><dd>'+hE(secShort(nm.sec))+'</dd><dt>Subsector</dt><dd>'+hE(nm.ind)+'</dd><dt>Return, '+winLab(M.win)+'</dt><dd>'+(nm.ret>0?"+":"")+nm.ret.toFixed(2)+'%</dd></dl>',e.clientX,e.clientY); return; }
    var a=M.names[M.ord[c.i]], b=M.names[M.ord[c.j]], r=M.R[M.ord[c.i]*M.n+M.ord[c.j]];
    showTip('<div class="t">'+hE(a.sym)+' &times; '+hE(b.sym)+'</div><dl><dt>Correlation, '+winLab(M.win)+'</dt><dd>'+r.toFixed(3)+'</dd><dt>Sectors</dt><dd>'+hE(secShort(a.sec))+' / '+hE(secShort(b.sec))+'</dd><dt>Returns</dt><dd>'+(a.ret>0?"+":"")+a.ret.toFixed(1)+'% / '+(b.ret>0?"+":"")+b.ret.toFixed(1)+'%</dd></dl>',e.clientX,e.clientY); });
  cv.addEventListener("mouseleave",hideTip);
  cv.addEventListener("click",function(e){ var c=cellAt(e), M=cur(); if(!c||!M) return; if(c.row!==undefined){ openTear(M.names[M.ord[c.row]].sym); return; } if(c.col!==undefined){ openTear(M.names[M.ord[c.col]].sym); return; } CM.hi={i:c.i,j:c.j}; info(c.i,c.j); paint(); });
  var ph=$("#hx88Png");
  ph.appendChild(pngBtn("Save view as PNG (3×)","The part of the map on screen, three times the on-screen resolution",function(b){ savePng(b,"view"); }));
  ph.appendChild(pngBtn("Save whole map as PNG","Every name, compact cells with labels (large file)",function(b){ savePng(b,"all"); }));
  $("#hx88Info").addEventListener("click",function(e){ var t=e.target.closest?e.target.closest("[data-hx88ask]"):null; if(!t) return; e.preventDefault(); var q=t.getAttribute("data-hx88ask");
    try{ var tb=$("#tab-qry"); if(tb) selectTab(tb); var inp=$("#qmIn")||$("#qmInput")||document.querySelector("#pane-qry textarea,#pane-qry input[type=text]"); if(typeof qmSubmit==="function") qmSubmit(q); else if(inp){ inp.value=q; } }catch(err){} });
}
function cur(){ return build(CM.win); }
function curCell(M){ if(CM.cell>0) return CM.cell; var sc=$("#hx88Scroll"), w=(sc?sc.clientWidth:900)-44; return Math.max(1.5,w/Math.max(1,M.n)); }
function goTo(i,j,span){ var M=cur(); if(!M) return; var sc=$("#hx88Scroll"), cell=curCell(M), lab=labW(cell), s=(span||1)*cell;
  sc.scrollTo({left:Math.max(0,j*cell-(sc.clientWidth-lab-s)/2),top:Math.max(0,i*cell-(sc.clientHeight-lab-s)/2),behavior:"smooth"}); setTimeout(paint,400); }
function info(i,j){ var M=cur(); if(!M) return; var a=M.names[M.ord[i]], b=M.names[M.ord[j]];
  if(i===j){ $("#hx88Info").innerHTML='<strong class="num" data-tear="'+hE(a.sym)+'" style="cursor:pointer">'+hE(a.sym)+'</strong> '+hE(secShort(a.sec))+' / '+hE(a.ind)+' &middot; return '+winLab(M.win)+' '+(a.ret>0?"+":"")+a.ret.toFixed(2)+'%'; return; }
  var r=M.R[M.ord[i]*M.n+M.ord[j]];
  $("#hx88Info").innerHTML='<strong class="num" data-tear="'+hE(a.sym)+'" style="cursor:pointer">'+hE(a.sym)+'</strong> &times; <strong class="num" data-tear="'+hE(b.sym)+'" style="cursor:pointer">'+hE(b.sym)+'</strong>: correlation <strong>'+r.toFixed(3)+'</strong> ('+winLab(M.win)+'), returns '+(a.ret>0?"+":"")+a.ret.toFixed(1)+'% and '+(b.ret>0?"+":"")+b.ret.toFixed(1)+'%. '+
    '<button type="button" class="up-link-btn" data-hx88ask="Pair test '+hE(a.sym)+' '+hE(b.sym)+'">Pair test in Ask</button> <button type="button" class="up-link-btn" data-hx88ask="Give me a diagnostic of '+hE(a.sym)+' '+hE(b.sym)+'">Diagnostic in Ask</button>'; }
function blockInfo(b,k,N){ var M=cur(); $("#hx88Pos").textContent=(k+1)+"/"+N;
  $("#hx88Info").innerHTML='Block '+(k+1)+' of '+N+': <span style="color:'+(b.dir==="rising"?LIME:ORANGE)+';font-weight:700">'+b.dir+'</span> together, '+b.size+' names, average correlation '+(num(b.avg)?b.avg.toFixed(2):"&#8211;")+', average return '+(b.ret>0?"+":"")+b.ret.toFixed(1)+'% ('+winLab(M.win)+'): '+
    b.mem.slice().sort(function(x,y){ return M.pos[x]-M.pos[y]; }).map(function(x){ return '<strong class="num" data-tear="'+hE(M.names[x].sym)+'" style="cursor:pointer">'+hE(M.names[x].sym)+'</strong>'; }).join(" ")+
    ' <button type="button" class="up-link-btn" data-hx88ask="Give me a diagnostic of '+b.mem.map(function(x){ return hE(M.names[x].sym); }).join(" ")+'">Diagnostic in Ask</button>'; }
function paint(){
  var M=cur(), sc=$("#hx88Scroll"), cv=$("#hx88Cv"), sp=$("#hx88Space"); if(!M||!sc||!cv) return;
  var cell=curCell(M), lab=labW(cell), full=lab+M.n*cell, vw=sc.clientWidth, vh=sc.clientHeight, dpr=Math.min(2,window.devicePixelRatio||1);
  sp.style.width=Math.max(vw,full)+"px"; sp.style.height=Math.max(vh,full)+"px";
  cv.style.left=sc.scrollLeft+"px"; cv.style.top=sc.scrollTop+"px"; cv.style.width=vw+"px"; cv.style.height=vh+"px";
  if(cv.width!==Math.round(vw*dpr)||cv.height!==Math.round(vh*dpr)){ cv.width=Math.round(vw*dpr); cv.height=Math.round(vh*dpr); }
  var g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
  draw(g,M,sc.scrollLeft,sc.scrollTop,vw,vh,cell,lab,pal(),{corner:winLab(M.win)});
}
function mapDraw(reset){
  mapMount(); var el=$("#hx88Map"); if(!el) return;
  var h=H(); if(!h||(typeof cmUni!=="undefined"&&cmUni==="etfs")){ el.hidden=true; return; }
  el.hidden=false; var t0=Date.now(), M=cur(); if(!M){ el.hidden=true; return; }
  var ms=Date.now()-t0, B=dirBlocks(M), all=blocks(M,CM.cut), rise=B.filter(function(b){ return b.dir==="rising"; }).length;
  $("#hx88CutR").textContent=(1-CM.cut).toFixed(2);
  $("#hx88Note").textContent=M.n+" stocks · "+B.length+" directional blocks ("+rise+" rising, "+(B.length-rise)+" falling; "+(all.length-B.length)+" mixed) · cutoff "+CM.cut+" · "+winLab(M.win)+" from "+h.dates[M.a]+" to "+h.dates[M.L]+(ms>5?" · clustered in "+ms+" ms":"");
  $("#hx88Pos").textContent=CM.blk>=0&&B[CM.blk]?(CM.blk+1)+"/"+B.length:"–/"+B.length;
  $("#hx88Tbl tbody").innerHTML=B.map(function(b,k){ return '<tr><td class="num">'+(k+1)+'</td><td style="text-align:left">'+b.mem.slice().sort(function(x,y){ return M.pos[x]-M.pos[y]; }).map(function(x){ return '<strong class="num" data-tear="'+hE(M.names[x].sym)+'" style="cursor:pointer">'+hE(M.names[x].sym)+'</strong>'; }).join(" ")+'</td><td class="num">'+b.size+'</td><td style="text-align:left;color:'+(b.dir==="rising"?LIME:ORANGE)+';font-weight:600">'+b.dir+'</td><td class="num">'+(num(b.avg)?b.avg.toFixed(2):"&#8211;")+'</td><td class="num">'+(b.ret>0?"+":"")+b.ret.toFixed(1)+'%</td><td style="text-align:left;font-size:12px;color:var(--ink-2)">'+(Object.keys(b.secs).length>1?'<span style="color:var(--accent);font-weight:600">crosses sectors</span> ':'')+Object.keys(b.secs).map(function(s){ return hE(secShort(s))+" "+b.secs[s]; }).join(", ")+'</td><td><button type="button" class="up-link-btn" data-hx88go="'+k+'">Show</button></td></tr>'; }).join("")||'<tr><td colspan="8" style="color:var(--ink-3)">No directional block at this cutoff.</td></tr>';
  $$("#hx88Tbl [data-hx88go]").forEach(function(bt){ bt.addEventListener("click",function(){ var k=+bt.getAttribute("data-hx88go"), b=B[k]; CM.blk=k; CM.hi=null; $("#hx88Map").scrollIntoView({behavior:"smooth",block:"start"}); goTo(b.st,b.st,b.en-b.st+1); blockInfo(b,k,B.length); paint(); }); });
  if(reset){ var sc=$("#hx88Scroll"); if(sc) sc.scrollTo({left:0,top:0}); }
  paint();
}
function savePng(btn,mode){
  var M=cur(); if(!M) return; var date=barDate(), P=pal(), S, cv, cell, lab, vw, vh, x0=0, y0=0, sc=$("#hx88Scroll");
  if(mode==="view"){ S=3; cell=curCell(M); lab=labW(cell); vw=sc.clientWidth; vh=sc.clientHeight; x0=sc.scrollLeft; y0=sc.scrollTop; }
  else { S=1; cell=Math.max(4,Math.min(14,Math.floor(14000/M.n))); lab=labW(cell); vw=lab+M.n*cell; vh=vw; }
  cv=document.createElement("canvas"); cv.width=Math.round(vw*S); cv.height=Math.round(vh*S); var g=cv.getContext("2d"); g.setTransform(S,0,0,S,0,0);
  draw(g,M,x0,y0,vw,vh,cell,lab,P,{corner:winLab(M.win)});
  var B=dirBlocks(M), rise=B.filter(function(b){ return b.dir==="rising"; }).length, h=H();
  window.__canvasPng(cv,"clusters_map_"+String(date).replace(/\//g,"-")+"_"+M.win+(mode==="view"?"_view":"_all")+".png",
    ["Sector Rotation Terminal · Hierarchical clusters map · daily return correlation "+winLab(M.win)+" · bar "+date,
     M.n+" stocks, average linkage, cutoff "+CM.cut+" · "+B.length+" directional blocks ("+rise+" rising lime, "+(B.length-rise)+" falling orange) · prices "+h.dates[M.a]+" to "+h.dates[M.L]],btn,S);
}

/* ---- Ask: directional blocks ---- */
var BL_RE=/\bhierarchical clusters?\b|\bdirectional (?:blocks?|clusters?)\b|\b(?:blocks?|clusters?)(?: that| which)?(?: are| is)? (?:moving|rising|falling|going|trading|heading)(?: up| down| higher| lower)? together\b|\b(?:rising|falling) (?:blocks?|clusters?)\b|\b(?:blocks?|clusters?) (?:moving|going) (?:up|down)\b|\bwhich (?:cluster|block) (?:is|are) [a-z0-9.\- ]{1,30}in\b|\bclusters? map\b|\b(?:blocks?|clusters?)(?: that| which)?(?: are| is)? (?:cross(?:es|ing)?|span(?:s|ning)?|mix(?:es|ing)?) (?:different |multiple )?sectors?\b|\b(?:cross[- ]sector|sector[- ]crossing) (?:blocks?|clusters?)\b/;
var _qmParseX88=qmParseX;
qmParseX=function(q){
  try{ var t=qmT(q); if(BL_RE.test(t)&&!/\bpairs?[- ]?(?:trad|test)/.test(t)){
    var tk=A.tickers(q), w=/\b60\b|\b3 months?\b/.test(t)?"60":(/\b126\b|\b6 months?\b/.test(t)?"126":(/\b252\b|\b12 months?\b|\bone year\b|\ba year\b|\btrailing year\b/.test(t)?"252":"ytd"));
    var dir=/\b(?:falling|down|lower|declin\w*)\b/.test(t)?"falling":(/\b(?:rising|up|higher|advanc\w*)\b/.test(t)?"rising":"both");
    var cm=t.match(/\bcutoff (0?\.\d+)\b/)||t.match(/\bat (0?\.\d+)\b/), nm=t.match(/\b(?:top|first|show) (\d{1,2})\b/);
    return {kind:"hblocks",cross:/\b(?:cross(?:es|ing)? sectors?|across sectors|different sectors|multiple sectors|more than one sector|cross[- ]sector)\b/.test(t),win:w,dir:dir,focus:tk.length===1?tk[0]:null,cut:cm?parseFloat(cm[1]):null,n:nm?+nm[1]:20,secIn:qmSecMentions(t).inn};
  } }catch(e){}
  return _qmParseX88(q);
};
QMX_KINDS.hblocks=1;
/* "cluster" in a clusters-map question is not a scan cluster condition: drop that one "not applied" note for these questions only */
try{ var _qmIgn88=qmIgn; qmIgn=function(q){ var a=_qmIgn88(q); try{ var t=qmT(q); if(BL_RE.test(t)) a=a.filter(function(x){ return !/cluster conditions/.test(x); }); }catch(e){} return a; }; }catch(e){}
var _qmValidateAny88=qmValidateAny;
qmValidateAny=function(raw){ if(!(raw&&raw.kind==="hblocks")) return _qmValidateAny88(raw);
  var sp={kind:"hblocks",win:["ytd","60","126","252"].indexOf(String(raw.win))>=0?String(raw.win):"ytd",dir:["rising","falling","both"].indexOf(raw.dir)>=0?raw.dir:"both",focus:raw.focus?String(raw.focus).toUpperCase():null,
    cross:!!raw.cross,cut:Math.max(0.1,Math.min(0.6,parseFloat(raw.cut)||(raw.cross?0.35:0.263))),n:Math.max(1,Math.min(60,parseInt(raw.n,10)||20)),secIn:(raw.secIn||[]).map(function(v){ return qmSecKey(v)||v; })};
  return {spec:sp}; };
var _qmRunX88=qmRunX;
qmRunX=function(spec,ctx,res,t0){
  if(!(spec&&spec.kind==="hblocks")) return _qmRunX88(spec,ctx,res,t0);
  var h=H(); function fin(n,q){ res.cov=h?"Price history: <b>"+h.nSyms+" symbols</b> × <b>"+h.bars+" bars</b> to <b>"+A.cut()+"</b> (part E).":qmCovX(ctx,""); res.rows=n; res.qualifying=q===undefined?n:q; res.ms=Date.now()-t0; return res; }
  if(!h){ res.lead="The clusters map is built from the daily price history (part E), which is not loaded in this view."; res.notes.push("Load it in Ask the terminal with “Load price history”, then ask again."); return fin(0); }
  var M=build(spec.win); if(!M){ res.lead="Not enough price history for that window."; return fin(0); }
  var all=blocks(M,spec.cut), idx={}; M.names.forEach(function(x,k){ idx[x.sym]=k; });
  var list=spec.cross?all.slice():all.filter(function(b){ return b.dir!=="mixed"; });
  if(spec.focus){
    var k=idx[spec.focus]; if(k===undefined){ res.lead=spec.focus+" is not in the map (it needs a full "+winLab(spec.win)+" window of prices)."; return fin(0); }
    var inB=all.filter(function(b){ return b.mem.indexOf(k)>=0; })[0];
    var near=[]; for(var j=0;j<M.n;j++) if(j!==k) near.push({s:M.names[j].sym,r:M.R[k*M.n+j],sec:M.names[j].sec}); near.sort(function(p,q){ return q.r-p.r; });
    res.lead=inB?"<b>"+spec.focus+"</b> is in a <b>"+inB.dir+"</b> block of "+inB.size+" names (average correlation "+qmN(inB.avg,2)+", average return "+qmN(inB.ret,1,1)+", "+winLab(spec.win)+"): "+inB.mem.map(function(x){ return M.names[x].sym; }).join(" ")+".":"<b>"+spec.focus+"</b> is not inside any block at cutoff "+spec.cut+" ("+winLab(spec.win)+"): nothing clusters with it tightly enough. Its closest names:";
    res.table={head:["Rank","Symbol","Correlation","Sector"],align:["r","l","r","l"],body:near.slice(0,10).map(function(x,i){ return [String(i+1),x.s,qmN(x.r,3),qmSecName(x.sec)]; })};
    res.notes.push("From the hierarchical clusters map (Correlation Matrix tab): average-linkage clustering of daily-return correlation over "+winLab(spec.win)+"; a block is a dendrogram node of 3 or more names that merges within distance "+spec.cut+" (average correlation of about "+(1-spec.cut).toFixed(2)+"). Rising or falling = every member moved that way over the window.");
    res.send={label:"closest to "+spec.focus,items:near.slice(0,10).map(function(x){ return {sym:x.s,side:"long",w:null}; })};
    return fin(10);
  }
  if(spec.dir!=="both") list=list.filter(function(b){ return spec.cross?(spec.dir==="rising"?b.up*3>=b.size*2:b.dn*3>=b.size*2):b.dir===spec.dir; });
  if(spec.secIn.length) list=list.filter(function(b){ return spec.secIn.some(function(s){ return b.secs[s]; }); });
  if(spec.cross) list=list.filter(function(b){ return Object.keys(b.secs).length>1; });
  var L2=list.slice().sort(function(p,q){ return Math.abs(q.ret)-Math.abs(p.ret); }).slice(0,spec.n), rise=all.filter(function(b){ return b.dir==="rising"; }).length, fall=all.filter(function(b){ return b.dir==="falling"; }).length;
  res.lead="<b>"+(spec.dir==="both"&&!spec.cross?rise+fall:list.length)+"</b> "+(spec.cross?(spec.dir==="both"?"blocks":"mostly "+spec.dir+" blocks (two thirds or more of the members)"):(spec.dir==="both"?"directional blocks ("+rise+" rising, "+fall+" falling)":spec.dir+" blocks"))+(spec.cross?" that cross sectors":"")+" in the hierarchical clusters map, "+winLab(spec.win)+", cutoff "+spec.cut+". "+(L2.length<list.length?"The "+L2.length+" with the biggest moves:":"Largest moves first:");
  res.table={head:["Block","Members","Size","Direction","Avg corr.","Avg return","Sectors"],align:["r","l","r","l","r","r","l"],body:L2.map(function(b,i){ return [String(i+1),b.mem.map(function(x){ return M.names[x].sym; }).join(" "),String(b.size),b.dir==="mixed"?"mixed ("+b.up+" up, "+b.dn+" down)":b.dir,qmN(b.avg,2),qmN(b.ret,1,1),Object.keys(b.secs).map(function(s){ return qmSecName(s)+" "+b.secs[s]; }).join(", ")]; })};
  res.notes.push("Average-linkage clustering of every scan stock's daily-return correlation over "+winLab(spec.win)+" (prices "+h.dates[M.a]+" to "+h.dates[M.L]+"). A block is a dendrogram node of 3 or more names merging within distance "+spec.cut+" (average correlation about "+(1-spec.cut).toFixed(2)+" or more); rising or falling means every member moved that way over the window. See it drawn in the Correlation Matrix tab. The clustering never sees sector labels, so a block can mix sectors; “clusters that cross sectors” uses the loose cutoff 0.35 unless you name one. Say “cutoff 0.35” for looser blocks, or “60 bars” / “12 months” for another window.");
  var s5=[]; L2.forEach(function(b){ b.mem.forEach(function(x){ if(s5.length<50&&ctx.bySym[M.names[x].sym]) s5.push({sym:M.names[x].sym,side:"long",w:null}); }); });
  res.send=s5.length?{label:"directional blocks",items:s5}:null;
  return fin(L2.length,list.length);
};
/* the Members column already links tickers (v81); make the Ask table use that heading */
try{ QM_PROMPT=QM_PROMPT.replace("\nQ: ","Hierarchical clusters map, directional blocks: {\"kind\":\"hblocks\",\"win\":\"ytd\"|\"60\"|\"126\"|\"252\",\"dir\":\"rising\"|\"falling\"|\"both\",\"focus\":\"TICKER\"|null,\"cut\":0.1-0.6,\"n\":1-60}\n\nQ: "); }catch(e){}
try{ ["Which clusters are rising together?","Falling blocks YTD","Which cluster is NVDA in?"].forEach(function(q){ if(QMX_EX20.indexOf(q)<0) QMX_EX20.push(q); });
  var sm=document.querySelector("#qmEx20 summary"); if(sm) sm.textContent=QMX_EX20.length+" example questions: click Run, or Copy and paste your own edit"; }catch(e){}

/* ================= 3. legends and PNG buttons on the other matrices and the Subsector Web ================= */
function addAfter(ref,node){ ref.parentNode.insertBefore(node,ref.nextSibling); }
function sevExtras(){
  var wrap=$("#cmMatrixWrap"); if(!wrap||$("#hx88SevLeg")) return; var shell=wrap.closest(".tm-shell")||wrap;
  var d=document.createElement("div"); d.id="hx88SevLeg"; d.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px";
  d.innerHTML=legendHtml("hx88SevL",'Cell = correlation of saved <em>severity</em> (or composite) across saved runs, &minus;1 to +1. Axes: the same 60 names down and across, in sector order; lines mark sector boundaries.');
  var bt=pngBtn("Save as PNG (3×)","The severity matrix exactly as shown",function(b){ var svg=$("#cmMatrixWrap svg"); if(!svg) return; var m=$("#cmMetricSeg button[aria-pressed=\"true\"]");
    window.__svgPng(svg,"severity_matrix_"+String(barDate()).replace(/\//g,"-")+".png",["Sector Rotation Terminal · Correlation matrix of saved "+(m?m.textContent.trim().toLowerCase():"severity")+" · bar "+barDate(),"60 most extreme-composite names, sector order · teal positive, red negative, −1 to +1"],b,3); });
  bt.style.marginLeft="auto"; d.appendChild(bt); try{ shell.setAttribute("data-hxpng","1"); }catch(e){} addAfter(shell,d);
}
function priceExtras(){
  var host=$("#hx84CmHeat"); if(!host||$("#hx88PxLeg")) return; var shell=host.closest(".tm-shell")||host;
  var d=document.createElement("div"); d.id="hx88PxLeg"; d.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px";
  d.innerHTML=legendHtml("hx88PxL",'Cell = correlation of daily returns, &minus;1 to +1. Axes: the names down and across in the same order; <span style="display:inline-block;width:14px;height:10px;border:2px solid var(--accent);vertical-align:-1px"></span> a bloc in clustered order, grey lines = sector boundaries in sector order.');
  var bt=pngBtn("Save as PNG (3×)","The price correlation matrix exactly as shown",function(b){ var svg=$("#hx84CmHeat svg"); if(!svg) return; function lab(id){ var x=$("#"+id+" button[aria-pressed=\"true\"]"); return x?x.textContent.trim():""; }
    window.__svgPng(svg,"price_matrix_"+String(barDate()).replace(/\//g,"-")+"_"+lab("hx84CmWin").replace(/\W+/g,"")+".png",["Sector Rotation Terminal · Daily-return correlation matrix · "+lab("hx84CmWin")+" · bar "+barDate(),lab("hx84CmOrd")+" order · "+lab("hx84CmSrc")+" · teal positive, red negative, −1 to +1"],b,3); });
  bt.style.marginLeft="auto"; d.appendChild(bt); try{ shell.setAttribute("data-hxpng","1"); }catch(e){} addAfter(shell,d);
}
function secExtras(){
  var host=$("#hx87SecMx"); if(!host||$("#hx88SecLeg")) return; var shell=host.closest(".tm-shell")||host;
  var d=document.createElement("div"); d.id="hx88SecLeg"; d.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px";
  d.innerHTML=legendHtml("hx88SecL","Cell = correlation of two equal-weight sector baskets' daily returns (Change view: 60-bar minus 252-bar, shown at double strength).");
  var bt=pngBtn("Save as PNG (3×)","The sector matrix exactly as shown",function(b){ var svg=$("#hx87SecMx svg"); if(!svg) return; var x=$("#hx87SecW button[aria-pressed=\"true\"]");
    window.__svgPng(svg,"sector_matrix_"+String(barDate()).replace(/\//g,"-")+".png",["Sector Rotation Terminal · Sector return correlation · "+(x?x.textContent.trim():"")+" · bar "+barDate(),"Equal-weight sector baskets from the part E price history"],b,3); });
  bt.style.marginLeft="auto"; d.appendChild(bt); try{ shell.setAttribute("data-hxpng","1"); }catch(e){} addAfter(shell,d);
}
function sbwExtras(){
  var chart=$("#sbwChart"); if(!chart||$("#hx88SbwPng")) return; var shell=chart.closest(".tm-shell")||chart;
  var d=document.createElement("div"); d.style.cssText="display:flex;justify-content:flex-end;margin:6px 0 0";
  var bt=pngBtn("Save view as PNG (3×)","The Subsector Web exactly as selected (sector, selected industry, names and means toggles)",function(b){ var svg=$("#sbwChart svg"); if(!svg) return;
    var hz=$("#sbwHSeg button[aria-pressed=\"true\"]"), un=$("#sbwUniSeg button[aria-pressed=\"true\"]"), secL="";
    try{ secL=sbwSec?secShort(sbwSec):""; }catch(e){}
    var ind=""; try{ ind=sbwInd||""; }catch(e){}
    window.__svgPng(svg,"subsector_web_"+String(barDate()).replace(/\//g,"-")+"_"+(secL||"all").replace(/\W+/g,"")+(ind?"_"+ind.replace(/\W+/g,"").slice(0,30):"")+".png",
      ["Sector Rotation Terminal · Subsector Web · "+(secL||"")+(ind?" · "+ind:"")+" · bar "+barDate(),(un?un.textContent.trim():"")+" · "+(hz?hz.textContent.trim():"")+" · "+(($("#sbwNames")||{}).checked?"names on":"names off")],b,3); });
  bt.id="hx88SbwPng"; d.appendChild(bt); try{ shell.setAttribute("data-hxpng","1"); }catch(e){} addAfter(shell,d);
}

/* ---------------- wiring ---------------- */
function safe(fn){ return function(){ try{ fn(); }catch(e){ try{ console.warn("v88: "+(e&&e.message)); }catch(e2){} } }; }
var sMap=safe(function(){ mapDraw(false); }), sExtras=safe(function(){ sevExtras(); priceExtras(); secExtras(); sbwExtras(); });
function paneOpen(id){ var p=$("#"+id); return p&&!p.hidden; }
window.addEventListener("hxchange",function(){ CM.data={}; setTimeout(function(){ sExtras(); if(paneOpen("pane-cm")) sMap(); },0); });
v63Watch("tab-cm",function(){ setTimeout(function(){ sExtras(); sMap(); },0); });
v63Watch("tab-ng",function(){ setTimeout(sExtras,50); });
v63Watch("tab-sbw",function(){ setTimeout(sExtras,0); });
$$("#cmUniSeg button").forEach(function(b){ b.addEventListener("click",function(){ setTimeout(sMap,0); }); });
setTimeout(sExtras,0);
}catch(e){ try{ console.warn("v88 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
