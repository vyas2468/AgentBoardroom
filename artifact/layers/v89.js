/* ================= v89: "Save as PNG (3x)" under every chart, map, graph and matrix =================
   Finds every chart container in the tab you are on (process maps, graphs, the relationship map, signal convergence and behaviour maps,
   graph maps, sector warning maps, rotation charts, matrices) and adds one small button row UNDER it. The button saves the chart exactly
   as it is on screen (current selection, zoom, toggles) at three times the resolution, with the tab, the chart's heading, the chosen
   settings and the bar date written underneath. Containers that already have their own saver (treemap, matrices, Subsector Web,
   clusters map) are skipped. Nothing inside any chart is changed. */
(function(){
try{
if(!window.__svgPng) return;
var SEL=".tm-shell, .map-shell, .chart-scroll, figure";
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function barDate(){ try{ return (typeof U!=="undefined"&&U&&U.date)?U.date:""; }catch(e){ return ""; } }
function area(el){ var r=el.getBoundingClientRect(); return r.width*r.height; }
function best(c){
  var list=[].slice.call(c.querySelectorAll("svg")).filter(function(s){ return !s.closest(".hx89bar")&&!(s.parentNode&&s.parentNode.closest&&s.parentNode.closest("svg")); });
  var cv=[].slice.call(c.querySelectorAll("canvas"));
  var all=list.concat(cv).filter(function(e){ var r=e.getBoundingClientRect(); return r.width>=150&&r.height>=80; });
  all.sort(function(a,b){ return area(b)-area(a); }); return all[0]||null;
}
function tabName(el){ var p=el.closest("section.pane"), t=p&&document.querySelector('[aria-controls="'+p.id+'"]'); return t?t.textContent.replace(/\s+/g," ").trim():"Chart"; }
function heading(el){
  var host=el.closest(".block")||el.closest("figure")||el.parentNode, h=null;
  if(el.tagName==="FIGURE") h=el.querySelector("h2,h3");
  if(!h&&host){ var hs=host.querySelectorAll("h2,h3"); for(var i=hs.length-1;i>=0;i--){ if(hs[i].compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING){ h=hs[i]; break; } } if(!h&&hs.length) h=hs[0]; }
  return h?h.textContent.replace(/\s+/g," ").trim():"";
}
function settings(el){
  var host=el.closest(".block")||el.closest("section.pane"), out=[];
  if(!host) return "";
  host.querySelectorAll(".seg button[aria-pressed=\"true\"]").forEach(function(b){ if(b.closest(".hx89bar")) return; var t=b.textContent.replace(/\s+/g," ").trim(); if(t&&out.indexOf(t)<0&&out.length<8) out.push(t); });
  host.querySelectorAll("label input[type=checkbox]").forEach(function(c){ if(out.length>=10) return; var l=c.closest("label"), t=l?l.textContent.replace(/\s+/g," ").trim():""; if(t) out.push(t+(c.checked?" on":" off")); });
  return out.join(" · ");
}
function slug(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40); }
function save(bar,btn){
  var c=bar.previousElementSibling; if(!c) return; var t=best(c); if(!t){ btn.textContent="Nothing to save here"; setTimeout(function(){ btn.textContent="Save as PNG (3×)"; },1800); return; }
  var tn=tabName(c), hd=heading(c), st=settings(c), d=barDate(), name=slug(tn)+(hd?"_"+slug(hd):"")+"_"+String(d).replace(/\//g,"-")+".png";
  var lines=["Sector Rotation Terminal · "+tn+(hd?" · "+hd:"")+(d?" · bar "+d:"")]; if(st) lines.push(st);
  if(t.tagName.toLowerCase()==="canvas"){ var S=Math.max(1,Math.round(t.width/Math.max(1,t.getBoundingClientRect().width))); window.__canvasPng(t,name,lines,btn,S); return; }
  var vb=(t.getAttribute("viewBox")||"").split(/\s+/).map(Number), px=(vb[2]||t.getBoundingClientRect().width)*(vb[3]||t.getBoundingClientRect().height);
  window.__svgPng(t,name,lines,btn,px>2600000?2:3);
}
function outermost(el){ var p=el.parentNode; while(p&&p!==document.body){ if(p.matches&&p.matches(SEL)) return false; if(p.matches&&p.matches("section.pane")) break; p=p.parentNode; } return true; }
function skip(el){
  if(el.getAttribute("data-hxpng")) return true;
  if(el.closest("#tearWrap")||el.closest(".hx89bar")) return true;
  if(el.querySelector("#tmWrap")||el.id==="tmWrap"||el.closest("#tmWrap")) return true;
  if(el.querySelector("[data-hxpng]")) return true;
  var p=el.parentNode; while(p&&p!==document.body){ if(p.getAttribute&&p.getAttribute("data-hxpng")) return true; p=p.parentNode; }
  return false;
}
function scan(){
  var pane=document.querySelector("section.pane:not([hidden])"); if(!pane) return;
  pane.querySelectorAll(SEL).forEach(function(el){
    if(!outermost(el)||skip(el)) return;
    var nx=el.nextElementSibling; if(nx&&nx.classList&&nx.classList.contains("hx89bar")){ var vis=el.getBoundingClientRect().height>0&&!!best(el); if(nx.hidden===vis) nx.hidden=!vis; return; }
    if(!best(el)) return;
    var bar=document.createElement("div"); bar.className="hx89bar"; bar.style.cssText="display:flex;justify-content:flex-end;margin:6px 0 2px";
    var b=document.createElement("button"); b.type="button"; b.className="btn ghost"; b.textContent="Save as PNG (3×)"; b.title="Save this chart exactly as shown (selection, zoom, toggles) as a high-resolution PNG";
    b.style.fontSize="12px"; b.addEventListener("click",function(){ try{ save(bar,b); }catch(e){} });
    bar.appendChild(b); el.parentNode.insertBefore(bar,el.nextSibling);
  });
}
var q=null; function later(ms){ clearTimeout(q); q=setTimeout(function(){ try{ scan(); }catch(e){} },ms||450); }
document.addEventListener("click",function(){ later(500); },true);
document.addEventListener("change",function(){ later(500); },true);
window.addEventListener("hxchange",function(){ later(1200); });
later(1500); setTimeout(function(){ try{ scan(); }catch(e){} },4000);
}catch(e){ try{ console.warn("v89 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
