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
    if(!header||!dashboard||!tableWrap)return;

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
      style.textContent=`html,body{width:100%;max-width:100%;overflow:hidden!important;overscroll-behavior-x:none}.pw-page-scroll{flex:1 1 auto;min-width:0;min-height:0;width:100%;max-width:100%;overflow:auto;overflow-x:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;overscroll-behavior-y:auto;position:relative}.pw-page-scroll>.table-wrap{overflow:visible!important;min-height:0!important;height:auto!important;flex:none!important}.pw-page-scroll>header,.pw-page-scroll>.pw-dashboard{min-width:100%}`;
      document.head.appendChild(style);

      var ticking=false;
      pageScroll.addEventListener("scroll",function(){
        if(ticking)return;
        ticking=true;
        requestAnimationFrame(function(){
          ticking=false;
          try{
            var state=JSON.parse(localStorage.getItem(KEY)||"{}");
            state.scrollLeft=pageScroll.scrollLeft;
            state.scrollTop=pageScroll.scrollTop;
            localStorage.setItem(KEY,JSON.stringify(state));
          }catch(e){}
        });
      },{passive:true});

      window.addEventListener("pagehide",function(){
        try{
          var state=JSON.parse(localStorage.getItem(KEY)||"{}");
          state.scrollLeft=pageScroll.scrollLeft;
          state.scrollTop=pageScroll.scrollTop;
          localStorage.setItem(KEY,JSON.stringify(state));
        }catch(e){}
      });

      try{
        var saved=JSON.parse(localStorage.getItem(KEY)||"{}");
        setTimeout(function(){
          pageScroll.scrollTo(Number.isFinite(saved.scrollLeft)?saved.scrollLeft:0,Number.isFinite(saved.scrollTop)?saved.scrollTop:0);
        },0);
      }catch(e){}
    }

    tableWrap.style.flex="none";
    tableWrap.style.minHeight="0";
    tableWrap.style.height="auto";
    tableWrap.style.overflow="visible";
    tableWrap.style.position="relative";

    var footer=document.querySelector("footer");
    if(footer){footer.style.flex="none";footer.style.maxWidth="100vw";footer.style.overflow="hidden";}

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