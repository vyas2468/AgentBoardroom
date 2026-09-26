/* ================= v99: My tiles - your own named tiles of saved questions =================
   A "My tiles" panel above the example tiles: create a tile (e.g. Favourites), add questions to it, and Run, Edit,
   move or remove them later. Every answer in the thread gets a "☆ Save" button that files its question into a tile.
   Kept in this browser (localStorage), with Copy all / Paste to move them to another browser. */
(function(){
try{
var KEY="alexaligned.mytiles.v1";
function load(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||"null"); if(Array.isArray(v)) return v.filter(function(t){ return t&&typeof t.name==="string"&&Array.isArray(t.q); }); }catch(e){} return []; }
var TKEY=KEY+".t";
function lsTime(){ try{ return +localStorage.getItem(TKEY)||0; }catch(e){ return 0; } }
/* cloud copy: this artifact's own store (private to the page's owner), one document; the browser copy is the cache */
var DB=null, CLOUD="pending", CT=null;
function status(){ var n=document.getElementById("hx99Cloud"); if(!n) return; n.textContent=CLOUD==="ok"?"☁ Saved to your account (all browsers and devices)":(CLOUD==="pending"?"☁ Connecting…":(CLOUD==="saving"?"☁ Saving…":"This browser only: the account store is not available here, so keep a Copy all backup")); n.style.color=CLOUD==="off"?"var(--neg)":"var(--ink-3)"; }
function push(){ if(!DB) return; clearTimeout(CT); CLOUD="saving"; status(); CT=setTimeout(function(){ try{ DB.doc("mytiles/main").set({tiles:JSON.parse(JSON.stringify(TL)),updatedAt:lsTime()}).then(function(){ CLOUD="ok"; status(); },function(){ CLOUD="off"; status(); }); }catch(e){ CLOUD="off"; status(); } },400); }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(TL)); localStorage.setItem(TKEY,String(Date.now())); }catch(e){ if(!DB){ say("Could not save in this browser (storage is blocked)."); return false; } } push(); return true; }
function clean(a){ return (Array.isArray(a)?a:[]).filter(function(t){ return t&&typeof t.name==="string"&&Array.isArray(t.q); }).map(function(t){ return {name:t.name.slice(0,60),q:t.q.filter(function(x){ return typeof x==="string"; })}; }); }
function cloudInit(){
  try{ if(!(window.claude&&typeof window.claude.use==="function")){ CLOUD="off"; status(); return; }
    window.claude.use("db").then(function(db){ if(!db){ CLOUD="off"; status(); return; } DB=db;
      db.doc("mytiles/main").get().then(function(sn){ var d=sn&&sn.exists?sn.data():null, ct=d&&+d.updatedAt||0, lt=lsTime();
        if(d&&Array.isArray(d.tiles)&&(ct>=lt||!TL.length)){ TL=clean(d.tiles); try{ localStorage.setItem(KEY,JSON.stringify(TL)); localStorage.setItem(TKEY,String(ct||Date.now())); }catch(e){} CLOUD="ok"; render(); status(); }
        else if(TL.length){ if(!lt){ try{ localStorage.setItem(TKEY,String(Date.now())); }catch(e){} } push(); }
        else { CLOUD="ok"; status(); } },function(){ CLOUD="off"; status(); });
    },function(){ CLOUD="off"; status(); }); }catch(e){ CLOUD="off"; status(); }
}
var TL=load(), DEL=null;

function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function say(t){ var n=document.getElementById("hx99Say"); if(n){ n.textContent=t; clearTimeout(say._t); say._t=setTimeout(function(){ n.textContent=""; },4000); } }
function find(name){ var k=String(name).trim().toLowerCase(); for(var i=0;i<TL.length;i++) if(TL[i].name.toLowerCase()===k) return i; return -1; }
function addQ(tileName,q){ q=String(q||"").trim(); tileName=String(tileName||"").trim().slice(0,60); if(!q||!tileName) return false; var i=find(tileName); if(i<0){ TL.push({name:tileName,q:[]}); i=TL.length-1; }
  if(TL[i].q.indexOf(q)>=0){ say("Already in "+TL[i].name+"."); return false; } TL[i].q.push(q); save(); render(); say("Saved to "+TL[i].name+"."); return true; }
