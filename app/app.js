(function(){
"use strict";
var MB=1048576, MAX_BYTES=100*MB, BATCH_FILES=40, BATCH_BYTES=60*MB, WRITE_GAP=700;
var $=function(id){return document.getElementById(id);};
var enc=new TextEncoder(), dec=new TextDecoder();
var LOADED={};
function loadScript(url){
  if(LOADED[url]) return LOADED[url];
  return LOADED[url]=new Promise(function(res,rej){
    var s=document.createElement("script");s.src=url;s.onload=function(){res();};
    s.onerror=function(){delete LOADED[url];rej(new Error("Couldn't load "+url+". Make sure the app files are in the repository."));};
    document.head.appendChild(s);
  });
}
async function needZip(){ await loadScript("app/vendor/zip.min.js"); if(!needZip.done){zip.configure({useWebWorkers:false});needZip.done=true;} }

/* ================= helpers ================= */
var ICONS={
 mark:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c3 2.6 3 14.4 0 17"/><path d="M12 3.5c-3 2.6-3 14.4 0 17"/>',
 upload:'<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
 files:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
 move:'<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
 download:'<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.5-3.5"/><path d="M5 3.5v4h4"/><path d="M4 13a8 8 0 0 0 14.5 3.5"/><path d="M19 20.5v-4h-4"/>',
 dots:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 chev:'<path d="m9 6 6 6-6 6"/>',
 home:'<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2"/><path d="M6.3 6.4A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
 archive:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M12 12v5"/><path d="m9.5 14.5 2.5 2.5 2.5-2.5"/>',
 folderplus:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
 sort:'<path d="M7 4v16"/><path d="m3 16 4 4 4-4"/><path d="M17 20V4"/><path d="m13 8 4-4 4 4"/>',
 convert:'<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',
 back:'<path d="m15 5-7 7 7 7"/>',
 pencil:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'
};
function svg(n,sw){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.8)+'" stroke-linecap="round" stroke-linejoin="round">'+ICONS[n]+'</svg>';}
function ico(n){var s=document.createElement("span");s.className="ico";s.innerHTML=svg(n);return s;}
function el(tag,props){
  var n=document.createElement(tag), i, k, v;
  if(props) for(k in props){ v=props[k]; if(v==null||v===false) continue;
    if(k==="class") n.className=v;
    else if(k.slice(0,2)==="on") n.addEventListener(k.slice(2),v);
    else if(k==="value"||k==="checked"||k==="disabled"||k==="indeterminate") n[k]=v;
    else if(k==="style") n.style.cssText=v;
    else n.setAttribute(k,v===true?"":v);
  }
  for(i=2;i<arguments.length;i++) add(n,arguments[i]);
  return n;
}
function add(n,c){
  if(c==null||c===false) return;
  if(Array.isArray(c)) c.forEach(function(x){add(n,x);});
  else n.appendChild(typeof c==="object"?c:document.createTextNode(String(c)));
}
function hydrateIcons(){document.querySelectorAll("[data-ico]").forEach(function(n){ if(!n.firstChild) n.innerHTML=svg(n.getAttribute("data-ico"),1.7); });}
function fmt(n){
  if(n<1024) return n+" B";
  if(n<MB) return Math.round(n/1024)+" KB";
  if(n<1024*MB) return (n/MB).toFixed(1)+" MB";
  return (n/1024/MB).toFixed(2)+" GB";
}
function plural(n,w){return n+" "+w+(n===1?"":"s");}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function ago(iso){
  var s=(Date.now()-new Date(iso).getTime())/1000;
  if(s<60) return "just now";
  if(s<3600) return Math.floor(s/60)+" min ago";
  if(s<86400) return Math.floor(s/3600)+" h ago";
  return new Date(iso).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}
function hue(name){var h=0,i;for(i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0; return (h*47)%360;}
var FOLDER_SVG='<svg viewBox="0 0 32 32" fill="currentColor"><path opacity=".5" d="M3 8a3 3 0 0 1 3-3h6l3 3h11a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M3 13a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/></svg>';
function folderTile(name){var t=el("span",{class:"tile fold",style:"--h:"+hue(name||"/")});t.innerHTML=FOLDER_SVG;return t;}
function folderMini(name){var t=el("span",{class:"mini",style:"--h:"+hue(name||"/")});t.innerHTML=FOLDER_SVG;return t;}
function fileTile(name){var d=name.lastIndexOf("."), ext=d>0?name.slice(d+1,d+5):"";return el("span",{class:"tile file"},ext.toUpperCase());}
function toast(msg,bad){
  var t=el("div",{class:"toast"+(bad?" bad":""),role:"status"},msg);
  $("toasts").appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },bad?6500:3400);
}
function basename(p){return p.slice(p.lastIndexOf("/")+1);}
function joinPath(a,b){return a?a+"/"+b:b;}
function cleanSegs(p){
  var parts=String(p||"").replace(/\\/g,"/").split("/").filter(function(x){return x&&x!==".";}), i;
  for(i=0;i<parts.length;i++){ if(parts[i]===".."||parts[i].toLowerCase()===".git"||/[\u0000-\u001f]/.test(parts[i])) return null; }
  return parts;
}
function normPath(p){var s=cleanSegs(p);return s?s.join("/"):null;}
function nthPath(path,n,isDir){
  var i=path.lastIndexOf("/"), dir=i>=0?path.slice(0,i+1):"", base=path.slice(i+1);
  var dot=isDir?-1:base.lastIndexOf("."), stem=dot>0?base.slice(0,dot):base, ext=dot>0?base.slice(dot):"";
  return dir+stem+"_"+n+ext;
}
function uniquePath(path,taken,isDir){for(var n=1;;n++){var c=nthPath(path,n,isDir);if(!taken(c)) return c;}}
function hasAncestor(p,set){var i=p.lastIndexOf("/");while(i>0){if(set.has(p.slice(0,i)))return true;i=p.lastIndexOf("/",i-1);}return false;}
function isSel(p,set){return set.has(p)||hasAncestor(p,set);}
function isKeep(p){return basename(p)===".gitkeep";}
function saveBlob(blob,name){
  var u=URL.createObjectURL(blob), a=el("a",{href:u,download:name,style:"display:none"});
  document.body.appendChild(a); a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},60000);
}

/* ================= state ================= */
var S={
  cfg:null, pass:null, tab:"files", logSink:null,
  repo:{loaded:false,loading:false,error:null,files:new Map(),dirs:new Set(),index:new Map(),head:null},
  ex:{readers:[],items:[],errors:[],root:null,locked:[],dest:"",destTouched:false,running:false,cancel:false,opening:false},
  lib:{cwd:"",sel:new Set(),q:"",exp:new Set()},
  act:{loaded:false,list:[]},
  opts:{filePolicy:"skip",folderPolicy:"merge",strip:false,limit:48,sortKey:"name",sortDir:"asc",showApp:false,offline:false}
};
var VK="a_vault", PK="a_prefs", lastWrite=0, hiddenAt=0;

