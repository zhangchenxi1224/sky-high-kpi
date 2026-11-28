import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {catalog,difficulty,drawBlock,emptyKpi,getTitle,reward,seeded,weights} from '../src/game/rules';
import {BALANCE_RULESET,TEMPTATIONS,temptationDefinition} from '../src/game/temptations';
import {restoreBalanceProgress} from '../src/features/records';
import {restorePlayerStats,settleBirdEnding} from '../src/features/bird-ending';
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const block=(id:string)=>({...catalog.find(b=>b.id===id)!});
function land(e:GameEngine,id:string,delta=0){if(e.phase==='READY')e.start();e.current=block(id);e.phase='SWINGING';e.currentX=e.topX+delta;e.currentY=e.topY-89;e.drop();e.update(.05);}
function next(e:GameEngine){e.update(.5);assert.equal(e.phase,'SWINGING');}

test('all six visible skins have distinct previews and a normalized weighted pool',()=>{
  assert.equal(TEMPTATIONS.length,6);approx(TEMPTATIONS.reduce((s,t)=>s+t.weight,0),1);
  for(const t of TEMPTATIONS){assert.ok(catalog.some(b=>b.id===t.id));assert.equal(t.preview.length,2);}
  const rng=seeded(101),counts:Record<string,number>={};
  for(let i=0;i<100000;i++){
    let first=true;const b=drawBlock(35,()=>{if(first){first=false;return .94;}return rng();},false,false,2);
    assert.equal(b.kind,'temptation');counts[b.id]=(counts[b.id]??0)+1;
  }
  for(const t of TEMPTATIONS)assert.ok(Math.abs(counts[t.id]/100000-t.weight)<.006, t.id);
});

test('low GPA preserves the absolute probability of every safe subtype',()=>{
  for(const gpa of [0,.29,.3]){
    const odds=weights(35,false,{gpa}),eligible=TEMPTATIONS.filter(t=>gpa>=.3||!t.risksGpa);
    approx(odds[7],gpa<.3?.0195:.03);approx(odds[8],.04);
    const share=eligible.reduce((s,t)=>s+t.weight,0);
    for(const t of eligible)approx(odds[7]*t.weight/share,.03*t.weight);
    for(let i=0;i<1000;i++){let first=true;const b=drawBlock(35,()=>{if(first){first=false;return .955;}return (i+.5)/1000;},false,false,gpa);assert.ok(eligible.some(t=>t.id===b.id));}
  }
});

test('temptation rewards stay fixed despite maximum combo and active practice',()=>{
  const k={...emptyKpi(),gpa:1};
  assert.equal(reward(k,block('tempt_delta'),true,10,true).kpi.practice,2);
  assert.equal(reward(k,block('tempt_hok'),true,10,true).kpi.competition,3);
  assert.equal(reward(k,block('tempt_hongguo'),true,10,true).kpi.gpa,.9);
  assert.equal(reward({...k,gpa:.03},block('tempt_delta'),false,0,false).kpi.gpa,0);
  for(const id of ['tempt_selflove','tempt_snack','tempt_kangshen'])assert.deepEqual(reward(k,block(id),true,10,true).kpi,k);
});

test('risky rewards and penalties are exclusive at exact PERFECT and SUCCESS boundaries',()=>{
  for(const id of ['tempt_delta','tempt_hok'])for(const delta of [5.28,5.2801,44,44.001]){
    const e=new GameEngine(1);e.kpi.gpa=1;land(e,id,delta);
    if(delta>44){assert.equal(e.phase,'GAME_OVER');assert.equal(e.accepted,0);assert.equal(e.kpi.gpa,1);assert.equal(e.temptationStats[id].miss,1);assert.equal(e.temptationNext,null);continue;}
    assert.equal(e.accepted,1);assert.equal(e.costlyAccepted,delta>5.28?1:0);
    if(id==='tempt_delta'){assert.equal(e.kpi.practice,delta<=5.28?2:0);assert.equal(e.kpi.gpa,delta<=5.28?1:.9);}
    else {assert.equal(e.kpi.competition,delta<=5.28?3:0);assert.equal(e.temptationNext?.speed,delta<=5.28?undefined:1.15);}
  }
});

test('rest and stream affect one offer, refresh without stacking, and live below the HUD',()=>{
  for(const [id,multiplier] of [['tempt_selflove',.85],['tempt_kangshen',1.15]] as const){
    const e=new GameEngine(1);land(e,id);assert.equal(e.snapshot().statuses.at(-1)?.label,`幅 ${multiplier<1?'−':'+'}15% · ×1`);
    next(e);approx(e.params.angle,difficulty(2).angle*multiplier);land(e,id);next(e);
    approx(e.params.angle,difficulty(3).angle*multiplier);land(e,'study',12);next(e);
    approx(e.params.angle,difficulty(4).angle);assert.equal(e.snapshot().statuses.some(s=>s.id.startsWith('tempt-')),false);
  }
});