function run(q){ var inp=document.getElementById("qmInput"), go=document.getElementById("qmGo"); if(!inp||!go) return; inp.value=q; go.click(); var th=document.getElementById("qmThread"); try{ setTimeout(function(){ var l=th&&th.lastElementChild; if(l&&l.scrollIntoView) l.scrollIntoView({block:"start",behavior:"smooth"}); },60); }catch(e){} }
function edit(q){ var inp=document.getElementById("qmInput"); if(!inp) return; inp.value=q; try{ inp.focus(); inp.scrollIntoView({block:"center",behavior:"smooth"}); }catch(e){} }

var css=document.createElement("style");
css.textContent=[
 "#hx99My .hx99t{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--panel);box-shadow:0 1px 2px rgba(0,0,0,.12);transition:border-color .15s}",
 "#hx99My .hx99t:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}",
 "#hx99My .hx99h{display:flex;gap:8px;align-items:center;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--line)}",
 "#hx99My .hx99n{font-weight:700;flex:1;display:flex;align-items:center;gap:8px}",
 "#hx99My .hx99c{font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}",
 "#hx99My .hx99q{display:flex;gap:6px;align-items:center;font-size:13px;margin:2px -6px;padding:5px 6px;border-radius:8px}",
 "#hx99My .hx99q:hover{background:color-mix(in srgb,var(--ink) 6%,transparent)}",
 "#hx99My .hx99q span{flex:1;color:var(--ink);line-height:1.35}",
 "#hx99My input[type=text]{font:inherit;font-size:13px;padding:7px 11px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);min-width:0;outline:none}",
 "#hx99My input[type=text]:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}",
 "#hx99My .hx99row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px}",
 ".hx99b{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;font-weight:600;line-height:1;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .05s;white-space:nowrap}",
 ".hx99b:hover{border-color:var(--accent);color:var(--ink)}.hx99b:active{transform:translateY(1px)}.hx99b:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
 ".hx99b.pri{background:var(--accent);border-color:var(--accent);color:var(--surface)}.hx99b.pri:hover{filter:brightness(1.08);color:var(--surface)}",
 ".hx99b.run{background:color-mix(in srgb,var(--accent) 16%,transparent);border-color:transparent;color:var(--accent)}.hx99b.run:hover{background:var(--accent);color:var(--surface)}",
 ".hx99b.ico{padding:6px 8px;min-width:28px;justify-content:center}",
 ".hx99b.dng:hover{border-color:#f87171;color:#f87171}.hx99b.dng.arm{background:#f87171;border-color:#f87171;color:#fff}",
 ".hx99b.sm{padding:5px 9px;font-size:11.5px}",
 ".hx99pick{display:inline-flex;gap:4px;align-items:center}.hx99pick select,.hx99pick input{font:inherit;font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}",
 ".hx99pick .hx99go{background:var(--accent)!important;color:var(--surface)!important;border-color:var(--accent)!important}"
].join("");
document.head.appendChild(css);

