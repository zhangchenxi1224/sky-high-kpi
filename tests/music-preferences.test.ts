import test from 'node:test';
import assert from 'node:assert/strict';

test('every visit enables music and FX, keeps bird talk quiet, and preserves scores and scenery',async()=>{
  const records=[{date:'2026-11-28',floor:28,score:1240,gpa:2.45,title:'Saved record'}];
  const values=new Map([['sky-high-kpi-v1',JSON.stringify({version:0,state:{music:false,effects:false,night:true,detailedSway:false,birdBubble:true,records}})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:globalThis.localStorage}});
  try{
    const {usePreferences}=await import('../src/store');
    await usePreferences.persist.rehydrate();
    const migrated=usePreferences.getState();
    assert.equal(migrated.music,true);assert.deepEqual(migrated.records,records);
    assert.equal(migrated.effects,true);assert.equal(migrated.night,true);assert.equal(migrated.birdBubble,false);assert.equal(migrated.detailedSway,false);
    assert.equal(JSON.parse(values.get('sky-high-kpi-v1')!).version,1);
    migrated.toggle('music');assert.equal(usePreferences.getState().music,false);
    migrated.toggle('effects');assert.equal(usePreferences.getState().effects,false);
    usePreferences.setState({birdBubble:true});assert.equal(usePreferences.getState().birdBubble,true);
    const stored=JSON.parse(values.get('sky-high-kpi-v1')!).state;
    for(const key of ['music','effects','birdBubble'])assert.equal(key in stored,false);
    await usePreferences.persist.rehydrate();assert.equal(usePreferences.getState().music,true);assert.equal(usePreferences.getState().effects,true);
    assert.equal(usePreferences.getState().birdBubble,false);
    assert.deepEqual(usePreferences.getState().records,records);
  }finally{Reflect.deleteProperty(globalThis,'localStorage');Reflect.deleteProperty(globalThis,'window');}
});
