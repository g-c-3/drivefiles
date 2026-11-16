import re
s=open("app.js",encoding="utf-8").read()
def rep(a,b,count=1,regex=False):
    global s
    if regex:
        n=len(re.findall(a,s,flags=re.S)); assert n>=1,("regex missing",a[:60]); s=re.sub(a,lambda m:b,s,count=count,flags=re.S)
    else:
        assert a in s,("missing",a[:70]); s=s.replace(a,b) if count==0 else s.replace(a,b,count)
# 1 loader
rep('zip.configure({useWebWorkers:false});','''var LOADED={};
function loadScript(url){
  if(LOADED[url]) return LOADED[url];
  return LOADED[url]=new Promise(function(res,rej){
    var s=document.createElement("script");s.src=url;s.onload=function(){res();};
    s.onerror=function(){delete LOADED[url];rej(new Error("Couldn't load "+url+". Make sure the app files are in the repository."));};
    document.head.appendChild(s);
  });
}
async function needZip(){ await loadScript("app/vendor/zip.min.js"); if(!needZip.done){zip.configure({useWebWorkers:false});needZip.done=true;} }''')
rep('var zw=new zip.ZipWriter(','await needZip(); var zw=new zip.ZipWriter(')
rep('async function exOpenZip(file){\n','async function exOpenZip(file){\n  await needZip();\n')
# 4 worker
a=s.index("function w7start(){"); b=s.index("function w7run(")
c=s.index("function exItemsFromW7")
s=s[:a]+'''async function w7start(){
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
'''+s[c:]
# 5
rep('fetchRaw(f.sha)','blobBySha(f.sha)'); rep('fetchRaw(S.repo.files.get(p).sha)','blobBySha(S.repo.files.get(p).sha)')
# 6 prefs
rep('opts:{filePolicy:"skip",folderPolicy:"merge",strip:false,limit:48}','opts:{filePolicy:"skip",folderPolicy:"merge",strip:false,limit:48,sortKey:"name",sortDir:"asc",hideApp:false,offline:false}')
rep('function savePrefs(){try{localStorage.setItem(PK,JSON.stringify({filePolicy:S.opts.filePolicy,folderPolicy:S.opts.folderPolicy,strip:S.opts.strip,limit:S.opts.limit}));}catch(e){}}','function savePrefs(){try{localStorage.setItem(PK,JSON.stringify(S.opts));}catch(e){}}')
# icons
rep(' pencil:',' sort:\'<path d="M7 4v16"/><path d="m3 16 4 4 4-4"/><path d="M17 20V4"/><path d="m13 8 4-4 4 4"/>\',\n convert:\'<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>\',\n info:\'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>\',\n back:\'<path d="m15 5-7 7 7 7"/>\',\n pencil:')
# 7 index
rep('var idx=new Map(), dirs=new Set(); idx.set("",new Map());\n  S.repo.files.forEach(function(f,p){','var idx=new Map(), dirs=new Set(); idx.set("",new Map());\n  S.repo.files.forEach(function(f,p){\n    if(S.opts.hideApp&&isApp(p)) return;')
rep('function countVisibleFiles(){var n=0;S.repo.files.forEach(function(f,p){if(!isKeep(p))n++;});return n;}','function countVisibleFiles(){var n=0;S.repo.files.forEach(function(f,p){if(!isKeep(p)&&(!S.opts.hideApp||!isApp(p)))n++;});return n;}')
rep('r.files.forEach(function(f){total+=f.size;});','r.files.forEach(function(f,p){if(!S.opts.hideApp||!isApp(p))total+=f.size;});',count=0)
rep('if(!isKeep(p)&&p.toLowerCase().indexOf(q)>=0) rows.push','if(!isKeep(p)&&(!S.opts.hideApp||!isApp(p))&&p.toLowerCase().indexOf(q)>=0) rows.push')
rep(r'return Array\.from\(m\.values\(\)\)\.sort\(function\(a,b\)\{\s*if\(a\.dir!==b\.dir\) return a\.dir\?-1:1; return a\.name\.localeCompare\(b\.name,undefined,\{numeric:true\}\);\s*\}\);\s*\}\s*function renderLibrary',
    'return Array.from(m.values()).sort(sortCmp);\n}\nfunction renderLibrary',regex=True)
