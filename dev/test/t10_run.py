import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def login(page):
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]","a"); page.keyboard.press("Enter"); page.wait_for_selector("#shell:not([hidden])"); page.wait_for_timeout(1800)
def lock(page):
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])",timeout=10000); page.wait_for_timeout(900)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800}); page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    page.goto(f"http://127.0.0.1:{port}/index.html"); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row"); page.wait_for_timeout(800)
    # subfolder
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(600)
    inside=page.locator("#libList .row").first.inner_text()
    lock(page); login(page)
    check(page.locator("#libList .row",has_text="Docs").count()==0 or page.locator("#libList .row").first.inner_text()==inside,"reopens in the same subfolder")
    # history
    page.click("#toolHistory"); page.wait_for_selector("#tab-history:not([hidden])"); page.wait_for_timeout(500)
    lock(page); login(page)
    check(page.locator("#tab-history").is_visible(),"reopens on History")
    page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(500)
    page.click("#toolExtract"); page.wait_for_selector("#tab-extract:not([hidden])"); page.wait_for_timeout(500)
    lock(page); login(page)
    check(page.locator("#tab-extract").is_visible(),"reopens on Extract")
    page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(500)
    # a file
    page.locator("#libList .row",has_text=".md").first.click() if page.locator("#libList .row",has_text=".md").count() else None
    page.wait_for_timeout(1000)
    if page.locator("#viewer:not([hidden])").count():
        lock(page); login(page); page.wait_for_timeout(1200)
        check(page.locator("#viewer:not([hidden])").count()==1,"reopens the file that was open")
        page.keyboard.press("Escape"); page.wait_for_timeout(600)
    # settings
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .mgrp"); page.wait_for_timeout(500)
    lock(page); login(page); page.wait_for_timeout(1500)
    check(page.locator(".layer.open .mgrp").count()>=1,"reopens Settings")
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("\nFAILS:",fails)