/* ================= vault ================= */
var CAN_CRYPTO=!!(window.crypto&&crypto.subtle);
function b64(u8){var s="",i;for(i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function unb64(s){var bin=atob(s),u=new Uint8Array(bin.length),i;for(i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
async function deriveKey(pass,salt){
  var km=await crypto.subtle.importKey("raw",enc.encode(pass),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:200000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function vaultSave(cfg,pass){
  var salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  var key=await deriveKey(pass,salt);
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc.encode(JSON.stringify(cfg))));
  localStorage.setItem(VK,JSON.stringify({v:1,s:b64(salt),i:b64(iv),d:b64(ct)}));
}
async function vaultOpen(pass){
  var o=JSON.parse(localStorage.getItem(VK));
  var key=await deriveKey(pass,unb64(o.s));
  var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(o.i)},key,unb64(o.d));
  return JSON.parse(dec.decode(pt));
}
function hasVault(){try{return !!localStorage.getItem(VK);}catch(e){return false;}}
function loadPrefs(){try{Object.assign(S.opts,JSON.parse(localStorage.getItem(PK)||"{}"));}catch(e){}}
function savePrefs(){try{localStorage.setItem(PK,JSON.stringify(S.opts));}catch(e){}}

/* ================= screens ================= */
function showScreen(name){
  ["s-lock","s-setup","shell"].forEach(function(id){$(id).hidden=(id!==name);});
  window.scrollTo(0,0);
}
function lockNow(){
  S.cfg=null; S.pass=null; resetRepo(); S.lib.sel.clear(); closeAllSheets();
  $("lockPass").value=""; $("lockErr").textContent="";
  if(hasVault()){ showScreen("s-lock"); $("lockPass").focus(); } else showSetup(false);
}
$("lockForm").addEventListener("submit",async function(e){
  e.preventDefault();
  var pass=$("lockPass").value; if(!pass) return;
  $("lockGo").disabled=true; $("lockErr").textContent="";
  try{ S.cfg=await vaultOpen(pass); S.pass=pass; $("lockPass").value=""; enterApp(); }
  catch(err){ await sleep(600); $("lockErr").textContent="That passcode didn't work."; }
  $("lockGo").disabled=false;
});
$("lockReset").addEventListener("click",function(){
  openSheet({title:"Reset this device?",content:el("p",{class:"muted"},"This removes the saved details from this device. You can set them up again afterwards."),
    actions:[{label:"Cancel"},{label:"Reset",kind:"danger",fn:function(a){try{localStorage.removeItem(VK);}catch(e){} a.close(); showSetup(false);}}]});
});
function showSetup(editing){
  var c=S.cfg||{}, parts=(c.repo||"").split("/");
  $("cfgOwner").value=parts[0]||""; $("cfgRepo").value=parts[1]||""; $("cfgBranch").value=c.branch||"main"; $("cfgToken").value=c.token||"";
  $("cfgPass").value=editing?(S.pass||""):""; $("cfgToken").type="password";
  $("setupErr").textContent=""; $("setupCancel").hidden=!editing;
  $("passRow").hidden=$("passHint").hidden=!CAN_CRYPTO;
  showScreen("s-setup");
}
$("tokEye").innerHTML=svg("eye");
$("tokEye").addEventListener("click",function(){
  var f=$("cfgToken"), show=f.type==="password"; f.type=show?"text":"password"; $("tokEye").innerHTML=svg(show?"eyeoff":"eye");
});
$("setupCancel").addEventListener("click",function(){showScreen("shell");});
$("setupForm").addEventListener("submit",async function(e){
  e.preventDefault();
  var owner=$("cfgOwner").value.trim().replace(/^@/,""), name=$("cfgRepo").value.trim().replace(/\.git$/,"");
  var m=owner.match(/github\.com\/([^\/]+)(?:\/([^\/]+))?/i); if(m){owner=m[1]; if(m[2]&&!name) name=m[2].replace(/\.git$/,"");}
  var branch=$("cfgBranch").value.trim()||"main", token=$("cfgToken").value.trim(), pass=$("cfgPass").value;
  if(!/^[\w.-]+$/.test(owner)){ $("setupErr").textContent="Enter your GitHub account name."; return; }
  if(!/^[\w.-]+$/.test(name)){ $("setupErr").textContent="Enter the repository name."; return; }
  if(!token){ $("setupErr").textContent="Enter your access token."; return; }
  $("setupGo").disabled=true;
  try{
    var cfg={repo:owner+"/"+name,branch:branch,token:token};
    if(pass&&CAN_CRYPTO){ await vaultSave(cfg,pass); S.pass=pass; }
    else { try{localStorage.removeItem(VK);}catch(x){} S.pass=null; }
    S.cfg=cfg; resetRepo(); enterApp();
  }catch(err){ $("setupErr").textContent="Couldn't save: "+(err&&err.message||err); }
  $("setupGo").disabled=false;
});
document.addEventListener("visibilitychange",function(){
  if(document.hidden){ hiddenAt=Date.now(); return; }
  if(S.cfg&&hasVault()&&!S.ex.running&&!uploadBusy&&hiddenAt&&Date.now()-hiddenAt>120000) lockNow();
});

/* ================= sheets (stackable) ================= */
var sheetStack=[];
function closeLayer(layer){
  var i=sheetStack.indexOf(layer); if(i<0) return; sheetStack.splice(i,1);
  layer.classList.remove("open");
  setTimeout(function(){ if(layer.parentNode) layer.parentNode.removeChild(layer); },300);
  if(layer._onClose) layer._onClose();
}
function closeAllSheets(){sheetStack.slice().forEach(closeLayer);}
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"&&sheetStack.length){var l=sheetStack[sheetStack.length-1]; if(!l._locked){e.preventDefault();closeLayer(l);}}
});
function openSheet(o){
  var sbar=el("div",{class:"sbar",hidden:true},el("i")), layer=el("div",{class:"layer"}), errEl=el("p",{class:"err",role:"alert"}), foot=el("div",{class:"foot"}), btns=[];
  layer._onClose=o.onClose||null;
  var api={
    layer:layer, btns:btns,
    close:function(){closeLayer(layer);},
    error:function(m){errEl.textContent=m||"";},
    busy:function(on){btns.forEach(function(b){b.disabled=on;});sbar.hidden=!on;},
    lock:function(on){layer._locked=on;}
  };
  (o.actions||[]).forEach(function(a){
    var b=el("button",{type:"button",class:"btn "+(a.kind||""),onclick:async function(){
      if(!a.fn){closeLayer(layer);return;}
      api.error(""); api.busy(true);
      try{ await a.fn(api); }catch(e){ api.error(e&&e.message||String(e)); }
      if(layer.parentNode&&!layer._locked) api.busy(false);
    }},a.label);
    btns.push(b); foot.appendChild(b);
  });
  var panel=el("div",{class:"sheet",role:"dialog","aria-modal":"true"},
    sbar,el("h2",null,o.title), o.sub?el("p",{class:"muted"},o.sub):null,
    el("div",{class:"body"},o.content), errEl, o.noFooter?null:foot);
  layer.append(el("div",{class:"backdrop",onclick:function(){if(!layer._locked)closeLayer(layer);}}),panel);
  $("sheetRoot").appendChild(layer); sheetStack.push(layer);
  requestAnimationFrame(function(){requestAnimationFrame(function(){layer.classList.add("open");});});
  return api;
}
function seg(opts,value,onChange){
  var wrap=el("div",{class:"seg"});
  opts.forEach(function(o){
    wrap.appendChild(el("button",{type:"button","aria-pressed":String(o[0]===value),onclick:function(){
      onChange(o[0]);
      wrap.querySelectorAll("button").forEach(function(b,i){b.setAttribute("aria-pressed",String(opts[i][0]===o[0]));});
    }},o[1]));
  });
  return wrap;
}

/* ================= tabs, sidebar, menu ================= */
var TABS=[["files","Files","files"],["extract","Extract","archive"],["history","History","clock"]];
function buildTabs(){
  var side=$("sideNav"), bot=$("tabsBottom"); side.replaceChildren(); bot.replaceChildren();
  TABS.forEach(function(t){
    side.appendChild(el("button",{type:"button","data-tab":t[0],onclick:function(){setTab(t[0]);}},ico(t[2]),t[1]));
    bot.appendChild(el("button",{type:"button","data-tab":t[0],onclick:function(){setTab(t[0]);}},ico(t[2]),t[1]));
  });
}
function setTab(name){
  S.tab=name;
  TABS.forEach(function(t){$("tab-"+t[0]).hidden=(t[0]!==name);});
  document.querySelectorAll("[data-tab]").forEach(function(b){b.setAttribute("aria-current",String(b.getAttribute("data-tab")===name));});
  if(name==="files") renderLibrary();
  if(name==="extract"){ if(!S.ex.destTouched) S.ex.dest=S.lib.cwd; paintExDest(); upPreview(); }
  if(name==="history"&&!S.act.loaded) loadActivity();
  updateActionbar(); $("pane").scrollTop=0; window.scrollTo(0,0);
}
/* ================= GitHub API ================= */
function bp(){return S.cfg.branch.split("/").map(encodeURIComponent).join("/");}
function api(){return "/repos/"+S.cfg.repo;}
function hdrs(extra){
  var h={"Authorization":"Bearer "+S.cfg.token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  if(extra) for(var k in extra) h[k]=extra[k];
  return h;
}
function slog(msg,cls){ if(S.logSink) S.logSink(msg,cls); }
async function gh(method,path,body,isWrite){
  for(var attempt=0;;attempt++){
    if(isWrite){ if(isWrite!=="fast"){ var w=lastWrite+WRITE_GAP-Date.now(); if(w>0) await sleep(w); } lastWrite=Date.now(); }
    var resp;
    try{
      var headers=hdrs(); if(body) headers["Content-Type"]="application/json";
      resp=await fetch("https://api.github.com"+path,{method:method,headers:headers,cache:"no-store",body:body?JSON.stringify(body):undefined});
    }catch(e){
      if(attempt<4){await sleep(1500*(attempt+1));continue;}
      throw new Error("No connection. Check your network and try again.");
    }
    if(resp.ok) return resp.status===204?null:await resp.json();
    var text=await resp.text(), msg=text;
    try{msg=JSON.parse(text).message||text;}catch(e){}
    var ra=parseInt(resp.headers.get("retry-after")||"0",10), rem=resp.headers.get("x-ratelimit-remaining");
    if((resp.status===403||resp.status===429)&&attempt<6&&(ra||rem==="0"||/rate limit|abuse|secondary/i.test(msg))){
      var ms=ra?ra*1000:(rem==="0"?Math.max(0,(+resp.headers.get("x-ratelimit-reset"))*1000-Date.now())+1000:60000);
      ms=Math.min(ms,15*60000); slog("Rate limited. Waiting "+Math.ceil(ms/1000)+" s.","warn"); await sleep(ms); continue;
    }
    if(resp.status>=500&&attempt<4){await sleep(2000*(attempt+1));continue;}
    var err=new Error(resp.status+" "+msg); err.status=resp.status; throw err;
  }
}
async function fetchRaw(sha){
  for(var attempt=0;;attempt++){
    var resp;
    try{ resp=await fetch("https://api.github.com"+api()+"/git/blobs/"+sha,{headers:hdrs({"Accept":"application/vnd.github.raw+json"}),cache:"no-store"}); }
    catch(e){ if(attempt<3){await sleep(1200*(attempt+1));continue;} throw new Error("No connection. Check your network and try again."); }
    if(resp.ok) return resp.blob();
    if((resp.status===403||resp.status===429||resp.status>=500)&&attempt<4){
      var ra=parseInt(resp.headers.get("retry-after")||"0",10); await sleep(ra?ra*1000:2000*(attempt+1)); continue;
    }
    var err=new Error("Couldn't download a file ("+resp.status+")."); err.status=resp.status; throw err;
  }
}
function friendly(e){
  if(e.status===401) return "The access token was rejected. Edit your details and enter a valid token.";
  if(e.status===404) return "The repository or branch wasn't found, or the token has no access to it.";
  if(e.status===409) return "The repository is empty. Add a first file there, then try again.";
  if(e.status===403) return "The token doesn't have permission to do that. It needs read and write access to contents.";
  return e.message||String(e);
}
function resetRepo(){
  S.repo={loaded:false,loading:false,error:null,files:new Map(),dirs:new Set(),index:new Map(),head:null};
  S.act={loaded:false,list:[]};
}
function buildIndex(){
  var idx=new Map(), dirs=new Set(); idx.set("",new Map());
  S.repo.files.forEach(function(f,p){
    if(!S.opts.showApp&&isApp(p)) return;
    var parts=p.split("/"), keep=parts[parts.length-1]===".gitkeep", n=keep?parts.length-1:parts.length, dir="", i, name, isFile, m, e;
    for(i=0;i<n;i++){
      name=parts[i]; isFile=(i===parts.length-1);
      m=idx.get(dir); if(!m){m=new Map();idx.set(dir,m);}
      e=m.get(name);
      if(!e){e={name:name,dir:!isFile,count:0,size:0,path:joinPath(dir,name)};m.set(name,e);}
      e.count++; e.size+=f.size;
      if(!isFile){dir=e.path;dirs.add(dir);}
    }
  });
  S.repo.index=idx; S.repo.dirs=dirs;
}
async function readRepoState(){
  var ref=await gh("GET",api()+"/git/ref/heads/"+bp());
  var commit=await gh("GET",api()+"/git/commits/"+ref.object.sha);
  var tree=await gh("GET",api()+"/git/trees/"+commit.tree.sha+"?recursive=1");
  var files=new Map();
  (tree.tree||[]).forEach(function(t){ if(t.type==="blob") files.set(t.path,{sha:t.sha,mode:t.mode,size:t.size||0}); });
  S.repo.files=files; S.repo.head=ref.object.sha; S.repo.truncated=!!tree.truncated; buildIndex(); S.repo.loaded=true;
  if(S.lib.cwd&&!S.repo.dirs.has(S.lib.cwd)) S.lib.cwd="";
  return tree;
}
async function loadRepo(){
  var r=S.repo; r.loading=true; r.error=null; renderLibrary();
  try{ await readRepoState(); $("connDot").classList.remove("off"); }
  catch(e){ r.error=friendly(e); r.loaded=false; $("connDot").classList.add("off"); }
  r.loading=false; renderLibrary(); renderSide(); upPreview();
}
async function commitEntries(entries,message,prog){
  function P(f,t){if(prog)prog(f,t);}
  P(0.1,"Checking the latest version");
  var ref=await gh("GET",api()+"/git/ref/heads/"+bp());
  var c=await gh("GET",api()+"/git/commits/"+ref.object.sha);
  P(0.35,"Preparing the change");
  var t=await gh("POST",api()+"/git/trees",{base_tree:c.tree.sha,tree:entries},"fast");
  P(0.65,"Creating the commit");
  var nc=await gh("POST",api()+"/git/commits",{message:message,tree:t.sha,parents:[ref.object.sha]},"fast");
  P(0.9,"Updating the branch");
  await gh("PATCH",api()+"/git/refs/heads/"+bp(),{sha:nc.sha},"fast");
  P(1,"Saved");
}
function enterApp(){
  showScreen("shell"); buildTabs(); hydrateIcons();
  S.lib.sel.clear(); S.lib.cwd=""; S.lib.q=""; $("libSearch").value=""; S.ex.destTouched=false; S.ex.dest="";
  $("connName").textContent=S.cfg.repo; $("connDot").classList.remove("off");
  setTab("files"); loadRepo();
}

/* ================= folder helpers ================= */
function childDirs(dir){
  var m=S.repo.index.get(dir); if(!m) return [];
  return Array.from(m.values()).filter(function(e){return e.dir;}).sort(function(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true});});
}
function goDir(path){
  S.lib.cwd=path; S.lib.q=""; $("libSearch").value="";
  var parts=path?path.split("/"):[], acc="";
  parts.forEach(function(p){acc=joinPath(acc,p);S.lib.exp.add(acc);});
  setTab("files");
}
function renderSide(){
  var box=$("sideTree"); box.replaceChildren();
  var r=S.repo, total=0; r.files.forEach(function(f,p){if(S.opts.showApp||!isApp(p))total+=f.size;});
  $("sideStat").replaceChildren(el("b",null,plural(r.index.size?countVisibleFiles():0,"file")),fmt(total)+" in your repository");
  if(!r.loaded) return;
  box.appendChild(el("div",{class:"trow"+(S.lib.cwd===""?" on":""),onclick:function(){goDir("");}},el("span",{class:"tcaret"}),folderMini("/"),el("span",{class:"tn"},"All files")));
  (function walk(dir,depth){
    childDirs(dir).slice(0,300).forEach(function(d){
      var open=S.lib.exp.has(d.path), has=childDirs(d.path).length>0;
      var caret=el("button",{type:"button",class:"tcaret","aria-expanded":String(open),"aria-label":open?"Collapse":"Expand",onclick:function(ev){ev.stopPropagation();if(open)S.lib.exp.delete(d.path);else S.lib.exp.add(d.path);renderSide();}},has?ico("chev"):null);
      box.appendChild(el("div",{class:"trow"+(S.lib.cwd===d.path?" on":""),style:"padding-left:"+(6+depth*14)+"px",onclick:function(){goDir(d.path);}},caret,folderMini(d.name),el("span",{class:"tn"},d.name)));
      if(open) walk(d.path,depth+1);
    });
  })("",0);
}
function countVisibleFiles(){var n=0;S.repo.files.forEach(function(f,p){if(!isKeep(p)&&(S.opts.showApp||!isApp(p)))n++;});return n;}

