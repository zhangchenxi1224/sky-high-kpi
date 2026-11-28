import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {catalog,RULES} from '../src/game/rules';
import {createReportSvg,REPORT_SIZE,wrapReportComment} from '../src/features/report';

function land(e:GameEngine,id:string,offset=0){
  if(e.phase==='READY')e.start();
  e.current={...catalog.find(b=>b.id===id)!};e.phase='SWINGING';e.currentX=e.topX+offset;e.currentY=e.topY-RULES.height-1;
  e.drop();e.update(.05);assert.equal(e.phase,'CAMERA_SHIFT');
}
const status=(e:GameEngine,id:string)=>e.snapshot().statuses.find(s=>s.id===id);
test('HUD coffee countdown follows simulation time and freezes while paused',()=>{
  const e=new GameEngine(9,'fixed');assert.deepEqual(e.snapshot().statuses,[]);
  land(e,'coffee');assert.match(status(e,'coffee')!.label,/5s/);e.update(.5);
  e.togglePause();const before=status(e,'coffee');e.update(10);assert.deepEqual(status(e,'coffee'),before);
  e.togglePause();e.update(4.6);assert.equal(status(e,'coffee'),undefined);
});
test('HUD three-draw notes counts the active draw and clears immediately after the last landing',()=>{
  const e=new GameEngine(9,'fixed');land(e,'notes');
  for(let n=3;n>0;n--){assert.match(status(e,'notes')!.label,new RegExp(`×${n}$`));e.update(.5);assert.match(status(e,'notes')!.label,new RegExp(`×${n}$`));land(e,'study');}
  assert.equal(status(e,'notes'),undefined);
});
test('HUD keeps simultaneous speed and amplitude penalties visible with narrowing notes',()=>{
  const e=new GameEngine(9,'fixed');e.notesLeft=3;e.speedNext=1.12;e.angleNext=1.15;e.start();
  assert.deepEqual(e.snapshot().statuses.map(s=>s.id),['notes','research','competition']);
  assert.ok(e.angleMultiplier<1);land(e,'study');
  assert.deepEqual(e.snapshot().statuses.map(s=>s.id),['notes']);
});
test('HUD fitness and practice count remaining uses without stale statuses after landing',()=>{
  const e=new GameEngine(9,'fixed');e.random=()=>.99;land(e,'fitness');e.practiceLeft=2;
  for(let n=3;n>0;n--){e.update(.5);assert.match(status(e,'fitness')!.label,new RegExp(`×${n}$`));land(e,'study');}
  assert.equal(status(e,'fitness'),undefined);assert.equal(status(e,'practice'),undefined);
});
test('comic report renders empty and tall towers with finite coordinates and no seed/mode copy',()=>{
  const e=new GameEngine(497071720,'fixed');
  for(const floor of [0,3,180]){
    e.floor=floor;e.tower=Array.from({length:floor},(_,i)=>({block:catalog[0],x:(i%3-1)*20,y:-(i+1)*RULES.height,perfect:i%2===0}));
    const svg=createReportSvg(e.snapshot(),e.tower,'data:image/png;base64,abc','data:image/webp;base64,abc');
    assert.doesNotMatch(svg,/NaN|Infinity|SEED|497071720|自然挑战局|固定实验局|不代表真实学业评价/);
    assert.match(svg,new RegExp(`>${floor}F<`));assert.match(svg,/你的天际线，值得收藏/);
  }
  assert.deepEqual(REPORT_SIZE,{width:1080,height:1080});
});
test('report embedded image attributes escape quotes and XML markup',()=>{
  const svg=createReportSvg(new GameEngine(1).snapshot(),[],'x" onload="bad<>&','y');
  assert.ok(svg.includes('href="x&quot; onload=&quot;bad&lt;&gt;&amp;"'));
  assert.ok(!svg.includes(' onload="bad'));
});
test('report comment wraps long copy without orphan punctuation or missing characters',()=>{
  for(const value of ['三次接住红果、直播和跑刀，GPA 被啃掉 0.45，快乐倒是很稳定。','成功之路步履蹒跚，举旗呐喊1103；分数卡在1103，编外老铁也能站上峡谷之巅。泽哥看了都得说一句：行了老铁，进来坐。']){
    const lines=wrapReportComment(value);assert.equal(lines.join(''),value);assert.ok(lines.length<=2);assert.ok(lines.every(line=>line.length>6&&!/^[，。；！]/.test(line)));
  }
});
