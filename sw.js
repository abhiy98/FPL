var CACHE = "pricewatch-v5";
var SHELL = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

function isExternalData(url){
  return url.indexOf("fantasy.premierleague.com") !== -1 ||
    url.indexOf("corsproxy.io") !== -1 ||
    url.indexOf("allorigins.win") !== -1 ||
    url.indexOf("codetabs.com") !== -1 ||
    url.indexOf("/.netlify/functions/") !== -1 ||
    /\/fpl(?:\?|$)/.test(url) ||
    /\/team(?:\?|$)/.test(url) ||
    /\/price-data(?:\?|$)/.test(url);
}

self.addEventListener("fetch", function(e){
  var url = e.request.url;
  if (isExternalData(url)) return;

  var isPageRequest = e.request.mode === "navigate" || url.indexOf("index.html") !== -1 || url.endsWith("/");
  if (isPageRequest){
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).then(function(res){
        if (res.ok && e.request.method === "GET"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        if (e.request.method === "GET" && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
