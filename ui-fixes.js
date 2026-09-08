(function(){
  "use strict";

  function formatCountdownToPriceChange(){
    var now = new Date();
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);
    var p = {};
    parts.forEach(function(x){ if (x.type !== "literal") p[x.type] = x.value; });
    var utcNow = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    var offset = utcNow - now.getTime();
    var nextMidnight = Date.UTC(+p.year, +p.month - 1, +p.day + 1, 0, 0, 0) - offset;
    var seconds = Math.max(0, Math.floor((nextMidnight - now.getTime()) / 1000));
    var h = Math.floor(seconds / 3600);
    seconds %= 3600;
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function movePriceTimer(){
    var timer = document.getElementById("pwPriceTimer");
    var timerBar = timer && timer.closest(".pw-price-timer");
    var dashboard = document.getElementById("pwDashboard");
    if (!dashboard) return;

    var stats = dashboard.querySelectorAll(".pw-stat");
    if (!stats.length) return;

    var deadlineStat = null;
    stats.forEach(function(stat){
      var label = stat.querySelector(".label");
      if (label && label.textContent.trim().toLowerCase() === "deadline") deadlineStat = stat;
    });
    if (!deadlineStat) deadlineStat = stats[stats.length - 1];

    var label = deadlineStat.querySelector(".label");
    var value = deadlineStat.querySelector(".value");
    var hint = deadlineStat.querySelector(".hint");
    if (label) label.textContent = "Price change";
    if (hint) hint.textContent = "next price change";

    if (timer) {
      if (value) {
        value.id = "pwPriceTimer";
        value.textContent = formatCountdownToPriceChange();
      }
      if (timerBar) timerBar.remove();
    } else if (value) {
      value.textContent = formatCountdownToPriceChange();
    }
  }

  function addTotalPointsColumn(){
    var head = document.querySelector("thead tr");
    if (!head || head.querySelector('th[data-key="points"]')) return;

    var eventHeader = head.querySelector('th[data-key="event"]');
    if (!eventHeader) return;

    var th = document.createElement("th");
    th.className = "num";
    th.setAttribute("data-key", "points");
    th.innerHTML = '<button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button>';
    eventHeader.after(th);

    var tbody = document.getElementById("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr.skeleton-row").forEach(function(row){
        var cell = document.createElement("td");
        var skeleton = document.createElement("div");
        skeleton.className = "skeleton";
        skeleton.style.width = "36px";
        skeleton.style.marginLeft = "auto";
        cell.appendChild(skeleton);
        row.insertBefore(cell, row.lastElementChild);
      });
    }

    var originalRender = window.__priceWatchRender;
    if (typeof originalRender === "function") originalRender();
  }

  function patchRender(){
    var scriptText = Array.from(document.scripts).map(function(s){ return s.textContent || ""; }).join("\n");
    if (scriptText.indexOf('p.points') === -1) return;

    var originalBody = document.body.innerHTML;
    if (originalBody.indexOf('data-key="points"') === -1) {
      addTotalPointsColumn();
    }

    var rows = document.querySelectorAll("#tbody tr[data-player-id]");
    rows.forEach(function(row){
      if (row.querySelector(".total-points-cell")) return;
      var playerId = Number(row.getAttribute("data-player-id"));
      var eventCell = row.querySelector("td:nth-child(5)");
      if (!eventCell) return;
      var players = window.__priceWatchPlayers || [];
      var player = players.find(function(x){ return Number(x.id) === playerId; });
      if (!player) return;
      var cell = document.createElement("td");
      cell.className = "num total-points-cell";
      cell.textContent = player.points || 0;
      eventCell.after(cell);
    });
  }

  function update(){
    movePriceTimer();
    patchRender();
  }

  function boot(){
    update();
    setInterval(function(){
      movePriceTimer();
      patchRender();
    }, 1000);
    var observer = new MutationObserver(function(){ patchRender(); });
    var tbody = document.getElementById("tbody");
    if (tbody) observer.observe(tbody, {childList:true,subtree:true});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
