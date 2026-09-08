exports.handler = async function (event) {
  try {
    const params = event && event.queryStringParameters ? event.queryStringParameters : {};
    const requestedPath = String(params.path || "bootstrap-static/")
      .replace(/^https?:\/\/[^/]+\/api\//i, "")
      .replace(/^\/+/, "");

    const allowed = /^(bootstrap-static\/|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?|element-summary\/\d+\/?)$/;
    if (!allowed.test(requestedPath)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Unsupported FPL API path" })
      };
    }

    const target = "https://fantasy.premierleague.com/api/" + requestedPath;
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)" }
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Upstream error " + res.status })
      };
    }

    const data = await res.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": requestedPath === "bootstrap-static/" ? "public, max-age=60" : "public, max-age=30",
        "Access-Control-Allow-Origin": "*"
      },
      body: data
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(err) })
    };
  }
};