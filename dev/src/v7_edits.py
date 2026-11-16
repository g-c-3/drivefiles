# ===== v7 edits =====
# limit 50, "up to limit minus 0.1 MB"
rep('strip:false,limit:49,','strip:false,limit:50,splitPdf:true,forceSame:false,')
rep('if(!(v>0))v=49;','if(!(v>0))v=50;')
rep('if(S.opts.limit===48) S.opts.limit=49;','if(S.opts.limit===48||S.opts.limit===49) S.opts.limit=50;')
rep('function getLimit(){','''function maxBytes(){return Math.max(Math.round(0.1*MB),Math.round((getLimit()-0.1)*MB));}
function maxLabel(){return (Math.max(0.1,getLimit()-0.1)).toFixed(1);}
var MAX_SPLIT=400*MB;
function isPdfName(n){return /\\.pdf$/i.test(n);}
function classify(name,size){
  var mx=maxBytes(), c={empty:size===0,split:false,tooBig:false,big:false};
  if(c.empty){c.big=true;return c;}
  if(S.opts.splitPdf&&isPdfName(name)&&size>mx){ if(size>=MAX_SPLIT){c.tooBig=true;c.big=true;} else c.split=true; return c; }
  c.tooBig=size>=MAX_BYTES; c.big=c.tooBig||size>mx; return c;
}
function estParts(size){return Math.max(2,Math.ceil(size/(maxBytes()*0.97)));}
function tagFor(k){return k.tooBig?"too large":(k.empty?"empty":(k.split?"split":"large"));}
function splitNote(k){return k.split?"  ·  will be split into about "+estParts(k.size)+" parts":"";}
function reclass(f,nameKey){
  var c=classify(f[nameKey],f.size); f.empty=c.empty; f.tooBig=c.tooBig; f.split=c.split;
  if(c.big!==f.big){f.big=c.big;f.checked=!c.big;}
}
function getLimit(){''')
# Add files sheet
rep('var items=list.map(function(f){var tooBig=f.size>=MAX_BYTES, empty=f.size===0, big=tooBig||empty||f.size>limit;return {path:f.name,size:f.size,big:big,empty:empty,tooBig:tooBig,checked:!big,getBlob:function(){return Promise.resolve(f);}};});',
    'var items=list.map(function(f){var c=classify(f.name,f.size);return {path:f.name,size:f.size,big:c.big,empty:c.empty,tooBig:c.tooBig,split:c.split,checked:!c.big,getBlob:function(){return Promise.resolve(f);}};});')
rep('it.big?el("span",{class:"tag"+(it.tooBig?" bad":"")},it.tooBig?"too large":(it.empty?"empty":"large")):null,el("small",null,fmt(it.size)+(it.tooBig?"  ·  over the 100 MB limit":"")))',
    '(it.big||it.split)?el("span",{class:"tag"+(it.tooBig?" bad":"")+(it.split?" split":"")},tagFor(it)):null,el("small",null,fmt(it.size)+splitNote(it)+(it.tooBig?"  ·  too large to send":"")))')
rep('''    el("div",{class:"field"},el("span",null,"If a file already exists"),seg([["skip","Skip"],["rename","Save as copy"],["replace","Replace"]],policy,function(v){policy=v;paintList();})),
    progress,status,logEl);''','''    el("div",{class:"field"},el("span",null,"If a file already exists"),seg([["skip","Skip"],["rename","Save as copy"],["replace","Replace"]],policy,function(v){policy=v;forceRow.hidden=v!=="replace";paintList();})),
    forceRow,splitRow,
    progress,status,logEl);''')
rep('  var dr=destRow(holder,"dest",paintList);\n  var content=el("div",null,','''  var dr=destRow(holder,"dest",paintList);
  var forceCb=el("input",{type:"checkbox",checked:!!S.opts.forceSame,onchange:function(){S.opts.forceSame=forceCb.checked;savePrefs();}});
  var forceRow=el("div",{hidden:policy!=="replace"},el("label",{class:"check"},forceCb,"Replace even if the file is identical"),el("p",{class:"hint",style:"margin:0 0 0 34px"},FORCE_HINT));
  var splitCb=el("input",{type:"checkbox",checked:!!S.opts.splitPdf,onchange:function(){S.opts.splitPdf=splitCb.checked;savePrefs();items.forEach(function(it){reclass(it,"path");});paintList();}});
  var splitRow=el("div",null,el("label",{class:"check"},splitCb,"Split large PDFs into parts"),el("p",{class:"hint",style:"margin:0 0 0 34px"},splitHint()));
  var content=el("div",null,''')
