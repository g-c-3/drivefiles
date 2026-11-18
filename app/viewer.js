/* Atlas viewer and editor. Loaded on demand by app.js. */
(function(){
"use strict";
var H=window.AtlasHost, el=H.el, MB=1048576;
var dec8=new TextDecoder("utf-8",{fatal:true}), enc8=new TextEncoder();
function svgi(d,sw){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.8)+'" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';}
var I={
 back:'<path d="m15 5-7 7 7 7"/>',dl:'<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',prev:'<path d="m15 5-7 7 7 7"/>',next:'<path d="m9 5 7 7-7 7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
 justify:'<path d="M4 6h16"/><path d="M4 10h16"/><path d="M4 14h16"/><path d="M4 18h16"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',wrap:'<path d="M4 6h16"/><path d="M4 12h13a3 3 0 0 1 0 6h-4"/><path d="m15 15-2 3 2 3"/><path d="M4 18h5"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',archive:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
 convert:'<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 braces:'<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3"/><path d="M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3"/>'
};
function ic(n,sw){var s=document.createElement("span");s.className="ico";s.innerHTML=svgi(I[n],sw);return s;}
function ibtn(name,label,fn,cls){var b=el("button",{type:"button",class:"ibtn"+(cls?" "+cls:""),"aria-label":label,title:label,onclick:fn});b.appendChild(ic(name));return b;}
function tbtn(name,label,fn,primary){var b=el("button",{type:"button",class:"btn sm"+(primary?" primary":""),onclick:fn});if(name)b.appendChild(ic(name));b.appendChild(document.createTextNode(label));return b;}

/* ---------- type detection ---------- */
var SET=function(s){var o={};s.split(" ").forEach(function(x){o[x]=1;});return o;};
var TEXT=SET("txt text md markdown mdx rst log csv tsv json jsonc json5 jsonl ndjson xml xsl xslt xsd svg html htm xhtml css scss sass less js mjs cjs jsx ts tsx vue svelte py pyi pyw rb php java kt kts scala c h cpp cc cxx hpp hh cs go rs swift m mm lua pl pm r sql sh bash zsh fish ps1 bat cmd yml yaml toml ini cfg conf properties env gitignore gitattributes gitmodules editorconfig dockerignore dockerfile makefile mk cmake gradle groovy tex bib sty cls srt vtt diff patch lock tf hcl graphql gql proto ipynb rtf plist asm s vb vbs ahk tcl dart ex exs erl hs clj lisp el ml nim zig jl sol");
var NAMES=SET("license licence readme makefile dockerfile procfile changelog authors notice copying codeowners contributing gemfile rakefile vagrantfile jenkinsfile brewfile");
var IMG=SET("png jpg jpeg gif webp bmp ico avif svg apng"),VID=SET("mp4 webm mov m4v ogv mkv"),AUD=SET("mp3 wav ogg oga m4a aac flac opus weba");
var ARCH=SET("zip 7z rar tar gz tgz bz2 xz tbz2 txz zst cab iso jar apk");
var MIME={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",bmp:"image/bmp",ico:"image/x-icon",avif:"image/avif",svg:"image/svg+xml",apng:"image/apng",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",m4v:"video/mp4",ogv:"video/ogg",mkv:"video/x-matroska",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",oga:"audio/ogg",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",opus:"audio/ogg",weba:"audio/webm"};
function kindOf(name){
  var ext=H.extOf(name),base=H.basename(name).toLowerCase();
  if(IMG[ext]) return "image"; if(VID[ext]) return "video"; if(AUD[ext]) return "audio";
  if(ext==="pdf") return "pdf"; if(ext==="docx"||ext==="docm"||ext==="dotx") return "docx";
  if(ext==="xlsx"||ext==="xlsm"||ext==="xlsb"||ext==="ods") return "sheet";
  if(ext==="pptx"||ext==="pptm"||ext==="potx"||ext==="ppsx") return "pptx";
  if(ext==="doc"||ext==="xls"||ext==="ppt") return "legacy";
  if(ARCH[ext]) return "archive";
  if(ext==="csv"||ext==="tsv") return "text";
  if(TEXT[ext]||(!ext&&NAMES[base])||NAMES[base]) return "text";
  return "unknown";
}
function mimeFor(name,fallback){return MIME[H.extOf(name)]||fallback||"application/octet-stream";}

/* ---------- viewer shell ---------- */
var V={item:null,ed:null,dirty:false,urls:[],cleanup:[],pushed:false,token:0,siblings:[],sibIdx:-1};
var root=el("div",{id:"viewer",class:"viewer",role:"dialog","aria-modal":"true","aria-label":"File viewer",hidden:true});
var titleEl=el("b",{class:"vname"}),subEl=el("small",{class:"vsub"}),actions=el("div",{class:"vactions"}),subbar=el("div",{class:"vsubbar",hidden:true}),body=el("div",{class:"vbody"}),foot=el("div",{class:"vfoot",hidden:true});
var progFill=el("i"),progLabel=el("span"),progEl=el("div",{class:"vprog",hidden:true},progFill,progLabel);
root.append(el("button",{type:"button",class:"vclose","aria-label":"Close",title:"Close",onclick:function(){close();}},ic("x")),el("header",{class:"vbar"},ibtn("back","Back",function(){close();}),el("div",{class:"vtitle"},titleEl,subEl),actions),progEl,subbar,body,foot);
document.body.appendChild(root);

var progTimer=null;
function progress(){
  clearTimeout(progTimer);progEl.hidden=false;progEl.classList.remove("ok");progFill.style.width="4%";progLabel.textContent="Saving";
  return {
    set:function(f,label){progFill.style.width=Math.max(4,Math.round(f*100))+"%";if(label)progLabel.textContent=label+(f<1?"…":"");},
    done:function(label){progFill.style.width="100%";progEl.classList.add("ok");progLabel.textContent=label||"Saved";progTimer=setTimeout(function(){progEl.hidden=true;},1400);},
    fail:function(){progEl.hidden=true;}
  };
}
function url(blob){var u=URL.createObjectURL(blob);V.urls.push(u);return u;}
function teardown(){
  V.cleanup.forEach(function(f){try{f();}catch(e){}});V.cleanup=[];
  if(V.ed){try{V.ed.destroy();}catch(e){}V.ed=null;}
  V.urls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});V.urls=[];
  body.replaceChildren();actions.replaceChildren();subbar.replaceChildren();subbar.hidden=true;V.dirty=false;
}
function busy(msg){body.replaceChildren(el("div",{class:"vcenter"},el("div",{class:"spin"}),el("p",{class:"muted"},msg||"Opening…")));}
function fail(err,item){
  body.replaceChildren(el("div",{class:"vcenter"},el("b",null,"Can't show this file"),el("p",{class:"muted",style:"max-width:36ch"},(err&&err.message)||String(err)),
    el("div",{style:"display:flex;gap:10px;margin-top:14px"},item&&item.getBlob?tbtn("dl","Download",function(){download(item);},true):null)));
}
function download(item){item.getBlob().then(function(b){H.saveBlob(b,item.name);}).catch(function(e){H.toast(H.friendly(e),true);});}

