/* ================= files, cache, convert and viewer host ================= */
var EXT_LEGACY={doc:"docx",xls:"xlsx",ppt:"pptx"};
var APP_FILES=["index.html","sw.js","manifest.webmanifest",".nojekyll"];
function isApp(p){return APP_FILES.indexOf(p)>=0||p.indexOf("app/")===0;}
function isAppPath(p){return p==="app"||isApp(p);}
function selTouchesApp(){var hit=false;S.lib.sel.forEach(function(p){if(isAppPath(p))hit=true;});return hit;}
function appWarn(t){return el("div",{class:"warnbox"},t);}
function extOf(n){n=basename(n);var i=n.lastIndexOf(".");return i<=0?"":n.slice(i+1).toLowerCase();}
function isLegacy(p){return !!EXT_LEGACY[extOf(p)];}
function hasLegacy(){if(!S.lib.sel.size||!S.repo.loaded)return false;var found=false;S.repo.files.forEach(function(f,p){if(!found&&isSel(p,S.lib.sel)&&isLegacy(p))found=true;});return found;}

var memCache=new Map(), memBytes=0, MEM_MAX=120*MB;
async function blobBySha(sha){
  if(memCache.has(sha)){var m=memCache.get(sha);memCache.delete(sha);memCache.set(sha,m);return m;}
  var blob=null;
  if(S.opts.offline&&window.caches){try{var c=await caches.open("atlas-blobs");var r=await c.match("/__blob/"+sha);if(r)blob=await r.blob();}catch(e){}}
  if(!blob){
    blob=await fetchRaw(sha);
    if(S.opts.offline&&window.caches&&blob.size<=50*MB){try{var c2=await caches.open("atlas-blobs");await c2.put("/__blob/"+sha,new Response(blob));}catch(e){}}
  }
  memCache.set(sha,blob);memBytes+=blob.size;
  while(memBytes>MEM_MAX&&memCache.size>1){var k=memCache.keys().next().value;memBytes-=memCache.get(k).size;memCache.delete(k);}
  return blob;
}
async function clearOffline(){try{await caches.delete("atlas-blobs");}catch(e){} memCache.clear();memBytes=0;}

function sortCmp(a,b){
  if(a.dir!==b.dir) return a.dir?-1:1;
  var dir=S.opts.sortDir==="desc"?-1:1, an=a.name||basename(a.path), bn=b.name||basename(b.path), r=0;
  if(S.opts.sortKey==="size") r=(a.size||0)-(b.size||0);
  else if(S.opts.sortKey==="type") r=extOf(an).localeCompare(extOf(bn));
  if(!r) r=an.localeCompare(bn,undefined,{numeric:true});
  return r*dir;
}
$("sortBtn").innerHTML=svg("sort");
$("sortBtn").onclick=function(){
  var content=el("div",null,
    el("div",{class:"field",style:"margin-top:0"},el("span",null,"Sort by"),seg([["name","Name"],["size","Size"],["type","Type"]],S.opts.sortKey,function(v){S.opts.sortKey=v;savePrefs();renderLibrary();})),
    el("div",{class:"field"},el("span",null,"Order"),seg([["asc","Ascending"],["desc","Descending"]],S.opts.sortDir,function(v){S.opts.sortDir=v;savePrefs();renderLibrary();})));
  openSheet({title:"Sort",content:content,actions:[{label:"Done",kind:"primary"}]});
};

