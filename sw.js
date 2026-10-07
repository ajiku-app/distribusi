const C='dm-v45',F=['./','index.html','neon.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='dm-fonts').map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Hanya file statis milik aplikasi yang di-cache. Login (/api/neonauth) dan data Neon (domain lain) tidak pernah disentuh.
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
if(r.method==='GET'&&(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')){e.respondWith(caches.open('dm-fonts').then(c=>c.match(r).then(h=>{const n=fetch(r).then(x=>{if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}).catch(()=>h);return h||n})));return}
if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;
e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(C).then(y=>y.put(r,c))}return x}).catch(()=>caches.match(r).then(x=>x||caches.match('index.html'))))});
