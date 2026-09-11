(function(){
  "use strict";

  var KEY="pricewatch:pwa-state";
  var saveTimer=0;

  function removeWatchlist(){
    var toggle=document.getElementById("watchlistOnly");
    if(toggle)toggle.remove();
    document.querySelectorAll(".watch-btn").forEach(function(el){el.remove();});
    document.querySelectorAll(".pw-row-watch").forEach(function(row){row.classList.remove("pw-row-watch");});
  }

  function applyTableFixes(){
    removeWatchlist();
    if(document.getElementById("pwTableFixes"))return;
    var style=document.createElement("style");
    style.id="pwTableFixes";
    style.textContent=`
      .col-player{min-width:164px!important;max-width:164px!important;}
      .player-cell{justify-content:flex-start!important;gap:7px!important;padding-left:7px!important;padding-right:7px!important;}
      .player-cell .player-text{min-width:0!important;text-align:left!important;}
      .player-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;}
      td.num{overflow:hidden;}
      .delta{display:inline-flex!important;align-items:center;justify-content:center;gap:2px;max-width:100%;min-width:0;white-space:nowrap;overflow:hidden;vertical-align:middle;}
      .delta .arrow{display:inline-block!important;flex:0 0 auto!important;margin:0!important;width:auto!important;}
      .pw-status,.pw-percent{display:inline-flex!important;align-items:center;justify-content:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
      .pw-status-dot{flex:0 0 auto;}
      thead .col-player{box-shadow:6px 0 10px -10px rgba(0,0,0,.7);}
      tbody .col-player{box-shadow:6px 0 10px -10px rgba(0,0,0,.65);}
    `;
    document.head.appendChild(style);
  }

  function movePriceChangeFirst(){
    var dashboard=document.getElementById("pwDashboard"),top=dashboard&&dashboard.querySelector(".pw-dashboard-top");
    if(!top)return;
    var price=dashboard.querySelector("#pwDeadline"),card=price&&price.closest(".pw-stat");
    if(card&&top.firstElementChild!==card)top.insertBefore(card,top.firstElementChild);
  }

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}
  }

  function write(patch){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      try{
        var state=read();
        delete state.watchlistOnly;
        localStorage.setItem(KEY,JSON.stringify(Object.assign(state,patch)));
      }catch(e){}
    },80);
  }

  function firstSortDirection(key){return key==="name"||key==="priceProgress"?"asc":"desc";}

  function defaultSort(){
    var progress=document.querySelector('th[data-key="priceProgress"] .sort-btn');
    if(!progress)return;
    var state=read();
    if(state.sortKey)return;
    progress.click();
  }

  function restore(){
    var s=read();
    delete s.watchlistOnly;
    removeWatchlist();

    var input=document.getElementById("search");
    if(input&&s.search){input.value=s.search;input.dispatchEvent(new Event("input",{bubbles:true}));}

    if(s.pos){
      var chip=document.querySelector('.pos-chip[data-pos="'+s.pos+'"]');
      if(chip&&!chip.classList.contains("active"))chip.click();
    }

    ["favoritesOnly","risersOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){
      if(s[id]===true){
        var el=document.getElementById(id);
        if(el&&!el.classList.contains("active"))el.click();
      }
    });

    if(s.teamId){var teamInput=document.getElementById("pwTeamId");if(teamInput)teamInput.value=s.teamId;}

    if(s.sortKey){
      var th=document.querySelector('th[data-key="'+s.sortKey+'"]'),btn=th&&th.querySelector(".sort-btn");
      if(btn){
        var dir=firstSortDirection(s.sortKey);
        if(!(s.sortKey==="priceProgress"&&s.sortDir==="asc")){
          btn.click();
          if(s.sortDir!==dir)btn.click();
        }
      }
    } else {
      defaultSort();
    }
  }

  function bind(){
    var input=document.getElementById("search");
    if(input)input.addEventListener("input",function(){write({search:input.value});});

    var posBar=document.getElementById("posBar");
    if(posBar)posBar.addEventListener("click",function(){
      var active=document.querySelector(".pos-chip[data-pos].active"),patch={pos:active?active.getAttribute("data-pos"):"ALL"};
      ["favoritesOnly","risersOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){
        var el=document.getElementById(id);if(el)patch[id]=el.classList.contains("active");
      });
      write(patch);
    });

    document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
      btn.addEventListener("click",function(){
        var th=btn.closest("th"),patch={sortKey:th&&th.getAttribute("data-key")};
        setTimeout(function(){
          var svgs=th?th.querySelectorAll(".sort-arrows svg"):[];
          patch.sortDir=svgs.length===2&&svgs[0].style.opacity==="1"?"asc":"desc";
          write(patch);
        },0);
      });
    });

    var teamInput=document.getElementById("pwTeamId");
    if(teamInput)teamInput.addEventListener("input",function(){write({teamId:teamInput.value.trim()});});

    var ticking=false;
    window.addEventListener("scroll",function(){
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(function(){ticking=false;write({scrollLeft:window.scrollX,scrollTop:window.scrollY});});
    },{passive:true});

    window.addEventListener("pagehide",function(){
      try{localStorage.setItem(KEY,JSON.stringify(Object.assign(read(),{scrollLeft:window.scrollX,scrollTop:window.scrollY})));}catch(e){}
    });

    document.documentElement.style.setProperty("--pw-bottom-safe","env(safe-area-inset-bottom, 0px)");
  }

  function restoreScroll(){
    var s=read();
    if(Number.isFinite(s.scrollLeft)||Number.isFinite(s.scrollTop))window.scrollTo(Number.isFinite(s.scrollLeft)?s.scrollLeft:0,Number.isFinite(s.scrollTop)?s.scrollTop:0);
  }

  function start(){
    applyTableFixes();
    movePriceChangeFirst();
    var observer=new MutationObserver(function(){applyTableFixes();movePriceChangeFirst();});
    observer.observe(document.body,{childList:true,subtree:true});
    bind();
    setTimeout(restore,0);
    setTimeout(restoreScroll,60);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")setTimeout(restoreScroll,80);});
})();