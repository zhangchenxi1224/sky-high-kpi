import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {TowerMotion} from '../src/game/tower-motion';
import {catalog,difficulty,drawBlock,emptyKpi,judge,reward,RULES,score,seeded,weights,getTitle,getSocialProfile,socialMetrics,FIXED_SEQUENCE,type Kind} from '../src/game/rules';
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const block=(id:string)=>({...catalog.find(b=>b.id===id)!});
function land(e:GameEngine,id:string,delta=0){if(e.phase==='READY')e.start();e.current=block(id);e.phase='SWINGING';e.currentX=e.topX+delta;e.currentY=e.topY-RULES.height-1;e.drop();e.update(.05);assert.equal(e.phase,'CAMERA_SHIFT');}
function next(e:GameEngine){e.update(.5);assert.equal(e.phase,'SWINGING');}
test('detailed sway grows continuously with error, leads at the roof, and holds on a near miss',()=>{
  const impacts=[9,20,32,-40].map(delta=>{
    const motion=new TowerMotion();motion.land(delta,false);
    motion.step(1/120);
    assert.ok(Math.sign(motion.atDepth(0))===Math.sign(delta));approx(motion.atDepth(1),0);
    const samples=Array.from({length:120},()=>{motion.step(1/120);return motion.atDepth(0);});
    return {motion,samples,peak:Math.max(...samples.map(Math.abs))};
  });
  impacts.forEach((hit,i)=>{if(i>0)assert.ok(hit.peak>impacts[i-1].peak);});
  const near=impacts[3];
  assert.equal(near.motion.feedback,'险些落空');
  approx(near.samples[20],near.samples[25]);
  assert.ok(near.samples[20]<0&&near.samples.some(x=>x>0));
  assert.ok(near.peak<=RULES.width*.23);
  assert.ok(impacts[1].peak>8&&Math.min(...impacts[1].samples)<-3);
  assert.equal(impacts[0].motion.feedback,'');
});
test('a centered landing compresses and rebounds vertically without adding impact sway',()=>{
  const motion=new TowerMotion();
  motion.land(0,true);
  approx(motion.landingScaleY,1);
  const heights=Array.from({length:60},()=>{
    motion.step(1/120);
    approx(motion.atDepth(0),0);
    return motion.landingScaleY;
  });
  assert.ok(Math.min(...heights.slice(0,12))<.85);
  assert.ok(Math.max(...heights.slice(12,30))>1.07);
  assert.ok(heights.slice(46).every(h=>h===1));
});
test('aligned towers sway more with height, bend above an anchored base, and remain bounded',()=>{
  const motion=new TowerMotion();
  motion.land(0,true);
  const floors=[0,2,10,20,40,1000];
  const peaks=floors.map(()=>0);
  for(let frame=0;frame<480;frame++){
    motion.step(1/120);
    floors.forEach((floor,i)=>{
      const roof=Math.abs(motion.jointOffset(0,floor));
      peaks[i]=Math.max(peaks[i],roof);
      approx(motion.jointOffset(floor,floor),0);
      if(floor>=2)assert.ok(Math.abs(motion.jointOffset(1,floor))<=roof);
    });
  }
  approx(peaks[0],0);assert.ok(peaks[1]<1&&peaks[3]>12&&peaks[5]<RULES.width*.28);
  assert.ok(peaks.every((p,i)=>i===0||p>peaks[i-1]));
  assert.equal(motion.stress,0);
});
test('equal opposite errors build visible residual sway below the roof, then centered landings settle it',()=>{
  const motion=new TowerMotion();
  const aligned=new TowerMotion();
  function nextSwing(offset:number){
    motion.land(offset,offset===0);
    aligned.land(0,true);
    let roof=0,lower=0;
    for(let i=0;i<420;i++){
      motion.step(1/120);
      aligned.step(1/120);
      approx(motion.jointOffset(10,10),0);
      if(i>=240){
        roof=Math.max(roof,Math.abs(motion.jointOffset(0,10)-aligned.jointOffset(0,10)));
        lower=Math.max(lower,Math.abs(motion.jointOffset(3,10)-aligned.jointOffset(3,10)));
      }
    }
    return {roof,lower};
  }
  const first=nextSwing(28);
  nextSwing(-28);nextSwing(28);
  const fourth=nextSwing(-28);
  assert.ok(fourth.roof>first.roof*3&&fourth.roof>10);
  assert.ok(fourth.lower>first.lower*3&&fourth.lower>6);
  const light=nextSwing(9);
  assert.ok(light.lower>first.lower*2);
  const oneGood=nextSwing(0),twoGood=nextSwing(0);
  assert.ok(twoGood.roof<oneGood.roof&&oneGood.roof<light.roof);
});
test('repeated errors build tension across direction changes; volunteer perfect settles it',()=>{
  const e=new GameEngine(7,'fixed');
  land(e,'study',32);const first=e.detailedMotion.stress;
  next(e);land(e,'study',32);assert.ok(e.detailedMotion.stress>first);
  const repeated=e.detailedMotion.stress;
  next(e);land(e,'study',-40);assert.ok(e.detailedMotion.stress>repeated);
  const peak=e.detailedMotion.stress;
  e.togglePause();const frozen=e.detailedMotion.atDepth(0);e.update(2);
  approx(e.detailedMotion.atDepth(0),frozen);e.togglePause();
  next(e);land(e,'volunteer',9);approx(e.detailedMotion.stress,peak*.6);
  assert.match(e.detailedMotion.feedback,/回稳/);
  next(e);land(e,'study',0);approx(e.detailedMotion.stress,peak*.36);
});
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
test('camera holds for two floors, zooms out through floor six, then frames five floors and most of the sixth',()=>{
  for(const height of [720,760,950]){
    const e=new GameEngine(5,'fixed');e.setViewport(430,height);
    let previousZoom=1;
    for(let i=1;i<=10;i++){
      land(e,'study',10);next(e);
      if(i<=2){approx(e.viewZoom,1);approx(e.cameraX,0);approx(e.cameraY,0);}
      else if(i<=6)assert.ok(e.viewZoom<previousZoom);
      else approx(e.viewZoom,previousZoom);
      previousZoom=e.viewZoom;
    }
    const roof=e.topY+e.groundScreen+e.cameraY;
    approx((height/e.viewZoom-roof)/RULES.height,5.75);
    assert.ok(roof-(e.currentY+e.groundScreen+e.cameraY+RULES.height)>50);
  }
});
test('contact boundaries: exact 6%, 12%, 50%, and first outside pixel',()=>{assert.equal(judge(5.28,'study'),'PERFECT');assert.equal(judge(5.2801,'study'),'SUCCESS');assert.equal(judge(10.56,'volunteer'),'PERFECT');assert.equal(judge(10.5601,'volunteer'),'SUCCESS');assert.equal(judge(-44,'study'),'SUCCESS');assert.equal(judge(44.001,'study'),'MISS');});
test('the shorter crane preserves at least 2.5 bricks of landscape clearance and portrait spacing',()=>{
  const e=new GameEngine(7,'fixed');e.start();
  for(let floor=0;floor<=40;floor++){
    for(const [width,height] of [[430,760],[1280,720],[430,950],[1520,720]]){
      e.setViewport(width,height);e.phaseAngle=0;e.updateHook();
      const landscape=width>height;
      const gap=(e.topY-e.currentY-RULES.height)/RULES.height;
      assert.ok(gap>=(landscape?2.5:1.6)-1e-8);
      if(floor>=6&&landscape){
        assert.ok((height/e.viewZoom-e.topY-e.groundScreen-e.cameraY)/RULES.height>=5);
      }
      e.phaseAngle=Math.PI/2;e.angleMultiplier=1.15;e.updateHook();
      assert.ok(e.currentY+e.groundScreen+e.cameraY>=0);
      e.angleMultiplier=1;
    }
    land(e,'study',20);next(e);
  }
});
test('difficulty increases smoothly with an 8% speed and 6% amplitude uplift',()=>{
  approx(difficulty(1).omega,1.5444);approx(difficulty(1).angle,19.08);
  assert.equal(difficulty(20).omega.toFixed(2),'2.93');
  assert.equal(difficulty(20).angle.toFixed(1),'35.6');
  for(let n=2;n<=100;n++){
    const current=difficulty(n),prev=difficulty(n-1);
    assert.ok(current.omega>prev.omega&&current.omega<4.2174);
    assert.ok(current.angle>prev.angle&&current.angle<47.7);
  }
  approx(difficulty(12,6).effective,8.15);approx(difficulty(2,60).effective,1.65);
});

