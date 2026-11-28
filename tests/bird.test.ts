import test from 'node:test';
import assert from 'node:assert/strict';
import {earnBirdFood,feedBird,normalizeBirdDay,placeBirdBubble,nextBirdPerch,birdBubbleDelay} from '../src/features/bird';
const today=new Date(2026,10,27,12),tomorrow=new Date(2026,10,28,0,1);
const empty=()=>normalizeBirdDay(null,today);

test('bird food rounds up score per hundred, caps inventory at eight, and supports refill after feeding',()=>{
  assert.equal(earnBirdFood(empty(),0,today).gained,0);
  assert.equal(earnBirdFood(empty(),1,today).gained,1);
  assert.equal(earnBirdFood(empty(),100,today).gained,1);
  assert.equal(earnBirdFood(empty(),101,today).gained,2);
  const full=earnBirdFood(empty(),1500,today);assert.equal(full.day.food,8);
  assert.equal(earnBirdFood(full.day,200,today).gained,0);
  const fed=feedBird(full.day,today);assert.equal(fed.food,7);assert.equal(fed.fed,1);
  const refilled=earnBirdFood(fed,500,today);assert.equal(refilled.gained,1);assert.equal(refilled.day.fed,1);
  assert.deepEqual(feedBird(empty(),today),empty());
});

test('local midnight resets food and fed count; invalid persisted data is bounded',()=>{
  const prior=feedBird(earnBirdFood(empty(),400,today).day,today);
  assert.deepEqual(normalizeBirdDay(prior,tomorrow),{date:'2026-11-28',food:0,fed:0});
  assert.deepEqual(feedBird(prior,tomorrow),{date:'2026-11-28',food:0,fed:0});
  assert.deepEqual(normalizeBirdDay({...empty(),food:99.9,fed:-2},today),{...empty(),food:8,fed:0});
  assert.deepEqual(normalizeBirdDay({...empty(),food:NaN,fed:Infinity},today),empty());
  assert.equal(earnBirdFood(empty(),Infinity,today).gained,0);
});

test('bird bubble stays inside phone and desktop viewports at every screen edge',()=>{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:720}]){
    const size={width:206,height:120};
    for(const left of [0,viewport.width/2,viewport.width-86])for(const top of [0,viewport.height-86]){
      const p=placeBirdBubble({left,right:left+86,top,bottom:top+86},size,viewport);
      assert.ok(p.left>=8&&p.top>=8);assert.ok(p.left+size.width<=viewport.width-8);assert.ok(p.top+size.height<=viewport.height-8);
    }
  }
});

test('bird hops choose another perch and bubble intervals stay between 45 and 75 seconds',()=>{
  for(let current=0;current<7;current++)for(const random of [()=>0,()=>.5,()=>.999999]){
    const next=nextBirdPerch(current,7,random);assert.notEqual(next.perch,current);assert.ok(next.perch>=0&&next.perch<7);
  }
  assert.equal(birdBubbleDelay(()=>0),45000);assert.equal(birdBubbleDelay(()=>1),75000);
});

test('bird bubble avoids the start button and home links even near the lower screen edge',()=>{
  const controls={left:567,right:713,top:338,bottom:430},size={width:228,height:114};
  const p=placeBirdBubble({left:468,right:572,top:446,bottom:550},size,{width:1280,height:720},[controls]);
  assert.ok(p.left>=controls.right||p.left+size.width<=controls.left||p.top>=controls.bottom||p.top+size.height<=controls.top);
});
