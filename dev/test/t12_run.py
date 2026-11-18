import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def openf(page,d,n):
    if d: page.locator("#libList .row",has_text=d).first.click(); page.wait_for_timeout(500)
    page.locator("#libList .row",has_text=n).first.click(); page.wait_for_selector("#viewer:not([hidden])"); page.wait_for_timeout(900)
def closev(page):
    page.evaluate("window.AtlasViewer.close(true)"); page.wait_for_timeout(500)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":360,"height":700},device_scale_factor=2)
    ctx.add_init_script(__import__("auto").AUTO); page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    page.goto(f"http://127.0.0.1:{port}/index.html"); page.wait_for_selector("#s-home:not([hidden])")
    # reader
    page.click("#s-home .infobtn"); page.wait_for_selector("#viewer:not([hidden]) .md",timeout=15000); page.wait_for_timeout(800)
    check(not page.locator("#viewer .vbar").is_visible(),"reader: top bar hidden")
    check(not page.locator("#viewer .vsubbar").is_visible(),"reader: preview/source bar hidden")
    check(page.locator("#viewer .vclose").is_visible(),"reader: floating close visible")
    check(page.evaluate("getComputedStyle(document.querySelector('#viewer .md p')).textAlign")=="justify","reader: paragraphs justified")
    check(page.evaluate("document.querySelector('#viewer .vscroll').scrollTop")==0,"reader starts at top")
    page.screenshot(path=SHOTS+"/v13_reader.png")
    page.click("#viewer .vclose"); page.wait_for_timeout(700)
    check(page.locator("#viewer").is_hidden(),"floating close closes it")
    # login
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen"); page.wait_for_selector("#libList .row"); page.wait_for_timeout(800)
    # settings row
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .menu")
    check(page.locator(".layer.open .menu",has_text="Justify text when viewing").count()==1,"settings has Justify option")
    page.keyboard.press("Escape"); page.wait_for_timeout(500)
    # md viewer
    openf(page,"Docs","notes.md")
    check(page.locator("#viewer .vbar").is_visible() and not page.locator("#viewer .vclose").is_visible(),"normal file keeps top bar, no floating close")
    j=page.locator("#viewer .vactions button[aria-label^='Justify']")
    check(j.count()==1 and "dim" not in (j.get_attribute("class") or ""),"md: justify button active")
    check(page.evaluate("getComputedStyle(document.querySelector('#viewer .md p')).textAlign")!="justify","md: off by default")
    j.click(); page.wait_for_timeout(300)
    check(page.evaluate("document.querySelector('#viewer .md').classList.contains('justify')"),"md: justify on")
    page.screenshot(path=SHOTS+"/v13_md.png")
    closev(page)
    # json greyed
    openf(page,None,"data.json")
    j=page.locator("#viewer .vactions button[aria-label^='Justify']")
    check(j.count()==1 and "dim" in (j.get_attribute("class") or ""),"json: justify greyed out")
    j.click(force=True); page.wait_for_timeout(300)
    check(page.locator(".toast",has_text="isn't useful for code").count()>=1,"json: note shown")
    check(not page.evaluate("document.querySelector('#viewer .cmhost')&&document.querySelector('#viewer .cmhost').classList.contains('justify')"),"json: never justified")
    page.screenshot(path=SHOTS+"/v13_json.png")
    closev(page)
    # lock overlay gone
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(900)
    check(page.locator(".lockfx").count()==0,"lock icon overlay removed on the lock screen")
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("FAILS:",fails); raise SystemExit(1 if fails else 0)