test('swing uplift preserves high-pressure selection thresholds under relief and buffs',()=>{
  for(const floor of [1,8,20,31,32,35,60,100])for(const rollback of [0,2,4,6]){
    const d=difficulty(floor,rollback),progress=d.effective-1;
    const oldOmega=1.43+(3.905-1.43)*(1-Math.exp(-progress/26));
    const oldAngle=18+27*(1-Math.exp(-progress/22));
    approx(d.omega/oldOmega,1.08);approx(d.angle/oldAngle,1.06);
    for(const multiplier of [1,.55,1.12,1.15,1.12*1.15,.55*1.12*1.15]){
      assert.equal(d.omega*multiplier>=RULES.highPressureOmega,oldOmega*multiplier>=3.135);
    }
  }
});
test('nine draw probabilities reserve 4% for fitness while reducing temptation',()=>{
  for(let n=1;n<100;n++)for(const boost of [false,true]){
    const odds=weights(n,boost);
    assert.ok(odds.every(p=>p>=0&&p<=1));approx(odds.reduce((a,b)=>a+b),1);
  }
  [.4,.22,.16,.12,.1,0,0,0,0].forEach((p,i)=>approx(weights(1)[i],p));
  [.38,.17,.12,.12,.10,.04,.02,.01,.04].forEach((p,i)=>approx(weights(8)[i],p));
  [.40,.12,.10,.14,.11,.04,.03,.02,.04].forEach((p,i)=>approx(weights(20)[i],p));
  [.38,.10,.10,.15,.13,.04,.03,.03,.04].forEach((p,i)=>approx(weights(50)[i],p));
  approx(weights(14)[0]/weights(14)[1],.39/.145);
});
test('fixed seeds reproduce natural draw streams',()=>{const a=seeded(42),b=seeded(42);for(let n=1;n<300;n++)assert.deepEqual(drawBlock(n,a,false,false),drawBlock(n,b,false,false));});
test('pressure multiplies temptation by 1.5 with a 4.5% ceiling and a real cooldown',()=>{
  approx(weights(3,true)[7],0);approx(weights(20,true)[7],.03);approx(weights(80,true)[7],.045);
  approx(weights(35,true)[0]/weights(35,true)[5],.38/.04);
  assert.equal(drawBlock(35,()=>.92,true,false).kind,'temptation');
  assert.notEqual(drawBlock(35,()=>.92,true,true).kind,'temptation');
  assert.notEqual(drawBlock(35,()=>.92,false,false).kind,'temptation');
});
test('roulette covers each of the nine probability intervals exactly once',()=>{
  const kinds:Kind[]=['study','volunteer','practice','research','competition','coffee','notes','temptation','fitness'];
  for(const floor of [1,3,4,8,20,35,80])for(const high of [false,true]){
    const counts=kinds.map(()=>0),odds=weights(floor,high),samples=10000;
    for(let i=0;i<samples;i++)counts[kinds.indexOf(drawBlock(floor,()=>(i+.5)/samples,high,false).kind)]++;
    counts.forEach((count,i)=>assert.ok(Math.abs(count-samples*odds[i])<=1));
    assert.equal(counts.at(-1),floor<4?0:400);
  }
});

