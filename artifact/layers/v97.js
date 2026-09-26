/* ================= v97: Ask the terminal - view switches, remove one answer, download the thread =================
   1. "Show" switches (remembered on this device) for the Try chips, the part E price-history panel and "What you can ask".
      All start switched on, so the page looks exactly as before until you switch one off. The tiles are never hidden.
   2. Every answer gets a "Remove" button (with Undo) so one response can be cleared without clearing the thread.
   3. "Download thread" as a high-resolution PNG (2x) or a PDF (A4 pages), keeping the page's colours and layout;
      each answer can also be saved on its own as a PNG. Rendering is done inside the page (no outside libraries). */
(function(){
try{
var LS="alexaligned.qry.";
function lsGet(k,d){ try{ var v=localStorage.getItem(LS+k); return v===null?d:v; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(LS+k,v); }catch(e){} }
var css=document.createElement("style");
css.textContent=
  ".hx97hide{display:none!important}"+
  "#hx97Bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:8px;font-size:12.5px;color:var(--ink-3)}"+
  "#hx97Bar label{display:inline-flex;align-items:center;gap:5px;cursor:pointer;color:var(--ink-2)}"+
  "#hx97Bar .hx97g{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}"+
  "#hx97Bar .btn{padding:4px 10px;font-size:12px}"+
  ".qm-turn{position:relative}"+
  ".hx97t{position:absolute;top:6px;right:6px;display:flex;gap:4px;opacity:.55;transition:opacity .15s}"+
  ".qm-turn:hover .hx97t,.hx97t:focus-within{opacity:1}"+
  ".hx97t button{font:inherit;font-size:11px;line-height:1;padding:4px 7px;border-radius:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink-3);cursor:pointer}"+
  ".hx97t button:hover{color:var(--ink);border-color:var(--ink-3)}"+
  ".hx97t button.hx97x:hover{color:#f87171;border-color:#f87171}"+
  ".hx97time{font-family:var(--mono);font-size:10.5px;color:var(--ink-3);margin:2px 0 4px;letter-spacing:.02em}";
document.head.appendChild(css);

/* ---------- 1. show / hide switches ---------- */
var PARTS=[
  {k:"try", lab:"Try chips", get:function(){ var ex=document.getElementById("qmExamples"); if(!ex) return []; var row=ex.parentNode, lab=row.querySelector(".ctl-lab"); return [ex,lab].filter(Boolean); }},
  {k:"hx",  lab:"Price history panel (part E)", get:function(){ var b=document.getElementById("hxBox"); return b?[b]:[]; }},
  {k:"ask", lab:"What you can ask", get:function(){ var p=document.getElementById("pane-qry"); if(!p) return []; return [].slice.call(p.querySelectorAll(".callout")).filter(function(c){ var h=c.querySelector("h3"); return h&&/What you can ask/.test(h.textContent); }); }}
];
function applyShow(){ PARTS.forEach(function(p){ var on=lsGet("show."+p.k,"1")!=="0"; p.get().forEach(function(el){ el.classList.toggle("hx97hide",!on); }); var cb=document.getElementById("hx97s_"+p.k); if(cb) cb.checked=on; }); hxLab(); }
function hxLab(){ var l=document.getElementById("hx97hxst"), s=document.getElementById("hxStatus"); if(!l) return; var t=s?s.textContent:""; var v=/Loaded/i.test(t)?"(loaded ✓)":(/No price history|not loaded|none/i.test(t)?"(not loaded)":""); if(l.textContent!==v) l.textContent=v; }

/* ---------- 2. remove one answer ---------- */
var UNDO=null;
function say(t,ms){ var n=document.getElementById("hx97Say"); if(!n) return; n.innerHTML=t; clearTimeout(say._t); if(ms) say._t=setTimeout(function(){ n.innerHTML=""; UNDO=null; },ms); }
/* how long each question took: from submit to the answer being on the page */
var T0=null, now=function(){ return (window.performance&&performance.now)?performance.now():Date.now(); };
var _qmSubmit97=qmSubmit;
qmSubmit=function(q){ if(String(q||"").trim()) T0={t:now(),at:new Date()}; return _qmSubmit97.apply(this,arguments); };
function hms(d){ function p(n){ return (n<10?"0":"")+n; } return p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds()); }
function fmtDur(ms){ return ms<1000?Math.max(1,Math.round(ms))+" ms":(ms/1000).toFixed(ms<10000?2:1)+" s"; }
function stampTurn(turn){
  if(turn.querySelector(".hx97time")) return;
  var el=document.createElement("div"); el.className="hx97time";
  if(T0){ var ms=now()-T0.t; el.textContent="\u23F1 "+fmtDur(ms)+" \u00b7 asked "+hms(T0.at)+" \u00b7 answered "+hms(new Date()); el.title="Time from pressing Ask to the answer being on the page (includes Claude's reading of the question when the built-in rules could not)"; T0=null; }
  else el.textContent="answered "+hms(new Date());
  try{ var hw=window.__qmHow; if(hw){ el.textContent+=hw==="claude-failed"?" \u00b7 tried Claude (no usable query; uses your Claude plan)":(/claude/i.test(hw)?" \u00b7 read by Claude (uses your Claude plan)":" \u00b7 built-in rules (no AI)"); } window.__qmHow=null; }catch(e){}
  var q=turn.querySelector(".qm-q"); if(q&&q.parentNode===turn) turn.insertBefore(el,q.nextSibling); else turn.appendChild(el);
}
function decorate(turn){
  if(!turn) return; stampTurn(turn);
  if(turn.querySelector(":scope > .hx97t")) return;
  var t=document.createElement("div"); t.className="hx97t";
  t.innerHTML='<button type="button" class="hx97png" title="Save this answer as a high-resolution PNG">PNG</button><button type="button" class="hx97x" title="Remove this answer from the thread (Undo is offered)" aria-label="Remove this answer">✕ Remove</button>';
  turn.insertBefore(t,turn.firstChild);
}
function decorateAll(){ var th=document.getElementById("qmThread"); if(th) [].slice.call(th.querySelectorAll(":scope > .qm-turn")).forEach(decorate); }

/* ---------- 3. render part of the page to canvases (SVG foreignObject, styles copied from the page) ---------- */
var SVGNS="http://www.w3.org/2000/svg", XH="http://www.w3.org/1999/xhtml";
var SVG_PR=["fill","stroke","stroke-width","stroke-dasharray","stroke-linecap","stroke-linejoin","opacity","fill-opacity","stroke-opacity","font-family","font-size","font-weight","font-style","text-anchor","dominant-baseline","letter-spacing","stop-color","stop-opacity","visibility","transform-origin"];
var DEF={}, DEFDOC=null;
function defStyle(tag){
  if(DEF[tag]) return DEF[tag];
  if(!DEFDOC){ var ifr=document.createElement("iframe"); ifr.style.cssText="position:absolute;width:0;height:0;border:0;visibility:hidden"; ifr.setAttribute("aria-hidden","true"); document.body.appendChild(ifr); DEFDOC=ifr; ifr.contentDocument.open(); ifr.contentDocument.write("<!doctype html><html><body></body></html>"); ifr.contentDocument.close(); }
  var d=DEFDOC.contentDocument, e=d.createElement(tag); d.body.appendChild(e); var cs=DEFDOC.contentWindow.getComputedStyle(e), o={};
  for(var i=0;i<cs.length;i++){ var p=cs[i]; o[p]=cs.getPropertyValue(p); } d.body.removeChild(e); DEF[tag]=o; return o;
}
var SKIP=/^(transition|animation|cursor|caret|pointer-events|user-select|-webkit-user|will-change|outline|scroll-|overscroll|touch-action|content-visibility|view-transition|perspective-origin|transform-origin|inset-|block-size|inline-size|min-block|min-inline|max-block|max-inline|margin-block|margin-inline|padding-block|padding-inline|border-block|border-inline|border-start|border-end|-webkit-locale|app-region)/;
function prune(src,dst){
  /* drop hidden parts and our own buttons; canvases become images */
  var sk=[].slice.call(src.children), dk=[].slice.call(dst.children);
  for(var k=0;k<sk.length;k++){ var s=sk[k], d=dk[k]; if(!d) continue;
    var cs=getComputedStyle(s);
    if(cs.display==="none"||s.matches(".hx97t,.hx89bar,.qm-tools")){ d.parentNode.removeChild(d); sk[k]=null; continue; }
    if(s.tagName==="CANVAS"){ try{ var img=document.createElement("img"); img.src=s.toDataURL("image/png"); img.width=s.clientWidth; img.height=s.clientHeight; d.parentNode.replaceChild(img,d); dk[k]=img; }catch(e){} }
  }
  sk=sk.filter(Boolean); dk=[].slice.call(dst.children);
  return {s:sk,d:dk};
}
function cloneStyled(src){
  var dst=src.cloneNode(true);
  (function walk(s,d,root){ var r=prune(s,d); copyStyles1(s,d,root); for(var k=0;k<r.s.length&&k<r.d.length;k++) walk(r.s[k],r.d[k],false); })(src,dst,true);
  [].slice.call(dst.querySelectorAll("[id]")).forEach(function(e){ e.removeAttribute("id"); }); dst.removeAttribute("id");
  [].slice.call(dst.querySelectorAll("details")).forEach(function(e){ if(!e.open) e.removeAttribute("open"); });
  [].slice.call(dst.querySelectorAll("input,textarea")).forEach(function(e){ e.setAttribute("value",e.value||""); });
  return dst;
}
function copyStyles1(src,dst,isRoot){
  var cs=getComputedStyle(src), st="", tag=src.tagName.toLowerCase();
  if(src.namespaceURI===SVGNS){ for(var z=0;z<SVG_PR.length;z++){ var v=cs.getPropertyValue(SVG_PR[z]); if(v) st+=SVG_PR[z]+":"+v+";"; } if(tag==="svg"){ var r=src.getBoundingClientRect(); st+="width:"+r.width+"px;height:"+r.height+"px;display:"+cs.display+";vertical-align:"+cs.verticalAlign+";overflow:hidden;"; } }
  else{ var df=defStyle(tag); for(var i=0;i<cs.length;i++){ var p=cs[i]; if(SKIP.test(p)) continue; var v2=cs.getPropertyValue(p); if(isRoot||v2!==df[p]) st+=p+":"+v2+";"; }
    if(cs.position==="sticky"||cs.position==="fixed") st+="position:static;";
    if(isRoot) st+="margin:0;"; }
  dst.setAttribute("style",st);
}
var FONTCSS=null;
function fontCss(){
  if(FONTCSS!==null) return Promise.resolve(FONTCSS);
  var link=document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis"]'); if(!link||!window.fetch){ FONTCSS=""; return Promise.resolve(""); }
  function tmo(p,ms){ return Promise.race([p,new Promise(function(_,rj){ setTimeout(function(){ rj(new Error("timeout")); },ms); })]); }
  return tmo(fetch(link.href).then(function(r){ return r.text(); }),4000).then(function(txt){
    var used=/Plex/; var blocks=txt.split("@font-face").slice(1).filter(function(b){ return used.test(b)&&/U\+0000-00FF/.test(b); });
    return Promise.all(blocks.map(function(b){ var m=b.match(/url\((https:[^)]+)\)/); if(!m) return ""; return tmo(fetch(m[1]).then(function(r){ return r.blob(); }),5000).then(function(bl){ return new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){ res("@font-face"+b.replace(m[1],fr.result)); }; fr.onerror=function(){ res(""); }; fr.readAsDataURL(bl); }); },function(){ return ""; }); }));
  }).then(function(arr){ FONTCSS=arr.join("\n"); return FONTCSS; },function(){ FONTCSS=""; return ""; });
}
/* build one SVG document (as a string) holding the styled clone; slices are drawn from it */
function snapshot(nodes,title){
  var W=Math.ceil(nodes[0].parentNode.getBoundingClientRect().width)+24, root=document.createElement("div");
  var bs=getComputedStyle(document.body), cs0=getComputedStyle(document.documentElement);
  var bg=cs0.getPropertyValue("--surface").trim()||bs.backgroundColor||"#fff", ink=cs0.getPropertyValue("--ink").trim()||"#111", ink3=cs0.getPropertyValue("--ink-3").trim()||"#777";
  root.setAttribute("xmlns",XH);
  root.setAttribute("style","width:"+W+"px;box-sizing:border-box;padding:14px 12px;background:"+bg+";color:"+bs.color+";font-family:"+bs.fontFamily+";font-size:"+bs.fontSize+";line-height:"+bs.lineHeight+";");
  var head=document.createElement("div"); head.setAttribute("style","font-family:"+bs.fontFamily+";margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid "+ink3+";");
  head.innerHTML='<div style="font-weight:600;font-size:15px;color:'+ink+'"></div><div style="font-size:11.5px;color:'+ink3+';margin-top:2px"></div>';
  head.firstChild.textContent=title[0]; head.lastChild.textContent=title[1]; root.appendChild(head);
  var cuts=[0];
  nodes.forEach(function(n,i){ var c=cloneStyled(n); root.appendChild(c); });
  /* measure in a hidden host so page breaks can fall between answers */
  var host=document.createElement("div"); host.setAttribute("style","position:absolute;left:-99999px;top:0;width:"+W+"px;visibility:hidden;pointer-events:none"); host.appendChild(root); document.body.appendChild(host);
  var H=Math.ceil(root.getBoundingClientRect().height), top0=root.getBoundingClientRect().top;
  [].slice.call(root.children).slice(1).forEach(function(c){ cuts.push(Math.round(c.getBoundingClientRect().top-top0)); });
  /* finer break points: table rows and paragraphs, so a page never cuts through a line of text */
  var fine=[].slice.call(root.querySelectorAll("tr,p,li,h3,h4,figure,svg,.qm-q")).map(function(e){ return Math.round(e.getBoundingClientRect().top-top0); });
  document.body.removeChild(host);
  root.removeAttribute("xmlns");
  var xml=new XMLSerializer().serializeToString(root);
  return {W:W,H:H,xml:xml,bg:bg,turns:cuts,fine:fine};
}
function drawSlice(snap,y0,h,S,fonts){
  return new Promise(function(res,rej){
    var svg='<svg xmlns="'+SVGNS+'" width="'+(snap.W*S)+'" height="'+(h*S)+'" viewBox="0 '+y0+' '+snap.W+' '+h+'">'+(fonts?'<style>'+fonts.replace(/</g,"\\3c ")+'</style>':'')+
      '<foreignObject x="0" y="0" width="'+snap.W+'" height="'+snap.H+'">'+snap.xml+'</foreignObject></svg>';
    var img=new Image();
    img.onload=function(){ try{ var c=document.createElement("canvas"); c.width=Math.round(snap.W*S); c.height=Math.round(h*S); var g=c.getContext("2d"); g.fillStyle=snap.bg; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); res(c); }catch(e){ rej(e); } };
    img.onerror=function(){ rej(new Error("render")); };
    img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  });
}
function toBlob(c,type,q){ return new Promise(function(res,rej){ c.toBlob(function(b){ b?res(b):rej(new Error("toBlob")); },type,q); }); }
function deliver(name,blob,done){
  var ns=null; try{ ns=window.__hx97dl||null; }catch(e){}
  if(ns){ try{ ns.save({filename:name,data:blob}).then(function(){ done("Saved"); },function(e){ done(e&&e.code==="cancelled"||e&&/cancel|declin/i.test(String(e.message||e))?"Cancelled":"Could not save"); }); }catch(e){ done("Could not save"); } return; }
  try{ var u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(u); },4000); done("Download started"); }catch(e){ done("Blocked by the browser"); }
}
try{ if(window.claude&&typeof window.claude.use==="function") window.claude.use("downloads").then(function(ns){ window.__hx97dl=ns||null; },function(){}); }catch(e){}
function stamp(){ var d=new Date(); function p(n){ return (n<10?"0":"")+n; } return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"_"+p(d.getHours())+p(d.getMinutes()); }
function barDate(){ try{ return (typeof U!=="undefined"&&U&&U.date)?String(U.date):""; }catch(e){ return ""; } }
function titleLines(n){ return ["Sector Rotation Terminal · Ask the terminal"+(n>1?" · "+n+" answers":""), "Scan bar "+(barDate()||"–")+" · exported "+new Date().toLocaleString()]; }
function busy(btn){ var old=btn?btn.textContent:""; if(btn){ btn.textContent="Rendering…"; btn.disabled=true; } return function(msg){ if(!btn) return; btn.textContent=msg; setTimeout(function(){ btn.textContent=old; btn.disabled=false; },2400); }; }