test('snack gives exactly seven simulation seconds to the next offer and pauses cleanly',()=>{
  const e=new GameEngine(1);land(e,'tempt_snack');next(e);assert.equal(e.ddlLimit,7);assert.ok(e.ddl>6.8);
  const remaining=e.ddl;e.togglePause();e.update(3);assert.equal(e.ddl,remaining);e.togglePause();
  e.update(e.ddl-.1);assert.equal(e.phase,'SWINGING');e.update(.2);assert.equal(e.forced,true);
  const other=new GameEngine(2);land(other,'tempt_snack');next(other);land(other,'study');next(other);assert.equal(other.ddlLimit,6);
});

test('skipping spends the active next-offer buff without granting the skipped effect',()=>{
  const e=new GameEngine(2);land(e,'tempt_snack');next(e);e.current=block('tempt_kangshen');e.drawHistory=['temptation'];
  assert.equal(e.skipCurrentBlock(),true);assert.equal(e.ddlLimit,6);assert.equal(e.temptationActive,null);assert.equal(e.temptationNext,null);
  assert.equal(e.temptationStats.tempt_kangshen.skipped,1);assert.equal(e.temptationStats.tempt_snack.buffTurns,1);
});

test('old and new buffs respect the combined floors and ceilings without changing height',()=>{
  const e=new GameEngine(1);e.floor=79;e.start();const base=difficulty(80);
  e.coffeeUntil=e.time+5;e.temptationActive={...temptationDefinition('tempt_hongguo').perfect.buff!,origin:'tempt_hongguo'};
  approx(e.params.omega,base.omega*.55);
  e.angleMultiplier=.7;e.temptationActive={...temptationDefinition('tempt_selflove').perfect.buff!,origin:'tempt_selflove'};approx(e.params.angle,base.angle*.7);
  e.coffeeUntil=0;e.speedMultiplier=1.12;e.fitnessActive=true;e.temptationActive={...temptationDefinition('tempt_hok').success.buff!,origin:'tempt_hok'};approx(e.params.omega,base.omega*1.35);
  e.angleMultiplier=1.15;e.temptationActive={...temptationDefinition('tempt_kangshen').perfect.buff!,origin:'tempt_kangshen'};approx(e.params.angle,base.angle*1.35);assert.equal(e.params.effective,80);
});

test('costly titles ignore safe temptation and telemetry captures actual costs and fixed gains',()=>{
  const e=new GameEngine(1);e.kpi.gpa=.03;land(e,'tempt_hongguo');approx(e.temptationStats.tempt_hongguo.gpaCost,.03);assert.equal(e.costlyAccepted,1);
  next(e);land(e,'tempt_delta');assert.equal(e.temptationStats.tempt_delta.practice,2);assert.equal(e.costlyAccepted,1);
  const s={...e.snapshot(),floor:24,kpi:{...e.kpi,gpa:3.4},accepted:6,costlyAccepted:0};assert.notEqual(getTitle(s).rule,'secretGrinder');assert.notEqual(getTitle(s).rule,'temptation');
  assert.equal(getTitle({...s,costlyAccepted:2}).rule,'secretGrinder');
  const snapshot=e.snapshot();e.temptationStats.tempt_delta.practice=99;assert.equal(snapshot.temptationStats.tempt_delta.practice,2);
});

test('new balance archives old scores once, preserves personas and compares new records separately',()=>{
  const oldRecord={date:'old',score:900,floor:20,gpa:2,title:'早八即休学大师',personaId:'early'};
  const oldStats={...restorePlayerStats(undefined,[oldRecord]),bestFloor:40,unlockedPersonas:['early','default']};
  const upgraded=restoreBalanceProgress({records:[oldRecord],playerStats:oldStats});
  assert.equal(upgraded.ruleset,BALANCE_RULESET);assert.deepEqual(upgraded.legacyRecords,[oldRecord]);assert.equal(upgraded.legacyPlayerStats?.bestFloor,40);
  assert.deepEqual(upgraded.records,[]);assert.equal(upgraded.playerStats.bestScore,0);assert.deepEqual(upgraded.playerStats.unlockedPersonas,['early','default']);
  assert.deepEqual(restoreBalanceProgress(upgraded),upgraded);
  const result=settleBirdEnding({score:200,floor:8,personaId:'research'},upgraded.playerStats,()=>0);
  assert.match(result.line.text,/3\/20/);assert.equal(result.stats.bestScore,200);
});
