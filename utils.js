export function currentEvent(events){
  const list=events||[];
  for(const event of list)if(event.is_current)return event;
  for(const event of list)if(!event.finished)return event;
  return list.length?list[list.length-1]:null;
}

export function formatCountdown(deadline){
  if(!deadline)return "—";
  const diff=new Date(deadline).getTime()-Date.now();
  if(diff<=0)return "Locked";
  let seconds=Math.floor(diff/1000);
  const days=Math.floor(seconds/86400);seconds%=86400;
  const hours=Math.floor(seconds/3600);seconds%=3600;
  const minutes=Math.floor(seconds/60);
  return days?days+"d "+hours+"h":hours?hours+"h "+minutes+"m":minutes+"m";
}

export function upcomingEvent(events){
  const list=(events||[]).slice().sort((a,b)=>new Date(a.deadline_time||0)-new Date(b.deadline_time||0));
  const future=list.find(event=>event.deadline_time&&new Date(event.deadline_time).getTime()>Date.now());
  return future||list.find(event=>!event.finished)||null;
}

export function formatDeadline(deadline){
  if(!deadline)return "—";
  try{
    return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(deadline));
  }catch{return new Date(deadline).toLocaleString();}
}

function londonParts(date){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
  const out={};
  for(const part of parts)if(part.type!=="literal")out[part.type]=Number(part.value);
  return out;
}

function londonOffsetMs(date){
  const p=londonParts(date);
  return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-date.getTime();
}

export function nextPriceChangeAt(now=new Date()){
  const p=londonParts(now);
  const nextDayUtc=Date.UTC(p.year,p.month-1,p.day+1,12,0,0);
  const nextDayOffset=londonOffsetMs(new Date(nextDayUtc));
  return new Date(Date.UTC(p.year,p.month-1,p.day+1,0,0,0)-nextDayOffset);
}
