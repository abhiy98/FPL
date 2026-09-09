var CACHE = "pricewatch-v8";
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
    /\/price-data(?:\?|$)/.test(url) ||
    url.indexOf("livefpl.us/api/") !== -1 ||
    url.indexOf("resources.premierleague.com/premierleague/photos/") !== -1;
}

async function injectEnhancements(response){
  if (!response || !response.ok) return response;
  var type=response.headers.get("content-type") || "";
  if (type.indexOf("text/html") === -1) return response;
  var html=await response.text();
  if (html.indexOf("/status-fix.js") === -1) html=html.replace(/<\/body>/i,'<script src="/status-fix.js"></script></body>');
  if (html.indexOf("/jersey-fix.js") === -1) html=html.replace(/<\/body>/i,'<script src="/jersey-fix.js"></script></body>');
  if (html.indexOf("/scroll-fix.js") === -1) html=html.replace(/<\/body>/i,'<script src="/scroll-fix.js"></script></body>');
  var headers=new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html,{status:response.status,statusText:response.statusText,headers:headers});
}

self.addEventListener("fetch", function(e){
  var url = e.request.url;
  if (isExternalData(url)) return;

  var isPageRequest = e.request.mode === "navigate" || url.indexOf("index.html") !== -1 || url.endsWith("/");
  if (isPageRequest){
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).then(function(res){
        return injectEnhancements(res).then(function(finalRes){
          if (finalRes.ok && e.request.method === "GET"){
            var copy = finalRes.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
          }
          return finalRes;
        });
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
