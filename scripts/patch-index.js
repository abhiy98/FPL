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

// Add a permanent Price Change entry point to the static HTML.
replaceIfPresent(
  "Price Change navigation",
  '  <div class="search-row">',
  '  <div class="pw-page-nav"><a href="/price-changes.html">Price Change</a></div>\n\n  <div class="search-row">'
);

// The displayed Team value should be the sum of the current prices of the 15
// players actually loaded into the team, rather than entry.last_deadline_value.
const oldTeamNote = "    var note=document.getElementById('pwTeamNote'); if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value £'+(state.team.value/10).toFixed(1)+'m · Bank £'+(state.team.bank/10).toFixed(1)+'m':'Your team is loaded. Players are highlighted in the table.'):'Favourites, watchlist and your Team ID are saved locally on this device.';";
const newTeamNote = "    var teamValue=state.team?state.players.filter(function(p){return state.team.picks.has(p.id);}).reduce(function(sum,p){return sum+p.now;},0):0; var note=document.getElementById('pwTeamNote'); if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value £'+(teamValue/10).toFixed(1)+'m · Bank £'+(state.team.bank/10).toFixed(1)+'m':'Your team is loaded. Players are highlighted in the table.'):'Watchlist and your Team ID are saved locally on this device.';";
replaceIfPresent("calculated team value", oldTeamNote, newTeamNote);

// Add styling for the static navigation link.
replaceIfPresent(
  "Price Change navigation styles",
  '</style>',
  '.pw-page-nav{margin:-2px 0 9px}.pw-page-nav a{display:inline-block;color:var(--accent);text-decoration:none;font-size:12px;font-weight:650;padding:6px 10px;border:1px solid var(--line-strong);border-radius:8px;background:var(--panel)}.pw-page-nav a:active{opacity:.7}\n</style>'
);

fs.writeFileSync(file, text);
console.log("Price Watch build patch complete");
