import test from 'node:test';
import assert from 'node:assert/strict';
import {comboFrame,emptyComboCue} from '../src/features/combo';
import {dissolveFrame,dissolveThreshold} from '../src/features/dissolve';
import {GameEngine} from '../src/game/engine';
import {catalog,RULES} from '../src/game/rules';
import {Sound} from '../src/features/audio';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function land(e:GameEngine,id='volunteer',offset=0){
  if(e.phase==='READY')e.start();e.current={...catalog.find(b=>b.id===id)!};e.phase='SWINGING';e.currentX=e.topX+offset;e.currentY=e.topY-RULES.height-1;e.drop();e.update(.05);
}
test('combo bursts in four frames, settles to a persistent watermark and breaks in 220ms',()=>{
  const cue={value:5,at:10,broken:false,serial:1};
  [.01,.13,.25,.37].forEach((t,i)=>{const f=comboFrame(cue,10+t);near(f.scale,[1.45,.95,1.05,1][i]);assert.equal(f.stage,'burst');near(f.opacity,1);});
  near(comboFrame(cue,10.54).opacity,.71);
  for(const t of [.61,1,5,10]){const f=comboFrame(cue,10+t);assert.equal(f.stage,'hold');near(f.scale,.85);near(f.opacity,.42);}
  const broken={...cue,broken:true};near(comboFrame(broken,10.11).opacity,.5);assert.equal(comboFrame(broken,10.23).stage,'hidden');
  assert.equal(comboFrame(emptyComboCue(),0).stage,'hidden');
});
test('combo uses actual study bonus, advances in place, freezes during pause, and breaks on success or miss',()=>{
  const e=new GameEngine(1,'fixed');land(e,'study');assert.equal(e.comboCue.value,2);e.update(.7);assert.equal(comboFrame(e.comboCue,e.time).stage,'hold');
  const at=e.time;e.paused=true;e.update(3);near(e.time,at);e.paused=false;
  land(e);assert.equal(e.comboCue.value,3);assert.equal(e.comboCue.serial,2);
  land(e,'research',20);assert.equal(e.combo,0);assert.equal(e.comboCue.value,3);assert.equal(e.comboCue.broken,true);
  land(e,'study');assert.equal(e.comboCue.value,2);assert.equal(e.comboCue.broken,false);
  land(e,'study',60);assert.equal(e.phase,'GAME_OVER');assert.equal(e.combo,0);assert.equal(e.comboCue.broken,true);
});
test('fever cues follow successful judgments while skipping preserves the resident combo',()=>{
  const e=new GameEngine(1,'fixed');for(let i=0;i<7;i++)land(e);
  assert.equal(e.combo,7);assert.equal(comboFrame(e.comboCue,e.time).tier,'fever');near(e.feverAt,e.lastLandTime);
  e.update(.6);e.current={...catalog.find(b=>b.kind==='temptation')!};e.phase='SWINGING';const cue={...e.comboCue};assert.ok(e.skipCurrentBlock());assert.deepEqual(e.comboCue,cue);
  assert.equal(comboFrame(cue,e.time,false).scale,.85);assert.equal(comboFrame(cue,cue.at+.3,false).flash,0);
});
test('dissolve grid has stable bounded timings, proceeds upwards and covers before revealing',()=>{
  for(let row=0;row<84;row++)for(let col=0;col<39;col++){const t=dissolveThreshold(col,row,84);assert.ok(t>0&&t<1);assert.equal(t,dissolveThreshold(col,row,84));}
  assert.ok(dissolveThreshold(10,83,84)<dissolveThreshold(10,0,84));
  assert.deepEqual(dissolveFrame(0),{covered:false,done:false,progress:0});
  assert.equal(dissolveFrame(399).covered,false);assert.equal(dissolveFrame(400).covered,true);assert.equal(dissolveFrame(799).done,false);assert.equal(dissolveFrame(800).done,true);
  const e=new GameEngine(1);e.start();e.paused=true;e.update(.8);near(e.ddl,6);e.paused=false;e.update(.1);assert.ok(e.ddl<6);
});
test('MP3 background music loops independently of effects and pauses without losing position',async()=>{
  const audio={paused:true,loop:false,volume:0,preload:'',currentTime:42,plays:0,pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}};
  const sound=new Sound(()=>audio as unknown as HTMLAudioElement);sound.setMusic(true);assert.equal(audio.plays,0);
  await sound.unlock();assert.equal(audio.plays,1);assert.equal(audio.loop,true);near(audio.volume,.32);
  sound.effects=false;sound.paused=true;assert.equal(audio.paused,true);sound.paused=false;assert.equal(audio.paused,false);assert.equal(audio.currentTime,42);
  sound.setMusic(false);assert.equal(audio.paused,true);sound.setMusic(true);assert.equal(audio.paused,false);sound.dispose();assert.equal(audio.paused,true);
});
