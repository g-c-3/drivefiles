/* Atlas legacy Office converters (.xls -> .xlsx, .doc -> .docx, .ppt -> .pptx).
   Runs fully in the browser (or Node for tests). Needs globals: XLSX, JSZip, CFB, and AtlasPptxTemplate (base64). */
(function(root){
"use strict";
var G=root;
function u8(x){return x instanceof Uint8Array?x:Uint8Array.from(x);}
function u16(b,o){return b[o]|(b[o+1]<<8);}
function i16(b,o){var v=u16(b,o);return v>32767?v-65536:v;}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0;}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,"");}
function latin1(b,s,e){var out="",i;for(i=s;i<e;i++)out+=String.fromCharCode(b[i]);return out;}
function cp1252(b,s,e){
  var CP={128:8364,130:8218,131:402,132:8222,133:8230,134:8224,135:8225,136:710,137:8240,138:352,139:8249,140:338,142:381,145:8216,146:8217,147:8220,148:8221,149:8226,150:8211,151:8212,152:732,153:8482,154:353,155:8250,156:339,158:382,159:376};
  var out=[],i,c;for(i=s;i<e;i++){c=b[i];out.push(String.fromCharCode(CP[c]||c));}return out.join("");
}
function utf16(b,s,e){var out=[],i;for(i=s;i+1<e;i+=2)out.push(String.fromCharCode(b[i]|(b[i+1]<<8)));return out.join("");}
function stream(cfb,name){var f=G.CFB.find(cfb,name);return f&&f.content?u8(f.content):null;}
function baseName(n){var i=n.lastIndexOf(".");return i>0?n.slice(0,i):n;}
function sniff(b){
  if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47) return "png";
  if(b[0]===0xFF&&b[1]===0xD8) return "jpeg";
  return null;
}
function imgSize(b,kind){
  try{
    if(kind==="png") return {w:((b[16]<<24)|(b[17]<<16)|(b[18]<<8)|b[19])>>>0,h:((b[20]<<24)|(b[21]<<16)|(b[22]<<8)|b[23])>>>0};
    if(kind==="jpeg"){var o=2;while(o<b.length){if(b[o]!==0xFF){o++;continue;}var m=b[o+1];if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC)return {h:(b[o+5]<<8)|b[o+6],w:(b[o+7]<<8)|b[o+8]};o+=2+((b[o+2]<<8)|b[o+3]);}}
    if(kind==="bmp") return {w:u32(b,18),h:u32(b,22)};
  }catch(e){}
  return {w:400,h:300};
}

/* ================= Escher helpers ================= */
function escherRecords(b,s,e,out){
  var o=s;out=out||[];
  while(o+8<=e){
    var vi=u16(b,o),t=u16(b,o+2),l=u32(b,o+4),ver=vi&0xF,inst=vi>>4;
    var rec={ver:ver,inst:inst,type:t,len:l,start:o+8,end:Math.min(o+8+l,e)};
    out.push(rec);
    if(ver===0xF) rec.kids=escherRecords(b,rec.start,rec.end);
    o+=8+l;
  }
  return out;
}
/* returns {kind:"png"|"jpeg"|"bmp"|null,data:Uint8Array,type} for a BLIP record (rec header at o) */
function readBlip(b,o){
  if(o+8>b.length) return null;
  var vi=u16(b,o),t=u16(b,o+2),l=u32(b,o+4),inst=vi>>4,s=o+8,e=Math.min(o+8+l,b.length);
  if(t<0xF018||t>0xF117) return null;
  var uid=16+((inst&1)?16:0), kind=null, off;
  if(t===0xF01D||t===0xF02A){kind="jpeg";off=s+uid+1;}
  else if(t===0xF01E){kind="png";off=s+uid+1;}
  else if(t===0xF01F){kind="bmp";off=s+uid+1;}
  else return {kind:null,type:t};
  var d=b.subarray(off,e);
  if(kind==="bmp"){ /* DIB has no file header: add one */
    var hdr=new Uint8Array(14),sz=d.length+14;hdr[0]=0x42;hdr[1]=0x4D;hdr[2]=sz&255;hdr[3]=(sz>>8)&255;hdr[4]=(sz>>16)&255;hdr[5]=(sz>>24)&255;
    var bi=u32(d,0),off2=14+bi+(u16(d,14)<=8?(u32(d,32)||(1<<u16(d,14)))*4:0);hdr[10]=off2&255;hdr[11]=(off2>>8)&255;hdr[12]=(off2>>16)&255;hdr[13]=(off2>>24)&255;
    var all=new Uint8Array(sz);all.set(hdr,0);all.set(d,14);d=all;
  }
  return {kind:kind,data:d,type:t};
}
function findBlipsIn(b,s,e){ /* first blip found inside an embedded Escher region */
  var recs=escherRecords(b,s,e),res=null;
  (function walk(list){
    for(var i=0;i<list.length&&!res;i++){
      var r=list[i];
      if(r.type>=0xF018&&r.type<=0xF117){var bl=readBlip(b,r.start-8);if(bl&&bl.kind)res=bl;}
      else if(r.type===0xF007){ /* FBSE: embedded blip follows 36-byte header + name */
        var nameLen=b[r.start+33],p=r.start+36+nameLen;if(p+8<=r.end){var bl2=readBlip(b,p);if(bl2&&bl2.kind)res=bl2;}
      }
      else if(r.kids) walk(r.kids);
    }
  })(recs);
  return res;
}

