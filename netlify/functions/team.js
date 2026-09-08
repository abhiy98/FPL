exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  try {
    const params = event && event.queryStringParameters ? event.queryStringParameters : {};
    const id = Number.parseInt(String(params.id || ""), 10);
    if (!Number.isInteger(id) || id <= 0) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid FPL team id" }) };
    const base = "https://fantasy.premierleague.com/api/entry/" + id;
    const get = async (url) => { const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)", Accept: "application/json" } }); if (!r.ok) throw new Error("FPL returned HTTP " + r.status); return r.json(); };
    const entry = await get(base + "/");
    const gw = Number.parseInt(String(entry.current_event || ""), 10);
    if (!Number.isInteger(gw) || gw < 1) throw new Error("FPL team has no current gameweek");
    let picks = [];
    let selectedGameweek = gw;
    try { const d = await get(base + "/event/" + gw + "/picks/"); picks = Array.isArray(d.picks) ? d.picks : []; } catch (_) {}
    if (!picks.length && gw > 1) { try { const d = await get(base + "/event/" + (gw - 1) + "/picks/"); picks = Array.isArray(d.picks) ? d.picks : []; if (picks.length) selectedGameweek = gw - 1; } catch (_) {} }
    if (!picks.length) throw new Error("FPL returned no picks for GW " + gw);
    return { statusCode: 200, headers: { ...headers, "Cache-Control": "public, max-age=30" }, body: JSON.stringify({ id, name: entry.name || "", value: entry.last_deadline_value || entry.value || 0, bank: entry.last_deadline_bank || entry.bank || 0, currentGameweek: gw, gameweek: selectedGameweek, picks: picks.map(p => p.element) }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