rep('var R=await sendItems({sel:sel,dest:dest,filePolicy:policy,folderPolicy:"merge",ui:ui,','var R=await sendItems({sel:sel,dest:dest,filePolicy:policy,folderPolicy:"merge",forceSame:S.opts.forceSame,ui:ui,')
rep('var R=await sendItems({sel:sel,dest:dest,filePolicy:S.opts.filePolicy,folderPolicy:"merge",ui:ui,','var R=await sendItems({sel:sel,dest:dest,filePolicy:S.opts.filePolicy,folderPolicy:"merge",forceSame:S.opts.forceSame,ui:ui,')
rep('var FILE_HINT=','var FORCE_HINT="Normally an identical file is skipped. This sends it again and counts it as replaced. Git keeps identical content only once, so the repository itself doesn\'t change.";\nfunction splitHint(){return "A PDF over "+maxLabel()+" MB is cut into continuous page ranges under that size and saved as name pages1to16.pdf, name pages17to31.pdf and so on. Text and pictures are kept; bookmarks and form fields are not.";}\nvar FILE_HINT=')
# Extract tree
rep('var tooBig=r.size>=MAX_BYTES, empty=r.size===0, big=tooBig||empty||r.size>limit;\n    node.children.set(fname,{name:fname,path:parts.join("/"),isDir:false,size:r.size,getBlob:r.getBlob,empty:empty,big:big,tooBig:tooBig,checked:!big,locked:r.encrypted});',
    'var cl=classify(fname,r.size);\n    node.children.set(fname,{name:fname,path:parts.join("/"),isDir:false,size:r.size,getBlob:r.getBlob,empty:cl.empty,split:cl.split,big:cl.big,tooBig:cl.tooBig,checked:!cl.big,locked:r.encrypted});')
rep('k.big?el("span",{class:"tag"+(k.tooBig?" bad":"")},k.tooBig?"too large":(k.empty?"empty":"large")):null,el("small",null,fmt(k.size)));',
    '(k.big||k.split)?el("span",{class:"tag"+(k.tooBig?" bad":"")+(k.split?" split":"")},tagFor(k)):null,el("small",null,fmt(k.size)+splitNote(k)));')
rep('(f.empty?"empty file":fmt(f.size))+(f.tooBig?"  ·  over the 100 MB limit, can\'t be sent":"")','(f.empty?"empty file":fmt(f.size))+(f.tooBig?"  ·  too large to send":"")')
rep('(big?", including "+big+" held back":"");','(big?", including "+big+" held back":"")+(nsplit?". "+plural(nsplit,"PDF")+" will be split":"");')
rep('var big=sel.filter(function(f){return f.big;}).length;\n  $("summary")','var big=sel.filter(function(f){return f.big;}).length, nsplit=sel.filter(function(f){return f.split;}).length;\n  $("summary")')
rep('''  if(!S.ex.root) return; var limit=getLimit()*MB;
  allFiles(S.ex.root).forEach(function(f){var big=f.tooBig||f.empty||f.size>limit;if(big!==f.big){f.big=big;f.checked=!big;}});
  exRender();''','''  updLimitHint(); if(!S.ex.root) return;
  allFiles(S.ex.root).forEach(function(f){reclass(f,"name");});
  exRender();''')
rep('$("optStrip").checked=!!S.opts.strip; $("optLimit").value=S.opts.limit;','''$("optStrip").checked=!!S.opts.strip; $("optLimit").value=S.opts.limit;
  $("optSplit").checked=!!S.opts.splitPdf; $("optForce").checked=!!S.opts.forceSame; $("forceBox").hidden=S.opts.filePolicy!=="replace"; $("hintForce").textContent=FORCE_HINT; updLimitHint();''')
rep('''seg([["skip","Skip"],["rename","Save as copy"],["replace","Replace"]],S.opts.filePolicy,function(v){S.opts.filePolicy=v;savePrefs();''','''seg([["skip","Skip"],["rename","Save as copy"],["replace","Replace"]],S.opts.filePolicy,function(v){S.opts.filePolicy=v;savePrefs();$("forceBox").hidden=v!=="replace";''')
rep('$("optStrip").addEventListener("change"','''function updLimitHint(){ $("limitHint").textContent="Files up to "+maxLabel()+" MB are sent. Anything bigger is held back"+(S.opts.splitPdf?", except PDFs, which are split.":"."); $("hintSplit").textContent=splitHint(); }
$("optSplit").addEventListener("change",function(){S.opts.splitPdf=$("optSplit").checked;savePrefs();updLimitHint();if(S.ex.root){allFiles(S.ex.root).forEach(function(f){reclass(f,"name");});exRender();}});
$("optForce").addEventListener("change",function(){S.opts.forceSame=$("optForce").checked;savePrefs();});
$("optStrip").addEventListener("change"''')
# send engine + download
a=s.index("async function sendItems(o){"); b=s.index("function previewCounts(")
s=s[:a]+open("blk_send.js",encoding="utf-8").read()+s[b:]
a=s.index("function zipDownloadSheet(d,paths){"); b=s.index("/* ================= History ================= */")
s=s[:a]+open("blk_dl.js",encoding="utf-8").read()+s[b:]
# header icons
rep(' pencil:',' upload:\'<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>\',\n fileplus:\'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v5M9.5 14.5h5"/>\',\n pencil:')
rep('$("newFolder").append(ico("folderplus"),"New folder");','$("newFolder").append(ico("folderplus"));')
rep('$("addFiles").append(ico("plus"),"Add files");','$("addFiles").append(ico("upload"));')
rep('$("libSearch").value=""; S.ex.destTouched=false;','$("libSearch").value=""; $("searchWrap").classList.remove("open"); $("searchWrap").inert=true; $("searchBtn").classList.remove("on"); S.ex.destTouched=false;')
rep('$("connName").textContent=S.cfg.repo; $("connDot").classList.remove("off");','$("connName").textContent=S.cfg.repo; $("connDot").classList.remove("off"); fitConn();')
