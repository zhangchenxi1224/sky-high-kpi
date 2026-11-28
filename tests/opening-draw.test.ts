import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {drawBlock,weights,seeded,OPENING_DRAW_RULES,type Kind} from '../src/game/rules';

test('opening study cooldown redistributes to positive types and preserves fitness and temptation odds',()=>{
  for(let n=1;n<=8;n++)for(const gpa of [0,.3,2])for(const high of [false,true])for(const recentTemptation of [false,true]){
    const normal=weights(n,high,{gpa,recentTemptation});
    const cooled=weights(n,high,{gpa,recentTemptation,history:['study','study']});
    assert.equal(cooled[0],0);assert.equal(cooled[8],normal[8]);assert.equal(cooled[7],normal[7]);
    assert.ok(Math.abs(cooled.reduce((sum,p)=>sum+p,0)-1)<1e-12);
    assert.ok(Math.abs(cooled[1]/cooled[2]-normal[1]/normal[2])<1e-12);
    for(const history of [[],['study'],['study','volunteer'],['volunteer','study']] as Kind[][]){
      assert.deepEqual(weights(n,high,{gpa,recentTemptation,history}),normal);
    }
  }
});

test('one hundred thousand seeded openings cannot contain three consecutive study offers',()=>{
  let originalThreeStudy=0;
  for(let seed=1;seed<=100000;seed++){
    const rng=seeded(seed),oldRng=seeded(seed),history:Kind[]=[],baseline:Kind[]=[];
    for(let n=1;n<=OPENING_DRAW_RULES.lastFloor;n++){
      history.push(drawBlock(n,rng,false,history.slice(-3).includes('temptation'),2,history).kind);
      if(n<=3)baseline.push(drawBlock(n,oldRng,false,false,2).kind);
      assert.ok(!history.slice(-3).every(kind=>kind==='study')||history.length<3);
    }
    if(baseline.every(kind=>kind==='study'))originalThreeStudy++;
    assert.ok(new Set(history.slice(0,3)).size>=2||history[0]!=='study');
  }
  assert.ok(Math.abs(originalThreeStudy/100000-.064)<.01);
});

test('normal engine wires in draw history and stops the opening restriction from floor nine',()=>{
  const e=new GameEngine(123);e.random=()=>0;
  const offered:Kind[]=[];
  for(let floor=0;floor<11;floor++){
    e.floor=floor;e.spawn();offered.push(e.current!.kind);
  }
  assert.deepEqual(offered.slice(0,8),['study','study','volunteer','study','study','volunteer','study','study']);
  assert.deepEqual(offered.slice(8),['study','study','study']);
  for(const n of [9,20,35,80,500])for(const high of [false,true]){
    assert.deepEqual(weights(n,high,{history:['study','study']}),weights(n,high));
  }
  const fixed=new GameEngine(123,'fixed');fixed.random=()=>0;fixed.drawHistory=['study','study'];fixed.drawIndex=0;fixed.start();
  assert.equal(fixed.current!.id,'study');
  const fresh=new GameEngine(123);fresh.random=()=>0;fresh.start();assert.equal(fresh.current!.kind,'study');
});
