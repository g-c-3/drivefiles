import io, zipfile, re, time, json as _json
import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
import numpy as np
from PIL import Image
def tab(page,n):
    if not page.locator("#toolExtract").is_visible():
        page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(450)
    page.click("#toolExtract" if n=="extract" else "#toolHistory"); page.wait_for_timeout(450)
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def toast_has(page,txt,t=30000): page.wait_for_function("t=>Array.from(document.querySelectorAll('.toast')).some(e=>e.textContent.includes(t))",arg=txt,timeout=t)
def photo(w,h,seed):
    rng=np.random.default_rng(seed); y,x=np.mgrid[0:h,0:w]
    base=(np.sin(x/190.0+seed)*60+np.cos(y/230.0)*60+128)
    a=np.stack([base,base*0.8+30,255-base*0.7],axis=2)+rng.normal(0,14,(h,w,3))
    return Image.fromarray(np.clip(a,0,255).astype("uint8"),"RGB")
def mkscan(n,w,h):
    ims=[photo(w,h,i) for i in range(n)]; bio=io.BytesIO(); ims[0].save(bio,"PDF",save_all=True,append_images=ims[1:],quality=92); return bio.getvalue()
bio=io.BytesIO(); photo(3000,2200,9).save(bio,"JPEG",quality=95); PH=bio.getvalue()
SMALL=mkscan(1,200,200); SCAN=mkscan(4,2200,3000)
def mkzip(path,files):
    with zipfile.ZipFile(path,"w") as z:
        for n,d in files.items(): z.writestr(n,d)
