const FPL_API = "https://fantasy.premierleague.com/api/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const requestedPath = String(url.searchParams.get("path") || "bootstrap-static/")
    .replace(/^https?:\/\/[^/]+\/api\//i, "")
    .replace(/^\/+/, "");

  const allowed = /^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if (!allowed.test(requestedPath)) {
    return new Response(JSON.stringify({ error: "Unsupported FPL API path" }), {
      status: 400,
      headers: cors
    });
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
        ...cors,
        "Cache-Control": requestedPath === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: cors
    });
  }
}
