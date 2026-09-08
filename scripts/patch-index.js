const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let text = fs.readFileSync(file, "utf8");

function replaceOnce(label, from, to) {
  if (!text.includes(from)) {
    throw new Error(`Price Watch build patch failed: ${label} not found`);
  }
  text = text.replace(from, to);
}

replaceOnce(
  "Netlify API proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/.netlify/functions/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
);

replaceOnce(
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
      var entry=await fetchPublicApi('entry/'+id+'/');
      var gw=entry.current_event || (state.currentGameweek && state.currentGameweek.id) || 1;
      var picksData=await fetchPublicApi('entry/'+id+'/event/'+gw+'/picks/');
      var picks=picksData.picks||[];
      if(!picks.length && gw>1){
        picksData=await fetchPublicApi('entry/'+id+'/event/'+(gw-1)+'/picks/');
        picks=picksData.picks||[];
        if(picks.length) gw=gw-1;
      }
      if(!picks.length) throw new Error('No picks returned');
      state.team={id:id,picks:new Set(picks.map(function(x){return x.element;})),value:entry.last_deadline_value||entry.value||0,bank:entry.last_deadline_bank||entry.bank||0,name:entry.name||''};
      try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}
      state.myTeamOnly=true;
      var teamChip=document.getElementById('myTeamOnly');if(teamChip)teamChip.classList.add('active');
      showToast('My team loaded · GW '+gw);
      render();
    }catch(e){showToast("Couldn't load that FPL Team ID");}
    finally{button.disabled=false;button.textContent='Load my team';}
  }`;

replaceOnce("My Team loader", oldTeam, newTeam);

fs.writeFileSync(file, text);
console.log("Patched index.html for Netlify preview build");
