import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine';
import {catalog,difficulty,drawBlock,seeded,weights,type Kind} from '../src/game/rules';

test('skipping an actual random temptation guarantees three subsequent non-temptation offers',()=>{
  const e=new GameEngine(3);e.floor=34;e.kpi.gpa=2;e.random=()=>.94;e.start();
  assert.equal(e.current?.kind,'temptation');assert.equal(e.skipCurrentBlock(),true);
  for(let i=0;i<3;i++){assert.notEqual(e.current?.kind,'temptation');e.spawn();}
  assert.equal(e.current?.kind,'temptation');
  assert.equal(e.floor,34);assert.equal(e.kpi.gpa,2);
});

test('low GPA removes only costly GPA variants and returns their probability to the positive pool',()=>{
  for(const floor of [4,8,20,35,80])for(const gpa of [0,.14,.15,.29])for(const high of [false,true]){
    const odds=weights(floor,high,{gpa}),regular=weights(floor,high,{gpa:.3});
    assert.ok(Math.abs(odds[7]-regular[7]*.65)<1e-12);assert.equal(odds[8],.04);
    assert.ok(Math.abs(odds.reduce((a,b)=>a+b)-1)<1e-10);
    for(let i=0;i<1000;i++)assert.ok(!['tempt_hongguo','tempt_delta'].includes(drawBlock(floor,()=>(i+.5)/1000,high,false,gpa).id));
  }
});

test('long natural draw streams respect cooldown and the expected reduced frequency',()=>{
  for(const high of [false,true]){
    const rng=seeded(20261128),history:Kind[]=[];let count=0,last=-4;
    for(let i=0;i<100000;i++){
      const kind=drawBlock(80,rng,high,history.slice(-3).includes('temptation'),2).kind;
      if(kind==='temptation'){assert.ok(i-last>=4);last=i;count++;}
      history.push(kind);if(history.length>3)history.shift();
    }
    const p=high?.045:.03,expected=p/(1+3*p);
    assert.ok(Math.abs(count/100000-expected)<.003,`${high}: ${count}`);
  }
});

test('even accepting only temptation cannot pin difficulty or make GPA negative',()=>{
  const e=new GameEngine(3);e.kpi.gpa=1;let previous=difficulty(1).omega;
  for(let i=0;i<100;i++){
    if(e.phase==='READY')e.start();
    e.current={...catalog.find(b=>b.kind==='temptation')!};e.phase='SWINGING';e.currentX=e.topX;e.currentY=e.topY-89;
    e.drop();e.update(.05);assert.equal(e.phase,'CAMERA_SHIFT');
    assert.equal(e.rollback,0);assert.ok(e.kpi.gpa>=0);
    const d=difficulty(e.floor+1,e.rollback);assert.ok(d.omega>previous);previous=d.omega;
    e.update(.5);
  }
  assert.ok(difficulty(101,e.rollback).effective>=99);

});
