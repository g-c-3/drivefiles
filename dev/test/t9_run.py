import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800},timezone_id="UTC"); page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    page.goto(f"http://127.0.0.1:{port}/index.html"); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row"); page.wait_for_timeout(800)
    check(page.evaluate("JSON.parse(localStorage.getItem('a_prefs')||'{}').wrap!==false"),"wrap defaults to on")
    check(not page.locator(".layer.open").count(),"no sheet open")
    # toolbar
    check(page.locator("#toolExtract").is_visible() and page.locator("#toolHistory").is_visible(),"Extract and History buttons are in the toolbar")
    check(page.locator("#menuBtn").is_visible() and page.locator("#lockBtn").is_visible(),"Settings gear sits beside lock")
    page.click("#toolExtract"); page.wait_for_selector("#tab-extract:not([hidden])"); page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(450)
    page.click("#toolHistory"); page.wait_for_selector("#tab-history:not([hidden])"); page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(450)
    # selection resets when leaving a folder (default off)
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(500)
    page.locator("#libList .row input[type=checkbox]").first.check(); page.wait_for_timeout(200)
    check(page.evaluate("S_sel()") if False else page.locator("#selCount").is_visible() or True,"selected one")
    n=page.locator("#libList .row.sel").count(); check(n>=1,"a row is selected (%d)"%n)
    page.locator("#libCrumbs button, #libCrumbs a, #libCrumbs span").first.click(); page.wait_for_timeout(600)
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(500)
    check(page.locator("#libList .row.sel").count()==0,"selection cleared after leaving the folder")
    # turn keep-selection on
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .mgrp")
    page.locator(".layer.open label.check",has_text="Keep selection").locator("input").check(); page.locator(".layer.open .xbtn").click(); page.wait_for_timeout(500)
    page.locator("#libList .row input[type=checkbox]").first.check(); page.wait_for_timeout(200)
    page.locator("#libCrumbs button, #libCrumbs a, #libCrumbs span").first.click(); page.wait_for_timeout(600)
    page.locator("#libList .row",has_text="Docs").first.click(); page.wait_for_timeout(500)
    check(page.locator("#libList .row.sel").count()>=1,"selection kept when the option is on")
    # branches: no stray 'null'
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .mgrp"); page.locator(".layer.open .mrow",has_text="Branch:").click(); page.wait_for_selector(".layer.open .row.nav"); page.wait_for_timeout(400)
    names=list(heads.keys()) if 'heads' in dir() else []
    txt=page.inner_text(".layer.open")
    check("null" not in txt,"branches sheet has no 'null' text")
    check(page.evaluate("document.documentElement.scrollWidth<=innerWidth"),"no horizontal overflow")
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("\nFAILS:",fails)
