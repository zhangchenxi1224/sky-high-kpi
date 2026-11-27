import {readFile,writeFile,readdir,mkdir,cp,stat,rm,realpath} from 'node:fs/promises';
import path from 'node:path';
import {transform} from 'esbuild';
const root=process.cwd();await mkdir('delivery',{recursive:true});
const files=await readdir('dist/assets');const main=files.find(f=>/^index-.*\.js$/.test(f));const css=files.find(f=>/^index-.*\.css$/.test(f));
let js=await readFile(`dist/assets/${main}`,'utf8');
for(const f of files.filter(f=>f.endsWith('.js')&&f!==main)){
  const chunk=await readFile(`dist/assets/${f}`,'utf8');
  js=js.replaceAll(`./${f}`,`data:text/javascript;base64,${Buffer.from(chunk).toString('base64')}`);
}
const images=Object.fromEntries(await Promise.all(files.filter(f=>/\.(webp|svg|woff|mp3)$/.test(f)).map(async f=>[f,`data:${f.endsWith('.mp3')?'audio/mpeg':f.endsWith('.woff')?'font/woff':f.endsWith('.svg')?'image/svg+xml':'image/webp'};base64,`+(await readFile(`dist/assets/${f}`)).toString('base64')])));
const style=await readFile(`dist/assets/${css}`,'utf8');
let html=await readFile('dist/index.html','utf8');
const licenses=await readFile('dist/THIRD_PARTY_LICENSES.txt','utf8');
html=html.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/g,'').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,'');
html=html.replace('</head>',()=>`<style>${style}</style><!-- ${licenses.replaceAll('--','—')} --></head>`);
html=html.replace('</body>',()=>`<script>window.__ASSETS__=${JSON.stringify(images)};document.documentElement.style.setProperty('--rooms-sprite','url("'+window.__ASSETS__['rooms.webp']+'")');</script><script type="module">${js.replaceAll('</script','<\\/script')}</script></body>`);
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){await transform(match[1],{loader:'js',format:'esm'});}
await writeFile('delivery/Dont-Collapse-MY-GPA-Offline.html',html);
const deliveryRoot=await realpath(path.join(root,'delivery'));
if(deliveryRoot!==path.resolve(root,'delivery'))throw new Error('Refusing to clean a redirected delivery directory');
const webOutput=path.join(deliveryRoot,'web');
if(path.dirname(webOutput)!==deliveryRoot)throw new Error('Invalid web output directory');
await rm(webOutput,{recursive:true,force:true});
await cp('dist',webOutput,{recursive:true});
for(const f of ['README.md','ACCEPTANCE.md','THIRD_PARTY_NOTICES.md']){try{await cp(f,path.join('delivery',f));}catch{}}
await writeFile('delivery/启动游戏.cmd','@echo off\r\nchcp 65001 >nul\r\nstart "" "%~dp0Dont-Collapse-MY-GPA-Offline.html"\r\n','utf8');
const size=async(dir)=>{let n=0;for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);n+=f.isDirectory()?await size(p):(await stat(p)).size;}return n;};
console.log(JSON.stringify({webBytes:await size('dist'),offlineHtmlBytes:(await stat('delivery/Dont-Collapse-MY-GPA-Offline.html')).size,delivery:path.join(root,'delivery')}));
