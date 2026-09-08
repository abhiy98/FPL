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
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
      "Accept": "application/json"
    }
  });
  if (!response.ok) throw new Error("FPL returned HTTP " + response.status);
  return response.json();
}

async function handleFpl(url) {
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");

  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) {
    return json({ error: "Unsupported FPL API path" }, 400);
  }

  try {
    const response = await fetch(FPL_API + requestedPath, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
        "Accept": "application/json"
      }
    });
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

async function handleTeam(url) {
  const id = Number.parseInt(url.searchParams.get("id") || "", 10);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid FPL team id" }, 400);

  try {
    const entry = await fplJson("entry/" + id + "/");
    const currentGameweek = Number.parseInt(String(entry.current_event || ""), 10);
    if (!Number.isInteger(currentGameweek) || currentGameweek < 1) {
      throw new Error("FPL team has no current gameweek");
    }

    let picks = [];
    let gameweek = currentGameweek;
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

    if (picks.length !== 15) {
      throw new Error("FPL returned " + picks.length + " players instead of 15");
    }

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
  if (!contentType.includes("text/html") || (url.pathname !== "/" && !url.pathname.endsWith(".html"))) {
    return response;
  }

  let html = await response.text();

  const proxyFrom = '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },';
  const proxyTo = '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },';
  html = html.replace(proxyFrom, proxyTo);

  // Remove the old injected team-filter observer. It maintained a second
  // hidden list of team IDs and could override the real application state.
  html = html.replace(/<!-- pricewatch:team-ui-fix -->[\s\S]*?<\/script>/g, "");

  // The source HTML uses double quotes for this variable declaration.
  // Inject the authoritative handlers inside the app's closure so they can
  // update the real state object used by applyFilters() and render().
  const marker = '  var risersOnly = document.getElementById("risersOnly");';
  const injected = marker + `

  var myTeamOnlyChip = document.getElementById('myTeamOnly');
  if (myTeamOnlyChip && !myTeamOnlyChip.__pwBound) {
    myTeamOnlyChip.__pwBound = true;
    myTeamOnlyChip.addEventListener('click', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      state.myTeamOnly = !state.myTeamOnly;
      myTeamOnlyChip.classList.toggle('active', state.myTeamOnly);
      render();
    }, true);
  }

  var clearTeamButton = document.getElementById('pwClearTeam');
  if (clearTeamButton && !clearTeamButton.__pwBound) {
    clearTeamButton.__pwBound = true;
    clearTeamButton.addEventListener('click', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      state.team = null;
      state.myTeamOnly = false;
      clearTeamButton.style.display = 'none';
      if (myTeamOnlyChip) myTeamOnlyChip.classList.remove('active');
      try { localStorage.removeItem(STORE_KEY_TEAM); } catch (_) {}
      var input = document.getElementById('pwTeamId');
      if (input) input.value = '';
      render();
      showToast('Team cleared');
    }, true);
  }`;
  if (html.includes(marker) && !html.includes("myTeamOnlyChip.__pwBound")) {
    html = html.replace(marker, injected);
  }

  return new Response(html, {
    status: response.status,
    headers: response.headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/fpl" || url.pathname === "/.netlify/functions/fpl") return handleFpl(url);
    if (url.pathname === "/team") return handleTeam(url);
    return serveAsset(request, env);
  }
};