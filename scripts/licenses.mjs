import {readFile,writeFile,readdir} from 'node:fs/promises';
const texts=['Don\u0027t Collapse, MY GPA! — third-party software notices\n\nCampus room art: user-provided project asset; skyline and interface drawn for this project.\n', 'iamkun/tower_game, revision c6fa84afe179b661fa71cf7cc8788d0c47ca2875\n'+await readFile('vendor/tower-game/LICENSE','utf8')];
texts.push('Ark Pixel Font — title artwork outlines (release 2026.11.10)\n'+await readFile('public/ARK_PIXEL_OFL.txt','utf8'));
texts.push('Fusion Pixel Font — runtime UI subset with original pixel symbols\n'+await readFile('public/FUSION_PIXEL_LICENSES.txt','utf8'));
for(const name of ['react','react-dom','scheduler','zustand','qrcode','dijkstrajs','tailwindcss']){
  const files=await readdir(`node_modules/${name}`);const license=files.find(f=>/^licen[cs]e(?:\.|$)/i.test(f));if(!license)throw Error(`Missing license for ${name}`);
  texts.push(name+'\n'+await readFile(`node_modules/${name}/${license}`,'utf8'));
}
const zz=await readFile('node_modules/zzfx/ZzFX.js','utf8');const zzLicense=zz.match(/\/\*\s*ZzFX MIT License[\s\S]*?\*\//)?.[0];if(!zzLicense)throw Error('Missing ZzFX license');texts.push(zzLicense);
await writeFile('public/THIRD_PARTY_LICENSES.txt',texts.join('\n\n--------------------------\n\n'));
