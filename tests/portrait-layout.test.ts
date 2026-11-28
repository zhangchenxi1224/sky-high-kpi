import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitLayout} from '../src/view/layout';
import {GameEngine} from '../src/game/engine';
import {RULES} from '../src/game/rules';
import {hookPosition} from '../src/game/hook';
import {CRANE_SCALE,CRANE_HEAD} from '../src/game/crane';
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('portrait HUD keeps its 44px panel and 52px tools above the playfield, including safe-area insets',()=>{
  for(const [width,height] of [[320,480],[320,568],[360,740],[390,844],[428,926],[600,640]]){
    for(const safe of [0,34,59]){
      const {top}=portraitLayout(width,height,safe);
      assert.ok(top>=Math.max(6,safe)+52+6);
      assert.equal(top%2,0);
    }
  }
});

test('crane restores the previous 80% size around the screen edge without a release jump',()=>{
  approx(CRANE_SCALE,.8);
  for(const [width,height,top] of [[430,900,86],[430,580,86],[1280,720,0]]){
    for(const floor of [0,3,6,18,80]){
      const e=new GameEngine(1);e.floor=floor;e.setViewport(width,height,top);e.start();
      const oldLength=e.hangingScreen+24,roof=e.topY+e.groundScreen+e.cameraY;
      const oldPivot=Math.min(-48,roof-(width>height?2.5:1.6)*RULES.height-RULES.height-24-oldLength);
      for(const phase of [-Math.PI/2,0,Math.PI/2]){
        e.phaseAngle=phase;e.updateHook();const original=hookPosition(phase,e.params.angle,oldLength);
        approx(e.hookX-e.anchorX,original.x*CRANE_SCALE);
        approx(top+(e.hookY-CRANE_HEAD.top)*e.viewZoom,(top+(oldPivot+original.y-24)*e.viewZoom)*.8);
        assert.ok(e.currentY+RULES.height<e.topY);
        const x=e.currentX,y=e.currentY;e.drop();approx(e.currentX,x);approx(e.currentY,y);e.phase='SWINGING';
      }
    }
  }
});

test('desktop and landscape keep their original full-canvas viewport',()=>{
  for(const [width,height] of [[844,390],[1280,720],[720,1280],[600,600]])assert.deepEqual(portraitLayout(width,height,34),{top:0});
});