# 8 row click
rep('if(x.dir&&!S.lib.sel.size){ goDir(x.path); window.scrollTo(0,0); return; }','if(!S.lib.sel.size){ if(x.dir){goDir(x.path);window.scrollTo(0,0);}else openFile(x.path); return; }')
# 9 actionbar
rep('$("actRename").hidden=n!==1;','$("actRename").hidden=n!==1; $("actConvert").hidden=!hasLegacy();')
# 10 replace regions
a=s.index("/* ----- folder picker"); b=s.index("/* ----- delete ----- */")
s=s[:a]+open("blk_tree.js").read()+s[b:]
a=s.index("function moveCopySheet(mode){"); b=s.index('$("actMove").onclick')
s=s[:a]+open("blk_move.js").read()+s[b:]
a=s.index('$("menuBtn").innerHTML=svg("dots");'); b=s.index("/* ================= GitHub API")
s=s[:a]+s[b:]
# 11 host
a=s.index("/* ================= boot ================= */")
s=s[:a]+open("blk_host.js").read()+'$("actConvert").append(ico("convert"),lbl("Convert"));\n'+s[a:]
rep('if(!l._locked) closeLayer(l);}','if(!l._locked){e.preventDefault();closeLayer(l);}}')

# progress + fast writes
rep('if(isWrite){ var w=lastWrite+WRITE_GAP-Date.now(); if(w>0) await sleep(w); lastWrite=Date.now(); }','if(isWrite){ if(isWrite!=="fast"){ var w=lastWrite+WRITE_GAP-Date.now(); if(w>0) await sleep(w); } lastWrite=Date.now(); }')
a=s.index("async function commitEntries(entries,message){"); b=s.index("function enterApp(){")
s=s[:a]+'''async function commitEntries(entries,message,prog){
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
'''+s[b:]
rep('busy:function(on){btns.forEach(function(b){b.disabled=on;});},','busy:function(on){btns.forEach(function(b){b.disabled=on;});sbar.hidden=!on;},')
rep('var layer=el("div",{class:"layer"}), errEl=','var sbar=el("div",{class:"sbar",hidden:true},el("i")), layer=el("div",{class:"layer"}), errEl=')
rep('var panel=el("div",{class:"sheet",role:"dialog","aria-modal":"true"},\n    el("h2",null,o.title)','var panel=el("div",{class:"sheet",role:"dialog","aria-modal":"true"},\n    sbar,el("h2",null,o.title)')
# 12 extract preview
rep('var nm=el("div",{class:"name"},k.name,','var nm=el("div",{class:"name",style:"cursor:pointer",title:"Preview",onclick:function(){previewExtract(k);}},k.name,')
s=s.replace("/* ================= boot ================= */",'''async function previewExtract(k){
  try{ await loadScript("app/viewer.js"); }catch(e){ toast(e.message,true); return; }
  window.AtlasViewer.openBlob({name:k.name,path:k.path,size:k.size,getBlob:k.getBlob});
}
/* ================= boot ================= */''')

# ===== v5: profiles, home, empty files, app files =====
rep('cfg:null, pass:null, tab:"files"','cfg:null, pass:null, pid:null, tab:"files"')
a=s.index("/* ================= vault ================= */"); b=s.index("/* ================= sheets (stackable) ================= */")
s=s[:a]+open("blk_profiles.js",encoding="utf-8").read()+s[b:]
rep('if(hasVault()){ showScreen("s-lock"); $("lockPass").focus(); } else showSetup(false);','migrateOld(); PF=readStore(); showHome();')
# empty files are held back like oversized ones, and sent when ticked
rep('var items=list.map(function(f){var tooBig=f.size>=MAX_BYTES, big=tooBig||f.size>limit;return {path:f.name,size:f.size,big:big,tooBig:tooBig,checked:!big,',
    'var items=list.map(function(f){var tooBig=f.size>=MAX_BYTES, empty=f.size===0, big=tooBig||empty||f.size>limit;return {path:f.name,size:f.size,big:big,empty:empty,tooBig:tooBig,checked:!big,')
