/* Atlas service worker: keeps the app files for offline use. Never touches api.github.com. */
const VERSION="atlas-5bbba9a514";
const PRECACHE=["./", "app/app.css", "app/app.js", "app/convert.js", "app/icons/icon-192.png", "app/icons/icon-512.png", "app/icons/icon.svg", "app/pdftools.js", "app/theme.js", "app/vendor/7zz.wasm", "app/vendor/edit.js", "app/vendor/office.js", "app/vendor/pdf/pdf.min.mjs", "app/vendor/pdf/pdf.worker.min.mjs", "app/vendor/pdflib.js", "app/vendor/pptx-template.js", "app/vendor/view.js", "app/vendor/w7worker.js", "app/vendor/zip.min.js", "app/viewer.js", "index.html", "manifest.webmanifest"];
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
