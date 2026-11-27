import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitLayout} from '../src/view/layout';
import {GameEngine} from '../src/game/engine';
import {RULES} from '../src/game/rules';

test('portrait HUD keeps its 44px panel and 52px tools above the playfield, including safe-area insets',()=>{
  for(const [width,height] of [[320,480],[320,568],[360,740],[390,844],[428,926],[600,640]]){
    for(const safe of [0,34,59]){
      const {top,buffs}=portraitLayout(width,height,safe);
      assert.ok(top>=Math.max(6,safe)+52+6);
      assert.equal(top%2,0);assert.equal(buffs%2,0);
    }
  }
});

test('portrait buffs stay below the full crane sweep at all zoom levels and amplified angles',()=>{
  for(const [width,height] of [[320,480],[320,568],[390,844],[428,926],[600,640]]){
    const scale=width/height<.85?Math.min(width/430,height/760):height/720;
    const layout=portraitLayout(width,height,34);
    for(const floor of [0,2,3,4,6,18,80,200]){
      const e=new GameEngine(1);e.floor=floor;e.setViewport(width/scale,(height-layout.top)/scale);e.start();
      e.fitnessActive=true;e.angleMultiplier=1.15;
      for(let step=0;step<=120;step++){
        e.phaseAngle=step/120*Math.PI*2;e.updateHook();
        const roomBottom=layout.top+(e.hookY+24+RULES.height)*e.viewZoom*scale;
        assert.ok(roomBottom+16<=layout.buffs+1e-6,`${width}x${height}, ${floor}F, phase ${step}`);
      }
    }
  }
});

test('desktop and landscape keep their original full-canvas viewport',()=>{
  for(const [width,height] of [[844,390],[1280,720],[720,1280],[600,600]])assert.deepEqual(portraitLayout(width,height,34),{top:0,buffs:0});
});
