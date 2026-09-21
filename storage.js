export const STORE_KEY_SNAPSHOT="pricewatch:lastGood";
export const STORE_KEY_FAVS="pricewatch:favs";
export const STORE_KEY_WATCHLIST="pricewatch:watchlist";
export const STORE_KEY_TEAM="pricewatch:teamId";

export function loadSet(key){
  try{const raw=localStorage.getItem(key);return raw?new Set(JSON.parse(raw)):new Set<number>();}
  catch{return new Set<number>();}
}
export function saveSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(Array.from(value)));}catch{}
}
export function loadValue(key)|null{
  try{return localStorage.getItem(key);}catch{return null;}
}
export function saveValue(key,value){
  try{localStorage.setItem(key,value);}catch{}
}
export function removeValue(key){
  try{localStorage.removeItem(key);}catch{}
}
export function saveSnapshot(players,at){
  try{
    const data=players.map((p)=>[p.id,p.name,p.team,p.pos,p.gw1,p.now,p.total,p.event,p.own,p.status,p.teamName,p.transfersIn,p.transfersOut,p.netTransfers,p.points,p.form,p.epNext,p.minutes]);
    localStorage.setItem(STORE_KEY_SNAPSHOT,JSON.stringify({at:at.toISOString(),data}));
  }catch{}
}
export function loadSnapshot():{players;at}|null{
  try{
    const raw=localStorage.getItem(STORE_KEY_SNAPSHOT);if(!raw)return null;
    const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.data))return null;
    const players=parsed.data.map((a)=>({id:a[0],name:a[1],team:a[2],pos:a[3],gw1:a[4],now:a[5],total:a[6],event:a[7],own:a[8],status:a[9],teamName:a[10]||a[2],transfersIn:a[11]||0,transfersOut:a[12]||0,netTransfers:a[13]||0,points:a[14]||0,form:a[15]||0,epNext:a[16]||0,minutes:a[17]||0}));
    return{players,at:parsed.at};
  }catch{return null;}
}
