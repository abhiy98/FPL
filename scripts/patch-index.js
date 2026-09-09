const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let html = fs.readFileSync(file, "utf8");

function replaceRequired(label, pattern, replacement) {
  const next = html.replace(pattern, replacement);
  if (next === html) throw new Error(`Build patch failed: ${label}`);
  html = next;
}

// Cloudflare API is the single browser data path.
replaceRequired(
  "FPL proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);
replaceRequired(
  "bootstrap validation",
  '        if (!data || !data.elements || !data.elements.length) throw new Error("Unexpected payload");',
  '        if (!data || !Array.isArray(data.elements) || data.elements.length < 300) throw new Error("Incomplete player payload");'
);

// Keep Price Change in the dashboard only. No header timer is generated.
html = html.replace(/\s*<div class="pw-price-timer">[\s\S]*?<\/div>/g, "");
html = html.replace(/\s*\.pw-price-timer\{[^}]*\}/g, "");
replaceRequired(
  "dashboard price-change card",
  /<div class="pw-stat"><div class="label">Deadline<\/div><div class="value" id="pwDeadline">[\s\S]*?<\/div><div class="hint">next gameweek lock<\/div><\/div>/,
  '<div class="pw-stat"><div class="label">Price change</div><div class="value" id="pwDeadline">—</div><div class="hint">next price change</div></div>'
);
replaceRequired(
  "price-change clock",
  /  function formatCountdown\(deadline\)\{[\s\S]*?\n  \}\n/,
  `  function formatCountdown(deadline){ if(!deadline) return "—"; var diff=new Date(deadline).getTime()-Date.now(); if(diff<=0)return "Locked"; var s=Math.floor(diff/1000),d=Math.floor(s/86400); s%=86400; var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60); return d?d+"d "+h+"h":h?h+"h":m+"m"; }\n  function formatPriceChangeCountdown(){var now=new Date(),p={},parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);parts.forEach(function(x){if(x.type!=="literal")p[x.type]=x.value;});var utcNow=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second)),offset=utcNow-now.getTime(),next=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+1)-offset,seconds=Math.max(0,Math.floor((next-now.getTime())/1000)),h=Math.floor(seconds/3600);seconds%=3600;var m=Math.floor(seconds/60),s=seconds%60;return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}\n`
);
replaceRequired(
  "dashboard countdown binding",
  "    var ev=currentEvent(state.events); if(dl)dl.textContent=ev?formatCountdown(ev.deadline_time):'—';",
  "    if(dl)dl.textContent=formatPriceChangeCountdown();"
);

// One authoritative eight-column schema.
replaceRequired(
  "table header schema",
  /    <thead>\s*<tr>[\s\S]*?<\/tr>\s*<\/thead>/,
  `    <thead>\n      <tr>\n        <th class="col-player" data-key="name"><button class="sort-btn">Player<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="priceStatusRank" class="num"><button class="sort-btn">Status<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="gw1" class="num"><button class="sort-btn">GW1 price<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="now" class="num"><button class="sort-btn">Current<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="total" class="num"><button class="sort-btn">Total Δ<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="own" class="num"><button class="sort-btn">Owned<span class="sort-arrows"><svg viewBox="4,0 8,6 0,6"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="4,8 8,2 0,2"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n      </tr>\n    </thead>`
);

replaceRequired(
  "table skeleton",
  /    <tbody id="tbody">[\s\S]*?<\/tbody>/,
  `    <tbody id="tbody">\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:110px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:90px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n    </tbody>`
);

