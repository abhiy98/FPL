(function(){
  "use strict";

  function start(){
    if(document.getElementById("pwMobileScrollStyles"))return;
    var header=document.querySelector("body > header");
    var dashboard=document.getElementById("pwDashboard");
    var modal=document.getElementById("pwModalBackdrop");
    var tableWrap=document.getElementById("tableWrap");
    if(!header||!dashboard||!tableWrap)return;

    var scroller=document.createElement("div");
    scroller.className="pw-page-scroll";
    header.parentNode.insertBefore(scroller,header);
    scroller.appendChild(header);
    scroller.appendChild(dashboard);
    if(modal)scroller.appendChild(modal);
    scroller.appendChild(tableWrap);

    var style=document.createElement("style");
    style.id="pwMobileScrollStyles";
    style.textContent=`
      html,body{overflow:hidden!important;width:100%;max-width:100%;}
      .pw-page-scroll{flex:1 1 auto;min-width:0;min-height:0;width:100%;max-width:100%;overflow:auto;overflow-x:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:none;overscroll-behavior-y:auto;position:relative;}
      .pw-page-scroll > .table-wrap{overflow:visible!important;min-height:0!important;}
      .pw-page-scroll table{max-width:none;}
    `;
    document.head.appendChild(style);

    var KEY="pricewatch:pwa-state";
    function save(){
      try{
        var state=JSON.parse(localStorage.getItem(KEY)||"{}");
        state.scrollLeft=scroller.scrollLeft;
        state.scrollTop=scroller.scrollTop;
        localStorage.setItem(KEY,JSON.stringify(state));
      }catch(e){}
    }
    var ticking=false;
    scroller.addEventListener("scroll",function(){
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(function(){ticking=false;save();});
    },{passive:true});
    window.addEventListener("pagehide",save);

    try{
      var saved=JSON.parse(localStorage.getItem(KEY)||"{}");
      scroller.scrollTo(Number.isFinite(saved.scrollLeft)?saved.scrollLeft:0,Number.isFinite(saved.scrollTop)?saved.scrollTop:0);
    }catch(e){}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();