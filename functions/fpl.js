const FPL_API = "https://fantasy.premierleague.com/api/";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://www.livefpl.net/prices"
};

export async function onRequestGet(context) {
  const requestedPath = String(new URL(context.request.url).searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");

  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/(?:history|transfers)\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) {
    return new Response(JSON.stringify({ error: "Unsupported FPL API path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const response = await fetch(FPL_API + requestedPath, { headers: HEADERS });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": requestedPath === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