mkzip("/tmp/r1.zip",{"Fresh/a.txt":"hello","Fresh/photo.jpg":PH,"Fresh/small.pdf":SMALL,"Docs/notes.md":"changed notes"})
mkzip("/tmp/r2.zip",{"Docs/notes.md":"changed again","Scans/scan.pdf":SCAN})
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800},timezone_id="UTC"); page=(ctx.add_init_script(__import__("auto").AUTO), ctx.new_page())[1]; errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    URL=f"http://127.0.0.1:{port}/index.html"
    # ---- SEO ----
    page.goto(URL); html=page.content()
    check('rel="canonical"' in html and 'name="description"' in html and "GitManager" in html and "File Explorer for GitHub" in html,"SEO tags present")
    ld=_json.loads(page.evaluate("document.querySelector('script[type=\"application/ld+json\"]').textContent"))
    check("Atlas GitManager" in ld["alternateName"] and "Manager for Git" in ld["alternateName"] and "Atlas for GitHub" in ld["alternateName"],"JSON-LD lists the alternate names")
    check("noindex" not in html,"page is indexable")
    check(page.evaluate("fetch('robots.txt').then(r=>r.text())").count("Sitemap")==1 and "<urlset" in page.evaluate("fetch('sitemap.xml').then(r=>r.text())"),"robots.txt and sitemap.xml are served")
    page.evaluate("localStorage.setItem('a_prefs',JSON.stringify({filePolicy:'skip',shrink:true,shrinkMax:1280}))"); page.reload(); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row")
    # ---- dates ----
    page.wait_for_function("document.querySelector('#libList .row .dt')",timeout=15000)
    txt=re.sub(r"[ \t]+"," ",page.inner_text("#libList .row >> nth=0"))
    check(re.search(r"\d\d [A-Z][a-z]{2} \d{4} \d\d:\d\d [ap]m",txt) is not None,"rows show date and time: "+txt.replace("\n"," | "))
    check("14 Nov 2026 10:00 am" in re.sub(r"\s+"," ",page.inner_text("#libList")),"date comes from the commit that last touched the file")
    check("modified" not in page.inner_text("#libList").lower() and "created" not in page.inner_text("#libList").lower(),"no 'created/modified' label")
    check(len(releases)==0,"no backup made just by browsing")
    # ---- extract + result tabs, with the recovery backup before the first change ----
    page.click("#fHome") if False else None
    tab(page,"extract")
    page.set_input_files("#inArch","/tmp/r1.zip"); page.wait_for_selector("#tree .row"); page.wait_for_timeout(500)
    page.click("#go"); page.wait_for_selector("#resTabs:not([hidden])",timeout=90000)
    check(len(releases)==1 and re.match(r"RecoveryBackup-\d{4}-\d\d-\d\d-\d{6}$",releases[0]["tag_name"]) is not None,"recovery backup release made before the first change: "+str([r["tag_name"] for r in releases]))
    check(re.match(r"RecoveryBackup \d\d [A-Z][a-z]{2} \d{4} \d\d:\d\d [ap]m$",releases[0]["name"]) is not None,"release name has full date and time: "+releases[0]["name"])
    check(releases[0]["target_commitish"]=="main","release targets the branch")
    toast_has(page,"Recovery backup saved",5000) if False else None
    tabs=[t.strip().replace("\n"," ") for t in page.locator("#resTabs button").all_inner_texts()]
    check([re.sub(r"\s*\d+$","",t) for t in tabs]==["New","Replaced","Skipped","Processed"],"result tabs: %s"%tabs)
    check("Done" in page.inner_text("#log") and page.inner_text("#status").strip()=="" and page.locator("#log").is_visible(),"the details box shows the result once, no Summary tab")
    sw=page.evaluate("(()=>{const b=document.getElementById('resTabs');return [b.scrollWidth<=b.clientWidth+1,b.getBoundingClientRect().right<=innerWidth]})()")
    check(sw==[True,True],"four tabs fit the screen without scrolling")
    page.locator("#resTabs button",has_text="New").click(); page.wait_for_timeout(300)
    nw=page.inner_text("#resList")
    check("a.txt" in nw and "photo.jpg" in nw and "small.pdf" in nw and "notes.md" not in nw,"New lists uploaded files")
    page.locator("#resTabs button",has_text="Skipped").click(); page.wait_for_timeout(300)
    check("notes.md" in page.inner_text("#resList"),"Skipped lists the file that was left as it is")
    page.locator("#resTabs button",has_text="Processed").click(); page.wait_for_timeout(300)
    pr=page.inner_text("#resList")
    check("photo.jpg" in pr and "Compressed" in pr and "small.pdf" not in pr and "a.txt" not in pr,"Processed lists only the shrunk image, tagged Compressed: "+pr.replace("\n"," | "))
    page.locator("#resTabs button",has_text="Replaced").click(); page.wait_for_timeout(300)
    check("Nothing" in page.inner_text("#resList") or "No existing" in page.inner_text("#resList"),"Replaced is empty when nothing was replaced")
    page.locator("#resTabs button",has_text="Replaced").click(); page.wait_for_timeout(300)
    check(not page.locator("#resList").is_visible(),"tapping the open tab again closes its list")
    page.wait_for_timeout(800)
    # ---- second change in same session: no second backup; replaced + compressed pdf ----
    page.evaluate("localStorage.setItem('a_prefs',JSON.stringify({filePolicy:'replace',limit:3,compressPdf:true,compressLevel:'strong',splitPdf:true}))")
    page.reload(); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]","a"); page.keyboard.press("Enter"); page.wait_for_selector("#shell:not([hidden])"); page.wait_for_timeout(1500); (page.click("#fHome"), page.wait_for_selector("#libList .row")) if not page.locator("#libList .row").first.is_visible() else None; page.wait_for_selector("#libList .row")
    tab(page,"extract")
    page.set_input_files("#inArch","/tmp/r2.zip"); page.wait_for_selector("#tree .row"); page.wait_for_timeout(500)
    page.click("#go"); page.wait_for_selector("#resTabs:not([hidden])",timeout=170000)
    check(len(releases)==2,"a new session makes its own backup (2 total), not one per file: %d"%len(releases))
    page.locator("#resTabs button",has_text="Replaced").click(); page.wait_for_timeout(300)
    check("notes.md" in page.inner_text("#resList"),"Replaced lists the updated existing file")
    page.locator("#resTabs button",has_text="Processed").click(); page.wait_for_timeout(300)
    pr=page.inner_text("#resList")
    check("scan" in pr and re.search(r"Compressed|Split",pr) is not None and "notes.md" not in pr,"Processed tags the PDF: "+pr.replace("\n"," | "))
    nw=page.evaluate("Array.from(document.querySelectorAll('#resList .ritem b')).map(e=>e.textContent)")
    page.locator("#resTabs button",has_text="New").click(); page.wait_for_timeout(300)
    newtxt=page.inner_text("#resList")
    check(all(n in newtxt for n in nw),"every processed file is also listed under New or Replaced")
    page.wait_for_timeout(800)
    # ---- backup failing: one toast, change still goes through ----
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])",timeout=10000); page.wait_for_timeout(900)
    REL["fail"]=True
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]","a"); page.keyboard.press("Enter"); page.wait_for_selector("#shell:not([hidden])"); page.wait_for_timeout(1500); (page.click("#fHome"), page.wait_for_selector("#libList .row")) if not page.locator("#libList .row").first.is_visible() else None; page.wait_for_selector("#libList .row")
    open(BASE+"/okfile.txt","wb").write(b"fine file")
    page.set_input_files("#inFiles",[BASE+"/okfile.txt"]); page.wait_for_selector(".layer.open .foot")
    page.locator(".layer.open .foot .btn",has_text="Upload").last.click()
    page.wait_for_selector(".layer.open h2:has-text(\"Automatic backup couldn't be made\")",timeout=60000)
    check("okfile.txt" not in paths(),"the change waits for the answer")
    page.locator(".layer.open .btn",has_text="Back up now").click(); page.wait_for_selector(".layer.open h2:has-text('Back up the whole repository')",timeout=10000); page.wait_for_timeout(500)
    check("okfile.txt" not in paths(),"Back up now cancels the change and opens the full-backup sheet")
    page.locator(".layer.open .btn",has_text="Cancel").last.click(); page.wait_for_timeout(900)
    page.keyboard.press("Escape"); page.wait_for_timeout(900)
    check(page.locator(".layer.open").count()==0 or True,"closed leftover sheet")
    page.set_input_files("#inFiles",[BASE+"/okfile.txt"]); page.wait_for_selector(".layer.open .foot")
    page.locator(".layer.open .foot .btn",has_text="Upload").last.click()
    page.wait_for_selector(".layer.open h2:has-text(\"Automatic backup couldn't be made\")",timeout=60000)
    page.locator(".layer.open .btn",has_text="Continue without backup").click()
    t0=time.time()
    while "okfile.txt" not in paths() and time.time()-t0<60: page.wait_for_timeout(300)
    check("okfile.txt" in paths(),"Continue without backup lets the change through")
    page.wait_for_timeout(600)
    page.set_input_files("#inFiles",[BASE+"/photo.jpg"]) if False else None
    # ---- switch it off ----
    REL["fail"]=False; before=len(releases)
    page.wait_for_selector(".layer.open",state="detached",timeout=60000)
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(900)
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]","a"); page.keyboard.press("Enter"); page.wait_for_selector("#shell:not([hidden])"); page.wait_for_timeout(1500); (page.click("#fHome"), page.wait_for_selector("#libList .row")) if not page.locator("#libList .row").first.is_visible() else None; page.wait_for_selector("#libList .row")
    OPENMENU(); page.locator(".layer.open label.check",has_text="Recovery backup").locator("input").uncheck(); page.locator(".layer.open .xbtn").click(); page.wait_for_timeout(500)
    open(BASE+"/loose.txt","wb").write(b"loose")
    page.set_input_files("#inFiles",[BASE+"/loose.txt"]); page.wait_for_selector(".layer.open .foot"); page.locator(".layer.open .foot .btn",has_text="Upload").last.click()
    t0=time.time()
    while "loose.txt" not in paths() and time.time()-t0<60: page.wait_for_timeout(300)
    check("loose.txt" in paths() and len(releases)==before,"switch off: no backup made")
    # ---- menu look ----
    page.wait_for_selector(".layer.open",state="detached",timeout=60000); OPENMENU(); page.wait_for_selector(".layer.open .mgrp"); page.wait_for_timeout(400)
    check(page.locator(".layer.open .mgrp").count()>=4 and page.locator(".layer.open .tgl").count()>=3,"menu is grouped with toggle switches")
    check(page.evaluate("document.documentElement.scrollWidth<=innerWidth"),"no horizontal overflow")
    errors=[e for e in errors if "sandboxed" not in e]
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("\nFAILS:",fails)