rep('it.big?el("span",{class:"tag"+(it.tooBig?" bad":"")},it.tooBig?"too large":"large"):null','it.big?el("span",{class:"tag"+(it.tooBig?" bad":"")},it.tooBig?"too large":(it.empty?"empty":"large")):null')
rep('var tooBig=r.size>=MAX_BYTES, big=tooBig||r.size>limit;\n    node.children.set(fname,{name:fname,path:parts.join("/"),isDir:false,size:r.size,getBlob:r.getBlob,big:big,',
    'var tooBig=r.size>=MAX_BYTES, empty=r.size===0, big=tooBig||empty||r.size>limit;\n    node.children.set(fname,{name:fname,path:parts.join("/"),isDir:false,size:r.size,getBlob:r.getBlob,empty:empty,big:big,')
rep('k.big?el("span",{class:"tag"+(k.tooBig?" bad":"")},k.tooBig?"too large":"large"):null','k.big?el("span",{class:"tag"+(k.tooBig?" bad":"")},k.tooBig?"too large":(k.empty?"empty":"large")):null')
rep('$("skipsum").textContent="Held back for size: "+big.length+" over "+getLimit()+" MB";',
    'var nEmpty=big.filter(function(f){return f.empty;}).length, nBig=big.length-nEmpty, bits=[];\n  if(nBig) bits.push(nBig+" over "+getLimit()+" MB"); if(nEmpty) bits.push(nEmpty+" empty");\n  $("skipsum").textContent="Held back: "+bits.join(", ")+". Tick any you want to include.";')
rep('fmt(f.size)+(f.tooBig?"  ·  over the 100 MB limit, can\'t be sent":"")','(f.empty?"empty file":fmt(f.size))+(f.tooBig?"  ·  over the 100 MB limit, can\'t be sent":"")')
rep('var big=allFiles(S.ex.root).filter(function(f){return f.big;}), box=$("skipped")','var big=allFiles(S.ex.root).filter(function(f){return f.big;}), box=$("skipped")')
rep('var big=sel.filter(function(f){return f.big;}).length;\n  $("summary").textContent=sel.length+" of "+fs.length+" selected, "+fmt(bytes)+(big?", including "+big+" large":"");',
    'var big=sel.filter(function(f){return f.big;}).length;\n  $("summary").textContent=sel.length+" of "+fs.length+" selected, "+fmt(bytes)+(big?", including "+big+" held back":"");')
rep('allFiles(S.ex.root).forEach(function(f){var big=f.tooBig||f.size>limit;if(big!==f.big){f.big=big;f.checked=!big;}});','allFiles(S.ex.root).forEach(function(f){var big=f.tooBig||f.empty||f.size>limit;if(big!==f.big){f.big=big;f.checked=!big;}});')
rep('      if(f.size===0){R.empty++;ui.log("Skipped empty file: "+f.path,"warn");continue;}\n','')
rep('var b64s=await toBase64(blob);\n      var res=await gh("POST",api()+"/git/blobs",{content:b64s,encoding:"base64"},true);',
    'var res=await gh("POST",api()+"/git/blobs",blob.size?{content:await toBase64(blob),encoding:"base64"}:{content:"",encoding:"utf-8"},true);')
rep(' if(R.empty) parts.push(R.empty+" empty skipped");','')
# app files: tag on rows, warning when changing them
rep('el("div",{class:"name"},shown,el("small",null,where)),\n      x.dir?el("span",{class:"muted"},ico("chev")):null);','el("div",{class:"name"},shown,isAppPath(x.path)?el("span",{class:"tag app",title:"Part of this app"},"app"):null,el("small",null,where)),\n      x.dir?el("span",{class:"muted"},ico("chev")):null);')
rep('    el("p",{class:"muted small",style:"margin-top:6px"},"You can undo it afterwards from History."),\n    el("ul",{class:"sumlist"}',
    '    el("p",{class:"muted small",style:"margin-top:6px"},"You can undo it afterwards from History."),\n    selTouchesApp()?appWarn("This includes files that make this app run. Deleting them stops the Pages site from working until you add them back."):null,\n    el("ul",{class:"sumlist"}')
exec(open("v6_edits.py",encoding="utf-8").read())
exec(open("v7_edits.py",encoding="utf-8").read())
exec(open("v8_edits.py",encoding="utf-8").read())
open("app2.js","w",encoding="utf-8").write(s)
print("ok",len(s))