function confirmDiscard(next){
  if(!V.dirty){next();return;}
  H.openSheet({title:"Unsaved changes",content:el("p",{class:"muted"},"You've edited "+V.item.name+" and haven't saved it."),actions:[
    {label:"Keep editing"},
    {label:"Discard",kind:"danger",fn:function(a){V.dirty=false;a.close();next();}},
    {label:"Save",kind:"primary",fn:async function(a){await save();a.close();next();}}]});
}
function open(path,o){
  o=o||{};
  var info=H.fileInfo(path)||{size:0,sha:null};
  confirmDiscard(function(){
    load({path:path,name:H.basename(path),size:info.size,sha:info.sha,real:true,isNew:!!o.isNew,getBlob:function(){return H.getBlob(path);}});
  });
}
function openBlob(x){confirmDiscard(function(){load({path:x.path||x.name,name:x.name,size:x.size||0,real:false,reader:!!x.reader,getBlob:x.getBlob});});}
function close(silent){
  if(root.hidden||root.classList.contains("vout")) return;
  var go=function(){
    document.documentElement.classList.remove("vopen");V.item=null;
    if(V.nav){window.AtlasNav.drop(V.nav);V.nav=null;} V.pushed=false;
    root.classList.add("vout"); clearTimeout(V.hideT);
    V.hideT=setTimeout(function(){ if(!V.item){ teardown(); root.hidden=true; } root.classList.remove("vout"); },300);
  };
  if(silent){V.dirty=false;go();}else confirmDiscard(go);
}
document.addEventListener("keydown",function(e){
  if(root.hidden) return;
  if((e.ctrlKey||e.metaKey)&&e.key==="s"&&V.dirty){e.preventDefault();save().catch(function(){});}
  else if(e.key==="Escape"&&!e.defaultPrevented&&!document.querySelector(".layer.open")&&!document.querySelector(".cm-panel")){close();}
  else if(!V.ed&&!document.querySelector(".layer.open")&&(e.key==="ArrowLeft"||e.key==="ArrowRight")&&V.siblings.length>1&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||"")){step(e.key==="ArrowRight"?1:-1);}
});
function step(d){
  if(V.sibIdx<0)return;var n=V.sibIdx+d;if(n<0||n>=V.siblings.length)return;
  open(V.siblings[n]);
}
function setupFoot(){
  foot.replaceChildren();
  if(!V.item.real||V.siblings.length<2||V.sibIdx<0){foot.hidden=true;return;}
  foot.hidden=false;
  var p=ibtn("prev","Previous file",function(){step(-1);});var n=ibtn("next","Next file",function(){step(1);});
  p.disabled=V.sibIdx===0;n.disabled=V.sibIdx===V.siblings.length-1;
  foot.append(p,el("span",{class:"muted small"},(V.sibIdx+1)+" of "+V.siblings.length),n);
}

async function load(item){
  var token=++V.token;
  teardown();V.item=item;item.kind=kindOf(item.name);
  clearTimeout(V.hideT);root.classList.remove("vout");root.hidden=false;document.documentElement.classList.add("vopen");
  if(!V.nav&&window.AtlasNav){V.pushed=true;V.nav=window.AtlasNav.push(function(){ if(V.dirty){ confirmDiscard(function(){close(true);}); return false; } close(true); },"viewer");}
  root.classList.toggle("reader",!!item.reader);
  titleEl.textContent=item.name;
  subEl.textContent=(item.real&&item.path.indexOf("/")>0?item.path.slice(0,item.path.lastIndexOf("/"))+"  ·  ":"")+H.fmt(item.size||0);
  if(item.real){V.siblings=H.siblings(item.path);V.sibIdx=V.siblings.indexOf(item.path);}else{V.siblings=[];V.sibIdx=-1;}
  setupFoot();
  var common=[];
  if(item.real&&!item.isNew) common.push(ibtn("info","Details and history",function(){infoSheet();}));
  if(!item.isNew) common.push(ibtn("dl","Download",function(){download(item);}));
  V.common=common;actions.replaceChildren.apply(actions,common);
  busy();
  try{
    if(item.isNew){await renderText(item,new Blob([""]),token,true);return;}
    var blob=await item.getBlob();
    if(token!==V.token) return;
    item.blob=blob;
    var k=item.kind;
    if(k==="unknown"){k=await sniffKind(blob);item.kind=k;}
    if(token!==V.token) return;
    var R={text:renderText,image:renderImage,video:renderMedia,audio:renderMedia,pdf:renderPdf,docx:renderDocx,sheet:renderSheet,pptx:renderPptx,archive:renderArchive,legacy:renderLegacy,hex:renderHex}[k];
    var big=(k==="text"&&blob.size>20*MB)||((k==="docx"||k==="sheet"||k==="pptx")&&blob.size>60*MB);
    if(big) throw new Error("This file is "+H.fmt(blob.size)+", which is too large to open here. Download it instead.");
    await R(item,blob,token);
  }catch(e){ if(token===V.token) fail(e,item); }
}
async function sniffKind(blob){
  var b=new Uint8Array(await blob.slice(0,8192).arrayBuffer()),i;
  if(!b.length) return "text";
  if(b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46) return "pdf";
  if(b[0]===0x89&&b[1]===0x50) return "image"; if(b[0]===0xFF&&b[1]===0xD8) return "image";
  for(i=0;i<b.length;i++) if(b[i]===0) return "hex";
  try{new TextDecoder("utf-8",{fatal:true}).decode(b.length<8192?b:b.subarray(0,b.length-4));return "text";}catch(e){return "hex";}
}

/* ---------- info + history ---------- */
function infoSheet(){
  var it=V.item,f=H.fileInfo(it.path)||{},hist=el("div",{class:"hist"},el("p",{class:"muted small"},"Loading history…"));
  var rows=[["Path","/"+it.path],["Size",H.fmt(f.size||it.size||0)],["Type",(H.extOf(it.name)||"file").toUpperCase()],["Git blob",f.sha?f.sha.slice(0,12):""]];
  var tbl=el("div",{class:"kv"},rows.map(function(r){return el("div",null,el("span",null,r[0]),el("b",null,r[1]));}));
  H.openSheet({title:"Details",content:el("div",null,tbl,el("h3",{style:"margin:18px 0 8px;font-size:1rem"},"Versions"),hist,
    el("div",{style:"margin-top:12px"},tbtn("copy","Copy path",function(){try{navigator.clipboard.writeText(it.path);H.toast("Path copied");}catch(e){}}))),actions:[{label:"Close"}]});
  H.fileHistory(it.path).then(function(list){
    hist.replaceChildren();
    if(!list.length){hist.appendChild(el("p",{class:"muted small"},"No earlier versions."));return;}
    list.forEach(function(c,i){
      var row=el("div",{class:"event"+(i===0?" first":"")},el("span",{class:"dt"}),
        el("div",{style:"flex:1;min-width:0"},el("div",{class:"t"},(c.commit.message||"").split("\n")[0]),el("div",{class:"s"},H.ago(c.commit.author.date)+"  ·  "+c.sha.slice(0,7)),
          i===0?el("span",{class:"tag",style:"margin:4px 0 0"},"current"):el("button",{class:"btn sm",type:"button",style:"margin-top:8px",onclick:function(){
            H.openSheet({title:"Restore this version?",sub:(c.commit.message||"").split("\n")[0],content:el("p",{class:"muted"},"The file goes back to how it was then. This is saved as a new change, so you can undo it from History."),actions:[{label:"Cancel"},
              {label:"Restore",kind:"primary",fn:async function(a){await H.restoreVersion(it.path,c.sha,c.sha.slice(0,7));a.close();H.toast("Version restored");document.querySelectorAll(".layer.open").forEach(function(l){});open(it.path);}}]});
          }},ic("undo"),"Restore")));
      hist.appendChild(row);
    });
  }).catch(function(e){hist.replaceChildren(el("p",{class:"muted small"},"Couldn't load versions: "+H.friendly(e)));});
}

