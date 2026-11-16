# ===== v6 edits (exec'd from apply_edits.py) =====
rep("/* ================= storage: saved repositories ================= */",open("blk_nav.js",encoding="utf-8").read()+"/* ================= storage: saved repositories ================= */")
rep('''  ["s-home","s-setup","shell"].forEach(function(id){$(id).hidden=(id!==name);});
  window.scrollTo(0,0);''','''  ["s-home","s-setup","shell"].forEach(function(id){$(id).hidden=(id!==name);});
  window.scrollTo(0,0);
  if(name==="s-home") Nav.clear();
  else if(name==="s-setup"){ Nav.dropKind("setup"); Nav.push(function(){ if(S.cfg&&editingId) showScreen("shell"); else showHome(); },"setup"); }
  else if(name==="shell"){ Nav.dropKind("setup"); if(!Nav.has("session")){ Nav.st.unshift({close:sessionBack,kind:"session"}); Nav.sched(); } }''')
rep('$("sheetRoot").appendChild(layer); sheetStack.push(layer);','$("sheetRoot").appendChild(layer); sheetStack.push(layer);\n  layer._nav=Nav.push(function(){ if(layer._locked) return false; closeLayer(layer); },"sheet");')
rep('var i=sheetStack.indexOf(layer); if(i<0) return; sheetStack.splice(i,1);','var i=sheetStack.indexOf(layer); if(i<0) return; sheetStack.splice(i,1);\n  if(layer._nav){ Nav.drop(layer._nav); layer._nav=null; }')
rep('''function goDir(path){
  S.lib.cwd=path;''','''function viewBack(c,t){return function(){ goDirRaw(c); setTabRaw(t); };}
function viewNav(c,t){
  var cc=S.lib.cwd, ct=S.tab, i;
  if(c===cc&&t===ct) return;
  for(i=Nav.st.length-1;i>=0&&Nav.st[i].kind==="view";i--){
    var f=Nav.st[i].from; if(f.c===c&&f.t===t){ Nav.st.length=i; Nav.sched(); return; }
  }
  var e=Nav.push(viewBack(cc,ct),"view"); e.from={c:cc,t:ct};
}
function goDir(path){
  viewNav(path,"files");
  goDirRaw(path);
}
function goDirRaw(path){
  S.lib.cwd=path;''')
rep('''  parts.forEach(function(p){acc=joinPath(acc,p);S.lib.exp.add(acc);});
  setTab("files");''','''  parts.forEach(function(p){acc=joinPath(acc,p);S.lib.exp.add(acc);});
  setTabRaw("files");''')
rep('function setTab(name){\n  S.tab=name;','function setTab(name){\n  viewNav(S.lib.cwd,name);\n  setTabRaw(name);\n}\nfunction setTabRaw(name){\n  S.tab=name;')
rep('setTab("files"); loadRepo();','Nav.dropKind("view"); setTabRaw("files"); loadRepo();')
rep('var side=$("sideNav"), bot=$("tabsBottom"); side.replaceChildren(); bot.replaceChildren();','var side=$("sideNav"); side.replaceChildren();')
rep('    bot.appendChild(el("button",{type:"button","data-tab":t[0],onclick:function(){setTab(t[0]);}},ico(t[2]),t[1]));\n','')
rep(''' dots:\'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>\'''',''' dots:\'<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>\'''')
rep('strip:false,limit:48,','strip:false,limit:49,')
rep('if(!(v>0))v=48;','if(!(v>0))v=49;')
rep('function nthPath(path,n,isDir){','function copyBase(stem){var m=stem.match(/^(.*)_(\\d{1,3})$/);return (m&&m[1])?{b:m[1],n:+m[2]}:{b:stem,n:0};}\nfunction nthPath(path,n,isDir){')
rep('return dir+stem+"_"+n+ext;','return dir+copyBase(stem).b+"_"+n+ext;')
rep('function uniquePath(path,taken,isDir){for(var n=1;;n++){','function uniquePath(path,taken,isDir){var bs=path.slice(path.lastIndexOf("/")+1), dt=isDir?-1:bs.lastIndexOf("."), start=copyBase(dt>0?bs.slice(0,dt):bs).n+1;for(var n=start;;n++){')
s=s.replace('["rename","Keep both"]','["rename","Save as copy"]')
rep('function policyWord(p){return {skip:"left as they are",rename:"saved as copies",replace:"replaced"}[p];}','function policyWord(p){return {skip:"will be left as they are",rename:"will be saved as copies",replace:"will be replaced"}[p];}')
rep('rename:"The new file is saved next to the old one as name_1, name_2 and so on."','rename:"The new file is saved in the same folder with _1 added to its name, then _2, _3 and so on."')
a=s.index('  $("segFolder").replaceChildren('); b=s.index("\n",a); s=s[:a]+s[b+1:]
rep('$("hintFile").textContent=FILE_HINT[S.opts.filePolicy]; $("hintFolder").textContent=FOLDER_HINT[S.opts.folderPolicy];','$("hintFile").textContent=FILE_HINT[S.opts.filePolicy];')
rep('filePolicy:S.opts.filePolicy,folderPolicy:S.opts.folderPolicy,','filePolicy:S.opts.filePolicy,folderPolicy:"merge",')
rep('previewCounts(sel,S.ex.dest,S.opts.folderPolicy)','previewCounts(sel,S.ex.dest,"merge")')
