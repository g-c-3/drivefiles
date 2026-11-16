/* Atlas service worker: keeps the app files for offline use. Never touches api.github.com. */
const VERSION="atlas-71ce93282b";
const PRECACHE=["./", "app/app.css", "app/app.js", "app/convert.js", "app/icons/icon-192.png", "app/icons/icon-512.png", "app/icons/icon.svg", "app/pdftools.js", "app/theme.js", "app/vendor/7zz.wasm", "app/vendor/edit.js", "app/vendor/office.js", "app/vendor/pdf/pdf.min.mjs", "app/vendor/pdf/pdf.worker.min.mjs", "app/vendor/pdflib.js", "app/vendor/pptx-template.js", "app/vendor/view.js", "app/vendor/w7worker.js", "app/vendor/zip.min.js", "app/viewer.js", "index.html", "manifest.webmanifest"];
self.addEventListener("install",e=>{
  e.waitUntil((async()=>{const c=await caches.open(VERSION);await Promise.all(PRECACHE.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})));self.skipWaiting();})());
});
self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{for(const k of await caches.keys()){if(k.startsWith("atlas-")&&k!==VERSION&&k!=="atlas-blobs"&&k!=="atlas-share")await caches.delete(k);}await self.clients.claim();})());
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method==="POST"&&u.origin===location.origin&&u.searchParams.get("share")==="1"){
    e.respondWith((async()=>{
      try{
        const fd=await r.formData(), c=await caches.open("atlas-share");
        for(const k of await c.keys()) await c.delete(k);
        let n=0;
        for(const f of fd.getAll("files")){ if(f&&f.name!==undefined){ await c.put("/__share/"+(n++)+"/"+Date.now(),new Response(f,{headers:{"x-name":encodeURIComponent(f.name),"content-type":f.type||"application/octet-stream"}})); } }
      }catch(x){}
      return Response.redirect(new URL("./?share=1",self.registration.scope).href,303);
    })());
    return;
  }
  if(r.method!=="GET"||u.origin!==location.origin||u.pathname.indexOf("/__blob/")>=0) return;
  e.respondWith((async()=>{
    const c=await caches.open(VERSION);
    const hit=await c.match(r,{ignoreSearch:true})||(r.mode==="navigate"?await c.match("./"):null);
    const net=fetch(r).then(res=>{if(res&&res.ok&&res.status===200)c.put(r,res.clone());return res;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}
    const res=await net;return res||new Response("Offline",{status:503});
  })());
});
