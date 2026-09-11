(function(){
  "use strict";

  var KEY="pricewatch:pwa-state";
  var saveTimer=0;
  var pageScroll=null;
  var stickyBar=null;
  var stickyPlayer=null;
  var stickyRest=null;
  var stickyRestTable=null;

  function removeWatchlist(){
    var toggle=document.getElementById("watchlistOnly");
    if(toggle)toggle.remove();
    document.querySelectorAll(".watch-btn").forEach(function(el){el.remove();});
    document.querySelectorAll(".pw-row-watch").forEach(function(row){row.classList.remove("pw-row-watch");});
  }

  function hideFooter(){
    var footer=document.querySelector("footer");
    if(footer)footer.remove();
  }

  function syncSticky(){
    if(!pageScroll||!stickyBar||!stickyPlayer||!stickyRest)return;
    var tableWrap=document.getElementById("tableWrap");
    var table=tableWrap&&tableWrap.querySelector("table");
    var thead=table&&table.querySelector("thead");
    if(!tableWrap||!table||!thead)return;
    var wrapRect=tableWrap.getBoundingClientRect();
    var pageRect=pageScroll.getBoundingClientRect();
    var topLimit=pageRect.top;
    var headHeight=thead.getBoundingClientRect().height||40;
    var active=wrapRect.top<=topLimit+1&&wrapRect.bottom>topLimit+headHeight;
    stickyBar.style.display=active?"block":"none";
    if(!active)return;
    stickyBar.style.top="env(safe-area-inset-top, 0px)";
    stickyBar.style.height=headHeight+"px";
    var sourceCells=thead.querySelectorAll("th");
    if(!sourceCells.length)return;
    var playerWidth=sourceCells[0].getBoundingClientRect().width;
    stickyPlayer.style.width=playerWidth+"px";
    stickyRest.style.left=playerWidth+"px";
    stickyRest.style.width=Math.max(0,window.innerWidth-playerWidth)+"px";
    stickyRest.scrollLeft=tableWrap.scrollLeft;
    for(var i=0;i<sourceCells.length;i++){
      var width=sourceCells[i].getBoundingClientRect().width;
      var playerCell=i===0?stickyPlayer.querySelector("th"):null;
      if(playerCell){playerCell.style.width=width+"px";playerCell.style.minWidth=width+"px";}
      var restCell=stickyRestTable&&stickyRestTable.querySelectorAll("th")[i-1];
      if(restCell){restCell.style.width=width+"px";restCell.style.minWidth=width+"px";}
    }
  }

  function createStickyHeader(){
    if(stickyBar)return;
    var tableWrap=document.getElementById("tableWrap");
    var table=tableWrap&&tableWrap.querySelector("table");
    var thead=table&&table.querySelector("thead");
    if(!tableWrap||!table||!thead)return;
    var sourceRow=thead.querySelector("tr");
    var sourceCells=sourceRow?sourceRow.querySelectorAll("th"):[];
    if(!sourceCells.length)return;
    stickyBar=document.createElement("div");
    stickyBar.id="pwStickyHeader";
    stickyPlayer=document.createElement("div");
    stickyPlayer.className="pw-sticky-player";
    var playerTable=document.createElement("table");
    playerTable.appendChild(thead.cloneNode(true));
    playerTable.querySelectorAll("th").forEach(function(th,i){if(i>0)th.remove();});
    stickyPlayer.appendChild(playerTable);
    stickyRest=document.createElement("div");
    stickyRest.className="pw-sticky-rest";
    stickyRestTable=table.cloneNode(false);
    var restHead=thead.cloneNode(true);
    var restRow=restHead.querySelector("tr");
    if(restRow){var restCells=restRow.querySelectorAll("th");if(restCells.length)restCells[0].remove();}
    stickyRestTable.appendChild(restHead);
    stickyRest.appendChild(stickyRestTable);
    stickyBar.appendChild(stickyPlayer);
    stickyBar.appendChild(stickyRest);
    document.body.appendChild(stickyBar);
    tableWrap.addEventListener("scroll",syncSticky,{passive:true});
    pageScroll.addEventListener("scroll",syncSticky,{passive:true});
    window.addEventListener("resize",syncSticky,{passive:true});
  }

  function applyMobileScroll(){
    var body=document.body;
    if(!body)return;
    body.style.display="flex";
    body.style.flexDirection="column";
    body.style.height="100vh";
    body.style.height="100dvh";
    body.style.maxWidth="100vw";
    body.style.overflow="hidden";
    var header=document.querySelector("body > header");
    var dashboard=document.getElementById("pwDashboard");
    var modal=document.getElementById("pwModalBackdrop");
    var tableWrap=document.getElementById("tableWrap");
    if(!header||!dashboard||!tableWrap)return;
    hideFooter();
    if(!pageScroll){
      pageScroll=document.createElement("div");
      pageScroll.id="pwPageScroll";
      pageScroll.className="pw-page-scroll";
      header.parentNode.insertBefore(pageScroll,header);
      pageScroll.appendChild(header);
      pageScroll.appendChild(dashboard);
      if(modal)pageScroll.appendChild(modal);
      pageScroll.appendChild(tableWrap);
      var style=document.createElement("style");
      style.id="pwMobileScrollStyles";
      style.textContent=`
        html{background:var(--ink-2)!important;}
        html,body{width:100%;max-width:100%;overscroll-behavior-x:none;}
        body{background:var(--ink)!important;padding:0;}
        body::before{content:"";position:fixed;top:0;left:0;right:0;height:env(safe-area-inset-top,0px);background:var(--ink-2);z-index:100;pointer-events:none;}
        .pw-page-scroll{flex:1 1 auto;min-width:0;min-height:0;width:100%;max-width:none;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;overscroll-behavior-y:auto;position:relative;padding-bottom:env(safe-area-inset-bottom,0px);}
        .pw-page-scroll>header{position:static;width:100%;min-width:100%;transform:none!important;will-change:auto;}
        .pw-page-scroll>.pw-dashboard{position:static;width:100%;min-width:100%;transform:none!important;will-change:auto;}
        .pw-page-scroll>.table-wrap{width:100%;min-width:0;overflow-x:auto!important;overflow-y:visible!important;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;min-height:0;height:auto;flex:none;position:relative;}
        .pw-page-scroll thead th{position:static!important;}
        .pw-page-scroll thead th.col-player, .pw-page-scroll thead th:first-child{position:sticky!important;left:0!important;z-index:5!important;}
        #pwStickyHeader{display:none;position:fixed;left:0;right:0;top:0;z-index:110;overflow:hidden;background:var(--ink-2);border-bottom:1px solid var(--line-strong);box-sizing:border-box;}
        #pwStickyHeader table{border-collapse:separate;border-spacing:0;table-layout:auto;margin:0;}
        #pwStickyHeader thead th{position:static!important;background:var(--ink-2)!important;}
        #pwStickyHeader button{pointer-events:none;}
        .pw-sticky-player{position:absolute;left:0;top:0;bottom:0;overflow:hidden;background:var(--ink-2);border-right:1px solid var(--line-strong);}
        .pw-sticky-player table{width:100%;min-width:100%;}
        .pw-sticky-player th{width:100%!important;min-width:100%!important;}
        .pw-sticky-rest{position:absolute;top:0;bottom:0;overflow:hidden;background:var(--ink-2);}
        .pw-sticky-rest table{width:max-content;min-width:0;}
        .pw-sticky-rest thead th{background:var(--ink-2)!important;}
        footer{display:none!important;}
        #tableWrap .col-player{min-width:164px!important;max-width:164px!important;background-clip:padding-box!important;text-align:center!important;}
        #tableWrap .player-cell{justify-content:center!important;gap:7px!important;padding-left:7px!important;padding-right:7px!important;}
        #tableWrap .player-cell .player-text{min-width:0!important;text-align:center!important;}
        #tableWrap th.col-player .sort-btn{justify-content:center!important;text-align:center!important;}
        #tableWrap .player-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;}
        #tableWrap td.num{overflow:hidden;}
        #tableWrap .delta{display:inline-flex!important;align-items:center;justify-content:center;gap:2px;max-width:100%;min-width:0;white-space:nowrap;overflow:hidden;vertical-align:middle;}
        #tableWrap .delta .arrow{display:inline-block!important;flex:0 0 auto!important;margin:0!important;width:auto!important;}
        #tableWrap .pw-status,#tableWrap .pw-percent{display:inline-flex!important;align-items:center;justify-content:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
        #tableWrap .pw-status-dot{flex:0 0 auto;}
        #pwStickyHeader .pw-sticky-player .col-player{position:static!important;left:auto!important;right:auto!important;z-index:auto!important;}
        #pwStickyHeader .pw-sticky-player .sort-btn{justify-content:center!important;text-align:center!important;}
        #pwStickyHeader .pw-sticky-player .sort-arrows{margin-left:2px;}
      `;
      document.head.appendChild(style);
      pageScroll.addEventListener("scroll",function(){syncSticky();},{passive:true});
      window.addEventListener("pagehide",function(){try{var state=read();state.scrollTop=pageScroll.scrollTop;localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}});
      try{var saved=read();setTimeout(function(){pageScroll.scrollTo(0,Number.isFinite(saved.scrollTop)?saved.scrollTop:0);syncSticky();},0);}catch(e){}
    }
    tableWrap.style.flex="none";
    tableWrap.style.minHeight="0";
    tableWrap.style.height="auto";
    tableWrap.style.overflowX="auto";
    tableWrap.style.overflowY="visible";
    tableWrap.style.position="relative";
    createStickyHeader();
    syncSticky();
  }

  function movePriceChangeFirst(){
    var dashboard=document.getElementById("pwDashboard"),top=dashboard&&dashboard.querySelector(".pw-dashboard-top");
    if(!top)return;
    var price=dashboard.querySelector("#pwDeadline"),card=price&&price.closest(".pw-stat");
    if(card&&top.firstElementChild!==card)top.insertBefore(card,top.firstElementChild);
  }

  function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}}

  function write(patch){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){try{var state=read();delete state.watchlistOnly;localStorage.setItem(KEY,JSON.stringify(Object.assign(state,patch)));}catch(e){}},80);
  }

  function firstSortDirection(key){return key==="name"||key==="priceProgress"?"asc":"desc";}

  function defaultSort(){
    var progress=document.querySelector('th[data-key="priceProgress"] .sort-btn');
    if(!progress)return;
    var state=read();
    if(state.sortKey)return;
    progress.click();
    setTimeout(function(){progress.click();},0);
  }

  function restore(){
    var s=read();delete s.watchlistOnly;removeWatchlist();hideFooter();
    var input=document.getElementById("search");
    if(input&&s.search){input.value=s.search;input.dispatchEvent(new Event("input",{bubbles:true}));}
    if(s.pos){var chip=document.querySelector('.pos-chip[data-pos="'+s.pos+'"]');if(chip&&!chip.classList.contains("active"))chip.click();}
    ["favoritesOnly","risersOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){if(s[id]===true){var el=document.getElementById(id);if(el&&!el.classList.contains("active"))el.click();}});
    if(s.teamId){var teamInput=document.getElementById("pwTeamId");if(teamInput)teamInput.value=s.teamId;}
    if(s.sortKey){var th=document.querySelector('th[data-key="'+s.sortKey+'"]'),btn=th&&th.querySelector(".sort-btn");if(btn){var dir=firstSortDirection(s.sortKey);if(!(s.sortKey==="priceProgress"&&s.sortDir==="asc")){btn.click();if(s.sortDir!==dir)btn.click();}}}else defaultSort();
  }

  function bind(){
    var input=document.getElementById("search");
    if(input)input.addEventListener("input",function(){write({search:input.value});});
    var posBar=document.getElementById("posBar");
    if(posBar)posBar.addEventListener("click",function(){var active=document.querySelector(".pos-chip[data-pos].active"),patch={pos:active?active.getAttribute("data-pos"):"ALL"};["favoritesOnly","risersOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){var el=document.getElementById(id);if(el)patch[id]=el.classList.contains("active");});write(patch);});
    document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){btn.addEventListener("click",function(){var th=btn.closest("th"),patch={sortKey:th&&th.getAttribute("data-key")};setTimeout(function(){var svgs=th?th.querySelectorAll(".sort-arrows svg"):[];patch.sortDir=svgs.length===2&&svgs[0].style.opacity==="1"?"asc":"desc";write(patch);},0);});});
    var teamInput=document.getElementById("pwTeamId");
    if(teamInput)teamInput.addEventListener("input",function(){write({teamId:teamInput.value.trim()});});
    document.documentElement.style.setProperty("--pw-bottom-safe","env(safe-area-inset-bottom, 0px)");
  }

  function restoreScroll(){var s=read();if(pageScroll)pageScroll.scrollTo(0,Number.isFinite(s.scrollTop)?s.scrollTop:0);}

  function start(){
    applyMobileScroll();
    movePriceChangeFirst();
    var observer=new MutationObserver(function(){applyMobileScroll();movePriceChangeFirst();});
    observer.observe(document.body,{childList:true,subtree:true});
    bind();
    setTimeout(restore,0);
    setTimeout(restoreScroll,60);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")setTimeout(restoreScroll,80);});
})();
