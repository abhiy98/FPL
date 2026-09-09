const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let html = fs.readFileSync(file, "utf8");

function replaceOnce(label, pattern, replacement) {
  const before = html;
  html = html.replace(pattern, replacement);
  if (html === before) throw new Error(`Build patch failed: ${label}`);
}

function assert(pattern, message) {
  if (!pattern.test(html)) throw new Error(`Build verification failed: ${message}`);
}

// Cloudflare is the primary runtime API. Keep the browser on one canonical path.
replaceOnce(
  "FPL proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);

replaceOnce(
  "bootstrap completeness guard",
  '        if (!data || !data.elements || !data.elements.length) throw new Error("Unexpected payload");',
  '        if (!data || !Array.isArray(data.elements) || data.elements.length < 300) throw new Error("Incomplete player payload");'
);

// The dashboard owns the price-change countdown. There must not be a header timer.
html = html.replace(/\s*<div class="pw-price-timer">[\s\S]*?<\/div>\s*/g, "\n");
html = html.replace(/\s*\.pw-price-timer\{[^}]*\}/g, "");

replaceOnce(
  "dashboard price-change label",
  /<div class="pw-stat"><div class="label">Deadline<\/div><div class="value" id="pwDeadline">([\s\S]*?)<\/div><div class="hint">next gameweek lock<\/div><\/div>/,
  '<div class="pw-stat"><div class="label">Price change</div><div class="value" id="pwDeadline">$1</div><div class="hint">next price change</div></div>'
);

replaceOnce(
  "price-change countdown helper",
  /  function formatCountdown\(deadline\)\{[\s\S]*?\n  \}\n/,
  `  function formatCountdown(deadline){ if(!deadline) return "—"; var diff=new Date(deadline).getTime()-Date.now(); if(diff<=0)return "Locked"; var s=Math.floor(diff/1000),d=Math.floor(s/86400); s%=86400; var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60); return d?d+"d "+h+"h":h?h+"h":m+"m"; }\n\n  function formatPriceChangeCountdown(){\n    var now=new Date();\n    var parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now),o={};\n    parts.forEach(function(x){if(x.type!=="literal")o[x.type]=x.value;});\n    var y=Number(o.year),m=Number(o.month)-1,d=Number(o.day),h=Number(o.hour),mi=Number(o.minute),se=Number(o.second);\n    var utcNow=Date.UTC(y,m,d,h,mi,se);\n    var offset=utcNow-now.getTime();\n    var nextMidnight=Date.UTC(y,m,d+1,0,0,0)-offset;\n    var seconds=Math.max(0,Math.floor((nextMidnight-now.getTime())/1000));\n    var hh=Math.floor(seconds/3600); seconds%=3600;\n    var mm=Math.floor(seconds/60); var ss=seconds%60;\n    return String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");\n  }\n`
);

replaceOnce(
  "dashboard countdown binding",
  "    var ev=currentEvent(state.events); if(dl)dl.textContent=ev?formatCountdown(ev.deadline_time):'—';",
  "    if(dl)dl.textContent=formatPriceChangeCountdown();"
);

// Define the final table schema in one place.
replaceOnce(
  "table header schema",
  /    <thead>\s*<tr>[\s\S]*?<\/tr>\s*<\/thead>/,
  `    <thead>\n      <tr>\n        <th class="col-player" data-key="name"><button class="sort-btn">Player<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="gw1" class="num"><button class="sort-btn">GW1 price<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="now" class="num"><button class="sort-btn">Current<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="total" class="num"><button class="sort-btn">Total Δ<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="own" class="num"><button class="sort-btn">Owned<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n      </tr>\n    </thead>`
);

// Skeleton rows must use the same seven-column shape as the finished table.
replaceOnce(
  "table skeleton",
  /    <tbody id="tbody">[\s\S]*?<\/tbody>/,
  `    <tbody id="tbody">\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:110px"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:90px"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:130px"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n    </tbody>`
);

