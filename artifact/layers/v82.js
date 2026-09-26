/* ================= v82: Treemap image export, Subsector Web view controls =================
   tmx  Treemap: "Save view as PNG" renders the treemap exactly as it is on screen (current area, colour, universe and grouping)
        at 3x resolution with a caption naming those choices and the bar date. Reads the drawn SVG only; changes nothing it draws.
   sbx  Subsector Web: two switches. "Mean scores" shows or hides the mean-anomaly numbers on the centre and industry circles.
        "Hide the rest" makes a selected industry stand alone: every other industry, its companies and its links are hidden instead
        of dimmed; click the same circle (or its table row) again for the full picture. Both work on the drawn SVG after the
        original drawing code has run, so the picture, its layout and its click handling are the original ones. */
(function(){
try{
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

/* ---------- dl: file saves through the viewer's download prompt ----------
   Inside the Claude artifact viewer a plain download link does nothing; files must go through the downloads capability, which asks
   the viewer to confirm. Only some extensions are allowed there, so a script (.rts, .ps1, .bat) is offered inside a .zip that keeps its real name. Outside the
   viewer (no capability) the page's original link download runs unchanged. */
var DLNS=null;
try{ if(window.claude&&typeof window.claude.use==="function") window.claude.use("downloads").then(function(ns){ DLNS=ns||null; },function(){}); }catch(e){}
var DL_OK=/\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i;
/* a minimal ZIP (stored, no compression): the viewer cannot save .rts, .ps1 or .bat, but it can save a .zip, and the
   files inside keep their real names. Windows opens it with Extract All. */
var DL_CRC=(function(){ var t=[]; for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
function dlCrc(b){ var c=0xFFFFFFFF; for(var i=0;i<b.length;i++) c=DL_CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function dlZipBlob(files){
  var enc=new TextEncoder(), now=new Date(), parts=[], cen=[], off=0;
  var dt=((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))&0xFFFF, dd=(((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xFFFF;
  function hdr(n){ return new DataView(new ArrayBuffer(n)); }
  files.forEach(function(f){
    var nm=enc.encode(f[0]), data=(typeof f[1]==="string")?enc.encode(f[1]):f[1], crc=dlCrc(data), h=hdr(30);
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0,true); h.setUint16(8,0,true); h.setUint16(10,dt,true); h.setUint16(12,dd,true);
    h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(h.buffer,nm,data);
    var c=hdr(46); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0,true); c.setUint16(10,0,true); c.setUint16(12,dt,true); c.setUint16(14,dd,true);
    c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,data.length,true); c.setUint16(28,nm.length,true); c.setUint16(30,0,true); c.setUint16(32,0,true);
    c.setUint16(34,0,true); c.setUint16(36,0,true); c.setUint32(38,0,true); c.setUint32(42,off,true);
    cen.push(c.buffer,nm); off+=30+nm.length+data.length;
  });
  var csz=0; cen.forEach(function(x){ csz+=(x.byteLength!==undefined?x.byteLength:x.length); });
  var e=hdr(22); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csz,true); e.setUint32(16,off,true);
  return new Blob(parts.concat(cen,[e.buffer]),{type:"application/zip"});
}
function dlLink(name,blob,btn){ var old=btn?btn.textContent:""; try{ var u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(u); },4000); if(btn){ btn.textContent="Download started"; setTimeout(function(){ btn.textContent=old; },1800); } }catch(e){ if(btn){ btn.textContent="Blocked by the browser"; setTimeout(function(){ btn.textContent=old; },2600); } } }
/* several files in one zip: through the viewer's save prompt when there is one, otherwise a normal link download */
window.__dlZip=function(zipName,files,btn){
  var blob=dlZipBlob(files), old=btn?btn.textContent:"";
  function say(t,ms){ if(!btn) return; btn.textContent=t; setTimeout(function(){ btn.textContent=old; },ms||2200); }
  if(!DLNS){ dlLink(zipName,blob,btn); return; }
  try{ DLNS.save({filename:zipName,data:blob}).then(function(){ say("Saved "+zipName+": unzip it into the Scripts folder",6000); },function(e){ say(dlErr(e),3200); }); }catch(e){ say(dlErr(e),3200); }
};
function dlErr(e){ var c=e&&e.code; return c==="declined"?"Cancelled":(c==="rate_limited"?"A save prompt is already open":"Could not save here: use Copy or Show text"); }
function dlSave(name,data,btn,fallback){
  if(!DLNS){ fallback(); return; }
  var ren=!DL_OK.test(name), fn=ren?name.replace(/\.[^.]+$/,"")+".zip":name, old=btn?btn.textContent:"";
  function say(t,ms){ if(!btn) return; btn.textContent=t; setTimeout(function(){ btn.textContent=old; },ms||2200); }
  var payload=ren?dlZipBlob([[name,data]]):data;
  try{ DLNS.save({filename:fn,data:payload}).then(function(){ say(ren?"Saved "+fn+": unzip it for "+name:"Saved",ren?6000:1800); },function(e){ say(dlErr(e),3200); }); }
  catch(e){ say(dlErr(e),3200); }
}
var _wfDownload=wfDownload;
wfDownload=function(name,text,btn){ dlSave(name,text,btn,function(){ _wfDownload(name,text,btn); }); };

/* ---------- tmx: treemap PNG ---------- */
function tmxResolve(svgText){
  var cs=getComputedStyle(document.documentElement);
  function v(name,fb){ var x=cs.getPropertyValue(name).trim(); return x||fb||"#888"; }
  var out=svgText, guard=0;
  while(/var\(--[\w-]+(?:,[^()]*)?\)/.test(out)&&guard++<5) out=out.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g,function(m,n,fb){ return v(n,fb&&fb.trim()); });
  return out;
}
function tmxSave(btn){
  var svg=document.querySelector("#tmWrap svg"); if(!svg) return;
  var old=btn.textContent; btn.textContent="Rendering…"; btn.disabled=true;
  function done(msg){ btn.textContent=msg; setTimeout(function(){ btn.textContent=old; btn.disabled=false; },2200); }
  try{
    var vb=(svg.getAttribute("viewBox")||"0 0 1180 660").split(/\s+/).map(Number), W=vb[2], H=vb[3], S=3, cap=44;
    var cl=svg.cloneNode(true); cl.setAttribute("xmlns","http://www.w3.org/2000/svg"); cl.setAttribute("width",String(W*S)); cl.setAttribute("height",String(H*S)); cl.removeAttribute("style");
    var txt=tmxResolve(new XMLSerializer().serializeToString(cl));
    var cs=getComputedStyle(document.documentElement), bg=cs.getPropertyValue("--surface").trim()||"#fff", ink=cs.getPropertyValue("--ink").trim()||"#111", ink3=cs.getPropertyValue("--ink-3").trim()||"#777";
    var img=new Image(), url=URL.createObjectURL(new Blob([txt],{type:"image/svg+xml;charset=utf-8"}));
    img.onload=function(){
      try{
        var c=document.createElement("canvas"); c.width=W*S; c.height=(H+cap)*S; var g=c.getContext("2d");
        g.fillStyle=bg; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,W*S,H*S); URL.revokeObjectURL(url);
        function lab(sel){ var b=document.querySelector(sel+" button[aria-pressed=\"true\"]"); return b?b.textContent.trim():""; }
        var grp=document.getElementById("tmGroup"), date=(typeof U!=="undefined"&&U&&U.date)?U.date:"";
        var line1="Sector Rotation Terminal · Treemap · bar "+date, line2="Area: "+lab("#tmSize")+"   ·   Colour: "+lab("#tmColour")+"   ·   "+lab("#tmUni")+"   ·   "+(grp&&grp.checked?"grouped by sector":"not grouped");
        g.fillStyle=ink; g.font="600 "+(13*S)+"px -apple-system,Segoe UI,Helvetica,Arial,sans-serif"; g.fillText(line1,10*S,(H+18)*S);
        g.fillStyle=ink3; g.font=(11*S)+"px -apple-system,Segoe UI,Helvetica,Arial,sans-serif"; g.fillText(line2,10*S,(H+36)*S);
        c.toBlob(function(b){
          if(!b){ done("Could not render"); return; }
          var name="treemap_"+String(date).replace(/\//g,"-")+"_"+lab("#tmSize").replace(/\W+/g,"")+"_"+lab("#tmColour").replace(/\W+/g,"")+".png";
          if(DLNS){ try{ DLNS.save({filename:name,data:b}).then(function(){ done("Saved"); },function(e){ done(dlErr(e)); }); }catch(e){ done(dlErr(e)); } return; }
          try{ var u=URL.createObjectURL(b), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(u); },4000); done("Download started"); }
          catch(e){ done("Blocked by the browser"); }
        },"image/png");
      }catch(e){ done("Could not render"); }
    };
    img.onerror=function(){ URL.revokeObjectURL(url); done("Could not render"); };
    img.src=url;
  }catch(e){ done("Could not render"); }
}
function tmxInit(){
  var wrap=document.getElementById("tmWrap"); if(!wrap||document.getElementById("tmxSave")) return;
  var controls=wrap.closest(".block")?wrap.closest(".block").querySelector(".controls"):null; if(!controls) return;
  var b=document.createElement("button"); b.type="button"; b.className="btn ghost"; b.id="tmxSave"; b.textContent="Save view as PNG (3×)";
  b.title="Save the treemap exactly as shown (area, colour, universe, grouping) as a high-resolution PNG, 3 times the on-screen size";
  b.style.marginLeft="auto"; b.addEventListener("click",function(){ tmxSave(b); });
  controls.appendChild(b);
}