/* ---------- text, code, markdown ---------- */
async function readText(blob){
  var buf=new Uint8Array(await blob.arrayBuffer()),bom=false,txt,ro=null;
  if(buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF){bom=true;buf=buf.subarray(3);}
  try{txt=dec8.decode(buf);}
  catch(e){
    for(var i=0;i<Math.min(buf.length,8192);i++) if(buf[i]===0) return null;
    txt=new TextDecoder("windows-1252").decode(buf);ro="This file isn't UTF-8, so it's shown read-only.";
  }
  var crlf=(txt.match(/\r\n/g)||[]).length,lf=(txt.match(/(^|[^\r])\n/g)||[]).length;
  return {text:txt,bom:bom,crlf:crlf>lf,ro:ro};
}
async function loadEditor(){await H.loadScript("app/vendor/edit.js");}
function prettyJson(t){try{return JSON.stringify(JSON.parse(t),null,2)+"\n";}catch(e){return null;}}
async function renderText(item,blob,token,isNew){
  var info=await readText(blob);
  if(!info){await renderHex(item,blob,token);return;}
  if(token!==V.token) return;
  var ext=H.extOf(item.name),isMd=ext==="md"||ext==="markdown"||ext==="mdx",isHtml=ext==="html"||ext==="htm"||ext==="xhtml",isSvg=ext==="svg",isCsv=ext==="csv"||ext==="tsv";
  var preview=isMd||isHtml||isSvg||isCsv, mode=isNew?"edit":(preview?"preview":"code"), wrapOn=!!H.prefs.wrap;
  var canEdit=item.real&&!info.ro&&blob.size<=5*MB;
  var pane=el("div",{class:"vpane"}),editHost=el("div",{class:"cmhost"});
  body.replaceChildren(pane);
  item.text=info;
  function original(){return info.text;}
  function currentText(){return V.ed?V.ed.get():info.text;}
  async function ensureEditor(readOnly){
    if(V.ed) return;
    await loadEditor();
    V.ed=window.AtlasEdit.create(editHost,info.text,{ext:ext,wrap:wrapOn,dark:H.dark(),readOnly:readOnly,onChange:function(){
      var d=V.ed.get()!==original();if(d!==V.dirty){V.dirty=d;paintBar();}
    }});
  }
  function showCode(readOnly){
    pane.replaceChildren(editHost);
    return ensureEditor(readOnly).then(function(){V.ed.setReadOnly(readOnly);});
  }
  async function showPreview(){
    var txt=currentText(),host;
    if(isMd){
      await H.loadScript("app/vendor/view.js");
      host=el("article",{class:"md"});
      var raw=window.AtlasView.marked.parse(txt,{gfm:true,async:false});
      host.innerHTML=window.AtlasView.DOMPurify.sanitize(raw,{USE_PROFILES:{html:true}});
      pane.replaceChildren(el("div",{class:"vscroll"},host));
      mdPost(host,item);
    }else if(isHtml){
      var f=el("iframe",{class:"hframe",sandbox:"",referrerpolicy:"no-referrer",title:"Preview"});f.srcdoc=txt;
      pane.replaceChildren(el("div",{class:"vscroll noscroll"},el("p",{class:"hint",style:"margin:8px 14px"},"Preview only. Scripts and outside resources are blocked."),f));
    }else if(isSvg){
      var img=el("img",{class:"svgprev",alt:item.name});img.src=url(new Blob([txt],{type:"image/svg+xml"}));
      pane.replaceChildren(el("div",{class:"vscroll center"},img));
    }else if(isCsv){
      await H.loadScript("app/vendor/office.js");
      var wb=window.XLSX.read(txt,{type:"string",raw:true,FS:ext==="tsv"?"\t":undefined});
      pane.replaceChildren();sheetUI(wb,pane);
    }
  }
  var PROSE=isMd||ext==="txt"||ext==="text"||ext==="rst";
  function justActive(){ return PROSE&&mode!=="edit"&&!(V.ed&&!V.ed.view.state.readOnly)&&(item.reader||!!H.prefs.justify); }
  /* view only: never touches the text itself, and is switched off while editing */
  function applyJustify(){
    var on=justActive(), md=pane.querySelector(".md");
    if(md){ md.classList.toggle("justify",on); if(on) md.setAttribute("lang","en"); }
    editHost.classList.toggle("justify",on&&wrapOn&&mode==="code");
  }
  function justBtn(){
    if(!PROSE){ var d=ibtn("justify","Justify: not useful for code",function(){H.toast("Justify isn't useful for code and data files.");},"dim"); d.setAttribute("aria-disabled","true"); return d; }
    var needWrap=mode==="code"&&!wrapOn, b=ibtn("justify",needWrap?"Justify needs line wrapping on":(H.prefs.justify?"Justify text: on":"Justify text: off"),function(){
      if(needWrap){ H.toast("Turn on wrapping to justify text."); return; }
      H.prefs.justify=!H.prefs.justify; H.savePrefs(); paintBar();
    },(H.prefs.justify&&!needWrap?"on":"")+(needWrap?" dim":""));
    return b;
  }
  function paintBar(){
    actions.replaceChildren();
    if(mode==="edit"||(V.ed&&!V.ed.view.state.readOnly&&mode!=="preview")){
      actions.append(ibtn("undo","Undo",function(){V.ed&&V.ed.undo();}),ibtn("redo","Redo",function(){V.ed&&V.ed.redo();}),ibtn("search","Find",function(){V.ed&&V.ed.find();}),
        ibtn("wrap","Wrap lines",function(){wrapOn=!wrapOn;H.prefs.wrap=wrapOn;H.savePrefs();V.ed&&V.ed.setWrap(wrapOn);applyJustify();}));
      if(ext==="json"||ext==="jsonc") actions.append(ibtn("braces","Format JSON",function(){var p=prettyJson(V.ed.get());if(p===null)H.toast("This isn't valid JSON.",true);else V.ed.setDoc(p);}));
      var s=tbtn("save",V.saving?"Saving…":"Save",function(){save().catch(function(){});},true);s.disabled=V.saving||(!V.dirty&&!item.isNew);actions.append(s);
      if(!item.isNew) actions.append(tbtn("","Done",function(){confirmDiscard(function(){leaveEdit();});}));
    }else{
      if(mode==="code"){actions.append(ibtn("search","Find",function(){V.ed&&V.ed.find();}),ibtn("wrap","Wrap lines",function(){wrapOn=!wrapOn;H.prefs.wrap=wrapOn;H.savePrefs();V.ed&&V.ed.setWrap(wrapOn);applyJustify();}));}
      if(!item.reader&&!item.isNew) actions.append(justBtn());
      if(canEdit) actions.append(tbtn("edit","Edit",function(){enterEdit();},false));
      V.common.forEach(function(b){actions.appendChild(b);});
    }
    if(info.ro&&item.real) subEl.textContent=info.ro;
    applyJustify();
  }
  function paintTabs(){
    subbar.replaceChildren();
    if(!preview||mode==="edit"){subbar.hidden=true;return;}
    subbar.hidden=false;
    var labels=isCsv?[["preview","Table"],["code","Text"]]:[["preview","Preview"],["code","Source"]];
    subbar.appendChild(H.seg(labels,mode,function(v){switchMode(v);}));
  }
  async function switchMode(m){
    mode=m;
    if(m==="preview") await showPreview(); else await showCode(true);
    paintTabs();paintBar();
  }
  async function enterEdit(){mode="edit";await showCode(false);paintTabs();paintBar();if(V.ed)V.ed.focus();}
  async function leaveEdit(){
    V.dirty=false;
    if(V.ed){V.ed.setDoc(info.text);V.ed.setReadOnly(true);}
    mode=preview?"preview":"code";
    if(mode==="preview") await showPreview(); else await showCode(true);
    paintTabs();paintBar();
  }
  item.saveFn=async function(force,prog){
    var txt=V.ed.get();
    var out=(info.crlf?txt.replace(/\r?\n/g,"\r\n"):txt);
    var sha=await H.saveText(item.path,(info.bom?"﻿":"")+out,item.isNew?null:item.sha,force);
    item.sha=sha;item.isNew=false;info.text=txt;V.dirty=false;
    item.size=(H.fileInfo(item.path)||{}).size||item.size;
    subEl.textContent=item.path+"  ·  "+H.fmt(item.size);
    var base=item.path.slice(0,item.path.lastIndexOf("/")+1);V.siblings=H.siblings(item.path);V.sibIdx=V.siblings.indexOf(item.path);
    V.common=[ibtn("info","Details and history",function(){infoSheet();}),ibtn("dl","Download",function(){download(item);})];
    V.saving=false;paintBar();
  };
  V.repaint=paintBar;
  if(mode==="edit") await showCode(false);
  else if(mode==="preview") await showPreview();
  else await showCode(true);
  paintTabs();paintBar();
  if(isNew&&V.ed) V.ed.focus();
}
async function save(){
  var it=V.item;if(!it||!it.saveFn||V.saving) return;
  var P=progress();V.saving=true;if(V.repaint)V.repaint();
  async function attempt(force){await it.saveFn(force,P.set);}
  try{await attempt(false);P.done("Saved to the repository");H.toast("Saved");}
  catch(e){
    V.saving=false;
    if(e&&e.conflict){
      P.fail();
      await new Promise(function(res){
        H.openSheet({title:e.exists?"File already exists":"File changed elsewhere",content:el("p",{class:"muted"},e.exists?"A file with this name was created in the meantime. Saving will replace it.":"Someone or something changed this file after you opened it. Saving now will replace those changes. You can restore the earlier version from Details afterwards."),
          actions:[{label:"Cancel",fn:function(a){a.close();res();}},{label:"Save anyway",kind:"danger",fn:async function(a){
            var P2=progress();V.saving=true;if(V.repaint)V.repaint();
            try{await it.saveFn(true,P2.set);P2.done("Saved to the repository");H.toast("Saved");}catch(e2){P2.fail();throw e2;}finally{V.saving=false;if(V.repaint)V.repaint();}
            a.close();res();}}]});
      });
    }else{P.fail();H.toast(H.friendly(e),true);throw e;}
  }finally{V.saving=false;if(V.repaint)V.repaint();}
}
/* resolve a relative repo path */
function resolvePath(baseFile,ref){
  ref=ref.split("#")[0].split("?")[0];if(!ref) return null;
  try{ref=decodeURIComponent(ref);}catch(e){}
  var parts=ref.charAt(0)==="/"?[]:baseFile.split("/").slice(0,-1);
  ref.split("/").forEach(function(s){if(s===".."){parts.pop();}else if(s&&s!==".")parts.push(s);});
  return parts.join("/");
}
function slug(t){return t.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/\s+/g,"-");}
function mdPost(host,item){
  var hl=window.AtlasView.hljs;
  host.querySelectorAll("pre code").forEach(function(c){
    var m=/language-([\w+-]+)/.exec(c.className||"");
    try{if(m&&hl.getLanguage(m[1]))hl.highlightElement(c);else if(c.textContent.length<20000)hl.highlightElement(c);}catch(e){}
  });
  host.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function(h){h.id=slug(h.textContent);});
  host.querySelectorAll("img").forEach(function(img){
    var src=img.getAttribute("src")||"";
    if(/^(https?:)?\/\//i.test(src)){img.removeAttribute("src");img.classList.add("blocked");img.title="Outside images aren't loaded";img.after(el("span",{class:"tag"},"outside image not loaded"));return;}
    if(/^data:image\//i.test(src)) return;
    var p=item.real?resolvePath(item.path,src):null;
    if(p&&H.has(p)){H.getBlob(p).then(function(b){img.src=url(new Blob([b],{type:mimeFor(p,b.type)}));}).catch(function(){});img.removeAttribute("src");}
    else{img.removeAttribute("src");img.after(el("span",{class:"tag bad"},"image not found"));}
  });
  host.querySelectorAll("a[href]").forEach(function(a){
    var h=a.getAttribute("href")||"";
    if(/^(https?:|mailto:)/i.test(h)){a.target="_blank";a.rel="noopener noreferrer";return;}
    if(h.charAt(0)==="#"){a.addEventListener("click",function(e){e.preventDefault();var t=host.querySelector("#"+CSS.escape(h.slice(1)));if(t)t.scrollIntoView({behavior:"smooth"});});return;}
    var p=item.real?resolvePath(item.path,h):null;
    a.removeAttribute("href");a.classList.add("repo-link");
    if(p&&H.has(p)) a.addEventListener("click",function(e){e.preventDefault();H.open(p);});
    else a.title="Not found in the repository";
  });
  host.querySelectorAll("table").forEach(function(t){var w=el("div",{class:"tscroll"});t.parentNode.insertBefore(w,t);w.appendChild(t);});
}

/* ---------- images ---------- */
async function renderImage(item,blob,token){
  var type=mimeFor(item.name,blob.type),u=url(new Blob([blob],{type:type}));
  var stage=el("div",{class:"stage"}),img=el("img",{class:"zimg",alt:item.name,draggable:"false"});
  stage.appendChild(img);
  var st={s:1,x:0,y:0,fit:1};
  function apply(){img.style.transform="translate("+st.x+"px,"+st.y+"px) scale("+st.s+")";}
  function fitIt(){
    var w=img.naturalWidth||1,h=img.naturalHeight||1,cw=stage.clientWidth,ch=stage.clientHeight;
    st.fit=Math.min(cw/w,ch/h,1);st.s=st.fit;st.x=(cw-w*st.s)/2;st.y=(ch-h*st.s)/2;img.style.width=w+"px";img.style.height=h+"px";apply();
  }
  function zoomAt(f,cx,cy){
    var ns=Math.max(st.fit*0.5,Math.min(st.s*f,32));f=ns/st.s;
    st.x=cx-(cx-st.x)*f;st.y=cy-(cy-st.y)*f;st.s=ns;apply();
  }
  img.onload=function(){fitIt();subEl.textContent=img.naturalWidth+" × "+img.naturalHeight+"  ·  "+H.fmt(item.size||blob.size);};
  img.onerror=function(){fail(new Error("This image couldn't be decoded by your browser."),item);};
  img.src=u;
  var pts=new Map(),last=null,lastTap=0;
  stage.addEventListener("pointerdown",function(e){stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;
    var now=Date.now();if(pts.size===1&&now-lastTap<300){var r=stage.getBoundingClientRect();if(st.s>st.fit*1.05){st.s=st.fit;fitIt();}else zoomAt(2.5,e.clientX-r.left,e.clientY-r.top);}lastTap=now;});
  stage.addEventListener("pointermove",function(e){
    if(!pts.has(e.pointerId)) return;
    var p=pts.get(e.pointerId),r=stage.getBoundingClientRect();
    if(pts.size===1){st.x+=e.clientX-p.x;st.y+=e.clientY-p.y;apply();}
    else if(pts.size===2){
      var ids=Array.from(pts.keys()),a=pts.get(ids[0]),b=pts.get(ids[1]);
      var d0=Math.hypot(a.x-b.x,a.y-b.y);
      p.x=e.clientX;p.y=e.clientY;
      var a2=pts.get(ids[0]),b2=pts.get(ids[1]),d1=Math.hypot(a2.x-b2.x,a2.y-b2.y);
      if(d0>0) zoomAt(d1/d0,(a2.x+b2.x)/2-r.left,(a2.y+b2.y)/2-r.top);
    }
    p.x=e.clientX;p.y=e.clientY;
  });
  function up(e){pts.delete(e.pointerId);}
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
  stage.addEventListener("wheel",function(e){e.preventDefault();var r=stage.getBoundingClientRect();zoomAt(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  var onResize=function(){fitIt();};window.addEventListener("resize",onResize);V.cleanup.push(function(){window.removeEventListener("resize",onResize);});
  body.replaceChildren(stage);
  var cx=function(){return [stage.clientWidth/2,stage.clientHeight/2];};
  actions.replaceChildren(ibtn("minus","Zoom out",function(){var c=cx();zoomAt(1/1.3,c[0],c[1]);}),ibtn("plus","Zoom in",function(){var c=cx();zoomAt(1.3,c[0],c[1]);}),ibtn("fit","Fit to screen",fitIt));
  V.common.forEach(function(b){actions.appendChild(b);});
  if(H.extOf(item.name)==="svg"&&item.real){var t=tbtn("edit","Edit source",function(){V.item.kind="text";renderText(item,blob,V.token);});actions.appendChild(t);}
}
async function renderMedia(item,blob,token){
  var type=mimeFor(item.name,blob.type),tag=item.kind==="video"?"video":"audio";
  var m=el(tag,{controls:"",preload:"metadata",playsinline:"",class:"media"});m.src=url(new Blob([blob],{type:type}));
  m.onerror=function(){fail(new Error("Your browser can't play this "+(tag==="video"?"video":"audio")+" format. Download it to play it elsewhere."),item);};
  body.replaceChildren(el("div",{class:"vcenter",style:"width:100%"},tag==="audio"?el("div",{class:"bigicon"},"♪"):null,m));
  V.cleanup.push(function(){try{m.pause();}catch(e){}});
}

/* ---------- PDF ---------- */
var pdfMod=null;
async function renderPdf(item,blob,token){
  if(!pdfMod){pdfMod=await import(new URL("app/vendor/pdf/pdf.min.mjs",location.href).href);pdfMod.GlobalWorkerOptions.workerSrc=new URL("app/vendor/pdf/pdf.worker.min.mjs",location.href).href;}
  var data=new Uint8Array(await blob.arrayBuffer()),doc=null,pw;
  var opts={cMapUrl:new URL("app/vendor/pdf/cmaps/",location.href).href,cMapPacked:true,standardFontDataUrl:new URL("app/vendor/pdf/standard_fonts/",location.href).href};
  async function tryOpen(password){
    var task=pdfMod.getDocument(Object.assign({data:data.slice(),password:password},opts));
    return task.promise;
  }
  while(!doc){
    try{doc=await tryOpen(pw);}
    catch(e){
      if(e&&e.name==="PasswordException"){
        pw=await askPassword(e.code===2?"That password didn't work.":"This PDF is password protected.");
        if(pw===null) throw new Error("A password is needed to open this PDF.");
      }else throw e;
    }
  }
  if(token!==V.token){doc.destroy();return;}
  V.cleanup.push(function(){try{doc.destroy();}catch(e){}});
  var scroll=el("div",{class:"vscroll pdfscroll"}),pages=[],zoom=1,dpr=Math.min(window.devicePixelRatio||1,2.5),pageNo=el("span",{class:"pagepill"},"1 / "+doc.numPages);
  body.replaceChildren(scroll,pageNo);
  var first=await doc.getPage(1);
  function baseWidth(){return Math.max(240,scroll.clientWidth-16);}
  var io=new IntersectionObserver(function(ents){ents.forEach(function(en){if(en.isIntersecting)draw(en.target._i);});},{root:scroll,rootMargin:"600px 0px"});
  V.cleanup.push(function(){io.disconnect();});
  async function draw(i){
    var P=pages[i];if(!P||P.done===zoom)return;P.done=zoom;
    var pg=await doc.getPage(i+1),vp0=pg.getViewport({scale:1}),sc=baseWidth()*zoom/vp0.width,vp=pg.getViewport({scale:sc*dpr});
    var cv=P.canvas;cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);cv.style.width=Math.floor(vp.width/dpr)+"px";cv.style.height=Math.floor(vp.height/dpr)+"px";
    P.box.style.width=cv.style.width;P.box.style.height=cv.style.height;
    try{await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;}catch(e){}
  }
  function build(){
    scroll.replaceChildren();pages=[];
    var vp0=first.getViewport({scale:1}),sc=baseWidth()*zoom/vp0.width;
    for(var i=0;i<doc.numPages;i++){
      var cv=document.createElement("canvas"),box=el("div",{class:"pdfpage",style:"width:"+Math.floor(vp0.width*sc)+"px;height:"+Math.floor(vp0.height*sc)+"px"},cv);
      box._i=i;pages.push({canvas:cv,box:box,done:0});scroll.appendChild(box);io.observe(box);
    }
  }
  build();
  var rt;var onResize=function(){clearTimeout(rt);rt=setTimeout(function(){pages.forEach(function(p){p.done=0;});build();},200);};
  window.addEventListener("resize",onResize);V.cleanup.push(function(){window.removeEventListener("resize",onResize);});
  scroll.addEventListener("scroll",function(){
    var mid=scroll.scrollTop+scroll.clientHeight/3,n=0;
    for(var i=0;i<pages.length;i++){if(pages[i].box.offsetTop<=mid)n=i;else break;}
    pageNo.textContent=(n+1)+" / "+doc.numPages;
  },{passive:true});
  function setZoom(z){var frac=scroll.scrollHeight?scroll.scrollTop/scroll.scrollHeight:0;zoom=Math.max(0.5,Math.min(z,4));pages.forEach(function(p){p.done=0;});build();scroll.scrollTop=frac*scroll.scrollHeight;}
  actions.replaceChildren(ibtn("minus","Zoom out",function(){setZoom(zoom/1.25);}),ibtn("plus","Zoom in",function(){setZoom(zoom*1.25);}),ibtn("fit","Fit width",function(){setZoom(1);}));
  V.common.forEach(function(b){actions.appendChild(b);});
  subEl.textContent=H.plural(doc.numPages,"page")+"  ·  "+H.fmt(item.size||blob.size);
}
function askPassword(msg){
  return new Promise(function(resolve){
    var pw=el("input",{type:"password",placeholder:"Password",autocomplete:"off",autocapitalize:"off",spellcheck:"false"}),done=false;
    H.openSheet({title:"Password needed",sub:msg,content:el("div",{class:"field",style:"margin-top:0"},pw),onClose:function(){if(!done)resolve(null);},actions:[{label:"Cancel"},
      {label:"Open",kind:"primary",fn:function(a){if(!pw.value)throw new Error("Enter the password.");done=true;resolve(pw.value);a.close();}}]});
    setTimeout(function(){pw.focus();},320);
  });
}

/* ---------- Word ---------- */
function fitScaled(wrapper,host,zoomRef){
  function go(){
    var nat=wrapper.scrollWidth||wrapper.offsetWidth||800,avail=host.clientWidth-8,s=Math.min(1,avail/nat)*zoomRef.z;
    wrapper.style.transformOrigin="0 0";wrapper.style.transform="scale("+s+")";
    sizer.style.width=Math.ceil(nat*s)+"px";sizer.style.height=Math.ceil(wrapper.offsetHeight*s)+"px";
  }
  var sizer=wrapper.parentNode;go();
  var onResize=function(){go();};window.addEventListener("resize",onResize);V.cleanup.push(function(){window.removeEventListener("resize",onResize);});
  return go;
}
async function renderDocx(item,blob,token){
  await H.loadScript("app/vendor/office.js");
  var buf=await blob.arrayBuffer(),host=el("div",{class:"vscroll docxhost"}),sizer=el("div",{class:"sizer"}),inner=el("div");
  sizer.appendChild(inner);host.appendChild(sizer);body.replaceChildren(host);
  await window.docxPreview.renderAsync(buf,inner,null,{className:"docx",inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true,ignoreLastRenderedPageBreak:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,useBase64URL:true});
  if(token!==V.token) return;
  var wrap=inner.querySelector(".docx-wrapper")||inner,z={z:1};
  wrap.style.paddingLeft=wrap.style.paddingRight="0";
  inner.style.width="max-content";
  var go=fitScaled(inner,host,z);
  actions.replaceChildren(ibtn("minus","Zoom out",function(){z.z=Math.max(0.4,z.z/1.25);go();}),ibtn("plus","Zoom in",function(){z.z=Math.min(4,z.z*1.25);go();}),ibtn("fit","Fit width",function(){z.z=1;go();}));
  V.common.forEach(function(b){actions.appendChild(b);});
}

/* ---------- spreadsheets ---------- */
function sheetUI(wb,pane){
  var names=wb.SheetNames,cur=0,LIMIT=1500,host=el("div",{class:"vscroll"}),tabs=el("div",{class:"sheettabs"});
  pane.append(host);
  var area=el("div",{class:"tscroll big"});
  host.appendChild(area);
  function render(shown){
    var ws=wb.Sheets[names[cur]];area.replaceChildren();
    if(!ws||!ws["!ref"]){area.appendChild(el("p",{class:"empty"},"This sheet is empty."));return;}
    var X=window.XLSX,r=X.utils.decode_range(ws["!ref"]),rows=Math.min(r.e.r-r.s.r+1,shown),cols=Math.min(r.e.c-r.s.c+1,200);
    var merges=ws["!merges"]||[],mstart={},mskip={};
    merges.forEach(function(m){
      mstart[m.s.r+","+m.s.c]=m;
      for(var rr=m.s.r;rr<=m.e.r;rr++)for(var cc=m.s.c;cc<=m.e.c;cc++) if(rr!==m.s.r||cc!==m.s.c) mskip[rr+","+cc]=1;
    });
    var t=document.createElement("table"),head=document.createElement("tr"),th=document.createElement("th");th.className="corner";head.appendChild(th);
    for(var c=0;c<cols;c++){th=document.createElement("th");th.textContent=X.utils.encode_col(r.s.c+c);head.appendChild(th);}
    t.appendChild(head);
    for(var i=0;i<rows;i++){
      var tr=document.createElement("tr"),rh=document.createElement("th");rh.textContent=String(r.s.r+i+1);tr.appendChild(rh);
      for(var j=0;j<cols;j++){
        var R=r.s.r+i,C=r.s.c+j;if(mskip[R+","+C]) continue;
        var td=document.createElement("td"),cell=ws[X.utils.encode_cell({r:R,c:C})];
        if(cell){td.textContent=cell.w!=null?cell.w:(cell.v!=null?String(cell.v):"");if(cell.t==="n")td.className="num";}
        var m=mstart[R+","+C];if(m){td.colSpan=Math.min(m.e.c-m.s.c+1,cols-j);td.rowSpan=m.e.r-m.s.r+1;}
        tr.appendChild(td);
      }
      t.appendChild(tr);
    }
    area.appendChild(t);
    var total=r.e.r-r.s.r+1;
    if(total>rows) area.appendChild(el("div",{class:"morerows"},el("button",{class:"btn sm",type:"button",onclick:function(){render(shown+LIMIT);}},"Show more rows"),el("span",{class:"muted small"}," "+rows+" of "+total+" rows shown")));
  }
  function paintTabs(){
    tabs.replaceChildren();
    if(names.length<2){tabs.hidden=true;return;}
    names.forEach(function(n,i){tabs.appendChild(el("button",{type:"button",class:"stab",role:"tab","aria-selected":String(i===cur),onclick:function(){cur=i;paintTabs();render(LIMIT);}},n));});
  }
  pane.appendChild(tabs);paintTabs();render(LIMIT);
}
async function renderSheet(item,blob,token){
  await H.loadScript("app/vendor/office.js");
  var buf=await blob.arrayBuffer(),wb=window.XLSX.read(buf,{type:"array",cellDates:true,cellNF:true,cellText:true});
  if(token!==V.token) return;
  var pane=el("div",{class:"vpane"});body.replaceChildren(pane);sheetUI(wb,pane);
  subEl.textContent=H.plural(wb.SheetNames.length,"sheet")+"  ·  "+H.fmt(item.size||blob.size);
}

/* ---------- PowerPoint (.pptx) ---------- */
function parseXml(s){return new DOMParser().parseFromString(s,"application/xml");}
function kids(n,name){return Array.prototype.filter.call(n.children,function(c){return c.tagName===name;});}
function first(n,name){return n&&n.getElementsByTagName(name)[0]||null;}
function attrN(n,a,d){var v=n&&n.getAttribute(a);return v==null?d:+v;}
async function renderPptx(item,blob,token){
  await H.loadScript("app/vendor/office.js");
  var zip=await window.JSZip.loadAsync(await blob.arrayBuffer());
  async function xml(p){var f=zip.file(p);return f?parseXml(await f.async("string")):null;}
  function dirOf(p){return p.slice(0,p.lastIndexOf("/")+1);}
  function norm(base,t){if(t.charAt(0)==="/")return t.slice(1);var parts=dirOf(base).split("/").filter(Boolean);t.split("/").forEach(function(s){if(s==="..")parts.pop();else if(s&&s!==".")parts.push(s);});return parts.join("/");}
  async function rels(p){
    var rp=dirOf(p)+"_rels/"+p.slice(p.lastIndexOf("/")+1)+".rels",d=await xml(rp),m={};
    if(d) Array.prototype.forEach.call(d.getElementsByTagName("Relationship"),function(r){m[r.getAttribute("Id")]={type:r.getAttribute("Type"),target:norm(p,r.getAttribute("Target"))};});
    return m;
  }
  var pres=await xml("ppt/presentation.xml"),prels=await rels("ppt/presentation.xml");
  var sz=first(pres,"p:sldSz"),SW=attrN(sz,"cx",9144000),SH=attrN(sz,"cy",6858000);
  var ids=Array.prototype.map.call(pres.getElementsByTagName("p:sldId"),function(n){return n.getAttribute("r:id");});
  var list=el("div",{class:"vscroll slides"});body.replaceChildren(list);
  var imgCache={};
  async function media(p){if(imgCache[p])return imgCache[p];var f=zip.file(p);if(!f)return null;var b=await f.async("blob");var ext=H.extOf(p);return imgCache[p]=url(new Blob([b],{type:MIME[ext]||"image/png"}));}
  var layoutCache={};
  async function placeholderXfrm(ph,layoutPath,masterPath){
    var idx=ph.getAttribute("idx"),type=ph.getAttribute("type")||"body";
    for(var src of [layoutPath,masterPath]){
      if(!src) continue;
      var d=layoutCache[src]||(layoutCache[src]=await xml(src));if(!d) continue;
      var sps=d.getElementsByTagName("p:sp");
      for(var i=0;i<sps.length;i++){
        var p2=first(sps[i],"p:ph");if(!p2) continue;
        var match=(idx&&p2.getAttribute("idx")===idx)||(!idx&&(p2.getAttribute("type")||"body")===type)||((p2.getAttribute("type")||"body")===type&&type!=="body");
        if(match){var xf=first(first(sps[i],"p:spPr")||sps[i],"a:xfrm");if(xf)return xf;}
      }
    }
    return null;
  }
  var slideNo=0;
  for(var si=0;si<ids.length;si++){
    var rel=prels[ids[si]];if(!rel) continue;
    var sd=await xml(rel.target);if(!sd) continue;
    var srels=await rels(rel.target),layoutPath=null,masterPath=null;
    Object.keys(srels).forEach(function(k){if(/slideLayout$/.test(srels[k].type))layoutPath=srels[k].target;});
    if(layoutPath){var lr=await rels(layoutPath);Object.keys(lr).forEach(function(k){if(/slideMaster$/.test(lr[k].type))masterPath=lr[k].target;});}
    var frame=el("div",{class:"slide"}),wrapEl=el("div",{class:"slidewrap"},frame,el("div",{class:"slideno"},"Slide "+(++slideNo)));
    list.appendChild(wrapEl);
    var bg=first(sd,"p:bg"),bgc=bg&&first(bg,"a:srgbClr");if(bgc) frame.style.background="#"+bgc.getAttribute("val");
    var tree=first(sd,"p:spTree");
    var K=function(){return (frame.clientWidth||list.clientWidth||600)/SW;};
    async function shapes(parent,tf,notes){
      for(var c of Array.from(parent.children)){
        var tag=c.tagName;
        if(tag==="p:grpSp"){
          var gx=first(first(c,"p:grpSpPr"),"a:xfrm"),off=first(gx,"a:off"),ext=first(gx,"a:ext"),cho=first(gx,"a:chOff"),che=first(gx,"a:chExt");
          var sx=attrN(che,"cx",1)?attrN(ext,"cx",1)/attrN(che,"cx",1):1,sy=attrN(che,"cy",1)?attrN(ext,"cy",1)/attrN(che,"cy",1):1;
          var ntf={x:function(v){return tf.x(attrN(off,"x",0)+(v-attrN(cho,"x",0))*sx);},y:function(v){return tf.y(attrN(off,"y",0)+(v-attrN(cho,"y",0))*sy);},w:function(v){return tf.w(v*sx);},h:function(v){return tf.h(v*sy);},fs:tf.fs};
          await shapes(c,ntf);continue;
        }
        if(tag!=="p:sp"&&tag!=="p:pic"&&tag!=="p:graphicFrame") continue;
        var xf=null;
        if(tag==="p:graphicFrame") xf=first(c,"p:xfrm");
        else xf=first(first(c,"p:spPr"),"a:xfrm");
        var ph=first(c,"p:ph");
        if(!xf&&ph) xf=await placeholderXfrm(ph,layoutPath,masterPath);
        if(!xf) continue;
        var o=first(xf,"a:off"),e=first(xf,"a:ext");if(!o||!e) continue;
        var box=el("div",{class:"sh"});
        box.style.left=tf.x(attrN(o,"x",0))*100/SW+"%";box.style.top=tf.y(attrN(o,"y",0))*100/SH+"%";box.style.width=tf.w(attrN(e,"cx",0))*100/SW+"%";box.style.height=tf.h(attrN(e,"cy",0))*100/SH+"%";
        if(tag==="p:pic"){
          var blip=first(c,"a:blip"),rid=blip&&blip.getAttribute("r:embed"),r2=srels[rid];
          if(r2){var u=await media(r2.target);if(u){var im=el("img",{src:u,alt:""});box.appendChild(im);}}
          frame.appendChild(box);
        }else if(tag==="p:graphicFrame"){
          var tbl=first(c,"a:tbl");
          if(tbl){
            var t=document.createElement("table");t.className="ptable";
            kids(tbl,"a:tr").forEach(function(tr){var row=document.createElement("tr");kids(tr,"a:tc").forEach(function(tc){var td=document.createElement("td");td.textContent=Array.prototype.map.call(tc.getElementsByTagName("a:p"),function(p){return Array.prototype.map.call(p.getElementsByTagName("a:t"),function(x){return x.textContent;}).join("");}).join("\n");row.appendChild(td);});t.appendChild(row);});
            box.appendChild(t);
          }else box.appendChild(el("div",{class:"ph"},"Chart or object"));
          frame.appendChild(box);
        }else{
          var tb=first(c,"p:txBody");if(!tb){continue;}
          var type=ph?(ph.getAttribute("type")||"body"):null,isTitle=type==="title"||type==="ctrTitle",isBody=!!ph&&!isTitle&&type!=="sldNum"&&type!=="dt"&&type!=="ftr"&&type!=="subTitle";
          kids(tb,"a:p").forEach(function(p){
            var pp=first(p,"a:pPr"),algn=pp&&pp.getAttribute("algn"),pe=el("div",{class:"pp"}),has=false,fsz=null;
            if(algn==="ctr")pe.style.textAlign="center";else if(algn==="r")pe.style.textAlign="right";
            var lvl=attrN(pp,"lvl",0);if(lvl)pe.style.marginLeft=lvl*1.2+"em";
            Array.from(p.children).forEach(function(rn){
              if(rn.tagName==="a:br"){pe.appendChild(document.createElement("br"));return;}
              if(rn.tagName!=="a:r"&&rn.tagName!=="a:fld") return;
              var rp=first(rn,"a:rPr"),txt=first(rn,"a:t"),sp=el("span",null,txt?txt.textContent:"");
              var s=rp&&rp.getAttribute("sz");if(s){sp.setAttribute("data-sz",s);fsz=fsz||+s;}
              if(rp&&rp.getAttribute("b")==="1")sp.style.fontWeight="700";if(rp&&rp.getAttribute("i")==="1")sp.style.fontStyle="italic";if(rp&&rp.getAttribute("u")&&rp.getAttribute("u")!=="none")sp.style.textDecoration="underline";
              var col=rp&&first(rp,"a:srgbClr");if(col)sp.style.color="#"+col.getAttribute("val");
              pe.appendChild(sp);has=true;
            });
            var buNone=pp&&first(pp,"a:buNone"),buChar=pp&&first(pp,"a:buChar");
            if(has&&!buNone&&(buChar||isBody)){pe.classList.add("bul");}
            if(!has) pe.appendChild(document.createTextNode(" "));
            pe.setAttribute("data-fs",String(fsz||(isTitle?4400:(isBody?2800:1800))));
            if(isTitle) pe.style.fontWeight="700";
            box.appendChild(pe);
          });
          frame.appendChild(box);
        }
      }
    }
    await shapes(tree,{x:function(v){return v;},y:function(v){return v;},w:function(v){return v;},h:function(v){return v;}});
    frame.style.aspectRatio=SW+" / "+SH;
  }
  function scaleText(){
    var k=(list.querySelector(".slide")||{clientWidth:600}).clientWidth/SW;
    list.querySelectorAll(".pp").forEach(function(p){p.style.fontSize=(+p.getAttribute("data-fs")/100*12700*k)+"px";});
    list.querySelectorAll("span[data-sz]").forEach(function(s){s.style.fontSize=(+s.getAttribute("data-sz")/100*12700*k)+"px";});
    list.querySelectorAll(".ptable").forEach(function(t){t.style.fontSize=(1800/100*12700*k*0.6)+"px";});
  }
  scaleText();
  var onResize=function(){scaleText();};window.addEventListener("resize",onResize);V.cleanup.push(function(){window.removeEventListener("resize",onResize);});
  subEl.textContent=H.plural(slideNo,"slide")+"  ·  "+H.fmt(item.size||blob.size);
  if(!slideNo) list.appendChild(el("p",{class:"empty"},"No slides were found in this file."));
}

/* ---------- archives and old Office formats ---------- */
async function renderArchive(item,blob,token){
  var can=item.real;
  body.replaceChildren(el("div",{class:"vcenter"},el("div",{class:"bigicon"},ic("archive",1.4)),el("b",null,item.name),
    el("p",{class:"muted",style:"max-width:38ch"},"This is an archive. Open it to see what's inside, preview files, and extract only the parts you want into a folder."),
    el("div",{style:"display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px"},
      can?tbtn("archive","Browse and extract",function(){H.routeToExtract(item.path);},true):null,tbtn("dl","Download",function(){download(item);}))));
}
async function renderLegacy(item,blob,token){
  var ext=H.extOf(item.name),target={doc:"Word (.docx)",xls:"Excel (.xlsx)",ppt:"PowerPoint (.pptx)"}[ext],names={doc:"docx",xls:"xlsx",ppt:"pptx"};
  var note=ext==="xls"?"Values, formulas and merged cells are carried over. Charts and pictures are not.":ext==="doc"?"Text, headings, tables, formatting and pictures are carried over. Page layout is simplified.":"Slide text and pictures are carried over with their positions. Design details are simplified.";
  var status=el("p",{class:"muted small",style:"min-height:1.4em"});
  var go=tbtn("convert","Convert and open",async function(){
    go.disabled=true;status.textContent="Converting…";
    try{
      var target2=await H.convertOne(item.path);
      status.textContent="Done";H.toast("Saved as "+H.basename(target2));H.open(target2);
    }catch(e){status.textContent="";go.disabled=false;H.toast(H.friendly(e),true);}
  },true);
  body.replaceChildren(el("div",{class:"vcenter"},el("div",{class:"bigicon"},ic("convert",1.4)),el("b",null,"Old "+ext.toUpperCase()+" format"),
    el("p",{class:"muted",style:"max-width:40ch"},"Browsers can't show this format directly. Convert it to "+target+" and the new file is saved next to the original, which stays as it is."),
    el("p",{class:"hint",style:"max-width:40ch"},note),
    el("div",{style:"display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px"},item.real?go:null,tbtn("dl","Download original",function(){download(item);})),status));
}

/* ---------- hex ---------- */
async function renderHex(item,blob,token){
  var CH=65536,off=0,pre=el("pre",{class:"hex"}),more=el("div",{class:"morerows"});
  async function chunk(){
    var u=new Uint8Array(await blob.slice(off,off+CH).arrayBuffer()),out=[];
    for(var i=0;i<u.length;i+=16){
      var row=u.subarray(i,i+16),hx=[],as="";
      for(var j=0;j<16;j++){if(j<row.length){hx.push(("0"+row[j].toString(16)).slice(-2));as+=(row[j]>=32&&row[j]<127)?String.fromCharCode(row[j]):".";}else hx.push("  ");}
      out.push(("0000000"+(off+i).toString(16)).slice(-8)+"  "+hx.slice(0,8).join(" ")+"  "+hx.slice(8).join(" ")+"  "+as);
    }
    pre.textContent+=out.join("\n")+"\n";off+=u.length;
    more.replaceChildren();
    if(off<blob.size) more.appendChild(el("button",{class:"btn sm",type:"button",onclick:chunk},"Show more"));
    more.appendChild(el("span",{class:"muted small"}," "+H.fmt(Math.min(off,blob.size))+" of "+H.fmt(blob.size)));
  }
  body.replaceChildren(el("div",{class:"vscroll"},el("p",{class:"hint",style:"margin:10px 14px"},"This file isn't text, so its raw bytes are shown."),pre,more));
  await chunk();
}

window.AtlasViewer={open:open,openBlob:openBlob,close:close,current:function(){return (V.item&&V.item.real&&!root.hidden&&!root.classList.contains("vout"))?V.item.path:null;}};
})();
