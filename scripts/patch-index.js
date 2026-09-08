const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let text = fs.readFileSync(file, "utf8");

function replaceIfPresent(label, from, to) {
  if (text.includes(from)) {
    text = text.replace(from, to);
    console.log(`Patched: ${label}`);
  } else {
    console.log(`Already patched/not needed: ${label}`);
  }
}

replaceIfPresent(
  "server function proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);

replaceIfPresent(
  "bootstrap completeness validation",
  '        if (!data || !data.elements || !data.elements.length) throw new Error("Unexpected payload");',
  '        if (!data || !data.elements || data.elements.length < 300) throw new Error("Incomplete player payload");'
);

const oldTeam = `  async function loadMyTeam(){
    var input=document.getElementById('pwTeamId'), id=parseInt(input&&input.value?input.value.trim():'',10); if(!id){showToast('Enter a valid FPL Team ID');return;}
    var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';
    try{var entry=await fetchPublicApi('entry/'+id+'/'),ev=currentEvent(state.events),gw=ev?ev.id:1,picksData=await fetchPublicApi('entry/'+id+'/event/'+gw+'/picks/'),picks=new Set((picksData.picks||[]).map(function(x){return x.element;})); state.team={id:id,picks:picks,value:entry.last_deadline_value||entry.value||0,bank:entry.last_deadline_bank||entry.bank||0,name:entry.name||''}; try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){} showToast('Team loaded');render();}catch(e){showToast('Couldn\\'t load that FPL Team ID');}finally{button.disabled=false;button.textContent='Load my team';}
  }`;

const newTeam = `  async function loadMyTeam(){
    var input=document.getElementById('pwTeamId'), id=parseInt(input&&input.value?input.value.trim():'',10); if(!id){showToast('Enter a valid FPL Team ID');return;}
    var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';
    try{
      var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000);
      var data=await res.json();
      if(!res.ok || !data || !Array.isArray(data.picks) || data.picks.length !== 15) throw new Error(data && data.error ? data.error : 'Expected 15 players');
      state.team={id:id,picks:new Set(data.picks.map(function(x){return Number(x);})),value:data.value||0,bank:data.bank||0,name:data.name||''};
      try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}
      state.myTeamOnly=true;
      var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');
      showToast('My team loaded · GW '+(data.gameweek||data.currentGameweek||'—'));
      render();
    }catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+(e&&e.message?e.message:'Unable to load team');showToast('Couldn\\'t load my team');}
    finally{button.disabled=false;button.textContent='Load my team';}
  }`;

if (text.includes(oldTeam)) {
  text = text.replace(oldTeam, newTeam);
  console.log("Patched: My Team loader");
} else {
  console.log("Already patched/not needed: My Team loader");
}

const oldClear = "  document.getElementById('pwClearTeam').addEventListener('click',function(){state.team=null;try{localStorage.removeItem(STORE_KEY_TEAM);}catch(e){}var input=document.getElementById('pwTeamId');if(input)input.value='';render();showToast('Team cleared');});";
const newClear = "  document.getElementById('pwClearTeam').addEventListener('click',function(){state.team=null;state.myTeamOnly=false;try{localStorage.removeItem(STORE_KEY_TEAM);}catch(e){}var input=document.getElementById('pwTeamId');if(input)input.value='';var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.remove('active');render();showToast('Team cleared');});";
replaceIfPresent("clear team behavior", oldClear, newClear);

// Remove the legacy Favourites feature from the generated HTML.
text = text.replace(/\s*<div class="pos-chip" id="favoritesOnly">★ Favourites<\/div>/g, "");
text = text.replace(/\s*#favoritesOnly\{[^}]*\}\n\s*#favoritesOnly\.active\{[^}]*\}\n/g, "\n");
text = text.replace(/\s*\.fav-btn\{[\s\S]*?\.fav-btn\.active\{[^}]*\}\n/g, "\n");
text = text.replace(/\s*var STORE_KEY_FAVS = "pricewatch:favs";\n/g, "\n");
text = text.replace(/\s*function loadFavs\(\)\{[\s\S]*?\n  \}\n\n  function saveFavs\(favSet\)\{[\s\S]*?\n  \}\n/g, "\n");
text = text.replace(/\s*favoritesOnly: false,\n/g, "\n");
text = text.replace(/\s*favs: loadFavs\(\),/g, "");
text = text.replace(/\s*if \(state\.favoritesOnly && !state\.favs\.has\(p\.id\)\) return false;\n/g, "");
text = text.replace(/\s*var favChip = e\.target\.closest\("#favoritesOnly"\);\n\s*if \(favChip\)\{[\s\S]*?\n\s*\}\n/g, "\n");
text = text.replace(/\s*function toggleFavourite\(id\)\{[^}]*\}\n/g, "\n");
text = text.replace(/\s*var fav=e\.target\.closest\('\.fav-btn'\); if\(fav\)\{toggleFavourite\(parseInt\(fav\.getAttribute\('data-fav-id'\),10\)\);return;\}\n/g, "\n");
text = text.replace(/<button class="fav-btn' \+ \(isFav \? ' active' : ''\) \+ '" data-fav-id="' \+ p\.id \+ '" aria-label="Toggle favourite">' \+ \(isFav \? '★' : '☆'\) \+ '<\/button>/g, "");
text = text.replace(/\s*var isFav = state\.favs\.has\(p\.id\), isWatch =/g, " var isWatch =");
text = text.replace(/\s*<button class="pw-btn" id="pwModalFav">'\+\(state\.favs\.has\(p\.id\)\?'★ Favourite':'☆ Favourite'\)\+'<\/button>/g, "");
text = text.replace(/\s*document\.getElementById\('pwModalFav'\)\.addEventListener\('click',function\(\)\{toggleFavourite\(p\.id\);this\.textContent=state\.favs\.has\(p\.id\)\?'★ Favourite':'☆ Favourite';\}\);/g, "");

// Add the price-change countdown directly to the main header.
replaceIfPresent(
  "price change timer markup",
  '  </div>\n\n  <div class="search-row">',
  '  </div>\n  <div class="pw-price-timer"><span>Price change</span><strong id="pwPriceTimer">--:--:--</strong></div>\n\n  <div class="search-row">'
);

replaceIfPresent(
  "price change timer styles",
  '</style>',
  '.pw-price-timer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 9px;padding:7px 10px;background:var(--panel);border:1px solid var(--line);border-radius:8px}.pw-price-timer span{font-size:10px;text-transform:uppercase;letter-spacing:.45px;color:var(--text-faint);font-weight:650}.pw-price-timer strong{font-size:13px;font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700}\n</style>'
);

replaceIfPresent(
  "price change timer logic",
  '  var risersOnly = document.getElementById("risersOnly");',
  '  var risersOnly = document.getElementById("risersOnly");\n\n  function updatePriceTimer(){\n    var el=document.getElementById("pwPriceTimer");\n    if(!el){return;}\n    var now=new Date();\n    var parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now),o={};\n    parts.forEach(function(x){if(x.type!=="literal")o[x.type]=x.value;});\n    var y=Number(o.year),m=Number(o.month)-1,d=Number(o.day),h=Number(o.hour),mi=Number(o.minute),se=Number(o.second);\n    var utcNow=Date.UTC(y,m,d,h,mi,se);\n    var offset=utcNow-now.getTime();\n    var nextMidnight=Date.UTC(y,m,d+1,0,0,0)-offset;\n    var diff=Math.max(0,nextMidnight-now.getTime()),s=Math.floor(diff/1000);\n    var hh=Math.floor(s/3600);s%=3600;var mm=Math.floor(s/60);s%=60;\n    el.textContent=String(hh).padStart(2,"0")+":"+String(mm).padStart(2,"0")+":"+String(s).padStart(2,"0");\n  }\n  setInterval(updatePriceTimer,1000);\n  updatePriceTimer();'
);

const oldTeamNote = "    var note=document.getElementById('pwTeamNote'); if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value £'+(state.team.value/10).toFixed(1)+'m · Bank £'+(state.team.bank/10).toFixed(1)+'m':'Your team is loaded. Players are highlighted in the table.'):'Favourites, watchlist and your Team ID are saved locally on this device.';";
const newTeamNote = "    var teamValue=state.team?state.players.filter(function(p){return state.team.picks.has(p.id);}).reduce(function(sum,p){return sum+p.now;},0):0; var note=document.getElementById('pwTeamNote'); if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value £'+(teamValue/10).toFixed(1)+'m · Bank £'+(state.team.bank/10).toFixed(1)+'m':'Your team is loaded. Players are highlighted in the table.'):'Watchlist and your Team ID are saved locally on this device.';";
replaceIfPresent("calculated team value", oldTeamNote, newTeamNote);

// Keep season total FPL points as the player points field and table column.
replaceIfPresent(
  "remove gameweek points field",
  '        netTransfers: netTransfers, points: el.total_points || 0, gwPoints: el.event_points || 0,',
  '        netTransfers: netTransfers, points: el.total_points || 0,'
);

replaceIfPresent(
  "rename gameweek points table header",
  '        <th data-key="gwPoints" class="num"><button class="sort-btn">GW Points<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>',
  '        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>'
);

replaceIfPresent(
  "remove gameweek points table cell",
  '          \'<td class="num">\' + p.gwPoints + \'</td>\' +\n',
  ''
);

replaceIfPresent(
  "remove gameweek points modal detail",
  "detailCard('GW Points',String(p.gwPoints))+detailCard('Points',String(p.points))",
  "detailCard('Points',String(p.points))"
);

replaceIfPresent(
  "restore points table cell",
  '          \'<td class="num"><span class="delta \' + event.cls + \'"><span class="arrow">\' + event.arrow + \'</span>\' + event.text + \'</span></td>\' +\n          \'<td class="num"><div class="own-bar-wrap">',
  '          \'<td class="num"><span class="delta \' + event.cls + \'"><span class="arrow">\' + event.arrow + \'</span>\' + event.text + \'</span></td>\' +\n          \'<td class="num">\' + p.points + \'</td>\' +\n          \'<td class="num"><div class="own-bar-wrap">'
);

replaceIfPresent(
  "remove gameweek points snapshot persistence",
  'players.map(function(p){ return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.gwPoints,p.form,p.epNext,p.minutes]; });',
  'players.map(function(p){ return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes]; });'
);

replaceIfPresent(
  "remove gameweek points snapshot restore",
  'var hasGwPoints = a.length >= 19; return { id:a[0], name:a[1], team:a[2], pos:a[3], gw1:a[4], now:a[5], total:a[6], event:a[7], own:a[8], status:a[9], teamName:a[10] || a[2], transfersIn:a[11] || 0, transfersOut:a[12] || 0, netTransfers:a[13] || 0, points:a[14] || 0, gwPoints:hasGwPoints ? (a[15] || 0) : 0, form:hasGwPoints ? (a[16] || 0) : (a[15] || 0), epNext:hasGwPoints ? (a[17] || 0) : (a[16] || 0), minutes:hasGwPoints ? (a[18] || 0) : (a[17] || 0) };',
  'return { id:a[0], name:a[1], team:a[2], pos:a[3], gw1:a[4], now:a[5], total:a[6], event:a[7], own:a[8], status:a[9], teamName:a[10] || a[2], transfersIn:a[11] || 0, transfersOut:a[12] || 0, netTransfers:a[13] || 0, points:a[14] || 0, form:a[15] || 0, epNext:a[16] || 0, minutes:a[17] || 0 };'
);

// Add FPL-style player availability status with colour coding.
replaceIfPresent(
  "status styles",
  '.pw-price-timer strong{font-size:13px;font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700}\n</style>',
  '.pw-price-timer strong{font-size:13px;font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700}.pw-status{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:700;line-height:1.3}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none}.pw-status.s100{background:#37003c;color:#f4eef6}.pw-status.s100 .pw-status-dot{background:#f4eef6}.pw-status.s75{background:#ffe65b;color:#1c0025}.pw-status.s75 .pw-status-dot{background:#1c0025}.pw-status.s50{background:#ffab1b;color:#1c0025}.pw-status.s50 .pw-status-dot{background:#1c0025}.pw-status.s25{background:#d44401;color:#fff}.pw-status.s25 .pw-status-dot{background:#fff}.pw-status.s0{background:#c0020d;color:#fff}.pw-status.s0 .pw-status-dot{background:#fff}.pw-status.sna{background:var(--panel-2);color:var(--text-faint)}.pw-status.sna .pw-status-dot{background:var(--flat)}\n</style>'
);

replaceIfPresent(
  "status table header insertion",
  '        </th>\n        <th data-key="gw1" class="num">',
  '        </th>\n        <th data-key="statusRank" class="num"><button class="sort-btn">Status<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="gw1" class="num">'
);

replaceIfPresent(
  "status player field",
  '        netTransfers: netTransfers, points: el.total_points || 0,',
  '        netTransfers: netTransfers, points: el.total_points || 0, statusChance: el.chance_of_playing_next_round == null ? null : Number(el.chance_of_playing_next_round), statusRank: el.chance_of_playing_next_round == null ? 100 : Number(el.chance_of_playing_next_round),'
);

replaceIfPresent(
  "status renderer setup",
  '        var total = fmtDelta(p.total), event = fmtDelta(p.event), ownPct = Math.min(100, (p.own / maxOwn) * 100);',
  '        var total = fmtDelta(p.total), event = fmtDelta(p.event), ownPct = Math.min(100, (p.own / maxOwn) * 100); var statusChance = p.statusChance == null ? null : p.statusChance; var statusText = p.status === "i" ? "Injured" : p.status === "d" ? "Doubtful" : p.status === "s" ? "Suspended" : p.status === "n" ? "Not in squad" : p.status === "u" ? "Unavailable" : "Available"; var statusLevel = statusChance == null ? "na" : String(statusChance); var statusHtml = \'<span class="pw-status s\' + statusLevel + \'"><span class="pw-status-dot"></span>\' + escapeHtml(statusText) + \'</span>\';'
);

replaceIfPresent(
  "status table cell",
  '          \'<td class="num price">\' + fmtPrice(p.gw1) + \'</td><td class="num price">\' + fmtPrice(p.now) + \'</td>\' +',
  '          \'<td class="num">\' + statusHtml + \'</td><td class="num price">\' + fmtPrice(p.gw1) + \'</td><td class="num price">\' + fmtPrice(p.now) + \'</td>\' +'
);

replaceIfPresent(
  "status modal detail",
  "detailCard('Points',String(p.points))",
  "detailCard('Status',p.statusChance == null ? 'Available' : ((p.statusChance || 0) + '%')+' · '+(p.status === 'i' ? 'Injured' : p.status === 'd' ? 'Doubtful' : p.status === 's' ? 'Suspended' : p.status === 'n' ? 'Not in squad' : p.status === 'u' ? 'Unavailable' : 'Available'))+detailCard('Points',String(p.points))"
);

fs.writeFileSync(file, text);
console.log("Price Watch build patch complete");
