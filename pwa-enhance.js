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
})();
