const API_ROUTE = "/fpl";
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

export async function fetchPublicApi(path) {
  const response = await fetchWithTimeout(buildApiUrl(path));
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

export async function fetchBootstrap(onAttempt) {
  if (onAttempt) onAttempt(1, 1);
  return fetchPublicApi("bootstrap-static/");
}
