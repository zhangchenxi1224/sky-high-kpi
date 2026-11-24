// Lossless encoding only: the source RGBA pixels are never resized or edited.
import sharp from 'sharp';
import {mkdir,rename,access,stat} from 'node:fs/promises';
await mkdir('art',{recursive:true});
try{await access('art/rooms-original.png');}catch{await rename('public/assets/rooms.png','art/rooms-original.png');}
await sharp('art/rooms-original.png').webp({lossless:true,effort:6}).toFile('public/assets/rooms.webp');
const a=await sharp('art/rooms-original.png').ensureAlpha().raw().toBuffer();
const b=await sharp('public/assets/rooms.webp').ensureAlpha().raw().toBuffer();
// Fully transparent pixels may discard invisible RGB, so compare visible pixels and every alpha.
let differences=0;for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3]||(a[i+3]>0&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))differences++;}
if(differences)throw Error(`Lossless asset check failed: ${differences} pixels`);
console.log(JSON.stringify({lossless:true,bytes:(await stat('public/assets/rooms.webp')).size}));