test('GPA clamps and negative temptation is never multiplied',()=>{const k={...emptyKpi(),gpa:3.99};assert.equal(reward(k,block('major'),true,10,true).kpi.gpa,4);assert.equal(reward(k,block('tempt_hongguo'),true,10,true).kpi.gpa,3.89);assert.equal(reward(emptyKpi(),block('tempt_hongguo'),true,10,true).kpi.gpa,0);});
test('score matches five-dimensional formula and competition raw units',()=>{assert.equal(score(10,{gpa:1.5,research:2,competition:5,volunteer:4,practice:3}),465);});
test('research earns 70% on ordinary landings and full combo value on perfect landings',()=>{assert.equal(reward(emptyKpi(),block('research'),false,0,false).kpi.research,1.4);assert.equal(reward(emptyKpi(),block('research'),true,1,false).kpi.research,2.2);});
test('practice feedback attributes only the extra KPI actually credited',()=>{
  const gain=(id:string,gpa=0,perfect=false)=>reward({...emptyKpi(),gpa},block(id),perfect,2,true).label;
  assert.equal(gain('volunteer'),'志愿 +5h（实践多赚 1h）');
  assert.equal(gain('research'),'科研 +1.75（实践多赚 0.35）');
  assert.equal(gain('competition',0,true),'竞赛 +6（实践多赚 1.2）');
  assert.equal(gain('study',3.78),'GPA +0.22（实践多赚 0.02）');
  assert.doesNotMatch(gain('study',4),/多赚/);
  assert.doesNotMatch(gain('coffee'),/多赚/);
  assert.doesNotMatch(gain('tempt_hok',1),/多赚/);
});
test('every category has identical vertical free fall',()=>{const positions:number[]=[];for(const b of catalog){const e=new GameEngine(1);e.start();e.current=b;e.currentX=0;e.currentY=-500;e.drop();e.update(.2);positions.push(e.currentY);}positions.forEach(y=>approx(y,positions[0]));approx(positions[0],-472);});
test('DDL warns at 2 seconds, forces exactly at 6, freezes on pause',()=>{const e=new GameEngine(1);let warning=0;e.on(v=>{if(v.type==='warning')warning++;});e.start();e.update(3.99);assert.equal(warning,0);e.update(.03);assert.equal(warning,1);e.paused=true;const ddl=e.ddl;e.update(10);approx(e.ddl,ddl);e.paused=false;e.update(1.97);assert.equal(e.phase,'SWINGING');e.update(.03);assert.equal(e.phase,'DROPPING');assert.equal(e.forced,true);});
test('one MISS ends the run without points, floors, or ghost rewards',()=>{const e=new GameEngine(2);e.start();e.currentX=45;e.currentY=-89;e.drop();e.update(.05);assert.equal(e.phase,'GAME_OVER');assert.equal(e.floor,0);assert.equal(score(e.floor,e.kpi),0);assert.equal(e.drop(),false);e.update(1);assert.equal(e.finished,true);});
test('successful offset stays real; PERFECT only corrects two pixels',()=>{const e=new GameEngine(3);land(e,'study',20);assert.equal(e.topX,20);next(e);land(e,'study',4);assert.equal(e.topX,22);});
test('course grants two combo levels, success resets streak',()=>{const e=new GameEngine(3);land(e,'study');assert.equal(e.combo,2);approx(e.kpi.gpa,.24);next(e);land(e,'volunteer');assert.equal(e.combo,3);next(e);land(e,'research',25);assert.equal(e.combo,0);});
test('research speed buff affects exactly the next block',()=>{const e=new GameEngine(3);land(e,'research');next(e);approx(e.speedMultiplier,1.12);land(e,'study');next(e);approx(e.speedMultiplier,1);});
test('competition sway penalty only above 25% and lasts one draw',()=>{const e=new GameEngine(3);land(e,'competition',23);next(e);approx(e.angleMultiplier,1.15);land(e,'study');next(e);approx(e.angleMultiplier,1);});
test('practice bonus lasts next two settled blocks',()=>{const e=new GameEngine(3);land(e,'practice',20);assert.equal(e.practiceLeft,2);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,5);assert.equal(e.practiceLeft,1);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,10);assert.equal(e.practiceLeft,0);next(e);land(e,'volunteer',20);assert.equal(e.kpi.volunteer,14);});
test('coffee slows by 45% for five simulation seconds',()=>{const e=new GameEngine(3);land(e,'coffee');const t=e.coffeeUntil;approx(t-e.lastLandTime,5);next(e);approx(e.params.omega,difficulty(e.floor+1).omega*.55);e.update(4.6);approx(e.params.omega,difficulty(e.floor+1).omega);});
test('notes narrow three subsequent draws by 30%',()=>{const e=new GameEngine(3);land(e,'notes',20);for(let i=0;i<3;i++){next(e);approx(e.angleMultiplier,.7);land(e,'study',20);}next(e);approx(e.angleMultiplier,1);});
test('temptation applies its own effect without difficulty rollback',()=>{const e=new GameEngine(3);e.kpi.gpa=1;land(e,'tempt_hongguo');assert.equal(e.kpi.gpa,.9);assert.equal(e.rollback,0);assert.equal(e.accepted,1);next(e);approx(e.params.omega,difficulty(2).omega*.8);land(e,'tempt_selflove');assert.equal(e.kpi.gpa,.9);assert.equal(e.rollback,0);next(e);approx(e.params.angle,difficulty(3).angle*.85);});