/* ================= Files tab ================= */
function blobsUnder(sel){var out=[];S.repo.files.forEach(function(f,p){if(isSel(p,sel))out.push(p);});return out;}
function topSelected(){var s=S.lib.sel;return Array.from(s).filter(function(p){return !hasAncestor(p,s);});}
function dirEntry(path){var i=path.lastIndexOf("/"),parent=i>=0?path.slice(0,i):"",m=S.repo.index.get(parent);return m?m.get(basename(path)):null;}
function visibleRows(){
  var r=S.repo, q=S.lib.q.trim().toLowerCase(), rows=[];
  if(q){
    r.dirs.forEach(function(d){ if(d.toLowerCase().indexOf(q)>=0){var e=dirEntry(d)||{count:0,size:0}; rows.push({dir:true,path:d,count:e.count,size:e.size});} });
    r.files.forEach(function(f,p){ if(!isKeep(p)&&(S.opts.showApp||!isApp(p))&&p.toLowerCase().indexOf(q)>=0) rows.push({dir:false,path:p,size:f.size}); });
    rows.sort(function(a,b){return a.path.localeCompare(b.path);});
    return rows.slice(0,200);
  }
  var m=r.index.get(S.lib.cwd)||new Map();
  return Array.from(m.values()).sort(sortCmp);
}
function renderLibrary(){
  var list=$("libList"), r=S.repo; list.replaceChildren(); $("libCrumbs").replaceChildren();
  $("selAllRow").hidden=true;
  if(r.loading&&!r.loaded){ $("libStat").textContent="Loading"; for(var k=0;k<5;k++) list.appendChild(el("div",{class:"skel"})); return; }
  if(r.error){
    $("libStat").textContent="Couldn't load";
    list.appendChild(el("div",{class:"empty"},el("b",null,"Couldn't load your files"),r.error,
      el("div",{style:"margin-top:14px"},el("button",{class:"btn",type:"button",onclick:loadRepo},"Try again"))));
    return;
  }
  if(!r.loaded) return;
  var total=0; r.files.forEach(function(f,p){if(S.opts.showApp||!isApp(p))total+=f.size;});
  $("libStat").textContent=plural(countVisibleFiles(),"file")+", "+fmt(total)+(r.truncated?" (list is partial)":"");
  var q=S.lib.q.trim();
  if(q){
    $("libCrumbs").appendChild(el("span",{class:"muted small",style:"padding:7px 9px"},"Results for “"+q+"”"));
  }else{
    var parts=S.lib.cwd?S.lib.cwd.split("/"):[], acc="";
    $("libCrumbs").appendChild(el("button",{type:"button",onclick:function(){goDir("");},"aria-label":"All files"},ico("home")));
    parts.forEach(function(p){
      acc=joinPath(acc,p); var path=acc;
      $("libCrumbs").appendChild(ico("chev"));
      $("libCrumbs").appendChild(el("button",{type:"button",onclick:function(){goDir(path);}},p));
    });
  }
  var rows=visibleRows();
  $("addFiles").classList.toggle("pulse",!rows.length&&!q);
  if(!rows.length){
    list.appendChild(el("div",{class:"empty"},el("b",null,q?"Nothing matches":(r.files.size?"This folder is empty":"No files yet")),q?"Try a different search.":"Add files to get started."));
    updateActionbar(); return;
  }
  $("selAllRow").hidden=false;
  var selCount=rows.filter(function(x){return isSel(x.path,S.lib.sel);}).length;
  $("selAllBox").checked=selCount===rows.length; $("selAllBox").indeterminate=selCount>0&&selCount<rows.length;
  rows.forEach(function(x){
    var inherited=hasAncestor(x.path,S.lib.sel), on=S.lib.sel.has(x.path)||inherited;
    var cb=el("input",{type:"checkbox",checked:on,disabled:inherited,"aria-label":"Select "+basename(x.path),
      onchange:function(){ if(cb.checked) S.lib.sel.add(x.path); else S.lib.sel.delete(x.path); renderLibrary(); }});
    var sub=x.dir?(plural(x.count,"file")+", "+fmt(x.size)):fmt(x.size);
    var shown=q?basename(x.path):x.name||basename(x.path);
    var where=q&&basename(x.path)!==x.path?x.path.slice(0,x.path.length-basename(x.path).length-1)+"  ·  "+sub:sub;
    var row=el("div",{class:"row"+(x.dir?" nav":"")+(on?" sel":"")},cb,
      x.dir?folderTile(basename(x.path)):fileTile(basename(x.path)),
      el("div",{class:"name"},shown,el("small",null,where)),
      x.dir?el("span",{class:"muted"},ico("chev")):null);
    row.addEventListener("click",function(e){
      if(e.target===cb) return;
      if(!S.lib.sel.size){ if(x.dir){goDir(x.path);window.scrollTo(0,0);}else openFile(x.path); return; }
      if(inherited) return;
      if(S.lib.sel.has(x.path)) S.lib.sel.delete(x.path); else S.lib.sel.add(x.path);
      renderLibrary();
    });
    list.appendChild(row);
  });
  updateActionbar();
}
function updateActionbar(){
  var n=S.lib.sel.size, bar=$("actionbar");
  bar.classList.toggle("show",n>0&&S.tab==="files");
  $("selCount").textContent=n+" selected";
  $("actRename").hidden=n!==1; $("actConvert").hidden=!hasLegacy();
}
function lbl(t){return el("span",{class:"lbl"},t);}
$("actDownload").append(ico("download"),lbl("Download"));
$("actCopy").append(ico("copy"),lbl("Copy"));
$("actMove").append(ico("move"),lbl("Move"));
$("actRename").append(ico("pencil"),lbl("Rename"));
$("actDel").append(ico("trash"),lbl("Delete"));
$("actClear").appendChild(ico("x"));
$("newFolder").append(ico("folderplus"),"New folder");
$("addFiles").append(ico("plus"),"Add files");
$("actClear").onclick=function(){S.lib.sel.clear();renderLibrary();};
$("libRefresh").innerHTML=svg("refresh");
$("libRefresh").onclick=function(){loadRepo();};
$("libSearch").addEventListener("input",function(e){S.lib.q=e.target.value;renderLibrary();});
$("selAllBox").addEventListener("change",function(){
  var rows=visibleRows();
  if($("selAllBox").checked) rows.forEach(function(x){S.lib.sel.add(x.path);});
  else rows.forEach(function(x){S.lib.sel.delete(x.path);});
  renderLibrary();
});
function describeSel(){
  var top=topSelected(), folders=top.filter(function(p){return S.repo.dirs.has(p);}).length;
  return {top:top,folders:folders,files:blobsUnder(S.lib.sel).filter(function(p){return !isKeep(p);}).length};
}

