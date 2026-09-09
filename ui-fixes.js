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
    if (value) {
      value.id = "pwPriceTimer";
      value.textContent = formatCountdownToPriceChange();
    }

    dashboard.querySelectorAll(".pw-price-timer").forEach(function(timer){
      if (!deadlineStat.contains(timer)) timer.remove();
    });
  }

  function removePointsColumn(){
    document.querySelectorAll('thead th, tbody tr').forEach(function(row){
      if (row.tagName === "TH") {
        var button = row.querySelector(".sort-btn");
        if (button && button.textContent.trim().replace(/\s+/g, " ") === "Points") row.remove();
      } else {
        var cells = row.querySelectorAll("td");
        // Remove the legacy Points cell at the sixth column. The row should contain:
        // Player, GW1 price, Current, Total Δ, This GW, Owned.
        if (cells.length >= 6) cells[5].remove();
      }
    });
  }

  function centerTableColumns(){
    if (document.getElementById("ponytail-table-center-style")) return;
    var style = document.createElement("style");
    style.id = "ponytail-table-center-style";
    style.textContent = [
      "thead th { text-align: center !important; }",
      "thead th .sort-btn, thead th.num .sort-btn { justify-content: center !important; text-align: center !important; }",
      "tbody td, tbody td.num { text-align: center !important; }",
      ".player-cell { justify-content: center !important; text-align: center !important; }",
      ".player-cell .player-text { align-items: center !important; text-align: center !important; }",
      ".player-meta { justify-content: center !important; }",
      ".action-buttons { justify-content: center !important; }",
      ".own-bar-wrap { justify-content: center !important; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function loadPoints(){
    // No Total Points column is displayed; keep this disabled so legacy cells
    // cannot be reintroduced asynchronously.
    pointsLoaded = false;
    pointsById = {};
  }

  function boot(){
    centerTableColumns();
    removePointsColumn();
    movePriceTimer();

    var fix = function(){
      removePointsColumn();
      movePriceTimer();
      centerTableColumns();
    };

    var observer = new MutationObserver(fix);
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
    setInterval(fix, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();