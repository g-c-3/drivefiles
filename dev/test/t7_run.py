import os
import io, os, random, time
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
from PIL import Image, ImageFilter
import pypdf, numpy as np
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def sheet_click(page,label):
    l=page.locator(".layer.open .foot .btn",has_text=label); l.last.click()
def photo(w,h,seed):
    rng=np.random.default_rng(seed); y,x=np.mgrid[0:h,0:w]
    base=(np.sin(x/190.0+seed)*60+np.cos(y/230.0)*60+128)
    a=np.stack([base,base*0.8+30,255-base*0.7],axis=2)+rng.normal(0,14,(h,w,3))
    return Image.fromarray(np.clip(a,0,255).astype("uint8"),"RGB")
def mkscan(n,w,h):
    ims=[photo(w,h,i) for i in range(n)]; bio=io.BytesIO(); ims[0].save(bio,"PDF",save_all=True,append_images=ims[1:],quality=92); return bio.getvalue()
A=mkscan(4,2200,3000)      # fits after compression
B=mkscan(8,2200,3000)      # needs split even after compression
print("sizes",len(A)/1e6,len(B)/1e6)
open(BASE+"/scanA.pdf","wb").write(A); open(BASE+"/scanB.pdf","wb").write(B)
snaps["t0"]["Docs/scanA.pdf"]={"sha":add_blob(A),"mode":"100644","size":len(A)}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1100,"height":850},accept_downloads=True)
    page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    URL=f"http://127.0.0.1:{port}/index.html"
    page.goto(URL); page.evaluate("localStorage.setItem('a_prefs',JSON.stringify({limit:3,compressPdf:true,compressLevel:'strong'}))"); page.reload(); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row")
    # -- add a PDF that is over the limit but compresses to under it
    page.set_input_files("#inFiles",[BASE+"/scanA.pdf"]); page.wait_for_selector(".layer.open .foot")
    check("compress" in page.inner_text(".layer.open").lower(),"Add files shows the compress switch")
    sheet_click(page,"Upload")
    t0=time.time()
    while "scanA.pdf" not in paths() and time.time()-t0<120: page.wait_for_timeout(400)
    page.wait_for_selector(".layer.open",state="detached",timeout=60000); ps=[x for x in paths() if x=="scanA.pdf"]
    check(len(ps)==1,"compressed PDF saved as one file: %s"%ps)
    if ps:
        data=blob_data[cur()[ps[0]]["sha"]]; r=pypdf.PdfReader(io.BytesIO(data))
        check(len(data)<=2.95e6 and len(r.pages)==4,"smaller than the limit (%.2f MB) with all 4 pages"%(len(data)/1e6))
    page.wait_for_timeout(1500)
    # -- too big even compressed: falls back to split
    page.set_input_files("#inFiles",[BASE+"/scanB.pdf"]); page.wait_for_selector(".layer.open .foot")
    page.locator(".layer.open button",has_text="Light").first.click(); page.wait_for_timeout(200)
    sheet_click(page,"Upload"); t0=time.time()
    while not any("scanB pages" in x for x in paths()) and time.time()-t0<180: page.wait_for_timeout(500)
    page.wait_for_selector(".layer.open",state="detached",timeout=120000); parts=[x for x in paths() if "scanB pages" in x]
    check(len(parts)>=2 and all(len(blob_data[cur()[x]["sha"]])<=2.95e6 for x in parts),"still-too-big PDF is split after compressing (%d parts)"%len(parts))
    page.wait_for_timeout(1500)
    # -- standalone tool
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(500)
    page.locator("#libList .row",has_text="scanA.pdf").first.locator("input[type=checkbox]").check(); page.click("#actMore")
    page.locator(".layer.open .row",has_text="Compress PDF").click(); page.wait_for_selector(".layer.open .foot")
    page.locator(".layer.open button",has_text="Strong").first.click(); sheet_click(page,"Compress and save"); t0=time.time()
    while "Docs/scanA compressed.pdf" not in paths() and time.time()-t0<120: page.wait_for_timeout(500)
    check("Docs/scanA compressed.pdf" in paths() and len(blob_data[cur()["Docs/scanA compressed.pdf"]["sha"]])<len(A)*0.6,"standalone Compress PDF saves a smaller copy")
    # -- flate (PNG) pictures, called directly
    res=page.evaluate("""async()=>{
      await new Promise((r,j)=>{var s=document.createElement('script');s.src='app/vendor/pdflib.js';s.onload=r;s.onerror=j;document.head.appendChild(s);});
      await new Promise((r,j)=>{var s=document.createElement('script');s.src='app/pdftools.js';s.onload=r;s.onerror=j;document.head.appendChild(s);});
      var P=window.PDFLib, doc=await P.PDFDocument.create();
      for(var k=0;k<2;k++){
        var cv=document.createElement('canvas');cv.width=1600;cv.height=1200;var cx=cv.getContext('2d');var d=cx.createImageData(1600,1200);
        for(var i=0;i<d.data.length;i+=4){var v=(Math.sin(i/9000)*70+128)+(Math.random()*40);d.data[i]=v;d.data[i+1]=v*.8;d.data[i+2]=255-v*.6;d.data[i+3]=255;}
        cx.putImageData(d,0,0); var png=await new Promise(r=>cv.toBlob(r,'image/png')); var img=await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
        var pg=doc.addPage([600,450]); pg.drawImage(img,{x:0,y:0,width:600,height:450});
      }
      var bl=new Blob([await doc.save()],{type:'application/pdf'});
      var r=await window.AtlasPdf.compress(bl,'medium',{});
      var n=(await P.PDFDocument.load(new Uint8Array(await r.blob.arrayBuffer()))).getPageCount();
      return {before:bl.size,after:r.blob.size,changed:r.changed,pages:n};
    }""")
    check(res["changed"]>=1 and res["after"]<res["before"]*0.6 and res["pages"]==2,"plain PNG-style pictures are recompressed too: %s"%res)
    errors=[e for e in errors if "sandboxed" not in e]
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("\nFAILS:",fails)
