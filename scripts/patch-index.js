const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let html = fs.readFileSync(file, "utf8");

function replaceRequired(label, pattern, replacement) {
  const next = html.replace(pattern, replacement);
  if (next === html) throw new Error(`Build patch failed: ${label}`);
  html = next;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Build verification failed: ${message}`);
}

// One canonical browser API path for the Cloudflare deployment.
replaceRequired(
  "FPL proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);

replaceRequired(
  "bootstrap completeness validation",
  '        if (!data || !data.elements || !data.elements.length) throw new Error("Unexpected payload");',
  '        if (!data || !Array.isArray(data.elements) || data.elements.length < 300) throw new Error("Incomplete player payload");'
);

// The price-change countdown belongs to the dashboard card. Never create it in the header.
html = html.replace(/\s*<div class="pw-price-timer">[\s\S]*?<\/div>/g, "");
html = html.replace(/\s*\.pw-price-timer\{[^}]*\}/g, "");

replaceRequired(
  "dashboard price-change card",
  /<div class="pw-stat"><div class="label">Deadline<\/div><div class="value" id="pwDeadline">[\s\S]*?<\/div><div class="hint">next gameweek lock<\/div><\/div>/,
  '<div class="pw-stat"><div class="label">Price change</div><div class="value" id="pwDeadline">—</div><div class="hint">next price change</div></div>'
);

replaceRequired(
  "price-change countdown function",
  /  function formatCountdown\(deadline\)\{[\s\S]*?\n  \}\n/,
  `  function formatCountdown(deadline){ if(!deadline) return "—"; var diff=new Date(deadline).getTime()-Date.now(); if(diff<=0)return "Locked"; var s=Math.floor(diff/1000),d=Math.floor(s/86400); s%=86400; var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60); return d?d+"d "+h+"h":h?h+"h":m+"m"; }\n\n  function formatPriceChangeCountdown(){\n    var now=new Date(),parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now),o={};\n    parts.forEach(function(x){if(x.type!=="literal")o[x.type]=x.value;});\n    var utcNow=Date.UTC(Number(o.year),Number(o.month)-1,Number(o.day),Number(o.hour),Number(o.minute),Number(o.second));\n    var offset=utcNow-now.getTime(),next=Date.UTC(Number(o.year),Number(o.month)-1,Number(o.day)+1,0,0,0)-offset;\n    var seconds=Math.max(0,Math.floor((next-now.getTime())/1000)),hh=Math.floor(seconds/3600);seconds%=3600;var mm=Math.floor(seconds/60),ss=seconds%60;\n    return String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");\n  }\n`
);

replaceRequired(
  "dashboard countdown binding",
  "    var ev=currentEvent(state.events); if(dl)dl.textContent=ev?formatCountdown(ev.deadline_time):'—';",
  "    if(dl)dl.textContent=formatPriceChangeCountdown();"
);

// Final table schema: Player, Status, GW1 price, Current, Total Δ, This GW, Total Points, Owned.
replaceRequired(
  "table header schema",
  /    <thead>\s*<tr>[\s\S]*?<\/tr>\s*<\/thead>/,
  `    <thead>\n      <tr>\n        <th class="col-player" data-key="name"><button class="sort-btn">Player<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="priceStatusRank" class="num"><button class="sort-btn">Status<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="gw1" class="num"><button class="sort-btn">GW1 price<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="now" class="num"><button class="sort-btn">Current<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="total" class="num"><button class="sort-btn">Total Δ<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="own" class="num"><button class="sort-btn">Owned<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n      </tr>\n    </thead>`
);

// Skeleton rows match the exact final table width.
replaceRequired(
  "table skeleton",
  /    <tbody id="tbody">[\s\S]*?<\/tbody>/,
  `    <tbody id="tbody">\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:110px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:90px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:130px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n    </tbody>`
);

