(function(){
  "use strict";

  var KEY="pricewatch:teamId";
  function teamId(){try{return localStorage.getItem(KEY)||"";}catch(e){return "";}}
  function saveTeam(v){try{if(v)localStorage.setItem(KEY,v);else localStorage.removeItem(KEY);}catch(e){} location.reload();}

  function build(){
    if(!document.body || document.getElementById("transferHeader"))return;

    var style=document.createElement("style");
    style.id="transfersHeaderStyles";
    style.textContent=`
      body{padding:0!important}
      #transferHeader{display:block!important;width:100%;position:relative;z-index:1000}
      .transfers-header{padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 12px;background:linear-gradient(180deg,#37003c,#1c0025 130%);border-bottom:1px solid rgba(255,255,255,.09);color:#f4eef6;box-sizing:border-box;position:relative;z-index:1000}
      .transfers-header-row{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:1600px;margin:0 auto}
      .transfers-brand{display:flex;align-items:center;gap:9px;min-width:0}
      .transfers-mark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#00ff85,#04f5ff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#1c0025;flex:none}
      .transfers-brand h1{font-size:16px;font-weight:600;margin:0;letter-spacing:.2px;white-space:nowrap}
      .transfers-actions{display:flex;align-items:center;gap:6px;flex:none}
      .transfers-live{display:flex;align-items:center;gap:6px;font-size:11px;color:#c9b8d1;padding:6px 10px;border-radius:999px;background:#26002b;border:1px solid rgba(255,255,255,.09);white-space:nowrap}
      .transfers-live-dot{width:7px;height:7px;border-radius:50%;background:#00ff85;box-shadow:0 0 0 3px rgba(0,255,133,.18);flex:none}
      .transfers-menu-btn{width:34px;height:34px;border:1px solid rgba(255,255,255,.16);background:#26002b;color:#c9b8d1;border-radius:9px;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;font-family:inherit}
      .transfers-menu{position:absolute;top:calc(100% + 6px);right:16px;width:185px;padding:6px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:#2f0334;box-shadow:0 12px 28px rgba(0,0,0,.45);display:none;z-index:1010}
      .transfers-menu.open{display:flex;flex-direction:column;gap:2px}
      .transfers-menu button{display:flex;align-items:center;width:100%;border:0;background:transparent;color:#f4eef6;padding:9px 10px;border-radius:7px;font-size:13px;text-align:left;cursor:pointer;font-family:inherit}
      .transfers-menu button:hover,.transfers-menu button:active{background:rgba(255,255,255,.06)}
      .transfers-menu .danger{color:#ff3b5c}
      .transfers-menu .nav{color:#04f5ff}
      .transfers-body{min-height:calc(100vh - 58px)}
      @media(max-width:620px){.transfers-header{padding-left:12px;padding-right:12px}.transfers-menu{right:12px}.transfers-brand h1{font-size:15px}}
    `;
    document.head.appendChild(style);

    var header=document.createElement("header");
    header.id="transferHeader";
    header.className="transfers-header";
    header.innerHTML=`
      <div class="transfers-header-row">
        <div class="transfers-brand"><div class="transfers-mark">AY</div><h1>FPL AY Transfer</h1></div>
        <div class="transfers-actions">
          <div class="transfers-live"><span class="transfers-live-dot"></span><span>LIVE</span></div>
          <button class="transfers-menu-btn" type="button" aria-label="More options" aria-expanded="false">⋮</button>
        </div>
        <div class="transfers-menu" role="menu">
          <button type="button" data-action="refresh">Refresh</button>
          <button type="button" data-action="add">Add team</button>
          <button type="button" data-action="change">Change team</button>
          <button type="button" data-action="remove" class="danger">Remove team</button>
          <button type="button" data-action="price" class="nav">Price Change</button>
        </div>
      </div>`;
    document.body.insertBefore(header,document.body.firstChild);

    var page=document.querySelector(".page");
    if(page)page.classList.add("transfers-body");

    var menu=header.querySelector(".transfers-menu");
    var btn=header.querySelector(".transfers-menu-btn");
    function close(){menu.classList.remove("open");btn.setAttribute("aria-expanded","false");}
    btn.addEventListener("click",function(e){e.stopPropagation();if(menu.classList.contains("open"))close();else{menu.classList.add("open");btn.setAttribute("aria-expanded","true");}});
    document.addEventListener("click",function(e){if(!header.contains(e.target))close();});
    menu.querySelector("[data-action='refresh']").onclick=function(){location.reload();};
    menu.querySelector("[data-action='add']").onclick=function(){close();var id=prompt("Enter your FPL Team ID:",teamId());if(id&&/^\\d+$/.test(id.trim()))saveTeam(id.trim());};
    menu.querySelector("[data-action='change']").onclick=function(){close();var id=prompt("Enter your new FPL Team ID:",teamId());if(id&&/^\\d+$/.test(id.trim()))saveTeam(id.trim());};
    menu.querySelector("[data-action='remove']").onclick=function(){close();saveTeam("");};
    menu.querySelector("[data-action='price']").onclick=function(){location.href="/";};

    function forcePitch(){
      var pitch=document.querySelector(".pitch-wrap");
      var pitchBtn=document.getElementById("pitchBtn");
      var list=document.querySelector(".list-view");
      if(pitch&&pitchBtn&&pitchBtn.classList.contains("active")){
        pitch.classList.remove("hidden");
        pitch.style.display="flex";
        if(list)list.classList.add("hidden");
      }
    }
    forcePitch();
    setTimeout(forcePitch,300);
    setTimeout(forcePitch,1000);
    if(window.MutationObserver){
      var observer=new MutationObserver(forcePitch);
      observer.observe(document.body,{childList:true,subtree:true});
      setTimeout(function(){observer.disconnect();},10000);
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",build);else build();
})();
