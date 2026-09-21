export function currentEvent(events:any[]):any|null{
  const list=events||[];
  for(const event of list)if(event.is_current)return event;
  for(const event of list)if(!event.finished)return event;
  return list.length?list[list.length-1]:null;
}

export function formatCountdown(deadline:string|null|undefined):string{
  if(!deadline)return "—";
  const diff=new Date(deadline).getTime()-Date.now();
  if(diff<=0)return "Locked";
  let seconds=Math.floor(diff/1000);
  const days=Math.floor(seconds/86400);seconds%=86400;
  const hours=Math.floor(seconds/3600);seconds%=3600;
  const minutes=Math.floor(seconds/60);
  return days?days+"d "+hours+"h":hours?hours+"h "+minutes+"m":minutes+"m";
}
