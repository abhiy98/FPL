(function(){
  "use strict";
  var KEY="pricewatch:pwa-state";
  var pageScroll=null;

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
    if(!header||!dashboard||!tableWrap||!footer)return;

    if(!pageScroll){
      pageScroll=document.createElement("div");
      pageScroll.id="pwPageScroll";
      pageScroll.className="pw-page-scroll";
      header.parentNode.insertBefore(pageScroll,header);
      pageScroll.appendChild(header);
      pageScroll.appendChild(dashboard);
      if(modal)pageScroll.appendChild(modal);
      pageScroll.appendChild(tableWrap);
      pageScroll.appendChild(footer);

      var style=document.createElement("style");
      style.id="pwMobileScrollStyles";
      style.textContent=`
        html{background:var(--ink-2)!important;}
        html,body{width:100%;max-width:100%;overscroll-behavior-x:none;}
        body{background:var(--ink)!important;padding:0;}
        body::before{content:"";position:fixed;top:0;left:0;right:0;height:env(safe-area-inset-top,0px);background:var(--ink-2);z-index:100;pointer-events:none;}
        .pw-page-scroll{flex:1 1 auto;min-width:0;min-height:0;width:100%;max-width:none;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;overscroll-behavior-y:auto;position:relative;padding-bottom:0;}
        .pw-page-scroll>header{position:static;width:100%;min-width:100%;transform:none!important;will-change:auto;}
        .pw-page-scroll>.pw-dashboard{position:static;width:100%;min-width:100%;transform:none!important;will-change:auto;}
        .pw-page-scroll>.table-wrap{width:100%;min-width:0;overflow-x:auto!important;overflow-y:visible!important;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;min-height:0;height:auto;flex:none;position:relative;}
        .pw-page-scroll thead th{position:sticky!important;top:0!important;z-index:40!important;background:var(--ink-2)!important;}
        .pw-page-scroll thead .col-player{z-index:41!important;background:var(--ink-2)!important;}
        .pw-page-scroll>footer{position:static!important;left:auto!important;right:auto!important;bottom:auto!important;z-index:auto!important;width:100%!important;max-width:none!important;min-height:0!important;height:auto!important;margin:0!important;box-sizing:border-box!important;overflow:hidden!important;background:var(--ink-2)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;}
        .pw-page-scroll>footer .legend{gap:10px!important;}
        .pw-page-scroll>footer .legend span,.pw-page-scroll>footer>span{font-size:10px!important;line-height:1!important;}
        .pw-page-scroll>footer{padding:3px 12px calc(env(safe-area-inset-bottom,0px) + 3px)!important;}
      `;
      document.head.appendChild(style);

      pageScroll.addEventListener("scroll",function(){
        try{
          var state=JSON.parse(localStorage.getItem(KEY)||"{}");
          state.scrollTop=pageScroll.scrollTop;
          localStorage.setItem(KEY,JSON.stringify(state));
        }catch(e){}
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
        },0);
      }catch(e){}
    }

    tableWrap.style.flex="none";
    tableWrap.style.minHeight="0";
    tableWrap.style.height="auto";
    tableWrap.style.overflowX="auto";
    tableWrap.style.overflowY="visible";
    tableWrap.style.position="relative";

    footer.style.flex="none";
    footer.style.maxWidth="none";
    footer.style.overflow="hidden";
    footer.style.position="static";
    footer.style.left="auto";
    footer.style.right="auto";
    footer.style.bottom="auto";
    footer.style.width="100%";
    footer.style.height="auto";
    footer.style.zIndex="auto";
    footer.style.padding="3px 12px calc(env(safe-area-inset-bottom,0px) + 3px)";

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
