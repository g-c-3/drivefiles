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

