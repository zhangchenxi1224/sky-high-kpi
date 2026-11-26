import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {catalog,difficulty,drawBlock,emptyKpi,judge,reward,RULES,score,seeded,weights,getTitle,getSocialProfile,socialMetrics,FIXED_SEQUENCE,type Kind} from '../src/game/rules';
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const block=(id:string)=>({...catalog.find(b=>b.id===id)!});
function land(e:GameEngine,id:string,delta=0){if(e.phase==='READY')e.start();e.current=block(id);e.phase='SWINGING';e.currentX=e.topX+delta;e.currentY=e.topY-RULES.height-1;e.drop();e.update(.05);assert.equal(e.phase,'CAMERA_SHIFT');}
function next(e:GameEngine){e.update(.5);assert.equal(e.phase,'SWINGING');}
test('opposite errors accumulate sway even when their permanent offsets cancel; precise landings settle it',()=>{
  const e=new GameEngine(42,'fixed');
  land(e,'study',36);
  assert.ok(e.sway>0);
  const first=e.instability;
  next(e);land(e,'study',-36);
  assert.equal(e.topX,0);assert.ok(e.instability>first);
  assert.match(e.landingFeedback,/偏左/);
  for(let i=0;i<4;i++){next(e);land(e,'study',i%2===0?36:-36);}
  assert.match(e.landingFeedback,/越晃/);
  const unstable=e.instability;
  next(e);land(e,'study');
  assert.match(e.landingFeedback,/回稳/);
  e.togglePause();const paused=e.sway;e.update(4);approx(e.sway,paused);e.togglePause();
  for(let i=0;i<4;i++){next(e);land(e,'study');}
  assert.ok(e.instability<unstable*.1);
});
test('high tower framing keeps six floors visible with room for the suspended brick',()=>{
  for(const height of [720,760,950]){
    const e=new GameEngine(5,'fixed');e.setViewport(height);
    for(let i=0;i<10;i++){land(e,'study');next(e);}
    const roof=e.topY+e.groundScreen+e.cameraY;
    assert.ok((height/e.viewZoom-roof)/RULES.height>=5.9);
    assert.ok(roof-(e.currentY+e.groundScreen+e.cameraY+RULES.height)>50);
  }
});
test('contact boundaries: exact 6%, 12%, 50%, and first outside pixel',()=>{assert.equal(judge(5.28,'study'),'PERFECT');assert.equal(judge(5.2801,'study'),'SUCCESS');assert.equal(judge(10.56,'volunteer'),'PERFECT');assert.equal(judge(10.5601,'volunteer'),'SUCCESS');assert.equal(judge(-44,'study'),'SUCCESS');assert.equal(judge(44.001,'study'),'MISS');});
test('difficulty uses the specified equation and rollback clamp',()=>{approx(difficulty(15).omega,1.2+2.6*(1-Math.exp(-15/18)));assert.equal(difficulty(35).angle,48);assert.deepEqual(difficulty(12,6),difficulty(6));assert.deepEqual(difficulty(2,60),difficulty(1));assert.ok(difficulty(1000).omega<=3.8);});
test('base weights sum to one and keep courses available at every stage',()=>{
  for(let n=1;n<200;n++)approx(weights(n).reduce((a,b)=>a+b),1);
  assert.deepEqual(weights(1),[.6,.25,.15,0,0,0]);
  approx(weights(4)[0],.5);
  approx(weights(14)[0],.425);
  approx(weights(24)[0],.35);
});
test('fixed seeds reproduce natural draw streams',()=>{const a=seeded(42),b=seeded(42);for(let n=1;n<300;n++)assert.deepEqual(drawBlock(n,a,false,false),drawBlock(n,b,false,false));});
test('high pressure offers 20% direct temptation when absent in four draws',()=>{const random=()=>.19;assert.equal(drawBlock(25,random,true,false).kind,'temptation');assert.notEqual(drawBlock(25,random,true,true).kind,'temptation');});
test('remaining 80% of high-pressure draws cannot double count temptation',()=>{assert.notEqual(drawBlock(25,()=>.99,true,false).kind,'temptation');const r=seeded(823);let tempt=0;for(let i=0;i<10000;i++)if(drawBlock(25,r,true,false).kind==='temptation')tempt++;assert.ok(tempt>1850&&tempt<2150);});
test('GPA clamps and negative temptation is never multiplied',()=>{const k={...emptyKpi(),gpa:3.99};assert.equal(reward(k,block('major'),true,10,true).kpi.gpa,4);assert.equal(reward(k,block('tempt_hok'),true,10,true).kpi.gpa,3.84);assert.equal(reward(emptyKpi(),block('tempt_hok'),true,10,true).kpi.gpa,0);});
test('score matches five-dimensional formula and competition raw units',()=>{assert.equal(score(10,{gpa:1.5,research:2,competition:5,volunteer:4,practice:3}),465);});
test('research imperfect half value and perfect positive multiplier',()=>{assert.equal(reward(emptyKpi(),block('research'),false,0,false).kpi.research,1);assert.equal(reward(emptyKpi(),block('research'),true,1,false).kpi.research,2.2);});
test('practice feedback attributes only the extra KPI actually credited',()=>{
  const gain=(id:string,gpa=0,perfect=false)=>reward({...emptyKpi(),gpa},block(id),perfect,2,true).label;
  assert.equal(gain('volunteer'),'志愿 +5h（实践多赚 1h）');
  assert.equal(gain('research'),'科研 +1.25（实践多赚 0.25）');
  assert.equal(gain('competition',0,true),'竞赛 +7.5（实践多赚 1.5）');
  assert.equal(gain('study',3.8),'GPA +0.2（实践多赚 0.02）');
  assert.doesNotMatch(gain('study',4),/多赚/);
  assert.doesNotMatch(gain('coffee'),/多赚/);
  assert.doesNotMatch(gain('tempt_hok',1),/多赚/);
});
test('every category has identical vertical free fall',()=>{const positions:number[]=[];for(const b of catalog){const e=new GameEngine(1);e.start();e.current=b;e.currentX=0;e.currentY=-500;e.drop();e.update(.2);positions.push(e.currentY);}positions.forEach(y=>approx(y,positions[0]));approx(positions[0],-472);});
test('DDL warns at 2 seconds, forces exactly at 6, freezes on pause',()=>{const e=new GameEngine(1);let warning=0;e.on(v=>{if(v.type==='warning')warning++;});e.start();e.update(3.99);assert.equal(warning,0);e.update(.03);assert.equal(warning,1);e.paused=true;const ddl=e.ddl;e.update(10);approx(e.ddl,ddl);e.paused=false;e.update(1.97);assert.equal(e.phase,'SWINGING');e.update(.03);assert.equal(e.phase,'DROPPING');assert.equal(e.forced,true);});
test('one MISS ends the run without points, floors, or ghost rewards',()=>{const e=new GameEngine(2);e.start();e.currentX=45;e.currentY=-89;e.drop();e.update(.05);assert.equal(e.phase,'GAME_OVER');assert.equal(e.floor,0);assert.equal(score(e.floor,e.kpi),0);assert.equal(e.drop(),false);e.update(1);assert.equal(e.finished,true);});
test('successful offset stays real; PERFECT only corrects two pixels',()=>{const e=new GameEngine(3);land(e,'study',20);assert.equal(e.topX,20);next(e);land(e,'study',4);assert.equal(e.topX,22);});
test('course grants two combo levels, success resets streak',()=>{const e=new GameEngine(3);land(e,'study');assert.equal(e.combo,2);approx(e.kpi.gpa,.216);next(e);land(e,'volunteer');assert.equal(e.combo,3);next(e);land(e,'research',25);assert.equal(e.combo,0);});
test('research speed buff affects exactly the next block',()=>{const e=new GameEngine(3);land(e,'research');next(e);approx(e.speedMultiplier,1.12);land(e,'study');next(e);approx(e.speedMultiplier,1);});
test('competition sway penalty only above 25% and lasts one draw',()=>{const e=new GameEngine(3);land(e,'competition',23);next(e);approx(e.angleMultiplier,1.15);land(e,'study');next(e);approx(e.angleMultiplier,1);});
test('practice bonus lasts next two settled blocks',()=>{const e=new GameEngine(3);land(e,'practice',20);assert.equal(e.practiceLeft,2);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,5);assert.equal(e.practiceLeft,1);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,10);assert.equal(e.practiceLeft,0);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,14);});
test('coffee slows by 45% for five simulation seconds',()=>{const e=new GameEngine(3);land(e,'coffee');const t=e.coffeeUntil;approx(t-e.lastLandTime,5);next(e);approx(e.params.omega,difficulty(e.floor+1).omega*.55);e.update(4.6);approx(e.params.omega,difficulty(e.floor+1).omega);});
test('notes narrow three subsequent draws by 30%',()=>{const e=new GameEngine(3);land(e,'notes',20);for(let i=0;i<3;i++){next(e);approx(e.angleMultiplier,.7);land(e,'study',20);}next(e);approx(e.angleMultiplier,1);});
test('temptation accepts minus 0.15 and accumulates six rollback layers',()=>{const e=new GameEngine(3);e.kpi.gpa=1;land(e,'tempt_hok');assert.equal(e.kpi.gpa,.85);assert.equal(e.rollback,6);assert.equal(e.accepted,1);next(e);land(e,'tempt_selflove');assert.equal(e.rollback,12);assert.equal(e.kpi.gpa,.7);});
test('skip never drops, deducts GPA, or increases floor; regular blocks cannot skip',()=>{const e=new GameEngine(3,'fixed');e.start();assert.equal(e.skipCurrentBlock(),false);e.current=block('tempt_hok');e.kpi.gpa=1;e.skipCurrentBlock();assert.equal(e.phase,'SWINGING');assert.equal(e.kpi.gpa,1);assert.equal(e.floor,0);assert.equal(e.skipped,1);assert.equal(e.ddl,RULES.ddl);});
test('resisting consecutive temptation offers survives intervening regular blocks',()=>{const e=new GameEngine(3);e.start();for(let i=0;i<3;i++){e.current=block('tempt_hok');e.skipCurrentBlock();land(e,'study');next(e);}assert.equal(e.maxSkipStreak,3);});
test('fixed scenario contains all 12 room sprites and five temptation skins',()=>{const e=new GameEngine(3,'fixed');e.start();const seen:number[]=[];for(let i=0;i<FIXED_SEQUENCE.length;i++){seen.push(e.current!.sprite);land(e,e.current!.id);next(e);}assert.equal(new Set(seen).size,12);});
test('100 floors continue without graduation modal or cropped width',()=>{const e=new GameEngine(3,'fixed');for(let i=0;i<100;i++){land(e,'study');next(e);}assert.equal(e.floor,100);assert.equal(e.phase,'SWINGING');assert.equal(e.kpi.gpa,4);assert.equal(e.tower.length,100);});
test('title priority prefers accepted temptation even with champion metrics',()=>{const s={floor:35,kpi:{...emptyKpi(),gpa:4},accepted:3,maxSkipStreak:0,maxCombo:10,researchImperfect:0,counts:{}};assert.equal(getTitle(s).rule,'temptation');assert.equal(getTitle({...s,accepted:0}).rule,'champion');});
test('social profiles classify normalized KPI balance',()=>{
  assert.equal(socialMetrics({...emptyKpi(),gpa:4,research:15}).id,'introvert');
  assert.equal(socialMetrics({...emptyKpi(),competition:30,volunteer:30,practice:15}).id,'extrovert');
  assert.equal(socialMetrics({...emptyKpi(),gpa:2,research:7.5,competition:15,volunteer:15,practice:7.5}).id,'ambivert');
  assert.equal(getSocialProfile(emptyKpi()).profile.name,'校园小透明');
});
test('ratio-based ending titles cover comeback, all-rounder, project and library builds',()=>{
  const base={accepted:0,maxSkipStreak:0,maxCombo:4,researchImperfect:0,counts:{}};
  const comeback={...base,floor:20,kpi:{gpa:2.5,research:4,competition:20,volunteer:4,practice:10}};
  const allRounder={...base,floor:25,kpi:{gpa:3.2,research:10,competition:20,volunteer:20,practice:10}};
  const project={...base,floor:15,maxCombo:1,kpi:{gpa:1,research:2,competition:25,volunteer:20,practice:12}};
  const library={...base,floor:15,kpi:{gpa:3.8,research:15,competition:0,volunteer:0,practice:0}};
  assert.equal(getTitle(comeback).rule,'comeback');
  assert.equal(getTitle(allRounder).rule,'allRounder');
  assert.equal(getTitle(project).rule,'projectStar');
  assert.equal(getTitle(library).rule,'libraryHermit');
});
test('fixed simulation is stable across different rendering frame sizes',()=>{const a=new GameEngine(77),b=new GameEngine(77);a.start();b.start();a.update(1);for(let i=0;i<60;i++)b.update(1/60);approx(a.currentX,b.currentX);approx(a.ddl,b.ddl);});
