fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m)
    if not c: fails.append(m)
def toast(page,txt,t=60000): page.wait_for_function("t=>Array.from(document.querySelectorAll('.toast')).some(e=>e.textContent.includes(t))",arg=txt,timeout=t)
def tab(page,n):
    if page.locator(f"#sideNav [data-tab={n}]").first.is_visible(): page.locator(f"#sideNav [data-tab={n}]").first.click(); return
    OPENMENU(); page.locator(".layer.open .menutabs button",has_text=n.capitalize()).click(); page.wait_for_timeout(350)
def rows(page): return page.locator("#libList .row .name").all_inner_texts()
def sheet_click(page,label):
    l=page.locator(".layer.open .foot .btn",has_text=label)
    if label=="Close" and page.locator(".layer.open .xbtn").count() and not l.count(): page.locator(".layer.open .xbtn").last.click()
    else: l.last.click()
def cur_text(path): return blob_data[cur()[path]["sha"]]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,accept_downloads=True)
    page=ctx.new_page(); errors=[]
    page.on("pageerror",lambda e:errors.append("PAGEERR "+str(e)))
    page.on("console",lambda m:errors.append(m.text) if m.type=="error" else None)
    page.route("https://api.github.com/**",handler)
    page.on("response",lambda r: errors.append("404 "+r.url) if r.status==404 and "api.github" not in r.url else None)
    URL=f"http://127.0.0.1:{port}/index.html"
    page.goto(URL); page.wait_for_selector("#s-home:not([hidden])")
    # ---- home screen: three controls, empty state ----
    check(page.locator("#s-home button:visible, #s-home select:visible").count()==3 and page.locator("#homeAdd").is_visible() and page.locator("#homeSel").is_visible() and page.locator("#homeLogin").is_visible(),"home shows Add, Saved and Login only")
    check(page.locator("#homeSel").is_disabled(),"Saved is disabled when nothing is saved")
    check(page.locator("#homeLogin").is_disabled(),"Login is disabled when nothing is saved")
    check(not page.locator("#homeReset").is_visible(),"no reset link on an empty device")
    page.screenshot(path=SHOTS+"/v5_home_empty.png")
    page.click("#homeAdd"); page.wait_for_selector("#s-setup:not([hidden])")
    # bad token is refused with a clear message
    page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","nope"); page.fill("#cfgPass",PW)
    page.click("#setupGo"); page.wait_for_function("document.getElementById('setupErr').textContent.length>0")
    check("token" in page.inner_text("#setupErr"),"bad token message: "+page.inner_text("#setupErr"))
    page.fill("#cfgRepo","nothere"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass",PW)
    page.click("#setupGo"); page.wait_for_function("document.getElementById('setupErr').textContent.includes('find')")
    check(True,"unknown repository is refused")
    # save (no passcode) and stay on home
    page.fill("#cfgRepo","qp"); page.click("#setupGo"); page.wait_for_selector("#s-home:not([hidden])")
    check(page.locator("#homeSel").is_enabled() and "me/qp" in page.locator("#homeSel option:checked").inner_text(),"saved repo appears as account/repo")
    check(page.locator("#homeReset").is_visible(),"reset link appears once something is saved")
    page.screenshot(path=SHOTS+"/v5_home_saved.png")
    stored=page.evaluate("localStorage.getItem('a_profiles')")
    check("test-token" not in stored,"token is not stored as readable text")
    # login straight in (no passcode)
    LOGIN()
    check(page.inner_text("#connName")=="me/qp","no-passcode login opens the repo directly")
    # log out, reload: remembers last selection and still opens
    OPENMENU(); sheet_click(page,"Close") if False else None
    page.locator(".layer.open .btn",has_text="Log out").click(); page.wait_for_selector("#s-home:not([hidden])")
    page.wait_for_timeout(900); page.reload(); page.wait_for_selector("#s-home:not([hidden])")
    check("me/qp" in page.locator("#homeSel option:checked").inner_text(),"remembered after reload")
    # add a second repo with a passcode and open it via Save and open
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp2"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","1234")
    page.click("#setupOpen"); page.wait_for_selector("#shell:not([hidden])")
    check(page.inner_text("#connName")=="me/qp2","Save and open enters the repo")
    OPENMENU(); page.locator(".layer.open .btn",has_text="Log out").click(); page.wait_for_selector("#s-home:not([hidden])")
    check(page.locator("#homeSel option").count()==2,"two saved repos listed")
    check("me/qp2" in page.locator("#homeSel option:checked").inner_text(),"last used repo is preselected")
    # passcode login: wrong then right
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]")
    page.fill(".layer.open input[type=password]","0000"); sheet_click(page,"Log in")
    page.wait_for_function("document.querySelector('.layer.open .err')&&document.querySelector('.layer.open .err').textContent.includes('passcode')")
    check(True,"wrong passcode refused")
    page.fill(".layer.open input[type=password]","1234"); page.keyboard.press("Enter"); page.wait_for_selector("#shell:not([hidden])")
    check(page.inner_text("#connName")=="me/qp2","right passcode logs in")
    # switch repository from inside (no passcode one opens directly)
    page.click("#connBtn"); page.wait_for_selector(".layer.open .row")
    page.locator(".layer.open .row",has_text="me/qp").first.click()
    page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]",PW); page.keyboard.press("Enter")
    page.wait_for_function("document.getElementById('connName').textContent==='me/qp'")
    check(True,"switch repository from the connection pill")
    page.wait_for_selector("#libList .row")
    def home():
        page.locator("#libCrumbs button").first.click(); page.wait_for_function("!document.getElementById('libCrumbs').querySelector('.pathbar button + svg, .ico + button')||true")
    def goto_dir(d):
        page.evaluate("()=>{}")
        page.locator("#libCrumbs button").first.click(); page.wait_for_timeout(150)
        for part in d.split("/"):
            page.locator("#libList .row", has_text=part).first.click(); page.wait_for_timeout(150)
    def openf(path):
        d,_,n=path.rpartition("/")
        goto_dir(d) if d else page.locator("#libCrumbs button").first.click()
        page.locator("#libList .row", has_text=n).first.click()
        page.wait_for_selector("#viewer:not([hidden])")
    def close_viewer():
        page.locator("#viewer .vbar .ibtn").first.click(); page.wait_for_selector("#viewer",state="hidden")
    check("index.html" in " ".join(rows(page)) and page.locator("#libList .tag.app").count()>=2, "app files shown by default, with an app tag")

    # ---- tree picker for Move ----
    goto_dir("Notes")
    page.locator("#libList .row input").first.check()
    page.click("#actMove"); page.wait_for_selector(".layer.open .ftree")
    check(page.locator(".layer.open .frow").count()>=5, "tree rows shown")
    check(page.locator(".layer.open input").count()==1, "only the new-folder input exists (no typed path)")
    page.locator(".layer.open .frow", has_text="QPs").locator(".tcaret").click()
    page.locator(".layer.open .frow", has_text="Drive").locator(".tcaret").click()
    page.screenshot(path=SHOTS+"/v4_2_move_tree.png")
    page.locator(".layer.open .frow", has_text="Physics").click()
    check("QPs/Drive/Physics" in page.inner_text(".layer.open .fsel"), "tree selection label: "+page.inner_text(".layer.open .fsel"))
    # create virtual folder
    page.fill(".layer.open .newrow input","2021"); page.click(".layer.open .newrow .btn")
    check("QPs/Drive/Physics/2021" in page.inner_text(".layer.open .fsel"), "virtual folder selected")
    sheet_click(page,"Move"); toast(page,"Moved")
    check("QPs/Drive/Physics/2021/todo.txt" in cur(), "moved into new folder via tree")

    # ---- viewer: markdown ----
    openf("Docs/notes.md")
    page.wait_for_selector(".md h1")
    check("Hello Atlas" in page.inner_text(".md h1"), "markdown rendered")
    page.wait_for_function("(()=>{const i=document.querySelector('.md img');return i&&i.complete&&i.naturalWidth>0})()",timeout=15000)
    check(True,"relative markdown image loaded from repo")
    check(page.evaluate("window.__xss")is None, "script in markdown not executed")
    check(page.locator(".md a[target=_blank]").count()==1, "external link opens in new tab")
    check(page.locator(".md pre code.hljs").count()>=1, "code fence highlighted")
    page.screenshot(path=SHOTS+"/v4_3_markdown.png")
    page.locator(".md a.repo-link", has_text="data").click()
    page.wait_for_function("document.querySelector('.vname').textContent==='data.json'")
    check(True,"relative link opened data.json")
    # ---- json edit + save ----
    page.locator("#viewer .vactions .btn", has_text="Edit").click()
    page.wait_for_selector(".cm-content")
    page.click(".cm-content"); page.keyboard.press("Control+a"); page.keyboard.type('{"edited": true}')
    import time; t0=time.time()
    page.locator("#viewer .vactions .btn.primary", has_text="Save").click()
    page.wait_for_selector("#viewer .vprog:not([hidden])",timeout=5000)
    lbls=set()
    for _ in range(30):
        lbls.add(page.inner_text("#viewer .vprog span"))
        if "Saved" in page.inner_text("#viewer .vprog span"): break
        page.wait_for_timeout(100)
    check(len(lbls)>=2, "save progress labels shown: %s"%sorted(lbls))
    toast(page,"Saved"); print("save took %.1fs"%(time.time()-t0))
    check(cur_text("Docs/data.json")==b'{"edited": true}', "edit saved as commit: %r"%cur_text("Docs/data.json"))
    # conflict: change file elsewhere then save
    ctr["t"]+=1; t="tx%d"%ctr["t"]; s=dict(cur()); s["Docs/data.json"]={"sha":add_blob(b'{"other":1}'),"mode":"100644","size":11}; snaps[t]=s
    ctr["c"]+=1; c="cx%d"%ctr["c"]; commits[c]={"tree":t,"parents":[head["sha"]],"msg":"External edit","date":"2026-11-15T12:00:00Z"}; head["sha"]=c
    page.click(".cm-content"); page.keyboard.press("Control+a"); page.keyboard.type('{"mine": 2}')
    page.locator("#viewer .vactions .btn.primary", has_text="Save").click()
    page.wait_for_selector(".layer.open")
    check("changed elsewhere" in page.inner_text(".layer.open").lower() or "File changed" in page.inner_text(".layer.open"), "conflict warning shown")
    sheet_click(page,"Save anyway"); toast(page,"Saved")
    for _ in range(40):
        if cur_text("Docs/data.json")==b'{"mine": 2}': break
        page.wait_for_timeout(500)
    check(cur_text("Docs/data.json")==b'{"mine": 2}', "overwrite after conflict: %r"%cur_text("Docs/data.json"))
    # history restore
    page.locator("#viewer .vactions .btn", has_text="Done").click()
    page.locator("#viewer .vbar .ibtn[aria-label^=Details]").click(); page.wait_for_selector(".layer.open .hist .event")
    check(page.locator(".layer.open .hist .event").count()>=2, "file history listed")
    page.locator(".layer.open .hist .btn", has_text="Restore").first.click()
    page.wait_for_selector(".layer.open >> nth=1"); page.locator(".layer.open >> nth=1").locator(".foot .btn").last.click()
    toast(page,"restored")
    check(cur_text("Docs/data.json") in (b'{"edited": true}',b'{"other":1}',b'{"a":1,"b":[1,2]}'), "restore wrote older version: %r"%cur_text("Docs/data.json"))
    page.keyboard.press("Escape")
    page.wait_for_function("document.querySelectorAll('.layer.open').length===0",timeout=5000)
    check(page.locator("#viewer").is_visible(),"Escape closed only the sheet")
    close_viewer()

    # ---- image, pdf, docx, xlsx, pptx, html, hex, zip ----
    openf("Docs/fig.png"); page.wait_for_function("(()=>{const i=document.querySelector('.zimg');return i&&i.naturalWidth===320})()")
    check(True,"image viewer"); page.screenshot(path=SHOTS+"/v4_4_image.png")
    # next/prev between files
    page.locator("#viewer .vfoot .ibtn").last.click(); page.wait_for_function("document.querySelector('.vname').textContent!=='fig.png'")
    check(True,"next file button works")
    close_viewer()
    openf("Docs/sample.pdf"); page.wait_for_selector(".pdfpage canvas")
    page.wait_for_function("(()=>{const c=document.querySelector('.pdfpage canvas');if(!c||!c.width)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=40){if(d[i]<200)return true}return false})()",timeout=30000)
    check(True,"PDF page rendered with content"); page.screenshot(path=SHOTS+"/v4_5_pdf.png"); close_viewer()
    openf("Docs/sample.docx"); page.wait_for_selector(".docx-wrapper",timeout=20000)
    check("Physics Paper 2019" in page.inner_text(".docxhost"), "docx rendered"); page.screenshot(path=SHOTS+"/v4_6_docx.png"); close_viewer()
    openf("Docs/sample.xlsx"); page.wait_for_selector(".tscroll.big table")
    check("Asha" in page.inner_text(".tscroll.big") and "Merged" in page.inner_text(".tscroll.big"), "xlsx table")
    page.locator(".stab", has_text="Notes").click(); check("Café" in page.inner_text(".tscroll.big"), "second sheet tab")
    page.screenshot(path=SHOTS+"/v4_7_xlsx.png"); close_viewer()
    openf("Docs/sample.pptx"); page.wait_for_selector(".slide .sh",timeout=20000)
    check(page.locator(".slide").count()==3 and "Chemistry Review" in page.inner_text(".slides"), "pptx slides")
    check(page.locator(".slide img").count()==1, "pptx picture")
    page.screenshot(path=SHOTS+"/v4_8_pptx.png"); close_viewer()
    openf("Docs/page.html"); page.wait_for_selector(".hframe")
    check(page.get_attribute(".hframe","sandbox")=="" and page.evaluate("window.__xss2")is None, "html preview sandboxed")
    close_viewer()
    openf("Docs/blob.bin"); page.wait_for_selector(".hex"); check("00000000" in page.inner_text(".hex"), "hex view"); close_viewer()
    openf("Docs/bundle.zip"); page.locator("#viewer .btn", has_text="Browse and extract").click()
    page.wait_for_selector("#upBody:not([hidden])",timeout=30000)
    check("Physics" in page.inner_text("#tree") or "Drive" in page.inner_text("#tree"), "archive opened in Extract tab")
    # preview a file inside the archive
    page.locator("#tree .caret").first.click(); page.locator("#tree .caret").nth(1).click() if page.locator("#tree .caret").count()>1 else None
    page.locator("#tree .row .name", has_text="x.txt").first.click() if page.locator("#tree .row .name", has_text="x.txt").count() else page.locator("#tree .row .name", has_text="Chem").first.click()
    page.wait_for_selector("#viewer:not([hidden])",timeout=15000)
    check(True,"preview of a file inside an archive opens the viewer"); close_viewer()
    tab(page,"files")

    # ---- legacy conversion ----
    openf("Old/paper.doc"); page.wait_for_selector("#viewer .vcenter .btn.primary")
    page.screenshot(path=SHOTS+"/v4_9_legacy.png")
    page.locator("#viewer .btn.primary", has_text="Convert and open").click()
    page.wait_for_selector(".docx-wrapper",timeout=60000)
    check("Old/paper.docx" in cur(), "doc converted and saved next to original")
    check("Physics Paper 2019" in page.inner_text(".docxhost"), "converted docx opens in viewer")
    check("Old/paper.doc" in cur(), "original kept")
    open("/tmp/conv_check.docx","wb").write(cur_text("Old/paper.docx"))
    close_viewer()
    # batch convert Old folder (doc skipped, xls+ppt done)
    page.locator("#libCrumbs button").first.click(); page.locator("#libList .row", has_text="Old").locator("input").check()
    page.click("#actConvert"); page.wait_for_selector(".layer.open")
    page.screenshot(path=SHOTS+"/v4_10_batch.png")
    sheet_click(page,"Convert"); page.wait_for_function("document.querySelector('.layer.open .status').textContent.startsWith('Done')",timeout=120000)
    st=page.inner_text(".layer.open .status"); check("2 converted" in st and "1 skipped" in st, "batch result: "+st)
    check("Old/marks.xlsx" in cur() and "Old/slides.pptx" in cur(), "xlsx and pptx saved")
    open("/tmp/conv_check.xlsx","wb").write(cur_text("Old/marks.xlsx")); open("/tmp/conv_check.pptx","wb").write(cur_text("Old/slides.pptx"))
    sheet_click(page,"Close")

    # ---- new file + edit python ----
    goto_dir("Docs")
    page.click("#newFile"); page.fill(".layer.open input","fresh.md"); sheet_click(page,"Create")
    page.wait_for_selector(".cm-content"); page.click(".cm-content"); page.keyboard.type("# New doc")
    page.locator("#viewer .vactions .btn.primary", has_text="Save").click(); toast(page,"Saved")
    for _ in range(40):
        if "Docs/fresh.md" in cur(): break
        page.wait_for_timeout(250)
    check("Docs/fresh.md" in cur() and cur_text("Docs/fresh.md")==b"# New doc", "new file created")
    page.locator("#viewer .vactions .btn", has_text="Done").click(); page.wait_for_selector(".md h1")
    close_viewer()
    openf("Docs/code.py"); page.wait_for_selector(".cm-content")
    check(page.locator(".cm-line").count()>=2, "code shown in editor view")
    page.screenshot(path=SHOTS+"/v4_11_code.png"); close_viewer()

    # ---- hide / show app files ----
    page.locator("#libCrumbs button").first.click()
    check("index.html" in " ".join(rows(page)), "app files always shown")
    page.locator("#libList .row",has_text="index.html").locator("input").check(); page.click("#actDel"); page.wait_for_selector(".layer.open .warnbox")
    check(True,"deleting app files shows a warning"); sheet_click(page,"Cancel"); page.locator("#libList .row",has_text="index.html").locator("input").uncheck()
    page.click("#sortBtn"); page.locator(".layer.open .seg button", has_text="Size").click(); sheet_click(page,"Done")
    check(True,"sort sheet works")

    # ---- empty files: held back by default, sent when ticked ----
    import io
    zb=io.BytesIO()
    with zipfile.ZipFile(zb,"w") as z:
        z.writestr("Pack/full.txt","content here"); z.writestr("Pack/blank.txt",""); z.writestr("Pack/blank2.md","")
    open("/tmp/pack.zip","wb").write(zb.getvalue())
    tab(page,"extract")
    if page.locator("#clearUp").is_visible(): page.click("#clearUp"); page.wait_for_timeout(200)
    page.set_input_files("#inArch","/tmp/pack.zip"); page.wait_for_selector("#tree .row >> text=Pack"); page.wait_for_timeout(300)
    page.locator("#tree .row",has_text="Pack").first.locator(".caret").click() if page.locator("#tree .row").count()==1 else None
    check("1 of 3 selected" in page.inner_text("#summary"),"empty files unselected by default: "+page.inner_text("#summary"))
    check("2 empty" in page.inner_text("#skipsum"),"held-back list counts empties: "+page.inner_text("#skipsum"))
    page.locator("#skipped .row",has_text="blank.txt").locator("input").check()
    check("2 of 3 selected" in page.inner_text("#summary"),"ticking an empty file selects it")
    page.click("#go"); toast(page,"Done")
    check("Pack/blank.txt" in cur() and blob_size[cur()["Pack/blank.txt"]["sha"]]==0,"ticked empty file was uploaded")
    check("Pack/blank2.md" not in cur() and "Pack/full.txt" in cur(),"unticked empty file stayed out")
    tab(page,"files")

    # ---- manage saved repositories: typed confirm ----
    OPENMENU(); page.locator(".layer.open .btn",has_text="Saved repositories").click(); page.wait_for_selector(".layer.open .row")
    check(page.locator(".layer.open .row").count()==2,"manage lists both saved repos")
    check(page.locator(".layer.open .foot .btn",has_text="Delete").is_disabled(),"delete disabled until something is selected")
    page.locator(".layer.open .row",has_text="me/qp2").locator("input").check()
    page.locator(".layer.open .foot .btn",has_text="Delete 1 selected").click(); page.wait_for_selector(".layer.open input[aria-label='Type confirm']")
    go=page.locator(".layer.open .foot .btn",has_text="Delete").last
    check(go.is_disabled(),"delete needs typing confirm")
    page.fill(".layer.open input[aria-label='Type confirm']","delete"); check(go.is_disabled(),"wrong word keeps it disabled")
    page.fill(".layer.open input[aria-label='Type confirm']","confirm"); check(go.is_enabled(),"typing confirm enables it")
    go.click(); toast(page,"Deleted")
    check(page.evaluate("JSON.parse(localStorage.getItem('a_profiles')).list.length")==1,"one saved repo left")
    check(page.inner_text("#connName")=="me/qp","still in the open repo")
    # deleting the open repo signs out
    OPENMENU(); page.locator(".layer.open .btn",has_text="Saved repositories").click(); page.wait_for_selector(".layer.open .row")
    page.locator(".layer.open .row",has_text="me/qp").locator("input").check(); page.locator(".layer.open .foot .btn",has_text="Delete 1 selected").click()
    page.fill(".layer.open input[aria-label='Type confirm']","CONFIRM"); page.locator(".layer.open .foot .btn",has_text="Delete").last.click()
    page.wait_for_selector("#s-home:not([hidden])")
    check(page.locator("#homeSel").is_disabled(),"deleting the last repo returns to the empty home")

    # ---- reset this device: outside and inside ----
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass",PW)
    page.click("#setupGo"); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeReset"); page.wait_for_selector(".layer.open input[aria-label='Type confirm']")
    check(page.locator(".layer.open .foot .btn",has_text="Reset").is_disabled(),"reset (home) needs typing confirm")
    sheet_click(page,"Cancel"); page.wait_for_timeout(350)
    check(page.evaluate("JSON.parse(localStorage.getItem('a_profiles')).list.length")==1,"cancelling reset keeps the data")
    LOGIN()
    OPENMENU(); page.locator(".layer.open .btn",has_text="Reset this device").click(); page.wait_for_selector(".layer.open input[aria-label='Type confirm']")
    check(page.locator(".layer.open .foot .btn",has_text="Reset").is_disabled(),"reset (inside) needs typing confirm")
    page.fill(".layer.open input[aria-label='Type confirm']","confirm"); sheet_click(page,"Reset")
    page.wait_for_selector("#s-home:not([hidden])")
    check(page.evaluate("localStorage.getItem('a_profiles')")in(None,'{"v":2,"last":null,"list":[]}') or page.evaluate("JSON.parse(localStorage.getItem('a_profiles')||'{\"list\":[]}').list.length")==0,"reset clears saved repos")
    check(page.locator("#homeSel").is_disabled(),"empty home after reset")
    # re-add and keep going for the screenshots
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass",PW)
    page.click("#setupOpen"); page.wait_for_selector("#libList .row")

    # ---- save as copy: _1, then _2, in the same folder ----
    zb=io.BytesIO()
    with zipfile.ZipFile(zb,"w") as z:
        z.writestr("Pack/full.txt","different content"); z.writestr("Pack/full_1.txt","again different")
    open("/tmp/pack2.zip","wb").write(zb.getvalue())
    tab(page,"extract")
    page.click("#clearUp"); page.wait_for_timeout(200)
    check(page.locator("#segFolder").count()==0,"folder option removed")
    page.set_input_files("#inArch","/tmp/pack2.zip"); page.wait_for_selector("#tree .row >> text=Pack"); page.wait_for_timeout(300)
    page.locator("#segFile button",has_text="Save as copy").click(); page.wait_for_timeout(200)
    check("will be saved as copies" in page.inner_text("#plan"),"plan wording: "+page.inner_text("#plan"))
    page.click("#go"); toast(page,"Done")
    ps=paths()
    check("Pack/full_1.txt" in ps and "Pack/full_2.txt" in ps and "Pack/full_3.txt" not in ps,"copies numbered _1,_2 in same folder: "+str([p for p in ps if p.startswith("Pack/")]))
    check(not any(p.startswith("Pack_1") for p in ps),"no folder copy made")
    check(page.input_value("#optLimit")=="50","default limit 50")
    check("49.9" in page.inner_text("#limitHint"),"limit hint says 49.9: "+page.inner_text("#limitHint"))
    tab(page,"files")

    # ---- back button works inside the page ----
    page.locator("#libCrumbs button").first.click(); page.wait_for_timeout(200)
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(300)
    check("Docs" in page.inner_text("#libCrumbs"),"in Docs")
    page.go_back(); page.wait_for_timeout(400)
    check("Docs" not in page.inner_text("#libCrumbs") and page.inner_text("#connName")=="me/qp","back goes up a folder, stays in app")
    tab(page,"history"); page.wait_for_timeout(300)
    page.go_back(); page.wait_for_timeout(400)
    check(page.locator("#tab-files").is_visible() and page.locator("#tab-history").is_hidden(),"back leaves History tab")
    OPENMENU(); page.wait_for_selector(".layer.open")
    page.go_back(); page.wait_for_timeout(500)
    check(page.locator(".layer.open").count()==0,"back closes the menu")
    openf("Docs/notes.md"); page.wait_for_timeout(300)
    page.go_back(); page.wait_for_selector("#viewer",state="hidden",timeout=5000)
    check(True,"back closes the viewer")
    check(page.locator("#shell").is_visible(),"still in the app")
    page.go_back(); page.wait_for_timeout(400)
    check("Docs" not in page.inner_text("#libCrumbs"),"back leaves the folder the viewer was in")
    page.go_back(); page.wait_for_timeout(400)
    check(page.locator("#shell").is_visible() and "Press back again" in page.inner_text("#toasts"),"back at the top asks before logging out")
    page.go_back(); page.wait_for_selector("#s-home:not([hidden])",timeout=5000)
    check(True,"second back returns to the home screen")
    page.go_back(); page.wait_for_timeout(500)
    check(page.locator("#s-home").is_visible() and "Press back again to leave" in page.inner_text("#toasts"),"first back on the login screen stays")
    LOGIN()

    page.screenshot(path=SHOTS+"/v6_files.png"); OPENMENU(); page.wait_for_timeout(500); page.screenshot(path=SHOTS+"/v6_menu.png"); sheet_click(page,"Close"); page.wait_for_timeout(400)
    # ---- header: icon buttons on the title line, smooth search ----
    page.wait_for_selector("#libList .row")
    tt=page.locator("#libStat").bounding_box(); ad=page.locator("#addFiles").bounding_box()
    check(abs((tt["y"]+tt["height"]/2)-(ad["y"]+ad["height"]/2))<10,"buttons share a line with the file count")
    check(all(page.locator("#"+i).is_visible() for i in ["searchBtn","libRefresh","sortBtn","newFolder","newFile","addFiles"]) and "New folder" not in page.inner_text(".tools"),"six icon buttons, no text")
    check(page.locator("#searchWrap").evaluate("e=>getComputedStyle(e).visibility")=="hidden","search starts closed")
    total_rows=len(rows(page))
    page.click("#searchBtn"); page.wait_for_timeout(500)
    check(page.locator("#libSearch").is_visible() and page.evaluate("document.activeElement.id")=="libSearch","search opens and takes focus")
    page.screenshot(path=SHOTS+"/v7_search_open.png")
    page.fill("#libSearch","sample"); page.wait_for_timeout(250)
    check(0<len(rows(page))<total_rows,"search filters the list")
    page.click("#searchBtn"); page.wait_for_timeout(500)
    check(page.locator("#searchWrap").evaluate("e=>getComputedStyle(e).visibility")=="hidden" and page.input_value("#libSearch")=="" and len(rows(page))==total_rows,"closing search clears it")
    # top bar fits
    cn=page.locator("#connName").bounding_box(); check(cn["x"]+cn["width"]<=390,"repo name fits the top bar")
    page.screenshot(path=SHOTS+"/v7_files.png")

    # ---- themes ----
    def theme(name):
        OPENMENU(); page.wait_for_selector(".layer.open")
        page.locator(".layer.open button",has_text=name).first.click(); page.wait_for_timeout(300)
        sheet_click(page,"Close"); page.wait_for_timeout(350)
    bg=lambda: page.evaluate("getComputedStyle(document.body).backgroundColor")
    check(page.evaluate("document.documentElement.dataset.theme")=="dark" and bg()=="rgb(6, 9, 20)","dark is the default")
    theme("Night"); check(bg()=="rgb(0, 0, 0)","night is pitch black"); page.screenshot(path=SHOTS+"/v7_night.png")
    theme("Light"); check(bg()=="rgb(255, 255, 255)","light is white"); page.screenshot(path=SHOTS+"/v7_light.png")
    OPENMENU(); page.wait_for_timeout(500); page.screenshot(path=SHOTS+"/v7_menu_light.png"); sheet_click(page,"Close"); page.wait_for_timeout(350)
    theme("Night"); page.wait_for_timeout(900); page.reload(); page.wait_for_selector("#s-home:not([hidden])")
    check(page.evaluate("document.documentElement.dataset.theme")=="night","theme is remembered after reload")
    LOGIN(); theme("Dark")

    # ---- no right click, except in typing fields ----
    ctx=lambda sel: page.evaluate("s=>{var e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});document.querySelector(s).dispatchEvent(e);return e.defaultPrevented;}",sel)
    check(ctx("#libList .row") is True and ctx("#menuBtn") is True and ctx("#pane") is True,"right click blocked on the page")
    OPENMENU(); page.locator(".layer.open .btn",has_text="Edit details").click(); page.wait_for_selector("#s-setup:not([hidden])")
    check(all(ctx(s) is False for s in ["#cfgOwner","#cfgRepo","#cfgBranch","#cfgToken","#cfgPass"]),"right click allowed in the account fields")
    check(ctx("#setupGo") is True,"right click blocked on setup buttons")
    page.click("#setupCancel"); page.wait_for_selector("#shell:not([hidden])")
    tab(page,"extract"); page.wait_for_selector("#tab-extract:not([hidden])")

    # ---- limit allows up to limit minus 0.1 MB ----
    import os
    zb=io.BytesIO()
    with zipfile.ZipFile(zb,"w",zipfile.ZIP_STORED) as z:
        z.writestr("Lim/ok.bin",os.urandom(int(12.15*1048576))); z.writestr("Lim/big.bin",os.urandom(int(12.25*1048576)))
    open("/tmp/lim.zip","wb").write(zb.getvalue())
    if page.locator("#clearUp").is_visible(): page.click("#clearUp"); page.wait_for_timeout(200)
    page.set_input_files("#inArch","/tmp/lim.zip"); page.wait_for_selector("#tree .row >> text=Lim"); page.wait_for_timeout(500)
    page.fill("#optLimit","12.3"); page.dispatch_event("#optLimit","change"); page.wait_for_timeout(300)
    check("12.2 MB" in page.inner_text("#limitHint"),"limit 12.3 allows up to 12.2: "+page.inner_text("#limitHint"))
    check("1 of 2 selected" in page.inner_text("#summary") and "1 over" in page.inner_text("#skipsum"),"12.15 MB passes, 12.25 MB is held: "+page.inner_text("#summary"))
    page.fill("#optLimit","50"); page.dispatch_event("#optLimit","change"); page.wait_for_timeout(300)
    check("2 of 2 selected" in page.inner_text("#summary"),"raising the limit releases it")
    page.click("#clearUp"); page.wait_for_timeout(200)

    # ---- replace even when identical ----
    zb=io.BytesIO()
    with zipfile.ZipFile(zb,"w") as z: z.writestr("Pack/full.txt","content here")
    open("/tmp/same.zip","wb").write(zb.getvalue())
    def run_same(force):
        page.set_input_files("#inArch","/tmp/same.zip"); page.wait_for_selector("#tree .row >> text=Pack"); page.wait_for_timeout(400)
        page.locator("#segFile button",has_text="Replace").click(); page.wait_for_timeout(200)
        check(page.locator("#forceBox").is_visible(),"force option shows under Replace")
        if page.locator("#optForce").is_checked()!=force: page.locator("#optForce").click()
        print("DBG force",force,page.locator("#optForce").is_checked(),page.evaluate("localStorage.getItem('a_prefs')"))
        prev=page.inner_text("#tab-extract"); page.click("#go")
        res=""
        for _ in range(120):
            t=page.inner_text("#tab-extract")
            if ("1 replaced." if force else "1 already identical.") in t: res=t; break
            page.wait_for_timeout(200)
        page.wait_for_timeout(300); page.click("#clearUp"); page.wait_for_timeout(300); return res
    t1=run_same(False); check("already identical" in t1,"identical file is skipped by default")
    t2=run_same(True); check("1 replaced" in t2,"identical file counts as replaced when forced: "+t2[-200:])
    page.locator("#segFile button",has_text="Skip").count()

    # ---- split big PDFs on extract, join on download ----
    from reportlab.pdfgen import canvas as rl
    sm=io.BytesIO(); c=rl.Canvas(sm); c.drawString(50,700,"small"); c.showPage(); c.save()
    zb=io.BytesIO()
    with zipfile.ZipFile(zb,"w",zipfile.ZIP_STORED) as z:
        z.write("/tmp/claude-0/-home-claude/6391391a-3b18-5a3f-8f2c-4bad7241ce53/scratchpad/v4/fx/big12.pdf","Books/A.pdf"); z.writestr("Books/Ab.pdf",sm.getvalue())
    open("/tmp/books.zip","wb").write(zb.getvalue())
    page.set_input_files("#inArch","/tmp/books.zip"); page.wait_for_selector("#tree .row >> text=Books"); page.wait_for_timeout(500)
    page.fill("#optLimit","5"); page.dispatch_event("#optLimit","change"); page.wait_for_timeout(300)
    page.get_by_role("button",name="Open all").click(); page.wait_for_timeout(300)
    check(page.locator("#tree .tag.split").count()==1 and "1 PDF will be split" in page.inner_text("#summary"),"big PDF is tagged to split: "+page.inner_text("#summary"))
    page.screenshot(path=SHOTS+"/v7_split.png")
    page.click("#optSplit"); page.wait_for_timeout(200)
    check("1 over" in page.inner_text("#skipsum"),"split off: the PDF is held back again")
    page.click("#optSplit"); page.wait_for_timeout(200)
    page.click("#go")
    for _ in range(300):
        if sum(1 for p in paths() if p.startswith("Books/"))>=4: break
        page.wait_for_timeout(200)
    page.wait_for_timeout(600); ps=paths(); bk=[p for p in ps if p.startswith("Books/")]
    check(bk==["Books/A pages1to8.pdf","Books/A pages17to24.pdf","Books/A pages9to16.pdf","Books/Ab.pdf"] or sorted(bk)==sorted(["Books/A pages1to8.pdf","Books/A pages9to16.pdf","Books/A pages17to24.pdf","Books/Ab.pdf"]),"split into named page ranges: "+str(bk))
    check(all(blob_size[cur()[p]["sha"]]<=4.9*1048576 for p in bk if "pages" in p) and "Books/A.pdf" not in ps,"every part is under 4.9 MB")
    page.fill("#optLimit","50"); page.dispatch_event("#optLimit","change"); page.click("#clearUp"); page.wait_for_timeout(300)
    tab(page,"files"); goto_dir("Books"); page.wait_for_timeout(300)
    page.locator("#selAllBox").check(); page.click("#actDownload"); page.wait_for_selector(".layer.open")
    check("Join continuous PDF parts" in page.inner_text(".layer.open") and "A pages1to24.pdf" in page.inner_text(".layer.open"),"download offers to join the parts")
    page.screenshot(path=SHOTS+"/v7_join.png")
    with page.expect_download(timeout=60000) as dl: sheet_click(page,"Download")
    names=zipfile.ZipFile(dl.value.path()).namelist()
    check(sorted(names)==["A pages1to24.pdf","Ab.pdf"],"zip holds the joined PDF and the other file: "+str(names))
    from pypdf import PdfReader
    zf=zipfile.ZipFile(dl.value.path()); check(len(PdfReader(io.BytesIO(zf.read("A pages1to24.pdf"))).pages)==24,"joined PDF has all 24 pages")
    page.wait_for_timeout(400)
    page.locator("#selAllBox").uncheck()
    for nm in ["pages1to8","pages17to24"]: page.locator("#libList .row",has_text=nm).locator("input").check()
    page.click("#actDownload"); page.wait_for_selector(".layer.open")
    check("Join continuous PDF parts" not in page.inner_text(".layer.open"),"non-continuous parts are not offered for joining")
    sheet_click(page,"Cancel"); page.wait_for_timeout(300); page.locator("#selAllBox").check(); page.locator("#selAllBox").uncheck()
    page.locator("#libCrumbs button").first.click()

    # ---- responsive screenshots with viewer ----
    for nm,w,h in [("tablet",820,1180),("desktop",1440,900),("small",320,640)]:
        page.set_viewport_size({"width":w,"height":h}); page.wait_for_timeout(250)
        page.screenshot(path=SHOTS+f"/v4_files_{nm}.png")
        check(page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"),f"no overflow {w}px")
    page.set_viewport_size({"width":1440,"height":900})
    openf("Docs/sample.docx"); page.wait_for_selector(".docx-wrapper",timeout=20000); page.wait_for_timeout(500)
    page.screenshot(path=SHOTS+"/v4_docx_desktop.png"); close_viewer()
    errors=[e for e in errors if "sandboxed" not in e and not e.startswith("Failed to load resource")]
    check(not errors,"no console errors: %s"%errors[:5])
    # ---- leaving: two quick backs from the login screen ----
    OPENMENU(); page.locator(".layer.open .btn",has_text="Log out").click(); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(900)
    page.go_back(); page.wait_for_timeout(500)
    check(page.locator("#s-home").is_visible(),"one back on the login screen stays")
    page.go_back(); page.wait_for_timeout(800)
    check("about:blank" in page.url,"two quick backs leave the site: "+page.url)
    b.close()
print("\nFAILS:",fails)
