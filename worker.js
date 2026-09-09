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
      headers: { ...FETCH_HEADERS, "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error("Price predictor returned HTTP " + response.status);

    const raw = await response.json();
    const source = raw && raw.players ? raw.players : raw;
    const players = {};

    Object.keys(source || {}).forEach((id) => {
      const item = source[id] || {};
      const predicted = Number(item.progress_tonight);
      players[String(id)] = {
        progress: Number.isFinite(Number(item.progress)) ? Number(item.progress) : null,
        predictedProgress: Number.isFinite(predicted) ? predicted : null
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
    if (url.pathname === "/fpl" || url.pathname === "/.netlify/functions/fpl") return handleFpl(url);
    if (url.pathname === "/price-data") return handlePriceData();
    if (url.pathname === "/team") return handleTeam(url);
    return env.ASSETS.fetch(request);
  }
};
