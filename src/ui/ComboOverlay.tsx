import {comboFrame} from '../features/combo';
import type {Snapshot} from '../game/engine';

export function ComboOverlay({s,effects,reducedMotion}:{s:Snapshot;effects:boolean;reducedMotion:boolean}){
  const frame=comboFrame(s.comboCue,s.elapsed,effects&&!reducedMotion);
  if(frame.stage==='hidden'||s.finished||s.phase==='READY')return null;
  const burst=frame.stage==='burst',motion=effects&&!reducedMotion;
  const count=frame.tier==='warm'?2:frame.tier==='hot'?4:6;
  const particleAge=Math.min(1,frame.age/.48),distance=Math.floor(particleAge*18)*2;
  return <div className={`combo-center tier-${frame.tier} stage-${frame.stage} flash-${frame.flash} ${motion?'':'quiet'}`} data-stage={frame.stage} data-combo={s.comboCue.value} aria-label={`${s.comboCue.broken?'连击中断':'当前连击'} ${s.comboCue.value}`} style={{opacity:frame.opacity,transform:`translate(-50%,-50%) translateY(${frame.y}px) rotate(-10deg) scale(${frame.scale})`}}>
    <div className="combo-word">{frame.tier==='fever'?'FEVER COMBO':'COMBO'}{frame.tier==='hot'&&<svg className="combo-flame" viewBox="0 0 16 20" aria-hidden="true"><path fill="#FF7A00" d="M6 0h4v4h2v4h2v4h2v6h-4v2H4v-2H0v-6h2V8h2v6h2z"/><path fill="#FFE066" d="M6 10h4v4h2v4H4v-4h2z"/></svg>}</div>
    <strong className="combo-number">×{s.comboCue.value}</strong>
    {motion&&burst&&Array.from({length:count},(_,i)=>{
      const a=i/count*Math.PI*2,x=Math.round(Math.cos(a)*(50+distance)/2)*2,y=Math.round(Math.sin(a)*(24+distance)/2)*2;
      return <i key={i} className={`combo-particle particle-${i}`} style={{left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,opacity:1-particleAge}}/>;
    })}
    {motion&&frame.stage==='break'&&<div className="combo-fragments" aria-hidden="true"><i/><i/><i/><i/></div>}
  </div>;
}
