const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let html = fs.readFileSync(file, "utf8");

function mustReplace(label, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Build patch failed: ${label}`);
  html = html.replace(pattern, replacement);
}

// Canonical Cloudflare API path.
mustReplace(
  "FPL proxy",
  /\{ build: function\(u\)\{ return "\/\.netlify\/functions\/fpl"; \}, parse: function\(res\)\{ return res\.json\(\); \} \},/,
  '{ build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);

// The dashboard owns the countdown; never render a header timer.
html = html.replace(/\s*<div class="pw-price-timer">[\s\S]*?<\/div>/g, "");
html = html.replace(/\s*\.pw-price-timer\{[^}]*\}/g, "");
mustReplace(
  "dashboard card",
  /<div class="pw-stat"><div class="label">Deadline<\/div><div class="value" id="pwDeadline">[\s\S]*?<\/div><div class="hint">next gameweek lock<\/div><\/div>/,
  '<div class="pw-stat"><div class="label">Price change</div><div class="value" id="pwDeadline">—</div><div class="hint">next price change</div></div>'
);

// Table schema is fixed here so headers and rows cannot drift.
mustReplace("table headers", /<thead>[\s\S]*?<\/thead>/, `    <thead>\n      <tr>\n        <th class="col-player" data-key="name"><button class="sort-btn">Player<span class="sort-arrows"></span></button></th>\n        <th data-key="priceStatusRank" class="num"><button class="sort-btn">Status<span class="sort-arrows"></span></button></th>\n        <th data-key="gw1" class="num"><button class="sort-btn">GW1 price<span class="sort-arrows"></span></button></th>\n        <th data-key="now" class="num"><button class="sort-btn">Current<span class="sort-arrows"></span></button></th>\n        <th data-key="total" class="num"><button class="sort-btn">Total Δ<span class="sort-arrows"></span></button></th>\n        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"></span></button></th>\n        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"></span></button></th>\n        <th data-key="own" class="num"><button class="sort-btn">Owned<span class="sort-arrows"></span></button></th>\n      </tr>\n    </thead>`);

mustReplace("skeleton", /<tbody id="tbody">[\s\S]*?<\/tbody>/, `    <tbody id="tbody">\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:110px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:90px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>\n    </tbody>`);

mustReplace("numeric alignment", /td\.num\{text-align:right;/, "td.num{text-align:center;");
mustReplace("header alignment", /th\.num button\.sort-btn\{justify-content:flex-end;\}/, "th.num button.sort-btn{justify-content:center;}");
mustReplace("ownership alignment", /\.own-bar-wrap\{display:flex;align-items:center;justify-content:flex-end;/, ".own-bar-wrap{display:flex;align-items:center;justify-content:center;");
mustReplace("player alignment", /\.player-cell\{display:flex;align-items:center;gap:9px;/, ".player-cell{display:flex;align-items:center;justify-content:center;gap:9px;");

// Add the official 2026/27 daily price-change countdown (00:00 Europe/London).
mustReplace("price countdown", /  function renderDashboard\(\)\{/, `  function londonOffsetMinutes(at){var ps=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(at),v={};ps.forEach(function(p){v[p.type]=p.value;});return (Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second)-at.getTime())/60000;}\n  function formatPriceChangeCountdown(){var now=new Date(),ps=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),v={};ps.forEach(function(p){v[p.type]=p.value;});var targetBase=Date.UTC(+v.year,+v.month-1,+v.day+1,0,0,0),target=targetBase-londonOffsetMinutes(now)*60000;target=targetBase-londonOffsetMinutes(new Date(target))*60000;var diff=Math.max(0,target-now.getTime()),total=Math.floor(diff/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return h+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';}\n\n  function renderDashboard(){`);

// Add a deterministic predictor state/render path next to the stable tbody binding.
mustReplace("predictor anchor", /  var tbody = document\.getElementById\("tbody"\);/, m => `${m}\n  var pricePredictorData={};\n  var pricePredictorLoading=false;\n  function priceStatus(p){var x=pricePredictorData[String(p.id)],v=x&&Number.isFinite(x.predictedProgress)?x.predictedProgress:null;if(v==null)return{text:"—",cls:"neutral",rank:0};v*=100;if(v>=100)return{text:"Very Likely to Rise",cls:"rise",rank:5};if(v>=80)return{text:"Likely to Rise",cls:"rise",rank:4};if(v<=-100)return{text:"Very Likely to Drop",cls:"drop",rank:5};if(v<=-80)return{text:"Likely to Drop",cls:"drop",rank:4};return{text:"Unlikely to Change",cls:"neutral",rank:1};}\n  function priceStatusMarkup(p){var s=priceStatus(p);p.priceStatusRank=s.rank;return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>'; }\n  async function loadPricePredictor(){if(pricePredictorLoading)return;pricePredictorLoading=true;try{var r=await fetchWithTimeout('/price-data',8000),d=await r.json();if(r.ok&&d&&d.players)pricePredictorData=d.players;}catch(e){}finally{pricePredictorLoading=false;render();}}`);

mustReplace("predictor css", /<\/style>/, `.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}\n</style>`);

// Replace only the existing row map; all player values come from the main state.
mustReplace("row renderer", /      var maxOwn = 40;\n      tbody\.innerHTML = sorted\.map\(function\(p\)\{[\s\S]*?      \}\)\.join\('\'\);/, `      var maxOwn=40;\n      tbody.innerHTML=sorted.map(function(p){var total=fmtDelta(p.total),event=fmtDelta(p.event),ownPct=Math.min(100,(p.own/maxOwn)*100),isFav=state.favs.has(p.id),isWatch=state.watchlist.has(p.id),isOwned=state.team&&state.team.picks.has(p.id),statusHtml=priceStatusMarkup(p),mom=p.netTransfers>0?'<span class="momentum up">▲</span>':p.netTransfers<0?'<span class="momentum down">▼</span>':'<span class="momentum neutral">•</span>';return '<tr data-player-id="'+p.id+'" tabindex="0" role="button" class="'+(isOwned?'pw-row-owned ':'')+(isWatch?'pw-row-watch':'')+'"><td class="col-player"><div class="player-cell"><div class="action-buttons"><button class="fav-btn'+(isFav?' active':'')+'" data-fav-id="'+p.id+'" aria-label="Toggle favourite">'+(isFav?'★':'☆')+'</button><button class="watch-btn'+(isWatch?' active':'')+'" data-watch-id="'+p.id+'" aria-label="Toggle watchlist">'+(isWatch?'◉':'○')+'</button></div><div class="player-text"><span class="player-name">'+escapeHtml(p.name)+'</span><span class="player-meta"><span class="pos-badge pos-'+p.pos+'">'+p.pos+'</span>'+escapeHtml(p.team)+' · '+mom+'</span></div></div></td><td class="num">'+statusHtml+'</td><td class="num price">'+fmtPrice(p.gw1)+'</td><td class="num price">'+fmtPrice(p.now)+'</td><td class="num"><span class="delta '+total.cls+'"><span class="arrow">'+total.arrow+'</span>'+total.text+'</span></td><td class="num"><span class="delta '+event.cls+'"><span class="arrow">'+event.arrow+'</span>'+event.text+'</span></td><td class="num">'+p.points+'</td><td class="num"><div class="own-bar-wrap">'+p.own.toFixed(1)+'%<span class="own-bar"><i style="width:'+ownPct+'%"></i></span></div></td></tr>';}).join('');`);

// Team loading goes through the Worker endpoint and is not duplicated in the browser.
mustReplace("team loader", /  async function loadMyTeam\(\)\{[\s\S]*?\n  \}\n  async function restoreTeam/, `  async function loadMyTeam(){var input=document.getElementById('pwTeamId'),id=parseInt(input&&input.value?input.value.trim():'',10);if(!id){showToast('Enter a valid FPL Team ID');return;}var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';try{var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000),data=await res.json();if(!res.ok||!data||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data&&data.error?data.error:'Expected 15 players');state.team={id:id,picks:new Set(data.picks.map(Number)),value:data.value||0,bank:data.bank||0,name:data.name||''};try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}state.myTeamOnly=true;var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');showToast('Team loaded · GW '+(data.gameweek||data.currentGameweek||'—'));render();}catch(e){showToast('Couldn\\'t load my team');}finally{button.disabled=false;button.textContent='Load my team';}}\n  async function restoreTeam`);

// Version snapshots and reject old layouts.
mustReplace("snapshot", /  function persistSnapshot\(players, at\)\{[\s\S]*?\n  \}\n\n  function loadSnapshot\(\)\{[\s\S]*?\n  \}\n/, `  function persistSnapshot(players,at){try{var data=players.map(function(p){return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes];});localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({version:2,at:at.toISOString(),data:data}));}catch(e){}}\n  function loadSnapshot(){try{var raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;var parsed=JSON.parse(raw);if(parsed.version!==2||!Array.isArray(parsed.data))return null;var players=parsed.data.map(function(a){return{id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0};});return{players:players,at:parsed.at};}catch(e){return null;}}\n`);

mustReplace("status sorting", /      else \{ av = a\[key\]; bv = b\[key\]; \}/, '      else if(key==="priceStatusRank"){av=priceStatus(a).rank;bv=priceStatus(b).rank;} else { av = a[key] == null ? 0 : a[key]; bv = b[key] == null ? 0 : b[key]; }');
mustReplace("predictor startup", /  refresh\(false\);\n  setInterval\(function\(\)\{ refresh\(false\); \}, POLL_MS\);/, `  refresh(false);\n  loadPricePredictor();\n  setInterval(function(){ refresh(false); }, POLL_MS);\n  setInterval(loadPricePredictor,15*60*1000);\n  setInterval(function(){var t=document.getElementById('pwDeadline');if(t)t.textContent=formatPriceChangeCountdown();},1000);`);

// renderDashboard must never overwrite the price-change timer with the Gameweek deadline.
mustReplace("dashboard countdown", /    var ev=currentEvent\(state\.events\); if\(dl\)dl\.textContent=ev\?formatCountdown\(ev\.deadline_time\):'—';/, "    if(dl)dl.textContent=formatPriceChangeCountdown();");

if ((html.match(/<th\b/g)||[]).length < 8) throw new Error("Build verification failed: expected 8 headers");
if (!/Total Points/.test(html)||!/p\.points/.test(html)) throw new Error("Build verification failed: Total Points missing");
if ((html.match(/id="pwDeadline"/g)||[]).length !== 1) throw new Error("Build verification failed: Price Change card is not unique");
if (/class="pw-price-timer"/.test(html)) throw new Error("Build verification failed: header timer remains");
if (!/version:2/.test(html)) throw new Error("Build verification failed: snapshot version missing");

fs.writeFileSync(file, html);
console.log("Price Watch build patch complete and verified");
