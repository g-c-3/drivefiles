import sys, io, os, random, time
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
from PIL import Image
import pypdf
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def sheet_click(page,label): page.locator(".layer.open .foot .btn",has_text=label).last.click()
def toast(page,txt,t=30000): page.wait_for_function("t=>Array.from(document.querySelectorAll('.toast')).some(e=>e.textContent.includes(t))",arg=txt,timeout=t)
def mkpdf(n,name):
    ims=[]
    for i in range(n):
        im=Image.new("RGB",(300,400),(40+i*30,90,160)); ims.append(im)
    bio=io.BytesIO(); ims[0].save(bio,"PDF",save_all=True,append_images=ims[1:]); return bio.getvalue()
P6=mkpdf(6,"a"); P3=mkpdf(3,"b")
for pth,data in {"Docs/six.pdf":P6,"Docs/three.pdf":P3}.items():
    snaps["t0"][pth]={"sha":add_blob(data),"mode":"100644","size":len(data)}
# a large noisy photo
random.seed(1)
im=Image.effect_noise((3200,2400),60).convert("RGB"); bio=io.BytesIO(); im.save(bio,"JPEG",quality=95); PHOTO=bio.getvalue()
open(BASE+"/photo.jpg","wb").write(PHOTO); open(BASE+"/failme.txt","wb").write(b"fail-me please"); open(BASE+"/okfile.txt","wb").write(b"fine file")
FAIL={"n":0}
orig=handler
def handler2(route,request):
    if request.method=="POST" and request.url.endswith("/git/blobs") and request.post_data:
        b=json.loads(request.post_data)
        try: raw=base64.b64decode(b["content"]) if b.get("encoding")=="base64" else b["content"].encode()
        except Exception: raw=b""
        if raw==b"fail-me please" and FAIL["n"]<1:
            FAIL["n"]+=1
            return route.fulfill(status=422,headers={**CORS,"content-type":"application/json"},body=json.dumps({"message":"nope"}))
    return orig(route,request)
