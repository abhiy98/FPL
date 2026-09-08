const FPL_API = "https://fantasy.premierleague.com/api/entry/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PriceWatch/1.0)",
      "Accept": "application/json"
    }
  });
  if (!response.ok) throw new Error("FPL returned HTTP " + response.status);
  return response.json();
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = Number.parseInt(url.searchParams.get("id") || "", 10);

  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "Invalid FPL team id" }), {
      status: 400,
      headers: cors
    });
  }

  try {
    const base = FPL_API + id;
    const entry = await getJson(base + "/");
    const currentGameweek = Number.parseInt(String(entry.current_event || ""), 10);
    if (!Number.isInteger(currentGameweek) || currentGameweek < 1) {
      throw new Error("FPL team has no current gameweek");
    }

    let picks = [];
    let gameweek = currentGameweek;

    try {
      const current = await getJson(base + "/event/" + currentGameweek + "/picks/");
      picks = Array.isArray(current.picks) ? current.picks : [];
    } catch (_) {}

    if (!picks.length && currentGameweek > 1) {
      try {
        const previous = await getJson(base + "/event/" + (currentGameweek - 1) + "/picks/");
        picks = Array.isArray(previous.picks) ? previous.picks : [];
        if (picks.length) gameweek = currentGameweek - 1;
      } catch (_) {}
    }

    if (picks.length !== 15) {
      throw new Error("FPL returned " + picks.length + " players instead of 15");
    }

    return new Response(JSON.stringify({
      id,
      name: entry.name || "",
      value: entry.last_deadline_value || entry.value || 0,
      bank: entry.last_deadline_bank || entry.bank || 0,
      currentGameweek,
      gameweek,
      picks: picks.map((pick) => Number(pick.element))
    }), {
      status: 200,
      headers: { ...cors, "Cache-Control": "public, max-age=30" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: cors
    });
  }
}
