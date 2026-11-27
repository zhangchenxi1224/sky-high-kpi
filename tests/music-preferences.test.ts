import test from 'node:test';
import assert from 'node:assert/strict';

test('legacy silent defaults migrate once without losing scores or subsequent music choices',async()=>{
  const records=[{date:'2026-11-28',floor:28,score:1240,gpa:2.45,title:'Saved record'}];
  const values=new Map([['sky-high-kpi-v1',JSON.stringify({version:0,state:{music:false,effects:false,night:true,detailedSway:false,birdBubble:true,records}})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:globalThis.localStorage}});
  try{
    const {usePreferences}=await import('../src/store');
    await usePreferences.persist.rehydrate();
    const migrated=usePreferences.getState();
    assert.equal(migrated.music,true);assert.deepEqual(migrated.records,records);
    assert.equal(migrated.effects,false);assert.equal(migrated.night,true);assert.equal(migrated.birdBubble,false);
    assert.equal(JSON.parse(values.get('sky-high-kpi-v1')!).version,1);
    migrated.toggle('music');assert.equal(usePreferences.getState().music,false);
    usePreferences.setState({birdBubble:true});assert.equal(usePreferences.getState().birdBubble,true);
    assert.equal('birdBubble' in JSON.parse(values.get('sky-high-kpi-v1')!).state,false);
    await usePreferences.persist.rehydrate();assert.equal(usePreferences.getState().music,false);
    assert.equal(usePreferences.getState().birdBubble,false);
    assert.deepEqual(usePreferences.getState().records,records);
  }finally{Reflect.deleteProperty(globalThis,'localStorage');Reflect.deleteProperty(globalThis,'window');}
});
