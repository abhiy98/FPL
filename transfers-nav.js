(function(){
  "use strict";
  function addTransferLink(){
    var menu=document.querySelector(".pw-team-menu");
    if(!menu || menu.querySelector("[data-transfer-nav]")) return !!menu;
    var button=document.createElement("button");
    button.type="button";
    button.setAttribute("role","menuitem");
    button.setAttribute("data-transfer-nav","1");
    button.textContent="Transfers";
    button.addEventListener("click",function(){ window.location.href="/transfer"; });
    menu.insertBefore(button,menu.firstElementChild);
    return true;
  }
  function markStandalone(){
    if(location.pathname.indexOf("/transfer")!==0) return;
    var link=document.querySelector('a[href="/transfer"]');
    if(link) link.classList.add("active");
  }
  function start(){
    if(addTransferLink()) return;
    if(window.MutationObserver){
      var observer=new MutationObserver(function(){if(addTransferLink()) observer.disconnect();});
      observer.observe(document.body,{childList:true,subtree:true});
      setTimeout(function(){observer.disconnect();},5000);
    }
    markStandalone();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
