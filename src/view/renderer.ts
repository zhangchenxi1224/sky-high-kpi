import {GameEngine} from '../game/engine';
import {RULES,seeded} from '../game/rules';
import {assetUrl} from '../features/assets';
import {pixelFont} from '../features/pixel-font';
import {metricColors,snap,portraitLayout} from './layout';
type Rect={x:number;y:number;w:number;h:number};
const mix=(a:string,b:string,t:number)=>{const ca=parseInt(a.slice(1),16),cb=parseInt(b.slice(1),16);return `rgb(${[16,8,0].map(s=>Math.round(((ca>>s)&255)*(1-t)+((cb>>s)&255)*t)).join(',')})`;};
export class Renderer {
  ctx:CanvasRenderingContext2D;sheet=new Image();fitnessSheet=new Image();craneSheet=new Image();sprites:HTMLCanvasElement[]=[];width=960;height=720;scale=1;effects=true;night=false;
  sky:HTMLCanvasElement|null=null;skyKey='';
  private portraitTop=0;private viewportTop=0;
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  detailedSway=true;
  constructor(public canvas:HTMLCanvasElement){
    this.ctx=canvas.getContext('2d')!;
    this.sheet.onload=()=>this.prepareSprites();this.sheet.src=assetUrl('rooms.webp');
    this.fitnessSheet.onload=()=>{const out=document.createElement('canvas');out.width=176;out.height=176;const c=out.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(this.fitnessSheet,0,0,176,176);this.sprites[12]=out;};
    this.fitnessSheet.src=assetUrl('fitness.webp');
    this.craneSheet.src=assetUrl('crane.png');
  }
  get assetsReady(){return this.craneSheet.complete&&this.craneSheet.naturalWidth>0&&Array.from({length:13},(_,i)=>!!this.sprites[i]).every(Boolean);}
  prepareSprites(){
    const s=document.createElement('canvas');s.width=this.sheet.width;s.height=this.sheet.height;const c=s.getContext('2d')!;c.drawImage(this.sheet,0,0);const pixels=c.getImageData(0,0,s.width,s.height).data;
    for(let i=0;i<12;i++){
      const cell={x:Math.floor(i%4*s.width/4),y:Math.floor(Math.floor(i/4)*s.height/3),w:Math.floor(s.width/4),h:Math.floor(s.height/3)};
      let x0=cell.x+cell.w,y0=cell.y+cell.h,x1=cell.x,y1=cell.y;
      for(let y=cell.y;y<cell.y+cell.h;y++)for(let x=cell.x;x<cell.x+cell.w;x++){if(pixels[(y*s.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
      const out=document.createElement('canvas');out.width=176;out.height=176;const oc=out.getContext('2d')!;oc.imageSmoothingEnabled=false;oc.drawImage(this.sheet,x0,y0,x1-x0+1,y1-y0+1,0,0,176,176);this.sprites[i]=out;
    }
  }
  resize(w:number,h:number,e:GameEngine){
    this.scale=w/h<.85?Math.min(w/430,h/760):h/720;this.width=w/this.scale;this.height=h/this.scale;
    const safeTop=parseFloat(getComputedStyle(this.canvas).getPropertyValue('--safe-area-top'))||0;
    const layout=portraitLayout(w,h,safeTop);
    this.portraitTop=layout.top/this.scale;this.viewportTop=e.phase==='READY'?0:this.portraitTop;
    this.canvas.parentElement?.style.setProperty('--phone-buffs-top',`${layout.buffs}px`);
    const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);this.ctx.setTransform(this.scale*d,0,0,this.scale*d,0,0);
    e.setViewport(this.width,this.height-this.viewportTop);this.skyKey='';
  }
  rect(r:Rect,color:string){this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h));}
  render(e:GameEngine){
    const top=e.phase==='READY'?0:this.portraitTop;
    if(top!==this.viewportTop){this.viewportTop=top;e.setViewport(this.width,this.height-top);}
    const c=this.ctx,w=this.width,h=this.height-this.viewportTop;this.drawSky(e);this.drawDanmaku(e);c.save();
    if(this.viewportTop)c.translate(0,this.viewportTop);
    const comboAge=e.time-e.comboCue.at;
    const jolt=this.effects&&!this.reducedMotion.matches&&!e.comboCue.broken&&e.comboCue.value>=4&&comboAge<.24?(Math.floor(comboAge/.06)%2?2:-2)/this.scale:0;
    if(jolt)c.translate(jolt,0);
    let rope:[number,number,number,number]|null=null;
    const zoom=e.viewZoom;
    c.scale(zoom,zoom);
    const center=w/(2*zoom)-e.cameraX;
    const ground=e.groundScreen+e.cameraY;
    this.drawGround(center,ground,w/zoom,h/zoom);
    const motionEnabled=this.effects&&!this.reducedMotion.matches;
    // Adjacent floors share their edge displacement, and the base stays planted.
    const flexHeight=Math.min(6,e.floor)||1;
    const offsetAt=(level:number)=>{
      if(!motionEnabled)return 0;
      const depth=e.floor-level;
      if(this.detailedSway)return e.detailedMotion.jointOffset(depth,e.floor);
      return e.sway*Math.max(0,1-depth/flexHeight);
    };
    const roofSway=offsetAt(e.floor);
    for(const p of e.tower){
      const y=p.y+ground;
      if(y>h/zoom||y< -100)continue;
      const level=-p.y/RULES.height,top=offsetAt(level),bottom=offsetAt(level-1);
      let sy=1;
      c.save();
      c.translate(center+p.x+top,y);
      c.transform(1,0,(bottom-top)/RULES.height,1,0,0);
      if(level===e.floor&&this.effects){
        if(this.detailedSway&&motionEnabled){
          sy=e.detailedMotion.landingScaleY;
          const spread=1+(1-sy)*.35;
          c.transform(spread,e.detailedMotion.edgeSlope,0,1,0,0);
        }else if(!this.detailedSway){
          const age=e.time-e.lastLandTime;
          if(age<.3)sy=1-Math.sin(age/.3*Math.PI)*.055;
        }
      }
      this.room(p.block.sprite,0,0,sy);
      c.restore();
    }
    if(e.phase==='READY'){
      const pivot=w>h?w*.85:w*.73,ropeEnd=w>h?h*.19:h*.11;
      const drift=motionEnabled?Math.sin(performance.now()/1600)*14:0;
      this.rope(pivot,-48,pivot+drift,ropeEnd);this.room(0,pivot+drift,ropeEnd+24);
    }else{
      const craneCenter=center+roofSway;
      if(e.phase==='SWINGING'){rope=[craneCenter+e.anchorX,e.hookPivotY,craneCenter+e.hookX,e.hookY];this.rope(...rope);}
      else if(!e.finished){const hx=center+e.anchorX+Math.sin(e.phaseAngle)*10;rope=[center+e.anchorX,-48,hx,105];this.rope(...rope);}
      if(e.current){const x=craneCenter+e.currentX,y=e.currentY+ground;
        c.save();c.translate(x,y+44);if(e.phase==='GAME_OVER')c.rotate(e.rotation);this.room(e.current.sprite,0,-44);c.restore();
        if(e.phase==='SWINGING'){
          this.blockLabel(e.current.name,x,y,metricColors[e.current.kind],e.current.kind==='temptation');
        }
      }
    }
    const age=e.time-e.lastLandTime;
    if(age<1&&e.floor>0){const x=center+roofSway+e.topX,y=e.topY+ground-20;
      if(e.verdict==='PERFECT'){
        if(motionEnabled){c.globalAlpha=Math.max(0,1-age/1);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=45+age*65;c.fillStyle=i%2?'#fff9dc':'#ffe28a';c.fillRect(x+Math.cos(a)*r-2,y+58+Math.sin(a)*r-2,4,4);}c.globalAlpha=1;}
        this.pixelText('PERFECT',x,y-28,'#FFD43B',24);
      }
      const last=e.tower.at(-1)!,negative=last.block.kind==='temptation';
      const step=Math.min(7,Math.floor(age/.8*8)),travel=step*4;
      if(age<.8)this.pixelText(e.rewardLabel,x+(negative&&step%2?2:0),y+(negative?travel*.5:-travel),metricColors[last.block.kind],16);
      const feedback=this.detailedSway?e.detailedMotion.feedback:e.landingFeedback;
      if(feedback&&(!this.detailedSway||age<.8))this.pixelText(feedback,x,y+24,e.verdict==='PERFECT'?'#92E8AF':'#FFA94D',12);
    }
    c.restore();
    if(this.effects&&e.phase==='SWINGING'&&e.ddl<=2){const g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,'#ef434300');g.addColorStop(1,`rgba(220,48,67,${.1+Math.sin(e.time*15)**2*.22})`);c.fillStyle=g;c.fillRect(0,0,w,h);}
  }
  drawDanmaku(e:GameEngine){
    if(e.phase==='READY'||e.finished)return;
    const c=this.ctx,size=(this.canvas.clientWidth<=600||this.canvas.clientHeight<=540?16:20)/this.scale;
    const draw=(text:string,age:number,top:number,color:string)=>{
      if(age<0||age>=3.2)return;
      c.save();c.font=pixelFont(size);c.textAlign='left';c.textBaseline='alphabetic';
      const width=c.measureText(text).width;
      const x=this.reducedMotion.matches?(this.width-width)/2:this.width-(this.width+width)*age/3.2;
      const y=this.height*top+size;c.lineJoin='miter';c.lineWidth=4/this.scale;c.strokeStyle='#151d33';
      c.strokeText(text,x,y+2/this.scale);c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();
    };
    if(e.message)draw(e.message,e.time-(e.messageUntil-3.2),.34,'#fff9db');
    if(e.combo>=7)draw(`夯爆了！×${e.combo}`,e.time-e.feverAt,this.canvas.clientHeight<=540?.22:.25,'#ffe066');
  }
  room(sprite:number,x:number,y:number,sy=1){const c=this.ctx;c.imageSmoothingEnabled=false;const image=this.sprites[sprite];if(image)c.drawImage(image,Math.round(x-44),Math.round(y+88*(1-sy)),88,88*sy);else{c.fillStyle='#e8c28f';c.fillRect(x-44,y,88,88);c.fillStyle='#30445f';c.fillRect(x-34,y+18,28,52);c.fillRect(x+6,y+18,28,52);}}
  rope(px:number,_py:number,x:number,y:number){
    const c=this.ctx,t=c.getTransform(),dpr=Math.min(devicePixelRatio||1,2),scale=t.a/dpr;
    const anchor=this.viewportTop?this.canvas.clientWidth/2:(t.a*px+t.e)/dpr,hx=(t.a*x+t.e)/dpr,hy=(t.d*y+t.f)/dpr;
    const ready=this.craneSheet.complete&&this.craneSheet.naturalWidth>0;
    // The supplied truss replaces the rope and rotates toward the existing hook endpoint.
    const tipY=hy-24*scale,dx=hx-anchor,length=Math.hypot(dx,tipY);
    const thickness=Math.max(12,Math.min(28,length*245/1800));
    c.save();c.setTransform(dpr,0,0,dpr,0,0);c.imageSmoothingEnabled=false;
    c.translate(anchor,0);c.rotate(Math.atan2(tipY,dx));
    if(ready)c.drawImage(this.craneSheet,107,44,1960,245,-75/1800*length,-122/245*thickness,1960/1800*length,thickness);
    else{c.fillStyle='#ffd43b';c.fillRect(0,-3,length,6);}
    c.restore();
    c.strokeStyle='#233047';c.lineWidth=2;c.beginPath();
    c.moveTo(x,y+9);c.lineTo(x-31,y+28);c.moveTo(x,y+9);c.lineTo(x+31,y+28);c.stroke();
    if(ready)c.drawImage(this.craneSheet,1000,396,174,296,Math.round(x-10),Math.round(y-24),20,34);
    else{c.fillStyle='#ffd43b';c.fillRect(x-8,y-22,16,20);}
  }
  pixelText(text:string,x:number,y:number,color:string,size=16){
    const c=this.ctx,t=c.getTransform(),dpr=Math.min(devicePixelRatio||1,2),visibleWidth=this.canvas.width/dpr;
    x=(t.a*x+t.e)/dpr;y=(t.d*y+t.f)/dpr;c.save();c.setTransform(dpr,0,0,dpr,0,0);
    c.font=pixelFont(size);const width=c.measureText(text).width;
    if(width>visibleWidth-24){size=Math.max(10,Math.floor(size*(visibleWidth-24)/width));c.font=pixelFont(size);}
    const half=c.measureText(text).width/2;x=snap(Math.max(half+8,Math.min(visibleWidth-half-8,x)));y=snap(y);
    c.textAlign='center';c.lineJoin='miter';c.lineWidth=4;c.strokeStyle='#10172C';c.strokeText(text,x,y+2);c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();
  }
  blockLabel(text:string,x:number,y:number,color:string,temptation:boolean){
    const c=this.ctx,t=c.getTransform(),dpr=Math.min(devicePixelRatio||1,2),roomScale=t.a/dpr,fontSize=12;
    x=(t.a*x+t.e)/dpr;y=(t.d*y+t.f)/dpr;c.save();c.setTransform(dpr,0,0,dpr,0,0);c.font=pixelFont(fontSize);c.textAlign='left';
    const width=snap(c.measureText(text).width)+20+(temptation?12:0),height=24,screenWidth=this.canvas.width/dpr;
    let left=snap(x+44*roomScale+10),top=snap(y+26*roomScale),arrow:'left'|'right'='left';
    if(left+width>screenWidth-8){left=snap(Math.max(8,x-44*roomScale-10-width));arrow='right';}
    const fill=temptation?'#38132A':'#151D33',edge=temptation?'#FF59B4':color;
    const box=(xx:number,yy:number,ww:number,hh:number,ink:string)=>{c.fillStyle=ink;c.fillRect(xx+4,yy,ww-8,hh);c.fillRect(xx,yy+4,ww,hh-8);c.fillRect(xx+2,yy+2,ww-4,hh-4);};
    box(left+2,top+2,width,height,'#000000');box(left,top,width,height,edge);box(left+2,top+2,width-4,height-4,fill);
    if(arrow==='left'){
      for(let i=0;i<3;i++){c.fillStyle=edge;c.fillRect(left-6+i*2,top+12-i*2,2,4+i*4);}c.fillStyle=fill;c.fillRect(left-2,top+10,4,8);
    }else{
      for(let i=0;i<3;i++){c.fillStyle=edge;c.fillRect(left+width+i*2,top+8+i*2,2,12-i*4);}c.fillStyle=fill;c.fillRect(left+width-2,top+10,4,8);
    }
    let tx=left+10;
    if(temptation){c.fillStyle='#FFD43B';c.fillRect(tx+2,top+8,4,4);c.fillRect(tx+2,top+14,4,2);tx+=12;}
    c.fillStyle='#FFF9DB';c.fillText(text,tx,top+18);c.restore();
  }
  drawSky(e:GameEngine){
    const w=this.width,h=this.height,c=this.ctx,alt=Math.min(1,e.floor/55),night=this.night?1:Math.max(0,(e.floor-22)/32);const k=`${Math.round(w)}-${Math.round(h)}-${Math.floor(e.cameraY/22)}-${this.night}`;
    if(k!==this.skyKey){this.skyKey=k;const bg=document.createElement('canvas');bg.width=Math.ceil(w/2);bg.height=Math.ceil(h/2);const b=bg.getContext('2d')!;b.scale(.5,.5);
      const grad=b.createLinearGradient(0,0,0,h);grad.addColorStop(0,mix('#64a2fa','#111c47',Math.min(1,night)));grad.addColorStop(.65,mix('#a3baff','#3e3d78',Math.min(1,night)));grad.addColorStop(1,mix('#f3b6d4','#b47c9e',Math.min(1,night)));b.fillStyle=grad;b.fillRect(0,0,w,h);
      const horizon=h*(.58+Math.min(.22,e.cameraY/2000));const glow=b.createRadialGradient(w/2,horizon,10,w/2,horizon,w*.37);glow.addColorStop(0,night>.6?'#c898bc30':'#ffd0c590');glow.addColorStop(1,'#f7a4d000');b.fillStyle=glow;b.fillRect(0,0,w,h);
      b.fillStyle=night>.7?'#f3e9c7':'#fffbb8';b.beginPath();b.arc(w/2,horizon,22,Math.PI,0);b.fill();b.fillRect(w/2-22,horizon,44,5);
      const rng=seeded(87435);if(night>.1){b.globalAlpha=Math.min(1,night);for(let i=0;i<100;i++){b.fillStyle=i%4?'#cbd8ff':'#ffddb7';b.fillRect(Math.floor(rng()*w/2)*2,Math.floor(rng()*h*.65/2)*2,2,2);}b.globalAlpha=1;}
      for(let i=0;i<14;i++){const cx=rng()*w,cy=50+rng()*(h*.7);this.cloud(b,cx,cy,30+rng()*70,night);}
      for(let layer=0;layer<3;layer++){
        const rnd=seeded(73+layer*47);let x=-30;const baseline=h*(.88+layer*.045),opacity=(1-alt*.7);
        b.globalAlpha=opacity;
        while(x<w){const bw=24+rnd()*70;const centerDistance=Math.abs(x+bw/2-w/2)/(w/2);const bh=(20+rnd()*75+centerDistance*270)*(1-alt*.45);const y=baseline-bh;
          b.fillStyle=['#8da9d5','#819dca','#708bb6'][layer];b.fillRect(x,y,bw,bh+120);
          if(rnd()>.4)b.fillRect(x+bw*.2,y-15,bw*.55,18);
          b.fillStyle=['#a7bcdf','#93add1','#859fc6'][layer];b.fillRect(x+4,y+9,bw*.55,bh-9);
          for(let wy=y+19;wy<baseline;wy+=22)for(let wx=x+9;wx<x+bw-6;wx+=17){b.fillStyle=rnd()>.91?'#f3d7a4':layer===2?'#728eb9':'#88a4cf';b.fillRect(wx,wy,6,9);}
          x+=bw-2;
        }
      }
      b.globalAlpha=Math.max(.2,1-alt*.8);this.waterTower(b,w*.12,h*.77);this.clockTower(b,w*.84,h*.75);b.globalAlpha=1;this.sky=bg;
    }
    if(this.sky){c.imageSmoothingEnabled=false;c.drawImage(this.sky,0,0,w,h);}
  }
  cloud(c:CanvasRenderingContext2D,x:number,y:number,width:number,night:number){c.fillStyle=mix('#dac7f3','#666492',Math.min(1,night));c.fillRect(x,y,width,4);c.fillRect(x+width*.16,y-5,width*.7,6);c.fillRect(x+width*.3,y-11,width*.3,8);c.fillStyle=mix('#efceeb','#8173a0',Math.min(1,night));c.fillRect(x+width*.21,y-3,width*.22,4);c.fillRect(x+width*.45,y-14,width*.12,8);c.fillRect(x+width*.67,y+2,width*.2,3);}
  waterTower(c:CanvasRenderingContext2D,x:number,y:number){c.strokeStyle='#7184a9';c.lineWidth=2;c.fillStyle='#afb9d3';c.fillRect(x-17,y,34,32);c.strokeRect(x-17,y,34,32);c.beginPath();c.moveTo(x-20,y);c.lineTo(x,y-13);c.lineTo(x+20,y);c.closePath();c.fill();c.stroke();for(let i=-1;i<=1;i++)c.strokeRect(x+i*10-2,y,4,32);c.beginPath();c.moveTo(x-13,y+32);c.lineTo(x-18,y+57);c.lineTo(x+13,y+32);c.lineTo(x+18,y+57);c.lineTo(x-13,y+32);c.stroke();}
  clockTower(c:CanvasRenderingContext2D,x:number,y:number){c.fillStyle='#a6b7d4';c.fillRect(x-22,y,44,130);c.strokeStyle='#7184ac';c.lineWidth=2;c.strokeRect(x-22,y,44,34);c.fillStyle='#91b3ba';c.beginPath();c.moveTo(x-26,y);c.lineTo(x,y-20);c.lineTo(x+26,y);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(x,y-20);c.lineTo(x,y-31);c.stroke();c.fillStyle='#f0e6cd';c.beginPath();c.arc(x,y+17,10,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(x,y+10);c.lineTo(x,y+17);c.lineTo(x+5,y+20);c.stroke();c.fillStyle='#829cc2';for(let i=-1;i<=1;i++)c.fillRect(x+i*12-3,y+40,6,85);}
  drawGround(center:number,y:number,w:number,h:number){
    if(y>h+160)return;const c=this.ctx;
    c.fillStyle='#a6a1b7';c.fillRect(0,y,w,h-y+200);c.fillStyle='#9695ab';for(let row=0;row<15;row++){for(let j=0;j<w/50;j++){c.fillRect(j*50+row%2*25,y+row*12+4,36,2);}}
    c.fillStyle='#4c5c7c';c.fillRect(0,y-10,w,10);c.fillStyle='#e6d6b9';c.fillRect(0,y-12,w,3);
    // Chain-link fence, pixel posts and campus construction stripes.
    c.save();c.beginPath();c.rect(0,y-103,w,85);c.clip();c.strokeStyle='#8291ae';c.lineWidth=1;for(let x=-100;x<w+100;x+=16){c.beginPath();c.moveTo(x,y-104);c.lineTo(x+90,y-18);c.moveTo(x+90,y-104);c.lineTo(x,y-18);c.stroke();}c.restore();
    for(let x=24;x<w;x+=145){c.fillStyle='#465778';c.fillRect(x-4,y-108,10,101);c.fillStyle='#bdc5d3';c.fillRect(x-3,y-108,5,99);c.fillStyle='#e1ddce';c.fillRect(x-6,y-108,13,5);c.fillRect(x-7,y-83,16,4);}
    c.fillStyle='#aebbcf';c.fillRect(0,y-102,w,4);c.fillStyle='#46516c';c.fillRect(0,y-22,w,13);c.fillStyle='#edbc57';for(let x=0;x<w;x+=30){c.beginPath();c.moveTo(x,y-22);c.lineTo(x+16,y-22);c.lineTo(x+4,y-9);c.lineTo(x-12,y-9);c.fill();}
    c.fillStyle='#2b344c';c.fillRect(center-65,y-8,130,14);c.fillStyle='#947e77';c.fillRect(center-61,y-7,122,9);c.fillStyle='#dfc69e';c.fillRect(center-60,y-8,120,3);
    for(const cx of [Math.max(45,center-190),Math.min(w-45,center+190)]){c.fillStyle='#313e5a';c.fillRect(cx-18,y-1,36,6);c.fillStyle='#ef9e4f';c.beginPath();c.moveTo(cx-12,y-1);c.lineTo(cx-4,y-53);c.lineTo(cx+4,y-53);c.lineTo(cx+12,y-1);c.fill();c.fillStyle='#fff0d4';c.fillRect(cx-5,y-38,10,7);c.fillRect(cx-8,y-19,16,8);}
    const sx=Math.max(46,center-235);c.fillStyle='#24344f';c.fillRect(sx-26,y-83,52,57);c.fillStyle='#f5c665';c.fillRect(sx-23,y-80,46,51);c.fillStyle='#263249';c.font=pixelFont(18);c.textAlign='center';c.fillText('校园',sx,y-60);c.fillText('施工',sx,y-39);
  }
}