/* ----- folder tree (used by Move, Copy and the destination picker) ----- */
function folderTree(o){
  o=o||{};
  var sel=o.start||"", open=new Set(), virt=new Set(), box=el("div",{class:"ftree",role:"tree"});
  (function(){var acc="";(sel?sel.split("/"):[]).forEach(function(p){acc=joinPath(acc,p);open.add(acc);});})();
  function kids(dir){
    var names=new Map();
    childDirs(dir).forEach(function(d){names.set(d.name,{path:d.path,name:d.name,count:d.count,virtual:false});});
    virt.forEach(function(v){var i=v.lastIndexOf("/"),par=i>=0?v.slice(0,i):"";if(par===dir&&!names.has(basename(v)))names.set(basename(v),{path:v,name:basename(v),count:0,virtual:true});});
    return Array.from(names.values()).sort(function(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true});});
  }
  function isDis(p){return p!==""&&o.disabled?o.disabled(p):false;}
  function row(path,name,depth,count,isVirtual){
    var ks=kids(path), isRoot=path==="", isOpen=isRoot||open.has(path), dis=isDis(path);
    var caret=el("button",{type:"button",class:"tcaret","aria-label":isOpen?"Collapse":"Expand","aria-expanded":String(isOpen),tabindex:isRoot?"-1":null,
      onclick:function(ev){ev.stopPropagation();if(isRoot)return;if(open.has(path))open.delete(path);else open.add(path);draw();}},(ks.length&&!isRoot)?ico("chev"):null);
    return el("div",{class:"frow"+(sel===path?" on":"")+(dis?" dis":""),role:"treeitem","aria-selected":String(sel===path),style:"padding-left:"+(6+depth*18)+"px",
      onclick:function(){if(dis)return;sel=path;if(o.onChange)o.onChange(sel);draw();}},
      caret,folderMini(isRoot?"/":name),el("span",{class:"tn"},name,isVirtual?el("span",{class:"tag"},"new"):null),
      (count!=null&&!isRoot)?el("span",{class:"tc"},plural(count,"file")):null,
      el("span",{class:"radio"+(sel===path?" on":"")}));
  }
  function walk(path,depth,frag){
    kids(path).forEach(function(k){frag.appendChild(row(k.path,k.name,depth,k.count,k.virtual));if(open.has(k.path))walk(k.path,depth+1,frag);});
  }
  var label=el("div",{class:"fsel"});
  function draw(){
    var frag=document.createDocumentFragment();
    frag.appendChild(row("","All files",0,null,false));
    walk("",1,frag);
    box.replaceChildren(frag);
    label.textContent="Selected: "+(sel?"/"+sel:"All files");
  }
  var nameIn=el("input",{placeholder:"New folder name",autocapitalize:"off",autocomplete:"off",spellcheck:"false","aria-label":"New folder name"});
  var addBtn=el("button",{type:"button",class:"btn sm",onclick:function(){
    var n=normPath(nameIn.value); if(!n) return;
    var acc=sel; n.split("/").forEach(function(seg){acc=joinPath(acc,seg);if(!S.repo.dirs.has(acc))virt.add(acc);open.add(acc);});
    sel=acc; nameIn.value=""; if(o.onChange)o.onChange(sel); draw();
  }},ico("folderplus"),"Create here");
  var scroller=el("div",{class:"list scroll ftree-wrap",style:"max-height:"+(o.height||"36vh")},box);
  var wrap=el("div",null,scroller,label,o.noNew?null:el("div",{class:"newrow"},nameIn,addBtn),
    o.noNew?null:el("p",{class:"hint"},"A new folder is created when something is placed in it."));
  draw();
  setTimeout(function(){var on=box.querySelector(".frow.on");if(on&&on.scrollIntoView)on.scrollIntoView({block:"nearest"});},50);
  return {el:wrap,get:function(){return sel;},set:function(p){sel=p;draw();}};
}
function pickFolder(o){
  return new Promise(function(resolve){
    var chosen=false,ft=folderTree({start:o.start||"",height:"46vh"});
    openSheet({title:o.title||"Choose a folder",content:ft.el,onClose:function(){resolve(chosen?ft.get():null);},
      actions:[{label:"Cancel"},{label:"Choose this folder",kind:"primary",fn:function(a){chosen=true;a.close();}}]});
  });
}
function destRow(holder,key,onChange){
  var row=el("div",{class:"destrow"});
  function paint(){
    row.replaceChildren(folderTile(holder[key]?basename(holder[key]):"/"),
      el("div",{class:"name"},holder[key]?basename(holder[key]):"All files",el("small",null,holder[key]?"/"+holder[key]:"Top level of the repository")),
      el("button",{class:"btn sm",type:"button",onclick:async function(){
        var p=await pickFolder({start:holder[key],title:"Choose a folder"}); if(p!==null){holder[key]=p;paint();if(onChange)onChange();}
      }},"Change"));
  }
  row.paint=paint; paint(); return row;
}

/* ----- delete ----- */
$("actDel").onclick=function(){
  var d=describeSel(); if(!d.top.length) return;
  var content=el("div",null,
    el("p",null,"This removes "+plural(d.files,"file")+(d.folders?" across "+plural(d.folders,"folder"):"")+"."),
    el("p",{class:"muted small",style:"margin-top:6px"},"You can undo it afterwards from History."),
    el("ul",{class:"sumlist"},d.top.slice(0,40).map(function(p){
      return el("li",null,S.repo.dirs.has(p)?folderTile(basename(p)):fileTile(basename(p)),el("span",null,p));
    })));
  openSheet({title:"Delete "+plural(d.top.length,"item")+"?",content:content,actions:[
    {label:"Cancel"},
    {label:"Delete",kind:"danger",fn:async function(a){
      var paths=blobsUnder(S.lib.sel);
      await commitEntries(paths.map(function(p){return {path:p,mode:"100644",type:"blob",sha:null};}),"Remove "+plural(d.top.length,"item"));
      S.lib.sel.clear(); a.close(); toast("Deleted "+plural(d.top.length,"item")); S.act.loaded=false; await loadRepo();
    }}]});
};

/* ----- move / copy / rename ----- */
function planMove(top,targetFor,policy,copy){
  var files=S.repo.files, dirs=S.repo.dirs, moves=[], moving=new Set(), taken=new Set(), skipped=0, out=[];
  top.forEach(function(s){
    var nb=targetFor(s), isDir=dirs.has(s);
    if(nb===s){
      if(!copy) return;
      if(policy==="skip") return;
      if(isDir) nb=uniquePath(s,function(c){return dirs.has(c)||files.has(c);},true);
    }
    if(isDir&&nb.indexOf(s+"/")===0) throw new Error("A folder can't be placed inside itself.");
    files.forEach(function(f,p){
      if(p===s||p.indexOf(s+"/")===0){ moves.push({from:p,to:nb+p.slice(s.length)}); if(!copy) moving.add(p); }
    });
  });
  function occupied(p){return (files.has(p)&&!moving.has(p))||dirs.has(p)||taken.has(p);}
  moves.forEach(function(m){
    var to=m.to, i, anc;
    for(i=to.lastIndexOf("/");i>0;i=to.lastIndexOf("/",i-1)){ anc=to.slice(0,i); if(files.has(anc)&&!moving.has(anc)){skipped++;moving.delete(m.from);return;} }
    if(occupied(to)){
      if(policy==="skip"){skipped++;moving.delete(m.from);return;}
      var canOverwrite=policy==="replace"&&files.has(to)&&!moving.has(to)&&!dirs.has(to)&&!taken.has(to)&&to!==m.from;
      if(policy==="replace"&&to===m.from){skipped++;return;}
      if(!canOverwrite) to=uniquePath(to,occupied,false);
    }
    taken.add(to); out.push({from:m.from,to:to});
  });
  return {moves:out,skipped:skipped};
}
function moveCopySheet(mode){
  var d=describeSel(); if(!d.top.length) return;
  var isCopy=mode==="copy", isRen=mode==="rename", single=d.top.length===1, policy="rename";
  var parent=function(p){var i=p.lastIndexOf("/");return i>0?p.slice(0,i):"";};
  var nameIn=(single&&(isRen||isCopy))?el("input",{value:basename(d.top[0]),autocapitalize:"off",autocomplete:"off",spellcheck:"false"}):null;
  var ft=isRen?null:folderTree({start:S.lib.cwd,height:"42vh",disabled:function(p){
    return !isCopy&&d.top.some(function(s){return S.repo.dirs.has(s)&&(p===s||p.indexOf(s+"/")===0);});
  }});
  var content=el("div",null,
    ft?el("div",{class:"field",style:"margin-top:0"},el("span",null,isCopy?"Copy to":"Move to"),ft.el):null,
    nameIn?el("label",{class:"field"},el("span",null,"Name"),nameIn):null,
    isRen?null:el("div",{class:"field"},el("span",null,"If something is already there"),
      seg([["skip","Skip"],["rename","Keep both"],["replace","Replace"]],policy,function(v){policy=v;})));
  var title=isRen?"Rename":(isCopy?"Copy ":"Move ")+plural(d.top.length,"item");
  openSheet({title:title,content:content,actions:[
    {label:"Cancel"},
    {label:isRen?"Rename":(isCopy?"Copy":"Move"),kind:"primary",fn:async function(a){
      var nm=null;
      if(nameIn){ nm=normPath(nameIn.value); if(!nm||nm.indexOf("/")>=0) throw new Error("Enter a name without slashes."); }
      var dest=ft?ft.get():parent(d.top[0]);
      var res=planMove(d.top,function(s){return joinPath(dest,nm||basename(s));},isRen?"rename":policy,isCopy);
      if(!res.moves.length) throw new Error(res.skipped?"Everything was skipped because it already exists.":"Nothing to change.");
      var em=new Map(), files=S.repo.files;
      if(!isCopy) res.moves.forEach(function(m){em.set(m.from,{path:m.from,mode:"100644",type:"blob",sha:null});});
      res.moves.forEach(function(m){var f=files.get(m.from);em.set(m.to,{path:m.to,mode:f.mode,type:"blob",sha:f.sha});});
      await commitEntries(Array.from(em.values()),(isCopy?"Copy ":(isRen?"Rename ":"Move "))+plural(d.top.length,"item"));
      S.lib.sel.clear(); a.close();
      toast((isCopy?"Copied ":(isRen?"Renamed ":"Moved "))+plural(res.moves.filter(function(m){return !isKeep(m.from);}).length,"file")+(res.skipped?", skipped "+res.skipped:""));
      S.act.loaded=false; await loadRepo();
    }}]});
}
$("actMove").onclick=function(){moveCopySheet("move");};
$("actCopy").onclick=function(){moveCopySheet("copy");};
$("actRename").onclick=function(){moveCopySheet("rename");};

