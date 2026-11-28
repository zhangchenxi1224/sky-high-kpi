export type ComboCue={value:number;at:number;broken:boolean;serial:number};
export type ComboStage='hidden'|'burst'|'settling'|'hold'|'break';
export const emptyComboCue=():ComboCue=>({value:0,at:0,broken:false,serial:0});
export const comboTier=(value:number)=>value>=7?'fever':value>=4?'hot':'warm';

/** Simulation-clock feedback: pause freezes every phase, including the 220ms break. */
export function comboFrame(cue:ComboCue,now:number,motion=true){
  const age=Math.max(0,now-cue.at),tier=comboTier(cue.value);
  let stage:ComboStage='hidden',scale=1,opacity=0,y=0;
  if(cue.value>=2){
    if(cue.broken){stage=age<.22?'break':'hidden';opacity=Math.max(0,1-age/.22);y=motion?Math.floor(Math.min(1,age/.22)*7)*2:0;}
    else if(age<.48){stage='burst';opacity=1;scale=motion?[1.45,.95,1.05,1][Math.min(3,Math.floor(age/.12))]:1;}
    else if(age<.60){stage='settling';const t=(age-.48)/.12;opacity=1-.58*t;scale=motion?1-.15*t:.85;}
    else{stage='hold';opacity=.42;scale=.85;}
  }
  return {stage,scale,opacity,y,tier,age,flash:motion&&tier==='fever'&&stage==='burst'?Math.floor(age/.24)%2:0};
}
