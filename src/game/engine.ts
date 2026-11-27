import {RULES, catalog, difficulty, drawBlock, emptyKpi, FIXED_SEQUENCE, judge, reward, score, seeded, type Block, type Kind, type KPI} from './rules';
import {hookPosition} from './hook';
import {TowerMotion} from './tower-motion';
import memes from '../config/memePack.json';
const visibleFloors=5.75;
const hookToBrick=24;
export type Phase='READY'|'SWINGING'|'DROPPING'|'RESOLVE'|'CAMERA_SHIFT'|'GAME_OVER';
export type Placed={block:Block;x:number;y:number;perfect:boolean};
export type GameEvent={type:'start'|'spawn'|'drop'|'land'|'miss'|'over'|'skip'|'warning'|'message';text?:string;perfect?:boolean;combo?:number};
export type Snapshot={phase:Phase;floor:number;kpi:KPI;score:number;ddl:number;current:Block|null;combo:number;maxCombo:number;perfects:number;accepted:number;skipped:number;maxSkipStreak:number;researchImperfect:number;counts:Partial<Record<Kind,number>>;paused:boolean;finished:boolean;forced:boolean;rollback:number;buffs:string[];message:string;messageUntil:number;rewardLabel:string;verdict:string;seed:number;mode:'normal'|'fixed';elapsed:number};
export class GameEngine {
  phase:Phase='READY';floor=0;kpi=emptyKpi();combo=0;maxCombo=0;perfects=0;accepted=0;skipped=0;skipStreak=0;maxSkipStreak=0;researchImperfect=0;counts:Partial<Record<Kind,number>>={};
  tower:Placed[]=[];current:Block|null=null;currentX=0;currentY=0;velocity=0;rotation=0;phaseAngle=-.65;hookAngle=0;hookX=0;hookY=0;anchorX=0;
  cameraY=0;cameraX=0;cameraFromY=0;cameraFromX=0;cameraTime=0;groundScreen=620;hangingScreen=170;viewHeight=720;ropeLength=190;
  private landscape=false;
  time=0;phaseTime=0;ddl=8;paused=false;finished=false;forced=false;warningPlayed=false;rollback=0;
  instability=0;sway=0;private swayVelocity=0;landingFeedback='';
  readonly detailedMotion=new TowerMotion();
  speedNext=1;angleNext=1;speedMultiplier=1;angleMultiplier=1;practiceLeft=0;notesLeft=0;coffeeUntil=0;
  message='';messageUntil=0;rewardLabel='';verdict='';lastLandTime=-5;drawHistory:Kind[]=[];drawIndex=0;
  seed:number;mode:'normal'|'fixed';random:()=>number;listeners=new Set<(event:GameEvent)=>void>();private accumulator=0;private extremeAnnounced=false;
  constructor(seed=Date.now()>>>0,mode:'normal'|'fixed'='normal'){this.seed=seed;this.mode=mode;this.random=seeded(seed);}
  on(fn:(event:GameEvent)=>void){this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};}
  emit(event:GameEvent){this.listeners.forEach(fn=>fn(event));}
  say(text:string){this.message=text;this.messageUntil=this.time+3.2;this.emit({type:'message',text});}
  choose(pool:string[]){return pool[Math.floor(this.random()*pool.length)];}
  setViewport(width:number,height:number){
    this.landscape=width>height;
    this.viewHeight=height;this.groundScreen=height-100;this.hangingScreen=Math.max(126,height*.23);this.ropeLength=this.hangingScreen+24;
    this.cameraY=this.cameraTarget(this.floor);
    if(this.phase==='CAMERA_SHIFT'){
      this.cameraFromY=this.cameraTarget(this.floor-1);
      this.cameraY+=(this.cameraFromY-this.cameraY)*(1-Math.min(1,this.cameraTime/.43))**3;
    }
    if(this.phase==='SWINGING')this.updateHook();
  }
  private get finalZoom(){return this.landscape?.78:.82;}
  private get hangingGap(){return (this.landscape?2.5:1.6)*RULES.height;}
  get viewZoom(){
    const transition=this.phase==='CAMERA_SHIFT'?1-Math.min(1,this.cameraTime/.43):0;
    const progress=Math.min(1,Math.max(0,(this.floor-transition-2)/4));
    return 1-(1-this.finalZoom)*progress*progress*(3-2*progress);
  }
  private cameraTarget(floor:number){
    if(floor<=2)return 0;
    // In landscape, lower the roof as well as lifting the rig so the swinging room stays on screen.
    const minRoof=this.landscape?this.hangingScreen+.65*RULES.height+this.hangingGap:this.hangingScreen+RULES.height+75;
    const roof=Math.max(minRoof,this.viewHeight/this.finalZoom-visibleFloors*RULES.height);
    return Math.max(0,floor*RULES.height+roof-this.groundScreen);
  }
  get topX(){return this.tower.at(-1)?.x??0;}
  get topY(){return -this.floor*RULES.height;}
  get hookPivotY(){
    const roof=this.topY+this.groundScreen+this.cameraY;
    // The rope reaches its lowest point when vertical; lift the entire rig if needed.
    const lowestPivot=roof-this.hangingGap-RULES.height-hookToBrick-this.ropeLength;
    return Math.min(-48,lowestPivot);
  }
  get coffeeRemaining(){return Math.max(0,this.coffeeUntil-this.time);}
  get params(){const d=difficulty(this.floor+1,this.rollback);return {...d,omega:d.omega*this.speedMultiplier*(this.coffeeRemaining>0?.55:1),angle:d.angle*this.angleMultiplier};}
  start(){if(this.phase!=='READY')return false;this.emit({type:'start'});this.spawn();return true;}
  spawn(){
    this.speedMultiplier=this.speedNext;this.speedNext=1;
    this.angleMultiplier=this.angleNext*(this.notesLeft>0?.7:1);this.angleNext=1;if(this.notesLeft>0)this.notesLeft--;
    const high=this.params.omega>=RULES.highPressureOmega;
    const id=FIXED_SEQUENCE[this.drawIndex%FIXED_SEQUENCE.length];
    this.current=this.mode==='fixed'?{...catalog.find(b=>b.id===id)!}:drawBlock(this.floor+1,this.random,high,this.drawHistory.slice(-4).includes('temptation'));
    this.drawIndex++;this.drawHistory.push(this.current.kind);if(this.drawHistory.length>4)this.drawHistory.shift();
    this.phase='SWINGING';this.phaseTime=0;this.ddl=RULES.ddl;this.forced=false;this.warningPlayed=false;this.velocity=0;this.rotation=0;this.anchorX=this.topX;
    this.phaseAngle=(this.drawIndex%2?-.65:.65);this.updateHook();this.emit({type:'spawn'});
    if(this.current.kind==='temptation')this.say('GPA −0.15 · 摆速 / 摆幅回退 6 层');
    else if(this.params.omega>RULES.omegaMax*.8&&!this.extremeAnnounced){this.say(this.choose(memes.danmakuBank.extremeSpeed));this.extremeAnnounced=true;}
  }
  updateHook(){const p=hookPosition(this.phaseAngle,this.params.angle,this.ropeLength);this.hookAngle=p.angle;this.hookX=this.anchorX+p.x;this.hookY=this.hookPivotY+p.y;this.currentX=this.hookX;this.currentY=this.hookY+hookToBrick-this.groundScreen-this.cameraY;}
  drop(forced=false){if(this.phase!=='SWINGING'||this.paused)return false;this.phase='DROPPING';this.phaseTime=0;this.velocity=0;this.forced=forced;if(forced)this.say('DDL 到了！死线强制提交');this.emit({type:'drop'});return true;}
  skipCurrentBlock(){if(this.phase!=='SWINGING'||this.paused||this.current?.kind!=='temptation')return false;const skin=memes.temptationSkins.find(s=>s.id===this.current!.id)!;this.skipped++;this.skipStreak++;this.maxSkipStreak=Math.max(this.maxSkipStreak,this.skipStreak);this.emit({type:'skip'});this.spawn();this.say(skin.skipDanmaku);return true;}
  togglePause(){if(this.phase==='READY'||this.finished)return;this.paused=!this.paused;}
  update(dt:number,autoDrop?:(game:GameEngine)=>boolean){
    if(this.paused||this.phase==='READY'||this.finished)return;
    this.accumulator+=Math.max(0,dt);
    while(this.accumulator>=1/120){
      this.step(1/120);
      if(autoDrop&&this.phase==='SWINGING'&&autoDrop(this))this.drop();
      this.accumulator-=1/120;
      if(this.finished)break;
    }
  }
  private step(dt:number){
    this.time+=dt;this.phaseTime+=dt;
    // Recent placement errors set the sustained sway; each impact adds a directional kick.
    if(RULES.towerSway){
      this.detailedMotion.step(dt);
      const target=9*this.instability*Math.sin(this.time*3.2);
      this.swayVelocity+=((target-this.sway)*64-this.swayVelocity*9)*dt;
      this.sway+=this.swayVelocity*dt;
    }
    if(this.phase==='SWINGING'){
      this.phaseAngle+=this.params.omega*dt;this.updateHook();this.ddl=Math.max(0,RULES.ddl-this.phaseTime);
      if(this.ddl<=2&&!this.warningPlayed){this.warningPlayed=true;this.emit({type:'warning'});}
      if(this.ddl<=1e-8)this.drop(true);
    }else if(this.phase==='DROPPING'){
      this.currentY+=this.velocity*dt+.5*RULES.gravity*dt*dt;this.velocity+=RULES.gravity*dt;
      if(this.currentY+RULES.height>=this.topY){this.phase='RESOLVE';this.resolve();}
    }else if(this.phase==='CAMERA_SHIFT'){
      this.cameraTime+=dt;const p=Math.min(1,this.cameraTime/.43),ease=1-(1-p)**3;
      this.cameraY=this.cameraFromY+(this.cameraTarget(this.floor)-this.cameraFromY)*ease;
      const targetX=this.floor<=2?0:this.topX;
      this.cameraX=this.cameraFromX+(targetX-this.cameraFromX)*ease;
      if(p>=1)this.spawn();
    }else if(this.phase==='GAME_OVER'){
      this.velocity+=RULES.gravity*dt;this.currentY+=this.velocity*dt;this.currentX+=Math.sign(this.currentX-this.topX||1)*80*dt;this.rotation+=Math.sign(this.currentX-this.topX||1)*dt*2.8;
      if(this.phaseTime>.85){this.finished=true;this.emit({type:'over'});}
    }
  }
  private resolve(){
    if(!this.current)return;const block=this.current,delta=this.currentX-this.topX;const verdict=judge(delta,block.kind);this.verdict=verdict;
    if(verdict==='MISS'){
      this.phase='GAME_OVER';this.phaseTime=0;this.say(this.forced?'死线提交，落点未通过。爱你老己，下把再来':this.choose(memes.danmakuBank.gameOver));this.emit({type:'miss'});return;
    }
    const perfect=verdict==='PERFECT';this.combo=perfect?this.combo+(block.kind==='study'?2:1):0;this.maxCombo=Math.max(this.maxCombo,this.combo);if(perfect)this.perfects++;
    const previous=this.instability;
    this.detailedMotion.land(delta,perfect);
    const error=Math.min(1,Math.max(0,(Math.abs(delta)/RULES.width-.08)/.42));
    this.instability=perfect?previous*.55:Math.min(1,previous*.75+error*.44);
    this.swayVelocity+=Math.sign(delta)*error*60;
    this.landingFeedback='';
    if(!perfect&&error>=.3){
      const side=delta<0?'偏左':'偏右';
      this.landingFeedback=side+(this.instability>=.55?' · 越晃越厉害':' · 楼晃了');
    }else if(perfect&&previous>=.28){
      this.landingFeedback='对齐了 · 楼在回稳';
    }
    // Only 2 world pixels of correction; the remaining offset stays real.
    if(perfect)this.currentX-=Math.sign(delta)*Math.min(2,Math.abs(delta));
    const r=reward(this.kpi,block,perfect,this.combo,this.practiceLeft>0);this.kpi=r.kpi;this.rewardLabel=r.label;
    if(this.practiceLeft>0)this.practiceLeft--;
    switch(block.kind){
      case 'research':this.speedNext=1.12;if(!perfect)this.researchImperfect++;this.say('导师加活！下一块摆速 +12%');break;
      case 'competition':if(Math.abs(delta)>RULES.width*.25){this.angleNext=1.15;this.say('熬夜赶 PPT！下一块摆幅 +15%');}break;
      case 'practice':this.practiceLeft=2;this.say('实践加成 · 后两块正向综测 +25%');break;
      case 'coffee':this.coffeeUntil=this.time+5;break;
      case 'notes':this.notesLeft=3;this.say('这本秘籍真有用！后三投摆幅收窄 30%');break;
      case 'temptation':this.accepted++;this.skipStreak=0;this.rollback+=6;this.say(memes.temptationSkins.find(s=>s.id===block.id)!.acceptDanmaku+' · 难度回退 6 层');break;
    }
    this.floor++;this.counts[block.kind]=(this.counts[block.kind]??0)+1;
    this.currentY=-this.floor*RULES.height;this.tower.push({block,x:this.currentX,y:this.currentY,perfect});this.current=null;
    this.lastLandTime=this.time;this.cameraFromY=this.cameraY;this.cameraFromX=this.cameraX;this.cameraTime=0;this.phase='CAMERA_SHIFT';this.phaseTime=0;
    if(this.floor===25||this.floor===35)this.say(this.choose(memes.danmakuBank.highAltitude));
    else if(perfect&&this.combo>=3&&this.time>=this.messageUntil)this.say(this.choose(memes.danmakuBank.perfectStreak3));
    else if(Math.abs(delta)>RULES.width*.35&&this.time>=this.messageUntil)this.say(this.choose(memes.danmakuBank.narrowSuccess));
    this.emit({type:'land',text:r.label,perfect,combo:this.combo});
  }
  snapshot():Snapshot {
    const buffs:string[]=[];
    if(this.notesLeft>0||this.angleMultiplier<1)buffs.push('秘籍 · 摆幅 −30%');
    if(this.practiceLeft>0)buffs.push(`实践 +25% · 剩 ${this.practiceLeft} 块`);
    if(this.speedMultiplier>1)buffs.push('导师加活 +12%');
    if(this.angleMultiplier>1)buffs.push('PPT 手抖 +15%');
    return {phase:this.phase,floor:this.floor,kpi:{...this.kpi},score:score(this.floor,this.kpi),ddl:this.ddl,current:this.current,combo:this.combo,maxCombo:this.maxCombo,perfects:this.perfects,accepted:this.accepted,skipped:this.skipped,maxSkipStreak:this.maxSkipStreak,researchImperfect:this.researchImperfect,counts:{...this.counts},paused:this.paused,finished:this.finished,forced:this.forced,rollback:this.rollback,buffs,message:this.message,messageUntil:this.messageUntil,rewardLabel:this.rewardLabel,verdict:this.verdict,seed:this.seed,mode:this.mode,elapsed:this.time};
  }
}