var MAXPX=32000;
function savePng(nodes,name,btn){
  var done=busy(btn);
  fontCss().then(function(fonts){
    var snap=snapshot(nodes,titleLines(nodes.length)), S=2;
    if(snap.H*S>MAXPX) S=Math.max(1,Math.floor(MAXPX/snap.H*10)/10);
    if(snap.H*S>MAXPX){ done("Too long for one image: use PDF"); return; }
    if(snap.W*S*snap.H*S>250e6) S=Math.max(1,Math.sqrt(250e6/(snap.W*snap.H)));
    return drawSlice(snap,0,snap.H,S,fonts).then(function(c){ return toBlob(c,"image/png"); }).then(function(b){ deliver(name,b,done); });
  }).catch(function(){ done("Could not render"); });
}
/* ---------- minimal PDF writer: one JPEG per A4 page ---------- */
function pdfFromJpegs(pages){
  var enc=new TextEncoder(), parts=[], off=0, xref=[];
  function add(x){ var b=typeof x==="string"?enc.encode(x):x; parts.push(b); off+=b.length; }
  function obj(n,body,stream){ xref[n]=off; add(n+" 0 obj\n"+body); if(stream){ add("\nstream\n"); add(stream); add("\nendstream"); } add("\nendobj\n"); }
  add("%PDF-1.4\n%âãÏÓ\n".replace(/[\u0080-ÿ]/g,"*"));
  var n=pages.length, kids=[]; for(var i=0;i<n;i++) kids.push((3+i*3)+" 0 R");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+n+" >>");
  pages.forEach(function(p,i){ var o=3+i*3, W=p.pw.toFixed(2), H=p.ph.toFixed(2);
    obj(o,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /XObject << /Im"+i+" "+(o+2)+" 0 R >> >> /Contents "+(o+1)+" 0 R >>");
    var cs="q "+W+" 0 0 "+H+" 0 0 cm /Im"+i+" Do Q"; obj(o+1,"<< /Length "+cs.length+" >>",enc.encode(cs));
    obj(o+2,"<< /Type /XObject /Subtype /Image /Width "+p.w+" /Height "+p.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+p.jpg.length+" >>",p.jpg); });
  var total=3+n*3, xo=off, s="xref\n0 "+total+"\n0000000000 65535 f \n";
  for(var k=1;k<total;k++) s+=("0000000000"+xref[k]).slice(-10)+" 00000 n \n";
  add(s+"trailer\n<< /Size "+total+" /Root 1 0 R >>\nstartxref\n"+xo+"\n%%EOF");
  return new Blob(parts,{type:"application/pdf"});
}
function savePdf(nodes,name,btn){
  var done=busy(btn);
  fontCss().then(function(fonts){
    var snap=snapshot(nodes,titleLines(nodes.length)), S=2, pageH=Math.round(snap.W*842/595), pts=snap.turns.slice(1).concat(snap.fine).sort(function(a,b){ return a-b; });
    var slices=[], y=0;
    while(y<snap.H-2){
      var end=Math.min(snap.H,y+pageH);
      if(end<snap.H){
        /* prefer breaking between answers, then between rows or paragraphs, in the lower part of the page */
        var tb=snap.turns.filter(function(t){ return t>y+pageH*0.55&&t<=end; }), fb=pts.filter(function(t){ return t>y+pageH*0.6&&t<=end; });
        if(tb.length) end=tb[tb.length-1]; else if(fb.length) end=fb[fb.length-1];
      }
      slices.push([y,end-y]); y=end;
    }
    var pages=[], i=0;
    function next(){
      if(i>=slices.length){ deliver(name,pdfFromJpegs(pages),done); return; }
      var sl=slices[i++];
      return drawSlice(snap,sl[0],sl[1],S,fonts).then(function(c){
        /* place the slice at the top of a full A4 page */
        var pc=document.createElement("canvas"); pc.width=c.width; pc.height=Math.round(pageH*S); var g=pc.getContext("2d"); g.fillStyle=snap.bg; g.fillRect(0,0,pc.width,pc.height); g.drawImage(c,0,0);
        g.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim()||"#777"; g.font=(10*S)+"px -apple-system,Segoe UI,Helvetica,Arial,sans-serif"; g.textAlign="right"; g.fillText("Page "+i+" of "+slices.length,pc.width-12*S,pc.height-8*S);
        return toBlob(pc,"image/jpeg",0.92).then(function(b){ return b.arrayBuffer(); }).then(function(ab){ pages.push({jpg:new Uint8Array(ab),w:pc.width,h:pc.height,pw:595.28,ph:841.89}); if(btn) btn.textContent="Page "+i+"/"+slices.length+"…"; return next(); });
      });
    }
    return next();
  }).catch(function(){ done("Could not render"); });
}
function turns(){ var th=document.getElementById("qmThread"); return th?[].slice.call(th.querySelectorAll(":scope > .qm-turn")):[]; }

