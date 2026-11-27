import QRCode from 'qrcode';
import type {Snapshot} from '../game/engine';
import type {Placed} from '../game/engine';
import {getSocialProfile,getTitle} from '../game/rules';
const font='"Microsoft YaHei", "PingFang SC", sans-serif';
export async function makePoster(s:Snapshot,tower:Placed[]):Promise<string>{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1500;const c=canvas.getContext('2d')!;
  c.fillStyle='#f6f0df';c.fillRect(0,0,1080,1500);c.strokeStyle='#ded7c7';c.lineWidth=1;for(let y=0;y<1500;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(1080,y);c.stroke();}
  c.strokeStyle='#27314b';c.lineWidth=4;c.strokeRect(42,42,996,1416);const text=(t:string,x:number,y:number,size:number,color='#28334b',align:CanvasTextAlign='left')=>{c.font=`bold ${size}px ${font}`;c.fillStyle=color;c.textAlign=align;c.fillText(t,x,y);};
  text('SKY-HIGH KPI  /  校园档案',80,104,23);text('本科四年综测',540,200,65,'#27314b','center');text('结业鉴定表',540,280,65,'#27314b','center');
  text('此表仅记录本次游戏成绩 · 不代表真实学业评价',540,332,21,'#737782','center');
  c.fillStyle='#28344d';c.fillRect(78,370,924,135);text(`${s.floor} F`,115,458,70,'#ffe4a5');text('综测总分',960,416,22,'#f3ebdd','right');text(String(s.score).padStart(5,'0'),960,472,51,'#ffe4a5','right');
  const title=getTitle(s);const social=getSocialProfile(s.kpi);text(`社交属性 · ${social.profile.name} / ${social.profile.detail}`,540,540,20,'#6d6b70','center');text(title.name,540,575,37,'#27314b','center');
  const words=[...title.comment];let line='';let yy=621;for(const ch of words){if(c.measureText(line+ch).width>870){text(line,540,yy,24,'#6d6b70','center');yy+=35;line='';}line+=ch;}text(line,540,yy,24,'#6d6b70','center');
  // True tower offsets, scaled uniformly so the complete run fits the silhouette.
  const maxX=Math.max(0,...tower.map(p=>p.x)),minX=Math.min(0,...tower.map(p=>p.x));const scale=Math.min(2,360/Math.max(88,tower.length*88),300/(maxX-minX+88));const tx=290-(maxX+minX)*scale/2;
  text('你的天际线',290,732,24,'#6d6b70','center');c.fillStyle='#c0bcc1';c.fillRect(130,1115,320,4);
  for(const p of tower){c.fillStyle=p.perfect?'#66789a':'#8998ae';c.fillRect(tx+(p.x-44)*scale,1114+p.y*scale,88*scale-1,88*scale-1);}
  if(!tower.length){text('地基还在，下次再来',290,970,21,'#7a7f8c','center');}
  const values=[s.kpi.gpa/4,s.kpi.research/15,s.kpi.competition/30,s.kpi.volunteer/30,s.kpi.practice/15].map(v=>Math.min(1,v));const labels=['GPA','科研','竞赛','志愿','实践'];const cx=750,cy=905,r=135;
  const point=(i:number,radius:number)=>({x:cx+Math.cos(-Math.PI/2+i*Math.PI*2/5)*radius,y:cy+Math.sin(-Math.PI/2+i*Math.PI*2/5)*radius});
  for(let level=1;level<=4;level++){c.beginPath();for(let i=0;i<5;i++){const p=point(i,r*level/4);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.closePath();c.strokeStyle='#b7bac1';c.lineWidth=1;c.stroke();}
  c.beginPath();values.forEach((v,i)=>{const p=point(i,r*Math.max(.025,v));i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.closePath();c.fillStyle='#8fa6bd88';c.fill();c.strokeStyle='#56799b';c.lineWidth=3;c.stroke();
  labels.forEach((label,i)=>{const p=point(i,r+35);text(label,p.x,p.y+8,23,'#505f79','center');});
  const fields=[`GPA ${s.kpi.gpa.toFixed(2)}`,`科研 ${s.kpi.research}`,`竞赛 ${s.kpi.competition}`,`志愿 ${s.kpi.volunteer}h`,`实践 ${s.kpi.practice}`];text(fields.join('  ·  '),540,1172,22,'#27314b','center');
  c.save();c.translate(866,1095);c.rotate(-.19);c.strokeStyle='#b8514c';c.lineWidth=5;c.strokeRect(-105,-40,210,80);text(title.stamp,0,13,36,'#b8514c','center');c.restore();
  const shareUrl=location.protocol==='file:'?'https://sky-high-kpi-merged-20261127.nevilleatkinson25.chatgpt.site':location.origin+location.pathname;
  const qr=await QRCode.toDataURL(shareUrl,{width:150,margin:1,color:{dark:'#28344d',light:'#f6f0df'}});const qrImg=new Image();qrImg.src=qr;await qrImg.decode();c.drawImage(qrImg,82,1240,150,150);
  text('把大学，叠成天空的形状。',275,1291,31);text('扫描进入游戏 · 和你的天际线再见一面',275,1334,22,'#77767d');text(`SEED ${s.seed} · ${s.mode==='fixed'?'固定测试局':'自然挑战局'}`,275,1376,18,'#77767d');
  return canvas.toDataURL('image/png');
}
