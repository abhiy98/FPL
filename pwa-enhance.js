(function(){
  "use strict";

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

  function click(id){var el=document.getElementById(id);if(el)el.click();}

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
      if(teamInput){teamInput.value=s.teamId;}
    }

    if(s.sortKey){
      var th=document.querySelector('th[data-key="'+s.sortKey+'"]');
      var btn=th&&th.querySelector(".sort-btn");
      if(btn){
        btn.click();
        if(s.sortDir && s.sortDir==="asc")btn.click();
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

    var wrap=document.getElementById("tableWrap");
    if(wrap){
      var ticking=false;
      wrap.addEventListener("scroll",function(){
        if(ticking)return;
        ticking=true;
        requestAnimationFrame(function(){
          ticking=false;
          write({scrollLeft:wrap.scrollLeft,scrollTop:wrap.scrollTop});
        });
      },{passive:true});
    }

    window.addEventListener("pagehide",function(){
      if(wrap){
        try{localStorage.setItem(KEY,JSON.stringify(Object.assign(read(),{scrollLeft:wrap.scrollLeft,scrollTop:wrap.scrollTop})));}catch(e){}
      }
    });

    document.documentElement.style.setProperty("--pw-bottom-safe","env(safe-area-inset-bottom, 0px)");
  }

  function restoreScroll(){
    var s=read(),wrap=document.getElementById("tableWrap");
    if(!wrap)return;
    if(Number.isFinite(s.scrollLeft))wrap.scrollLeft=s.scrollLeft;
    if(Number.isFinite(s.scrollTop))wrap.scrollTop=s.scrollTop;
  }

  var style=document.createElement("style");
  style.textContent="html{background:var(--ink,#1c0025)}body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,button{font:inherit}button,.pos-chip{touch-action:manipulation}.fav-btn,.watch-btn{min-width:36px;min-height:36px}.status-pill button{min-width:32px;min-height:32px}.pw-btn{min-height:40px}.table-wrap{overscroll-behavior:contain}.pw-modal-backdrop{padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}footer{padding-bottom:max(9px,calc(env(safe-area-inset-bottom,0px) + 9px))}.subbar{padding-bottom:2px}body.pw-app-focused #statusText{font-weight:600}";
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