/* ---------- sbx: Subsector Web switches ---------- */
var SBX_MEANS=lsGet("sbxMeans","1")!=="0", SBX_ISO=lsGet("sbxIso","1")!=="0";
function sbxApply(M){
  var host=document.getElementById("sbwChart"), svg=host?host.querySelector("svg"):null; if(!svg) return;
  var sec=M&&M.byKey?M.byKey[sbwSec]:null; if(!sec) return;
  var inds=sec.indList, sel=sbwInd;
  if(!SBX_MEANS){
    Array.prototype.forEach.call(svg.querySelectorAll("text"),function(t){
      var tx=(t.textContent||"").trim();
      if(/^mean -?\d/.test(tx)&&!t.closest(".sbwind")) t.style.display="none";
      else if(t.closest(".sbwind")&&/^-?\d+(\.\d+)?$/.test(tx)) t.style.display="none";
    });
  }
  if(SBX_ISO&&sel&&sec.inds[sel]){
    var keep={}; sec.inds[sel].forEach(function(r){ keep[r.sym]=1; });
    Array.prototype.forEach.call(svg.querySelectorAll(".sbwind"),function(g){ var i=+g.getAttribute("data-i"); if(inds[i]&&inds[i].k!==sel) g.style.display="none"; });
    Array.prototype.forEach.call(svg.querySelectorAll(".sbwdot"),function(c){ if(!keep[c.getAttribute("data-s")]) c.style.display="none"; });
    Array.prototype.forEach.call(svg.querySelectorAll("line"),function(l){ var o=l.getAttribute("stroke-opacity"); if(o==="0.12"||o==="0.08") l.style.display="none"; });
  }
}
var _sbwDraw=sbwDraw;
sbwDraw=function(M,press){ _sbwDraw(M,press); try{ sbxApply(M); }catch(e){} };
function sbxInit(){
  var nm=document.getElementById("sbwNames"); if(!nm||document.getElementById("sbxMeans")) return;
  var lab=nm.closest("label"); if(!lab) return;
  function mk(id,text,title,on,key,set){
    var l=document.createElement("label"); l.className="sw-toggle"; l.title=title;
    l.innerHTML='<input type="checkbox" id="'+id+'"'+(on?" checked":"")+'> '+text;
    lab.parentNode.insertBefore(l,lab.nextSibling);
    l.querySelector("input").addEventListener("change",function(){ set(this.checked); lsSet(key,this.checked?"1":"0"); try{ sbwRender(); }catch(e){} });
    return l;
  }
  var l2=mk("sbxIso","Hide the rest when one is selected","On: clicking an industry circle (or its row in the table) hides every other industry and its companies; click it again for the full picture. Off: the others are dimmed, as before.",SBX_ISO,"sbxIso",function(v){ SBX_ISO=v; });
  var l1=mk("sbxMeans","Mean scores","Show or hide the mean anomaly numbers on the centre and industry circles",SBX_MEANS,"sbxMeans",function(v){ SBX_MEANS=v; });
  l1.parentNode.insertBefore(l1,l2);
}
try{ tmxInit(); }catch(e){}
try{ sbxInit(); }catch(e){}
}catch(e){ try{ console.warn("v82 layer disabled: "+(e&&e.message)); }catch(e2){} }
})();
