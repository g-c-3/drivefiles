/* ================= storage: saved repositories ================= */
var CAN_CRYPTO=!!(window.crypto&&crypto.subtle);
var PRK="a_profiles";
var OPT_DEFAULTS=JSON.parse(JSON.stringify(S.opts));
function b64(u8){var s="",i;for(i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function unb64(s){var bin=atob(s),u=new Uint8Array(bin.length),i;for(i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
async function deriveKey(pass,salt){
  var km=await crypto.subtle.importKey("raw",enc.encode(pass),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:200000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function sealWith(key,cfg,extra){
  var iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc.encode(JSON.stringify(cfg))));
  var o=extra||{}; o.v=2; o.i=b64(iv); o.d=b64(ct); return o;
}
async function openWith(key,o){
  var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(o.i)},key,unb64(o.d));
  return JSON.parse(dec.decode(pt));
}
/* the device key is a non-extractable key kept in IndexedDB, so the token is never stored as readable text */
function keyDb(){
  return new Promise(function(res,rej){
    var r=indexedDB.open("atlas-keys",1);
    r.onupgradeneeded=function(){r.result.createObjectStore("k");};
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);};
  });
}
async function deviceKey(create){
  var db=await keyDb();
  try{
    var k=await new Promise(function(res,rej){var q=db.transaction("k").objectStore("k").get("main");q.onsuccess=function(){res(q.result);};q.onerror=function(){rej(q.error);};});
    if(!k&&create){
      k=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
      await new Promise(function(res,rej){var tx=db.transaction("k","readwrite");tx.objectStore("k").put(k,"main");tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});
    }
    return k||null;
  }finally{ db.close(); }
}
function readStore(){
  try{var o=JSON.parse(localStorage.getItem(PRK)); if(o&&Array.isArray(o.list)) return o;}catch(e){}
  return {v:2,last:null,list:[]};
}
var PF=readStore();
function writeStore(){ try{localStorage.setItem(PRK,JSON.stringify(PF));}catch(e){ toast("This browser wouldn't save the details.",true); } }
function migrateOld(){
  /* an earlier version kept one passcode-protected entry under a_vault */
  try{
    var old=localStorage.getItem(VK);
    if(old&&!PF.list.length){
      var o=JSON.parse(old);
      PF.list.push({id:newId(),repo:null,branch:"main",kind:"pass",enc:{v:1,s:o.s,i:o.i,d:o.d}});
      PF.last=PF.list[0].id; writeStore();
    }
    if(old) localStorage.removeItem(VK);
  }catch(e){}
}
function newId(){return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function findProf(id){for(var i=0;i<PF.list.length;i++) if(PF.list[i].id===id) return PF.list[i]; return null;}
function profName(p){return p.repo||"Saved repository";}
async function sealProfile(cfg,pass){
  var p={repo:cfg.repo,branch:cfg.branch};
  if(pass&&CAN_CRYPTO){
    var salt=crypto.getRandomValues(new Uint8Array(16));
    p.kind="pass"; p.enc=await sealWith(await deriveKey(pass,salt),cfg,{s:b64(salt)});
  }else if(CAN_CRYPTO){
    try{ p.kind="device"; p.enc=await sealWith(await deviceKey(true),cfg); }
    catch(e){ p.kind="plain"; p.cfg=cfg; delete p.enc; }
  }else{ p.kind="plain"; p.cfg=cfg; }
  return p;
}
async function openProfile(p,pass){
  if(p.kind==="plain") return p.cfg;
  if(p.kind==="device"){ var k=await deviceKey(false); if(!k) throw new Error("key missing"); return openWith(k,p.enc); }
  return openWith(await deriveKey(pass,unb64(p.enc.s)),p.enc);
}
function loadPrefs(){try{Object.assign(S.opts,JSON.parse(localStorage.getItem(PK)||"{}"));}catch(e){} if(S.opts.limit===48) S.opts.limit=49; S.opts.folderPolicy="merge";}
function savePrefs(){try{localStorage.setItem(PK,JSON.stringify(S.opts));}catch(e){}}

/* ================= screens ================= */
function showScreen(name){
  ["s-home","s-setup","shell"].forEach(function(id){$(id).hidden=(id!==name);});
  window.scrollTo(0,0);
}
function curProfile(){return S.pid?findProf(S.pid):null;}
function lockNow(){
  S.cfg=null; S.pass=null; S.pid=null; resetRepo(); S.lib.sel.clear(); closeAllSheets();
  showHome();
}
function startSession(p,cfg,pass){
  if(!p.repo){ p.repo=cfg.repo; p.branch=cfg.branch; }
  PF.last=p.id; writeStore();
  S.cfg=cfg; S.pass=pass||null; S.pid=p.id; resetRepo(); closeAllSheets(); enterApp();
}
function optionLabel(p){
  var dup=PF.list.some(function(q){return q!==p&&profName(q).toLowerCase()===profName(p).toLowerCase();});
  return profName(p)+(dup&&p.branch?"  ·  "+p.branch:"");
}
function showHome(){
  var sel=$("homeSel"), list=PF.list;
  sel.replaceChildren();
  if(!list.length){
    sel.appendChild(el("option",{value:""},"No saved repositories"));
    sel.disabled=true; $("homeLogin").disabled=true; $("homeReset").hidden=true;
  }else{
    list.forEach(function(p){sel.appendChild(el("option",{value:p.id},optionLabel(p)));});
    sel.disabled=false; $("homeLogin").disabled=false; $("homeReset").hidden=false;
    sel.value=findProf(PF.last)?PF.last:list[0].id;
  }
  showScreen("s-home");
}
$("homeSel").addEventListener("change",function(){ if(findProf($("homeSel").value)){PF.last=$("homeSel").value;writeStore();} });
$("homeAdd").addEventListener("click",function(){showSetup(null);});
$("homeLogin").addEventListener("click",function(){ if($("homeSel").value) loginWith($("homeSel").value); });
$("homeReset").addEventListener("click",function(){resetDeviceSheet();});

async function loginWith(id){
  var p=findProf(id); if(!p) return;
  PF.last=id; writeStore();
  if(p.kind==="pass"){ askPasscode(p); return; }
  try{ startSession(p,await openProfile(p),null); }
  catch(e){ toast("Couldn't open "+profName(p)+" on this device. Delete it and add it again.",true); }
}
function askPasscode(p){
  var inp=el("input",{type:"password",placeholder:"Passcode",autocomplete:"off",autocapitalize:"off",spellcheck:"false"});
  var content=el("div",null,
    el("label",{class:"field",style:"margin-top:0"},el("span",null,"Passcode"),inp),
    el("button",{type:"button",class:"linkbtn",onclick:function(){deleteSheet([p.id]);}},"Forgot the passcode? Delete this saved repository"));
  var sh=openSheet({title:"Log in to "+profName(p),content:content,actions:[
    {label:"Cancel"},
    {label:"Log in",kind:"primary",fn:async function(){
      var pass=inp.value; if(!pass) throw new Error("Enter your passcode.");
      var cfg;
      try{ cfg=await openProfile(p,pass); }catch(e){ await sleep(500); throw new Error("That passcode didn't work."); }
      startSession(p,cfg,pass);
    }}]});
  inp.addEventListener("keydown",function(e){ if(e.key==="Enter"){e.preventDefault();sh.btns[1].click();} });
  setTimeout(function(){inp.focus();},320);
}

/* ----- typed confirmation ----- */
function confirmSheet(o){
  var inp=el("input",{placeholder:"confirm",autocomplete:"off",autocapitalize:"off",autocorrect:"off",spellcheck:"false","aria-label":"Type confirm"});
  var content=el("div",null,
    o.body,
    el("label",{class:"field"},el("span",null,"Type confirm to continue"),inp));
  var sh=openSheet({title:o.title,content:content,actions:[
    {label:"Cancel"},
    {label:o.label,kind:"danger",fn:async function(a){
      if(inp.value.trim().toLowerCase()!=="confirm") throw new Error("Type confirm to continue.");
      await o.fn(a);
    }}]});
  var go=sh.btns[1]; go.disabled=true;
  inp.addEventListener("input",function(){go.disabled=inp.value.trim().toLowerCase()!=="confirm";});
  inp.addEventListener("keydown",function(e){ if(e.key==="Enter"){e.preventDefault();if(!go.disabled)go.click();} });
  setTimeout(function(){inp.focus();},320);
  return sh;
}
function deleteSheet(ids){
  var ps=ids.map(findProf).filter(Boolean); if(!ps.length) return;
  confirmSheet({
    title:ps.length===1?"Delete this saved repository?":"Delete "+ps.length+" saved repositories?",
    body:el("div",null,
      el("p",null,"This removes the following and their access tokens from this device."),
      el("ul",{class:"sumlist"},ps.slice(0,30).map(function(p){return el("li",null,ico("lock"),el("span",null,profName(p)+(p.branch?"  ·  "+p.branch:"")));})),
      el("p",{class:"muted small",style:"margin-top:6px"},"Your files on GitHub aren't touched.")),
    label:"Delete",
    fn:async function(a){
      var gone=new Set(ids), hadCurrent=S.pid&&gone.has(S.pid);
      PF.list=PF.list.filter(function(p){return !gone.has(p.id);});
      if(gone.has(PF.last)) PF.last=PF.list.length?PF.list[0].id:null;
      writeStore(); a.close(); closeAllSheets();
      toast("Deleted "+(ps.length===1?profName(ps[0]):ps.length+" saved repositories"));
      if(hadCurrent) lockNow(); else if(!S.cfg) showHome();
    }});
}
function resetDeviceSheet(){
  confirmSheet({
    title:"Reset this device?",
    body:el("div",null,
      el("p",null,"This removes every saved repository, access token and setting from this device, and clears its offline files."),
      el("p",{class:"muted small",style:"margin-top:6px"},"Your files on GitHub aren't touched. You can add your repositories again afterwards.")),
    label:"Reset",
    fn:async function(a){
      try{
        Object.keys(localStorage).forEach(function(k){ if(k.indexOf("a_")===0) localStorage.removeItem(k); });
      }catch(e){}
      try{ indexedDB.deleteDatabase("atlas-keys"); }catch(e){}
      try{ await clearOffline(); }catch(e){}
      PF={v:2,last:null,list:[]}; S.opts=JSON.parse(JSON.stringify(OPT_DEFAULTS)); applyTheme(S.opts.theme,true); buildSegs();
      a.close(); closeAllSheets(); S.cfg=null; S.pass=null; S.pid=null; resetRepo();
      showHome(); toast("This device was reset");
    }});
}

/* ----- add / edit ----- */
var editingId=null;
function showSetup(editId){
  editingId=editId||null;
  var c=editId?(S.cfg||{}):{}, parts=(c.repo||"").split("/");
  $("setupTitle").textContent=editId?"Edit details":"Add a repository";
  $("cfgOwner").value=parts[0]||""; $("cfgRepo").value=parts[1]||""; $("cfgBranch").value=c.branch||"main"; $("cfgToken").value=c.token||"";
  $("cfgPass").value=editId?(S.pass||""):""; $("cfgToken").type="password"; $("tokEye").innerHTML=svg("eye");
  $("setupErr").textContent="";
  $("setupGo").textContent=editId?"Save changes":"Save"; $("setupOpen").hidden=!!editId;
  $("passRow").hidden=$("passHint").hidden=!CAN_CRYPTO;
  showScreen("s-setup");
}
$("tokEye").innerHTML=svg("eye");
$("tokEye").addEventListener("click",function(){
  var f=$("cfgToken"), show=f.type==="password"; f.type=show?"text":"password"; $("tokEye").innerHTML=svg(show?"eyeoff":"eye");
});
$("setupCancel").addEventListener("click",function(){ if(editingId&&S.cfg) showScreen("shell"); else showHome(); });
async function verifyRepo(cfg){
  var r;
  try{
    r=await fetch("https://api.github.com/repos/"+cfg.repo+"/branches/"+cfg.branch.split("/").map(encodeURIComponent).join("/"),
      {headers:{"Authorization":"Bearer "+cfg.token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},cache:"no-store"});
  }catch(e){ throw new Error("Couldn't reach GitHub. Check your connection and try again."); }
  if(r.ok) return;
  if(r.status===401) throw new Error("GitHub didn't accept that access token.");
  if(r.status===404) throw new Error("Couldn't find "+cfg.repo+" on the branch "+cfg.branch+". Check the names, and that the token can reach this repository.");
  if(r.status===403) throw new Error("GitHub refused the request. Check the token's permissions, or try again in a few minutes.");
  throw new Error("GitHub answered "+r.status+". Try again in a moment.");
}
async function saveSetup(openAfter){
  var owner=$("cfgOwner").value.trim().replace(/^@/,""), name=$("cfgRepo").value.trim().replace(/\.git$/,"");
  var m=owner.match(/github\.com\/([^\/]+)(?:\/([^\/]+))?/i); if(m){owner=m[1]; if(m[2]&&!name) name=m[2].replace(/\.git$/,"");}
  var branch=$("cfgBranch").value.trim()||"main", token=$("cfgToken").value.trim(), pass=$("cfgPass").value;
  if(!/^[\w.-]+$/.test(owner)){ $("setupErr").textContent="Enter your GitHub account name."; return; }
  if(!/^[\w.-]+$/.test(name)){ $("setupErr").textContent="Enter the repository name."; return; }
  if(!token){ $("setupErr").textContent="Enter your access token."; return; }
  var btns=[$("setupGo"),$("setupOpen"),$("setupCancel")]; btns.forEach(function(b){b.disabled=true;});
  $("setupErr").textContent="";
  try{
    var cfg={repo:owner+"/"+name,branch:branch,token:token};
    await verifyRepo(cfg);
    var p=await sealProfile(cfg,pass), old=null, i;
    if(editingId) old=findProf(editingId);
    if(!old) for(i=0;i<PF.list.length;i++){ var q=PF.list[i]; if(profName(q).toLowerCase()===cfg.repo.toLowerCase()&&q.branch===cfg.branch){old=q;break;} }
    if(old){ p.id=old.id; PF.list[PF.list.indexOf(old)]=p; } else { p.id=newId(); PF.list.push(p); }
    PF.last=p.id; writeStore();
    if(editingId){ S.cfg=cfg; S.pass=(p.kind==="pass")?pass:null; S.pid=p.id; resetRepo(); enterApp(); toast("Saved"); }
    else if(openAfter) startSession(p,cfg,p.kind==="pass"?pass:null);
    else { showHome(); toast("Saved "+cfg.repo); }
  }catch(err){ $("setupErr").textContent=(err&&err.message)||String(err); }
  btns.forEach(function(b){b.disabled=false;});
}
$("setupForm").addEventListener("submit",function(e){e.preventDefault();saveSetup(false);});
$("setupOpen").addEventListener("click",function(){saveSetup(true);});

/* ----- switch and manage, from inside the app ----- */
function switchSheet(){
  var list=el("div",{class:"list"});
  PF.list.forEach(function(p){
    var cur=p.id===S.pid;
    list.appendChild(el("div",{class:"row nav"+(cur?" sel":""),role:"button",tabindex:"0",onclick:function(){
      if(cur){closeAllSheets();return;} closeAllSheets(); loginWith(p.id);
    }},el("span",{class:"tile"},ico("lock")),el("div",{class:"name"},profName(p),el("small",null,(p.branch||"main")+(p.kind==="pass"?"  ·  passcode":""))),cur?el("span",{class:"tag"},"open"):el("span",{class:"muted"},ico("chev"))));
  });
  list.appendChild(el("div",{class:"row nav",role:"button",tabindex:"0",onclick:function(){closeAllSheets();showSetup(null);}},
    el("span",{class:"tile"},ico("plus")),el("div",{class:"name"},"Add another repository"),el("span",{class:"muted"},ico("chev"))));
  openSheet({title:"Switch repository",content:list,actions:[{label:"Close"}]});
}
function manageSheet(){
  var sel=new Set(), list=el("div",{class:"list scroll",style:"max-height:46vh"}), del;
  function paint(){
    list.replaceChildren();
    PF.list.forEach(function(p){
      var cb=el("input",{type:"checkbox",checked:sel.has(p.id),"aria-label":"Select "+profName(p),onchange:function(){ if(cb.checked) sel.add(p.id); else sel.delete(p.id); paint(); }});
      var cur=p.id===S.pid;
      var row=el("div",{class:"row"+(sel.has(p.id)?" sel":"")},cb,el("span",{class:"tile"},ico("lock")),
        el("div",{class:"name"},profName(p),cur?el("span",{class:"tag"},"open now"):null,el("small",null,(p.branch||"main")+"  ·  "+(p.kind==="pass"?"passcode":(p.kind==="device"?"no passcode":"no passcode, not encrypted")))));
      row.addEventListener("click",function(e){ if(e.target===cb) return; if(sel.has(p.id)) sel.delete(p.id); else sel.add(p.id); paint(); });
      list.appendChild(row);
    });
    if(del){ del.disabled=!sel.size; del.textContent=sel.size?"Delete "+sel.size+" selected":"Delete selected"; }
  }
  var all=el("label",{class:"check",style:"margin:0 0 6px"},el("input",{type:"checkbox","aria-label":"Select all",onchange:function(e){ sel.clear(); if(e.target.checked) PF.list.forEach(function(p){sel.add(p.id);}); paint(); }}),"Select all");
  var sh=openSheet({title:"Saved repositories",content:el("div",null,all,list),actions:[
    {label:"Close"},
    {label:"Delete selected",kind:"danger",fn:async function(){ if(!sel.size) throw new Error("Select at least one repository."); var ids=Array.from(sel); deleteSheet(ids); }}]});
  del=sh.btns[1]; del.disabled=true; paint();
}
$("connBtn").addEventListener("click",switchSheet);

document.addEventListener("visibilitychange",function(){
  if(document.hidden){ hiddenAt=Date.now(); return; }
  var p=curProfile();
  if(S.cfg&&p&&p.kind==="pass"&&!S.ex.running&&!uploadBusy&&hiddenAt&&Date.now()-hiddenAt>120000) lockNow();
});

