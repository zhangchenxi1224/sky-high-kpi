import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {catalog,emptyKpi,getTitle,RULES,type TitleStats} from '../src/game/rules';
import memes from '../src/config/memePack.json';
import {createReportSvg,wrapReportComment} from '../src/features/report';

const stats=(patch:Partial<TitleStats>={}):TitleStats=>({floor:16,kpi:{...emptyKpi(),gpa:1},accepted:0,costlyAccepted:patch.costlyAccepted??patch.accepted??0,maxSkipStreak:0,maxCombo:0,researchImperfect:0,counts:{},lateLandings:0,narrowLandings:0,ddlForcedMiss:false,...patch});
const fixtures:Record<string,TitleStats>={
  chenze1103:stats({floor:10,kpi:{gpa:4,research:10,competition:10,volunteer:10.6,practice:5},accepted:3}),
  zeroGpa:stats({floor:10,kpi:emptyKpi(),accepted:3}),
  secretGrinder:stats({floor:22,kpi:{...emptyKpi(),gpa:3.3},accepted:2}),
  temptation:stats({accepted:3}),
  resist:stats({floor:21,maxSkipStreak:3}),
  comeback:stats({floor:20,kpi:{...emptyKpi(),gpa:3,competition:15},maxCombo:3}),
  champion:stats({floor:30,kpi:{...emptyKpi(),gpa:3.8},maxCombo:7}),
  precision:stats({floor:1,maxCombo:7}),
  allRounder:stats({floor:25,kpi:{gpa:3.2,research:8.25,competition:16.5,volunteer:16.5,practice:8.25}}),
  deadline:stats({floor:8,lateLandings:3}),
  projectStar:stats({kpi:{gpa:1,research:2,competition:25,volunteer:20,practice:12}}),
  volunteer:stats({kpi:{...emptyKpi(),gpa:1,volunteer:25},maxCombo:3}),
  campusHelper:stats({floor:12,kpi:{...emptyKpi(),gpa:2.2,volunteer:20}}),
  research:stats({counts:{research:2,study:2},researchImperfect:2}),
  itemMaster:stats({floor:15,counts:{coffee:1,notes:2}}),
  examPurist:stats({floor:15,kpi:{gpa:3.6,research:2,competition:5,volunteer:4,practice:2}}),
  libraryHermit:stats({floor:15,kpi:{...emptyKpi(),gpa:3.8,research:15}}),
  narrowMiracle:stats({floor:16,maxCombo:1,narrowLandings:5}),
  early:stats({floor:5}),
  default:stats()
};

test('all 20 titles are reachable and use their configured copy and stamp in the report',()=>{
  assert.equal(memes.titles.length,20);
  assert.equal(new Set(memes.titles.map(t=>t.rule)).size,20);
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
  for(const [rule,s] of Object.entries(fixtures)){
    const title=getTitle(s);assert.equal(title.rule,rule);
    const e=new GameEngine(1);Object.assign(e,s);
    const svg=createReportSvg(e.snapshot(),[],'qr','bird');
    assert.ok(svg.includes(escape(title.name)),rule);
    assert.ok(svg.includes(escape(title.stamp)),rule);
    const lines=wrapReportComment(title.comment);
    assert.equal(lines.join(''),title.comment);
    for(const line of lines)assert.ok(svg.includes(escape(line)),rule);
    assert.doesNotMatch(svg,/NaN|Infinity/);
  }
  assert.equal(getTitle(stats()).name,'校园稀有活人');
  assert.equal(getTitle(stats()).stamp,'情绪稳定');
});

test('new title boundaries reject values just outside each requirement',()=>{
  const misses:Record<string,Partial<TitleStats>[]>={
    zeroGpa:[{floor:9},{kpi:{...emptyKpi(),gpa:.0001}}],
    secretGrinder:[{floor:21},{accepted:1,costlyAccepted:1},{kpi:{...emptyKpi(),gpa:3.2999}}],
    precision:[{maxCombo:6}],
    deadline:[{floor:7},{lateLandings:2}],
    campusHelper:[{floor:11},{kpi:{...emptyKpi(),gpa:2.2001,volunteer:20}},{kpi:{...emptyKpi(),gpa:2.2,volunteer:19.9999}}],
    itemMaster:[{floor:14},{counts:{coffee:1,notes:1,fitness:9}}],
    examPurist:[{floor:14},...Object.entries({gpa:3.5999,research:2.0001,competition:5.0001,volunteer:4.0001,practice:2.0001}).map(([key,value])=>({kpi:{...fixtures.examPurist.kpi,[key]:value}}))],
    narrowMiracle:[{floor:15},{maxCombo:2},{narrowLandings:4}]
  };
  for(const [rule,patches] of Object.entries(misses))for(const patch of patches){
    assert.notEqual(getTitle({...fixtures[rule],...patch}).rule,rule,`${rule}: ${JSON.stringify(patch)}`);
  }
  assert.equal(getTitle(stats({floor:8,ddlForcedMiss:true})).rule,'deadline');
  assert.notEqual(getTitle(stats({floor:7,ddlForcedMiss:true,lateLandings:3})).rule,'deadline');
  assert.equal(getTitle(stats({floor:15,counts:{notes:3}})).rule,'itemMaster');
  assert.equal(getTitle(stats({floor:15,counts:{coffee:3}})).rule,'itemMaster');
});

