const API_ROUTE = "/fpl";
const DEFAULT_TIMEOUT_MS = 8_000;

function fetchWithTimeout(url, timeoutMs=DEFAULT_TIMEOUT_MS):Promise<Response>{
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(url,{cache:"no-store",signal:controller.signal}).finally(()=>window.clearTimeout(timer));
}

function buildApiUrl(path){
  return API_ROUTE+"?path="+encodeURIComponent(path.replace(/^\/+/, ""));
}

export async function fetchPublicApi(path):Promise<any>{
  const response=await fetchWithTimeout(buildApiUrl(path));
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}

export async function fetchBootstrap(onAttempt):Promise<any>{
  onAttempt?.(1,1);
  return fetchPublicApi("bootstrap-static/");
}
