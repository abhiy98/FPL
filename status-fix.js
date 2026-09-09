(function(){
  "use strict";

  var LIVEFPL_URL="https://livefpl.us/api/prices.json";
  var dataById={};
  var applying=false;
  var lastFetch=0;
  var FETCH_INTERVAL=5*60*1000;
  var defaultStatusSort=true;

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
      if(predicted===null)return;
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

  function statusRank(status){
    if(status==="Very Likely to Drop")return 1;
    if(status==="Likely to Drop")return 2;
    if(status==="Unlikely to Change")return 3;
    if(status==="Likely to Rise")return 4;
    if(status==="Very Likely to Rise")return 5;
    return 99;
  }

  function applyDefaultStatusSort(){
    if(!defaultStatusSort)return;
    var tbody=document.getElementById("tbody");
    if(!tbody)return;
    var rows=Array.prototype.slice.call(tbody.querySelectorAll("tr[data-player-id]"));
    rows.sort(function(a,b){
      var ar=statusRank(statusFor(a.getAttribute("data-player-id")));
      var br=statusRank(statusFor(b.getAttribute("data-player-id")));
      if(ar!==br)return ar-br;
      var an=(a.getAttribute("data-player-name")||"").toLowerCase();
      var bn=(b.getAttribute("data-player-name")||"").toLowerCase();
      return an.localeCompare(bn);
    });
    rows.forEach(function(row){tbody.appendChild(row);});
  }

  function decorate(){
    if(applying)return;
    applying=true;
    try{
      document.querySelectorAll("#tbody tr[data-player-id]").forEach(function(tr){
        var id=tr.getAttribute("data-player-id");
        if(!id)return;
        var cell=tr.querySelector("td:nth-child(2)");
        if(!cell)return;
        var status=statusFor(id);
        var nameCell=tr.querySelector(".player-name");
        if(nameCell)tr.setAttribute("data-player-name",nameCell.textContent||"");
        if(status==="—")return;
        var cls=status.indexOf("Rise")!==-1?"rise":status.indexOf("Drop")!==-1?"drop":"neutral";
        if(cell.textContent.trim()!==status)cell.innerHTML='<span class="pw-status '+cls+'"><span class="pw-status-dot"></span>'+status+'</span>';
      });
      applyDefaultStatusSort();
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
      }
    }catch(e){}
  }

  function start(){
    var style=document.createElement("style");
    style.textContent=".pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.neutral{color:#c9b8d1;background:rgba(255,255,255,.06)}";
    document.head.appendChild(style);

    document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
      btn.addEventListener("click",function(){defaultStatusSort=false;},{capture:true});
    });

    var tbody=document.getElementById("tbody");
    if(tbody)new MutationObserver(function(){decorate();}).observe(tbody,{childList:true});
    fetchData();
    setInterval(function(){fetchData();},30000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
