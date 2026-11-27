import test from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_BIRD_FOOD,addScoreToBird,birdDateKey,feedBirdDay,normalizeBirdDay} from '../src/features/bird';

const date=new Date(2026,10,27,12);
const day={date:birdDateKey(date),food:2,fed:1};

test('bird food resets when the local day changes',()=>{
  assert.deepEqual(normalizeBirdDay(day,new Date(2026,10,28,1)),{date:'2026-11-28',food:0,fed:0});
  assert.deepEqual(normalizeBirdDay(day,date),day);
});

test('run score converts to daily bird food with a fixed cap',()=>{
  assert.deepEqual(addScoreToBird(day,416,date),{day:{...day,food:7},gained:5});
  assert.deepEqual(addScoreToBird({...day,food:5},2000,date),{day:{...day,food:DAILY_BIRD_FOOD},gained:3});
  assert.deepEqual(addScoreToBird({...day,food:DAILY_BIRD_FOOD},500,date).gained,0);
  assert.equal(addScoreToBird(day,0,date).gained,0);
});

test('feeding consumes one food and records one daily interaction',()=>{
  assert.deepEqual(feedBirdDay(day,date),{...day,food:1,fed:2});
  assert.deepEqual(feedBirdDay({...day,food:0},date),{...day,food:0});
});

test('corrupt saved bird data is clamped to safe daily values',()=>{
  assert.deepEqual(normalizeBirdDay({date:day.date,food:99,fed:-4},date),{date:day.date,food:DAILY_BIRD_FOOD,fed:0});
  assert.deepEqual(normalizeBirdDay('broken',date),{date:day.date,food:0,fed:0});
});
