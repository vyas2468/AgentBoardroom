/* ================= v99: My tiles - your own named tiles of saved questions =================
   A "My tiles" panel above the example tiles: create a tile (e.g. Favourites), add questions to it, and Run, Edit,
   move or remove them later. Every answer in the thread gets a "☆ Save" button that files its question into a tile.
   Kept in this browser (localStorage), with Copy all / Paste to move them to another browser. */
(function(){
try{
var KEY="alexaligned.mytiles.v1";
function load(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||"null"); if(Array.isArray(v)) return v.filter(function(t){ return t&&typeof t.name==="string"&&Array.isArray(t.q); }); }catch(e){} return []; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(TL)); return true; }catch(e){ say("Could not save in this browser (storage is blocked)."); return false; } }
var TL=load(), DEL=null;
function hE(s){ return String(s===null||s===undefined?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function say(t){ var n=document.getElementById("hx99Say"); if(n){ n.textContent=t; clearTimeout(say._t); say._t=setTimeout(function(){ n.textContent=""; },4000); } }
function find(name){ var k=String(name).trim().toLowerCase(); for(var i=0;i<TL.length;i++) if(TL[i].name.toLowerCase()===k) return i; return -1; }
function addQ(tileName,q){ q=String(q||"").trim(); tileName=String(tileName||"").trim().slice(0,60); if(!q||!tileName) return false; var i=find(tileName); if(i<0){ TL.push({name:tileName,q:[]}); i=TL.length-1; }
  if(TL[i].q.indexOf(q)>=0){ say("Already in "+TL[i].name+"."); return false; } TL[i].q.push(q); save(); render(); say("Saved to "+TL[i].name+"."); return true; }
function run(q){ var inp=document.getElementById("qmInput"), go=document.getElementById("qmGo"); if(!inp||!go) return; inp.value=q; go.click(); var th=document.getElementById("qmThread"); try{ setTimeout(function(){ var l=th&&th.lastElementChild; if(l&&l.scrollIntoView) l.scrollIntoView({block:"start",behavior:"smooth"}); },60); }catch(e){} }
function edit(q){ var inp=document.getElementById("qmInput"); if(!inp) return; inp.value=q; try{ inp.focus(); inp.scrollIntoView({block:"center",behavior:"smooth"}); }catch(e){} }

var css=document.createElement("style");
css.textContent="#hx99My .hx99t{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel)}"+
  "#hx99My .hx99q{display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:3px 0}#hx99My .hx99q span{flex:1;color:var(--ink)}"+
  "#hx99My input[type=text]{font:inherit;font-size:12.5px;padding:5px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);min-width:0}"+
  "#hx99My .hx99row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px}"+
  ".hx99pick{display:inline-flex;gap:4px;align-items:center}.hx99pick select,.hx99pick input{font:inherit;font-size:11px;padding:3px 5px;border-radius:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}";
document.head.appendChild(css);

function render(){
  var el=document.getElementById("hx99My"); if(!el) return;
  var n=TL.reduce(function(s,t){ return s+t.q.length; },0);
  el.querySelector("summary").textContent="My tiles: "+TL.length+" tile"+(TL.length===1?"":"s")+", "+n+" saved question"+(n===1?"":"s")+". Save any answer's question with ☆ Save, or add them here";
  var body=el.querySelector(".hx99body");
  body.innerHTML='<div class="hx99row"><input type="text" id="hx99New" placeholder="New tile name, e.g. Favourites" maxlength="60" style="width:220px"><button type="button" class="btn ghost" data-a="new">Create tile</button>'+
    '<button type="button" class="btn ghost" data-a="copy" title="Copy all your tiles as text, to keep a backup or move them to another browser">Copy all</button><button type="button" class="btn ghost" data-a="paste" title="Paste tiles copied with Copy all">Paste tiles</button><span class="count" id="hx99Say" style="margin-left:4px"></span></div>'+
    '<div id="hx99PasteBox" hidden class="hx99row"><input type="text" id="hx99PasteIn" placeholder="Paste the text from Copy all here" style="flex:1;min-width:200px"><button type="button" class="btn ghost" data-a="pastego">Add these tiles</button></div>'+
    (TL.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:10px;margin-top:10px">'+TL.map(function(t,i){
      return '<div class="hx99t" data-t="'+i+'"><div style="display:flex;gap:6px;align-items:center"><div style="font-weight:700;flex:1">'+hE(t.name)+' <span class="count" style="margin:0">'+t.q.length+'</span></div>'+
        '<button type="button" class="up-link-btn" data-a="runall" title="Run every question in this tile">Run all</button><button type="button" class="up-link-btn" data-a="ren">Rename</button><button type="button" class="up-link-btn" data-a="del">'+(DEL===i?"Confirm delete":"Delete")+'</button></div>'+
        '<div class="hx99ren" hidden><div class="hx99row"><input type="text" value="'+hE(t.name)+'" maxlength="60" style="flex:1"><button type="button" class="up-link-btn" data-a="rengo">Save name</button></div></div>'+
        (t.q.length?t.q.map(function(q,j){ return '<div class="hx99q" data-j="'+j+'"><span>'+hE(q)+'</span><button type="button" class="up-link-btn" data-a="run">Run</button><button type="button" class="up-link-btn" data-a="edit">Edit</button>'+(j>0?'<button type="button" class="up-link-btn" data-a="up" title="Move up">↑</button>':'')+'<button type="button" class="up-link-btn" data-a="rm" title="Remove from this tile">✕</button></div>'; }).join(""):'<div class="mini" style="color:var(--ink-3)">No questions yet.</div>')+
        '<div class="hx99row"><input type="text" class="hx99add" placeholder="Type a question to add" style="flex:1;min-width:160px"><button type="button" class="up-link-btn" data-a="add">Add</button><button type="button" class="up-link-btn" data-a="addcur" title="Add the question currently in the Ask box">Add the Ask box</button></div></div>'; }).join("")+'</div>':
      '<p class="mini" style="color:var(--ink-3);margin-top:8px">No tiles yet. Type a name (for example Favourites) and press Create tile, or press ☆ Save on any answer.</p>');
}
function init(){
  var tiles=document.getElementById("hx93Tiles"), anchor=tiles||document.getElementById("qmEx20"); if(!anchor||document.getElementById("hx99My")) return;
  var el=document.createElement("details"); el.id="hx99My"; el.open=true; el.style.marginTop="10px";
  el.innerHTML='<summary style="cursor:pointer;color:var(--accent);font-weight:600"></summary><div class="hx99body"></div>';
  anchor.parentNode.insertBefore(el,anchor);
  render();
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
