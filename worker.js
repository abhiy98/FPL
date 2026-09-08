const FPL_API = "https://fantasy.premierleague.com/api/";
const PRICE_PREDICTOR_API = "https://livefpl.us/api/prices.json";

const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
  "Accept": "application/json"
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

async function fplJson(path) {
  const response = await fetch(FPL_API + path, { headers: FETCH_HEADERS });
  if (!response.ok) throw new Error("FPL returned HTTP " + response.status);
  return response.json();
}

async function handleFpl(url) {
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");
  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) return json({ error: "Unsupported FPL API path" }, 400);
  try {
    const response = await fetch(FPL_API + requestedPath, { headers: FETCH_HEADERS });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        ...JSON_HEADERS,
        "Cache-Control": requestedPath === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30"
      }
    });
  } catch (error) {
    return json({ error: String(error) }, 502);
  }
}

async function handlePriceData() {
  try {
    const response = await fetch(PRICE_PREDICTOR_API, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });
    if (!response.ok) throw new Error("Price predictor returned HTTP " + response.status);
    const raw = await response.json();
    const source = raw && raw.players ? raw.players : raw;
    const players = {};

    Object.keys(source || {}).forEach((id) => {
      const item = source[id] || {};
      players[String(id)] = {
        progress: Number.isFinite(Number(item.progress)) ? Number(item.progress) : null,
        predictedProgress: Number.isFinite(Number(item.progress_tonight)) ? Number(item.progress_tonight) : null
      };
    });

    return json({ players }, 200, { "Cache-Control": "public, max-age=60" });
  } catch (error) {
    return json({ error: String(error), players: {} }, 502);
  }
}