function render(){
  var el=document.getElementById("hx99My"); if(!el) return;
  var n=TL.reduce(function(s,t){ return s+t.q.length; },0);
  el.querySelector("summary").textContent="My tiles: "+TL.length+" tile"+(TL.length===1?"":"s")+", "+n+" saved question"+(n===1?"":"s")+". Save any answer's question with ☆ Save, or add them here";
  var body=el.querySelector(".hx99body");
  body.innerHTML='<div class="hx99row"><input type="text" id="hx99New" placeholder="New tile name, e.g. Favourites" maxlength="60" style="width:220px"><button type="button" class="hx99b pri" data-a="new">＋ Create tile</button>'+
    '<button type="button" class="hx99b" data-a="copy" title="Copy all your tiles as text, to keep a backup or move them to another browser">⧉ Copy all</button><button type="button" class="hx99b" data-a="paste" title="Paste tiles copied with Copy all">⎘ Paste tiles</button><span class="count" id="hx99Say" style="margin-left:4px"></span></div><div class="mini" id="hx99Cloud" style="margin-top:4px"></div>'+
    '<div id="hx99PasteBox" hidden class="hx99row"><input type="text" id="hx99PasteIn" placeholder="Paste the text from Copy all here" style="flex:1;min-width:200px"><button type="button" class="hx99b pri" data-a="pastego">Add these tiles</button></div>'+
    (TL.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:10px;margin-top:10px">'+TL.map(function(t,i){
      return '<div class="hx99t" data-t="'+i+'"><div class="hx99h"><div class="hx99n">★ '+hE(t.name)+' <span class="hx99c">'+t.q.length+'</span></div>'+
        '<button type="button" class="hx99b run sm" data-a="runall" title="Run every question in this tile">▶ Run all</button><button type="button" class="hx99b ico sm" data-a="ren" title="Rename this tile" aria-label="Rename">✎</button><button type="button" class="hx99b sm dng'+(DEL===i?' arm':'')+'" data-a="del" title="Delete this tile (click twice)">'+(DEL===i?"Confirm delete":"✕")+'</button></div>'+
        '<div class="hx99ren" hidden><div class="hx99row"><input type="text" value="'+hE(t.name)+'" maxlength="60" style="flex:1"><button type="button" class="hx99b pri sm" data-a="rengo">Save name</button></div></div>'+
        (t.q.length?t.q.map(function(q,j){ return '<div class="hx99q" data-j="'+j+'"><span>'+hE(q)+'</span><button type="button" class="hx99b run sm" data-a="run" title="Ask this question now">▶ Run</button><button type="button" class="hx99b ico sm" data-a="edit" title="Put it in the Ask box to edit" aria-label="Edit">✎</button>'+(j>0?'<button type="button" class="hx99b ico sm" data-a="up" title="Move up" aria-label="Move up">↑</button>':'')+'<button type="button" class="hx99b ico sm dng" data-a="rm" title="Remove from this tile" aria-label="Remove">✕</button></div>'; }).join(""):'<div class="mini" style="color:var(--ink-3)">No questions yet.</div>')+
        '<div class="hx99row"><input type="text" class="hx99add" placeholder="Type a question to add" style="flex:1;min-width:160px"><button type="button" class="hx99b pri sm" data-a="add">＋ Add</button><button type="button" class="hx99b sm" data-a="addcur" title="Add the question currently in the Ask box">↓ From Ask box</button></div></div>'; }).join("")+'</div>':
      '<p class="mini" style="color:var(--ink-3);margin-top:8px">No tiles yet. Type a name (for example Favourites) and press Create tile, or press ☆ Save on any answer.</p>');
  status();
}
function init(){
  var tiles=document.getElementById("hx93Tiles"), anchor=tiles||document.getElementById("qmEx20"); if(!anchor||document.getElementById("hx99My")) return;
  var el=document.createElement("details"); el.id="hx99My"; el.open=true; el.style.marginTop="10px";
  el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600"></summary><div class="hx99body"></div>';
  anchor.parentNode.insertBefore(el,anchor);
  render(); cloudInit();
  el.addEventListener("keydown",function(e){ if(e.key!=="Enter") return; var t=e.target; if(t.id==="hx99New"){ e.preventDefault(); el.querySelector('[data-a="new"]').click(); } else if(t.classList&&t.classList.contains("hx99add")){ e.preventDefault(); t.parentNode.querySelector('[data-a="add"]').click(); } });
  el.addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest("[data-a]"):null; if(!b||!el.contains(b)) return; var a=b.getAttribute("data-a");
    var card=b.closest(".hx99t"), i=card?+card.getAttribute("data-t"):-1, row=b.closest(".hx99q"), j=row?+row.getAttribute("data-j"):-1;
    if(a!=="del") DEL=null;
    if(a==="new"){ var nm=(document.getElementById("hx99New").value||"").trim().slice(0,60); if(!nm){ say("Type a tile name first."); return; } if(find(nm)>=0){ say("A tile called "+nm+" already exists."); return; } TL.push({name:nm,q:[]}); save(); render(); say("Created "+nm+"."); return; }
    if(a==="copy"){ var txt=JSON.stringify(TL); try{ navigator.clipboard.writeText(txt).then(function(){ say("Copied all tiles."); },function(){ say("Copy was blocked; select the text in Paste tiles instead."); }); }catch(err){ say("Copy was blocked by the browser."); } return; }
    if(a==="paste"){ var pb=document.getElementById("hx99PasteBox"); pb.hidden=!pb.hidden; return; }
    if(a==="pastego"){ var v=document.getElementById("hx99PasteIn").value, arr=null; try{ arr=JSON.parse(v); }catch(err){} if(!Array.isArray(arr)){ say("That text is not a Copy all backup."); return; } var k=0; arr.forEach(function(t){ if(t&&typeof t.name==="string"&&Array.isArray(t.q)) t.q.forEach(function(q){ if(typeof q==="string"){ var x=find(t.name); if(x<0){ TL.push({name:t.name.slice(0,60),q:[]}); x=TL.length-1; } if(TL[x].q.indexOf(q)<0){ TL[x].q.push(q); k++; } } }); }); save(); render(); say("Added "+k+" questions."); return; }
    if(i<0||!TL[i]) return; var T=TL[i];
    if(a==="run"){ run(T.q[j]); return; }
    if(a==="edit"){ edit(T.q[j]); return; }
    if(a==="runall"){ var qs=T.q.slice(), k2=0; if(!qs.length) return; (function next(){ if(k2>=qs.length) return; run(qs[k2++]); setTimeout(next,350); })(); return; }
    if(a==="up"){ if(j>0){ var t0=T.q[j-1]; T.q[j-1]=T.q[j]; T.q[j]=t0; save(); render(); } return; }
    if(a==="rm"){ T.q.splice(j,1); save(); render(); return; }
    if(a==="add"){ var inp=card.querySelector(".hx99add"); if(addQ(T.name,inp.value)) {} return; }
    if(a==="addcur"){ var qi=document.getElementById("qmInput"); if(!qi||!qi.value.trim()){ say("The Ask box is empty."); return; } addQ(T.name,qi.value); return; }
    if(a==="ren"){ var rb=card.querySelector(".hx99ren"); rb.hidden=!rb.hidden; return; }
    if(a==="rengo"){ var nn=card.querySelector(".hx99ren input").value.trim().slice(0,60); if(!nn) return; var ex=find(nn); if(ex>=0&&ex!==i){ say("A tile called "+nn+" already exists."); return; } T.name=nn; save(); render(); return; }
    if(a==="del"){ if(DEL===i){ TL.splice(i,1); DEL=null; save(); render(); say("Tile deleted."); } else { DEL=i; render(); } return; }
  });
  /* ☆ Save on every answer */
  var th=document.getElementById("qmThread"); if(!th) return;
  function deco(){ [].slice.call(th.querySelectorAll(":scope > .qm-turn")).forEach(function(turn){ if(turn.querySelector(".hx99s")) return; var bar=turn.querySelector(":scope > .hx97t"); if(!bar){ bar=document.createElement("div"); bar.className="hx97t"; turn.insertBefore(bar,turn.firstChild); }
    var b=document.createElement("button"); b.type="button"; b.className="hx99s"; b.title="Save this question into one of your tiles"; b.textContent="☆ Save"; bar.insertBefore(b,bar.firstChild); }); }
  if(typeof MutationObserver!=="undefined") new MutationObserver(function(){ setTimeout(deco,0); }).observe(th,{childList:true});
  deco();
  th.addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest(".hx99s,.hx99go,.hx99x"):null; if(!b) return; var turn=b.closest(".qm-turn"); if(!turn) return; var bar=b.closest(".hx97t")||b.parentNode;
    if(b.classList.contains("hx99x")){ var pk0=bar.querySelector(".hx99pick"); if(pk0) pk0.remove(); return; }
    if(b.classList.contains("hx99s")){ if(bar.querySelector(".hx99pick")) return;
      var pk=document.createElement("span"); pk.className="hx99pick";
      pk.innerHTML='<select aria-label="Tile">'+TL.map(function(t){ return '<option>'+hE(t.name)+'</option>'; }).join("")+'<option value="__new">+ New tile…</option></select><input type="text" placeholder="Tile name" maxlength="60" value="'+(TL.length?"":"Favourites")+'" style="width:110px'+(TL.length?';display:none':'')+'"><button type="button" class="hx99go">Save</button><button type="button" class="hx99x" aria-label="Cancel">✕</button>';
      bar.insertBefore(pk,b.nextSibling);
      var sel=pk.querySelector("select"), inp=pk.querySelector("input"); if(!TL.length) sel.value="__new";
      sel.addEventListener("change",function(){ inp.style.display=sel.value==="__new"?"":"none"; if(sel.value==="__new") inp.focus(); });
      return; }
    if(b.classList.contains("hx99go")){ var pk2=bar.querySelector(".hx99pick"), s2=pk2.querySelector("select"), nm2=s2.value==="__new"?pk2.querySelector("input").value:s2.value, q=turn.querySelector(".qm-q");
      if(!String(nm2||"").trim()){ pk2.querySelector("input").focus(); return; }
      if(q&&addQ(nm2,q.textContent)){ pk2.remove(); var sb=bar.querySelector(".hx99s"); sb.textContent="★ Saved"; setTimeout(function(){ sb.textContent="☆ Save"; },2500); } else if(pk2) pk2.remove(); }
  });
}
init(); setTimeout(function(){ try{ init(); }catch(e){} },0);
window.__hx99={list:function(){ return JSON.parse(JSON.stringify(TL)); }};
}catch(e){ try{ console.warn("v99 layer skipped:",e); }catch(_){} }
})();
