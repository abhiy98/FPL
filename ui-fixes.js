(function(){
  "use strict";

  var pointsById = {};
  var pointsLoaded = false;

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
      timerBar.remove();
    } else if (value) {
      value.textContent = formatCountdownToPriceChange();
    }
  }

  function addTotalPointsHeader(){
    var head = document.querySelector("thead tr");
    if (!head || head.querySelector('th[data-key="points"]')) return;
    var eventHeader = head.querySelector('th[data-key="event"]');
    if (!eventHeader) return;

    var th = document.createElement("th");
    th.className = "num";
    th.setAttribute("data-key", "points");
    th.innerHTML = '<button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button>';
    eventHeader.after(th);
  }

  function addPointsCells(){
    if (!pointsLoaded) return;
    var tbody = document.getElementById("tbody");
    if (!tbody) return;
    tbody.querySelectorAll("tr[data-player-id]").forEach(function(row){
      if (row.querySelector(".total-points-cell")) return;
      var id = Number(row.getAttribute("data-player-id"));
      if (!(id in pointsById)) return;
      var eventCell = row.querySelector('td:nth-child(5)');
      if (!eventCell) return;
      var cell = document.createElement("td");
      cell.className = "num total-points-cell";
      cell.textContent = pointsById[id];
      eventCell.after(cell);
    });
  }

  function centerTableColumns(){
    if (document.getElementById("ponytail-table-center-style")) return;
    var style = document.createElement("style");
    style.id = "ponytail-table-center-style";
    style.textContent = [
      "/* Ponytail: center the content inside each table column without changing sizing. */",
      "thead th, tbody td { text-align: center; }",
      "th button.sort-btn, th.num button.sort-btn { justify-content: center; }",
      ".player-cell { justify-content: center; text-align: center; }",
      ".player-cell .player-text { align-items: center; text-align: center; }",
      ".player-meta { justify-content: center; }",
      ".own-bar-wrap { justify-content: center; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function loadPoints(){
    fetch("/fpl?path=bootstrap-static/", {cache:"no-store"}).then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function(data){
      (data.elements || []).forEach(function(player){
        pointsById[player.id] = player.total_points || 0;
      });
      pointsLoaded = true;
      addPointsCells();
    }).catch(function(){
      // The main app can still load and display all other columns if this request fails.
    });
  }

  function boot(){
    centerTableColumns();
    addTotalPointsHeader();
    movePriceTimer();
    loadPoints();

    setInterval(function(){
      movePriceTimer();
      addPointsCells();
      centerTableColumns();
    }, 1000);

    var tbody = document.getElementById("tbody");
    if (tbody) {
      var observer = new MutationObserver(function(){
        addPointsCells();
        centerTableColumns();
      });
      observer.observe(tbody, {childList:true, subtree:true});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
