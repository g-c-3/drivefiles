async function zipDownloadSheet(d,paths){
  if(paths.some(function(p){return / pages\d+to\d+\.pdf$/i.test(p);})){ try{ await loadScript("app/pdftools.js"); }catch(e){} }
  var mplan=window.AtlasPdf?window.AtlasPdf.planMerge(paths):{groups:[],rest:paths};
  var restNames=new Set(mplan.rest.map(entryName));
  mplan.groups=mplan.groups.filter(function(g){return !restNames.has(entryName(g.out));});
  var joined=new Set(); mplan.groups.forEach(function(g){g.parts.forEach(function(p){joined.add(p);});});
  var apart=paths.filter(function(p){return !joined.has(p)&&window.AtlasPdf&&window.AtlasPdf.parsePart(basename(p));});
  var total=0; paths.forEach(function(p){total+=S.repo.files.get(p).size;});
  var nameIn=el("input",{value:d.top.length===1?basename(d.top[0]):"download",autocapitalize:"off",autocomplete:"off",spellcheck:"false"});
  var pwIn=el("input",{type:"password",placeholder:"Leave empty for no password",autocomplete:"new-password",autocapitalize:"off",spellcheck:"false"});
  var eye=el("button",{type:"button",class:"ibtn","aria-label":"Show or hide password",onclick:function(){var s=pwIn.type==="password";pwIn.type=s?"text":"password";eye.innerHTML=svg(s?"eyeoff":"eye");}});
  eye.innerHTML=svg("eye");
  var mode="aes", joinOn=true;
  var bar=el("i"), progress=el("div",{class:"progress",hidden:true},bar), status=el("div",{class:"status small"});
  var joinBox=null;
  if(mplan.groups.length){
    var cb=el("input",{type:"checkbox",checked:true,onchange:function(){joinOn=cb.checked;joinList.hidden=!joinOn;}});
    var joinList=el("ul",{class:"sumlist",style:"margin:6px 0 0 34px"},
      mplan.groups.map(function(g){return el("li",null,fileTile(g.out),el("span",null,basename(g.out)+"  ←  "+plural(g.parts.length,"part")));}));
    joinBox=el("div",{class:"joinbox"},
      el("label",{class:"check"},cb,"Join continuous PDF parts"),
      el("p",{class:"hint",style:"margin:0 0 0 34px"},"Parts of the same PDF whose page numbers follow on are joined into one file in the zip. Your files in the repository aren't changed."),
      joinList,
      apart.length?el("p",{class:"hint",style:"margin:8px 0 0 34px"},apart.map(basename).join(", ")+(apart.length>1?" stay":" stays")+" separate because the pages aren't continuous."):null);
  }
  var content=el("div",null,
    el("p",{class:"muted"},plural(paths.length,"file")+", "+fmt(total)+" will be packed into one zip file."),
    joinBox,
    el("label",{class:"field"},el("span",null,"File name"),nameIn),
    el("label",{class:"field"},el("span",null,"Password",el("i",null,"optional")),el("div",{class:"pw"},pwIn,eye)),
    el("div",{class:"field"},el("span",null,"Protection"),seg([["aes","Strong (AES-256)"],["zc","Compatible"]],mode,function(v){mode=v;})),
    el("p",{class:"hint"},"Strong works with 7-Zip, WinZip, and most Android apps. Choose Compatible if a built-in phone or Mac extractor can't open it; it is much weaker. Without a password, none of this applies."),
    total>400*MB?el("p",{class:"hint",style:"color:var(--warn)"},"This is a large download. It is built in memory, so it can fail on a phone."):null,
    progress,status);
  openSheet({title:"Download as zip",content:content,actions:[
    {label:"Cancel"},
    {label:"Download",kind:"primary",fn:async function(a){
      var nm=(nameIn.value.trim()||"download").replace(/[\\\/:*?"<>|]+/g,"_"), pw=pwIn.value;
      progress.hidden=false; progress.classList.add("run"); a.lock(true);
      var opts={};
      if(pw){ opts.password=pw; if(mode==="zc") opts.zipCrypto=true; else opts.encryptionStrength=3; }
      var items=[];
      if(joinOn&&mplan.groups.length){
        await loadScript("app/vendor/pdflib.js"); await loadScript("app/pdftools.js");
        paths.forEach(function(p){ if(!joined.has(p)) items.push({name:entryName(p),get:function(){return blobBySha(S.repo.files.get(p).sha);}}); });
        mplan.groups.forEach(function(g){
          items.push({name:entryName(g.out),get:async function(){
            status.textContent="Joining "+basename(g.out);
            var bl=[]; for(var q=0;q<g.parts.length;q++) bl.push(await blobBySha(S.repo.files.get(g.parts[q]).sha));
            return window.AtlasPdf.merge(bl);
          }});
        });
      }else paths.forEach(function(p){ items.push({name:entryName(p),get:function(){return blobBySha(S.repo.files.get(p).sha);}}); });
      await needZip(); var zw=new zip.ZipWriter(new zip.BlobWriter("application/zip"),opts), done=0, i;
      try{
        for(i=0;i<items.length;i++){
          var bl2=await items[i].get();
          await zw.add(items[i].name,new zip.BlobReader(bl2)); done++;
          bar.style.width=Math.round(done/items.length*100)+"%"; status.textContent=done+" of "+items.length;
        }
        var out=await zw.close();
        saveBlob(out,nm+".zip"); progress.classList.remove("run"); a.lock(false); a.close();
        toast(pw?"Zip downloaded, protected with a password":"Zip downloaded");
      }catch(e){ progress.classList.remove("run"); a.lock(false); try{await zw.close();}catch(x){} throw new Error(friendly(e)); }
    }}]});
}

