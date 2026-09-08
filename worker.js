const FPL_API = "https://fantasy.premierleague.com/api/";
const PRICE_PREDICTOR_API = "https://livefpl.us/api/prices.json";

const JSON_HEADERS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
const FETCH_HEADERS = {"User-Agent":"Mozilla/5.0 (compatible; PriceWatch/1.0)","Accept":"application/json"};

function json(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...extra}});}
async function fplJson(path){const response=await fetch(FPL_API+path,{headers:FETCH_HEADERS});if(!response.ok)throw new Error("FPL returned HTTP "+response.status);return response.json();}

async function handleFpl(url){
  const requestedPath=String(url.searchParams.get("path")||"bootstrap-static/").replace(/^https?:\/\/[^/]+\/api\//i,"").replace(/^\/+/,"");
  const allowed=/^(bootstrap-static\/|element-summary\/\d+\/?|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks\/?)$/;
  if(!allowed.test(requestedPath))return json({error:"Unsupported FPL API path"},400);
  try{const response=await fetch(FPL_API+requestedPath,{headers:FETCH_HEADERS});const body=await response.text();return new Response(body,{status:response.status,headers:{...JSON_HEADERS,"Cache-Control":requestedPath==="bootstrap-static/"?"public, max-age=60":"public, max-age=30"}});}catch(error){return json({error:String(error)},502);}
}

async function handlePriceData(){
  try{
    const response=await fetch(PRICE_PREDICTOR_API,{headers:{...FETCH_HEADERS,"Cache-Control":"no-cache"}});
    if(!response.ok)throw new Error("Price predictor returned HTTP "+response.status);
    const raw=await response.json();const source=raw&&raw.players?raw.players:raw;const players={};
    Object.keys(source||{}).forEach((id)=>{const item=source[id]||{};const predicted=Number(item.progress_tonight);players[String(id)]={progress:Number.isFinite(Number(item.progress))?Number(item.progress):null,predictedProgress:Number.isFinite(predicted)?predicted:null};});
    return json({players},200,{"Cache-Control":"public, max-age=60"});
  }catch(error){return json({error:String(error),players:{}},502);}
}

async function handleTeam(url){
  const id=Number.parseInt(url.searchParams.get("id")||"",10);if(!Number.isInteger(id)||id<=0)return json({error:"Invalid FPL team id"},400);
  try{
    const entry=await fplJson("entry/"+id+"/");const currentGameweek=Number.parseInt(String(entry.current_event||""),10);if(!Number.isInteger(currentGameweek)||currentGameweek<1)throw new Error("FPL team has no current gameweek");
    let picks=[],gameweek=currentGameweek;
    try{const current=await fplJson("entry/"+id+"/event/"+currentGameweek+"/picks/");picks=Array.isArray(current.picks)?current.picks:[];}catch(_){ }
    if(!picks.length&&currentGameweek>1){try{const previous=await fplJson("entry/"+id+"/event/"+(currentGameweek-1)+"/picks/");picks=Array.isArray(previous.picks)?previous.picks:[];if(picks.length)gameweek=currentGameweek-1;}catch(_){ }}
    if(picks.length!==15)throw new Error("FPL returned "+picks.length+" players instead of 15");
    return json({id,name:entry.name||"",value:entry.last_deadline_value||entry.value||0,bank:entry.last_deadline_bank||entry.bank||0,currentGameweek,gameweek,picks:picks.map((pick)=>Number(pick.element))},200,{"Cache-Control":"public, max-age=30"});
  }catch(error){return json({error:String(error)},502);}
}

async function serveAsset(request,env){
  const response=await env.ASSETS.fetch(request);const url=new URL(request.url);const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("text/html")||(url.pathname!=="/"&&!url.pathname.endsWith(".html")))return response;
  let html=await response.text();
  const proxyFrom='    { build: function(u){ return "/.netlify/functions/fpl"; }, parse: function(res){ return res.json(); } },';
  const proxyTo='    { build: function(u){ return "/fpl?path=" + encodeURIComponent(u.replace("https://fantasy.premierleague.com/api/", "")); }, parse: function(res){ return res.json(); } },';
  html=html.replace(proxyFrom,proxyTo);html=html.replace(/<!-- pricewatch:team-ui-fix -->[\s\S]*?<\/script>/g,"");

  const marker='  var risersOnly = document.getElementById("risersOnly");';
  const injected=marker+`

  var myTeamOnlyChip=document.getElementById('myTeamOnly');
  if(myTeamOnlyChip&&!myTeamOnlyChip.__pwBound){myTeamOnlyChip.__pwBound=true;myTeamOnlyChip.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();state.myTeamOnly=!state.myTeamOnly;myTeamOnlyChip.classList.toggle('active',state.myTeamOnly);render();},true);}
  var clearTeamButton=document.getElementById('pwClearTeam');
  if(clearTeamButton&&!clearTeamButton.__pwBound){clearTeamButton.__pwBound=true;clearTeamButton.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();state.team=null;state.myTeamOnly=false;clearTeamButton.style.display='none';if(myTeamOnlyChip)myTeamOnlyChip.classList.remove('active');try{localStorage.removeItem(STORE_KEY_TEAM);}catch(_){ }var input=document.getElementById('pwTeamId');if(input)input.value='';render();showToast('Team cleared');},true);}

  var pwPredictorData=null;var pwPredictorLoading=false;var pwNormalizeQueued=false;
  function pwStatusFor(player){var item=pwPredictorData&&pwPredictorData[String(player.id)];var predicted=item&&Number.isFinite(item.predictedProgress)?item.predictedProgress:null;if(!Number.isFinite(predicted))return{text:'—',cls:'neutral',rank:0};var pct=predicted*100;if(pct<0){if(pct<=-100)return{text:'Very Likely to Drop',cls:'drop',rank:5};if(pct<=-80)return{text:'Likely to Drop',cls:'drop',rank:4};return{text:'Unlikely to Drop',cls:'neutral',rank:3};}if(pct>=100)return{text:'Very Likely to Rise',cls:'rise',rank:5};if(pct>=80)return{text:'Likely to Rise',cls:'rise',rank:4};return{text:'Unlikely to Rise',cls:'neutral',rank:3};}
  function statusMarkup(player){var s=pwStatusFor(player);player.priceStatusRank=s.rank;return '<span class="pw-status '+s.cls+'"><span class="pw-status-dot"></span>'+escapeHtml(s.text)+'</span>';}
  function sortIconHtml(){return '<span class="sort-arrows"><svg viewBox="0 0 8 8"><polygon points="4,0 8,6 0,6"/></svg><svg viewBox="0 0 8 8"><polygon points="4,8 8,2 0,2"/></svg></span>';}
  function setHeader(th,key,label,isName){th.className=isName?'col-player':'num';th.setAttribute('data-key',key);th.innerHTML='<button class="sort-btn">'+label+sortIconHtml()+'</button>';return th;}

  function normalizeTable(){
    if(pwNormalizeQueued)return;pwNormalizeQueued=true;
    setTimeout(function(){
      pwNormalizeQueued=false;
      var table=document.querySelector('table'),headerRow=table&&table.querySelector('thead tr'),body=document.getElementById('tbody');if(!table||!headerRow||!body)return;
      var oldHeaders=Array.prototype.slice.call(headerRow.children),indexByKey={};
      oldHeaders.forEach(function(th,index){var key=th.getAttribute('data-key'),label=th.textContent.trim();if(key==='name'||/^player$/i.test(label))indexByKey.name=index;else if(key==='status'||key==='priceStatusRank'||/^status$/i.test(label))indexByKey.status=index;else if(key==='gw1'||/GW1 price/i.test(label))indexByKey.gw1=index;else if(key==='now'||/^current$/i.test(label))indexByKey.now=index;else if(key==='total'||/Total Δ/i.test(label))indexByKey.total=index;else if(key==='event'||/This GW/i.test(label))indexByKey.event=index;else if(key==='points'||/Total Points/i.test(label))indexByKey.points=index;else if(key==='own'||/^owned$/i.test(label))indexByKey.own=index;});
      function header(label,key,isName){return setHeader(document.createElement('th'),key,label,isName);}
      headerRow.replaceChildren.apply(headerRow,[header('Player','name',true),header('Status','priceStatusRank',false),header('GW1 price','gw1',false),header('Current','now',false),header('Total Δ','total',false),header('This GW','event',false),header('Total Points','points',false),header('Owned','own',false)]);
      Array.prototype.slice.call(body.querySelectorAll('tr[data-player-id]')).forEach(function(row){
        var cells=Array.prototype.slice.call(row.children),id=Number(row.getAttribute('data-player-id')),player=state.players.find(function(p){return Number(p.id)===id;});if(!player)return;
        function cell(key){var index=indexByKey[key];return Number.isInteger(index)?(cells[index]||null):null;}
        var nameCell=cell('name')||cells[0],gw1Cell=cell('gw1'),nowCell=cell('now'),totalCell=cell('total'),eventCell=cell('event'),ownCell=cell('own'),pointsCell=cell('points')||document.createElement('td');if(!nameCell||!gw1Cell||!nowCell||!totalCell||!eventCell||!ownCell)return;
        var statusCell=document.createElement('td');statusCell.className='num';statusCell.innerHTML=statusMarkup(player);pointsCell.className='num';pointsCell.textContent=String(player.points||0);row.replaceChildren(nameCell,statusCell,gw1Cell,nowCell,totalCell,eventCell,pointsCell,ownCell);
      });
    },0);
  }

  async function loadPricePredictor(){if(pwPredictorLoading)return;pwPredictorLoading=true;try{var res=await fetch('/price-data',{cache:'no-store'});var data=await res.json();if(res.ok&&data&&data.players)pwPredictorData=data.players;}catch(_){ }finally{pwPredictorLoading=false;normalizeTable();}}
  if(!window.__pwPricePredictorBound){
    window.__pwPricePredictorBound=true;
    var pwObserver=new MutationObserver(function(){normalizeTable();});
    var pwTbody=document.getElementById('tbody');
    if(pwTbody)pwObserver.observe(pwTbody,{childList:true,subtree:true});
    var pwTable=document.querySelector('table');
    if(pwTable)pwObserver.observe(pwTable,{childList:true,subtree:true});
    document.addEventListener('click',function(e){if(e.target.closest('th[data-key]'))setTimeout(normalizeTable,0);},true);
    setTimeout(loadPricePredictor,0);setInterval(loadPricePredictor,15*60*1000);setTimeout(normalizeTable,0);
  }`;
  if(html.includes(marker)&&!html.includes("window.__pwPricePredictorBound"))html=html.replace(marker,injected);
  return new Response(html,{status:response.status,headers:response.headers});
}

export default{async fetch(request,env){const url=new URL(request.url);if(url.pathname==="/fpl"||url.pathname==="/.netlify/functions/fpl")return handleFpl(url);if(url.pathname==="/price-data")return handlePriceData();if(url.pathname==="/team")return handleTeam(url);return serveAsset(request,env);}};