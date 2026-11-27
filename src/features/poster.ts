import QRCode from 'qrcode';
import type {Snapshot,Placed} from '../game/engine';
import {assetUrl} from './assets';
import {createReportSvg,REPORT_SIZE} from './report';

let birdData:Promise<string>|undefined;
function embeddedBird(){
  return birdData??=(async()=>{
    const response=await fetch(assetUrl('bird-idle.webp'));
    if(!response.ok)throw new Error('Bird asset unavailable');
    const blob=await response.blob();
    return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
  })().catch(error=>{birdData=undefined;throw error;});
}
export async function makePoster(s:Snapshot,tower:Placed[],birdGained=0):Promise<string>{
  const shareUrl=location.protocol==='file:'?'https://sky-high-kpi-merged-20261127.nevilleatkinson25.chatgpt.site':location.origin+location.pathname;
  const [qr,bird]=await Promise.all([QRCode.toDataURL(shareUrl,{width:224,margin:1,color:{dark:'#172938',light:'#fffaf0'}}),embeddedBird()]);
  const svg=createReportSvg(s,tower,qr,bird,birdGained);
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=REPORT_SIZE.width;canvas.height=REPORT_SIZE.height;
    canvas.getContext('2d')!.drawImage(image,0,0);
    return canvas.toDataURL('image/png');
  }finally{URL.revokeObjectURL(url);}
}
