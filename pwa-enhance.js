(function(){
  "use strict";

  function applyPwaTableFixes(){
    if(!document.getElementById("pwTableFixes")){
      var style=document.createElement("style");
      style.id="pwTableFixes";
      style.textContent=`
        /* Keep the player name area compact and anchored to the left. */
        .col-player{min-width:164px!important;max-width:164px!important;}
        .player-cell{justify-content:flex-start!important;gap:7px!important;padding-left:7px!important;padding-right:7px!important;}
        .player-cell .player-text{min-width:0!important;text-align:left!important;}
        .player-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;}

        /* Price/delta indicators stay inside their own cell. */
        td.num{overflow:hidden;}
        .delta{display:inline-flex!important;align-items:center;justify-content:center;gap:2px;max-width:100%;min-width:0;white-space:nowrap;overflow:hidden;vertical-align:middle;}
        .delta .arrow{display:inline-block!important;flex:0 0 auto!important;margin:0!important;width:auto!important;}
        .pw-status,.pw-percent{display:inline-flex!important;align-items:center;justify-content:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
        .pw-status-dot{flex:0 0 auto;}

        /* Give the left-most table column a clean visual boundary while scrolling horizontally. */
        thead .col-player{box-shadow:6px 0 10px -10px rgba(0,0,0,.7);}
        tbody .col-player{box-shadow:6px 0 10px -10px rgba(0,0,0,.65);}
      `;
      document.head.appendChild(style);
    }
  }

  function movePriceChangeFirst(){
    var dashboard=document.getElementById("pwDashboard");
    var top=dashboard && dashboard.querySelector(".pw-dashboard-top");
    if(!top || !window.getComputedStyle(top).display) return;
    var price=dashboard.querySelector("#pwDeadline");
    var priceCard=price && price.closest(".pw-stat");
    if(!priceCard || top.firstElementChild===priceCard) return;
    top.insertBefore(priceCard,top.firstElementChild);
  }

  function start(){
    applyPwaTableFixes();
    movePriceChangeFirst();
    var observer=new MutationObserver(function(){
      applyPwaTableFixes();
      movePriceChangeFirst();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
  var KEY="pricewatch:pwa-state";
  var saveTimer=0;

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}
  }

  function write(patch){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      try{localStorage.setItem(KEY,JSON.stringify(Object.assign(read(),patch)));}catch(e){}
    },80);
  }

  function restore(){
    var s=read();
    var input=document.getElementById("search");
    if(input && s.search){
      input.value=s.search;
      input.dispatchEvent(new Event("input",{bubbles:true}));
    }

    if(s.pos){
      var chip=document.querySelector('.pos-chip[data-pos="'+s.pos+'"]');
      if(chip && !chip.classList.contains("active"))chip.click();
    }

    ["favoritesOnly","risersOnly","watchlistOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){
      if(s[id]===true){
        var el=document.getElementById(id);
        if(el && !el.classList.contains("active"))el.click();
      }
    });

    if(s.teamId){
      var teamInput=document.getElementById("pwTeamId");
      if(teamInput)teamInput.value=s.teamId;
    }

    if(s.sortKey){
      var th=document.querySelector('th[data-key="'+s.sortKey+'"]');
      var btn=th&&th.querySelector(".sort-btn");
      if(btn){
        var startsOnDefaultKey=s.sortKey==="total";
        if(!startsOnDefaultKey || s.sortDir==="asc")btn.click();
        if(!startsOnDefaultKey && s.sortDir==="asc")btn.click();
      }
    }else{
      var defaultSort=document.querySelector('th[data-key="priceProgress"] .sort-btn');
      if(defaultSort){
        defaultSort.click();
        defaultSort.click();
      }
    }
  }

  function bind(){
    var input=document.getElementById("search");
    if(input)input.addEventListener("input",function(){write({search:input.value});});

    var posBar=document.getElementById("posBar");
    if(posBar)posBar.addEventListener("click",function(){
      var active=document.querySelector(".pos-chip[data-pos].active");
      var patch={pos:active?active.getAttribute("data-pos"):"ALL"};
      ["favoritesOnly","risersOnly","watchlistOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){
        var el=document.getElementById(id); if(el)patch[id]=el.classList.contains("active");
      });
      write(patch);
    });

    document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
      btn.addEventListener("click",function(){
        var th=btn.closest("th"),patch={sortKey:th&&th.getAttribute("data-key")};
        setTimeout(function(){
          var svgs=th?th.querySelectorAll(".sort-arrows svg"):[];
          patch.sortDir=svgs.length===2 && svgs[0].style.opacity==="1" ? "asc" : "desc";
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
      requestAnimationFrame(function(){
        ticking=false;
        write({scrollLeft:window.scrollX,scrollTop:window.scrollY});
      });
    },{passive:true});

    window.addEventListener("pagehide",function(){
      try{localStorage.setItem(KEY,JSON.stringify(Object.assign(read(),{scrollLeft:window.scrollX,scrollTop:window.scrollY})));}catch(e){}
    });

    document.documentElement.style.setProperty("--pw-bottom-safe","env(safe-area-inset-bottom, 0px)");
  }

  function restoreScroll(){
    var s=read();
    if(Number.isFinite(s.scrollLeft)||Number.isFinite(s.scrollTop)){
      window.scrollTo(Number.isFinite(s.scrollLeft)?s.scrollLeft:0,Number.isFinite(s.scrollTop)?s.scrollTop:0);
    }
  }

  var style=document.createElement("style");
  style.textContent="html{background:var(--ink,#1c0025)}input,button{font:inherit}button,.pos-chip{touch-action:manipulation}.fav-btn,.watch-btn{min-width:36px;min-height:36px}.status-pill button{min-width:32px;min-height:32px}.pw-btn{min-height:40px}.table-wrap{overscroll-behavior:contain}.pw-modal-backdrop{padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}footer{padding-bottom:max(9px,calc(env(safe-area-inset-bottom,0px) + 9px))}.subbar{padding-bottom:2px}body.pw-app-focused #statusText{font-weight:600}";
  document.head.appendChild(style);

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){bind();setTimeout(restore,0);setTimeout(restoreScroll,60);});
  }else{
    bind();
    setTimeout(restore,0);
    setTimeout(restoreScroll,60);
  }

  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible")setTimeout(restoreScroll,80);
  });
})();
