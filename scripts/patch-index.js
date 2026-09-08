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
    try{var entry=await fetchPublicApi('entry/'+id+'/'),ev=currentEvent(state.events),gw=ev?ev.id:1,picksData=await fetchPublicApi('entry/'+id+'/event/'+gw+'/picks/'),picks=new Set((picksData.picks||[]).map(function(x){return x.element;})); state.team={id:id,picks:picks,value:entry.last_deadline_value||entry.value||0,bank:entry.bank||0,name:entry.name||''}; try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){} showToast('Team loaded');render();}catch(e){showToast('Couldn\\'t load that FPL Team ID');}finally{button.disabled=false;button.textContent='Load my team';}
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

fs.writeFileSync(file, text);
console.log("Price Watch build patch complete");