/* ----- new folder ----- */
$("newFolder").onclick=function(){
  var nameIn=el("input",{placeholder:"Folder name",autocapitalize:"off",autocomplete:"off",spellcheck:"false"});
  openSheet({title:"New folder",sub:"In "+(S.lib.cwd?"/"+S.lib.cwd:"All files"),content:el("label",{class:"field",style:"margin-top:0"},el("span",null,"Name"),nameIn),actions:[
    {label:"Cancel"},
    {label:"Create",kind:"primary",fn:async function(a){
      var n=normPath(nameIn.value); if(!n) throw new Error("Enter a folder name.");
      var path=joinPath(S.lib.cwd,n);
      if(S.repo.dirs.has(path)||S.repo.files.has(path)) throw new Error("That name is already in use.");
      var b=await gh("POST",api()+"/git/blobs",{content:"Cg==",encoding:"base64"},true);
      await commitEntries([{path:path+"/.gitkeep",mode:"100644",type:"blob",sha:b.sha}],"Create folder "+n);
      a.close(); toast("Folder created"); S.act.loaded=false; S.lib.exp.add(S.lib.cwd); await loadRepo();
    }}]});
  setTimeout(function(){nameIn.focus();},320);
};

/* ----- download ----- */
function entryName(p){
  var base=S.lib.q.trim()?"":S.lib.cwd;
  return base&&p.indexOf(base+"/")===0?p.slice(base.length+1):p;
}
$("actDownload").onclick=async function(){
  var d=describeSel(); if(!d.top.length) return;
  var paths=blobsUnder(S.lib.sel).filter(function(p){return !isKeep(p);});
  if(!paths.length){ toast("There's nothing to download in that selection.",true); return; }
  if(d.top.length===1&&!d.folders){
    toast("Downloading…");
    try{ var f=S.repo.files.get(paths[0]); saveBlob(await blobBySha(f.sha),basename(paths[0])); }
    catch(e){ toast(friendly(e),true); }
    return;
  }
  zipDownloadSheet(d,paths);
};
function zipDownloadSheet(d,paths){
  var total=0; paths.forEach(function(p){total+=S.repo.files.get(p).size;});
  var nameIn=el("input",{value:d.top.length===1?basename(d.top[0]):"download",autocapitalize:"off",autocomplete:"off",spellcheck:"false"});
  var pwIn=el("input",{type:"password",placeholder:"Leave empty for no password",autocomplete:"new-password",autocapitalize:"off",spellcheck:"false"});
  var eye=el("button",{type:"button",class:"ibtn","aria-label":"Show or hide password",onclick:function(){var s=pwIn.type==="password";pwIn.type=s?"text":"password";eye.innerHTML=svg(s?"eyeoff":"eye");}});
  eye.innerHTML=svg("eye");
  var mode="aes";
  var bar=el("i"), progress=el("div",{class:"progress",hidden:true},bar), status=el("div",{class:"status small"});
  var content=el("div",null,
    el("p",{class:"muted"},plural(paths.length,"file")+", "+fmt(total)+" will be packed into one zip file."),
    el("label",{class:"field"},el("span",null,"File name"),nameIn),
    el("label",{class:"field"},el("span",null,"Password",el("i",null,"optional")),el("div",{class:"pw"},pwIn,eye)),
    el("div",{class:"field"},el("span",null,"Protection"),seg([["aes","Strong (AES-256)"],["zc","Compatible"]],mode,function(v){mode=v;})),
    el("p",{class:"hint"},"Strong works with 7-Zip, WinZip, and most Android apps. Choose Compatible if a built-in phone or Mac extractor can't open it; it is much weaker. Without a password, none of this applies."),
    total>400*MB?el("p",{class:"hint",style:"color:var(--warn)"},"This is a large download. It is built in memory, so it can fail on a phone."):null,
    progress,status);
  var sh=openSheet({title:"Download as zip",content:content,actions:[
    {label:"Cancel"},
    {label:"Download",kind:"primary",fn:async function(a){
      var nm=(nameIn.value.trim()||"download").replace(/[\\\/:*?"<>|]+/g,"_"), pw=pwIn.value;
      progress.hidden=false; progress.classList.add("run"); a.lock(true);
      var opts={};
      if(pw){ opts.password=pw; if(mode==="zc") opts.zipCrypto=true; else opts.encryptionStrength=3; }
      await needZip(); var zw=new zip.ZipWriter(new zip.BlobWriter("application/zip"),opts), done=0, i, chunk;
      try{
        for(i=0;i<paths.length;i+=4){
          chunk=paths.slice(i,i+4);
          var blobs=await Promise.all(chunk.map(function(p){return blobBySha(S.repo.files.get(p).sha);}));
          for(var j=0;j<chunk.length;j++){
            await zw.add(entryName(chunk[j]),new zip.BlobReader(blobs[j])); done++;
            bar.style.width=Math.round(done/paths.length*100)+"%"; status.textContent=done+" of "+paths.length;
          }
        }
        var out=await zw.close();
        saveBlob(out,nm+".zip"); progress.classList.remove("run"); a.lock(false); a.close();
        toast(pw?"Zip downloaded, protected with a password":"Zip downloaded");
      }catch(e){ progress.classList.remove("run"); a.lock(false); try{await zw.close();}catch(x){} throw new Error(friendly(e)); }
    }}]});
}

/* ================= History ================= */
async function loadActivity(){
  var box=$("actList"); box.replaceChildren(); for(var k=0;k<4;k++) box.appendChild(el("div",{class:"skel"}));
  try{
    var list=await gh("GET",api()+"/commits?sha="+encodeURIComponent(S.cfg.branch)+"&per_page=20");
    S.act.list=list; S.act.loaded=true; renderActivity();
  }catch(e){ box.replaceChildren(el("div",{class:"empty"},el("b",null,"Couldn't load history"),friendly(e))); }
}
function renderActivity(){
  var box=$("actList"); box.replaceChildren();
  if(!S.act.list.length){ box.appendChild(el("div",{class:"empty"},el("b",null,"No history yet"))); return; }
  S.act.list.forEach(function(c,i){
    var msg=(c.commit.message||"").split("\n")[0];
    var canUndo=i===0&&c.parents&&c.parents.length>0;
    box.appendChild(el("div",{class:"event"+(i===0?" first":"")},el("span",{class:"dt"}),
      el("div",{style:"flex:1;min-width:0"},el("div",{class:"t"},msg),el("div",{class:"s"},ago(c.commit.author.date)+"  ·  "+c.sha.slice(0,7)),
        canUndo?el("button",{class:"btn sm",type:"button",style:"margin-top:10px",onclick:function(){undoLatest(c,msg);}},ico("undo"),"Undo this change"):null)));
  });
}
function undoLatest(c,msg){
  openSheet({title:"Undo this change?",sub:"“"+msg+"”",content:el("p",{class:"muted"},"Your files go back to how they were before it. The undo is saved in History too, so you can undo it again."),
    actions:[{label:"Cancel"},{label:"Undo",kind:"primary",fn:async function(a){
      var ref=await gh("GET",api()+"/git/ref/heads/"+bp());
      if(ref.object.sha!==c.sha) throw new Error("Something changed in the meantime. Refresh History and try again.");
      var parent=await gh("GET",api()+"/git/commits/"+c.parents[0].sha);
      var nc=await gh("POST",api()+"/git/commits",{message:"Undo: "+msg,tree:parent.tree.sha,parents:[c.sha]},true);
      await gh("PATCH",api()+"/git/refs/heads/"+bp(),{sha:nc.sha},true);
      a.close(); toast("Change undone"); S.act.loaded=false; await loadActivity(); loadRepo();
    }}]});
}
$("actRefresh").onclick=loadActivity;

/* ================= send engine (shared by Add files and Extract) ================= */
var uploadBusy=false;
function makeCtx(sel,prefix,folderPolicy){
  var files=S.repo.files, dirs=S.repo.dirs, topMap=new Map();
  function join(p){return prefix?prefix+"/"+p:p;}
  if(folderPolicy==="copy"){
    var tops=new Set(); sel.forEach(function(f){var i=f.path.indexOf("/"); if(i>0) tops.add(f.path.slice(0,i));});
    var used=new Set();
    tops.forEach(function(t){
      if(dirs.has(join(t))){
        var nm=uniquePath(join(t),function(c){return dirs.has(c)||files.has(c)||used.has(c);},true);
        used.add(nm); topMap.set(t,basename(nm));
      }
    });
  }
  function mapped(p){var i=p.indexOf("/"); if(i<0) return p; var t=p.slice(0,i); return (topMap.has(t)?topMap.get(t):t)+p.slice(i);}
  return {join:join,mapped:mapped,topMap:topMap};
}
function resolveDest(full,policy,files,dirs,taken,sha){
  function occupied(p){return files.has(p)||dirs.has(p)||taken.has(p);}
  if(!occupied(full)) return {path:full,action:"new"};
  if(files.has(full)&&!dirs.has(full)&&!taken.has(full)){
    if(sha&&files.get(full).sha===sha) return {action:"same"};
    if(policy==="replace") return {path:full,action:"replace"};
    if(policy==="skip") return {action:"skip"};
  }
  if(policy==="skip") return {action:"skip"};
  if(sha){ for(var n=1;files.has(nthPath(full,n,false));n++){ if(files.get(nthPath(full,n,false)).sha===sha) return {action:"same"}; } }
  return {path:uniquePath(full,occupied,false),action:"rename"};
}
function parentIsFile(full,files){var i;for(i=full.lastIndexOf("/");i>0;i=full.lastIndexOf("/",i-1)){if(files.has(full.slice(0,i)))return true;}return false;}
function gitSha(blob){
  if(!CAN_CRYPTO) return Promise.resolve(null);
  var head=enc.encode("blob "+blob.size+"\0");
  return new Blob([head,blob]).arrayBuffer().then(function(buf){return crypto.subtle.digest("SHA-1",buf);}).then(function(d){
    return Array.from(new Uint8Array(d)).map(function(x){return x.toString(16).padStart(2,"0");}).join("");
  });
}
function toBase64(blob){
  return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1]||"");};r.onerror=function(){rej(r.error);};r.readAsDataURL(blob);});
}
async function sendItems(o){
  var sel=o.sel, policy=o.filePolicy, ui=o.ui;
  await readRepoState();
  var files=S.repo.files, dirs=S.repo.dirs, headSha, treeSha;
  var ref=await gh("GET",api()+"/git/ref/heads/"+bp()); headSha=ref.object.sha;
  var cm=await gh("GET",api()+"/git/commits/"+headSha); treeSha=cm.tree.sha;
  var ctx=makeCtx(sel,o.dest,o.folderPolicy), taken=new Set();
  var pending=[], pendingBytes=0, batchNo=0, R={added:0,replaced:0,renamed:0,same:0,skipped:0,empty:0,failed:[]};
  async function commitBatch(){
    if(!pending.length) return; batchNo++;
    var t=await gh("POST",api()+"/git/trees",{base_tree:treeSha,tree:pending},true);
    var c=await gh("POST",api()+"/git/commits",{message:"Add "+plural(pending.length,"file")+" (part "+batchNo+")",tree:t.sha,parents:[headSha]},true);
    await gh("PATCH",api()+"/git/refs/heads/"+bp(),{sha:c.sha},true);
    treeSha=t.sha; headSha=c.sha;
    pending.forEach(function(p){files.set(p.path,{sha:p.sha,mode:p.mode,size:0});});
    ui.log("Saved part "+batchNo+" ("+plural(pending.length,"file")+")","ok"); pending=[]; pendingBytes=0;
  }
  for(var i=0;i<sel.length;i++){
    if(o.cancelled()) break;
    var f=sel[i], full=ctx.join(ctx.mapped(f.path));
    ui.progress(i/sel.length); ui.status((i+1)+" of "+sel.length+": "+f.path);
    try{
      if(f.size===0){R.empty++;ui.log("Skipped empty file: "+f.path,"warn");continue;}
      if(parentIsFile(full,files)) throw new Error("a file already uses part of this path");
      if(policy==="skip"&&(files.has(full)||dirs.has(full))){R.skipped++;continue;}
      var blob=await f.getBlob(), sha=null;
      if(files.has(full)) sha=await gitSha(blob);
      var r=resolveDest(full,policy,files,dirs,taken,sha);
      if(r.action==="same"){R.same++;continue;}
      if(r.action==="skip"){R.skipped++;continue;}
      taken.add(r.path);
      var b64s=await toBase64(blob);
      var res=await gh("POST",api()+"/git/blobs",{content:b64s,encoding:"base64"},true);
      var mode=(r.action==="replace"&&files.get(r.path))?files.get(r.path).mode:"100644";
      pending.push({path:r.path,mode:mode,type:"blob",sha:res.sha}); pendingBytes+=blob.size;
      if(r.action==="replace") R.replaced++; else if(r.action==="rename"){R.renamed++;ui.log(full+" saved as "+r.path,"warn");} else R.added++;
    }catch(e){
      if(e&&(e.status===401||e.status===403)&&!/rate limit|abuse|secondary/i.test(e.message)) throw e;
      R.failed.push(f.path); ui.log("Failed: "+f.path+". "+(e&&e.message||e),"bad");
    }
    if(pending.length>=BATCH_FILES||pendingBytes>=BATCH_BYTES) await commitBatch();
  }
  await commitBatch();
  ui.progress(1);
  var parts=[];
  if(R.added) parts.push(R.added+" added"); if(R.replaced) parts.push(R.replaced+" replaced"); if(R.renamed) parts.push(R.renamed+" saved as copies");
  if(R.skipped) parts.push(R.skipped+" skipped"); if(R.same) parts.push(R.same+" already identical"); if(R.empty) parts.push(R.empty+" empty skipped");
  if(R.failed.length) parts.push(R.failed.length+" failed");
  R.text=(o.cancelled()?"Stopped. ":"Done. ")+(parts.length?parts.join(", "):"Nothing to send")+".";
  return R;
}
function previewCounts(sel,dest,folderPolicy){
  var c=makeCtx(sel,dest,folderPolicy), nw=0, ex=0;
  sel.forEach(function(f){var full=c.join(c.mapped(f.path)); if(S.repo.files.has(full)||S.repo.dirs.has(full)) ex++; else nw++;});
  return {nw:nw,ex:ex,ctx:c};
}
function chip(t,c){return el("span",{class:"chip"+(c?" "+c:"")},t);}
function policyWord(p){return {skip:"left as they are",rename:"saved as copies",replace:"replaced"}[p];}
var FILE_HINT={skip:"Files that already exist are left as they are.",rename:"The new file is saved next to the old one as name_1, name_2 and so on.",replace:"The existing file is overwritten. You can undo this from History."};
var FOLDER_HINT={merge:"New files go into the folder that's already there.",copy:"The incoming folder is saved as Folder_1, Folder_2 and so on, so nothing is mixed."};

