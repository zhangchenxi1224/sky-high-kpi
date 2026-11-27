import {GameEngine} from '../game/engine';
import {RULES,seeded} from '../game/rules';
type Rect={x:number;y:number;w:number;h:number};
const mix=(a:string,b:string,t:number)=>{const ca=parseInt(a.slice(1),16),cb=parseInt(b.slice(1),16);return `rgb(${[16,8,0].map(s=>Math.round(((ca>>s)&255)*(1-t)+((cb>>s)&255)*t)).join(',')})`;};
export class Renderer {
  ctx:CanvasRenderingContext2D;sheet=new Image();sprites:HTMLCanvasElement[]=[];width=960;height=720;scale=1;effects=true;night=false;
  sky:HTMLCanvasElement|null=null;skyKey='';
  private reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  detailedSway=true;
  constructor(public canvas:HTMLCanvasElement){this.ctx=canvas.getContext('2d')!;this.sheet.onload=()=>this.prepareSprites();this.sheet.src=(window as unknown as {__ROOMS__?:string}).__ROOMS__??`${import.meta.env.BASE_URL}assets/rooms.webp`;}
  prepareSprites(){
    const s=document.createElement('canvas');s.width=this.sheet.width;s.height=this.sheet.height;const c=s.getContext('2d')!;c.drawImage(this.sheet,0,0);const pixels=c.getImageData(0,0,s.width,s.height).data;
    for(let i=0;i<12;i++){
      const cell={x:Math.floor(i%4*s.width/4),y:Math.floor(Math.floor(i/4)*s.height/3),w:Math.floor(s.width/4),h:Math.floor(s.height/3)};
      let x0=cell.x+cell.w,y0=cell.y+cell.h,x1=cell.x,y1=cell.y;
      for(let y=cell.y;y<cell.y+cell.h;y++)for(let x=cell.x;x<cell.x+cell.w;x++){if(pixels[(y*s.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
      const out=document.createElement('canvas');out.width=176;out.height=176;const oc=out.getContext('2d')!;oc.imageSmoothingEnabled=false;oc.drawImage(this.sheet,x0,y0,x1-x0+1,y1-y0+1,0,0,176,176);this.sprites.push(out);
    }
  }
  resize(w:number,h:number,e:GameEngine){this.scale=w/h<.85?Math.min(w/430,h/760):h/720;this.width=w/this.scale;this.height=h/this.scale;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);this.ctx.setTransform(this.scale*d,0,0,this.scale*d,0,0);e.setViewport(this.width,this.height);this.skyKey='';}
  rect(r:Rect,color:string){this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h));}
  render(e:GameEngine){
    const c=this.ctx,w=this.width,h=this.height;this.drawSky(e);c.save();
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
      this.rope(w/2,-48,w/2,132);this.room(0,w/2,156);this.label('高数',w/2+58,197,'#fff1cf');
    }else{
      const craneCenter=center+roofSway;
      if(e.phase==='SWINGING'){this.rope(craneCenter+e.anchorX,e.hookPivotY,craneCenter+e.hookX,e.hookY);}
      else if(!e.finished){const hx=center+e.anchorX+Math.sin(e.phaseAngle)*10;this.rope(center+e.anchorX,-48,hx,105);}
      if(e.current){const x=craneCenter+e.currentX,y=e.currentY+ground;
        c.save();c.translate(x,y+44);if(e.phase==='GAME_OVER')c.rotate(e.rotation);this.room(e.current.sprite,0,-44);c.restore();
        if(e.phase==='SWINGING'){
          this.label(e.current.name,x+58,y+37,'#fff4da');
          if(e.coffeeRemaining>0){
            const seconds=(Math.ceil(e.coffeeRemaining*10)/10).toFixed(1);
            this.label(`☕ 减速 45% · ${seconds}s`,x,y+108,'#c6efed',true);
          }
        }
      }
    }
    const age=e.time-e.lastLandTime;
    if(age<1.2&&e.floor>0){const x=center+roofSway+e.topX,y=e.topY+ground-19-age*12;
      if(e.verdict==='PERFECT'){
        if(this.effects){c.globalAlpha=Math.max(0,1-age/1);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=45+age*65;c.fillStyle=i%2?'#fff9dc':'#ffe28a';c.fillRect(x+Math.cos(a)*r-2,y+58+Math.sin(a)*r-2,4,4);}c.globalAlpha=1;}
        c.font='bold 23px "Courier New",monospace';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#24314b';c.strokeText('PERFECT',x,y-23);c.fillStyle='#ffdf8b';c.fillText('PERFECT',x,y-23);
      }
      this.label(e.rewardLabel,x,y-3,'#fff0ca',true);
      const feedback=this.detailedSway?e.detailedMotion.feedback:e.landingFeedback;
      if(feedback&&(!this.detailedSway||age<.8))this.label(feedback,x,y+24,e.verdict==='PERFECT'?'#b8ead4':'#ffbf9b',true);
    }
    c.restore();
    if(this.effects&&e.phase==='SWINGING'&&e.ddl<=2){const g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,'#ef434300');g.addColorStop(1,`rgba(220,48,67,${.1+Math.sin(e.time*15)**2*.22})`);c.fillStyle=g;c.fillRect(0,0,w,h);}
  }
  room(sprite:number,x:number,y:number,sy=1){const c=this.ctx;c.imageSmoothingEnabled=false;const image=this.sprites[sprite];if(image)c.drawImage(image,Math.round(x-44),Math.round(y+88*(1-sy)),88,88*sy);else{c.fillStyle='#e8c28f';c.fillRect(x-44,y,88,88);c.fillStyle='#30445f';c.fillRect(x-34,y+18,28,52);c.fillRect(x+6,y+18,28,52);}}
  rope(px:number,py:number,x:number,y:number){const c=this.ctx;c.strokeStyle='#233047';c.lineWidth=2;c.beginPath();c.moveTo(Math.round(px),py);c.lineTo(Math.round(x),Math.round(y));c.stroke();c.fillStyle='#e2c89e';c.fillRect(x-2,y-3,4,7);c.strokeRect(x-2,y-3,4,7);c.beginPath();c.moveTo(x,y+7);c.lineTo(x-31,y+28);c.moveTo(x,y+7);c.lineTo(x+31,y+28);c.stroke();}
  label(text:string,x:number,y:number,color:string,center=false){const c=this.ctx;c.font='bold 14px "Microsoft YaHei",sans-serif';const tw=c.measureText(text).width;let left=center?x-tw/2-6:x;const visibleWidth=this.canvas.width/c.getTransform().a;left=Math.max(7,Math.min(visibleWidth-tw-19,left));c.fillStyle=color;c.fillRect(left,y-15,tw+12,23);c.fillStyle='#263049';c.textAlign='left';c.fillText(text,left+6,y+2);}
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
    const sx=Math.max(46,center-235);c.fillStyle='#24344f';c.fillRect(sx-26,y-83,52,57);c.fillStyle='#f5c665';c.fillRect(sx-23,y-80,46,51);c.fillStyle='#263249';c.font='bold 17px "Microsoft YaHei"';c.textAlign='center';c.fillText('校园',sx,y-60);c.fillText('施工',sx,y-39);
  }
}
