const FPL_API = "https://fantasy.premierleague.com/api/";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");

  const normalized = requestedPath.replace(/\s+$/, "");
  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(normalized)) {
    return new Response(JSON.stringify({ error: "Unsupported FPL API path" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const response = await fetch(FPL_API + normalized, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
        "Accept": "application/json"
      }
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": normalized === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
