import os
BASE0=os.path.dirname(os.path.abspath(__file__))
exec(open(BASE0+"/t5_head.py").read())
fails=[]
def check(c,m):
    print(("PASS " if c else "FAIL ")+m, flush=True)
    if not c: fails.append(m)
def login(page):
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]"); page.fill(".layer.open input[type=password]","a"); page.keyboard.press("Enter")
GATE=".layer.gate.open"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800}); page=ctx.new_page(); errors=[]; page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("https://api.github.com/**",handler)
    page.goto(f"http://127.0.0.1:{port}/index.html"); page.wait_for_selector("#s-home:not([hidden])")
    # info buttons
    check(page.locator("#s-home .infobtn").is_visible(),"info button on the login screen")
    page.click("#s-home .infobtn"); page.wait_for_selector("#viewer:not([hidden]) .md",timeout=15000)
    check("Disclaimer" in page.locator("#viewer").inner_text(),"info button opens the README in the viewer (disclaimer at the top)")
    page.keyboard.press("Escape"); page.wait_for_timeout(700)
    page.evaluate("window.AtlasViewer&&window.AtlasViewer.close(true)"); page.wait_for_timeout(300)
    page.click("#homeAdd"); check(page.locator("#s-setup .infobtn").is_visible(),"info button on the add-repository screen")
    page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen")
    page.wait_for_selector(GATE,timeout=20000); page.wait_for_timeout(500)
    check("#shell" and page.locator("#shell").is_hidden(),"app stays closed behind the notice")
    page.keyboard.press("Escape"); page.mouse.click(5,5); page.wait_for_timeout(500)
    check(page.locator(GATE).count()==1,"notice can't be dismissed by Escape or backdrop")
    check(page.locator(GATE+" .foot .btn").count()==2,"two buttons: disagree / accept")
    # disagree -> second dialog
    page.locator(GATE+" .foot .btn",has_text="don't agree").click(); page.wait_for_timeout(600)
    check(page.locator(".layer.gate.open").count()==2,"disagree opens a second dialog")
    page.locator(".layer.gate.open .foot .btn",has_text="Read it again").last.click(); page.wait_for_timeout(600)
    check(page.locator(".layer.gate.open").count()==1,"read it again returns to the notice")
    # disagree -> log out; remembered
    page.locator(GATE+" .foot .btn",has_text="don't agree").click(); page.wait_for_timeout(600)
    page.locator(".layer.gate.open .foot .btn",has_text=__import__("re").compile("^Log out$")).last.click(); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(500)
    check(page.locator("#homeSel option").count()==1 and page.locator("#homeSel option").first.inner_text().startswith("me/qp"),"log out keeps the saved repository")
    login(page); page.wait_for_selector(GATE,timeout=20000)
    check(True,"notice shows again at next login after log out")
    # refresh before deciding
    page.reload(); page.wait_for_selector("#s-home:not([hidden])"); login(page); page.wait_for_selector(GATE,timeout=20000)
    check(page.locator("#shell").is_hidden(),"after a refresh the notice is asked again")
    # accept
    page.locator(GATE+" .foot .btn.primary").click(); page.wait_for_selector("#shell:not([hidden])"); page.wait_for_selector("#libList .row",timeout=20000)
    check(True,"accepting enters the app")
    # settings About
    page.click("#menuBtn"); page.wait_for_selector(".layer.open .about-pill"); 
    page.click(".layer.open .about-pill"); page.wait_for_selector(".layer.open .about"); page.wait_for_timeout(500)
    t=page.locator(".layer.open .about").inner_text()
    check("Gokul Chandar" in t and "gc3thedev@gmail.com" in t,"About shows credit and email")
    check(page.locator(".layer.open .about a[href='mailto:gc3thedev@gmail.com']").count()==1,"email is a mailto link")
    page.screenshot(path=SHOTS+"/v11_about.png")
    page.keyboard.press("Escape"); page.wait_for_timeout(500); page.keyboard.press("Escape"); page.wait_for_timeout(500)
    # not shown again
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])")
    check(page.locator("#s-home .about-pill").is_visible(),"About pill on the login screen")
    login(page); page.wait_for_selector("#shell:not([hidden])",timeout=20000); page.wait_for_timeout(1500)
    check(page.locator(".layer.gate").count()==0,"notice is not shown again after accepting")
    # delete token & logout on a fresh repo
    page.evaluate("document.querySelector('#lockBtn').click()"); page.wait_for_selector("#s-home:not([hidden])")
    page.click("#homeAdd"); page.fill("#cfgOwner","me"); page.fill("#cfgRepo","qp2"); page.fill("#cfgToken","test-token"); page.fill("#cfgPass","a"); page.click("#setupOpen")
    page.wait_for_timeout(2500); print("ERR:",page.locator("#setupErr").inner_text())
    page.wait_for_selector(GATE,timeout=20000); page.wait_for_timeout(500)
    page.locator(GATE+" .foot .btn",has_text="don't agree").click(); page.wait_for_timeout(600)
    page.locator(".layer.gate.open .foot .btn",has_text="Delete token").last.click(); page.wait_for_selector("#s-home:not([hidden])"); page.wait_for_timeout(500)
    names=page.locator("#homeSel option").all_inner_texts()
    check(len(names)==1 and "qp2" not in names[0],"delete token & log out removes only that repository: %s"%names)
    page.screenshot(path=SHOTS+"/v11_home.png")
    check(not errors,"no page errors: %s"%errors[:3])
    b.close()
print("FAILS:",fails); raise SystemExit(1 if fails else 0)