/* ----- viewer host ----- */
function currentDirFiles(path){
  var i=path.lastIndexOf("/"),dir=i>=0?path.slice(0,i):"",m=S.repo.index.get(dir),out=[];
  if(m) m.forEach(function(e){if(!e.dir)out.push(e);});
  return out.sort(sortCmp).map(function(e){return e.path;});
}
async function openFile(path,o){
  if(!(o&&o.isNew)&&!S.repo.files.has(path)){toast("That file isn't in the repository.",true);return;}
  try{ await loadScript("app/viewer.js"); }catch(e){ toast(e.message,true); return; }
  window.AtlasViewer.open(path,o||{});
}
async function downloadPath(path){
  try{saveBlob(await blobBySha(S.repo.files.get(path).sha),basename(path));}catch(e){toast(friendly(e),true);}
}
async function routeToExtract(path){
  try{
    toast("Opening archive…");
    var blob=await blobBySha(S.repo.files.get(path).sha);
    if(window.AtlasViewer) window.AtlasViewer.close(true);
    S.ex.destTouched=false; setTab("extract");
    await exAdd([new File([blob],basename(path))]);
  }catch(e){toast(friendly(e),true);}
}
function encPath(p){return p.split("/").map(encodeURIComponent).join("/");}
async function saveText(path,text,expectSha,force,prog){
  function P(f,t){if(prog)prog(f,t);}
  P(0.05,"Checking for changes");
  var cur=null;
  try{cur=await gh("GET",api()+"/contents/"+encPath(path)+"?ref="+encodeURIComponent(S.cfg.branch));}catch(e){if(e.status!==404)throw e;}
  if(!force&&expectSha&&cur&&cur.sha!==expectSha){var err=new Error("This file was changed somewhere else since you opened it.");err.conflict=true;throw err;}
  if(!expectSha&&cur&&!force){var e2=new Error("A file with this name already exists.");e2.conflict=true;e2.exists=true;throw e2;}
  var bytes=enc.encode(text);
  var body=bytes.length?{content:b64(bytes),encoding:"base64"}:{content:"",encoding:"utf-8"};
  P(0.2,"Uploading the file");
  var blob=await gh("POST",api()+"/git/blobs",body,"fast");
  var old=S.repo.files.get(path);
  await commitEntries([{path:path,mode:old?old.mode:"100644",type:"blob",sha:blob.sha}],(old?"Edit ":"Create ")+basename(path),function(f,t){P(0.3+0.7*f,t);});
  S.repo.files.set(path,{sha:blob.sha,mode:old?old.mode:"100644",size:bytes.length}); buildIndex(); S.act.loaded=false; renderLibrary(); renderSide();
  return blob.sha;
}
async function fileHistory(path){
  return gh("GET",api()+"/commits?sha="+encodeURIComponent(S.cfg.branch)+"&path="+encodeURIComponent(path)+"&per_page=15");
}
async function restoreVersion(path,commitSha,label){
  var c=await gh("GET",api()+"/contents/"+encPath(path)+"?ref="+encodeURIComponent(commitSha));
  var old=S.repo.files.get(path);
  await commitEntries([{path:path,mode:old?old.mode:"100644",type:"blob",sha:c.sha}],"Restore "+basename(path)+(label?" ("+label+")":""));
  S.act.loaded=false; await loadRepo();
  return S.repo.files.get(path);
}
window.AtlasHost={
  S:S,el:el,ico:ico,svg:svg,fmt:fmt,plural:plural,toast:toast,openSheet:openSheet,seg:seg,loadScript:loadScript,basename:basename,joinPath:joinPath,
  extOf:extOf,folderTile:folderTile,fileTile:fileTile,saveBlob:saveBlob,friendly:friendly,ago:ago,isLegacy:isLegacy,
  getBlob:function(path){var f=S.repo.files.get(path);if(!f)return Promise.reject(new Error("File not found."));return blobBySha(f.sha);},
  fileInfo:function(path){return S.repo.files.get(path);},
  has:function(path){return S.repo.files.has(path);},
  siblings:currentDirFiles,saveText:saveText,fileHistory:fileHistory,restoreVersion:restoreVersion,routeToExtract:routeToExtract,download:downloadPath,
  open:openFile,goDir:goDir,convertMany:null,
  convertOne:async function(path){var r=await convertMany([path],{del:false},null);if(r.failed.length)throw new Error(r.failed[0].error);return r.ok.length?r.ok[0].target:r.skipped[0].target;},
  refresh:function(){S.act.loaded=false;return loadRepo();},
  dark:function(){return document.documentElement.getAttribute("data-theme")!=="light";},
  prefs:S.opts,savePrefs:savePrefs,newFolderTile:folderTile
};

