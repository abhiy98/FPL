import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist",{recursive:true});
for(const file of ["_worker.js","sw.js","manifest.json","icon-192.png","icon-512.png","pwa-enhance.js","jersey-fix.js","team-menu.js"]){
  copyFileSync(file,"dist/"+file);
}
console.log("Copied Cloudflare/PWA runtime files to dist/");