test('skip never drops, deducts GPA, or increases floor; regular blocks cannot skip',()=>{const e=new GameEngine(3,'fixed');e.start();assert.equal(e.skipCurrentBlock(),false);e.current=block('tempt_hok');e.kpi.gpa=1;e.skipCurrentBlock();assert.equal(e.phase,'SWINGING');assert.equal(e.kpi.gpa,1);assert.equal(e.floor,0);assert.equal(e.skipped,1);assert.equal(e.ddl,RULES.ddl);});
test('resisting consecutive temptation offers survives intervening regular blocks',()=>{const e=new GameEngine(3);e.start();for(let i=0;i<3;i++){e.current=block('tempt_hok');e.skipCurrentBlock();land(e,'study');next(e);}assert.equal(e.maxSkipStreak,3);});
test('fixed scenario contains all 14 room sprites and six temptation skins',()=>{const e=new GameEngine(3,'fixed');e.start();const seen:number[]=[];for(let i=0;i<FIXED_SEQUENCE.length;i++){seen.push(e.current!.sprite);land(e,e.current!.id);next(e);}assert.equal(new Set(seen).size,14);});
test('100 floors continue without graduation modal or cropped width',()=>{const e=new GameEngine(3,'fixed');for(let i=0;i<100;i++){land(e,'study');next(e);}assert.equal(e.floor,100);assert.equal(e.phase,'SWINGING');assert.equal(e.kpi.gpa,4);assert.equal(e.tower.length,100);});
test('title priority prefers secret grinder with temptation and champion metrics',()=>{const s={floor:35,kpi:{...emptyKpi(),gpa:4},accepted:3,maxSkipStreak:0,maxCombo:10,researchImperfect:0,counts:{}};assert.equal(getTitle(s).rule,'secretGrinder');assert.equal(getTitle({...s,accepted:0}).rule,'champion');});
test('exact 1103 score unlocks the Chen Ze easter egg above every other title',()=>{
  const kpi={gpa:4,research:10,competition:10,volunteer:10.6,practice:5};
  assert.equal(score(10,kpi),1103);
  const s={floor:10,kpi,accepted:3,maxSkipStreak:3,maxCombo:12,researchImperfect:2,counts:{study:10,research:10}};
  assert.equal(getTitle(s).rule,'chenze1103');
});
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