/* ----- convert old Office files ----- */
async function convertMany(paths,o,ui){
  ui=ui||{status:function(){},progress:function(){},log:function(){}};
  await Promise.all([loadScript("app/vendor/office.js"),loadScript("app/vendor/pptx-template.js")]);
  await loadScript("app/convert.js");
  var res={ok:[],skipped:[],failed:[]}, entries=[], n=0;
  async function flush(){
    if(!entries.length) return;
    await commitEntries(entries,"Convert "+plural(res.ok.length-n,"file")+" to the newer format"); n=res.ok.length; entries=[];
  }
  for(var i=0;i<paths.length;i++){
    var p=paths[i], f=S.repo.files.get(p);
    ui.progress(i/paths.length); ui.status((i+1)+" of "+paths.length+": "+basename(p));
    try{
      var target=p.slice(0,p.length-extOf(p).length)+EXT_LEGACY[extOf(p)];
      if(S.repo.files.has(target)){res.skipped.push({path:p,target:target});ui.log("Skipped "+p+" because "+basename(target)+" already exists","warn");continue;}
      var blob=await blobBySha(f.sha), bytes=new Uint8Array(await blob.arrayBuffer());
      var r=await window.AtlasConvert.convert(basename(p),bytes);
      var bl=await gh("POST",api()+"/git/blobs",{content:await toBase64(new Blob([r.bytes])),encoding:"base64"},true);
      entries.push({path:target,mode:"100644",type:"blob",sha:bl.sha});
      if(o.del) entries.push({path:p,mode:"100644",type:"blob",sha:null});
      S.repo.files.set(target,{sha:bl.sha,mode:"100644",size:r.bytes.length});
      res.ok.push({path:p,target:target,notes:r.notes});
      ui.log("Converted "+p+" to "+basename(target),"ok");
    }catch(e){
      if(e&&(e.status===401||e.status===403)) throw e;
      res.failed.push({path:p,error:e&&e.message||String(e)}); ui.log("Failed: "+p+". "+(e&&e.message||e),"bad");
    }
    if(entries.length>=20) await flush();
  }
  await flush(); ui.progress(1);
  S.act.loaded=false; await loadRepo();
  return res;
}
$("actConvert").onclick=function(){
  var paths=blobsUnder(S.lib.sel).filter(isLegacy).sort(); if(!paths.length) return;
  var counts={}; paths.forEach(function(p){var e=extOf(p);counts[e]=(counts[e]||0)+1;});
  var del=false, running=false;
  var cb=el("input",{type:"checkbox",onchange:function(){del=cb.checked;}});
  var bar=el("i"), progress=el("div",{class:"progress",hidden:true},bar), status=el("div",{class:"status small"}), logEl=el("div",{class:"log",hidden:true});
  var content=el("div",null,
    el("p",null,"Convert "+plural(paths.length,"old Office file")+" ("+Object.keys(counts).map(function(k){return counts[k]+" ."+k+" to ."+EXT_LEGACY[k];}).join(", ")+") and save the new files next to the originals."),
    el("p",{class:"hint"},"Text, tables and pictures are carried over; complex page design is simplified. Files that already have a converted copy are skipped."),
    el("label",{class:"check",style:"margin-top:10px"},cb,"Delete the originals after converting"),
    progress,status,logEl);
  var sh=openSheet({title:"Convert to newer format",content:content,actions:[
    {label:"Close",fn:function(a){a.close();}},
    {label:"Convert",kind:"primary",fn:async function(a){
      running=true; a.lock(true); progress.hidden=false; progress.classList.add("run"); logEl.hidden=false;
      var ui={status:function(t){status.textContent=t;},progress:function(f){bar.style.width=Math.round(f*100)+"%";},log:function(m,c){logEl.appendChild(el("div",{class:c||""},m));logEl.scrollTop=logEl.scrollHeight;}};
      try{
        var r=await convertMany(paths,{del:del},ui);
        status.textContent="Done. "+r.ok.length+" converted"+(r.skipped.length?", "+r.skipped.length+" skipped":"")+(r.failed.length?", "+r.failed.length+" failed":"")+".";
        S.lib.sel.clear(); renderLibrary(); toast(status.textContent,r.failed.length>0);
      }catch(e){status.textContent="Stopped: "+friendly(e);}
      finally{progress.classList.remove("run");a.lock(false);running=false;sh.btns[1].disabled=true;}
    }}]});
};