/* ================= Add files (sheet) ================= */
$("addFiles").onclick=function(){$("inFiles").click();};
$("inFiles").addEventListener("change",function(e){
  var l=Array.from(e.target.files||[]); e.target.value=""; if(l.length) addFilesSheet(l);
});
function addFilesSheet(list){
  var holder={dest:S.lib.cwd}, policy=S.opts.filePolicy, limit=getLimit()*MB;
  var items=list.map(function(f){var tooBig=f.size>=MAX_BYTES, big=tooBig||f.size>limit;return {path:f.name,size:f.size,big:big,tooBig:tooBig,checked:!big,getBlob:function(){return Promise.resolve(f);}};});
  var listEl=el("div",{class:"list scroll",style:"max-height:30vh"}), sumEl=el("p",{class:"muted small",style:"margin-top:8px"}), planEl=el("div",{class:"chips",style:"margin-top:8px"});
  var bar=el("i"), progress=el("div",{class:"progress",hidden:true},bar), status=el("div",{class:"status small"}), logEl=el("div",{class:"log",hidden:true});
  var cancel=false, running=false;
  function paintList(){
    listEl.replaceChildren();
    items.forEach(function(it){
      var cb=el("input",{type:"checkbox",checked:it.checked,disabled:it.tooBig||running,"aria-label":"Include "+it.path,onchange:function(){it.checked=cb.checked;paintList();}});
      listEl.appendChild(el("div",{class:"row"},cb,fileTile(it.path),el("div",{class:"name"},it.path,it.big?el("span",{class:"tag"+(it.tooBig?" bad":"")},it.tooBig?"too large":"large"):null,el("small",null,fmt(it.size)+(it.tooBig?"  ·  over the 100 MB limit":"")))));
    });
    var sel=items.filter(function(i){return i.checked;});
    sumEl.textContent=sel.length+" of "+items.length+" selected, "+fmt(sel.reduce(function(s,i){return s+i.size;},0));
    planEl.replaceChildren();
    if(S.repo.loaded&&sel.length){
      var pc=previewCounts(sel,holder.dest,"merge"); planEl.appendChild(chip(pc.nw+" new","add"));
      if(pc.ex) planEl.appendChild(chip(pc.ex+" already there, "+policyWord(policy),"warn"));
    }
  }
  var dr=destRow(holder,"dest",paintList);
  var content=el("div",null,
    el("div",{class:"field",style:"margin-top:0"},el("span",null,"Upload to"),dr),
    el("div",{class:"field"},el("span",null,"Files"),listEl),sumEl,planEl,
    el("div",{class:"field"},el("span",null,"If a file already exists"),seg([["skip","Skip"],["rename","Keep both"],["replace","Replace"]],policy,function(v){policy=v;paintList();})),
    progress,status,logEl);
  paintList();
  var sh=openSheet({title:"Add files",content:content,actions:[
    {label:"Cancel",fn:function(a){ if(running){cancel=true;return;} a.close(); }},
    {label:"Upload",kind:"primary",fn:async function(a){
      var sel=items.filter(function(i){return i.checked&&!i.tooBig;});
      if(!sel.length) throw new Error("Nothing is selected.");
      var dest=holder.dest; running=true; uploadBusy=true; cancel=false; a.lock(true); paintList();
      progress.hidden=false; progress.classList.add("run"); bar.style.width="0"; logEl.hidden=false;
      var ui={status:function(t){status.textContent=t;},progress:function(f){bar.style.width=Math.round(f*100)+"%";},
              log:function(m,c){logEl.appendChild(el("div",{class:c||""},m));logEl.scrollTop=logEl.scrollHeight;}};
      S.logSink=ui.log; sh.btns[0].disabled=false;
      var wl=null;
      try{
        try{ if("wakeLock" in navigator) wl=await navigator.wakeLock.request("screen"); }catch(e){}
        var R=await sendItems({sel:sel,dest:dest,filePolicy:policy,folderPolicy:"merge",ui:ui,cancelled:function(){return cancel;}});
        status.textContent=R.text; ui.log(R.text,R.failed.length?"warn":"ok"); toast(R.text,R.failed.length>0);
        S.act.loaded=false; goDir(dest); await loadRepo(); a.lock(false); a.close();
      }catch(e){
        var m=friendly(e); status.textContent="Stopped: "+m; ui.log("Error: "+m,"bad"); throw new Error(m);
      }finally{
        try{if(wl) await wl.release();}catch(x){}
        running=false; uploadBusy=false; S.logSink=null; progress.classList.remove("run"); a.lock(false); paintList();
      }
    }}]});
  sh.btns[0].textContent="Close";
}

