const API_ROUTE = "/fpl";
const FPL_ORIGIN = "https://fantasy.premierleague.com/api/";
const DEFAULT_TIMEOUT_MS = 8_000;

function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { cache: "no-store", signal: controller.signal })
    .finally(() => window.clearTimeout(timer));
}

function buildApiUrl(path) {
  return API_ROUTE + "?path=" + encodeURIComponent(path.replace(/^\/+/, ""));
}

function buildProxyUrls(path) {
  const target = FPL_ORIGIN + path.replace(/^\/+/, "");
  return [
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
    "https://api.allorigins.win/get?url=" + encodeURIComponent(target)
  ];
}

async function readJsonResponse(response, source) {
  if (!response.ok) throw new Error(source + " returned HTTP " + response.status);
  if (source === "allorigins-get") {
    const wrapped = await response.json();
    if (!wrapped || typeof wrapped.contents !== "string") {
      throw new Error("AllOrigins did not return FPL contents");
    }
    return JSON.parse(wrapped.contents);
  }
  return response.json();
}

export async function fetchPublicApi(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const sources = [
    { url: buildApiUrl(cleanPath), name: "Cloudflare FPL route" },
    { url: buildProxyUrls(cleanPath)[0], name: "allorigins-raw" },
    { url: buildProxyUrls(cleanPath)[1], name: "allorigins-get" }
  ];

  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetchWithTimeout(source.url);
      return await readJsonResponse(
        response,
        source.name === "allorigins-get" ? "allorigins-get" : source.name
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("All FPL data sources failed");
}

export async function fetchBootstrap(onAttempt) {
  if (onAttempt) onAttempt(1, 3);
  const data = await fetchPublicApi("bootstrap-static/");
  if (!data || !Array.isArray(data.elements)) {
    throw new Error("FPL returned an invalid bootstrap response");
  }
  return data;
}

export async function fetchPriceData() {
  const response = await fetchWithTimeout("/price-data");
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
