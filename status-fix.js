(function(){
  "use strict";

  var LIVEFPL_URL="https://livefpl.us/api/prices.json";
  var dataById={};
  var applying=false;
  var lastFetch=0;
  var FETCH_INTERVAL=5*60*1000;
  var defaultProgressSort=true;
  var lastSortedOrder="";
  var initialSortApplied=false;

  function number(v){
    var n=Number(v);
    return Number.isFinite(n)?n:null;
  }

  function normalise(v){
    var n=number(v);
    if(n===null)return null;
    return Math.abs(n)>5?n/100:n;
  }

  function records(source){
    if(Array.isArray(source)){
      return source.map(function(x){
        return [x && (x.id!=null?x.id:(x.element_id!=null?x.element_id:x.player_id)),x];
      });
    }
    return Object.entries(source||{});
  }

  function loadData(raw){
    var source=raw && raw.players ? raw.players : (raw && raw.data ? raw.data : raw);
    var next={};
    records(source).forEach(function(pair){
      var key=pair[0], item=pair[1];
      if(!item || typeof item!=="object")return;
      var id=number(item.id!=null?item.id:(item.element_id!=null?item.element_id:(item.player_id!=null?item.player_id:key)));
      if(id===null)return;
      var progress=normalise(item.progress!=null?item.progress:(item.progress_now!=null?item.progress_now:null));
      var predicted=normalise(item.progress_tonight!=null?item.progress_tonight:(item.predicted_progress!=null?item.predicted_progress:(item.predictedProgress!=null?item.predictedProgress:(item.prediction!=null?item.prediction:progress))));
      if(predicted===null && progress===null)return;
      next[String(Math.trunc(id))]={progress:progress,predicted:predicted};
    });
    if(Object.keys(next).length)dataById=next;
  }

  function statusFor(id){
    var row=dataById[String(id)];
    if(!row)return "—";
    var pct=row.predicted*100;
    if(pct>=100)return "Very Likely to Rise";
    if(pct>=80)return "Likely to Rise";
    if(pct<=-100)return "Very Likely to Drop";
    if(pct<=-80)return "Likely to Drop";
    return "Unlikely to Change";
  }

  function progressFor(id){
    var row=dataById[String(id)];
    return row && row.progress!==null && row.progress!==undefined ? row.progress : null;
  }

  function applyDefaultProgressSort(){
    if(!defaultProgressSort)return;
    var tbody=document.getElementById("tbody");
    if(!tbody)return;
    var rows=Array.prototype.slice.call(tbody.querySelectorAll("tr[data-player-id]"));
    rows.sort(function(a,b){
      var av=progressFor(a.getAttribute("data-player-id"));
      var bv=progressFor(b.getAttribute("data-player-id"));
      if(av===null && bv===null){}
      else if(av===null)return 1;
      else if(bv===null)return -1;
      else if(av!==bv)return av-bv;
      var an=(a.getAttribute("data-player-name")||"").toLowerCase();
      var bn=(b.getAttribute("data-player-name")||"").toLowerCase();
      return an.localeCompare(bn);
    });
    var desired=rows.map(function(row){return row.getAttribute("data-player-id");}).join(",");
    var current=Array.prototype.slice.call(tbody.querySelectorAll("tr[data-player-id]")).map(function(row){return row.getAttribute("data-player-id");}).join(",");
    if(desired===current){
      lastSortedOrder=desired;
      return;
    }
    if(desired===lastSortedOrder)return;
    rows.forEach(function(row){tbody.appendChild(row);});
    lastSortedOrder=desired;
  }

  function forceInitialAppSort(){
    if(initialSortApplied)return;
    var tbody=document.getElementById("tbody");
    var button=document.querySelector('th[data-key="priceProgress"] .sort-btn');
    if(!tbody||!button)return;
    if(!tbody.querySelector('tr[data-player-id]'))return;
    initialSortApplied=true;
    button.click();
    button.click();
    defaultProgressSort=false;
    lastSortedOrder="";
  }

  function removeWatchlistUI(){
    var toggle=document.getElementById("watchlistOnly");
    if(toggle)toggle.remove();
    document.querySelectorAll(".watch-btn").forEach(function(btn){btn.remove();});
    document.querySelectorAll(".pw-row-watch").forEach(function(row){row.classList.remove("pw-row-watch");});
    var note=document.getElementById("pwTeamNote");
    if(note)note.textContent="Favourites and your Team ID are saved locally on this device. No login is required.";
  }

  function reveal(){
    var style=document.getElementById("pw-coldstart-style");
    if(style)style.remove();
  }

  function decorate(){
    if(applying)return;
    applying=true;
    try{
      removeWatchlistUI();
      document.querySelectorAll("#tbody tr[data-player-id]").forEach(function(tr){
        var id=tr.getAttribute("data-player-id");
        if(!id)return;
        var cell=tr.querySelector("td:nth-child(2)");
        if(!cell)return;
        var nameCell=tr.querySelector(".player-name");
        if(nameCell)tr.setAttribute("data-player-name",nameCell.textContent||"");
        var status=statusFor(id);
        if(status!=="—"){
          var cls=status.indexOf("Rise")!==-1?"rise":status.indexOf("Drop")!==-1?"drop":"neutral";
          if(cell.textContent.trim()!==status)cell.innerHTML='<span class="pw-status '+cls+'"><span class="pw-status-dot"></span>'+status+'</span>';
        }
      });
      forceInitialAppSort();
      applyDefaultProgressSort();
      if(initialSortApplied)reveal();
    }finally{
      applying=false;
    }
  }

  async function fetchData(){
    if(Date.now()-lastFetch<FETCH_INTERVAL){decorate();return;}
    lastFetch=Date.now();
    try{
      var response=await fetch("/price-data?ts="+Date.now(),{cache:"no-store"});
      if(response.ok){
        var proxyData=await response.json();
        if(proxyData && proxyData.players && Object.keys(proxyData.players).length){
          loadData(proxyData);
          decorate();
          return;
        }
      }
    }catch(e){}
    try{
      var direct=await fetch(LIVEFPL_URL+"?ts="+Date.now(),{cache:"no-store"});
      if(direct.ok){
        loadData(await direct.json());
        decorate();
        return;
      }
    }catch(e){}
    removeWatchlistUI();
    reveal();
  }

  function start(){
    var style=document.createElement("style");
    style.textContent=".pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.neutral{color:#c9b8d1;background:rgba(255,255,255,.06)}.col-player button.sort-btn{justify-content:center!important;text-align:center!important;}";
    document.head.appendChild(style);

    removeWatchlistUI();
    document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
      btn.addEventListener("click",function(){defaultProgressSort=false;lastSortedOrder="";},{capture:true});
    });

    var tbody=document.getElementById("tbody");
    if(tbody)new MutationObserver(function(){
      if(!applying)decorate();
    }).observe(tbody,{childList:true});
    setTimeout(function(){fetchData();},0);
    setTimeout(function(){if(!initialSortApplied)reveal();},10000);
    setInterval(function(){fetchData();},30000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
