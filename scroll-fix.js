(function(){
  "use strict";

  function apply(){
    var body=document.body;
    if(!body)return;
    body.style.display="block";
    body.style.height="auto";
    body.style.minHeight="100vh";
    body.style.overflow="visible";

    var tableWrap=document.getElementById("tableWrap");
    if(tableWrap){
      tableWrap.style.flex="none";
      tableWrap.style.minHeight="0";
      tableWrap.style.height="auto";
      tableWrap.style.overflow="visible";
      tableWrap.style.position="relative";
    }

    var footer=document.querySelector("footer");
    if(footer){
      footer.style.flex="none";
    }

    // Keep the most useful filter first: All, then My Team, then the other filters.
    var posBar=document.getElementById("posBar");
    var all=posBar && posBar.querySelector('[data-pos="ALL"]');
    var myTeam=posBar && document.getElementById("myTeamOnly");
    if(posBar && all && myTeam){
      posBar.insertBefore(myTeam, all.nextSibling);
    }
  }

  function start(){
    apply();
    window.addEventListener("resize",apply,{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
