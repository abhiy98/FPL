const FPL_API = "https://fantasy.premierleague.com/api/";
const PRICE_PREDICTOR_APIS = [
  "https://livefpl.us/api/prices.json",
  "https://www.livefpl.net/api/prices.json"
];
const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://www.livefpl.net/prices"
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

function normalisePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) > 5 ? n / 100 : n;
}

function officialPriceRecord(player) {
  const projections = Array.isArray(player.price_change_projections) ? player.price_change_projections : [];
  const first = projections.length ? projections[0] : null;
  const progress = normalisePercent(player.price_change_percent);
  const predictedProgress = first ? normalisePercent(first.projected_percent) : progress;
  const likelihood = first && Number.isFinite(Number(first.likelihood)) ? Number(first.likelihood) : null;
  return { progress, predictedProgress, likelihood };
}

function normalisePredictor(source) {
  const players = {};
  const records = Array.isArray(source)
    ? source.map((item) => [item && (item.id ?? item.element_id ?? item.player_id), item])
    : Object.entries(source || {});

  records.forEach(([key, item]) => {
    if (!item || typeof item !== "object") return;
    const id = Number(item.id ?? item.element_id ?? item.player_id ?? key);
    if (!Number.isInteger(id) || id <= 0) return;
    const progress = normalisePercent(
      item.progress ?? item.progress_now ?? item.current_progress ?? item.progress_now_pct
    );
    const predictedProgress = normalisePercent(
      item.progress_tonight ?? item.predicted_progress ?? item.predictedProgress ?? item.prediction ?? progress
    );
    const likelihood = Number.isFinite(Number(item.likelihood)) ? Number(item.likelihood) : null;
    if (progress === null && predictedProgress === null) return;
    players[String(id)] = { progress, predictedProgress, likelihood };
  });

  return players;
}

async function handlePriceData() {
  // LiveFPL exposes the progress/prediction fields used by the price-change table.
  let lastError = null;
  for (const endpoint of PRICE_PREDICTOR_APIS) {
    try {
      const response = await fetch(endpoint, {
        headers: { ...FETCH_HEADERS, "Cache-Control": "no-cache" }
      });
      if (!response.ok) throw new Error(endpoint + " returned HTTP " + response.status);
      const raw = await response.json();
      const source = raw && raw.players ? raw.players : raw && raw.data ? raw.data : raw;
      const players = normalisePredictor(source);
      if (Object.keys(players).length) {
        return json({ players, source: endpoint }, 200, { "Cache-Control": "public, max-age=60" });
      }
      lastError = new Error(endpoint + " returned no predictor records");
    } catch (error) {
      lastError = error;
    }
  }

  // Official FPL data remains a fallback when the dedicated predictor is unavailable.
  try {
    const bootstrap = await fplJson("bootstrap-static/");
    const players = {};
    for (const player of bootstrap.elements || []) {
      const record = officialPriceRecord(player);
      if (record.progress !== null || record.predictedProgress !== null) {
        players[String(player.id)] = record;
      }
    }
    if (Object.keys(players).length) {
      return json({ players, source: "fpl-bootstrap" }, 200, { "Cache-Control": "public, max-age=60" });
    }
  } catch (error) {
    lastError = error;
  }

  return json(
    { error: String(lastError || "Price predictor unavailable"), players: {} },
    502,
    { "Cache-Control": "no-store" }
  );
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

async function handleAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;

  let html = await response.text();
  const legacyProxy = '{ build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } }';
  const canonicalProxy = '{ build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace(BOOTSTRAP_URL.replace(/bootstrap-static\\/$/,""),"")); }, parse: function(res){ return res.json(); } }';
  if (html.includes(legacyProxy)) html = html.replace(legacyProxy, canonicalProxy);

  if (!html.includes("/jersey-fix.js")) html = html.replace(/<\/body>/i, '<script src="/jersey-fix.js"></script></body>');
  if (!html.includes("/scroll-fix.js")) html = html.replace(/<\/body>/i, '<script src="/scroll-fix.js"></script></body>');
  if (!html.includes("/pwa-enhance.js")) html = html.replace(/<\/body>/i, '<script src="/pwa-enhance.js"></script></body>');

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/fpl" || url.pathname === "/.netlify/functions/fpl") return handleFpl(url);
    if (url.pathname === "/price-data") return handlePriceData();
    if (url.pathname === "/team") return handleTeam(url);
    if (url.pathname === "/" || url.pathname === "/index.html") return handleAsset(request, env);
    return env.ASSETS.fetch(request);
  }
};
