import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[3]||'dist'),port=Number(process.argv[2]||5179);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');if(!fs.existsSync(target)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(target).pipe(res);}catch{res.writeHead(400);res.end();}}).listen(port,'0.0.0.0',()=>console.log(`Local: http://localhost:${port}/`));
