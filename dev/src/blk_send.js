async function sendItems(o){
  var sel=o.sel, policy=o.filePolicy, ui=o.ui, force=!!o.forceSame&&policy==="replace";
  await readRepoState();
  var files=S.repo.files, dirs=S.repo.dirs, headSha, treeSha;
  var ref=await gh("GET",api()+"/git/ref/heads/"+bp()); headSha=ref.object.sha;
  var cm=await gh("GET",api()+"/git/commits/"+headSha); treeSha=cm.tree.sha;
  var ctx=makeCtx(sel,o.dest,o.folderPolicy), taken=new Set();
  var pending=[], pendingBytes=0, batchNo=0, R={added:0,replaced:0,renamed:0,same:0,skipped:0,split:0,parts:0,failed:[]};
  async function commitBatch(){
    if(!pending.length) return; batchNo++;
    var t=await gh("POST",api()+"/git/trees",{base_tree:treeSha,tree:pending.map(function(p){return {path:p.path,mode:p.mode,type:p.type,sha:p.sha};})},true);
    if(t.sha===treeSha){
      ui.log("Part "+batchNo+": the content is the same as what is already saved, so there was nothing to commit.","ok");
      pending=[]; pendingBytes=0; return;
    }
    var c=await gh("POST",api()+"/git/commits",{message:"Add "+plural(pending.length,"file")+" (part "+batchNo+")",tree:t.sha,parents:[headSha]},true);
    await gh("PATCH",api()+"/git/refs/heads/"+bp(),{sha:c.sha},true);
    treeSha=t.sha; headSha=c.sha;
    pending.forEach(function(p){files.set(p.path,{sha:p.sha,mode:p.mode,size:p.size||0});});
    ui.log("Saved part "+batchNo+" ("+plural(pending.length,"file")+")","ok"); pending=[]; pendingBytes=0;
  }
  async function sendOne(full,blob){
    if(parentIsFile(full,files)) throw new Error("a file already uses part of this path");
    if(policy==="skip"&&(files.has(full)||dirs.has(full))){R.skipped++;return;}
    var sha=null; if(files.has(full)) sha=await gitSha(blob);
    var r=resolveDest(full,policy,files,dirs,taken,sha);
    if(r.action==="same"&&force&&files.has(full)) r={path:full,action:"replace"};
    if(r.action==="same"){R.same++;return;}
    if(r.action==="skip"){R.skipped++;return;}
    taken.add(r.path);
    var res=await gh("POST",api()+"/git/blobs",blob.size?{content:await toBase64(blob),encoding:"base64"}:{content:"",encoding:"utf-8"},true);
    var mode=(r.action==="replace"&&files.get(r.path))?files.get(r.path).mode:"100644";
    pending.push({path:r.path,mode:mode,type:"blob",sha:res.sha,size:blob.size}); pendingBytes+=blob.size;
    if(r.action==="replace") R.replaced++; else if(r.action==="rename"){R.renamed++;ui.log(full+" saved as "+r.path,"warn");} else R.added++;
  }
  for(var i=0;i<sel.length;i++){
    if(o.cancelled()) break;
    var f=sel[i], full=ctx.join(ctx.mapped(f.path));
    ui.progress(i/sel.length); ui.status((i+1)+" of "+sel.length+": "+f.path);
    try{
      if(f.split){
        await loadScript("app/vendor/pdflib.js"); await loadScript("app/pdftools.js");
        var big=await f.getBlob();
        var parts=await window.AtlasPdf.split(big,maxBytes(),{status:function(t){ui.status((i+1)+" of "+sel.length+": "+f.path+". "+t);},cancelled:o.cancelled});
        big=null;
        if(!parts) break;
        var dir=full.indexOf("/")>=0?full.slice(0,full.lastIndexOf("/")+1):"", stem=basename(full).replace(/\.pdf$/i,"");
        ui.log(f.path+" was split into "+plural(parts.length,"part")+": "+parts.map(function(p){return fmt(p.blob.size);}).join(", "),"ok");
        R.split++;
        for(var k=0;k<parts.length;k++){
          if(o.cancelled()) break;
          await sendOne(dir+window.AtlasPdf.partName(stem,parts[k].a,parts[k].b),parts[k].blob); R.parts++; parts[k].blob=null;
          if(pending.length>=BATCH_FILES||pendingBytes>=BATCH_BYTES) await commitBatch();
        }
      }else{
        await sendOne(full,await f.getBlob());
      }
    }catch(e){
      if(e&&(e.status===401||e.status===403)&&!/rate limit|abuse|secondary/i.test(e.message)) throw e;
      R.failed.push(f.path); ui.log("Failed: "+f.path+". "+(e&&e.message||e),"bad");
    }
    if(pending.length>=BATCH_FILES||pendingBytes>=BATCH_BYTES) await commitBatch();
  }
  await commitBatch();
  ui.progress(1);
  var parts2=[];
  if(R.added) parts2.push(R.added+" added"); if(R.replaced) parts2.push(R.replaced+" replaced"); if(R.renamed) parts2.push(R.renamed+" saved as copies");
  if(R.split) parts2.push(plural(R.split,"PDF")+" split into "+plural(R.parts,"part"));
  if(R.skipped) parts2.push(R.skipped+" skipped"); if(R.same) parts2.push(R.same+" already identical");
  if(R.failed.length) parts2.push(R.failed.length+" failed");
  R.text=(o.cancelled()?"Stopped. ":"Done. ")+(parts2.length?parts2.join(", "):"Nothing to send")+".";
  return R;
}
