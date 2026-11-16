/* Atlas PDF tools: split a large PDF into parts under a size, and join continuous parts back together.
   Needs app/vendor/pdflib.js (pdf-lib) to be loaded first. */
(function(){
"use strict";
var RX=/^(.*) pages(\d+)to(\d+)\.pdf$/i;

function partName(base,a,b){return base+" pages"+a+"to"+b+".pdf";}
function parsePart(name){var m=RX.exec(name); return m?{base:m[1],a:+m[2],b:+m[3]}:null;}
function dirOf(p){var i=p.lastIndexOf("/");return i<0?"":p.slice(0,i);}
function nameOf(p){return p.slice(p.lastIndexOf("/")+1);}

function lib(){ if(!window.PDFLib) throw new Error("The PDF engine isn't loaded. Make sure the app files are in the repository."); return window.PDFLib; }
function sleep0(){return new Promise(function(r){setTimeout(r,0);});}

async function openPdf(blob){
  var P=lib(), bytes=new Uint8Array(await blob.arrayBuffer());
  try{ return await P.PDFDocument.load(bytes,{updateMetadata:false}); }
  catch(e){
    if(/encrypt/i.test(String(e&&e.message))) throw new Error("This PDF is password protected, so it can't be split or joined.");
    throw new Error("This PDF couldn't be read, so it can't be split or joined.");
  }
}
async function build(src,from,count){
  var P=lib(), out=await P.PDFDocument.create(), idx=[], i;
  for(i=0;i<count;i++) idx.push(from+i);
  var pages=await out.copyPages(src,idx);
  pages.forEach(function(p){out.addPage(p);});
  var bytes=await out.save({useObjectStreams:true});
  return new Blob([bytes],{type:"application/pdf"});
}

/* Split into the fewest continuous page ranges that each stay within maxBytes.
   Returns [{a,b,blob}] with 1-based page numbers, or null if cancelled. */
async function split(blob,maxBytes,o){
  o=o||{};
  var src=await openPdf(blob), n=src.getPageCount();
  if(n<2) throw new Error("This PDF has one page, so it can't be split.");
  var avg=blob.size/n, parts=[], i=0, target=maxBytes*0.985;
  while(i<n){
    if(o.cancelled&&o.cancelled()) return null;
    var remaining=n-i, cnt=Math.max(1,Math.min(remaining,Math.floor(target/avg))), lo=0, hi=remaining+1, best=null, tries=0, size, b, next;
    for(;;){
      tries++;
      if(o.status) o.status("Splitting: part "+(parts.length+1)+", pages "+(i+1)+" to "+(i+cnt));
      await sleep0();
      b=await build(src,i,cnt); size=b.size;
      if(size<=maxBytes){
        lo=cnt; best={cnt:cnt,blob:b};
        if(cnt===remaining||size>=maxBytes*0.96||tries>=7) break;
        next=Math.floor(cnt*(target/size)); if(next<=cnt) next=cnt+1; if(next>=hi) next=hi-1;
        if(next<=lo) break;
        cnt=Math.min(next,remaining);
      }else{
        hi=cnt;
        if(cnt===1) throw new Error("Page "+(i+1)+" alone is larger than the limit, so this PDF can't be split small enough.");
        next=Math.floor(cnt*(target/size)); if(next<1) next=1; if(next>=hi) next=hi-1;
        if(next<=lo&&best) break;
        cnt=Math.max(1,next);
        if(tries>=14&&best) break;
      }
    }
    if(!best) throw new Error("Couldn't make a part within the size limit.");
    parts.push({a:i+1,b:i+best.cnt,blob:best.blob});
    i+=best.cnt;
  }
  return parts;
}

/* Which of these paths can be joined? Parts of the same document (same folder and name) whose page ranges run on
   without a gap are joined. Anything else is left alone. */
function planMerge(paths){
  var groups=new Map(), rest=[], out=[];
  paths.forEach(function(p){
    var m=parsePart(nameOf(p));
    if(!m){rest.push(p);return;}
    var k=dirOf(p)+"\u0000"+m.base, g=groups.get(k); if(!g){g=[];groups.set(k,g);}
    g.push({path:p,a:m.a,b:m.b,base:m.base,dir:dirOf(p)});
  });
  groups.forEach(function(g){
    g.sort(function(x,y){return x.a-y.a;});
    var run=[g[0]], j;
    function flush(){
      if(run.length>1){
        var first=run[0], last=run[run.length-1];
        out.push({out:(first.dir?first.dir+"/":"")+partName(first.base,first.a,last.b),a:first.a,b:last.b,parts:run.map(function(r){return r.path;})});
      }else rest.push(run[0].path);
    }
    for(j=1;j<g.length;j++){
      if(g[j].a===run[run.length-1].b+1) run.push(g[j]); else { flush(); run=[g[j]]; }
    }
    flush();
  });
  out.sort(function(x,y){return x.out<y.out?-1:1;});
  return {groups:out,rest:rest};
}

async function merge(blobs,onStatus){
  var P=lib(), out=await P.PDFDocument.create(), i, src, pages, idx, k;
  for(i=0;i<blobs.length;i++){
    if(onStatus) onStatus("Joining "+(i+1)+" of "+blobs.length);
    await sleep0();
    src=await openPdf(blobs[i]); idx=[]; for(k=0;k<src.getPageCount();k++) idx.push(k);
    pages=await out.copyPages(src,idx); pages.forEach(function(p){out.addPage(p);});
  }
  return new Blob([await out.save({useObjectStreams:true})],{type:"application/pdf"});
}

/* "1-3, 5, 8-" -> [0,1,2,4,7,...] (zero-based page numbers); throws a readable error when the text can't be used */
function parseRanges(text,n){
  var out=[], seen=new Set(), parts=String(text||"").split(/[,;\s]+/).filter(Boolean), i, m, a, b, k;
  if(!parts.length) throw new Error("Enter the pages, for example 1-3, 5.");
  for(i=0;i<parts.length;i++){
    m=/^(\d*)(?:-(\d*))?$/.exec(parts[i]);
    if(!m||(m[1]===""&&m[2]===undefined)) throw new Error("“"+parts[i]+"” isn't a page or a range. Use numbers like 1-3, 5.");
    a=m[1]===""?1:+m[1]; b=m[2]===undefined?a:(m[2]===""?n:+m[2]);
    if(a<1||b<1||a>n||b>n) throw new Error("This PDF has "+n+" pages. “"+parts[i]+"” is outside that.");
    if(b<a) throw new Error("“"+parts[i]+"” goes backwards. Write it as "+b+"-"+a+".");
    for(k=a;k<=b;k++) if(!seen.has(k)){seen.add(k);out.push(k-1);}
  }
  return out;
}
async function pageCount(blob){ return (await openPdf(blob)).getPageCount(); }
async function extract(blob,idx){
  var src=await openPdf(blob), P=lib(), out=await P.PDFDocument.create(), pages=await out.copyPages(src,idx);
  pages.forEach(function(pg){out.addPage(pg);});
  return new Blob([await out.save({useObjectStreams:true})],{type:"application/pdf"});
}
async function rotate(blob,idx,deg){
  var src=await openPdf(blob), P=lib(), pages=src.getPages(), i;
  for(i=0;i<idx.length;i++){ var pg=pages[idx[i]]; pg.setRotation(P.degrees(((pg.getRotation().angle+deg)%360+360)%360)); }
  return new Blob([await src.save({useObjectStreams:true})],{type:"application/pdf"});
}
window.AtlasPdf={split:split,merge:merge,planMerge:planMerge,partName:partName,parsePart:parsePart,parseRanges:parseRanges,pageCount:pageCount,extract:extract,rotate:rotate};
})();
