function moveCopySheet(mode){
  var d=describeSel(); if(!d.top.length) return;
  var isCopy=mode==="copy", isRen=mode==="rename", single=d.top.length===1, policy="rename";
  var parent=function(p){var i=p.lastIndexOf("/");return i>0?p.slice(0,i):"";};
  var nameIn=(single&&(isRen||isCopy))?el("input",{value:basename(d.top[0]),autocapitalize:"off",autocomplete:"off",spellcheck:"false"}):null;
  var ft=isRen?null:folderTree({start:S.lib.cwd,height:"42vh",disabled:function(p){
    return !isCopy&&d.top.some(function(s){return S.repo.dirs.has(s)&&(p===s||p.indexOf(s+"/")===0);});
  }});
  var content=el("div",null,
    selTouchesApp()?appWarn("This includes files that make this app run. Moving or renaming them stops the Pages site from working until they are back."):null,
    ft?el("div",{class:"field",style:"margin-top:0"},el("span",null,isCopy?"Copy to":"Move to"),ft.el):null,
    nameIn?el("label",{class:"field"},el("span",null,"Name"),nameIn):null,
    isRen?null:el("div",{class:"field"},el("span",null,"If something is already there"),
      seg([["skip","Skip"],["rename","Save as copy"],["replace","Replace"]],policy,function(v){policy=v;})));
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