/* ---------- wire up ---------- */
function init(){
  var th=document.getElementById("qmThread"), clr=document.getElementById("qmClear"); if(!th||!clr||document.getElementById("hx97Bar")) return;
  var bar=document.createElement("div"); bar.id="hx97Bar";
  bar.innerHTML='<span class="hx97g"><span class="ctl-lab">Show</span>'+PARTS.map(function(p){ return '<label><input type="checkbox" id="hx97s_'+p.k+'" data-k="'+p.k+'"> '+p.lab+(p.k==="hx"?' <span id="hx97hxst" class="count" style="margin:0"></span>':'')+'</label>'; }).join("")+'</span>'+
    '<span class="hx97g"><span class="ctl-lab">Download thread</span><button type="button" class="btn ghost" id="hx97Png" title="The whole thread as one high-resolution PNG (2x), with its colours and layout">PNG (2×)</button><button type="button" class="btn ghost" id="hx97Pdf" title="The whole thread as a PDF (A4 pages, breaks between answers where possible)">PDF</button></span>'+
    '<span class="count" id="hx97Say" style="margin-left:0"></span>';
  var row=clr.closest(".controls"); row.parentNode.insertBefore(bar,row.nextSibling);
  bar.addEventListener("change",function(e){ var k=e.target.getAttribute("data-k"); if(!k) return; lsSet("show."+k,e.target.checked?"1":"0"); applyShow(); });
  document.getElementById("hx97Png").addEventListener("click",function(){ var t=turns(); if(!t.length){ say("The thread is empty.",2500); return; } savePng(t,"ask_thread_"+stamp()+".png",this); });
  document.getElementById("hx97Pdf").addEventListener("click",function(){ var t=turns(); if(!t.length){ say("The thread is empty.",2500); return; } savePdf(t,"ask_thread_"+stamp()+".pdf",this); });
  th.addEventListener("click",function(e){
    var x=e.target.closest?e.target.closest(".hx97x,.hx97png"):null; if(!x) return; var turn=x.closest(".qm-turn"); if(!turn) return;
    if(x.classList.contains("hx97png")){ var q=turn.querySelector(".qm-q"), nm=(q?q.textContent:"answer").replace(/[^\w]+/g,"_").replace(/^_|_$/g,"").slice(0,48)||"answer"; savePng([turn],"ask_"+nm+"_"+stamp()+".png",x); return; }
    UNDO={el:turn,next:turn.nextSibling}; turn.parentNode.removeChild(turn);
    say('Answer removed. <button type="button" class="btn ghost" id="hx97Undo" style="padding:2px 8px;font-size:11.5px">Undo</button>',9000);
  });
  bar.addEventListener("click",function(e){ if(e.target.id!=="hx97Undo"||!UNDO) return; var t=document.getElementById("qmThread"); if(UNDO.next&&UNDO.next.parentNode===t) t.insertBefore(UNDO.el,UNDO.next); else t.appendChild(UNDO.el); UNDO=null; say("",0); });
  clr.addEventListener("click",function(){ UNDO=null; say("",0); });
  if(typeof MutationObserver!=="undefined"){ new MutationObserver(decorateAll).observe(th,{childList:true}); var hs=document.getElementById("pane-qry"); if(hs) new MutationObserver(function(){ if(document.getElementById("hxBox")&&!applyShow._hx){ applyShow._hx=1; applyShow(); } hxLab(); }).observe(hs,{childList:true,subtree:true,characterData:true}); }
  [].slice.call(th.querySelectorAll(":scope > .qm-turn")).forEach(function(t){ var e=document.createElement("i"); e.className="hx97time"; e.hidden=true; t.appendChild(e); });
  decorateAll(); applyShow();
}
init(); setTimeout(function(){ try{ init(); applyShow(); }catch(e){} },0);
window.__hx97={savePng:savePng,savePdf:savePdf,snapshot:snapshot};
}catch(e){ try{ console.warn("v97 layer skipped:",e); }catch(_){} }
})();
