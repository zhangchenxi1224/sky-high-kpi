import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/view/renderer';
import {GameEngine} from '../src/game/engine';
import {catalog} from '../src/game/rules';

test('danmaku paints above sky but behind both placed rooms and the crane',()=>{
  const order:string[]=[];
  const ctx=new Proxy({measureText:(text:string)=>({width:text.length*8}),fillText:()=>order.push('danmaku')},{get:(obj,key)=>key in obj?(obj as any)[key]:()=>{}});
  const r=Object.assign(Object.create(Renderer.prototype),{ctx,width:430,height:760,scale:1,portraitTop:0,viewportTop:0,effects:false,reducedMotion:{matches:false},canvas:{clientWidth:430,clientHeight:760},drawSky:()=>order.push('sky'),drawGround:()=>{},room:()=>order.push('room'),rope:()=>order.push('crane'),blockLabel:()=>{}}) as Renderer;
  const e=new GameEngine(1);e.floor=1;e.tower=[{x:0,y:-88,block:catalog[0],perfect:true}];e.setViewport(430,760);e.start();e.say('稳住，绩点在涨！');e.time=1;
  r.render(e);assert.ok(order.indexOf('sky')<order.indexOf('danmaku'));assert.ok(order.indexOf('danmaku')<order.indexOf('room'));assert.ok(order.indexOf('danmaku')<order.indexOf('crane'));
  order.length=0;e.time=4;r.render(e);assert.ok(!order.includes('danmaku'));
});

test('gold truss rotates from the screen edge and terminates at the existing hook',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
  Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:2});
  try{
    const shifts:number[][]=[],angles:number[]=[],images:any[][]=[];
    const ctx={getTransform:()=>({a:1.5,d:1.5,e:0,f:192}),save(){},restore(){},setTransform(){},translate:(...p:number[])=>shifts.push(p),rotate:(a:number)=>angles.push(a),beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage:(...args:any[])=>images.push(args)};
    const r=Object.assign(Object.create(Renderer.prototype),{ctx,craneSheet:{complete:true,naturalWidth:2172}}) as Renderer;
    r.rope(200,-48,120,180);
    assert.deepEqual(shifts[0],[150,0]);assert.equal(angles[0],Math.atan2(213,-60));
    assert.equal(images.length,2);assert.deepEqual(images[0].slice(1,5),[107,44,1960,245]);assert.deepEqual(images[1].slice(1,5),[1000,396,174,296]);
    Object.assign(r,{viewportTop:128,scale:.75,canvas:{clientWidth:320}});shifts.length=0;angles.length=0;images.length=0;
    r.rope(200,-48,120,180);
    assert.deepEqual(shifts[0],[160,0]);assert.equal(angles[0],Math.atan2(213,-70));
    const length=images[0][7]*1800/1960;
    assert.ok(Math.abs(160+length*Math.cos(angles[0])-90)<1e-8);
    assert.ok(Math.abs(length*Math.sin(angles[0])-213)<1e-8);
    assert.ok(images[0][5]<0,'the top fixture extends beyond the screen edge');
  }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else delete (globalThis as any).devicePixelRatio;}
});
