// Offline proposal evaluation only: this file is not imported by the playable game.
// Both variants use the same seed, 60 advancing offers, eligible GPA and ordinary pressure.
// This measures draw variety, not player survival, scoring or real-world win rates.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {catalog,drawBlock,weights,seeded,OPENING_DRAW_RULES,RULES,TEMPTATION_RULES,type Kind} from '../src/game/rules';

const kinds:Kind[]=['study','volunteer','practice','research','competition','coffee','notes','temptation','fitness'];
// Desired probabilities at the anchor floors. All rows sum to 100.
const proposal=[
  {floor:3,percent:[40,22,16,12,10,0,0,0,0]},
  {floor:8,percent:[38,17,12,12,10,4,2,1,4]},
  {floor:20,percent:[40,12,10,14,11,4,3,2,4]},
  {floor:35,percent:[38,10,10,15,13,4,3,3,4]},
];
for(const row of proposal)assert.equal(row.percent.reduce((a,b)=>a+b,0),100);
function proposedWeights(n:number,history:readonly Kind[],high=false,gpa=2){
  const floor=Math.min(35,Math.max(3,n)),index=proposal.findIndex(row=>row.floor>=floor);
  const a=proposal[Math.max(0,index-1)],b=proposal[index],t=index===0?0:(floor-a.floor)/(b.floor-a.floor),smooth=t*t*(3-2*t);
  const base=a.percent.map((p,i)=>(p+(b.percent[i]-p)*smooth)/100);
  const recent=history.slice(-OPENING_DRAW_RULES.maxStudyStreak);
  const rest=n<=OPENING_DRAW_RULES.lastFloor&&recent.length===OPENING_DRAW_RULES.maxStudyStreak&&recent.every(k=>k==='study');
  const temptation=history.slice(-TEMPTATION_RULES.cooldown).includes('temptation')||gpa<TEMPTATION_RULES.minGpa?0:base[7]*(high?TEMPTATION_RULES.highPressureMultiplier:1);
  const fitness=n>=4?RULES.fitnessChance:0;
  const positive=base.slice(0,7).map((p,i)=>rest&&i===0?0:p),total=positive.reduce((a,b)=>a+b,0);
  return [...positive.map(p=>p/total*(1-fitness-temptation)),temptation,fitness];
}
function proposedDraw(n:number,rng:()=>number,history:readonly Kind[]){
  let roll=rng(),index=0;const odds=proposedWeights(n,history);
  while(index<odds.length-1&&roll>=odds[index])roll-=odds[index++];
  const list=catalog.filter(block=>block.kind===kinds[index]);
  return list[Math.min(list.length-1,Math.floor(rng()*list.length))];
}
for(let n=1;n<=100;n++)for(const high of [false,true])for(const gpa of [0,2]){
  for(const history of [[],['study','study'],['temptation']] as Kind[][]){
    const odds=proposedWeights(n,history,high,gpa);
    assert.ok(odds.every(p=>p>=0));assert.ok(Math.abs(odds.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.equal(odds[8],n>=4?.04:0);assert.ok(Math.abs(odds[7]-weights(n,high,{history,recentTemptation:history.includes('temptation'),gpa})[7])<1e-12);
  }
}
const runs=50000,stages=[[1,3],[4,8],[9,20],[21,35],[36,60]];
const rounded=(n:number)=>Number(n.toFixed(3));
function simulate(variant:'A'|'B'){
  const counts=stages.map(()=>kinds.map(()=>0));let distinct=0,gpaCount=0,allFive=0,longGapRuns=0;const longestGaps:number[]=[];
  for(let seed=1;seed<=runs;seed++){
    const rng=seeded(seed),history:Kind[]=[],firstCore=new Set<Kind>();let gap=0,longest=0;
    for(let n=1;n<=60;n++){
      const block=variant==='A'?drawBlock(n,rng,false,history.slice(-3).includes('temptation'),2,history):proposedDraw(n,rng,history);
      const kind=block.kind,stage=stages.findIndex(([a,b])=>n>=a&&n<=b);counts[stage][kinds.indexOf(kind)]++;
      if(n<=8){if(kinds.indexOf(kind)<5)firstCore.add(kind);if(kind==='study'||kind==='notes')gpaCount++;}
      if(n>=9){gap=kind==='study'||kind==='notes'?0:gap+1;longest=Math.max(longest,gap);}
      history.push(kind);if(history.length>4)history.shift();
    }
    distinct+=firstCore.size;if(firstCore.size===5)allFive++;
    longestGaps.push(longest);if(longest>=8)longGapRuns++;
  }
  longestGaps.sort((a,b)=>a-b);
  return {meanCoreTypesFirst8:rounded(distinct/runs),allFiveCoreTypesFirst8Percent:rounded(allFive/runs*100),meanGpaOffersFirst8:rounded(gpaCount/runs),runsWith8OfferGpaDroughtAfterFloor8Percent:rounded(longGapRuns/runs*100),maxGpaDroughtP95AfterFloor8:longestGaps[Math.ceil(runs*.95)-1],stageObservedPercent:counts.map((row,i)=>({floors:stages[i],percent:row.map(count=>rounded(count/(runs*(stages[i][1]-stages[i][0]+1))*100))}))};
}
const result={status:'proposal_not_deployed',rulesVersion:RULES.version,runsPerVariant:runs,offersPerRun:60,seeds:'1..50000',conditions:'Draw-only: normal pressure, GPA eligible (2.0), every offer advances the target floor, includes history cooldown; no landing/score/survival model.',kinds,proposalAnchors:proposal,baselineAnchors:proposal.map(row=>({floor:row.floor,percent:weights(row.floor).map(p=>rounded(p*100))})),A:simulate('A'),B:simulate('B')};
writeFileSync('docs/balance-simulation-20261128.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({A:result.A,B:result.B},null,2));
