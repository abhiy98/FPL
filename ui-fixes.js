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

    var target = stats[stats.length - 1];
    var label = target.querySelector(".label");
    var value = target.querySelector(".value");
    var hint = target.querySelector(".hint");
    if (!label || !value || !hint) return;

    label.textContent = "Price change";
    hint.textContent = "next price change";
    value.id = "pwPriceTimer";
    value.textContent = formatCountdownToPriceChange();

    dashboard.querySelectorAll(".pw-price-timer").forEach(function(timer){
      if (!target.contains(timer)) timer.remove();
    });
  }

  function ensureTotalPointsHeader(){
    var head = document.querySelector("thead tr");
    if (!head) return;

    var headers = head.querySelectorAll("th");
    var pointsHeader = null;
    for (var i = 0; i < headers.length; i++){
      var button = headers[i].querySelector(".sort-btn");
      if (!button) continue;
      var text = button.textContent.trim().replace(/\s+/g, " ");
      if (text === "Points" || text === "Total Points"){
        pointsHeader = headers[i];
        break;
      }
    }
    if (!pointsHeader) return;

    pointsHeader.setAttribute("data-key", "points");
    pointsHeader.classList.add("num");
    var button = pointsHeader.querySelector(".sort-btn");
    if (button.firstChild && button.firstChild.nodeType === 3) button.firstChild.nodeValue = "Total Points";
  }

  function addPointsCells(){
    if (!pointsLoaded) return;
    var tbody = document.getElementById("tbody");
    if (!tbody) return;

    tbody.querySelectorAll("tr[data-player-id]").forEach(function(row){
      if (row.querySelector(".total-points-cell")) return;
      var id = Number(row.getAttribute("data-player-id"));
      if (!(id in pointsById)) return;

      var cells = row.querySelectorAll("td");
      if (cells.length !== 6) return;

      var cell = document.createElement("td");
      cell.className = "num total-points-cell";
      cell.textContent = pointsById[id];
      cells[4].after(cell);
    });
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
      // Secondary points data is optional; keep the main app usable.
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

  function removeHeaderPriceTimer(){
    document.querySelectorAll("header .pw-price-timer, header [id=\"pwPriceTimer\"]").forEach(function(el){
      var container = el.closest(".pw-price-timer");
      if (container) container.remove();
      else el.remove();
    });
  }

  function runFixes(){
    centerTableColumns();
    ensureTotalPointsHeader();
    removeHeaderPriceTimer();
    movePriceTimer();
    addPointsCells();
  }

  function boot(){
    runFixes();
    loadPoints();

    var bodyObserver = new MutationObserver(function(mutations){
      var structuralChange = mutations.some(function(m){
        return m.type === "childList" && m.addedNodes.length > 0;
      });
      if (structuralChange) runFixes();
    });
    bodyObserver.observe(document.body, {childList:true, subtree:true});

    setInterval(function(){
      var timer = document.getElementById("pwPriceTimer");
      if (timer && !timer.closest("header")) {
        timer.textContent = formatCountdownToPriceChange();
      }
      removeHeaderPriceTimer();
    }, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();