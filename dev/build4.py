import os,shutil,hashlib,json,subprocess
B="/tmp/claude-0/-home-claude/6391391a-3b18-5a3f-8f2c-4bad7241ce53/scratchpad"
V4=B+"/v4"; OUT="/home/claude/site"
shutil.rmtree(OUT,ignore_errors=True)
for d in ["app/vendor/pdf","app/icons"]: os.makedirs(OUT+"/"+d)
def cp(src,dst): shutil.copy(src,OUT+"/"+dst)
cp(V4+"/src/app2.js","app/app.js"); cp(V4+"/src/app.css","app/app.css"); cp(V4+"/src/viewer.js","app/viewer.js"); cp(V4+"/src/convert.js","app/convert.js"); cp(V4+"/src/pdftools.js","app/pdftools.js"); cp(V4+"/src/theme.js","app/theme.js")
cp(V4+"/src/pptx-template.js","app/vendor/pptx-template.js")
for n in ["edit","view","office","pdflib"]: cp(V4+"/vendor-src/out/%s.js"%n,"app/vendor/%s.js"%n)
cp(B+"/ziplib-dl/package/dist/zip.min.js","app/vendor/zip.min.js"); cp(B+"/w7z-dl/package/7zz.wasm","app/vendor/7zz.wasm")
handler='\nself.onmessage=async function(e){var m=e.data;try{var r=await w7extract(SevenZip,m.wasm,m.name,m.bytes,m.password);var tr=[];r.files.forEach(function(f){tr.push(f.data.buffer);});self.postMessage({id:m.id,res:r},tr);}catch(err){self.postMessage({id:m.id,error:String(err&&err.message||err)});}};\n'
open(OUT+"/app/vendor/w7worker.js","w").write(open(B+"/w7z-dl/package/7zz.umd.js").read()+"\n;"+open(B+"/build/w7glue.js").read()+handler)
pd=V4+"/vendor-src/node_modules/pdfjs-dist/legacy/build/"
cp(pd+"pdf.min.mjs","app/vendor/pdf/pdf.min.mjs"); cp(pd+"pdf.worker.min.mjs","app/vendor/pdf/pdf.worker.min.mjs")
shutil.copytree(V4+"/vendor-src/node_modules/pdfjs-dist/cmaps",OUT+"/app/vendor/pdf/cmaps"); shutil.copytree(V4+"/vendor-src/node_modules/pdfjs-dist/standard_fonts",OUT+"/app/vendor/pdf/standard_fonts")
# licences
os.makedirs(OUT+"/app/licenses")
for src,dst in [(B+"/w7z-dl/package/License.txt","7-zip-wasm-LICENSE.txt"),(B+"/w7z-dl/package/unRarLicense.txt","unrar-LICENSE.txt")]: cp(src,"app/licenses/"+dst)
nm=V4+"/vendor-src/node_modules/"
for pkg,f in [("pdfjs-dist","LICENSE"),("xlsx","LICENSE"),("codemirror","LICENSE"),("marked","LICENSE.md"),("highlight.js","LICENSE"),("jszip","LICENSE.markdown"),("docx-preview","LICENSE"),("dompurify","LICENSE"),("pdf-lib","LICENSE.md")]:
    p=nm+pkg+"/"+f
    if os.path.exists(p): cp(p,"app/licenses/%s-LICENSE.txt"%pkg)
# icons
svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5563ff"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#12b5d8"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round"><circle cx="256" cy="256" r="136"/><path d="M120 256h272"/><path d="M256 120c52 44 52 228 0 272"/><path d="M256 120c-52 44-52 228 0 272"/></g></svg>'''
open(OUT+"/app/icons/icon.svg","w").write(svg)
open(OUT+"/.nojekyll","w").write("")
open(OUT+"/manifest.webmanifest","w").write(json.dumps({"name":"Atlas","short_name":"Atlas","start_url":".","scope":".","display":"standalone","background_color":"#060914","theme_color":"#060914","icons":[{"src":"app/icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"app/icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"},{"src":"app/icons/icon.svg","sizes":"any","type":"image/svg+xml"}]},indent=1))
head='''<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#060914">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Atlas</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="app/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="app/icons/icon-192.png">
<link rel="stylesheet" href="app/app.css">
<script src="app/theme.js"></script>
</head>
<body>
'''
open(OUT+"/index.html","w").write(head+open(V4+"/src/body.html").read()+'<script src="app/app.js"></script>\n</body>\n</html>\n')
# PNG icons via playwright
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch()
    for s in (192,512):
        pg=b.new_page(viewport={"width":s,"height":s})
        pg.set_content('<body style="margin:0;background:transparent">'+svg.replace('<svg ','<svg width="%d" height="%d" '%(s,s))+'</body>')
        pg.screenshot(path=OUT+"/app/icons/icon-%d.png"%s,omit_background=True)
    b.close()
# service worker with versioned precache
files=[]
for r,_,fs in os.walk(OUT):
    for f in fs:
        rel=os.path.relpath(os.path.join(r,f),OUT).replace(os.sep,"/")
        files.append(rel)
h=hashlib.sha1()
for f in sorted(files): h.update(f.encode()); h.update(open(OUT+"/"+f,"rb").read())
ver=h.hexdigest()[:10]
pre=[f for f in sorted(files) if not f.startswith("app/vendor/pdf/cmaps/") and not f.startswith("app/vendor/pdf/standard_fonts/") and not f.startswith("app/licenses/") and f not in ("sw.js",".nojekyll")]
pre=["./"]+pre
sw='''/* Atlas service worker: keeps the app files for offline use. Never touches api.github.com. */
const VERSION="atlas-%s";
const PRECACHE=%s;
self.addEventListener("install",e=>{
  e.waitUntil((async()=>{const c=await caches.open(VERSION);await Promise.all(PRECACHE.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})));self.skipWaiting();})());
});
self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{for(const k of await caches.keys()){if(k.startsWith("atlas-")&&k!==VERSION&&k!=="atlas-blobs")await caches.delete(k);}await self.clients.claim();})());
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin||u.pathname.indexOf("/__blob/")>=0) return;
  e.respondWith((async()=>{
    const c=await caches.open(VERSION);
    const hit=await c.match(r,{ignoreSearch:true})||(r.mode==="navigate"?await c.match("./"):null);
    const net=fetch(r).then(res=>{if(res&&res.ok&&res.status===200)c.put(r,res.clone());return res;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}
    const res=await net;return res||new Response("Offline",{status:503});
  })());
});
'''%(ver,json.dumps(pre))
open(OUT+"/sw.js","w").write(sw)
tot=sum(os.path.getsize(OUT+"/"+f) for f in files)
print("version",ver,"files",len(files),"MB",round(tot/1048576,2))
big=sorted(((os.path.getsize(OUT+"/"+f),f) for f in files),reverse=True)[:6]; print(big)
