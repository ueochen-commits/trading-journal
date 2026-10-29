// Local-only fixture origins; no query/cookie override is shipped to production.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { billingMarket } from '../shared/billing-market.mjs';
const root=resolve('../tradegrail-landingpage/dist');
for(const [port,country] of [[3041,'CN'],[3042,'US']]){
 createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/billing-market'){
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify(billingMarket({'x-vercel-ip-country':country},{VERCEL:'1'})));return;
  }
  try{
   const name=path==='/'?'index.html':path.slice(1)+(extname(path)?'':'.html');
   const file=resolve(root,name);if(!file.startsWith(root+'/'))throw Error('path');
   const bytes=await readFile(file);
   const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'}[extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
 }).listen(port,'127.0.0.1',()=>console.log(`Local ${country} fixture http://127.0.0.1:${port}/pricing`));
}