// Center the actual cell contents; do not change table width or typography.
replaceOnce(
  "center column content",
  /  td\.num\{text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";\}\n/,
  '  td.num{text-align:center;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}\n'
);
replaceOnce(
  "center numeric headers",
  "  th.num button.sort-btn{justify-content:flex-end;}\n",
  "  th.num button.sort-btn{justify-content:center;}\n"
);
replaceOnce(
  "center ownership bar",
  "  .own-bar-wrap{display:flex;align-items:center;justify-content:flex-end;gap:7px;}\n",
  "  .own-bar-wrap{display:flex;align-items:center;justify-content:center;gap:7px;}\n"
);
replaceOnce(
  "center player cell",
  "  .player-cell{display:flex;align-items:center;gap:9px;padding:9px 12px;}\n",
  "  .player-cell{display:flex;align-items:center;justify-content:center;gap:9px;padding:9px 12px;text-align:center;}\n"
);

// Use real buttons for filters without changing their appearance.
html = html.replace(/<div class="pos-chip/g, '<button type="button" class="pos-chip');
html = html.replace(/<button type="button" class="pos-chip active"([^>]*)>([\s\S]*?)<\/div>/g, '<button type="button" class="pos-chip active"$1>$2</button>');
html = html.replace(/<button type="button" class="pos-chip"([^>]*)>([\s\S]*?)<\/div>/g, '<button type="button" class="pos-chip"$1>$2</button>');

// Add the predictor state and renderer. This is called from the same app render path,
// not by a MutationObserver.
replaceOnce(
  "predictor state",
  '  var risersOnly = document.getElementById("risersOnly");',
  `  var risersOnly = document.getElementById("risersOnly");\n  var pricePredictorData = {};\n  var pricePredictorLoading = false;\n\n  function priceStatus(player){\n    var item=pricePredictorData[String(player.id)]||null;\n    var predicted=item&&Number.isFinite(item.predictedProgress)?item.predictedProgress:null;\n    if(predicted==null){player.priceStatusRank=0;return {text:"—",cls:"neutral"};}\n    var pct=predicted*100;\n    if(pct>=100){player.priceStatusRank=5;return {text:"Very Likely to Rise",cls:"rise"};}\n    if(pct>=80){player.priceStatusRank=4;return {text:"Likely to Rise",cls:"rise"};}\n    if(pct<=-100){player.priceStatusRank=5;return {text:"Very Likely to Drop",cls:"drop"};}\n    if(pct<=-80){player.priceStatusRank=4;return {text:"Likely to Drop",cls:"drop"};}\n    player.priceStatusRank=1;return {text:"Unlikely to Change",cls:"neutral"};\n  }\n\n  function priceStatusMarkup(player){\n    var s=priceStatus(player);\n    return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>';\n  }\n\n  async function loadPricePredictor(){\n    if(pricePredictorLoading)return;\n    pricePredictorLoading=true;\n    try{\n      var res=await fetchWithTimeout('/price-data',8000);\n      var data=await res.json();\n      if(res.ok&&data&&data.players)pricePredictorData=data.players;\n    }catch(e){}\n    finally{pricePredictorLoading=false;render();}\n  }\n`
);

// Predictor styles.
replaceOnce(
  "predictor styles",
  /\.pw-price-timer strong\{[\s\S]*?<\/style>/,
  `.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.rise .pw-status-dot{background:#00ff85}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.drop .pw-status-dot{background:#ff3b5c}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-status.neutral .pw-status-dot{background:var(--flat)}\n</style>`
);

// Replace the table row rendering in one deterministic block.
replaceOnce(
  "table row renderer",
  /      var maxOwn = 40;\n      tbody\.innerHTML = sorted\.map\(function\(p\)\{[\s\S]*?      \}\)\.join\('\'\);/,
  `      var maxOwn = 40;\n      tbody.innerHTML = sorted.map(function(p){\n        var total=fmtDelta(p.total), event=fmtDelta(p.event), ownPct=Math.min(100,(p.own/maxOwn)*100), isFav=state.favs.has(p.id), isWatch=state.watchlist.has(p.id), isOwned=state.team&&state.team.picks.has(p.id), statusHtml=priceStatusMarkup(p);\n        var mom=p.netTransfers>0?'<span class="momentum up">▲</span>':p.netTransfers<0?'<span class="momentum down">▼</span>':'<span class="momentum neutral">•</span>';\n        return '<tr data-player-id="'+p.id+'" tabindex="0" role="button" class="'+(isOwned?'pw-row-owned ':'')+(isWatch?'pw-row-watch':'')+'">'+\n          '<td class="col-player"><div class="player-cell"><div class="action-buttons">'+\n          '<button class="fav-btn'+(isFav?' active':'')+'" data-fav-id="'+p.id+'" aria-label="Toggle favourite">'+(isFav?'★':'☆')+'</button>'+\n          '<button class="watch-btn'+(isWatch?' active':'')+'" data-watch-id="'+p.id+'" aria-label="Toggle watchlist">'+(isWatch?'◉':'○')+'</button></div>'+\n          '<div class="player-text"><span class="player-name">'+escapeHtml(p.name)+'</span><span class="player-meta"><span class="pos-badge pos-'+p.pos+'">'+p.pos+'</span>'+escapeHtml(p.team)+' · '+mom+'</span></div></div></td>'+\n          '<td class="num">'+statusHtml+'</td>'+\n          '<td class="num price">'+fmtPrice(p.gw1)+'</td><td class="num price">'+fmtPrice(p.now)+'</td>'+\n          '<td class="num"><span class="delta '+total.cls+'"><span class="arrow">'+total.arrow+'</span>'+total.text+'</span></td>'+\n          '<td class="num"><span class="delta '+event.cls+'"><span class="arrow">'+event.arrow+'</span>'+event.text+'</span></td>'+\n          '<td class="num">'+p.points+'</td>'+\n          '<td class="num"><div class="own-bar-wrap">'+p.own.toFixed(1)+'%<span class="own-bar"><i style="width:'+ownPct+'%"></i></span></div></td></tr>';\n      }).join('');`
);

// Load the team's picks through the single Cloudflare endpoint.
replaceOnce(
  "team loader",
  /  async function loadMyTeam\(\)\{[\s\S]*?\n  \}\n  async function restoreTeam/,
  `  async function loadMyTeam(){\n    var input=document.getElementById('pwTeamId'),id=parseInt(input&&input.value?input.value.trim():'',10);\n    if(!id){showToast('Enter a valid FPL Team ID');return;}\n    var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';\n    try{\n      var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000),data=await res.json();\n      if(!res.ok||!data||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data&&data.error?data.error:'Expected 15 players');\n      state.team={id:id,picks:new Set(data.picks.map(function(x){return Number(x);})),value:data.value||0,bank:data.bank||0,name:data.name||''};\n      try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}\n      state.myTeamOnly=true;var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');\n      showToast('Team loaded · GW '+(data.gameweek||data.currentGameweek||'—'));render();\n    }catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+(e&&e.message?e.message:'Unable to load team');showToast('Couldn\\'t load my team');}\n    finally{button.disabled=false;button.textContent='Load my team';}\n  }\n  async function restoreTeam`
);

// Version the offline snapshot while remaining backward-compatible with existing arrays.
replaceOnce(
  "snapshot persistence",
  /  function persistSnapshot\(players, at\)\{[\s\S]*?\n  \}\n\n  function loadSnapshot\(\)\{[\s\S]*?\n  \}\n/,
  `  function persistSnapshot(players,at){\n    try{\n      var data=players.map(function(p){return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes];});\n      localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({version:2,at:at.toISOString(),data:data}));\n    }catch(e){}\n  }\n\n  function loadSnapshot(){\n    try{\n      var raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;\n      var parsed=JSON.parse(raw),data=Array.isArray(parsed.data)?parsed.data:[];\n      var players=data.map(function(a){return {id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0};});\n      return {players:players,at:parsed.at};\n    }catch(e){return null;}\n  }\n`
);

// Make filters keyboard-accessible without giving them separate click implementations.
replaceOnce(
  "filter keyboard support",
  '  posBar.addEventListener("click", function(e){',
  `  document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches('.pos-chip')){e.preventDefault();e.target.click();}});\n\n  posBar.addEventListener("click", function(e){`
);

// Make player rows keyboard-accessible.
replaceOnce(
  "row keyboard support",
  '  tbody.addEventListener("click", function(e){',
  `  tbody.addEventListener("keydown",function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches('tr[data-player-id]')){e.preventDefault();openPlayer(parseInt(e.target.getAttribute('data-player-id'),10));}});\n\n  tbody.addEventListener("click", function(e){`
);

// Sort Total Points correctly and load predictor data through the normal app lifecycle.
replaceOnce(
  "predictor startup",
  '  refresh(false);\n  setInterval(function(){ refresh(false); }, POLL_MS);',
  `  refresh(false);\n  loadPricePredictor();\n  setInterval(function(){ refresh(false); }, POLL_MS);\n  setInterval(loadPricePredictor,15*60*1000);\n  setInterval(function(){ var timer=document.getElementById('pwDeadline');if(timer)timer.textContent=formatPriceChangeCountdown(); },1000);`
);

// Ensure the sort key on the status column has a real numeric field.
replaceOnce(
  "status sort key",
  'if (key === "name"){ av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }\n      else { av = a[key]; bv = b[key]; }',
  'if (key === "name"){ av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }\n      else { av = a[key] == null ? 0 : a[key]; bv = b[key] == null ? 0 : b[key]; }'
);

// Accessibility/reset rules for button-shaped filters.
replaceOnce(
  "filter button reset",
  "  .pos-chip{",
  "  .pos-chip{appearance:none;-webkit-appearance:none;font-family:inherit;border:1px solid var(--line);"
);

// Ensure no header price timer survives the build.
html = html.replace(/<div class="pw-price-timer">[\s\S]*?<\/div>/g, "");
html = html.replace(/\.pw-price-timer\{[^}]*\}/g, "");

// Final structural assertions catch future regressions during the build instead of in production.
assert(/data-key="points"[^>]*>/.test(html), "Total Points header missing");
assert(/Total Points/.test(html), "Total Points label missing");
assert(/'<td class=\\"num\\">'\+p\.points\+'<\\\/td>'/.test(html), "Total Points data cell missing");
assert(/data-player-id=.*tabindex="0" role="button"/.test(html), "Player rows are not keyboard-accessible");
assert(!/pw-price-timer/.test(html), "Header price timer remains in built HTML");
assert(/id="pwDeadline"/.test(html), "Dashboard Price Change card missing");

fs.writeFileSync(file, html);
console.log("Price Watch build patch complete");
