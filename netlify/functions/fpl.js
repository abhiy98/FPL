exports.handler = async function () {
  try {
    const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)" }
    });
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "Upstream error " + res.status })
      };
    }
    const data = await res.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*"
      },
      body: data
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: String(err) })
    };
  }
};
