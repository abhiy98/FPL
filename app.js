import "./pwa-enhance.js";
import "./jersey-fix.js";
import "./team-menu.js";

import { fetchBootstrap, fetchPublicApi } from "./api.js";
import { currentEvent, upcomingEvent, formatCountdown, formatDeadline, nextPriceChangeAt } from "./utils.js";
import {
  STORE_KEY_FAVS, STORE_KEY_WATCHLIST, STORE_KEY_TEAM,
  loadSet, saveSet, loadValue, saveValue, removeValue,
  saveSnapshot, loadSnapshot
} from "./storage.js";

(function(){
  "use strict";

  var POLL_MS = 3 * 60 * 1000;

  var state = {
    players: [],
    sortKey: "total",
    sortDir: "desc",
    search: "",
    pos: "ALL",
    moversOnly: false,
    favoritesOnly: false,
    watchlistOnly: false, risingOnly: false, fallingOnly: false, differentialsOnly: false, myTeamOnly: false,
    watchlist: loadSet(STORE_KEY_WATCHLIST), team: null, events: [], currentGameweek: null,
    favs: loadSet(STORE_KEY_FAVS),
    lastUpdated: null,
    polling: false
  };

  var tbody = document.getElementById("tbody");
  var emptyState = document.getElementById("emptyState");
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var refreshBtn = document.getElementById("refreshBtn");
  var searchInput = document.getElementById("search");
  var clearSearch = document.getElementById("clearSearch");
  var countLabel = document.getElementById("countLabel");
  var toastEl = document.getElementById("toast");
  var posBar = document.getElementById("posBar");
  var risersOnly = document.getElementById("risersOnly");

  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function(){ toastEl.classList.remove("show"); }, 2600);
  }

  function fmtPrice(tenths){
    return "£" + (tenths / 10).toFixed(1);
  }

  function fmtDelta(tenths){
    var v = tenths / 10;
    if (v === 0) return { text: "0.0", cls: "flat", arrow: "" };
    var sign = v > 0 ? "+" : "";
    return {
      text: sign + v.toFixed(1),
      cls: v > 0 ? "up" : "down",
      arrow: v > 0 ? "▲" : "▼"
    };
  }

  function timeAgo(date){
    if (!date) return "never";
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return s + "s ago";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    return h + "h ago";
  }

  

  function mapPlayers(data){
    var teams = {};
    (data.teams || []).forEach(function(t){ teams[t.id] = { name: t.name || "", shortName: t.short_name || "" }; });
    var posMap = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
    return (data.elements || []).map(function(el){
      var now = el.now_cost;
      var startChange = el.cost_change_start || 0;
      var team = teams[el.team] || { name: "", shortName: "" };
      var netTransfers = (el.transfers_in_event || 0) - (el.transfers_out_event || 0);
      return {
        id: el.id, name: el.web_name, team: team.shortName, teamName: team.name,
        pos: posMap[el.element_type] || "", gw1: now - startChange, now: now,
        total: startChange, event: el.cost_change_event || 0,
        own: parseFloat(el.selected_by_percent) || 0, status: el.status,
        transfersIn: el.transfers_in_event || 0, transfersOut: el.transfers_out_event || 0,
        netTransfers: netTransfers, points: el.total_points || 0,
        form: parseFloat(el.form) || 0, epNext: parseFloat(el.ep_next) || 0,
        minutes: el.minutes || 0,
        valueScore: now ? ((el.total_points || 0) / (now / 10)) : 0
      };
    });
  }

  function applyFilters(list){
    var q = state.search.trim().toLowerCase();
    return list.filter(function(p){
      if (state.pos !== "ALL" && p.pos !== state.pos) return false;
      if (state.moversOnly && p.total === 0) return false;
      if (state.favoritesOnly && !state.favs.has(p.id)) return false;
      if (state.watchlistOnly && !state.watchlist.has(p.id)) return false;
      if (state.risingOnly && p.total <= 0) return false;
      if (state.fallingOnly && p.total >= 0) return false;
      if (state.differentialsOnly && p.own > 5) return false;
      if (state.myTeamOnly && (!state.team || !state.team.picks.has(p.id))) return false;
      if (q && p.name.toLowerCase().indexOf(q) === -1 && p.team.toLowerCase().indexOf(q) === -1 && (p.teamName || "").toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function sortList(list){
    var key = state.sortKey, dir = state.sortDir === "asc" ? 1 : -1;
    return list.slice().sort(function(a, b){
      var av, bv;
      if (key === "name"){ av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else { av = a[key]; bv = b[key]; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return a.name.localeCompare(b.name);
    });
  }

  function renderHeaderState(){
    document.querySelectorAll("th[data-key]").forEach(function(th){
      th.classList.toggle("sorted", th.getAttribute("data-key") === state.sortKey);
      var svgs = th.querySelectorAll(".sort-arrows svg");
      if (svgs.length === 2){
        svgs[0].style.opacity = (state.sortKey === th.getAttribute("data-key") && state.sortDir === "asc") ? "1" : "0.35";
        svgs[1].style.opacity = (state.sortKey === th.getAttribute("data-key") && state.sortDir === "desc") ? "1" : "0.35";
      }
    });
  }

  function render(){
    var filtered = applyFilters(state.players), sorted = sortList(filtered);
    renderHeaderState(); renderDashboard();
    if (!sorted.length){
      tbody.innerHTML = "";
      emptyState.style.display = "flex";
      emptyState.innerHTML = '<b>' + (state.players.length ? 'No players found' : 'Couldn\'t load prices') + '</b><span>' + (state.players.length ? 'Try a different search or filter.' : escapeHtml(state.loadErrorMsg || 'Check your connection and try again.')) + '</span>';
    } else {
      emptyState.style.display = "none";
      var maxOwn = 40;
      tbody.innerHTML = sorted.map(function(p){
        var total = fmtDelta(p.total), event = fmtDelta(p.event), ownPct = Math.min(100, (p.own / maxOwn) * 100);
        var isFav = state.favs.has(p.id), isWatch = state.watchlist.has(p.id), isOwned = state.team && state.team.picks.has(p.id);
        var mom = p.netTransfers > 0 ? '<span class="momentum up">▲</span>' : p.netTransfers < 0 ? '<span class="momentum down">▼</span>' : '<span class="momentum neutral">•</span>';
        return '<tr data-player-id="' + p.id + '" class="' + (isOwned ? 'pw-row-owned ' : '') + (isWatch ? 'pw-row-watch' : '') + '">' +
          '<td class="col-player"><div class="player-cell"><div class="action-buttons">' +
          '<button class="fav-btn' + (isFav ? ' active' : '') + '" data-fav-id="' + p.id + '" aria-label="Toggle favourite">' + (isFav ? '★' : '☆') + '</button>' +
          '<button class="watch-btn' + (isWatch ? ' active' : '') + '" data-watch-id="' + p.id + '" aria-label="Toggle watchlist">' + (isWatch ? '◉' : '○') + '</button></div>' +
          '<div class="player-text"><span class="player-name">' + escapeHtml(p.name) + '</span><span class="player-meta"><span class="pos-badge pos-' + p.pos + '">' + p.pos + '</span>' + escapeHtml(p.team) + ' · ' + mom + '</span></div></div></td>' +
          '<td class="num price">' + fmtPrice(p.gw1) + '</td><td class="num price">' + fmtPrice(p.now) + '</td>' +
          '<td class="num"><span class="delta ' + total.cls + '"><span class="arrow">' + total.arrow + '</span>' + total.text + '</span></td>' +
          '<td class="num"><span class="delta ' + event.cls + '"><span class="arrow">' + event.arrow + '</span>' + event.text + '</span></td>' +
          '<td class="num points">' + p.points + '</td>' +
          '<td class="num"><div class="own-bar-wrap">' + p.own.toFixed(1) + '%<span class="own-bar"><i style="width:' + ownPct + '%"></i></span></div></td></tr>';
      }).join('');
    }
    countLabel.textContent = sorted.length + (sorted.length === 1 ? ' player' : ' players') + (state.players.length ? ' · updated ' + timeAgo(state.lastUpdated) : '');
  }

  function renderDashboard(){
    var timer=document.getElementById('pwPriceChangeTimer'), budget=document.getElementById('pwAvailableBudget'), value=document.getElementById('pwTeamValue'), dl=document.getElementById('pwDeadline'), dh=document.getElementById('pwDeadlineHint');
    var priceTarget=nextPriceChangeAt(new Date());
    if(timer)timer.textContent=priceTarget?formatCountdown(priceTarget):'—';

    var teamValue=0, teamValuePlayers=0;
    if(state.team&&state.team.picks){
      state.team.picks.forEach(function(id){
        var player=state.players.find(function(p){return p.id===id;});
        if(player){teamValue+=player.now;teamValuePlayers++;}
      });
    }
    if(budget)budget.textContent=state.team?'£'+((state.team.bank||0)/10).toFixed(1)+'m':'—';
    if(value)value.textContent=(state.team&&teamValuePlayers===state.team.picks.size)?'£'+(teamValue/10).toFixed(1)+'m':(state.team?'Updating…':'—');

    var ev=upcomingEvent(state.events);
    if(dl)dl.textContent=ev?formatDeadline(ev.deadline_time):'—';
    if(dh)dh.textContent=ev?'GW'+ev.id+' · upcoming deadline':'upcoming gameweek';

    var note=document.getElementById('pwTeamNote'); if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value uses current player prices.':'Your team is loaded. Players are highlighted in the table.'):'Favourites, watchlist and your Team ID are saved locally on this device. No login is required.';
    var clear=document.getElementById('pwClearTeam'); if(clear)clear.style.display=state.team?'inline-block':'none';
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setStatus(mode, text){
    statusDot.className = "status-dot" + (mode === "live" ? " live" : mode === "err" ? " err" : "");
    statusText.textContent = text;
  }

  async function refresh(isManual){
    if (state.polling) return;
    state.polling = true;
    refreshBtn.querySelector ? null : null;
    refreshBtn.innerHTML = '<span class="spin"><svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-4L3 10"></path><path d="M3 4v6h6"></path><path d="M4 13a8 8 0 0 0 14.9 4L21 14"></path><path d="M21 20v-6h-6"></path></svg></span>';
    setStatus("", isManual ? "Refreshing…" : "Checking for updates…");
    try{
      var data = await fetchBootstrap(function(attempt, total){
        if (total > 1) setStatus("", "Connecting (source " + attempt + "/" + total + ")…");
      });
      state.events = data.events || [];
      state.currentGameweek = currentEvent(state.events);
      var mapped = mapPlayers(data);
      var changed = detectChanges(state.players, mapped);
      state.players = mapped;
      state.lastUpdated = new Date();
      state.loadErrorMsg = null;
      try{ localStorage.__pw_test = 1; }catch(e){}
      saveSnapshot(mapped, state.lastUpdated);
      setStatus("live", "Live");
      render();
      if (isManual) showToast("Prices refreshed");
      if (changed.length){
        showToast(changed.length + " price" + (changed.length > 1 ? "s" : "") + " just changed");
      }
    }catch(e){
      if (!state.players.length){
        var snap = loadSnapshot();
        if (snap && snap.players.length){
          state.players = snap.players;
          state.lastUpdated = new Date(snap.at);
          setStatus("err", "Offline — showing last data");
        } else {
          state.loadErrorMsg = "All data sources are unreachable right now. This can happen if a proxy is temporarily down — tap Retry in a moment.";
          setStatus("err", "Couldn't load data");
        }
      } else {
        setStatus("err", "Offline — showing last data");
      }
      if (isManual) showToast("Couldn't reach FPL right now");
      render();
    } finally {
      state.polling = false;
      refreshBtn.innerHTML = '<svg class="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-4L3 10"></path><path d="M3 4v6h6"></path><path d="M4 13a8 8 0 0 0 14.9 4L21 14"></path><path d="M21 20v-6h-6"></path></svg>';
    }
  }

  function detectChanges(oldList, newList){
    if (!oldList.length) return [];
    var oldMap = {};
    oldList.forEach(function(p){ oldMap[p.id] = p.now; });
    return newList.filter(function(p){ return oldMap[p.id] !== undefined && oldMap[p.id] !== p.now; });
  }

  

  

  document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      var th = btn.closest("th");
      var key = th.getAttribute("data-key");
      if (state.sortKey === key){
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "name" ? "asc" : "desc";
      }
      render();
    });
  });

  searchInput.addEventListener("input", function(){
    state.search = searchInput.value;
    clearSearch.style.display = state.search ? "block" : "none";
    render();
  });
  clearSearch.addEventListener("click", function(){
    searchInput.value = "";
    state.search = "";
    clearSearch.style.display = "none";
    render();
    searchInput.focus();
  });

  posBar.addEventListener("click", function(e){
    var favChip = e.target.closest("#favoritesOnly");
    if (favChip){
      state.favoritesOnly = !state.favoritesOnly;
      favChip.classList.toggle("active", state.favoritesOnly);
      render();
      return;
    }
    var moverChip = e.target.closest("#risersOnly");
    if (moverChip){
      state.moversOnly = !state.moversOnly;
      moverChip.classList.toggle("active", state.moversOnly);
      render();
      return;
    }
    var chip = e.target.closest(".pos-chip[data-pos]");
    if (!chip) return;
    document.querySelectorAll(".pos-chip[data-pos]").forEach(function(c){ c.classList.remove("active"); });
    chip.classList.add("active");
    state.pos = chip.getAttribute("data-pos");
    render();
  });

  function detailCard(label,value){ return '<div class="pw-detail-card"><span>'+escapeHtml(label)+'</span><b>'+escapeHtml(value)+'</b></div>'; }
  function toggleFavourite(id){ if(state.favs.has(id))state.favs.delete(id);else state.favs.add(id);saveSet(STORE_KEY_FAVS, state.favs);render(); }
  function toggleWatchlist(id){ if(state.watchlist.has(id))state.watchlist.delete(id);else state.watchlist.add(id);saveSet(STORE_KEY_WATCHLIST, state.watchlist);render(); }
  async function openPlayer(id){
    var p=state.players.find(function(x){return x.id===id;}); if(!p)return;
    var back=document.getElementById('pwModalBackdrop'), title=document.getElementById('pwModalTitle'), sub=document.getElementById('pwModalSub'), body=document.getElementById('pwModalBody');
    title.textContent=p.name; sub.textContent=(p.teamName||p.team)+' · '+p.team+' · '+p.pos;
    body.innerHTML='<div class="pw-detail-grid">'+detailCard('Current',fmtPrice(p.now))+detailCard('Season Δ',fmtDelta(p.total).text)+detailCard('Owned',p.own.toFixed(1)+'%')+detailCard('Form',p.form?p.form.toFixed(1):'—')+detailCard('Points',String(p.points))+detailCard('Net transfers',(p.netTransfers>0?'+':'')+p.netTransfers.toLocaleString())+detailCard('xP next',p.epNext?p.epNext.toFixed(1):'—')+detailCard('Value',p.valueScore?p.valueScore.toFixed(2):'—')+'</div><div class="pw-history"><h3>Recent price history</h3><div id="pwHistoryBars" class="pw-history-bars"><div class="pw-history-empty">Loading…</div></div></div><div class="pw-detail-actions"><button class="pw-btn" id="pwModalFav">'+(state.favs.has(p.id)?'★ Favourite':'☆ Favourite')+'</button><button class="pw-btn" id="pwModalWatch">'+(state.watchlist.has(p.id)?'◉ Watching':'○ Watchlist')+'</button></div>';
    back.classList.add('open'); document.body.style.overflow='hidden';
    document.getElementById('pwModalFav').addEventListener('click',function(){toggleFavourite(p.id);this.textContent=state.favs.has(p.id)?'★ Favourite':'☆ Favourite';});
    document.getElementById('pwModalWatch').addEventListener('click',function(){toggleWatchlist(p.id);this.textContent=state.watchlist.has(p.id)?'◉ Watching':'○ Watchlist';});
    try{ var s=await fetchPublicApi('element-summary/'+p.id+'/'), history=(s.history||[]).slice(-8), bars=document.getElementById('pwHistoryBars'); if(!history.length){bars.innerHTML='<div class="pw-history-empty">No history available yet.</div>';return;} var vals=history.map(function(h){return h.value||p.now;}),min=Math.min.apply(Math,vals),max=Math.max.apply(Math,vals); bars.innerHTML=history.map(function(h){var pct=max===min?55:18+((h.value-min)/(max-min))*72;return '<div class="pw-history-bar" style="height:'+pct+'%" title="GW '+h.round+': '+fmtPrice(h.value)+'"><small>G'+h.round+'</small></div>';}).join(''); }catch(e){var err=document.getElementById('pwHistoryBars');if(err)err.innerHTML='<div class="pw-history-empty">History is unavailable right now.</div>';}
  }
  async function loadMyTeam(){
    var input=document.getElementById('pwTeamId'), id=parseInt(input&&input.value?input.value.trim():'',10); if(!id){showToast('Enter a valid FPL Team ID');return;}
    var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';
    try{var entry=await fetchPublicApi('entry/'+id+'/'),ev=currentEvent(state.events),gw=ev?ev.id:1,picksData=await fetchPublicApi('entry/'+id+'/event/'+gw+'/picks/'),picks=new Set((picksData.picks||[]).map(function(x){return x.element;})); state.team={id:id,picks:picks,bank:entry.bank!=null?entry.bank:(entry.last_deadline_bank||0),name:entry.name||''}; try{saveValue(STORE_KEY_TEAM, String(id));}catch(e){} showToast('Team loaded');render();}catch(e){showToast('Couldn\'t load that FPL Team ID');}finally{button.disabled=false;button.textContent='Load my team';}
  }
  async function restoreTeam(){try{var id=loadValue(STORE_KEY_TEAM);if(id){var input=document.getElementById('pwTeamId');if(input)input.value=id;await loadMyTeam();}}catch(e){}}

  tbody.addEventListener("click", function(e){
    var fav=e.target.closest('.fav-btn'); if(fav){toggleFavourite(parseInt(fav.getAttribute('data-fav-id'),10));return;}
    var watch=e.target.closest('.watch-btn'); if(watch){toggleWatchlist(parseInt(watch.getAttribute('data-watch-id'),10));return;}
    var row=e.target.closest('tr[data-player-id]'); if(row)openPlayer(parseInt(row.getAttribute('data-player-id'),10));
  });

  ["watchlistOnly","risingOnly","fallingOnly","differentialsOnly","myTeamOnly"].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(){state[id]=!state[id];el.classList.toggle('active',state[id]);render();});});
  document.getElementById('pwLoadTeam').addEventListener('click',loadMyTeam);
  document.getElementById('pwClearTeam').addEventListener('click',function(){state.team=null;try{removeValue(STORE_KEY_TEAM);}catch(e){}var input=document.getElementById('pwTeamId');if(input)input.value='';render();showToast('Team cleared');});
  document.getElementById('pwModalClose').addEventListener('click',function(){document.getElementById('pwModalBackdrop').classList.remove('open');document.body.style.overflow='';});
  document.getElementById('pwModalBackdrop').addEventListener('click',function(e){if(e.target===this){this.classList.remove('open');document.body.style.overflow='';}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var m=document.getElementById('pwModalBackdrop');if(m.classList.contains('open')){m.classList.remove('open');document.body.style.overflow='';}}});

  refreshBtn.addEventListener("click", function(){ refresh(true); });

  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "visible") refresh(false);
  });

  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }

  var snap = loadSnapshot();
  if (snap){
    state.players = snap.players;
    state.lastUpdated = new Date(snap.at);
    render();
  }

  refresh(false);
  setInterval(function(){ refresh(false); }, POLL_MS);
  setInterval(function(){ renderDashboard(); }, 1000);
  restoreTeam();

})();