test('overlapping titles respect every requested insertion position',()=>{
  const cases:[TitleStats,string][]=[
    [{...fixtures.chenze1103,maxCombo:7,lateLandings:3},'chenze1103'],
    [{...fixtures.zeroGpa,accepted:3},'zeroGpa'],
    [{...fixtures.secretGrinder,accepted:3},'secretGrinder'],
    [{...fixtures.champion,lateLandings:3},'champion'],
    [{...fixtures.allRounder,maxCombo:7},'precision'],
    [{...fixtures.allRounder,lateLandings:3},'allRounder'],
    [{...fixtures.projectStar,lateLandings:3},'deadline'],
    [{...fixtures.volunteer,counts:{research:2},researchImperfect:2},'volunteer'],
    [{...fixtures.campusHelper,counts:{research:2},researchImperfect:2},'campusHelper'],
    [{...fixtures.research,counts:{research:3,coffee:3}},'research'],
    [{...fixtures.examPurist,counts:{coffee:3}},'itemMaster'],
    // Full GPA with low other KPIs also meets the library academic threshold.
    [{...fixtures.examPurist,kpi:{...fixtures.examPurist.kpi,gpa:4}},'examPurist'],
    [{...fixtures.libraryHermit,narrowLandings:5,maxCombo:1},'libraryHermit']
  ];
  for(const [s,rule] of cases)assert.equal(getTitle(s).rule,rule);
  const legacy=stats();delete legacy.lateLandings;delete legacy.narrowLandings;delete legacy.ddlForcedMiss;
  assert.equal(getTitle(legacy).rule,'default');
});

function release(e:GameEngine,ddl:number,offset:number,forced=false){
  if(e.phase==='READY')e.start();
  if(e.phase==='CAMERA_SHIFT')e.update(.5);
  e.current={...catalog.find(b=>b.id==='study')!};
  e.ddl=ddl;e.currentX=e.topX+offset;e.currentY=e.topY-RULES.height-1;
  assert.ok(e.drop(forced));e.update(.05);
}

test('landing counters use release-time DDL and strict 30% offset, never counting a miss',()=>{
  const e=new GameEngine(1,'fixed');
  release(e,2.0001,RULES.width*.3);assert.equal(e.lateLandings,0);assert.equal(e.narrowLandings,0);
  release(e,2,-RULES.width*.3-.001);assert.equal(e.lateLandings,1);assert.equal(e.narrowLandings,1);
  release(e,1.5,RULES.width*.5);assert.equal(e.lateLandings,2);assert.equal(e.narrowLandings,2);
  release(e,0,0,true);assert.equal(e.lateLandings,3);assert.equal(e.ddlForcedMiss,false);
  release(e,1,RULES.width*.5+.001);assert.equal(e.phase,'GAME_OVER');
  assert.equal(e.lateLandings,3);assert.equal(e.narrowLandings,2);assert.equal(e.ddlForcedMiss,false);
  assert.equal(e.snapshot().lateLandings,3);assert.equal(e.snapshot().narrowLandings,2);
  assert.equal(new GameEngine().snapshot().lateLandings,0);
});

test('pause, skipped offers and falling time cannot manufacture a late successful release',()=>{
  const e=new GameEngine(2,'fixed');e.start();e.ddl=1;
  e.current={...catalog.find(b=>b.kind==='temptation')!};e.skipCurrentBlock();
  assert.equal(e.ddl,RULES.ddl);assert.equal(e.lateLandings,0);
  e.ddl=2.1;e.currentX=0;e.currentY=-300;e.drop();
  e.togglePause();e.update(5);assert.equal(e.lateLandings,0);
  e.togglePause();e.update(.6);assert.equal(e.phase,'CAMERA_SHIFT');assert.equal(e.lateLandings,0);
});

test('an actual timed-out release that misses reaches the DDL ending only from floor 8',()=>{
  for(const floor of [7,8]){
    const e=new GameEngine(3,'fixed');e.floor=floor;e.kpi.gpa=1;e.start();
    e.phaseTime=RULES.ddl;e.update(1/120);assert.equal(e.forced,true);
    e.currentX=e.topX+45;e.currentY=e.topY-RULES.height-1;e.update(.05);
    assert.equal(e.phase,'GAME_OVER');assert.equal(e.snapshot().ddlForcedMiss,true);
    assert.equal(e.lateLandings,0);
    assert.equal(getTitle(e.snapshot()).rule,floor===8?'deadline':'default');
  }
});
