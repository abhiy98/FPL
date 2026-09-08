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

// Add the FPL season total points to the player data and table.
replaceIfPresent(
  "total points table header",
  '        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>',
  '        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>\n        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span></button></th>'
);

replaceIfPresent(
  "total points table cell",
  '          \'<td class="num"><span class="delta \' + event.cls + \'"><span class="arrow">\' + event.arrow + \'</span>\' + event.text + \'</span></td>\' +\n          \'<td class="num"><div class="own-bar-wrap">\' + p.own.toFixed(1) + \'%<span class="own-bar"><i style="width:\' + ownPct + \'%"></i></span></div></td></tr>\';',
  '          \'<td class="num"><span class="delta \' + event.cls + \'"><span class="arrow">\' + event.arrow + \'</span>\' + event.text + \'</span></td>\' +\n          \'<td class="num">\' + p.points + \'</td>\' +\n          \'<td class="num"><div class="own-bar-wrap">\' + p.own.toFixed(1) + \'%<span class="own-bar"><i style="width:\' + ownPct + \'%"></i></span></div></td></tr>\';'
);

replaceIfPresent(
  "total points snapshot persistence",
  'players.map(function(p){ return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.gwPoints,p.form,p.epNext,p.minutes]; });',
  'players.map(function(p){ return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes]; });'
);

replaceIfPresent(
  "total points snapshot restore",
  'var hasGwPoints = a.length >= 19; return { id:a[0], name:a[1], team:a[2], pos:a[3], gw1:a[4], now:a[5], total:a[6], event:a[7], own:a[8], status:a[9], teamName:a[10] || a[2], transfersIn:a[11] || 0, transfersOut:a[12] || 0, netTransfers:a[13] || 0, points:a[14] || 0, gwPoints:hasGwPoints ? (a[15] || 0) : 0, form:hasGwPoints ? (a[16] || 0) : (a[15] || 0), epNext:hasGwPoints ? (a[17] || 0) : (a[16] || 0), minutes:hasGwPoints ? (a[18] || 0) : (a[17] || 0) };',
  'return { id:a[0], name:a[1], team:a[2], pos:a[3], gw1:a[4], now:a[5], total:a[6], event:a[7], own:a[8], status:a[9], teamName:a[10] || a[2], transfersIn:a[11] || 0, transfersOut:a[12] || 0, netTransfers:a[13] || 0, points:a[14] || 0, form:a[15] || 0, epNext:a[16] || 0, minutes:a[17] || 0 };'
);

fs.writeFileSync(file, text);
console.log("Price Watch build patch complete");