/* ----- new file ----- */
$("newFile").append(ico("fileplus"));
[["newFolder","New folder"],["newFile","New file"],["addFiles","Add files"],["libRefresh","Refresh"],["sortBtn","Sort"],["searchBtn","Search"]].forEach(function(x){$(x[0]).setAttribute("aria-label",x[1]);$(x[0]).title=x[1];});
$("searchBtn").innerHTML=svg("search");
function setSearch(open){
  var w=$("searchWrap"); w.classList.toggle("open",open); w.inert=!open;
  $("searchBtn").setAttribute("aria-expanded",String(open)); $("searchBtn").classList.toggle("on",open);
  if(open) setTimeout(function(){try{$("libSearch").focus({preventScroll:true});}catch(e){}},200);
  else if(S.lib.q){ S.lib.q=""; $("libSearch").value=""; renderLibrary(); }
}
$("searchBtn").onclick=function(){setSearch(!$("searchWrap").classList.contains("open"));};
$("libSearch").addEventListener("keydown",function(e){ if(e.key==="Escape"){e.preventDefault();e.stopPropagation();setSearch(false);$("searchBtn").focus();} });
function fitConn(){
  var t=$("connName"); if(!t||!t.parentNode||$("shell").hidden) return;
  var s=13; t.style.fontSize=s+"px";
  while(t.scrollWidth>t.clientWidth+1&&s>9){ s-=.5; t.style.fontSize=s+"px"; }
}
window.addEventListener("resize",fitConn);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitConn);
$("newFile").onclick=function(){
  var nameIn=el("input",{placeholder:"notes.md",autocapitalize:"off",autocomplete:"off",spellcheck:"false"});
  openSheet({title:"New file",sub:"In "+(S.lib.cwd?"/"+S.lib.cwd:"All files"),content:el("label",{class:"field",style:"margin-top:0"},el("span",null,"Name"),nameIn),actions:[
    {label:"Cancel"},
    {label:"Create",kind:"primary",fn:async function(a){
      var n=normPath(nameIn.value); if(!n) throw new Error("Enter a file name.");
      var path=joinPath(S.lib.cwd,n);
      if(S.repo.files.has(path)||S.repo.dirs.has(path)) throw new Error("That name is already in use.");
      a.close(); openFile(path,{isNew:true});
    }}]});
  setTimeout(function(){nameIn.focus();},320);
};

/* ----- menu, install, offline ----- */
var deferredInstall=null;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferredInstall=e;});
function switchRow(label,checked,onChange,hint){
  var cb=el("input",{type:"checkbox",checked:checked,onchange:function(){onChange(cb.checked);}});
  return el("div",null,el("label",{class:"check"},cb,label),hint?el("p",{class:"hint",style:"margin:0 0 8px 34px"},hint):null);
}
var THEME_BAR={light:"#ffffff",dark:"#060914",night:"#000000"};
function applyTheme(t,nosave){
  if(!THEME_BAR[t]) t="dark"; S.opts.theme=t; if(!nosave) savePrefs();
  document.documentElement.setAttribute("data-theme",t);
  var m=document.querySelector("meta[name=theme-color]"); if(m) m.setAttribute("content",THEME_BAR[t]);
}
/* no right-click menu, except where the person types */
document.addEventListener("contextmenu",function(e){
  var t=e.target, ok=false, f;
  if(t&&t.closest){
    f=t.closest("input,textarea,[contenteditable=true]");
    if(f) ok=f.tagName!=="INPUT"||/^(text|number|password|search|url|email|tel)$/i.test(f.getAttribute("type")||"text");
  }
  if(!ok) e.preventDefault();
},true);
$("menuBtn").innerHTML=svg("dots");
$("menuBtn").addEventListener("click",function(){
  var tabs=el("div",{class:"menutabs"},TABS.map(function(t){
    return el("button",{type:"button","aria-current":String(S.tab===t[0]),onclick:function(){closeAllSheets();setTab(t[0]);}},ico(t[2]),t[1]);
  }));
  var list=el("div",{style:"display:grid;gap:6px"},
    tabs,
    el("div",{class:"field",style:"margin:6px 0 2px"},el("span",null,"Appearance"),seg([["light","Light"],["dark","Dark"],["night","Night"]],S.opts.theme||"dark",function(v){applyTheme(v);})),
    switchRow("Show app files",!S.opts.hideApp,function(v){S.opts.hideApp=!v;savePrefs();buildIndex();renderLibrary();renderSide();},"The files that make this app run (index.html and the app folder). They show with an app tag. Be careful changing them."),
    switchRow("Keep opened files for offline use",!!S.opts.offline,function(v){S.opts.offline=v;savePrefs();if(!v)clearOffline();},"Saves files you open on this device, unencrypted, so they open without a connection. Turn off on a shared device."),
    el("div",{style:"display:grid;gap:10px;margin-top:8px"},
      deferredInstall?el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();deferredInstall.prompt();deferredInstall=null;}},"Install this app"):null,
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();switchSheet();}},ico("sort"),"Switch repository"),
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();showSetup(S.pid);}},"Edit details"),
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();manageSheet();}},"Saved repositories"),
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();lockNow();}},ico("lock"),"Log out"),
      el("button",{class:"btn block",type:"button",onclick:async function(){await clearOffline();toast("Offline files cleared");}},"Clear offline files"),
      el("button",{class:"btn block",type:"button",style:"color:var(--danger)",onclick:function(){closeAllSheets();resetDeviceSheet();}},"Reset this device")));
  openSheet({title:"Menu",content:list,actions:[{label:"Close"}]});
});
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)){ window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});}); }

