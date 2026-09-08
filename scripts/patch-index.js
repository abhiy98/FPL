const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let text = fs.readFileSync(file, "utf8");

function replaceOnce(label, from, to) {
  if (!text.includes(from)) throw new Error(`Price Watch build patch failed: ${label} not found`);
  text = text.replace(from, to);
}

replaceOnce(
  "server function proxy",
  '    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },',
  '    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },'
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

replaceOnce("My Team loader", oldTeam, newTeam);

// Defensive layer for the team filter: reapply the loaded IDs whenever the
// normal price refresh rebuilds the table DOM.
if (text.indexOf("pricewatch:team-ui-fix") === -1) {
  const teamUi = String.raw`<script>
(function(){
  var teamIds=null;
  function rows(){return Array.prototype.slice.call(document.querySelectorAll('#tbody tr[data-player-id]'));}
  function apply(){
    if(!teamIds)return;
    rows().forEach(function(row){row.style.display=teamIds.has(Number(row.getAttribute('data-player-id'))) ? '' : 'none';});
    var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');
    var count=document.getElementById('countLabel');if(count)count.textContent=teamIds.size+' team players';
  }
  window.__priceWatchApplyTeam=function(ids){teamIds=new Set(ids.map(Number));apply();};
  var body=document.getElementById('tbody');
  if(body)new MutationObserver(function(){apply();}).observe(body,{childList:true});
})();
</script>`;
  text = text.replace('</body>', '<!-- pricewatch:team-ui-fix -->' + teamUi + '</body>');
}

replaceOnce(
  "expose team IDs",
  '      state.myTeamOnly=true;\n      var chip=document.getElementById(\'myTeamOnly\');if(chip)chip.classList.add(\'active\');',
  '      state.myTeamOnly=true;\n      var chip=document.getElementById(\'myTeamOnly\');if(chip)chip.classList.add(\'active\');\n      if(window.__priceWatchApplyTeam)window.__priceWatchApplyTeam(Array.from(state.team.picks));'
);

fs.writeFileSync(file, text);
console.log("Patched Price Watch for Cloudflare Pages");
