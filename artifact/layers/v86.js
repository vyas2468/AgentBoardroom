/* ================= v86: page navigation, bottom arrow and a "sections" menu for the open tab =================
   The existing up arrow is untouched. Two new round buttons in the same style sit with it on the right edge:
   the down arrow (below it) jumps to the bottom of the page, and the list button (above it) opens the headings of the tab you are on,
   so a long tab can be crossed in one click. Both only show when the page is long enough to need them. */
(function(){
/* Ask the terminal also sits in the Master theme, right after Industry Ledger (it stays in "Reference & AI" too) */
try{ var mg=TG_GROUPS.filter(function(g){ return g.k==="mst"; })[0]; if(mg&&mg.tabs.indexOf("qry")<0){ var ix=mg.tabs.indexOf("ild"); if(ix>=0) mg.tabs.splice(ix+1,0,"qry"); else mg.tabs.push("qry"); } }catch(e){}
try{
var up=$("#scrollTopBtn"); if(!up) return;
var css="position:fixed;right:22px;z-index:88;width:44px;height:44px;border-radius:50%;background:var(--accent);color:var(--ground);border:1px solid var(--accent);cursor:pointer;font-size:19px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow)";
function btn(id,label,html,bottom){ var b=document.createElement("button"); b.id=id; b.type="button"; b.setAttribute("aria-label",label); b.title=label; b.hidden=true; b.setAttribute("style",css+";bottom:"+bottom+"px"); b.innerHTML=html; document.body.appendChild(b); return b; }
var down=btn("scrollBotBtn","Scroll to the bottom","&darr;",38);
var secs=btn("secNavBtn","Jump to a section of this tab","&#9776;",142);
secs.style.fontSize="17px";
var menu=document.createElement("div"); menu.id="secNavMenu"; menu.style.maxHeight="70vh"; menu.style.overflowY="auto"; menu.hidden=true; menu.setAttribute("role","menu");
menu.setAttribute("style","position:fixed;right:76px;bottom:38px;z-index:89;width:340px;max-width:calc(100vw - 100px);max-height:min(70vh,560px);overflow:auto;background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);border-radius:12px;box-shadow:var(--shadow);padding:8px 0;font-size:13px");
document.body.appendChild(menu);
function docH(){ return Math.max(document.documentElement.scrollHeight,document.body.scrollHeight); }
function y(){ return window.scrollY||document.documentElement.scrollTop||0; }
function pane(){ var p=document.querySelector("section.pane:not([hidden])"); return p; }
function heads(){
  var p=pane(), out=[]; if(!p) return out;
  function add(el,t,lv){ if(!el||!el.offsetParent||el.closest("#secNavMenu")) return; t=(t||"").replace(/\s+/g," ").trim(); if(!t) return; out.push({el:el,t:t.length>90?t.slice(0,88)+"\u2026":t,lv:lv}); }
  p.querySelectorAll("h2,h3").forEach(function(h){ add(h,h.textContent,h.tagName==="H2"?2:3); });
  /* panels, figure captions, example-tile jumps and the latest answers (Ask the terminal and any tab with these parts) */
  try{
    p.querySelectorAll("details > summary").forEach(function(s){ if(s.closest(".qm-turn")||s.closest("#hx93Tiles > div")) return; add(s,s.textContent.split(":")[0],3); });
    p.querySelectorAll("figcaption").forEach(function(f){ add(f,f.textContent,3); });
    var bar=p.querySelector("#hx97Bar"); if(bar) add(bar,"Show / hide panels \u00b7 download thread",3);
    var tl=p.querySelector("#hx93Tiles"); if(tl&&tl.open){ var cards=[].slice.call(tl.querySelectorAll(":scope > div > div")); if(cards.length>2){
      [[0,"start"],[Math.floor(cards.length/2),"middle"],[cards.length-1,"end"]].forEach(function(c){ var ttl=cards[c[0]].firstElementChild; add(cards[c[0]],"Example tiles: "+c[1]+" ("+(ttl?ttl.textContent:"")+")",3); });
      /* every tile group as its own jump (charts, convergence, adaptive portfolios, trend, screener ...) */
      cards.forEach(function(cd){ var ttl=cd.firstElementChild; if(ttl&&ttl.textContent) add(cd,"Tiles \u203A "+ttl.textContent,4); }); } }
    else if(tl&&tl.offsetParent){ [].slice.call(tl.querySelectorAll(":scope > div > div")).forEach(function(cd){ var ttl=cd.firstElementChild, tx=ttl?(ttl.textContent||"").replace(/\s+/g," ").trim():""; if(tx) out.push({el:cd,t:"Tiles \u203A "+(tx.length>90?tx.slice(0,88)+"\u2026":tx),lv:4,open:tl}); }); }
    var th=p.querySelector("#qmThread"); if(th&&th.children.length){ add(th,"Answers thread",3); [].slice.call(th.querySelectorAll(":scope > .qm-turn")).slice(-10).forEach(function(t){ var q=t.querySelector(".qm-q"); if(q) add(q,"Answer: "+q.textContent,3); }); }
    out.sort(function(a,b){ return (a.el.compareDocumentPosition(b.el)&4)?-1:1; });
  }catch(e){}
  return out;
}
var tick=null;
function update(){
  if(tick) return; tick=requestAnimationFrame(function(){ tick=null;
    var long=docH()>window.innerHeight*1.6, nearBot=y()+window.innerHeight>=docH()-480;
    down.hidden=!long||nearBot; secs.hidden=!long||heads().length<2; if(secs.hidden) menu.hidden=true; });
}
function close(){ menu.hidden=true; secs.setAttribute("aria-expanded","false"); }
function open(){
  var H=heads(), p=pane(), tab=p&&document.querySelector('[aria-controls="'+p.id+'"]'), name=tab?tab.textContent.replace(/\s+/g," ").trim():"this tab";
  menu.innerHTML='<div style="padding:4px 14px 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">'+(name.replace(/[&<>"]/g,""))+': jump to</div>'+
    '<button type="button" data-nav="top" style="display:block;width:100%;text-align:left;padding:6px 14px;background:none;border:0;color:var(--ink-2);cursor:pointer;font:inherit">&uarr; Top of the page</button>'+
    H.map(function(h,i){ return '<button type="button" data-nav="'+i+'" style="display:block;width:100%;text-align:left;padding:'+(h.lv===4?"4px 14px 4px 42px;font-size:.92em":"6px 14px 6px "+(h.lv===2?14:28)+"px")+';background:none;border:0;color:var(--ink);cursor:pointer;font:inherit;'+(h.lv===2?"font-weight:600":"")+'">'+h.t.replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; })+'</button>'; }).join("")+
    '<button type="button" data-nav="bottom" style="display:block;width:100%;text-align:left;padding:6px 14px;background:none;border:0;color:var(--ink-2);cursor:pointer;font:inherit">&darr; Bottom of the page</button>';
  menu.querySelectorAll("button").forEach(function(b){
    b.addEventListener("mouseenter",function(){ b.style.background="var(--panel)"; }); b.addEventListener("mouseleave",function(){ b.style.background="none"; });
    b.addEventListener("click",function(){ var v=b.getAttribute("data-nav"); close();
      if(v==="top") window.scrollTo({top:0,behavior:"smooth"}); else if(v==="bottom") window.scrollTo({top:docH(),behavior:"smooth"});
      else { var h=H[+v]; if(h&&h.el){ var go=function(){ var r=h.el.getBoundingClientRect(); window.scrollTo({top:Math.max(0,y()+r.top-16),behavior:"smooth"}); }; if(h.open&&!h.open.open){ h.open.open=true; setTimeout(go,60); } else go(); } } });
  });
  menu.hidden=false; secs.setAttribute("aria-expanded","true");
}
down.addEventListener("click",function(){ close(); window.scrollTo({top:docH(),behavior:"smooth"}); });
secs.addEventListener("click",function(e){ e.stopPropagation(); if(menu.hidden) open(); else close(); });
document.addEventListener("click",function(e){ if(!menu.hidden&&!menu.contains(e.target)&&e.target!==secs) close(); });
addEventListener("keydown",function(e){ if(e.key==="Escape"&&!menu.hidden) close(); });
addEventListener("scroll",update,{passive:true}); addEventListener("resize",update);
document.addEventListener("click",function(){ setTimeout(update,350); });
update(); setTimeout(update,1500);
}catch(e){ try{ console.warn("v86 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