/* ================= Extract tab ================= */
var W7={worker:null,wasm:null,id:0,jobs:new Map()};
async function w7start(){
  if(W7.worker) return;
  var r=await fetch("app/vendor/7zz.wasm",{cache:"force-cache"});
  if(!r.ok) throw new Error("Couldn't load the archive engine. Make sure the app files are in the repository.");
  W7.wasm=new Uint8Array(await r.arrayBuffer());
  W7.worker=new Worker("app/vendor/w7worker.js");
  W7.worker.onmessage=function(e){
    var m=e.data, j=W7.jobs.get(m.id); if(!j) return; W7.jobs.delete(m.id);
    if(m.error) j.rej(new Error(m.error)); else j.res(m.res);
  };
  W7.worker.onerror=function(e){ W7.jobs.forEach(function(j){j.rej(new Error("The archive engine stopped. "+(e&&e.message||""))); }); W7.jobs.clear(); try{W7.worker.terminate();}catch(x){} W7.worker=null; };
}
async function w7run(name,bytes,password){
  await w7start();
  return new Promise(function(res,rej){
    var id=++W7.id; W7.jobs.set(id,{res:res,rej:rej});
    W7.worker.postMessage({id:id,name:name,bytes:bytes,password:password||null,wasm:W7.wasm},[bytes.buffer]);
  });
}
function exItemsFromW7(r){
  return r.files.map(function(f){return {name:f.path,size:f.data.length,encrypted:false,getBlob:function(){return Promise.resolve(new Blob([f.data]));}};});
}
async function exOpen7z(file,password){
  var bytes=new Uint8Array(await file.arrayBuffer());
  var r=await w7run(file.name,bytes,password);
  if(r.needPassword||r.wrongPassword) return {locked:true,wrong:r.wrongPassword};
  if(!r.files.length) throw new Error("Couldn't open "+file.name+". The file may be damaged or in a format that isn't supported.");
  return {items:exItemsFromW7(r)};
}
async function exOpenZip(file){
  await needZip();
  var reader=new zip.ZipReader(new zip.BlobReader(file),{filenameValidation:"tolerant"});
  var entries=await reader.getEntries(); S.ex.readers.push(reader);
  var fl=entries.filter(function(e){return !e.directory;}), rec={password:null}, anyEnc=false;
  var items=fl.map(function(e){
    if(e.encrypted) anyEnc=true;
    return {name:e.filename,size:e.uncompressedSize,encrypted:!!e.encrypted,getBlob:function(){return e.getData(new zip.BlobWriter(),rec.password?{password:rec.password}:undefined);}};
  });
  return {items:items,rec:rec,anyEnc:anyEnc,entries:fl};
}
function setOpening(on,text){
  S.ex.opening=on; $("zipinfo").textContent=on?(text||"Opening…"):$("zipinfo").textContent;
  $("pickArch").disabled=on;
}
async function exAdd(list){
  for(var i=0;i<list.length;i++){
    var f=list[i]; setOpening(true,"Opening "+f.name+"…");
    try{
      var done=false;
      if(/\.zip$/i.test(f.name)){
        try{
          var z=await exOpenZip(f); S.ex.items=S.ex.items.concat(z.items); done=true;
          if(z.anyEnc) S.ex.locked.push({kind:"zip",file:f,rec:z.rec,entries:z.entries});
        }catch(err){ done=false; }
      }
      if(!done){
        var r=await exOpen7z(f,null);
        if(r.locked) S.ex.locked.push({kind:"w7",file:f});
        else S.ex.items=S.ex.items.concat(r.items);
      }
    }catch(err){ S.ex.errors.push("Couldn't read "+f.name+": "+(err&&err.message||err)); }
  }
  setOpening(false); exBuild(); paintLocked();
}
function paintLocked(){
  var box=$("exLocked"); box.replaceChildren();
  if(!S.ex.locked.length) return;
  var pw=el("input",{type:"password",placeholder:"Archive password",autocomplete:"off",autocapitalize:"off",spellcheck:"false"});
  var eye=el("button",{type:"button",class:"ibtn","aria-label":"Show or hide password",onclick:function(){var s=pw.type==="password";pw.type=s?"text":"password";eye.innerHTML=svg(s?"eyeoff":"eye");}}); eye.innerHTML=svg("eye");
  var msg=el("p",{class:"err",style:"margin-top:8px"});
  var go=el("button",{type:"button",class:"btn primary",onclick:async function(){
    if(!pw.value) return; go.disabled=true; msg.textContent=""; msg.style.color="";
    var remaining=[], okAny=false;
    for(var i=0;i<S.ex.locked.length;i++){
      var L=S.ex.locked[i];
      try{
        if(L.kind==="zip"){
          var enc1=L.entries.filter(function(e){return e.encrypted;}).sort(function(a,b){return a.uncompressedSize-b.uncompressedSize;})[0];
          await enc1.getData(new zip.BlobWriter(),{password:pw.value}); L.rec.password=pw.value; okAny=true;
        }else{
          var r=await exOpen7z(L.file,pw.value);
          if(r.locked){remaining.push(L);continue;}
          S.ex.items=S.ex.items.concat(r.items); okAny=true;
        }
      }catch(e){ remaining.push(L); }
    }
    S.ex.locked=remaining; go.disabled=false;
    if(!okAny){ msg.textContent="That password didn't work."; return; }
    exBuild(); paintLocked(); toast(remaining.length?"Unlocked some archives":"Unlocked");
  }},"Unlock");
  var names=S.ex.locked.map(function(l){return l.file.name;}).join(", ");
  box.appendChild(el("div",{class:"lockbanner"},el("span",{class:"lk"},ico("lock")),
    el("div",{style:"flex:1;min-width:0"},el("b",null,"Password needed"),el("p",{class:"muted small",style:"overflow-wrap:anywhere;margin:2px 0 10px"},names),
      el("div",{class:"pw"},pw,eye),el("div",{style:"margin-top:10px"},go),msg)));
}
function mkdir(name,path){return {name:name,path:path,isDir:true,open:false,children:new Map()};}
function allFiles(node,out){out=out||[];node.children.forEach(function(c){if(c.isDir)allFiles(c,out);else out.push(c);});return out;}
function allDirs(node,out){out=out||[];node.children.forEach(function(c){if(c.isDir){out.push(c);allDirs(c,out);}});return out;}
function cleanItemPath(name,strip){
  var parts=cleanSegs(name); if(!parts||!parts.length) return null;
  if(parts[0]==="__MACOSX") return null;
  var last=parts[parts.length-1];
  if(last===".DS_Store"||last==="Thumbs.db"||last==="desktop.ini") return null;
  if(strip&&parts.length>1) parts=parts.slice(1);
  return parts;
}
function getLimit(){var v=parseFloat($("optLimit").value);if(!(v>0))v=48;return Math.min(v,99);}
function exBuild(){
  var limit=getLimit()*MB, root=mkdir("",""), ignored=0, dupes=0, strip=$("optStrip").checked;
  S.ex.items.forEach(function(r){
    var parts=cleanItemPath(r.name,strip); if(!parts){ignored++;return;}
    var node=root, i, c;
    for(i=0;i<parts.length-1;i++){
      c=node.children.get(parts[i]);
      if(!c||!c.isDir){c=mkdir(parts[i],joinPath(node.path,parts[i]));node.children.set(parts[i],c);}
      node=c;
    }
    var fname=parts[parts.length-1]; if(node.children.has(fname)) dupes++;
    var tooBig=r.size>=MAX_BYTES, big=tooBig||r.size>limit;
    node.children.set(fname,{name:fname,path:parts.join("/"),isDir:false,size:r.size,getBlob:r.getBlob,big:big,tooBig:tooBig,checked:!big,locked:r.encrypted});
  });
  S.ex.root=root;
  var files=allFiles(root), total=files.reduce(function(s,f){return s+f.size;},0), info="";
  if(files.length) info=plural(files.length,"file")+", "+fmt(total)+" ready.";
  if(ignored) info+=" Ignored "+plural(ignored,"system file")+".";
  if(dupes) info+=" "+plural(dupes,"file")+" appeared twice. The later one is used.";
  if(S.ex.errors.length) info+=(info?" ":"")+S.ex.errors.join(" ");
  $("zipinfo").textContent=info;
  var any=files.length>0;
  $("upBody").hidden=!any; $("clearUp").hidden=!(S.ex.items.length||S.ex.errors.length||S.ex.locked.length);
  $("pickArch").classList.toggle("pulse",!any&&!S.ex.locked.length);
  $("skipbox").open=true; exRender();
}
function sortedKids(node){
  return Array.from(node.children.values()).sort(function(a,b){
    if(a.isDir!==b.isDir) return a.isDir?-1:1; return a.name.localeCompare(b.name,undefined,{numeric:true});
  });
}
function folderStat(node){
  var all=allFiles(node), ok=all.filter(function(f){return !f.big;}), sel=ok.filter(function(f){return f.checked;}).length;
  return {total:ok.length,all:ok.length>0&&sel===ok.length,none:sel===0,count:all.length,size:all.reduce(function(s,f){return s+f.size;},0)};
}
function exRender(){
  var box=$("tree"); box.replaceChildren();
  if(!S.ex.root) return;
  var frag=document.createDocumentFragment(); exWalk(S.ex.root,0,frag); box.appendChild(frag);
  exSummary(); exSkipped(); upPreview();
}
function exWalk(node,depth,frag){
  sortedKids(node).forEach(function(k){
    var row=el("div",{class:"row",style:"padding-left:"+(10+depth*18)+"px"});
    var cb=el("input",{type:"checkbox","aria-label":"Select "+k.name});
    if(k.isDir){
      var st=folderStat(k);
      cb.checked=st.all; cb.indeterminate=!st.all&&!st.none; cb.disabled=st.total===0;
      cb.onchange=function(){allFiles(k).forEach(function(f){if(!f.big)f.checked=cb.checked;});exRender();};
      var caret=el("button",{type:"button",class:"caret","aria-expanded":String(k.open),"aria-label":k.open?"Close folder":"Open folder",onclick:function(){k.open=!k.open;exRender();}},ico("chev"));
      var name=el("div",{class:"name",onclick:function(){k.open=!k.open;exRender();},style:"cursor:pointer"},k.name,el("small",null,plural(st.count,"file")+", "+fmt(st.size)));
      row.append(caret,cb,folderTile(k.name),name); frag.appendChild(row);
      if(k.open) exWalk(k,depth+1,frag);
    }else{
      cb.checked=k.checked; cb.disabled=k.tooBig;
      cb.onchange=function(){k.checked=cb.checked;exRender();};
      var nm=el("div",{class:"name",style:"cursor:pointer",title:"Preview",onclick:function(){previewExtract(k);}},k.name,k.locked?el("span",{class:"tag"},"password"):null,k.big?el("span",{class:"tag"+(k.tooBig?" bad":"")},k.tooBig?"too large":"large"):null,el("small",null,fmt(k.size)));
      row.append(el("span",{class:"sp"}),cb,fileTile(k.name),nm); frag.appendChild(row);
    }
  });
}
function exSkipped(){
  var big=allFiles(S.ex.root).filter(function(f){return f.big;}), box=$("skipped"); box.replaceChildren();
  $("skipbox").hidden=!big.length;
  $("skipsum").textContent="Held back for size: "+big.length+" over "+getLimit()+" MB";
  big.sort(function(a,b){return a.path.localeCompare(b.path);}).forEach(function(f){
    var cb=el("input",{type:"checkbox",checked:f.checked,disabled:f.tooBig,"aria-label":"Include "+f.name,onchange:function(){f.checked=cb.checked;exRender();}});
    box.appendChild(el("div",{class:"row"},cb,fileTile(f.name),el("div",{class:"name"},f.path,el("small",null,fmt(f.size)+(f.tooBig?"  ·  over the 100 MB limit, can't be sent":"")))));
  });
}
function exSelected(){return allFiles(S.ex.root).filter(function(f){return f.checked&&!f.tooBig;}).sort(function(a,b){return a.path.localeCompare(b.path);});}
function exSummary(){
  if(!S.ex.root) return;
  var fs=allFiles(S.ex.root), sel=fs.filter(function(f){return f.checked;}), bytes=sel.reduce(function(s,f){return s+f.size;},0);
  var big=sel.filter(function(f){return f.big;}).length;
  $("summary").textContent=sel.length+" of "+fs.length+" selected, "+fmt(bytes)+(big?", including "+big+" large":"");
  $("go").disabled=!sel.length||S.ex.running||S.ex.locked.some(function(l){return l.kind==="zip";});
}
function upPreview(){
  var box=$("plan"); box.replaceChildren();
  if(!S.ex.root||S.ex.running) return;
  var sel=exSelected(); if(!sel.length) return;
  if(S.ex.locked.some(function(l){return l.kind==="zip";})){ box.appendChild(chip("Enter the password above to continue","warn")); return; }
  if(!S.repo.loaded){ box.appendChild(chip("Existing files are checked when you extract")); return; }
  var pc=previewCounts(sel,S.ex.dest,S.opts.folderPolicy);
  box.appendChild(chip(pc.nw+" new","add"));
  if(pc.ex) box.appendChild(chip(pc.ex+" already there, "+policyWord(S.opts.filePolicy),"warn"));
  pc.ctx.topMap.forEach(function(v,k){ box.appendChild(chip(k+" saved as "+v)); });
}
var exDestRow=null;
function paintExDest(){
  var box=$("exDest"); box.replaceChildren();
  var holder={get dest(){return S.ex.dest;},set dest(v){S.ex.dest=v;S.ex.destTouched=true;}};
  exDestRow=destRow(holder,"dest",upPreview); box.appendChild(exDestRow);
}
function buildSegs(){
  $("segFile").replaceChildren(seg([["skip","Skip"],["rename","Keep both"],["replace","Replace"]],S.opts.filePolicy,function(v){S.opts.filePolicy=v;savePrefs();$("hintFile").textContent=FILE_HINT[v];upPreview();}));
  $("segFolder").replaceChildren(seg([["merge","Merge"],["copy","Save as copy"]],S.opts.folderPolicy,function(v){S.opts.folderPolicy=v;savePrefs();$("hintFolder").textContent=FOLDER_HINT[v];upPreview();}));
  $("hintFile").textContent=FILE_HINT[S.opts.filePolicy]; $("hintFolder").textContent=FOLDER_HINT[S.opts.folderPolicy];
  $("optStrip").checked=!!S.opts.strip; $("optLimit").value=S.opts.limit;
}
$("pickArch").onclick=function(){$("inArch").click();};
$("inArch").addEventListener("change",function(e){var l=Array.from(e.target.files||[]);e.target.value="";if(l.length)exAdd(l);});
["dragenter","dragover"].forEach(function(n){$("drop").addEventListener(n,function(e){e.preventDefault();$("drop").classList.add("over");});});
["dragleave","drop"].forEach(function(n){$("drop").addEventListener(n,function(e){e.preventDefault();$("drop").classList.remove("over");});});
$("drop").addEventListener("drop",function(e){
  if(S.ex.running) return;
  var l=Array.from(e.dataTransfer.files||[]); if(l.length) exAdd(l);
});
$("clearUp").onclick=function(){
  if(S.ex.running) return;
  S.ex.readers.forEach(function(r){try{r.close();}catch(e){}});
  S.ex.readers=[];S.ex.items=[];S.ex.errors=[];S.ex.locked=[];S.ex.root=null;
  $("tree").replaceChildren();$("zipinfo").textContent="";$("upBody").hidden=true;$("clearUp").hidden=true;$("plan").replaceChildren();$("exLocked").replaceChildren();
  $("pickArch").classList.add("pulse");
};
$("optStrip").addEventListener("change",function(){S.opts.strip=$("optStrip").checked;savePrefs();exBuild();});
$("optLimit").addEventListener("change",function(){
  S.opts.limit=getLimit();savePrefs();
  if(!S.ex.root) return; var limit=getLimit()*MB;
  allFiles(S.ex.root).forEach(function(f){var big=f.tooBig||f.size>limit;if(big!==f.big){f.big=big;f.checked=!big;}});
  exRender();
});
$("selAll").onclick=function(){allFiles(S.ex.root).forEach(function(f){if(!f.big)f.checked=true;});exRender();};
$("selNone").onclick=function(){allFiles(S.ex.root).forEach(function(f){f.checked=false;});exRender();};
$("expAll").onclick=function(){allDirs(S.ex.root).forEach(function(d){d.open=true;});exRender();};
$("colAll").onclick=function(){allDirs(S.ex.root).forEach(function(d){d.open=false;});exRender();};
$("stop").onclick=function(){S.ex.cancel=true;$("status").textContent="Stopping after the current file…";};
window.addEventListener("beforeunload",function(e){if(S.ex.running||uploadBusy){e.preventDefault();e.returnValue="";}});
function exLog(msg,cls){
  var box=$("log"); $("logBox").hidden=false;
  var d=document.createElement("div"); if(cls) d.className=cls; d.textContent=msg; box.appendChild(d);
  while(box.childNodes.length>400) box.removeChild(box.firstChild);
  box.scrollTop=box.scrollHeight;
}
function exLock(on){
  document.querySelectorAll("#upBody button, #upBody input, #drop button, #clearUp").forEach(function(e){e.disabled=on;});
  if(!on) exSummary();
}
$("go").onclick=async function(){
  if(S.ex.running) return;
  var sel=exSelected(); if(!sel.length){ toast("Nothing is selected.",true); return; }
  var dest=S.ex.dest, wl=null;
  S.ex.running=true; S.ex.cancel=false; exLock(true); $("go").disabled=true; $("stop").hidden=false; $("stop").disabled=false;
  $("barWrap").hidden=false; $("barWrap").classList.add("run"); $("bar").style.width="0"; $("plan").replaceChildren(); $("log").replaceChildren();
  S.logSink=exLog; exLog("Starting with "+plural(sel.length,"file"));
  try{
    try{ if("wakeLock" in navigator) wl=await navigator.wakeLock.request("screen"); }catch(e){}
    var ui={status:function(t){$("status").textContent=t;},progress:function(f){$("bar").style.width=Math.round(f*100)+"%";},log:exLog};
    var R=await sendItems({sel:sel,dest:dest,filePolicy:S.opts.filePolicy,folderPolicy:S.opts.folderPolicy,ui:ui,cancelled:function(){return S.ex.cancel;}});
    $("status").textContent=R.text; exLog(R.text,R.failed.length?"warn":"ok"); toast(R.text,R.failed.length>0);
    if(R.failed.length) exLog("Run it again to retry the files that failed.","warn");
    S.act.loaded=false; loadRepo();
  }catch(e){
    var m=friendly(e); $("status").textContent="Stopped: "+m; exLog("Error: "+m,"bad");
    exLog("Anything already saved is safe. Fix the problem and run it again; finished files are skipped.","warn"); toast(m,true);
  }finally{
    try{if(wl) await wl.release();}catch(e){}
    S.logSink=null; S.ex.running=false; exLock(false); $("stop").hidden=true; $("barWrap").classList.remove("run");
  }
};

