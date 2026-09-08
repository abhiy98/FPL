const FPL_API = "https://fantasy.premierleague.com/api/";

const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

async function fplJson(path) {
  const response = await fetch(FPL_API + path, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)", "Accept": "application/json" }
  });
  if (!response.ok) throw new Error("FPL returned HTTP " + response.status);
  return response.json();
}

async function handleFpl(url) {
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/").replace(/^https?:\/\/[^/]+\/api\//i, "").replace(/^\/+/, "");
  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) return json({ error: "Unsupported FPL API path" }, 400);
  try {
    const response = await fetch(FPL_API + requestedPath, { headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)", "Accept": "application/json" } });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { ...JSON_HEADERS, "Cache-Control": requestedPath === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30" } });
  } catch (error) { return json({ error: String(error) }, 502); }
}

async function handleTeam(url) {
  const id = Number.parseInt(url.searchParams.get("id") || "", 10);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid FPL team id" }, 400);
  try {
    const entry = await fplJson("entry/" + id + "/");
    const currentGameweek = Number.parseInt(String(entry.current_event || ""), 10);
    if (!Number.isInteger(currentGameweek) || currentGameweek < 1) throw new Error("FPL team has no current gameweek");
    let picks = [], gameweek = currentGameweek;
    try { const current = await fplJson("entry/" + id + "/event/" + currentGameweek + "/picks/"); picks = Array.isArray(current.picks) ? current.picks : []; } catch (_) {}
    if (!picks.length && currentGameweek > 1) {
      try { const previous = await fplJson("entry/" + id + "/event/" + (currentGameweek - 1) + "/picks/"); picks = Array.isArray(previous.picks) ? previous.picks : []; if (picks.length) gameweek = currentGameweek - 1; } catch (_) {}
    }
    if (picks.length !== 15) throw new Error("FPL returned " + picks.length + " players instead of 15");
    return json({ id, name: entry.name || "", value: entry.last_deadline_value || entry.value || 0, bank: entry.last_deadline_bank || entry.bank || 0, currentGameweek, gameweek, picks: picks.map((pick) => Number(pick.element)) }, 200, { "Cache-Control": "public, max-age=30" });
  } catch (error) { return json({ error: String(error) }, 502); }
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
  pwStatusStyle.textContent = '.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.rise .pw-status-dot{background:#00ff85}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.drop .pw-status-dot{background:#ff3b5c}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-status.neutral .pw-status-dot{background:var(--flat)}';
  document.head.appendChild(pwStatusStyle);

  function pwPriceStatus(player){
    var projected = Number(player.priceChangeProjected != null ? player.priceChangeProjected : player.priceChangePercent);
    if (!Number.isFinite(projected)) return { text:'Unlikely to Change', cls:'neutral', rank:0 };
    if (projected <= -100) return { text:'Very Likely to Drop', cls:'drop', rank:500 };
    if (projected <= -95) return { text:'Likely to Drop', cls:'drop', rank:400 };
    if (projected >= 100) return { text:'Very Likely to Rise', cls:'rise', rank:500 };
    if (projected >= 95) return { text:'Likely to Rise', cls:'rise', rank:400 };
    return { text:'Unlikely to Change', cls:'neutral', rank:100 };
  }

  function pwStatusHtml(player){
    var status = pwPriceStatus(player);
    player.priceStatusRank = status.rank;
    return '<span class="pw-status '+status.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(status.text)+'</span>';
  }

  function normalizePriceStatusColumn(){
    var headerRow=document.querySelector('thead tr');
    var body=document.getElementById('tbody');
    if(!headerRow || !body || !window.state) return;
    var headers=Array.prototype.slice.call(headerRow.children);
    var statusTh=headers.find(function(th){return /^(status|price change)$/i.test(th.textContent.trim());});
    if(!statusTh){
      statusTh=document.createElement('th');
      statusTh.className='num';
      statusTh.setAttribute('data-key','priceStatusRank');
      statusTh.innerHTML='<button class="sort-btn">Status<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button>';
      headerRow.insertBefore(statusTh,headerRow.children[1]||null);
    } else {
      statusTh.setAttribute('data-key','priceStatusRank');
      if(headerRow.children[1]!==statusTh) headerRow.insertBefore(statusTh,headerRow.children[1]||null);
    }
    var index=Array.prototype.indexOf.call(headerRow.children,statusTh);
    Array.prototype.forEach.call(body.querySelectorAll('tr[data-player-id]'),function(row){
      var id=Number(row.getAttribute('data-player-id'));
      var player=state.players.find(function(p){return Number(p.id)===id;});
      if(!player) return;
      var statusCell=row.querySelector('.pw-status') && row.querySelector('.pw-status').parentElement;
      if(statusCell && row.children[index]!==statusCell) row.insertBefore(statusCell,row.children[index]||null);
      if(!statusCell){
        statusCell=document.createElement('td');
        statusCell.className='num';
        row.insertBefore(statusCell,row.children[index]||null);
      }
      statusCell.className='num';
      statusCell.innerHTML=pwStatusHtml(player);
    });
  }

  if (!window.__pwStatusColumnBound) {
    window.__pwStatusColumnBound = true;
    normalizePriceStatusColumn();
    var pwStatusObserver = new MutationObserver(function(){ normalizePriceStatusColumn(); });
    var pwTbody=document.getElementById('tbody');
    if(pwTbody) pwStatusObserver.observe(pwTbody,{childList:true});
    document.addEventListener('click',function(e){
      var th=e.target.closest('th[data-key="priceStatusRank"]');
      if(th){ setTimeout(normalizePriceStatusColumn,0); }
    },true);
  }`;
  if (html.includes(marker) && !html.includes("window.__pwStatusColumnBound")) html = html.replace(marker, injected);
  return new Response(html, { status: response.status, headers: response.headers });
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/fpl" || url.pathname === "/.netlify/functions/fpl") return handleFpl(url);
  if (url.pathname === "/team") return handleTeam(url);
  return serveAsset(request, env);
} };
