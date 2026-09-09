(function(){
  "use strict";

  var photoById={};
  var loaded=false;
  var observer;

  function ensureStyles(){
    if(document.getElementById("fpl-jersey-style"))return;
    var style=document.createElement("style");
    style.id="fpl-jersey-style";
    style.textContent=".fpl-jersey{width:30px;height:38px;object-fit:contain;object-position:center bottom;flex:none;display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}.player-cell{gap:8px}.player-text{min-width:0}";
    document.head.appendChild(style);
  }

  function addImages(){
    var rows=document.querySelectorAll("#tbody tr[data-player-id]");
    rows.forEach(function(row){
      var id=row.getAttribute("data-player-id");
      var name=row.querySelector(".player-name");
      if(!id||!name)return;
      var existing=name.parentNode.querySelector(".fpl-jersey");
      if(existing)return;
      var code=photoById[String(id)];
      if(!code)return;
      var img=document.createElement("img");
      img.className="fpl-jersey";
      img.alt="";
      img.loading="lazy";
      img.decoding="async";
      img.src="https://resources.premierleague.com/premierleague/photos/players/110x140/p"+encodeURIComponent(code)+".png";
      img.onerror=function(){
        if(this.dataset.fallback){this.style.display="none";return;}
        this.dataset.fallback="1";
        this.src="https://resources.premierleague.com/premierleague/photos/players/110x140/"+encodeURIComponent(code)+".png";
      };
      name.parentNode.insertBefore(img,name);
    });
  }

  async function load(){
    ensureStyles();
    try{
      var response=await fetch("/fpl?path=bootstrap-static/",{cache:"no-store"});
      if(!response.ok)return;
      var data=await response.json();
      (data.elements||[]).forEach(function(player){
        if(player&&player.id!=null&&player.code!=null)photoById[String(player.id)]=String(player.code);
      });
      loaded=true;
      addImages();
    }catch(e){}
  }

  function start(){
    ensureStyles();
    var tbody=document.getElementById("tbody");
    if(tbody){
      observer=new MutationObserver(function(){if(loaded)addImages();});
      observer.observe(tbody,{childList:true});
    }
    load();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