async function handleTeam(url) {
  const id = Number.parseInt(url.searchParams.get("id") || "", 10);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid FPL team id" }, 400);
  try {
    const entry = await fplJson("entry/" + id + "/");
    const currentGameweek = Number.parseInt(String(entry.current_event || ""), 10);
    if (!Number.isInteger(currentGameweek) || currentGameweek < 1) throw new Error("FPL team has no current gameweek");
    let picks = [], gameweek = currentGameweek;
    try {
      const current = await fplJson("entry/" + id + "/event/" + currentGameweek + "/picks/");
      picks = Array.isArray(current.picks) ? current.picks : [];
    } catch (_) {}
    if (!picks.length && currentGameweek > 1) {
      try {
        const previous = await fplJson("entry/" + id + "/event/" + (currentGameweek - 1) + "/picks/");
        picks = Array.isArray(previous.picks) ? previous.picks : [];
        if (picks.length) gameweek = currentGameweek - 1;
      } catch (_) {}
    }
    if (picks.length !== 15) throw new Error("FPL returned " + picks.length + " players instead of 15");
    return json({
      id,
      name: entry.name || "",
      value: entry.last_deadline_value || entry.value || 0,
      bank: entry.last_deadline_bank || entry.bank || 0,
      currentGameweek,
      gameweek,
      picks: picks.map((pick) => Number(pick.element))
    }, 200, { "Cache-Control": "public, max-age=30" });
  } catch (error) {
    return json({ error: String(error) }, 502);
  }
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const url = new URL(request.url);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") || (url.pathname !== "/" && !url.pathname.endsWith(".html"))) return response;

  let html = await response.text();
  const proxyFrom = '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },';
  const proxyTo = '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },';
  html = html.replace(proxyFrom, proxyTo);
  html = html.replace(/<!-- pricewatch:team-ui-fix -->[\s\S]*?<\/script>/g, "");

  const marker = '  var risersOnly = document.getElementById("risersOnly");';
  const injected = marker + `

  var myTeamOnlyChip = document.getElementById('myTeamOnly');
  if (myTeamOnlyChip && !myTeamOnlyChip.__pwBound) {
    myTeamOnlyChip.__pwBound = true;
    myTeamOnlyChip.addEventListener('click', function(e){ e.preventDefault(); e.stopImmediatePropagation(); state.myTeamOnly = !state.myTeamOnly; myTeamOnlyChip.classList.toggle('active', state.myTeamOnly); render(); }, true);
  }

  var clearTeamButton = document.getElementById('pwClearTeam');
  if (clearTeamButton && !clearTeamButton.__pwBound) {
    clearTeamButton.__pwBound = true;
    clearTeamButton.addEventListener('click', function(e){ e.preventDefault(); e.stopImmediatePropagation(); state.team = null; state.myTeamOnly = false; clearTeamButton.style.display = 'none'; if (myTeamOnlyChip) myTeamOnlyChip.classList.remove('active'); try { localStorage.removeItem(STORE_KEY_TEAM); } catch (_) {} var input = document.getElementById('pwTeamId'); if (input) input.value = ''; render(); showToast('Team cleared'); }, true);
  }

  var pwStatusStyle = document.createElement('style');
  pwStatusStyle.textContent = '.pw-status{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-status.rise .pw-status-dot{background:#00ff85}.pw-status.drop .pw-status-dot{background:#ff3b5c}.pw-status.neutral .pw-status-dot{background:var(--flat)}';
  document.head.appendChild(pwStatusStyle);

  var pwPredictorData = null;
  var pwPredictorLoading = false;
  var pwPredictorLastLoaded = 0;

  function pwPriceStatus(projected){
    if (!Number.isFinite(projected)) return { text:'—', cls:'neutral', rank:0 };
    var value = projected * 100;
    if (value < 0) {
      if (value <= -100) return { text:'Very Likely to Drop', cls:'drop', rank:5 };
      if (value <= -80) return { text:'Likely to Drop', cls:'drop', rank:4 };
      return { text:'Unlikely to Drop', cls:'neutral', rank:3 };
    }
    if (value >= 100) return { text:'Very Likely to Rise', cls:'rise', rank:5 };
    if (value >= 80) return { text:'Likely to Rise', cls:'rise', rank:4 };
    return { text:'Unlikely to Rise', cls:'neutral', rank:3 };
  }

  function pwStatusHtml(player){
    var item = pwPredictorData && pwPredictorData[String(player.id)];
    var projected = item && Number.isFinite(item.predictedProgress) ? item.predictedProgress : null;
    var status = pwPriceStatus(projected);
    player.priceStatusRank = status.rank;
    return '<span class="pw-status '+status.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(status.text)+'</span>';
  }

  function headerButton(label){
    return '<button class="sort-btn">'+label+'<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button>';
  }

  function normalizeTable(){
    var table = document.querySelector('table');
    var headerRow = table && table.querySelector('thead tr');
    var body = document.getElementById('tbody');
    if(!table || !headerRow || !body) return;

    var oldHeaders = Array.prototype.slice.call(headerRow.children);
    var headerMap = {};
    oldHeaders.forEach(function(th){
      var key = th.getAttribute('data-key');
      var label = th.textContent.trim();
      if(key === 'name' || /^player$/i.test(label)) headerMap.name = th;
      else if(key === 'gw1' || /GW1 price/i.test(label)) headerMap.gw1 = th;
      else if(key === 'now' || /^current$/i.test(label)) headerMap.now = th;
      else if(key === 'total' || /Total Δ/i.test(label)) headerMap.total = th;
      else if(key === 'event' || /This GW/i.test(label)) headerMap.event = th;
      else if(key === 'own' || /^owned$/i.test(label)) headerMap.own = th;
      else if(key === 'points' || /Total Points/i.test(label)) headerMap.points = th;
      else if(key === 'priceStatusRank' || key === 'status' || /^status$/i.test(label)) headerMap.status = th;
    });

    function ensureHeader(key, label){
      var th = headerMap[key] || document.createElement('th');
      th.className = key === 'name' ? 'col-player' : 'num';
      th.setAttribute('data-key', key === 'status' ? 'priceStatusRank' : key);
      th.innerHTML = headerButton(label);
      return th;
    }

    var orderedHeaders = [
      ensureHeader('name','Player'),
      ensureHeader('status','Status'),
      ensureHeader('gw1','GW1 price'),
      ensureHeader('now','Current'),
      ensureHeader('total','Total Δ'),
      ensureHeader('event','This GW'),
      ensureHeader('points','Total Points'),
      ensureHeader('own','Owned')
    ];
    headerRow.replaceChildren.apply(headerRow, orderedHeaders);

    var rows = Array.prototype.slice.call(body.querySelectorAll('tr[data-player-id]'));
    rows.forEach(function(row){
      var cells = Array.prototype.slice.call(row.children);
      var map = {};
      cells.forEach(function(td){
        if(td.classList.contains('col-player')) map.name = td;
        else if(td.querySelector('.pw-status')) map.status = td;
        else if(!map.gw1) map.gw1 = td;
        else if(!map.now) map.now = td;
        else if(!map.total) map.total = td;
        else if(!map.event) map.event = td;
        else if(!map.points && /^\d+$/.test(td.textContent.trim())) map.points = td;
        else if(!map.own) map.own = td;
      });
      var id = Number(row.getAttribute('data-player-id'));
      var player = state.players.find(function(p){ return Number(p.id) === id; });
      if(!player) return;
      var statusCell = map.status || document.createElement('td');
      var pointsCell = map.points || document.createElement('td');
      statusCell.className = 'num';
      statusCell.innerHTML = pwStatusHtml(player);
      pointsCell.className = 'num';
      pointsCell.textContent = String(player.points || 0);
      var orderedCells = [map.name,map.status ? statusCell : statusCell,map.gw1,map.now,map.total,map.event,pointsCell,map.own];
      orderedCells.forEach(function(td){ if(td) row.appendChild(td); });
    });

    if(!headerRow.__pwSortBound){
      headerRow.__pwSortBound = true;
      headerRow.addEventListener('click', function(e){
        var button = e.target.closest('.sort-btn');
        var th = button && button.closest('th[data-key]');
        if(!th) return;
        var key = th.getAttribute('data-key');
        if(state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = key === 'name' ? 'asc' : 'desc'; }
        render();
      });
    }
  }

  async function loadPricePredictor(){
    if(pwPredictorLoading) return;
    var now = Date.now();
    if(pwPredictorData && now - pwPredictorLastLoaded < 60000) return;
    pwPredictorLoading = true;
    try{
      var res = await fetch('/price-data', { cache:'no-store' });
      var data = await res.json();
      if(res.ok && data && data.players){
        pwPredictorData = data.players;
        pwPredictorLastLoaded = Date.now();
      }
    }catch(_){ } finally {
      pwPredictorLoading = false;
      normalizeTable();
    }
  }

  if(!window.__pwPricePredictorBound){
    window.__pwPricePredictorBound = true;
    var pwObserver = new MutationObserver(function(){ normalizeTable(); });
    var pwTbody = document.getElementById('tbody');
    if(pwTbody) pwObserver.observe(pwTbody,{childList:true});
    setInterval(loadPricePredictor, 15 * 60 * 1000);
    setTimeout(loadPricePredictor, 0);
    setTimeout(normalizeTable, 0);
  }`;
  if (html.includes(marker) && !html.includes("window.__pwPricePredictorBound")) html = html.replace(marker, injected);
  return new Response(html, { status: response.status, headers: response.headers });
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/fpl" || url.pathname === "/.netlify/functions/fpl") return handleFpl(url);
  if (url.pathname === "/price-data") return handlePriceData();
  if (url.pathname === "/team") return handleTeam(url);
  return serveAsset(request, env);
} };
