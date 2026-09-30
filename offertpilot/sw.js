/* OffertPilot service worker: app-shell cache, stale-while-revalidate */
var C='op-v1';
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(C).then(function(c){
    return c.addAll(['./','index.html','app.js','offers.js','icon-192.png','icon.svg','manifest.json']);
  }).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var url=e.request.url;
  if(e.request.method!=='GET'||url.indexOf(location.origin)!==0)return;
  e.respondWith(
    caches.open(C).then(function(c){
      return c.match(e.request).then(function(hit){
        var net=fetch(e.request).then(function(res){
          if(res&&res.status===200)c.put(e.request,res.clone());
          return res;
        }).catch(function(){return hit;});
        return hit||net;
      });
    })
  );
});
