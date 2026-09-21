import { defineConfig } from "vite";

export default defineConfig({
  base:"./",
  build:{outDir:"dist",emptyOutDir:true,sourcemap:true},
  server:{
    proxy:{
      "/fpl":{
        target:"https://fantasy.premierleague.com",
        changeOrigin:true,
        rewrite:(path)=>{
          const url=new URL(path,"http://localhost");
          const apiPath=url.searchParams.get("path")||"bootstrap-static/";
          return "/api/"+apiPath.replace(/^\/+/, "");
        }
      }
    }
  }
});