// Real center alignment; preserve all existing dimensions.
replaceRequired(
  "center numeric data",
  /  td\.num\{text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";\}\n/,
  '  td.num{text-align:center;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}\n'
);
replaceRequired("center numeric headers", "  th.num button.sort-btn{justify-content:flex-end;}\n", "  th.num button.sort-btn{justify-content:center;}\n");
replaceRequired("center ownership", "  .own-bar-wrap{display:flex;align-items:center;justify-content:flex-end;gap:7px;}\n", "  .own-bar-wrap{display:flex;align-items:center;justify-content:center;gap:7px;}\n");
replaceRequired("center player", "  .player-cell{display:flex;align-items:center;gap:9px;padding:9px 12px;}\n", "  .player-cell{display:flex;align-items:center;justify-content:center;gap:9px;padding:9px 12px;text-align:center;}\n");

// Predictor state belongs to the application, not the Worker DOM layer.
replaceRequired(
  "predictor state",
  '  var risersOnly = document.getElementById("risersOnly");',
  `  var risersOnly = document.getElementById("risersOnly");\n  var pricePredictorData = {};\n  var pricePredictorLoading = false;\n\n  function priceStatus(player){\n    var item=pricePredictorData[String(player.id)]||null,predicted=item&&Number.isFinite(item.predictedProgress)?item.predictedProgress:null;\n    if(predicted==null){player.priceStatusRank=0;return {text:"—",cls:"neutral"};}\n    var pct=predicted*100;\n    if(pct>=100){player.priceStatusRank=5;return {text:"Very Likely to Rise",cls:"rise"};}\n    if(pct>=80){player.priceStatusRank=4;return {text:"Likely to Rise",cls:"rise"};}\n    if(pct<=-100){player.priceStatusRank=5;return {text:"Very Likely to Drop",cls:"drop"};}\n    if(pct<=-80){player.priceStatusRank=4;return {text:"Likely to Drop",cls:"drop"};}\n    player.priceStatusRank=1;return {text:"Unlikely to Change",cls:"neutral"};\n  }\n\n  function priceStatusMarkup(player){var s=priceStatus(player);return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>'; }\n\n  async function loadPricePredictor(){\n    if(pricePredictorLoading)return;pricePredictorLoading=true;\n    try{var res=await fetchWithTimeout('/price-data',8000),data=await res.json();if(res.ok&&data&&data.players)pricePredictorData=data.players;}catch(e){}\n    finally{pricePredictorLoading=false;render();}\n  }\n`
);

replaceRequired(
  "predictor CSS",
  /<\/style>/,
  `.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.rise .pw-status-dot{background:#00ff85}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.drop .pw-status-dot{background:#ff3b5c}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-status.neutral .pw-status-dot{background:var(--flat)}\n</style>`
);

replaceRequired(
  "table row renderer",
  /      var maxOwn = 40;\n      tbody\.innerHTML = sorted\.map\(function\(p\)\{[\s\S]*?      \}\)\.join\('\'\);/,
  `      var maxOwn=40;\n      tbody.innerHTML=sorted.map(function(p){\n        var total=fmtDelta(p.total),event=fmtDelta(p.event),ownPct=Math.min(100,(p.own/maxOwn)*100),isFav=state.favs.has(p.id),isWatch=state.watchlist.has(p.id),isOwned=state.team&&state.team.picks.has(p.id),statusHtml=priceStatusMarkup(p);\n        var mom=p.netTransfers>0?'<span class="momentum up">▲</span>':p.netTransfers<0?'<span class="momentum down">▼</span>':'<span class="momentum neutral">•</span>';\n        return '<tr data-player-id="'+p.id+'" tabindex="0" role="button" class="'+(isOwned?'pw-row-owned ':'')+(isWatch?'pw-row-watch':'')+'">'+\n          '<td class="col-player"><div class="player-cell"><div class="action-buttons">'+\n          '<button class="fav-btn'+(isFav?' active':'')+'" data-fav-id="'+p.id+'" aria-label="Toggle favourite">'+(isFav?'★':'☆')+'</button>'+\n          '<button class="watch-btn'+(isWatch?' active':'')+'" data-watch-id="'+p.id+'" aria-label="Toggle watchlist">'+(isWatch?'◉':'○')+'</button></div>'+\n          '<div class="player-text"><span class="player-name">'+escapeHtml(p.name)+'</span><span class="player-meta"><span class="pos-badge pos-'+p.pos+'">'+p.pos+'</span>'+escapeHtml(p.team)+' · '+mom+'</span></div></div></td>'+\n          '<td class="num">'+statusHtml+'</td>'+\n          '<td class="num price">'+fmtPrice(p.gw1)+'</td><td class="num price">'+fmtPrice(p.now)+'</td>'+\n          '<td class="num"><span class="delta '+total.cls+'"><span class="arrow">'+total.arrow+'</span>'+total.text+'</span></td>'+\n          '<td class="num"><span class="delta '+event.cls+'"><span class="arrow">'+event.arrow+'</span>'+event.text+'</span></td>'+\n          '<td class="num">'+p.points+'</td>'+\n          '<td class="num"><div class="own-bar-wrap">'+p.own.toFixed(1)+'%<span class="own-bar"><i style="width:'+ownPct+'%"></i></span></div></td></tr>';\n      }).join('');`
);

// Use the single Cloudflare team endpoint and avoid races with the gameweek state.
replaceRequired(
  "team loader",
  /  async function loadMyTeam\(\)\{[\s\S]*?\n  \}\n  async function restoreTeam/,
  `  async function loadMyTeam(){\n    var input=document.getElementById('pwTeamId'),id=parseInt(input&&input.value?input.value.trim():'',10);if(!id){showToast('Enter a valid FPL Team ID');return;}\n    var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';\n    try{var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000),data=await res.json();if(!res.ok||!data||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data&&data.error?data.error:'Expected 15 players');\n      state.team={id:id,picks:new Set(data.picks.map(function(x){return Number(x);})),value:data.value||0,bank:data.bank||0,name:data.name||''};try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}\n      state.myTeamOnly=true;var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');showToast('Team loaded · GW '+(data.gameweek||data.currentGameweek||'—'));render();\n    }catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+(e&&e.message?e.message:'Unable to load team');showToast('Couldn\\'t load my team');}\n    finally{button.disabled=false;button.textContent='Load my team';}\n  }\n  async function restoreTeam`
);

// Version the offline cache without losing compatibility with existing snapshots.
replaceRequired(
  "snapshot persistence",
  /  function persistSnapshot\(players, at\)\{[\s\S]*?\n  \}\n\n  function loadSnapshot\(\)\{[\s\S]*?\n  \}\n/,
  `  function persistSnapshot(players,at){try{var data=players.map(function(p){return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes];});localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({version:2,at:at.toISOString(),data:data}));}catch(e){}}\n\n  function loadSnapshot(){try{var raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;var parsed=JSON.parse(raw),data=Array.isArray(parsed.data)?parsed.data:[],players=data.map(function(a){return {id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0};});return {players:players,at:parsed.at};}catch(e){return null;}}\n`
);

// Keyboard support for the existing filter controls and player rows.
replaceRequired(
  "filter keyboard support",
  '  posBar.addEventListener("click", function(e){',
  `  document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.classList.contains('pos-chip')){e.preventDefault();e.target.click();}});\n\n  posBar.addEventListener("click", function(e){`
);
replaceRequired(
  "row keyboard support",
  '  tbody.addEventListener("click", function(e){',
  `  tbody.addEventListener("keydown",function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches('tr[data-player-id]')){e.preventDefault();openPlayer(parseInt(e.target.getAttribute('data-player-id'),10));}});\n\n  tbody.addEventListener("click", function(e){`
);

// Initialize predictor once and update only on its own 15-minute schedule.
replaceRequired(
  "predictor startup",
  '  refresh(false);\n  setInterval(function(){ refresh(false); }, POLL_MS);',
  `  refresh(false);\n  loadPricePredictor();\n  setInterval(function(){ refresh(false); }, POLL_MS);\n  setInterval(loadPricePredictor,15*60*1000);\n  setInterval(function(){var timer=document.getElementById('pwDeadline');if(timer)timer.textContent=formatPriceChangeCountdown();},1000);`
);

// Final source-level invariants. These fail the build rather than shipping a broken table.
const headers = (html.match(/<th\b/g) || []).length;
assert(headers === 8, `expected 8 table headers, found ${headers}`);
assert(/data-key="points"/.test(html) && /Total Points/.test(html), "Total Points header missing");
assert(/p\.points/.test(html), "Total Points player data is not rendered");
assert(/data-key="priceStatusRank"/.test(html), "Status column missing");
assert((html.match(/id="pwDeadline"/g) || []).length === 1, "Price Change dashboard target is not unique");
assert(!html.includes('class="pw-price-timer"'), "header price timer remains");
assert(html.includes('version:2'), "snapshot versioning missing");
assert(html.includes("/team?id="), "Team endpoint migration missing");

fs.writeFileSync(file, html);
console.log("Price Watch build patch complete");