/* ================= files, cache, convert and viewer host ================= */
var EXT_LEGACY={doc:"docx",xls:"xlsx",ppt:"pptx"};
var APP_FILES=["index.html","sw.js","manifest.webmanifest",".nojekyll"];
function isApp(p){return APP_FILES.indexOf(p)>=0||p.indexOf("app/")===0;}
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
  dark:function(){return window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;},
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
$("newFile").append(ico("plus"),"New file");
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
$("menuBtn").innerHTML=svg("dots");
$("menuBtn").addEventListener("click",function(){
  var saved=hasVault();
  var list=el("div",{style:"display:grid;gap:6px"},
    switchRow("Show app files",!!S.opts.showApp,function(v){S.opts.showApp=v;savePrefs();buildIndex();renderLibrary();renderSide();},"The files that make this app run (index.html and the app folder). Hidden by default so they aren't changed by accident."),
    switchRow("Keep opened files for offline use",!!S.opts.offline,function(v){S.opts.offline=v;savePrefs();if(!v)clearOffline();},"Saves files you open on this device, unencrypted, so they open without a connection. Turn off on a shared device."),
    el("div",{style:"display:grid;gap:10px;margin-top:8px"},
      deferredInstall?el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();deferredInstall.prompt();deferredInstall=null;}},"Install this app"):null,
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();lockNow();}},ico("lock"),saved?"Lock":"Sign out"),
      el("button",{class:"btn block",type:"button",onclick:function(){closeAllSheets();showSetup(true);}},"Edit details"),
      el("button",{class:"btn block",type:"button",onclick:async function(){await clearOffline();toast("Offline files cleared");}},"Clear offline files"),
      el("button",{class:"btn block",type:"button",style:"color:var(--danger)",onclick:function(){
        closeAllSheets();try{localStorage.removeItem(VK);}catch(e){} clearOffline(); S.cfg=null;S.pass=null;resetRepo();showSetup(false);
      }},"Forget this device")));
  openSheet({title:"Menu",content:list,actions:[{label:"Close"}]});
});
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)){ window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});}); }

$("actConvert").append(ico("convert"),lbl("Convert"));
async function previewExtract(k){
  try{ await loadScript("app/viewer.js"); }catch(e){ toast(e.message,true); return; }
  window.AtlasViewer.openBlob({name:k.name,path:k.path,size:k.size,getBlob:k.getBlob});
}
/* ================= boot ================= */
loadPrefs(); buildSegs(); hydrateIcons();
if(hasVault()){ showScreen("s-lock"); $("lockPass").focus(); } else showSetup(false);
})();