/* ================= XLS -> XLSX ================= */
function xlsToXlsx(bytes,name){
  var X=G.XLSX, wb=X.read(u8(bytes),{type:"array",cellStyles:true,cellDates:true,cellNF:true});
  wb.SheetNames.forEach(function(n){ /* the .xls format lists 256 columns; keep only what is used */
    var ws=wb.Sheets[n];
    if(ws["!cols"]&&ws["!ref"]){var r=X.utils.decode_range(ws["!ref"]);ws["!cols"]=ws["!cols"].slice(0,Math.max(r.e.c+3,10));}
  });
  var out=X.write(wb,{bookType:"xlsx",type:"array",cellStyles:true});
  var notes=["Values, formulas, merged cells and basic formatting are kept. Charts, pictures and macros are not."];
  return G.JSZip.loadAsync(out).then(function(z){
    var jobs=[];
    z.forEach(function(path,f){
      if(/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) jobs.push(f.async("string").then(function(x){z.file(path,x.replace(/ level="\d+"/g,""));}));
    });
    return Promise.all(jobs).then(function(){return z.generateAsync({type:"uint8array",compression:"DEFLATE"});});
  }).then(function(bytes2){
    return {bytes:bytes2,ext:".xlsx",notes:notes,mime:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
  });
}

/* ================= DOC -> DOCX ================= */
function sprmIter(b,s,e,fn){
  var o=s;
  while(o+2<=e){
    var op=u16(b,o),spra=op>>13,len;o+=2;
    switch(spra){
      case 0:case 1:len=1;break;
      case 2:case 4:case 5:len=2;break;
      case 3:len=4;break;
      case 7:len=3;break;
      default: /* 6: variable */
        len=(op===0xD608)?u16(b,o)+1:b[o]+1;
    }
    if(o+len>e) break;
    fn(op,o,len);
    o+=len;
  }
}
function parseDoc(bytes){
  var cfb=G.CFB.read(u8(bytes),{type:"array"});
  var W=stream(cfb,"/WordDocument");
  if(!W||u16(W,0)!==0xA5EC) throw new Error("This isn't a Word 97 or later .doc file (very old Word 6/95 files aren't supported).");
  var flags=u16(W,0x0A);
  if(flags&0x0100) throw new Error("This Word file is password protected. Remove the password in Word first.");
  var T=stream(cfb,(flags&0x0200)?"/1Table":"/0Table");
  if(!T) throw new Error("The Word file is damaged (missing table stream).");
  var Data=stream(cfb,"/Data");
  var ccpText=u32(W,76);
  /* piece table */
  var fcClx=u32(W,0x1A2),lcbClx=u32(W,0x1A6),o=fcClx,plc=null;
  while(o<fcClx+lcbClx){
    var t=T[o];
    if(t===1){o+=3+u16(T,o+1);}
    else if(t===2){var lcb=u32(T,o+1);plc=T.subarray(o+5,o+5+lcb);break;}
    else break;
  }
  if(!plc) throw new Error("Couldn't read the text layout of this Word file.");
  var n=(plc.length-4)/12,pieces=[],i;
  for(i=0;i<n;i++){
    var fcRaw=u32(plc,4*(n+1)+8*i+2),comp=(fcRaw&0x40000000)!==0,fc=comp?((fcRaw&0x3FFFFFFF)>>>1):fcRaw;
    pieces.push({s:u32(plc,4*i),e:u32(plc,4*(i+1)),fc:fc,comp:comp});
  }
  var parts=[];
  pieces.forEach(function(p){
    var len=p.e-p.s;
    parts.push(p.comp?cp1252(W,p.fc,p.fc+len):utf16(W,p.fc,p.fc+len*2));
  });
  var text=parts.join("");
  var total=Math.min(ccpText,text.length);
  function fcToCps(fs,fe){ /* map file range to cp ranges */
    var res=[];
    pieces.forEach(function(p){
      var bpc=p.comp?1:2,pfs=p.fc,pfe=p.fc+(p.e-p.s)*bpc,a=Math.max(fs,pfs),b=Math.min(fe,pfe);
      if(a<b) res.push([p.s+Math.floor((a-pfs)/bpc),p.s+Math.floor((b-pfs)/bpc)]);
    });
    return res;
  }
  /* styles */
  var styles=[];
  (function(){
    var fc=u32(W,0xA2),lc=u32(W,0xA6);if(!lc)return;
    var cb=u16(T,fc),cstd=u16(T,fc+2),cbBase=u16(T,fc+4),p=fc+2+cb,k;
    for(k=0;k<cstd&&p+2<=fc+lc;k++){
      var cbStd=u16(T,p);p+=2;
      if(!cbStd){styles.push(null);continue;}
      var sti=u16(T,p)&0xFFF,stk=u16(T,p+2)&0xF,np=p+cbBase,cch=u16(T,np),nm=utf16(T,np+2,np+2+cch*2);
      styles.push({sti:sti,stk:stk,name:nm});p+=cbStd;
    }
  })();
  function styleId(istd){
    var s=styles[istd];if(!s) return null;
    var m=/^heading\s*([1-9])$/i.exec(s.name);if(m) return "Heading"+m[1];
    if(s.sti>=1&&s.sti<=9) return "Heading"+s.sti;
    if(/^title$/i.test(s.name)||s.sti===62) return "Title";
    if(/^subtitle$/i.test(s.name)||s.sti===74) return "Subtitle";
    if(/list\s*bullet/i.test(s.name)||s.sti===49) return "ListBullet";
    if(/list\s*number/i.test(s.name)||s.sti===50) return "ListNumber";
    return null;
  }
  /* character runs */
  var chRuns=[];
  (function(){
    var fc=u32(W,0xFA),lc=u32(W,0xFE);if(!lc)return;
    var cnt=(lc-4)/8,k;
    for(k=0;k<cnt;k++){
      var pn=u32(T,fc+4*(cnt+1)+4*k)&0x3FFFFF,base=pn*512;if(base+512>W.length)continue;
      var crun=W[base+511],r;
      for(r=0;r<crun;r++){
        var fs=u32(W,base+4*r),fe=u32(W,base+4*(r+1)),off=W[base+4*(crun+1)+r];
        var pr={};
        if(off){
          var p=base+off*2,cbc=W[p];
          sprmIter(W,p+1,p+1+cbc,function(op,po){
            switch(op){
              case 0x0835:pr.b=(W[po]&1)===1||(W[po]===0x81&&!pr.b);if(W[po]===0)pr.b=false;break;
              case 0x0836:pr.i=W[po]===1||W[po]===0x81;if(W[po]===0)pr.i=false;break;
              case 0x0837:pr.st=W[po]===1;break;
              case 0x2A3E:pr.u=W[po]!==0;break;
              case 0x4A43:pr.sz=u16(W,po);break;
              case 0x6A03:pr.pic=u32(W,po);break;
              case 0x0855:pr.spec=W[po]===1;break;
              case 0x0806:pr.data=W[po]===1;break;
              case 0x6870:pr.rgb=[W[po],W[po+1],W[po+2]];break;
              case 0x0875:pr.va=null;break;
              case 0x2A0C:pr.hl=W[po];break;
            }
          });
        }
        fcToCps(fs,fe).forEach(function(c){chRuns.push({s:c[0],e:c[1],p:pr});});
      }
    }
    chRuns.sort(function(a,b){return a.s-b.s;});
  })();
  /* paragraph runs */
  var paRuns=[];
  (function(){
    var fc=u32(W,0x102),lc=u32(W,0x106);if(!lc)return;
    var cnt=(lc-4)/8,k;
    for(k=0;k<cnt;k++){
      var pn=u32(T,fc+4*(cnt+1)+4*k)&0x3FFFFF,base=pn*512;if(base+512>W.length)continue;
      var crun=W[base+511],r;
      for(r=0;r<crun;r++){
        var fs=u32(W,base+4*r),fe=u32(W,base+4*(r+1)),bo=W[base+4*(crun+1)+13*r];
        var pr={istd:0};
        if(bo){
          var p=base+bo*2,cbp=W[p],start,end;
          if(cbp===0){cbp=W[p+1];start=p+2;end=start+cbp*2;}else{start=p+1;end=start+cbp*2-1;}
          pr.istd=u16(W,start);
          sprmIter(W,start+2,Math.min(end,W.length),function(op,po,len){
            switch(op){
              case 0x2416:pr.tbl=W[po]===1;break;
              case 0x2417:pr.ttp=W[po]===1;break;
              case 0x2461:case 0x2403:pr.jc=W[po];break;
              case 0x460B:pr.ilfo=u16(W,po);break;
              case 0x260A:pr.ilvl=W[po];break;
              case 0x845E:case 0x840F:pr.left=i16(W,po);break;
              case 0x8411:case 0x8412:break;
              case 0xD608:{var itc=W[po+2],ws=[],q;for(q=0;q<itc;q++)ws.push(i16(W,po+3+2*(q+1))-i16(W,po+3+2*q));pr.cols=ws;break;}
            }
          });
        }
        fcToCps(fs,fe).forEach(function(c){paRuns.push({s:c[0],e:c[1],p:pr});});
      }
    }
    paRuns.sort(function(a,b){return a.s-b.s;});
  })();
  function findRun(list,cp){
    var lo=0,hi=list.length-1;
    while(lo<=hi){var m=(lo+hi)>>1,r=list[m];if(cp<r.s)hi=m-1;else if(cp>=r.e)lo=m+1;else return r;}
    return null;
  }
  return {W:W,Data:Data,text:text,total:total,chRuns:chRuns,paRuns:paRuns,findRun:findRun,styleId:styleId,cfb:cfb,T:T};
}
function inlinePicture(d,off){
  if(!d||off+68>d.length) return null;
  var lcb=u32(d,off),cbHeader=u16(d,off+4);
  if(lcb<cbHeader||off+lcb>d.length+1) lcb=d.length-off;
  var mm=u16(d,off+6),dxa=u16(d,28+off),dya=u16(d,30+off),mx=u16(d,32+off),my=u16(d,34+off);
  var s=off+cbHeader;
  if(mm===0x66){s+=1+d[s];}
  var bl=findBlipsIn(d,s,Math.min(off+lcb,d.length));
  if(!bl||!bl.kind) return null;
  var w=dxa*mx/1000,h=dya*my/1000; /* twips */
  return {kind:bl.kind,data:bl.data,wTw:w,hTw:h};
}
function docToDocx(bytes,name){
  var D=parseDoc(bytes),text=D.text,total=D.total,notes=[],media=[],mediaMap={};
  var blocks=[],tbl=null,row=null,cell=null,skippedPics=0,usedPics=0;
  var fieldStack=[],cp=0;
  function addMedia(pic){
    var key=pic.kind+":"+pic.data.length+":"+pic.data[10]+":"+pic.data[pic.data.length>>1];
    if(mediaMap[key]) return mediaMap[key];
    var idx=media.length+1,rid="rIdImg"+idx;
    media.push({rid:rid,name:"image"+idx+"."+(pic.kind==="jpeg"?"jpg":pic.kind==="bmp"?"bmp":"png"),data:pic.data,kind:pic.kind});
    mediaMap[key]=rid;return rid;
  }
  var EMU=635; /* per twip */
  function imageXml(pic,rid,id){
    var sz=imgSize(pic.data,pic.kind),wTw=pic.wTw,hTw=pic.hTw;
    if(!wTw||!hTw||wTw<100||hTw<100){wTw=sz.w*15;hTw=sz.h*15;}
    var maxW=9000;if(wTw>maxW){hTw=hTw*maxW/wTw;wTw=maxW;}
    var cx=Math.round(wTw*EMU),cy=Math.round(hTw*EMU);
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="Picture '+id+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+id+'" name="Picture '+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  var imgId=0;
  function runXml(str,p){
    if(!str) return "";
    var rp="";
    if(p.b) rp+="<w:b/>"; if(p.i) rp+="<w:i/>"; if(p.st) rp+="<w:strike/>"; if(p.u) rp+='<w:u w:val="single"/>';
    if(p.rgb&&!(p.rgb[0]===0&&p.rgb[1]===0&&p.rgb[2]===0)&&!(p.rgb[0]===255&&p.rgb[1]===255&&p.rgb[2]===255)) rp+='<w:color w:val="'+[0,1,2].map(function(k){return ("0"+p.rgb[k].toString(16)).slice(-2);}).join("")+'"/>';
    if(p.sz&&p.sz>=2&&p.sz<=400) rp+='<w:sz w:val="'+p.sz+'"/><w:szCs w:val="'+p.sz+'"/>';
    var out="",segs=str.split(/(\t|\n|\f)/),k;
    for(k=0;k<segs.length;k++){
      var sg=segs[k];if(sg==="")continue;
      if(sg==="\t") out+="<w:r>"+(rp?"<w:rPr>"+rp+"</w:rPr>":"")+"<w:tab/></w:r>";
      else if(sg==="\n") out+="<w:r><w:br/></w:r>";
      else if(sg==="\f") out+='<w:r><w:br w:type="page"/></w:r>';
      else out+="<w:r>"+(rp?"<w:rPr>"+rp+"</w:rPr>":"")+'<w:t xml:space="preserve">'+esc(sg)+"</w:t></w:r>";
    }
    return out;
  }
  function paraXml(start,end,pr){
    /* build runs for chars [start,end) (end excludes the terminating mark) */
    var xml="",buf="",curProps=null,i,hidden=0;
    function flush(){if(buf&&curProps){xml+=runXml(buf,curProps);}buf="";}
    for(i=start;i<end;i++){
      var ch=text[i],cr=D.findRun(D.chRuns,i),p=cr?cr.p:{};
      if(ch==="\x13"){fieldStack.push(true);continue;}
      if(ch==="\x14"){if(fieldStack.length)fieldStack[fieldStack.length-1]=false;continue;}
      if(ch==="\x15"){fieldStack.pop();continue;}
      if(fieldStack.indexOf(true)>=0) continue;
      if(ch==="\x01"){
        if(p.pic!=null&&!p.data){
          flush();
          var pic=inlinePicture(D.Data,p.pic);
          if(pic){var rid=addMedia(pic);xml+=imageXml(pic,rid,++imgId);usedPics++;}else skippedPics++;
        }
        continue;
      }
      if(ch==="\x08"||ch==="\x02"||ch==="\x05"||ch==="\x1F"||ch==="\x07") continue;
      if(ch==="\x0B") ch="\n"; else if(ch==="\x0C") ch="\f"; else if(ch==="\x1E") ch="‑"; else if(ch==="\x09") ch="\t";
      else if(ch<" "&&ch!=="\n") continue;
      if(curProps===null||curProps!==p){flush();curProps=p;}
      buf+=ch;
    }
    flush();
    return xml;
  }
  function pPr(pr){
    var s="",sid=D.styleId(pr.istd||0);
    if(sid) s+='<w:pStyle w:val="'+sid+'"/>';
    else if(pr.ilfo) s+='<w:pStyle w:val="ListBullet"/>';
    if(pr.jc===1) s+='<w:jc w:val="center"/>';else if(pr.jc===2) s+='<w:jc w:val="right"/>';else if(pr.jc===3) s+='<w:jc w:val="both"/>';
    if(pr.left>0&&!pr.ilfo) s+='<w:ind w:left="'+pr.left+'"/>';
    return s?"<w:pPr>"+s+"</w:pPr>":"";
  }
  /* walk paragraphs */
  var start=0,i;
  for(i=0;i<total;i++){
    var ch=text[i];
    if(ch!=="\r"&&ch!=="\x07") continue;
    var pr=(D.findRun(D.paRuns,i)||{p:{istd:0}}).p;
    if(ch==="\x07"&&pr.ttp){ /* row end */
      if(!tbl) tbl={rows:[]};
      if(row){tbl.rows.push({cells:row,cols:pr.cols});}
      row=null;cell=null;start=i+1;continue;
    }
    var xml="<w:p>"+pPr(pr)+paraXml(start,i,pr)+"</w:p>";
    if(pr.tbl){
      if(!tbl) tbl={rows:[]};
      if(!row) row=[];
      if(!cell) cell=[];
      cell.push(xml);
      if(ch==="\x07"){row.push(cell);cell=null;}
    }else{
      if(tbl){blocks.push({tbl:tbl});tbl=null;row=null;cell=null;}
      blocks.push({p:xml});
    }
    start=i+1;
  }
  if(tbl){blocks.push({tbl:tbl});}
  /* floating pictures from the drawing group */
  var floating=[];
  try{
    var fcDgg=u32(D.W,0x22A),lcbDgg=u32(D.W,0x22E);
    if(lcbDgg>0){
      var recs=escherRecords(D.T,fcDgg,fcDgg+lcbDgg);
      (function walk(list){
        list.forEach(function(r){
          if(r.type===0xF001&&r.kids){
            r.kids.forEach(function(f){
              if(f.type!==0xF007) return;
              var nameLen=D.T[f.start+33],p=f.start+36+nameLen,bl=null;
              if(f.end-p>=8) bl=readBlip(D.T,p);
              if(!(bl&&bl.kind)){var fo=u32(D.T,f.start+28);if(fo>0&&fo<D.W.length) bl=readBlip(D.W,fo);}
              if(bl&&bl.kind) floating.push(bl);
            });
          } else if(r.kids) walk(r.kids);
        });
      })(recs);
    }
  }catch(e){}
  var floatXml="";
  if(floating.length){
    floatXml+='<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Pictures from this document (original positions could not be kept)</w:t></w:r></w:p>';
    floating.forEach(function(bl){
      var pic={kind:bl.kind,data:bl.data,wTw:0,hTw:0},rid=addMedia(pic);
      floatXml+="<w:p>"+imageXml(pic,rid,++imgId)+"</w:p>";
    });
    notes.push(plural(floating.length,"picture")+" couldn't be placed where it was, so "+(floating.length===1?"it is":"they are")+" listed at the end.");
  }
  if(skippedPics) notes.push(plural(skippedPics,"picture")+" in an unsupported format (such as EMF/WMF) "+(skippedPics===1?"was":"were")+" left out.");
  /* assemble body */
  var body="";
  blocks.forEach(function(b){
    if(b.p){body+=b.p;return;}
    var t=b.tbl,ncol=0;t.rows.forEach(function(r){ncol=Math.max(ncol,r.cells.length);});
    var widths=null;t.rows.forEach(function(r){if(!widths&&r.cols&&r.cols.length===r.cells.length)widths=r.cols;});
    if(!widths||widths.length<ncol){widths=[];for(var q=0;q<ncol;q++)widths.push(Math.floor(9000/ncol));}
    var x='<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'+widths.map(function(w){return '<w:gridCol w:w="'+Math.max(w,200)+'"/>';}).join("")+"</w:tblGrid>";
    t.rows.forEach(function(r){
      x+="<w:tr>";
      r.cells.forEach(function(c,ci){x+='<w:tc><w:tcPr><w:tcW w:w="'+Math.max(widths[ci]||1000,200)+'" w:type="dxa"/></w:tcPr>'+(c.join("")||"<w:p/>")+"</w:tc>";});
      x+="</w:tr>";
    });
    body+=x+"</w:tbl><w:p/>";
  });
  body+=floatXml;
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  var docXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var zip=new G.JSZip();
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="bmp" ContentType="image/bmp"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>');
  zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
  media.forEach(function(m){rels+='<Relationship Id="'+m.rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+m.name+'"/>';zip.file("word/media/"+m.name,m.data);});
  zip.file("word/_rels/document.xml.rels",rels+"</Relationships>");
  zip.file("word/document.xml",docXml);
  zip.file("word/styles.xml",STYLES_XML);
  zip.file("word/numbering.xml",NUMBERING_XML);
  notes.unshift("Text, headings, tables, bold/italic/underline, alignment and inline pictures are kept. Page layout, headers, footers, footnotes and list numbering styles are simplified.");
  return zip.generateAsync({type:"uint8array",compression:"DEFLATE"}).then(function(out){
    return {bytes:out,ext:".docx",notes:notes,mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"};
  });
}
function plural(n,w){return n+" "+w+(n===1?"":"s");}
var STYLES_XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
 +[1,2,3,4,5,6,7,8,9].map(function(n){var sz=[32,26,24,22,22,22,22,22,22][n-1];return '<w:style w:type="paragraph" w:styleId="Heading'+n+'"><w:name w:val="heading '+n+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="'+(n-1)+'"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/></w:rPr></w:style>';}).join("")
 +'<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="595959"/><w:sz w:val="28"/></w:rPr></w:style>'
 +'<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="2"/></w:numPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style>'
 +'<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr></w:style></w:styles>';
var NUMBERING_XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>';

/* ================= PPT -> PPTX ================= */
function parsePpt(bytes){
  var cfb=G.CFB.read(u8(bytes),{type:"array"});
  var P=stream(cfb,"/PowerPoint Document"),CU=stream(cfb,"/Current User"),Pics=stream(cfb,"/Pictures");
  if(!P||!CU) throw new Error("This isn't a PowerPoint 97 or later .ppt file.");
  var persist={},cur=u32(CU,16),guard=0;
  while(cur&&cur+32<=P.length&&guard++<200){
    var offLast=u32(P,cur+16),offDir=u32(P,cur+20),docId=u32(P,cur+24);
    if(!persist._doc) persist._doc=docId;
    var o=offDir+8,end=offDir+8+u32(P,offDir+4);
    while(o+4<=end){var w=u32(P,o),id=w&0xFFFFF,cnt=w>>>20;o+=4;for(var k=0;k<cnt;k++){if(persist[id+k]==null)persist[id+k]=u32(P,o);o+=4;}}
    if(!offLast||offLast===cur) break;
    cur=offLast;
  }
  var docOff=persist[persist._doc];
  if(docOff==null) throw new Error("Couldn't find the slides in this PowerPoint file.");
  var doc={rec:null};
  function rec(o){var vi=u16(P,o),l=u32(P,o+4);return {ver:vi&0xF,inst:vi>>4,type:u16(P,o+2),len:l,start:o+8,end:o+8+l};}
  var docRec=rec(docOff),kids=escherRecords(P,docRec.start,docRec.end);
  var slideSize={x:5760,y:4320},slides=[],blips=[];
  kids.forEach(function(r){
    if(r.type===0x3E9){slideSize={x:u32(P,r.start),y:u32(P,r.start+4)};}
    else if(r.type===0xFF0&&r.inst===0&&r.kids){
      var curS=null,curText=null;
      r.kids.forEach(function(a){
        if(a.type===0x3F3){curS={persist:u32(P,a.start),texts:[]};slides.push(curS);}
        else if(a.type===0xF9F&&curS){curText={type:u32(P,a.start),text:""};curS.texts.push(curText);}
        else if(a.type===0xFA0&&curText){curText.text=utf16(P,a.start,a.end);}
        else if(a.type===0xFA8&&curText){curText.text=cp1252(P,a.start,a.end);}
      });
    }
    else if(r.type===0x40B&&r.kids){ /* drawing group -> blip store */
      (function walk(list){list.forEach(function(x){
        if(x.type===0xF001&&x.kids){x.kids.forEach(function(f){
          if(f.type!==0xF007){return;}
          var fo=u32(P,f.start+28),nameLen=P[f.start+33],bl=null;
          if(f.end-(f.start+36+nameLen)>=8) bl=readBlip(P,f.start+36+nameLen);
          if(!(bl&&bl.kind)&&Pics&&fo<Pics.length) bl=readBlip(Pics,fo);
          blips.push(bl&&bl.kind?bl:{kind:null});
        });}
        else if(x.kids) walk(x.kids);
      });})(r.kids);
    }
  });
  /* slide shapes */
  slides.forEach(function(s){
    s.shapes=[];s.skipped=0;
    var off=persist[s.persist];if(off==null) return;
    var sr=rec(off),sk=escherRecords(P,sr.start,sr.end);
    sk.forEach(function(r){
      if(r.type!==0x40C||!r.kids) return;
      (function walk(list){
        list.forEach(function(x){
          if(x.type===0xF004&&x.kids){
            var sh={x:null,y:null,w:null,h:null,props:{},text:null,type:null,ref:null,ph:null};
            x.kids.forEach(function(c){
              if(c.type===0xF00B){var n=c.inst,po=c.start,q;for(q=0;q<n;q++){var id=u16(P,po+6*q)&0x3FFF;sh.props[id]=u32(P,po+6*q+2);}}
              else if(c.type===0xF010){
                if(c.len>=16){sh.y=u32(P,c.start)|0;sh.x=u32(P,c.start+4)|0;sh.w=(u32(P,c.start+8)|0)-sh.x;sh.h=(u32(P,c.start+12)|0)-sh.y;}
                else if(c.len>=8){sh.y=i16(P,c.start);sh.x=i16(P,c.start+2);sh.w=i16(P,c.start+4)-sh.x;sh.h=i16(P,c.start+6)-sh.y;}
              }
              else if(c.type===0xF00F&&c.len>=16){sh.x=u32(P,c.start)|0;sh.y=u32(P,c.start+4)|0;sh.w=(u32(P,c.start+8)|0)-sh.x;sh.h=(u32(P,c.start+12)|0)-sh.y;}
              else if(c.type===0xF011&&c.kids){c.kids.forEach(function(a){if(a.type===0xF9E)sh.ref=u32(P,a.start);if(a.type===0xBC3)sh.ph=P[a.start+4];});}
              else if(c.type===0xF00D&&c.kids){
                var t=null;
                c.kids.forEach(function(a){
                  if(a.type===0xF9F){t={type:u32(P,a.start),text:""};sh.text=t;}
                  else if(a.type===0xFA0){if(!t){t={type:3,text:""};sh.text=t;}t.text=utf16(P,a.start,a.end);}
                  else if(a.type===0xFA8){if(!t){t={type:3,text:""};sh.text=t;}t.text=cp1252(P,a.start,a.end);}
                });
              }
            });
            if(sh.props[0x0104]) sh.pib=sh.props[0x0104];
            if(sh.pib||sh.text||sh.ref!=null) s.shapes.push(sh);
          }
          if(x.kids&&x.type!==0xF004) walk(x.kids);
        });
      })(r.kids);
    });
  });
  return {slides:slides,size:slideSize,blips:blips};
}
function pptToPptx(bytes,name){
  var M=parsePpt(bytes),notes=[],G2=G,EMU=914400/576;
  var cx=Math.round(M.size.x*EMU),cy=Math.round(M.size.y*EMU);
  var tpl=G.AtlasPptxTemplate;
  if(!tpl) throw new Error("The PowerPoint writer isn't loaded.");
  return G.JSZip.loadAsync(tpl,{base64:true}).then(function(zip){
    var skipped=0,used=0,textShapes=0;
    var ct=null,presRels=null,pres=null;
    return Promise.all([zip.file("[Content_Types].xml").async("string"),zip.file("ppt/_rels/presentation.xml.rels").async("string"),zip.file("ppt/presentation.xml").async("string")]).then(function(r){
      ct=r[0];presRels=r[1];pres=r[2];
      var sldIds="",relAdd="",ctAdd="",mediaExt={};
      var mediaIdx=0,mediaCache={};
      M.slides.forEach(function(s,si){
        var n=si+1,shapes="",rels='<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout7.xml"/>',rc=1,id=2;
        var titleDone=false,bodyDone=false;
        s.shapes.forEach(function(sh){
          var x=sh.x,y=sh.y,w=sh.w,h=sh.h;
          var hasPos=x!=null&&w>0&&h>0;
          if(sh.pib){
            var bl=M.blips[sh.pib-1];
            if(!bl||!bl.kind){skipped++;return;}
            var key=bl.kind+":"+bl.data.length+":"+bl.data[12];
            var mname=mediaCache[key];
            if(!mname){mediaIdx++;var ext=bl.kind==="jpeg"?"jpg":bl.kind==="bmp"?"bmp":"png";mname="image"+mediaIdx+"."+ext;mediaCache[key]=mname;zip.file("ppt/media/"+mname,bl.data);mediaExt[ext]=bl.kind;}
            rc++;rels+='<Relationship Id="rId'+rc+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/'+mname+'"/>';
            if(!hasPos){var sz=imgSize(bl.data,bl.kind),sc=Math.min(M.size.x*0.8/sz.w,M.size.y*0.7/sz.h);w=sz.w*sc;h=sz.h*sc;x=(M.size.x-w)/2;y=(M.size.y-h)/2;}
            shapes+='<p:pic><p:nvPicPr><p:cNvPr id="'+(id++)+'" name="Picture '+id+'"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId'+rc+'"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="'+Math.round(x*EMU)+'" y="'+Math.round(y*EMU)+'"/><a:ext cx="'+Math.round(w*EMU)+'" cy="'+Math.round(h*EMU)+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
            used++;return;
          }
          var t=sh.text;
          if(!t&&sh.ref!=null) t=s.texts[sh.ref]||null;
          if(!t||!String(t.text).replace(/[\r\n\s]/g,"")) return;
          var type=t.type,isTitle=(type===0||type===5),isBody=(type===1||type===4||type===6||type===7);
          if(!hasPos){
            if(isTitle){x=480;y=200;w=M.size.x-960;h=900;}
            else {x=480;y=1250;w=M.size.x-960;h=M.size.y-1650;}
          }
          var sz=isTitle?3200:(isBody?2200:1800),paras=String(t.text).split(/\r|\x0b/).filter(function(q,qi,arr){return !(q===""&&qi===arr.length-1);});
          var px=paras.map(function(p){
            var rpr='<a:rPr lang="en-US" sz="'+sz+'"'+(isTitle?' b="1"':"")+' dirty="0"/>';
            var ppr=(isBody&&(sh.ph!=null||sh.ref!=null))?'<a:pPr marL="342900" indent="-342900"><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/></a:pPr>':(isTitle?'<a:pPr algn="l"/>':"");
            return '<a:p>'+ppr+(p?'<a:r>'+rpr+'<a:t>'+esc(p)+'</a:t></a:r>':"<a:endParaRPr lang=\"en-US\" sz=\""+sz+"\"/>")+'</a:p>';
          }).join("");
          shapes+='<p:sp><p:nvSpPr><p:cNvPr id="'+(id++)+'" name="Text '+id+'"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="'+Math.round(x*EMU)+'" y="'+Math.round(y*EMU)+'"/><a:ext cx="'+Math.round(w*EMU)+'" cy="'+Math.round(h*EMU)+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>'+px+'</p:txBody></p:sp>';
          textShapes++;
        });
        var slideXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'+shapes+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
        zip.file("ppt/slides/slide"+n+".xml",slideXml);
        zip.file("ppt/slides/_rels/slide"+n+".xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels+'</Relationships>');
        sldIds+='<p:sldId id="'+(256+si)+'" r:id="rIdS'+n+'"/>';
        relAdd+='<Relationship Id="rIdS'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+n+'.xml"/>';
        ctAdd+='<Override PartName="/ppt/slides/slide'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
      });
      var defs="";Object.keys(mediaExt).forEach(function(e){if(ct.indexOf('Extension="'+e+'"')<0)defs+='<Default Extension="'+e+'" ContentType="image/'+(e==="jpg"?"jpeg":e)+'"/>';});
      ct=ct.replace("</Types>",defs+ctAdd+"</Types>");
      presRels=presRels.replace("</Relationships>",relAdd+"</Relationships>");
      pres=pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>|<p:sldIdLst\/>/,"");
      pres=pres.replace("</p:sldMasterIdLst>","</p:sldMasterIdLst><p:sldIdLst>"+sldIds+"</p:sldIdLst>");
      pres=pres.replace(/<p:sldSz[^>]*\/>/,'<p:sldSz cx="'+cx+'" cy="'+cy+'"/>');
      zip.file("[Content_Types].xml",ct);zip.file("ppt/_rels/presentation.xml.rels",presRels);zip.file("ppt/presentation.xml",pres);
      notes.unshift("Slide text and pictures are kept with their positions. Fonts, colours, backgrounds, animations, charts and shapes are simplified.");
      if(skipped) notes.push(plural(skipped,"picture")+" in an unsupported format (such as EMF/WMF) "+(skipped===1?"was":"were")+" left out.");
      if(!M.slides.length) notes.push("No slides were found in this file.");
      return zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
    }).then(function(out){
      return {bytes:out,ext:".pptx",notes:notes,mime:"application/vnd.openxmlformats-officedocument.presentationml.presentation",slides:M.slides.length};
    });
  });
}

/* ================= public API ================= */
var MAP={xls:["xlsx",xlsToXlsx],doc:["docx",docToDocx],ppt:["pptx",pptToPptx]};
function extOf(n){var i=n.lastIndexOf(".");return i<0?"":n.slice(i+1).toLowerCase();}
function can(name){return !!MAP[extOf(name)];}
function convert(name,bytes){
  var m=MAP[extOf(name)];
  if(!m) return Promise.reject(new Error("This file type can't be converted."));
  return Promise.resolve().then(function(){return m[1](bytes,name);}).then(function(r){r.name=baseName(name)+r.ext;return r;});
}
G.AtlasConvert={can:can,convert:convert,target:function(name){var m=MAP[extOf(name)];return m?m[0]:null;},_parseDoc:parseDoc,_parsePpt:parsePpt};
if(typeof module!=="undefined"&&module.exports) module.exports=G.AtlasConvert;
})(typeof globalThis!=="undefined"?globalThis:(typeof self!=="undefined"?self:this));
