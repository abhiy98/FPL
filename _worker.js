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
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-CA,en;q=0.9,en-US;q=0.8",
  "Referer": "https://fantasy.premierleague.com/"
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

const FPL_PROXY_SOURCES = [
  (target) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
  (target) => "https://api.allorigins.win/get?url=" + encodeURIComponent(target)
];

async function fetchText(url, headers = FETCH_HEADERS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      headers,
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    return { response, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFplText(path) {
  const target = FPL_API + path;
  let lastError = null;

  try {
    const result = await fetchText(target);
    if (result.response.ok) return { text: result.text, source: "fpl" };
    lastError = new Error("FPL returned HTTP " + result.response.status);
  } catch (error) {
    lastError = error;
  }

  for (const buildProxyUrl of FPL_PROXY_SOURCES) {
    const proxyUrl = buildProxyUrl(target);
    try {
      const result = await fetchText(proxyUrl);
      if (!result.response.ok) {
        lastError = new Error("FPL proxy returned HTTP " + result.response.status);
        continue;
      }

      if (proxyUrl.includes("/get?")) {
        const wrapped = JSON.parse(result.text);
        if (wrapped && typeof wrapped.contents === "string") {
          return { text: wrapped.contents, source: "allorigins-get" };
        }
        lastError = new Error("FPL proxy response did not contain contents");
        continue;
      }

      return { text: result.text, source: "allorigins-raw" };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("All FPL data sources failed");
}

async function fplJson(path) {
  const result = await fetchFplText(path);
  try {
    return JSON.parse(result.text);
  } catch {
    throw new Error("FPL returned invalid JSON via " + result.source);
  }
}

async function handleFpl(url) {
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");
  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) return json({ error: "Unsupported FPL API path" }, 400);

  try {
    const result = await fetchFplText(requestedPath);
    return new Response(result.text, {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        "Cache-Control": "no-store",
        "X-FPL-Source": result.source
      }
    });
  } catch (error) {
    return json({ error: String(error) }, 502, { "Cache-Control": "no-store" });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/fpl") return handleFpl(url);
    if (url.pathname === "/price-data") return handlePriceData();
    if (url.pathname === "/team") return handleTeam(url);
    return env.ASSETS.fetch(request);
  }
};
