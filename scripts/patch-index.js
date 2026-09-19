const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "index.html");
let html = fs.readFileSync(file, "utf8");

function mustReplace(label, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Build patch failed: ${label}`);
  html = html.replace(pattern, replacement);
}

// The dashboard is owned by the app. Keep its markup and ordering canonical here.
html = html.replace(/\s*<div class="pw-price-timer">[\s\S]*?<\/div>/g, "");
html = html.replace(/\s*\.pw-price-timer\{[^}]*\}/g, "");
mustReplace(
  "dashboard layout",
  /<section class="pw-dashboard" id="pwDashboard">[\s\S]*?<\/section>/,
  '<section class="pw-dashboard" id="pwDashboard">\n' +
    '  <div class="pw-dashboard-top">\n' +
    '    <div class="pw-stat"><div class="label">Price change</div><div class="value" id="pwDeadline">—</div><div class="hint">next price change</div></div>\n' +
    '    <div class="pw-stat"><div class="label">Budget</div><div class="value" id="pwBudgetValue">—</div><div class="hint" id="pwBudgetHint">connect your FPL team below</div></div>\n' +
    '    <div class="pw-stat"><div class="label">Rising</div><div class="value" id="pwRisingCount">—</div><div class="hint">players moving up</div></div>\n' +
    '    <div class="pw-stat"><div class="label">Falling</div><div class="value" id="pwFallingCount">—</div><div class="hint">players moving down</div></div>\n' +
    '  </div>\n' +
    '  <div class="pw-tools"><input class="pw-team-input" id="pwTeamId" inputmode="numeric" placeholder="Your FPL Team ID (optional)" autocomplete="off"><button class="pw-btn primary" id="pwLoadTeam">Load my team</button><button class="pw-btn" id="pwClearTeam" style="display:none">Clear team</button></div>\n' +
    '  <div class="pw-team-note" id="pwTeamNote">Favourites and your Team ID are saved locally on this device. No login is required.</div>\n' +
    '</section>'
);

// Table schema is fixed here so headers and rows cannot drift.
mustReplace("table headers", /<thead>[\s\S]*?<\/thead>/, `    <thead>
      <tr>
        <th class="col-player" data-key="name"><button class="sort-btn">Player<span class="sort-arrows"></span></button></th>
        <th data-key="priceStatusRank" class="num"><button class="sort-btn">Status<span class="sort-arrows"></span></button></th>
        <th data-key="priceProgress" class="num"><button class="sort-btn">Progress %<span class="sort-arrows"></span></button></th>
        <th data-key="pricePrediction" class="num"><button class="sort-btn">Prediction %<span class="sort-arrows"></span></button></th>
        <th data-key="gw1" class="num"><button class="sort-btn">GW1 price<span class="sort-arrows"></span></button></th>
        <th data-key="now" class="num"><button class="sort-btn">Current<span class="sort-arrows"></span></button></th>
        <th data-key="total" class="num"><button class="sort-btn">Total Δ<span class="sort-arrows"></span></button></th>
        <th data-key="event" class="num"><button class="sort-btn">This GW<span class="sort-arrows"></span></button></th>
        <th data-key="points" class="num"><button class="sort-btn">Total Points<span class="sort-arrows"></span></button></th>
        <th data-key="own" class="num"><button class="sort-btn">Owned<span class="sort-arrows"></span></button></th>
      </tr>
    </thead>`);

mustReplace("skeleton", /<tbody id="tbody">[\s\S]*?<\/tbody>/, `    <tbody id="tbody">
      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:110px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:42px;margin:auto"></div></td><td><div class="skeleton" style="width:48px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>
      <tr class="skeleton-row"><td class="col-player"><div class="skeleton" style="width:90px"></div></td><td><div class="skeleton" style="width:50px;margin:auto"></div></td><td><div class="skeleton" style="width:42px;margin:auto"></div></td><td><div class="skeleton" style="width:48px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td><td><div class="skeleton" style="width:36px;margin:auto"></div></td></tr>
    </tbody>`);

mustReplace("numeric alignment", /td\.num\{text-align:right;/, "td.num{text-align:center;");
mustReplace("header alignment", /th\.num button\.sort-btn\{justify-content:flex-end;\}/, "th.num button.sort-btn{justify-content:center;}");
mustReplace("ownership alignment", /\.own-bar-wrap\{display:flex;align-items:center;justify-content:flex-end;/, ".own-bar-wrap{display:flex;align-items:center;justify-content:center;");
mustReplace("player alignment", /\.player-cell\{display:flex;align-items:center;gap:9px;/, ".player-cell{display:flex;align-items:center;justify-content:center;gap:9px;");

// Persist the selected sort in the app rather than the presentation shim.
mustReplace("saved sort anchor", /  var state = \{/, `  var SORT_STORE_KEY="pricewatch:sort-state";
  function loadSavedSort(){try{var saved=JSON.parse(localStorage.getItem(SORT_STORE_KEY)||"{}");if(saved&&typeof saved==="object")return saved;}catch(e){}return {};}\n  var savedSort=loadSavedSort();\n\n  var state = {`);
mustReplace("default progress sort", /sortKey: "total",\n    sortDir: "desc",/, 'sortKey: savedSort.sortKey || "__defaultAbsProgress",\n    sortDir: savedSort.sortDir || "desc",');
mustReplace("progress cycle state", /  var tbody = document\.getElementById\("tbody"\);/, `  var progressSortCycle=state.sortKey==="__defaultAbsProgress"?2:(state.sortKey==="priceProgress"?(state.sortDir==="asc"?1:0):2);
  function saveSort(){try{localStorage.setItem(SORT_STORE_KEY,JSON.stringify({sortKey:state.sortKey,sortDir:state.sortDir}));}catch(e){}}

  var tbody = document.getElementById("tbody");`);

// Add the official daily price-change countdown (00:00 Europe/London).
mustReplace("price countdown", /  function renderDashboard\(\)\{/, `  function londonOffsetMinutes(at){var ps=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(at),v={};ps.forEach(function(p){v[p.type]=p.value;});return (Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second)-at.getTime())/60000;}
  function formatPriceChangeCountdown(){var now=new Date(),ps=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),v={};ps.forEach(function(p){v[p.type]=p.value;});var targetBase=Date.UTC(+v.year,+v.month-1,+v.day+1,0,0,0),target=targetBase-londonOffsetMinutes(now)*60000;target=targetBase-londonOffsetMinutes(new Date(target))*60000;var diff=Math.max(0,target-now.getTime()),total=Math.floor(diff/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return h+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';}

  function renderDashboard(){`);

// Predictor values are loaded independently of the player table and accept numeric or string JSON values.
mustReplace("predictor anchor", /  var tbody = document\.getElementById\("tbody"\);/, m => `${m}
  var pricePredictorData={};
  var pricePredictorLoading=false;
    function predictorNumber(value){var n=Number(value);return Number.isFinite(n)?n:null;}
  function predictorNormalise(value){var n=predictorNumber(value);if(n===null)return null;return Math.abs(n)>5?n/100:n;}
  function pricePercent(value){var n=predictorNormalise(value);if(n===null)return '—';var pct=n*100;var rounded=Math.round(pct*10)/10;return (rounded>0?'+':'')+rounded.toFixed(1)+'%';}
  function priceMetric(p,key){var x=pricePredictorData[String(p.id)];if(!x)return null;var n=predictorNumber(x[key]);return predictorNormalise(n);}
  function priceStatus(p){var v=priceMetric(p,'predictedProgress');if(v==null)return{text:'—',cls:'neutral',rank:0};v*=100;if(v>=100)return{text:'Very Likely to Rise',cls:'rise',rank:5};if(v>=80)return{text:'Likely to Rise',cls:'rise',rank:4};if(v<=-100)return{text:'Very Likely to Drop',cls:'drop',rank:5};if(v<=-80)return{text:'Likely to Drop',cls:'drop',rank:4};return{text:'Unlikely to Change',cls:'neutral',rank:1};}
  function priceStatusMarkup(p){var s=priceStatus(p);p.priceStatusRank=s.rank;return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>'; }
  function pricePercentMarkup(p,key){var value=priceMetric(p,key);if(value===null)return '—';var pct=value*100;var cls=pct>0?'rise':pct<0?'drop':'neutral';return '<span class="pw-percent '+cls+'">'+escapeHtml(pricePercent(value))+'</span>'; }
  function normalisePredictorPayload(source){var out={};if(!source||typeof source!=='object')return out;Object.entries(source.players||source.data||source).forEach(function(pair){var key=pair[0],item=pair[1];if(!item||typeof item!=='object')return;var id=predictorNumber(item.id!=null?item.id:(item.element_id!=null?item.element_id:(item.player_id!=null?item.player_id:key)));if(id===null)return;var progress=predictorNormalise(item.progress!=null?item.progress:(item.progress_now!=null?item.progress_now:item.current_progress));var predicted=predictorNormalise(item.progress_tonight!=null?item.progress_tonight:(item.predicted_progress!=null?item.predicted_progress:(item.predictedProgress!=null?item.predictedProgress:item.prediction)));if(progress!==null||predicted!==null)out[String(Math.trunc(id))]={progress:progress,predictedProgress:predicted};});return out;}
  async function loadPricePredictor(){if(pricePredictorLoading)return;pricePredictorLoading=true;try{var loaded=false;try{var r=await fetchWithTimeout('/price-data?ts='+Date.now(),8000);if(r.ok){var d=await r.json();var mapped=normalisePredictorPayload(d);if(Object.keys(mapped).length){pricePredictorData=mapped;loaded=true;}}}catch(e){}}catch(e){}finally{pricePredictorLoading=false;render();}}`);

mustReplace("predictor css", /<\/style>/, `.pw-status{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap}.pw-status-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.pw-status.rise{color:#00ff85;background:rgba(0,255,133,.12)}.pw-status.drop{color:#ff3b5c;background:rgba(255,59,92,.12)}.pw-status.neutral{color:var(--text-dim);background:rgba(255,255,255,.06)}.pw-percent{font-weight:700;white-space:nowrap}.pw-percent.rise{color:#00ff85}.pw-percent.drop{color:#ff3b5c}.pw-percent.neutral{color:var(--text-dim)}
</style>`);

mustReplace("row renderer", /      var maxOwn = 40;\n      tbody\.innerHTML = sorted\.map\(function\(p\)\{[\s\S]*?      \}\)\.join\('\'\);/, `      var maxOwn=40;
      tbody.innerHTML=sorted.map(function(p){var total=fmtDelta(p.total),event=fmtDelta(p.event),ownPct=Math.min(100,(p.own/maxOwn)*100),isFav=state.favs.has(p.id),isOwned=state.team&&state.team.picks.has(p.id),statusHtml=priceStatusMarkup(p),progressHtml=pricePercentMarkup(p,'progress'),predictionHtml=pricePercentMarkup(p,'predictedProgress'),mom=p.netTransfers>0?'<span class="momentum up">▲</span>':p.netTransfers<0?'<span class="momentum down">▼</span>':'<span class="momentum neutral">•</span>';return '<tr data-player-id="'+p.id+'" tabindex="0" role="button" class="'+(isOwned?'pw-row-owned ':'')+'"><td class="col-player"><div class="player-cell"><div class="action-buttons"><button class="fav-btn'+(isFav?' active':'')+'" data-fav-id="'+p.id+'" aria-label="Toggle favourite">'+(isFav?'★':'☆')+'</button></div><div class="player-text"><span class="player-name">'+escapeHtml(p.name)+'</span><span class="player-meta"><span class="pos-badge pos-'+p.pos+'">'+p.pos+'</span>'+escapeHtml(p.team)+' · '+mom+'</span></div></div></td><td class="num">'+statusHtml+'</td><td class="num">'+progressHtml+'</td><td class="num">'+predictionHtml+'</td><td class="num price">'+fmtPrice(p.gw1)+'</td><td class="num price">'+fmtPrice(p.now)+'</td><td class="num"><span class="delta '+total.cls+'"><span class="arrow">'+total.arrow+'</span>'+total.text+'</span></td><td class="num"><span class="delta '+event.cls+'"><span class="arrow">'+event.arrow+'</span>'+event.text+'</span></td><td class="num">'+p.points+'</td><td class="num"><div class="own-bar-wrap">'+p.own.toFixed(1)+'%<span class="own-bar"><i style="width:'+ownPct+'%"></i></span></div></td></tr>';}).join('');`);

mustReplace("team loader", /  async function loadMyTeam\(\)\{[\s\S]*?\n  \}\n  async function restoreTeam/, `  async function loadMyTeam(){var input=document.getElementById('pwTeamId'),id=parseInt(input&&input.value?input.value.trim():'',10);if(!id){showToast('Enter a valid FPL Team ID');return;}var button=document.getElementById('pwLoadTeam');button.disabled=true;button.textContent='Loading…';try{var res=await fetchWithTimeout('/team?id='+encodeURIComponent(id),10000),data=await res.json();if(!res.ok||!data||!Array.isArray(data.picks)||data.picks.length!==15)throw new Error(data&&data.error?data.error:'Expected 15 players');state.team={id:id,picks:new Set(data.picks.map(Number)),value:data.value||0,bank:data.bank||0,name:data.name||''};try{localStorage.setItem(STORE_KEY_TEAM,String(id));}catch(e){}showToast('Team loaded');render();}catch(e){showToast('Couldn\\'t load my team');}finally{button.disabled=false;button.textContent='Load my team';}}
  async function restoreTeam`);

mustReplace("snapshot", /  function persistSnapshot\(players, at\)\{[\s\S]*?\n  \}\n\n  function loadSnapshot\(\)\{[\s\S]*?\n  \}\n/, `  function persistSnapshot(players,at){try{var data=players.map(function(p){return [p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes];});localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({version:2,at:at.toISOString(),data:data}));}catch(e){}}
  function loadSnapshot(){try{var raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;var parsed=JSON.parse(raw);if(parsed.version!==2||!Array.isArray(parsed.data))return null;var players=parsed.data.map(function(a){return{id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0};});return{players:players,at:parsed.at};}catch(e){return null;}}
`);

mustReplace("status sorting", /      else \{ av = a\[key\]; bv = b\[key\]; \}/, '      else if(key==="__defaultAbsProgress"){av=Math.abs(priceMetric(a,"progress")||0);bv=Math.abs(priceMetric(b,"progress")||0);} else if(key==="priceStatusRank"){av=priceStatus(a).rank;bv=priceStatus(b).rank;} else if(key==="priceProgress"){av=priceMetric(a,"progress");bv=priceMetric(b,"progress");} else if(key==="pricePrediction"){av=priceMetric(a,"predictedProgress");bv=priceMetric(b,"predictedProgress");} else { av = a[key] == null ? 0 : a[key]; bv = b[key] == null ? 0 : b[key]; }');

// The dashboard renderer owns card values and team-derived budget state.
mustReplace("dashboard renderer", /  function renderDashboard\(\)\{[\s\S]*?\n  \}\n\n  function escapeHtml/, `  function renderDashboard(){
    var rising=state.players.filter(function(p){return p.total>0}), falling=state.players.filter(function(p){return p.total<0});
    var re=document.getElementById('pwRisingCount'),fe=document.getElementById('pwFallingCount'),dl=document.getElementById('pwDeadline');
    if(re)re.textContent=rising.length;
    if(fe)fe.textContent=falling.length;
    if(dl)dl.textContent=formatPriceChangeCountdown();
    var budgetValue=document.getElementById('pwBudgetValue'),budgetHint=document.getElementById('pwBudgetHint');
    if(state.team){if(budgetValue)budgetValue.textContent='£'+(state.team.bank/10).toFixed(1)+'m';if(budgetHint)budgetHint.textContent='available budget';}
    else {if(budgetValue)budgetValue.textContent='—';if(budgetHint)budgetHint.textContent='connect your FPL team below';}
    var note=document.getElementById('pwTeamNote');
    if(note)note.textContent=state.team?(state.team.name?'Loaded: '+state.team.name+' · Team value £'+(state.team.value/10).toFixed(1)+'m · Bank £'+(state.team.bank/10).toFixed(1)+'m':'Your team is loaded. Players are highlighted in the table.'):'Favourites, watchlist and your Team ID are saved locally on this device. No login is required.';
    var clear=document.getElementById('pwClearTeam');
    if(clear)clear.style.display=state.team?'inline-block':'none';
  }

  function escapeHtml`);

// One owner for all sort behavior. Progress cycles signed desc -> signed asc -> absolute desc.
mustReplace("sort handler", /  document\.querySelectorAll\("th\[data-key\] \.sort-btn"\)\.forEach\(function\(btn\)\{[\s\S]*?  \}\);\n\n  searchInput\.addEventListener/, `  document.querySelectorAll("th[data-key] .sort-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      var th=btn.closest("th"),key=th&&th.getAttribute("data-key");
      if(!th||!key)return;
      if(key==="priceProgress"){
        if(state.sortKey!=="priceProgress"&&state.sortKey!=="__defaultAbsProgress")progressSortCycle=2;
        progressSortCycle=(progressSortCycle+1)%3;
        if(progressSortCycle===0){state.sortKey="priceProgress";state.sortDir="desc";}
        else if(progressSortCycle===1){state.sortKey="priceProgress";state.sortDir="asc";}
        else {state.sortKey="__defaultAbsProgress";state.sortDir="desc";}
      }else{
        state.sortKey=key;
        state.sortDir=key==="name"?"asc":"desc";
        progressSortCycle=2;
      }
      saveSort();
      render();
    });
  });

  searchInput.addEventListener`);

// Start the independently loaded predictor and keep the UK-midnight countdown ticking.
mustReplace("predictor startup", /  refresh\(false\);\n  setInterval\(function\(\)\{ refresh\(false\); \}, POLL_MS\);/, `  refresh(false);
  loadPricePredictor();
  setInterval(function(){ refresh(false); }, POLL_MS);
  setInterval(loadPricePredictor,15*60*1000);
  setInterval(function(){var t=document.getElementById('pwDeadline');if(t)t.textContent=formatPriceChangeCountdown();},1000);`);

if ((html.match(/<th\b/g)||[]).length < 10) throw new Error("Build verification failed: expected 10 headers");
if (!/Total Points/.test(html)||!/p\.points/.test(html)) throw new Error("Build verification failed: Total Points missing");
if (!/Progress %/.test(html)||!/Prediction %/.test(html)||!/pricePercentMarkup/.test(html)) throw new Error("Build verification failed: predictor percentages missing");
if ((html.match(/id="pwDeadline"/g)||[]).length !== 1) throw new Error("Build verification failed: Price Change card is not unique");
if (!/class="pw-stat"><div class="label">Budget/.test(html)) throw new Error("Build verification failed: Budget card missing");
if (/class="pw-price-timer"/.test(html)) throw new Error("Build verification failed: header timer remains");
if (!/version:2/.test(html)) throw new Error("Build verification failed: snapshot version missing");
if (!/__defaultAbsProgress/.test(html)) throw new Error("Build verification failed: absolute Progress sort missing");
if (!/Math\.abs\(priceMetric\(a,"progress"\)\|\|0\)/.test(html)) throw new Error("Build verification failed: absolute Progress comparator missing");
if (!/pricewatch:sort-state/.test(html)) throw new Error("Build verification failed: sort persistence missing");
if (!/loadPricePredictor\(\);/.test(html)) throw new Error("Build verification failed: predictor startup missing");

fs.writeFileSync(file, html);
console.log("Price Watch build patch complete and verified");
