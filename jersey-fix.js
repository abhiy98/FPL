(function(){
  "use strict";

  var playerById={};
  var teamById={};
  var loaded=false;
  var observer;

  var teamColors={
    "1":["#DB0007","#FFFFFF"],
    "2":["#670B0B","#95BFE5"],
    "3":["#DA291C","#000000"],
    "4":["#E30613","#FFFFFF"],
    "5":["#0057B8","#FFFFFF"],
    "6":["#034694","#FFFFFF"],
    "7":["#8BB8E8","#FFFFFF"],
    "8":["#1B458F","#ED2939"],
    "9":["#003399","#FFFFFF"],
    "10":["#000000","#FFFFFF"],
    "11":["#000000","#F5A800"],
    "12":["#0000FF","#FFFFFF"],
    "13":["#FFCD00","#0067B1"],
    "14":["#C8102E","#FFFFFF"],
    "15":["#6CABDD","#FFFFFF"],
    "16":["#DA291C","#000000"],
    "17":["#241F20","#FFFFFF"],
    "18":["#E53233","#FFFFFF"],
    "19":["#EB172B","#FFFFFF"],
    "20":["#FFFFFF","#132257"]
  };

  function ensureStyles(){
    if(document.getElementById("fpl-jersey-style"))return;
    var style=document.createElement("style");
    style.id="fpl-jersey-style";
    style.textContent=".fpl-jersey{width:30px;height:38px;object-fit:contain;object-position:center bottom;flex:none;display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}.player-cell{gap:8px;align-items:center}.player-text{min-width:0;display:flex;flex-direction:column;justify-content:center}";
    document.head.appendChild(style);
  }

  function escSvg(value){
    return String(value||"").replace(/[&<>\"]/g,function(ch){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[ch];});
  }

  function jerseyFallback(team){
    var id=team&&team.id!=null?String(team.id):"";
    var colors=teamColors[id]||["#6B7280","#FFFFFF"];
    var label=team&&((team.short_name)||team.name)||"FPL";
    label=String(label).replace(/[^A-Za-z0-9]/g,"").slice(0,3).toUpperCase()||"FPL";
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">'+
      '<path d="M28 22 48 10h24l20 12 18 8-11 25-16-7v72H37V48l-16 7L10 30z" fill="'+colors[0]+'" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>'+
      '<path d="M48 10h24l6 13c-4 8-10 12-18 12s-14-4-18-12z" fill="'+colors[1]+'" stroke="#ffffff" stroke-width="2"/>'+
      '<text x="60" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="'+colors[1]+'">'+escSvg(label)+'</text>'+
      '</svg>';
    return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
  }

  function photoCandidates(player){
    var candidates=[];
    var seen={};
    function add(url){if(url&&!seen[url]){seen[url]=1;candidates.push(url);}}
    var photo=player&&player.photo?String(player.photo).replace(/\.(jpg|jpeg|png)$/i,""):"";
    var code=player&&player.code!=null?String(player.code):"";
    if(photo){
      add("https://resources.premierleague.com/premierleague25/photos/players/110x140/"+encodeURIComponent(photo)+".png");
      add("https://resources.premierleague.com/premierleague25/photos/players/250x250/"+encodeURIComponent(photo)+".png");
      add("https://resources.premierleague.com/premierleague25/photos/players/40x40/"+encodeURIComponent(photo)+".png");
      add("https://resources.premierleague.com/premierleague/photos/players/110x140/p"+encodeURIComponent(photo)+".png");
    }
    if(code){
      add("https://resources.premierleague.com/premierleague/photos/players/110x140/p"+encodeURIComponent(code)+".png");
      add("https://resources.premierleague.com/premierleague/photos/players/250x250/p"+encodeURIComponent(code)+".png");
      add("https://resources.premierleague.com/premierleague/photos/players/40x40/p"+encodeURIComponent(code)+".png");
    }
    return candidates;
  }

  function addImages(){
    var rows=document.querySelectorAll("#tbody tr[data-player-id]");
    rows.forEach(function(row){
      var id=row.getAttribute("data-player-id");
      var name=row.querySelector(".player-name");
      var text=row.querySelector(".player-text");
      if(!id||!name||!text)return;
      var existing=row.querySelector(".player-cell > .fpl-jersey");
      if(existing)return;

      var player=playerById[String(id)]||{};
      var team=teamById[String(player.team)]||{};
      var candidates=photoCandidates(player);
      var img=document.createElement("img");
      img.className="fpl-jersey";
      img.alt="";
      img.loading="lazy";
      img.decoding="async";
      img.dataset.fplPhotoIndex="0";
      img.dataset.fplFallback="0";

      function advance(){
        var index=Number(img.dataset.fplPhotoIndex||0);
        if(index<candidates.length){
          img.dataset.fplPhotoIndex=String(index+1);
          img.src=candidates[index];
          return;
        }
        if(img.dataset.fplFallback!=="1"){
          img.dataset.fplFallback="1";
          img.src=jerseyFallback(team);
        }
      }

      img.onerror=function(){advance();};
      advance();
      text.parentNode.insertBefore(img,text);
    });
  }

  async function load(){
    ensureStyles();
    try{
      var response=await fetch("/fpl?path=bootstrap-static/",{cache:"no-store"});
      if(!response.ok)return;
      var data=await response.json();
      (data.elements||[]).forEach(function(player){
        if(player&&player.id!=null)playerById[String(player.id)]=player;
      });
      (data.teams||[]).forEach(function(team){
        if(team&&team.id!=null)teamById[String(team.id)]=team;
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