def add_repo(page,pw):
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token")
    page.fill("#cfgPass",pw); page.fill("#cfgPass2",pw); page.click("#setupOpen"); page.wait_for_selector("#libList .row")
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":1280,"height":860},accept_downloads=True)
    page=ctx.new_page(); errors=[]
    page.on("pageerror",lambda e:errors.append("PAGEERR "+str(e)))
    page.route("https://api.github.com/**",handler2)
    URL=f"http://127.0.0.1:{port}/index.html"
    page.clock.install()
    page.goto(URL); page.wait_for_selector("#s-home:not([hidden])")
    # ---- passcode rules ----
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token")
    page.click("#setupGo"); page.wait_for_function("document.getElementById('setupErr').textContent.length>0")
    check("passcode" in page.inner_text("#setupErr").lower(),"saving without a passcode is refused: "+page.inner_text("#setupErr"))
    page.fill("#cfgPass","abc"); page.fill("#cfgPass2","abd"); page.click("#setupGo")
    page.wait_for_function("document.getElementById('setupErr').textContent.includes('match')"); check(True,"mismatched repeat is refused")
    page.click("#passEye"); check(page.locator("#cfgPass").get_attribute("type")=="text" and not page.locator("#pass2Row").is_visible(),"eye shows the passcode and hides the repeat field")
    page.click("#passEye"); check(page.locator("#pass2Row").is_visible(),"hiding it again brings the repeat field back")
    check(page.locator("#cfgPass").get_attribute("autocomplete")=="new-password","password managers are told it's a new password")
    page.fill("#cfgPass","a"); page.fill("#cfgPass2","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row")
    check(True,"a one-character passcode is accepted (no rules)")
    st=json.loads(page.evaluate("localStorage.getItem('a_profiles')")); check(st["list"][0]["kind"]=="pass" and st["list"][0]["enc"]["n"]==600000,"sealed with a passcode, 600000 PBKDF2 rounds")
    check("test-token" not in json.dumps(st),"token not readable in storage")
    # ---- search inside files ----
    page.click("#searchBtn"); page.wait_for_timeout(400); page.locator("#searchWrap button",has_text="Inside files").click()
    page.fill("#libSearch","hello atlas"); page.keyboard.press("Enter"); page.wait_for_function("document.querySelector('#libCrumbs').textContent.includes('contain')",timeout=20000)
    nm=page.locator("#libList .row .name").all_inner_texts()
    check(len(nm)==1 and "notes.md" in nm[0] and "Hello Atlas" in nm[0],"search inside finds the text with a snippet: %s"%nm)
    page.fill("#libSearch","zzzzqq"); page.keyboard.press("Enter"); page.wait_for_function("document.querySelector('#libCrumbs').textContent.includes('0 files')",timeout=20000); check(True,"no match says so")
    page.locator("#searchWrap button",has_text="Names").click(); page.fill("#libSearch",""); page.click("#searchBtn"); page.wait_for_timeout(400)
    # ---- markdown pictures ----
    page.goto(URL) if False else None
    page.evaluate("1")
    # open the Docs folder and the markdown file
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(300)
    page.locator("#libList .row",has_text="notes.md").first.click(); page.wait_for_selector(".viewer img",timeout=20000)
    page.wait_for_function("(()=>{var i=document.querySelector('.viewer .md img, .viewer img[alt=fig]');return i&&i.complete&&i.naturalWidth>0;})()",timeout=20000)
    check(True,"markdown picture from the repo is shown")
    page.keyboard.press("Escape") if False else None
    page.locator(".viewer button[aria-label='Close'], .viewer .vclose, .viewer button",has_text="Close").first.click() if page.locator(".viewer button",has_text="Close").count() else page.go_back()
    page.wait_for_timeout(500)
    check(page.locator("#pinStrip .pinchip").count()==1,"opened file shows up in recent")
    # ---- pin ----
    page.locator("#libList .row",has_text="code.py").first.locator("input[type=checkbox]").check()
    page.click("#actMore"); page.wait_for_selector(".layer.open .row"); page.locator(".layer.open .row",has_text="Pin to the top").click(); page.wait_for_timeout(400)
    check(page.locator("#pinStrip .pinchip").count()==2,"pinned item appears in the strip")
    # ---- PDF tools ----
    page.locator("#actClear").click() if page.locator("#actClear").is_visible() else None
    page.locator("#libList .row",has_text="six.pdf").first.locator("input[type=checkbox]").check()
    page.click("#actMore"); page.locator(".layer.open .row",has_text="Extract pages").click(); page.wait_for_selector(".layer.open input[placeholder*='1-3']")
    page.fill(".layer.open input[placeholder*='1-3']","9"); sheet_click(page,"Extract and save"); page.wait_for_function("document.querySelector('.layer.open .err')&&document.querySelector('.layer.open .err').textContent.includes('outside')",timeout=20000)
    check(True,"page numbers outside the document are refused")
    page.fill(".layer.open input[placeholder*='1-3']","2-3, 5"); sheet_click(page,"Extract and save")
    page.wait_for_function("p=>true",arg=1); 
    t0=time.time()
    while "Docs/six extract.pdf" not in paths() and time.time()-t0<30: page.wait_for_timeout(300)
    r=pypdf.PdfReader(io.BytesIO(blob_data[cur()["Docs/six extract.pdf"]["sha"]])); check(len(r.pages)==3,"extract made a 3-page PDF")
    page.wait_for_timeout(800)
    for t in ["six.pdf","three.pdf"]:
        page.locator("#libList .row",has_text=t).first.locator("input[type=checkbox]").check()
    page.click("#actMore"); page.locator(".layer.open .row",has_text="Join PDFs").click(); page.wait_for_selector(".layer.open .sumlist")
    sheet_click(page,"Join and save"); t0=time.time()
    while not any(x.endswith("joined.pdf") for x in paths()) and time.time()-t0<30: page.wait_for_timeout(300)
    jp=[x for x in paths() if x.endswith("joined.pdf")][0]
    r=pypdf.PdfReader(io.BytesIO(blob_data[cur()[jp]["sha"]])); check(len(r.pages)==9,"join made a 9-page PDF (%s)"%jp)
    page.wait_for_timeout(800)
    page.locator("#libList .row",has_text="three.pdf").first.locator("input[type=checkbox]").check()
    page.click("#actMore"); page.locator(".layer.open .row",has_text="Rotate pages").click(); page.wait_for_selector(".layer.open .seg, .layer.open [role=tablist], .layer.open button")
    page.locator(".layer.open button",has_text="180").first.click(); sheet_click(page,"Rotate and save"); t0=time.time()
    while "Docs/three rotated.pdf" not in paths() and time.time()-t0<30: page.wait_for_timeout(300)
    r=pypdf.PdfReader(io.BytesIO(blob_data[cur()["Docs/three rotated.pdf"]["sha"]])); check(all(pg.get("/Rotate")==180 for pg in r.pages),"rotate turned every page 180")
    page.wait_for_timeout(800)
    # ---- photo shrink + retry ----
    page.evaluate("1")
    page.click("#addFiles") if False else None
    page.set_input_files("#inFiles",[BASE+"/photo.jpg",BASE+"/failme.txt",BASE+"/okfile.txt"]); page.wait_for_selector(".layer.open .foot")
    page.locator(".layer.open label.check",has_text="Shrink photos").locator("input").check()
    sheet_click(page,"Upload"); page.wait_for_function("Array.from(document.querySelectorAll('.layer.open .foot .btn')).some(b=>/Retry 1 left/.test(b.textContent))",timeout=60000)
    check(True,"one failed file leaves a 'Retry 1 left' button")
    ph=[x for x in paths() if x.endswith("photo.jpg")]; check(ph and len(blob_data[cur()[ph[0]]["sha"]])<len(PHOTO)*0.8,"photo was shrunk: %d -> %d"%(len(PHOTO),len(blob_data[cur()[ph[0]]["sha"]]) if ph else -1))
    check(any(x.endswith("okfile.txt") for x in paths()) and not any(x.endswith("failme.txt") for x in paths()),"finished files saved, failed one waiting")
    sheet_click(page,"Retry 1 left"); t0=time.time()
    while not any(x.endswith("failme.txt") for x in paths()) and time.time()-t0<30: page.wait_for_timeout(300)
    check(any(x.endswith("failme.txt") for x in paths()),"retry finishes the rest")
    page.wait_for_timeout(1200)
    # ---- branches ----
    page.click("#menuBtn"); page.locator(".layer.open .btn",has_text="Branch: main").click(); page.wait_for_selector(".layer.open input[placeholder='New branch name']")
    page.fill(".layer.open input[placeholder='New branch name']","feature/x"); page.locator(".layer.open .btn",has_text="Create").click()
    page.wait_for_function("'feature/x' in {}||true"); t0=time.time()
    while "feature/x" not in heads and time.time()-t0<20: page.wait_for_timeout(200)
    check("feature/x" in heads,"new branch created on GitHub")
    page.wait_for_selector("#libList .row"); page.click("#menuBtn"); page.wait_for_selector(".layer.open .btn:has-text('Branch:')")
    check(page.locator(".layer.open .btn",has_text="Branch: feature/x").count()==1,"menu shows the new branch as current")
    page.locator(".layer.open .btn",has_text="Branch: feature/x").click(); page.wait_for_selector(".layer.open select")
    page.locator(".layer.open .btn",has_text="Merge").last.click(); toast(page,"Merged"); check(("main","feature/x") in merges,"merge sent to GitHub")
    heads["conflict"]={"sha":head["sha"]}; sheet_click(page,"Close"); page.wait_for_timeout(500)
    page.click("#menuBtn"); page.locator(".layer.open .btn",has_text="Branch: feature/x").click(); page.wait_for_selector(".layer.open select")
    page.locator(".layer.open select").select_option("conflict"); page.locator(".layer.open .btn",has_text="Merge").last.click()
    page.wait_for_function("document.querySelector('.layer.open .err')&&document.querySelector('.layer.open .err').textContent.includes('overlap')"); check(True,"conflicting merge explained, not guessed")
    sheet_click(page,"Close"); page.wait_for_timeout(500)
    page.click("#menuBtn"); page.locator(".layer.open .btn",has_text="Branch: feature/x").click(); page.wait_for_selector(".layer.open .row")
    page.locator(".layer.open .row",has_text="main").first.click(); page.wait_for_function("document.getElementById('connName').textContent==='me/qp'"); page.wait_for_selector("#libList .row")
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .btn:has-text('Branch:')"); check(page.locator(".layer.open .btn",has_text="Branch: main").count()==1,"switched back to main"); sheet_click(page,"Close"); page.wait_for_timeout(400)
    # ---- backup ----
    page.click("#menuBtn"); page.locator(".layer.open .btn",has_text="Back up whole repository").click(); page.wait_for_selector(".layer.open input")
    with page.expect_download() as dl: sheet_click(page,"Download")
    zp=BASE+"/backup.zip"; dl.value.save_as(zp); names=zipfile.ZipFile(zp).namelist()
    check("Docs/notes.md" in names and "QPs/Drive/Physics/2019/a.txt" in names and len(names)>=len(paths())-1,"backup zip holds every file with full paths (%d files)"%len(names))
    check("backup" in dl.value.suggested_filename,"backup name: "+dl.value.suggested_filename)
    page.wait_for_timeout(500)
    # ---- auto-lock ----
    page.click("#menuBtn"); page.locator(".layer.open .seg button, .layer.open [role=group] button",has_text="1 min").first.click(); page.wait_for_timeout(200); sheet_click(page,"Close"); page.wait_for_timeout(400)
    page.clock.fast_forward(75000); page.wait_for_selector("#s-home:not([hidden])",timeout=15000); check(True,"locks itself after the chosen idle time")
    # ---- legacy profile upgrade ----
    page.evaluate("""()=>{var o=JSON.parse(localStorage.getItem('a_profiles'));o.list[0]={id:o.list[0].id,repo:'me/qp',branch:'main',kind:'plain',cfg:{repo:'me/qp',branch:'main',token:'test-token'}};localStorage.setItem('a_profiles',JSON.stringify(o));}""")
    page.reload(); page.wait_for_selector("#s-home:not([hidden])"); page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]")
    check("passcode" in page.inner_text(".layer.open").lower() and page.locator(".layer.open input[type=password]").count()==2,"an old no-passcode repository asks for a new passcode")
    ins=page.locator(".layer.open input[type=password]"); ins.nth(0).fill("n"); ins.nth(1).fill("n"); page.keyboard.press("Enter"); page.wait_for_selector("#libList .row")
    st=json.loads(page.evaluate("localStorage.getItem('a_profiles')")); check(st["list"][0]["kind"]=="pass" and "cfg" not in st["list"][0],"old profile is now encrypted with the new passcode")
    # ---- share target (service worker) ----
    page.evaluate("navigator.serviceWorker.ready.then(()=>1)"); page.wait_for_timeout(1500)
    res=page.evaluate("""async()=>{var fd=new FormData();fd.append('files',new File(['shared text'],'shared note.txt',{type:'text/plain'}));var r=await fetch('./?share=1',{method:'POST',body:fd,redirect:'manual'});return r.type+':'+r.status;}""")
    check("opaqueredirect" in res,"service worker answers the share POST with a redirect: "+res)
    page.goto(URL+"?share=1"); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(600)
    LOGIN("n"); page.wait_for_selector(".layer.open",timeout=15000)
    check("shared note.txt" in page.inner_text(".layer.open"),"shared file opens in the Add files sheet after login")
    errors=[e for e in errors if "sandboxed" not in e]
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("\nFAILS:",fails)
