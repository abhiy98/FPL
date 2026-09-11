(function(){
  "use strict";
  var KEY="pricewatch:pwa-state";
  var pageScroll=null;
  var stickyBar=null;
  var stickyPlayer=null;
  var stickyRest=null;
  var stickyRestTable=null;

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
    var active=wrapRect.top<=topLimit+1 && wrapRect.bottom>topLimit+headHeight;

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
      if(playerCell){
        playerCell.style.width=width+"px";
        playerCell.style.minWidth=width+"px";
      }
      var restCell=stickyRestTable&&stickyRestTable.querySelectorAll("th")[i-1];
      if(restCell){
        restCell.style.width=width+"px";
        restCell.style.minWidth=width+"px";
      }
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
    playerTable.querySelectorAll("th").forEach(function(th,i){
      if(i>0)th.remove();
    });
    stickyPlayer.appendChild(playerTable);

    stickyRest=document.createElement("div");
    stickyRest.className="pw-sticky-rest";
    stickyRestTable=table.cloneNode(false);
    var restHead=thead.cloneNode(true);
    var restRow=restHead.querySelector("tr");
    if(restRow){
      var restCells=restRow.querySelectorAll("th");
      if(restCells.length)restCells[0].remove();
    }
    stickyRestTable.appendChild(restHead);
    stickyRest.appendChild(stickyRestTable);

    stickyBar.appendChild(stickyPlayer);
    stickyBar.appendChild(stickyRest);
    document.body.appendChild(stickyBar);

    tableWrap.addEventListener("scroll",function(){syncSticky();},{passive:true});
    pageScroll.addEventListener("scroll",syncSticky,{passive:true});
    window.addEventListener("resize",syncSticky,{passive:true});
  }

  function apply(){
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
    var footer=document.querySelector("footer");
    if(!header||!dashboard||!tableWrap)return;

    if(footer)footer.remove();

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
      `;
      document.head.appendChild(style);

      pageScroll.addEventListener("scroll",function(){
        try{
          var state=JSON.parse(localStorage.getItem(KEY)||"{}");
          state.scrollTop=pageScroll.scrollTop;
          localStorage.setItem(KEY,JSON.stringify(state));
        }catch(e){}
        syncSticky();
      },{passive:true});

      window.addEventListener("pagehide",function(){
        try{
          var state=JSON.parse(localStorage.getItem(KEY)||"{}");
          state.scrollTop=pageScroll.scrollTop;
          localStorage.setItem(KEY,JSON.stringify(state));
        }catch(e){}
      });

      try{
        var saved=JSON.parse(localStorage.getItem(KEY)||"{}");
        setTimeout(function(){
          pageScroll.scrollTo(0,Number.isFinite(saved.scrollTop)?saved.scrollTop:0);
          syncSticky();
        },0);
      }catch(e){}
    }

    tableWrap.style.flex="none";
    tableWrap.style.minHeight="0";
    tableWrap.style.height="auto";
    tableWrap.style.overflowX="auto";
    tableWrap.style.overflowY="visible";
    tableWrap.style.position="relative";

    createStickyHeader();
    syncSticky();

    var posBar=document.getElementById("posBar");
    var all=posBar&&posBar.querySelector('[data-pos="ALL"]');
    var myTeam=posBar&&document.getElementById("myTeamOnly");
    var favourites=posBar&&document.getElementById("favoritesOnly");
    if(posBar&&all){
      if(myTeam)posBar.insertBefore(myTeam,all.nextSibling);
      if(favourites){var anchor=myTeam||all;posBar.insertBefore(favourites,anchor.nextSibling);}
    }
  }

  function start(){
    apply();
    window.addEventListener("resize",apply,{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
