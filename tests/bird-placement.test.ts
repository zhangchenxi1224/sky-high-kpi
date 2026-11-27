import test from 'node:test';
import assert from 'node:assert/strict';
import {placeBirdBubble,randomBirdPerch} from '../src/ui/birdPlacement';

const bubble={width:232,height:120};

test('wide layouts prefer the roomier side of the bird',()=>{
  const placement=placeBirdBubble({left:420,top:440,right:520,bottom:540},bubble,{width:960,height:720});
  assert.equal(placement.direction,'right');
  assert.ok(placement.left>=8&&placement.left+bubble.width<=952);
  assert.ok(placement.top>=8&&placement.top+bubble.height<=712);
});

test('a bird near the right edge opens its bubble to the left',()=>{
  const placement=placeBirdBubble({left:800,top:440,right:900,bottom:540},bubble,{width:960,height:720});
  assert.equal(placement.direction,'left');
});

test('narrow layouts fall back to a fully visible vertical placement',()=>{
  const placement=placeBirdBubble({left:155,top:570,right:235,bottom:650},bubble,{width:390,height:844});
  assert.ok(placement.direction==='top'||placement.direction==='bottom');
  assert.ok(placement.left>=8&&placement.left+bubble.width<=382);
  assert.ok(placement.top>=8&&placement.top+bubble.height<=836);
});

test('clamped placements always stay inside the viewport margins',()=>{
  const placement=placeBirdBubble({left:-20,top:10,right:60,bottom:90},{width:340,height:180},{width:360,height:300});
  assert.ok(placement.left>=8&&placement.top>=8);
  assert.ok(placement.left+340<=352);
  assert.ok(placement.top+180<=292);
});

test('seven perches are random, non-repeating and derive their direction',()=>{
  assert.deepEqual(randomBirdPerch(0,7,()=>0),{perch:1,heading:'right'});
  assert.deepEqual(randomBirdPerch(3,7,()=>.999),{perch:6,heading:'right'});
  assert.deepEqual(randomBirdPerch(6,7,()=>0),{perch:0,heading:'left'});
  for(let i=0;i<100;i++)assert.notEqual(randomBirdPerch(4,7,()=>i/100).perch,4);
});
