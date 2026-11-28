import test from 'node:test';
import assert from 'node:assert/strict';
import memes from '../src/config/memePack.json';
import {restorePlayerStats,settleBirdEnding,pickBirdLine,personaIds,MAX_BIRD_CHARS,type LocalPlayerStats} from '../src/features/bird-ending';
import {createReportSvg} from '../src/features/report';
import {GameEngine} from '../src/game/engine';
const old=():LocalPlayerStats=>({totalRuns:3,bestScore:1000,bestFloor:30,unlockedPersonas:['early','default'],recentLowStreak:0});
const run=(score=600,floor=15,personaId='default')=>({score,floor,personaId});
const firstPick=()=>0;

test('first run unlocks one real persona even at zero points, before writing stats',()=>{
  const prev=restorePlayerStats(undefined),saved=JSON.stringify(prev);
  const result=settleBirdEnding(run(0,0,'early'),prev,firstPick);
  assert.equal(result.line.text,`解锁1/${memes.titles.length}人格！`);
  assert.equal(result.line.mood,'unlock');assert.equal(JSON.stringify(prev),saved);
  assert.equal(result.stats.totalRuns,1);assert.deepEqual(result.stats.unlockedPersonas,['early']);
  assert.equal(settleBirdEnding(run(0,0,'early'),result.stats,firstPick).line.mood,'comfort');
});
test('collection, double win and unlock outrank record, near-best and comfort',()=>{
  const all=settleBirdEnding(run(2000,50,personaIds.at(-1)!),{...old(),unlockedPersonas:personaIds.slice(0,-1)},firstPick);
  assert.equal(all.line.templateId,'all_unlocked:0');assert.equal(all.stats.unlockedPersonas.length,personaIds.length);
  assert.equal(settleBirdEnding(run(1200,25,'research'),old(),firstPick).line.templateId,'double_win:0');
  assert.equal(settleBirdEnding(run(10,1,'research'),old(),firstPick).line.templateId,'new_persona:0');
});
test('score and floor records use correct wording; ties and near-best are encouragement',()=>{
  assert.equal(settleBirdEnding(run(1001),old(),firstPick).line.text,'刷新历史最高分啦！');
  const floorOnly=settleBirdEnding(run(700,31),old(),firstPick);
  assert.equal(floorOnly.line.text,'新纪录！冲上31层');assert.equal(floorOnly.stats.bestScore,1000);
  for(const score of [880,1000])assert.equal(settleBirdEnding(run(score),old(),firstPick).line.mood,'encourage');
  assert.equal(settleBirdEnding(run(879),old(),firstPick).line.mood,'idle');
});
test('rough runs comfort the player; normal runs reset the low streak',()=>{
  assert.equal(settleBirdEnding(run(600,5),old(),firstPick).line.text,'手感不好，下回再来！');
  const low=settleBirdEnding(run(449,6),old(),firstPick);
  assert.equal(low.line.mood,'comfort');assert.equal(low.stats.recentLowStreak,1);
  assert.equal(settleBirdEnding(run(300,8),low.stats,firstPick).stats.recentLowStreak,2);
  assert.equal(settleBirdEnding(run(),low.stats,firstPick).stats.recentLowStreak,0);
});
test('all templates fit one ten-character line at extreme values, without immediate repeats',()=>{
  for(const key of Object.keys(memes.birdEndingLines) as (keyof typeof memes.birdEndingLines)[]){
    for(const f of [0,99,1000,Number.MAX_SAFE_INTEGER])for(const n of [0,.2,.5,.99]){
      const a=pickBirdLine(key,{u:20,t:20,f},undefined,()=>n);
      const b=pickBirdLine(key,{u:20,t:20,f},a.templateId,()=>n);
      assert.ok([...a.text].length<=MAX_BIRD_CHARS);assert.doesNotMatch(a.text,/[{}\n]/);
      assert.notEqual(a.templateId,b.templateId);
    }
  }
});
test('old leaderboards backfill known titles; duplicate and unknown IDs cannot inflate progress',()=>{
  const records=[{score:850,floor:31,title:memes.titles[0].name},{score:900,floor:20,title:'Old renamed title'},{score:500,floor:12,title:memes.titles[0].name}];
  const recovered=restorePlayerStats(undefined,records);
  assert.deepEqual(recovered.unlockedPersonas,[personaIds[0]]);assert.equal(recovered.totalRuns,3);
  assert.equal(recovered.bestScore,900);assert.equal(recovered.bestFloor,31);
  assert.deepEqual(restorePlayerStats({...recovered,unlockedPersonas:['early','early','unknown']},records).unlockedPersonas,['early',personaIds[0]]);
});
test('collection and best floor survive refresh and top-ten leaderboard eviction',async()=>{
  const values=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:globalThis.localStorage}});
  try{
    const {usePreferences}=await import('../src/store');
    usePreferences.setState({records:[],playerStats:restorePlayerStats(undefined)});
    for(let i=0;i<12;i++)usePreferences.getState().save({date:String(i),score:i*100,floor:i===0?40:10,gpa:0,title:memes.titles[i].name,personaId:personaIds[i]});
    assert.equal(usePreferences.getState().records.length,10);
    await usePreferences.persist.rehydrate();
    const stats=usePreferences.getState().playerStats;
    assert.equal(stats.totalRuns,12);assert.equal(stats.unlockedPersonas.length,12);
    assert.equal(stats.bestScore,1100);assert.equal(stats.bestFloor,40);
    const line=usePreferences.getState().save({date:'next',score:500,floor:10,gpa:0,title:memes.titles[0].name,personaId:personaIds[0]});
    assert.equal(line.mood,'idle');assert.equal(usePreferences.getState().playerStats.unlockedPersonas.length,12);
  }finally{Reflect.deleteProperty(globalThis,'localStorage');Reflect.deleteProperty(globalThis,'window');}
});
test('report retains the frozen bird line and mood without showing the old fixed copy',()=>{
  const result=settleBirdEnding(run(10,1,'early'),restorePlayerStats(undefined),firstPick);
  const e=new GameEngine(1),svg=createReportSvg(e.snapshot(),[],'qr','bird',0,result.line);
  assert.match(svg,/解锁1\/20人格！/);assert.match(svg,/data-bird-mood="unlock"/);
  assert.doesNotMatch(svg,/>爱你老己<|>下把再来<|SEED/);
  assert.equal(svg,createReportSvg(e.snapshot(),[],'qr','bird',0,result.line));
});
