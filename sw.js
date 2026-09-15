var CACHE = "pricewatch-v24";
var SHELL = ["./manifest.json", "./icon-192.png", "./icon-512.png", "./pwa-enhance.js", "./jersey-fix.js", "./team-menu.js"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil((async function(){
    var keys=await caches.keys();
    await Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    if("navigationPreload" in self.registration){try{await self.registration.navigationPreload.enable();}catch(e){}}
  })());
  self.clients.claim();
});

function isExternalData(url){
  return url.indexOf("fantasy.premierleague.com")!==-1||
    url.indexOf("corsproxy.io")!==-1||
    url.indexOf("allorigins.win")!==-1||
    url.indexOf("codetabs.com")!==-1||
    url.indexOf("/.netlify/functions/")!==-1||
    /\/fpl(?:\?|$)/.test(url)||
    /\/team(?:\?|$)/.test(url)||
    /\/price-data(?:\?|$)/.test(url)||
    url.indexOf("livefpl.us/api/")!==-1||
    url.indexOf("resources.premierleague.com/premierleague/photos/")!==-1;
}

function isEnhancementScript(url){
  return /\/(?:jersey-fix|pwa-enhance|team-menu)\.js(?:\?|$)/.test(url);
}

self.addEventListener("fetch",function(e){
  var url=e.request.url;
  if(isExternalData(url))return;

  if(isEnhancementScript(url)){
    e.respondWith(caches.match(e.request).then(function(cached){
      return fetch(e.request,{cache:"no-store"}).then(function(res){
        if(res.ok){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,copy);});
        }
        return res;
      }).catch(function(){return cached;});
    }));
    return;
  }

  var isPageRequest=e.request.mode==="navigate"||url.indexOf("index.html")!==-1||url.endsWith("/");
  if(isPageRequest){
    e.respondWith((async function(){
      var cached=await caches.match(e.request);
      try{
        var preload="";
        if(e.preloadResponse)preload=await e.preloadResponse;
        var fresh=preload||await fetch(e.request,{cache:"no-store"});
        if(fresh.ok&&e.request.method==="GET"){
          var copy=fresh.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,copy);});
        }
        return fresh;
      }catch(err){
        return cached||caches.match("./index.html");
      }
    })());
    return;
  }

  e.respondWith(caches.match(e.request).then(function(cached){
    return cached||fetch(e.request).then(function(res){
      if(e.request.method==="GET"&&res.ok){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,copy);});
      }
      return res;
    }).catch(function(){return cached;});
  }));
});
