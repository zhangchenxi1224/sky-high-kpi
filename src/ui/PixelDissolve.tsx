import {useEffect,useRef} from 'react';
import {DISSOLVE_CELL,DISSOLVE_DURATION,dissolveFrame,dissolveThreshold} from '../features/dissolve';
export function PixelDissolve({onCovered,onComplete,motion}:{onCovered:()=>void;onComplete:()=>void;motion:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),callbacks=useRef({onCovered,onComplete});
  callbacks.current={onCovered,onComplete};
  useEffect(()=>{
    const surface=canvas.current!,ctx=surface.getContext('2d')!;
    const start=performance.now(),duration=motion?DISSOLVE_DURATION:160;
    let frameId=0,switched=false;
    const draw=(now:number)=>{
      const w=innerWidth,h=innerHeight,cell=DISSOLVE_CELL,cols=Math.ceil(w/cell),rows=Math.ceil(h/cell);
      if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;ctx.imageSmoothingEnabled=false;}
      const frame=dissolveFrame(now-start,duration);
      if(frame.covered&&!switched){ctx.fillStyle='#ffd43b';ctx.fillRect(0,0,w,h);switched=true;callbacks.current.onCovered();frameId=requestAnimationFrame(draw);return;}
      ctx.clearRect(0,0,w,h);
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const threshold=dissolveThreshold(col,row,rows),age=frame.progress-threshold;
        const shown=frame.covered?age<0:age>=0;
        if(shown){ctx.fillStyle=(col+row)%7===0?'#ffe066':'#ffd43b';ctx.fillRect(col*cell,row*cell,cell,cell);}
        if(motion&&Math.abs(age)<.045){
          ctx.fillStyle='#fff9db66';ctx.fillRect(col*cell-2,row*cell-2,cell+4,cell+4);
          ctx.fillStyle='#fff9db';ctx.fillRect(col*cell,row*cell,cell,cell);
        }
        if(motion&&frame.covered&&age>=0&&age<.2&&(col*7+row*11)%47===0){
          const rise=Math.floor(age*180/2)*2,size=age<.1?4:2;
          ctx.globalAlpha=1-age/.2;ctx.fillStyle='#fff9db';ctx.fillRect(col*cell+4,row*cell-rise,size,size);ctx.globalAlpha=1;
        }
      }
      if(frame.done){callbacks.current.onComplete();return;}
      frameId=requestAnimationFrame(draw);
    };
    frameId=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frameId);
  },[motion]);
  return <canvas ref={canvas} className="pixel-dissolve" aria-label="正在进入游戏"/>;
}
