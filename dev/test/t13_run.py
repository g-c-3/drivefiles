import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def crumb(page): return page.locator("#libCrumbs button").all_inner_texts()[-1].strip()
def back(page): page.go_back(); page.wait_for_timeout(700)
def enter(page,n): page.locator("#libList .row",has_text=n).first.click(); page.wait_for_timeout(600)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800})
    ctx.add_init_script(__import__("auto").AUTO); page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    page.goto(f"http://127.0.0.1:{port}/index.html"); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row"); page.wait_for_timeout(900)
    for n in ["QPs","Drive","Physics","2019"]: enter(page,n)
    check(crumb(page)=="2019","deep in Drive/Physics/2019")
    # extract tab from a subfolder defaults to root
    page.click("#toolExtract"); page.wait_for_timeout(700)
    t=page.locator("#exDest").inner_text()
    check("QPs" not in t and "2019" not in t,"extract destination is the repo root by default: %r"%t.replace("\n"," "))
    back(page)
    check(page.locator("#tab-files").is_visible() and crumb(page)=="2019","back from Extract returns to the last viewed folder")
    back(page); check(crumb(page)=="Physics","back climbs to Physics")
    back(page); check(crumb(page)=="Drive","back climbs to Drive"); back(page)
    back(page); back(page)
    check(crumb(page) not in ("QPs","Drive","Physics","2019"),"back reaches the root")
    page.wait_for_timeout(300)
    check(page.locator(".toast",has_text="log out").count()>=1,"at the root: 'Press back again to log out'")
    # climbing then no forward trap
    enter(page,"QPs"); enter(page,"Drive")
    page.locator("#libCrumbs button").first.click(); page.wait_for_timeout(500)   # breadcrumb jump to root
    back(page); page.wait_for_timeout(300)
    check(page.locator("#shell").is_visible() and page.locator(".toast",has_text="log out").count()>=1,"after a breadcrumb jump to root, back asks to log out (no re-entering the subfolder)")
    # setting on
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .menu")
    page.locator(".layer.open .menu .srow, .layer.open .menu label",has_text="Extract into the folder I").first.click(); page.wait_for_timeout(400)
    page.keyboard.press("Escape"); page.wait_for_timeout(600)
    enter(page,"QPs"); page.click("#toolExtract"); page.wait_for_timeout(700)
    check("QPs" in page.locator("#exDest").inner_text(),"setting on: extract destination is the folder being browsed")
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("FAILS:",fails); raise SystemExit(1 if fails else 0)
