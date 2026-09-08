const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let text = fs.readFileSync(file, "utf8");

function replaceOnce(label, from, to) {
  if (!text.includes(from)) throw new Error(`Price Watch build patch failed: ${label} not found`);
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
      var r=await fetch('/.netlify/functions/team?id='+encodeURIComponent(id),{cache:'no-store'});
      var data=await r.json();
      if(!r.ok || !data.picks || !data.picks.length) throw new Error(data.error || 'No picks returned');
      state.team={id:id,picks:new Set(data.picks),value:data.value||0,bank:data.bank||0,name:data.name||''};
      try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}
      state.myTeamOnly=true;
      var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');
      showToast('My team loaded · GW '+(data.gameweek||data.currentGameweek));
      render();
    }catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+e.message;showToast("Couldn't load my team");}
    finally{button.disabled=false;button.textContent='Load my team';}
  }`;

replaceOnce("My Team loader", oldTeam, newTeam);

// A final defensive UI layer. This catches the load action in capture phase,
// uses the dedicated endpoint, and reapplies the team filter after normal table refreshes.
const teamUi = String.raw`<script>
(function(){
  var teamIds=null;
  var teamIdStore='pricewatch:teamId';
  function rows(){return Array.prototype.slice.call(document.querySelectorAll('#tbody tr[data-player-id]'));}
  function apply(){
    if(!teamIds)return;
    rows().forEach(function(row){row.style.display=teamIds.has(Number(row.getAttribute('data-player-id'))) ? '' : 'none';});
    var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');
    var count=document.getElementById('countLabel');if(count)count.textContent=teamIds.size+' team players';
  }
  async function load(){
    var input=document.getElementById('pwTeamId'),button=document.getElementById('pwLoadTeam');
    var id=Number.parseInt(input&&input.value?input.value.trim():'',10);
    if(!Number.isInteger(id)||id<=0){alert('Enter a valid FPL Team ID');return;}
    if(button){button.disabled=true;button.textContent='Loading…';}
    try{
      var res=await fetch('/.netlify/functions/team?id='+encodeURIComponent(id),{cache:'no-store'});
      var data=await res.json();
      if(!res.ok||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data.error||'Expected 15 players, got '+((data.picks&&data.picks.length)||0));
      teamIds=new Set(data.picks.map(Number));
      localStorage.setItem(teamIdStore,String(id));
      apply();
      var note=document.getElementById('pwTeamNote');if(note)note.textContent='My team loaded · GW '+(data.gameweek||data.currentGameweek)+' · '+teamIds.size+' players';
      var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.add('active');
    }catch(e){var note=document.getElementById('pwTeamNote');if(note)note.textContent='Team error: '+e.message;}
    finally{if(button){button.disabled=false;button.textContent='Load my team';}}
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('#pwLoadTeam');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();load();
  },true);
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('#myTeamOnly')){
      setTimeout(apply,0);
      if(teamIds){e.preventDefault();e.stopImmediatePropagation();}
    }
    if(e.target.closest&&e.target.closest('#pwClearTeam')){
      teamIds=null;
      var chip=document.getElementById('myTeamOnly');if(chip)chip.classList.remove('active');
      rows().forEach(function(row){row.style.display='';});
    }
  },true);
  var body=document.getElementById('tbody');
  if(body)new MutationObserver(function(){if(teamIds)apply();}).observe(body,{childList:true});
  try{var saved=localStorage.getItem(teamIdStore);if(saved){var input=document.getElementById('pwTeamId');if(input)input.value=saved;}}catch(e){}
})();
</script>`;

if (text.indexOf("pricewatch:team-ui-fix") === -1) {
  text = text.replace('</body>', '<!-- pricewatch:team-ui-fix -->' + teamUi + '</body>');
}

fs.writeFileSync(file, text);
console.log("Patched Price Watch preview build");