test('fitness activates on the following 1–3 draws and does not modify KPI or landing physics',()=>{
  for(const turns of [1,2,3]){
    const e=new GameEngine(5,'fixed');e.start();e.random=()=>(turns-.5)/3;
    e.kpi={gpa:2,research:3,competition:4,volunteer:5,practice:6};
    const before={...e.kpi};e.practiceLeft=2;
    land(e,'fitness');assert.deepEqual(e.kpi,before);assert.equal(e.floor,1);assert.equal(e.fitnessActive,false);
    assert.equal(e.fitnessLeft,turns);assert.match(e.snapshot().buffs.join(),/体测加练/);
    for(let i=0;i<turns;i++){
      next(e);assert.equal(e.fitnessActive,true);
      approx(e.params.omega,difficulty(e.floor+1).omega*1.15);approx(e.params.angle,difficulty(e.floor+1).angle*1.15);
      land(e,'study',20);
    }
    next(e);assert.equal(e.fitnessActive,false);assert.equal(e.fitnessLeft,0);
    assert.ok(!e.snapshot().buffs.some(b=>b.includes('体测')));
    approx(e.params.omega,difficulty(e.floor+1).omega);
  }
});

test('fitness qualification includes the exact 30 boundary and never consumes RNG when qualified',()=>{
  for(const [competition,volunteer] of [[30,0],[0,30],[12.5,17.5],[16,20]]){
    const e=new GameEngine(1,'fixed');e.start();e.kpi.competition=competition;e.kpi.volunteer=volunteer;
    e.random=()=>{throw new Error('Qualified fitness must not roll a penalty');};
    land(e,'fitness');assert.equal(e.fitnessLeft,0);assert.match(e.message,/体测达标/);
    next(e);assert.equal(e.fitnessActive,false);
  }
  const e=new GameEngine(1,'fixed');e.kpi.volunteer=29.9999;land(e,'fitness');assert.ok(e.fitnessLeft>=1);
});

test('fitness stacks with coffee, notes and research; pause freezes it and skipping consumes a draw',()=>{
  const e=new GameEngine(4,'fixed');e.start();e.random=()=>.99;land(e,'fitness');
  e.coffeeUntil=e.time+5;e.notesLeft=3;e.speedNext=1.12;next(e);
  const d=difficulty(e.floor+1);
  approx(e.params.omega,d.omega*1.12*.55*1.15);approx(e.params.angle,d.angle*.7*1.15);
  const before={...e.params},ddl=e.ddl,left=e.fitnessLeft;
  e.togglePause();e.update(10);assert.deepEqual(e.params,before);assert.equal(e.ddl,ddl);assert.equal(e.fitnessLeft,left);e.togglePause();
  e.current=block('tempt_hok');assert.ok(e.skipCurrentBlock());assert.equal(e.fitnessLeft,left-1);
});

test('fixed autoplay remains stable with fitness and six-second DDL in both orientations',()=>{
  for(const [w,h] of [[1280,720],[430,760]])for(const dt of [1/60,.1]){
    const e=new GameEngine(20261127,'fixed');e.setViewport(w,h);e.start();
    const target=FIXED_SEQUENCE.length*2;
    for(let i=0;i<20000&&e.floor<target&&!e.finished;i++)e.update(dt,g=>Math.abs(g.currentX-g.topX)<2.5);
    assert.equal(e.floor,target);assert.equal(e.finished,false);assert.ok((e.counts.fitness??0)>=2);
  }
});
