'use strict';
// Bump this version whenever an application asset changes.
const CACHE = '1438-hub-v140';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./approval.js','./enhancements.js','./manifest.json','./assets/home-hero.jpg','./assets/engineer-castle-red.jpg','./assets/engineer-castle-white.png','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable-512.png','./assets/apple-touch-icon.png'];
const assetURLs = new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('1438-hub-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    // Network first: a deployment never waits for a stale cached index to expire.
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-cache'});
        if(response.ok){const cache=await caches.open(CACHE);await cache.put(new URL('./index.html',self.registration.scope),response.clone());return response;}
        throw new Error('Navigation unavailable');
      }catch{return (await caches.match(new URL('./index.html',self.registration.scope)))||Response.error();}
    })());
    return;
  }
  if(!assetURLs.has(url.href))return;
  // Network first for code and manifest, cache first for versioned local imagery.
  if(/\.(?:js|css|json)$/.test(url.pathname)){
    event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-cache'});if(!response.ok)throw new Error('Asset unavailable');const cache=await caches.open(CACHE);await cache.put(request,response.clone());return response;}catch{return (await caches.match(request))||Response.error();}})());
  }else{
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
  }
});
