(function(){
  "use strict";

  var TEAM_KEY="pricewatch:teamId";
  var dashboard;
  var menu;
  var editor;
  var menuButton;
  var refreshButton;

  function getTeamId(){
    try{return localStorage.getItem(TEAM_KEY)||"";}catch(e){return "";}
  }

  function updateMenu(){
    if(!menu)return;
    var hasTeam=!!getTeamId();
    var add=menu.querySelector("[data-team-action='add']");
    var change=menu.querySelector("[data-team-action='change']");
    var remove=menu.querySelector("[data-team-action='remove']");
    if(add)add.style.display=hasTeam?"none":"flex";
    if(change)change.style.display=hasTeam?"flex":"none";
    if(remove)remove.style.display=hasTeam?"flex":"none";
  }

  function closeMenu(){
    if(menu)menu.classList.remove("open");
    if(menuButton)menuButton.setAttribute("aria-expanded","false");
  }

  function openMenu(){
    if(!menu)return;
    menu.classList.add("open");
    updateMenu();
    if(menuButton)menuButton.setAttribute("aria-expanded","true");
  }

  function showEditor(mode){
    if(!editor)return;
    var input=document.getElementById("pwTeamId");
    var button=document.getElementById("pwLoadTeam");
    var note=document.getElementById("pwTeamNote");
    if(input && getTeamId()) input.value=getTeamId();
    editor.classList.add("open");
    if(note)note.textContent=mode==="change"?"Enter a different FPL Team ID and load it.":"Enter your FPL Team ID to add your team.";
    if(button)button.textContent="Load my team";
    setTimeout(function(){if(input){input.focus();input.select();}},40);
  }

  function hideEditor(){
    if(editor)editor.classList.remove("open");
  }

  function removeTeam(){
    try{localStorage.removeItem(TEAM_KEY);}catch(e){}
    var input=document.getElementById("pwTeamId");
    if(input)input.value="";
    var clear=document.getElementById("pwClearTeam");
    if(clear)clear.click();
    hideEditor();
    closeMenu();
    updateMenu();
  }

  function moveRefreshIntoMenu(){
    refreshButton=document.getElementById("refreshBtn");
    if(!refreshButton || !menu)return;

    var placeholder=menu.querySelector("[data-team-action='refresh']");
    if(placeholder)placeholder.remove();

    refreshButton.className="pw-menu-refresh";
    refreshButton.setAttribute("type","button");
    refreshButton.setAttribute("data-team-action","refresh");
    refreshButton.textContent="Refresh";
    refreshButton.innerHTML="Refresh";
    refreshButton.removeAttribute("aria-label");
    refreshButton.removeAttribute("style");
    menu.insertBefore(refreshButton,menu.firstElementChild);
  }

  function build(){
    dashboard=document.getElementById("pwDashboard");
    if(!dashboard || document.getElementById("pwTeamMenuButton"))return;

    var statusPill=document.getElementById("statusPill");
    var brandRow=document.querySelector(".brand-row");
    if(!statusPill || !brandRow)return;

    var style=document.createElement("style");
    style.id="pwTeamMenuStyles";
    style.textContent=`
      .status-actions{display:flex;align-items:center;gap:6px;flex:none;}
      .status-actions .status-pill{margin:0;}
      .pw-tools,.pw-team-note{display:none!important;}
      #pwTeamMenuButton{width:34px;height:34px;border:1px solid var(--line-strong);background:var(--panel);color:var(--text-dim);border-radius:9px;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;font-family:inherit;}
      #pwTeamMenuButton:active{background:var(--panel-2);color:var(--text);}
      .pw-team-menu-wrap{position:relative;flex:none;}
      .pw-team-menu{position:absolute;top:40px;right:0;width:185px;padding:6px;border:1px solid var(--line-strong);border-radius:10px;background:var(--panel-2);box-shadow:0 12px 28px rgba(0,0,0,.45);display:none;z-index:50;}
      .pw-team-menu.open{display:flex;flex-direction:column;gap:2px;}
      .pw-team-menu button{display:flex;align-items:center;width:100%;border:0;background:transparent;color:var(--text);padding:9px 10px;border-radius:7px;font-size:13px;text-align:left;cursor:pointer;font-family:inherit;}
      .pw-team-menu button:hover,.pw-team-menu button:active{background:rgba(255,255,255,.06);}
      .pw-team-menu button.danger{color:var(--fall);}
      .pw-team-menu .pw-menu-refresh{order:-1;color:var(--accent);}
      .pw-team-editor{position:absolute;top:48px;right:12px;z-index:49;width:min(330px,calc(100vw - 24px));padding:12px;border:1px solid var(--line-strong);border-radius:11px;background:var(--panel-2);box-shadow:0 14px 32px rgba(0,0,0,.5);display:none;}
      .pw-team-editor.open{display:block;}
      .pw-team-editor .pw-tools{display:flex!important;margin-top:0!important;flex-wrap:nowrap;}
      .pw-team-editor .pw-team-note{display:block!important;margin-top:6px;}
      .pw-team-editor .pw-team-input{min-width:0;}
      .pw-team-editor .pw-btn{white-space:nowrap;}
    `;
    document.head.appendChild(style);

    var actions=document.createElement("div");
    actions.className="status-actions";
    brandRow.appendChild(actions);
    actions.appendChild(statusPill);

    var wrap=document.createElement("div");
    wrap.className="pw-team-menu-wrap";
    wrap.innerHTML=`
      <button id="pwTeamMenuButton" type="button" aria-label="More options" aria-expanded="false">⋮</button>
      <div class="pw-team-menu" role="menu">
        <button type="button" data-team-action="refresh" role="menuitem">Refresh</button>
        <button type="button" data-team-action="add" role="menuitem">Add team</button>
        <button type="button" data-team-action="change" role="menuitem">Change team</button>
        <button type="button" data-team-action="remove" class="danger" role="menuitem">Remove team</button>
      </div>`;
    actions.appendChild(wrap);

    menu=wrap.querySelector(".pw-team-menu");
    menuButton=document.getElementById("pwTeamMenuButton");
    moveRefreshIntoMenu();

    editor=document.createElement("div");
    editor.className="pw-team-editor";
    editor.innerHTML=`
      <div class="pw-tools"></div>
      <div class="pw-team-note"></div>`;
    var originalTools=dashboard.querySelector(".pw-tools");
    var originalNote=dashboard.querySelector(".pw-team-note");
    if(originalTools)editor.querySelector(".pw-tools").appendChild(originalTools);
    if(originalNote)editor.querySelector(".pw-team-note").replaceWith(originalNote);
    dashboard.appendChild(editor);

    menuButton.addEventListener("click",function(e){
      e.stopPropagation();
      if(menu.classList.contains("open"))closeMenu();else openMenu();
    });

    menu.querySelector("[data-team-action='refresh']").addEventListener("click",function(){
      closeMenu();
      if(refreshButton)refreshButton.click();
    });
    menu.querySelector("[data-team-action='add']").addEventListener("click",function(){closeMenu();showEditor("add");});
    menu.querySelector("[data-team-action='change']").addEventListener("click",function(){closeMenu();showEditor("change");});
    menu.querySelector("[data-team-action='remove']").addEventListener("click",removeTeam);

    document.addEventListener("click",function(e){
      if(!wrap.contains(e.target)){
        closeMenu();
        if(editor && !editor.contains(e.target))hideEditor();
      }
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape"){
        closeMenu();
        hideEditor();
      }
    });

    var loadButton=document.getElementById("pwLoadTeam");
    if(loadButton)loadButton.addEventListener("click",function(){
      setTimeout(function(){
        setTimeout(function(){
          var id=getTeamId();
          if(id){hideEditor();updateMenu();}
        },120);
      },0);
    });

    updateMenu();
  }

  function start(){
    if(document.readyState==="loading")setTimeout(build,0);else build();
  }

  start();
})();