// Center actual data, including numeric cells and composite controls.
replaceRequired("center numeric data", /  td\.num\{text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";\}\n/, '  td.num{text-align:center;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}\n');
replaceRequired("center numeric headers", "  th.num button.sort-btn{justify-content:flex-end;}\n", "  th.num button.sort-btn{justify-content:center;}\n");
replaceRequired("center ownership", "  .own-bar-wrap{display:flex;align-items:center;justify-content:flex-end;gap:7px;}\n", "  .own-bar-wrap{display:flex;align-items:center;justify-content:center;gap:7px;}\n");
replaceRequired("center player", "  .player-cell{display:flex;align-items:center;gap:9px;padding:9px 12px;}\n", "  .player-cell{display:flex;align-items:center;justify-content:center;gap:9px;padding:9px 12px;text-align:center;}\n");

// Keep the existing filter UI but make it keyboard reachable.
html = html.replace(/<div class="pos-chip/g, '<div role="button" tabindex="0" class="pos-chip');
replaceRequired(
  "filter keyboard handler",
  '  posBar.addEventListener("click", function(e){',
  `  document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.classList.contains('pos-chip')){e.preventDefault();e.target.click();}});\n\n  posBar.addEventListener("click", function(e){`
);

// Predictor state/rendering is part of the main app, not a DOM observer.
replaceRequired(
  "predictor integration",
  '  var risersOnly = document.getElementById("risersOnly");',
  `  var risersOnly = document.getElementById("risersOnly");\n  var pricePredictorData={};var pricePredictorLoading=false;\n  function priceStatus(player){var item=pricePredictorData[String(player.id)]||null,p=item&&Number.isFinite(item.predictedProgress)?item.predictedProgress:null;if(p==null){player.priceStatusRank=0;return {text:"—",cls:"neutral",rank:0};}var pct=p*100;if(pct>=100)return {text:"Very Likely to Rise",cls:"rise",rank:5};if(pct>=80)return {text:"Likely to Rise",cls:"rise",rank:4};if(pct<=-100)return {text:"Very Likely to Drop",cls:"drop",rank:5};if(pct<=-80)return {text:"Likely to Drop",cls:"drop",rank:4};return {text:"Unlikely to Change",cls:"neutral",rank:1};}\n  function priceStatusMarkup(player){var s=priceStatus(player);player.priceStatusRank=s.rank;return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>'; }\n  async function loadPricePredictor(){if(pricePredictorLoading)return;pricePredictorLoading=true;try{var res=await fetchWithTimeout('/price-data',8000),data=await res.json();if(res.ok&&data&&data.players)pricePredictorData=data.players;}catch(e){}finally{pricePredictorLoading=false;render();}}\n`
);
replaceRequired(
  "predictor CSS",
  /<\/style>/,
  `.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.rise .pw-status-dot{background:#00ff85}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.drop .pw-status-dot{background:#ff3b5c}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-status.neutral .pw-status-dot{background:var(--flat)}\n</style>`
);

replaceRequired(
  "table row renderer",
  /      var maxOwn = 40;\n      tbody\.innerHTML = sorted\.map\(function\(p\)\{[\s\S]*?      \}\)\.join\('\'\);/,
  `      var maxOwn=40;\n      tbody.innerHTML=sorted.map(function(p){var total=fmtDelta(p.total),event=fmtDelta(p.event),ownPct=Math.min(100,(p.own/maxOwn)*100),isFav=state.favs.has(p.id),isWatch=state.watchlist.has(p.id),isOwned=state.team&&state.team.picks.has(p.id),statusHtml=priceStatusMarkup(p);var mom=p.netTransfers>0?'<span class="momentum up">▲</span>':p.netTransfers<0?'<span class="momentum down">▼</span>':'<span class="momentum neutral">•</span>';return '<tr data-player-id="'+p.id+'" tabindex="0" role="button" class="'+(isOwned?'pw-row-owned ':'')+(isWatch?'pw-row-watch':'')+'">'+'<td class="col-player"><div class="player-cell"><div class="action-buttons"><button class="fav-btn'+(isFav?' active':'')+'" data-fav-id="'+p.id+'" aria-label="Toggle favourite">'+(isFav?'★':'☆')+'</button><button class="watch-btn'+(isWatch?' active':'')+'" data-watch-id="'+p.id+'" aria-label="Toggle watchlist">'+(isWatch?'◉':'○')+'</button></div><div class="player-text"><span class="player-name">'+escapeHtml(p.name)+'</span><span class="player-meta"><span class="pos-badge pos-'+p.pos+'">'+p.pos+'</span>'+escapeHtml(p.team)+' · '+mom+'</span></div></div></td>'+'<td class="num">'+statusHtml+'</td>'+'<td class="num price">'+fmtPrice(p.gw1)+'</td><td class="num price">'+fmtPrice(p.now)+'</td>'+'<td class="num"><span class="delta '+total.cls+'"><span class="arrow">'+total.arrow+'</span>'+total.text+'</span></td>'+'<td class="num"><span class="delta '+event.cls+'"><span class="arrow">'+event.arrow+'</span>'+event.text+'</span></td>'+'<td class="num">'+p.points+'</td>'+'<td class="num"><div class="own-bar-wrap">'+p.own.toFixed(1)+'%<span class="own-bar"><i style="width:'+ownPct+'%"></i></span></div></td></tr>';}).join('');`
);

replaceRequired(
  "team loader",
  /  async function loadMyTeam\(\)\{[\s\S]*?\n  \}\n  async function restoreTeam/,
  `  async function loadMyTeam(){var input=document.getElementById('pwTeamId'),id=parseInt(input&&input.value?input.value.trim():'',10);if(!id){showToast('Enter a valid FPL Team ID');return;}var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';try{var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000),data=await res.json();if(!res.ok||!data||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data&&data.error?data.error:'Expected 15 players');state.team={id:id,picks:new Set(data.picks.map(function(x){return Number(x);})),value:data.value||0,bank:data.bank||0,name:data.name||''};try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}state.myTeamOnly=true;var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');showToast('Team loaded · GW '+(data.gameweek||data.currentGameweek||'—'));render();}catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+(e&&e.message?e.message:'Unable to load team');showToast('Couldn\\'t load my team');}finally{button.disabled=false;button.textContent='Load my team';}}\n  async function restoreTeam`
);

replaceRequired(
  "snapshot schema",
  /  function persistSnapshot\(players, at\)\{[\s\S]*?\n  \}\n\n  function loadSnapshot\(\)\{[\s\S]*?\n  \}\n/,
  `  function persistSnapshot(players,at){try{var data=players.map(function(p){return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes];});localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({version:2,at:at.toISOString(),data:data}));}catch(e){}}\n  function loadSnapshot(){try{var raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;var parsed=JSON.parse(raw),data=Array.isArray(parsed.data)?parsed.data:[],players=data.map(function(a){return {id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0};});return {players:players,at:parsed.at};}catch(e){return null;}}\n`
);

// Make Status sorting deterministic before the first click.
replaceRequired(
  "status sorting",
  '      else { av = a[key]; bv = b[key]; }',
  '      else if (key === "priceStatusRank"){ av = priceStatus(a).rank; bv = priceStatus(b).rank; }\n      else { av = a[key] == null ? 0 : a[key]; bv = b[key] == null ? 0 : b[key]; }'
);

// Predictor refresh is independent and does not touch the table DOM directly.
replaceRequired(
  "predictor startup",
  '  refresh(false);\n  setInterval(function(){ refresh(false); }, POLL_MS);',
  `  refresh(false);\n  loadPricePredictor();\n  setInterval(function(){ refresh(false); }, POLL_MS);\n  setInterval(loadPricePredictor,15*60*1000);\n  setInterval(function(){var timer=document.getElementById('pwDeadline');if(timer)timer.textContent=formatPriceChangeCountdown();},1000);`
);

// The build output must be internally consistent.
const headerBlock = html.match(/<thead>[\s\S]*?<\/thead>/);
const headerCount = headerBlock ? (headerBlock[0].match(/<th\b/g) || []).length : 0;
if (headerCount !== 8) throw new Error(`Build verification failed: expected 8 headers, found ${headerCount}`);
if (!/Total Points/.test(html)) throw new Error("Build verification failed: Total Points header missing");
if (!/p\.points/.test(html)) throw new Error("Build verification failed: Total Points data binding missing");
if (!/data-key="priceStatusRank"/.test(html)) throw new Error("Build verification failed: Status column missing");
if ((html.match(/id="pwDeadline"/g) || []).length !== 1) throw new Error("Build verification failed: Price Change target is not unique");
if (/class="pw-price-timer"/.test(html)) throw new Error("Build verification failed: header price timer remains");
if (!/role="button" tabindex="0"/.test(html)) throw new Error("Build verification failed: keyboard row/filter support missing");
if (!/version:2/.test(html)) throw new Error("Build verification failed: snapshot version missing");

fs.writeFileSync(file, html);
console.log("Price Watch build patch complete and verified");
