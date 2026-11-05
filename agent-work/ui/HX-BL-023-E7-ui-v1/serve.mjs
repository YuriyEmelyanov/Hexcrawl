// Read-only proposal preview. No product callbacks, network APIs or writes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(process.env.E7_SOURCE||path.join(root,'../source'));
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const relative=pathname==='/'?'preview.html':pathname.slice(1);
  if(relative.split('/').includes('..')){res.writeHead(400);res.end();return;}
  const options=[path.join(root,relative),path.join(source,'public',relative)];
  let content,filename;
  for(const name of options){try{content=await fs.readFile(name);filename=name;break;}catch{}}
  if(!content){res.writeHead(404);res.end('Missing preview or baseline public asset');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
 } catch {res.writeHead(400);res.end('Invalid request');}
}).listen(4178,'127.0.0.1',()=>console.log('E7 proposal: http://127.0.0.1:4178'));
