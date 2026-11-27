export const metricColors={study:'#66B2FF',notes:'#66B2FF',research:'#C58BFF',competition:'#FFA94D',volunteer:'#FF6B81',practice:'#FFE066',temptation:'#FF3B5C',coffee:'#74F2FF',fitness:'#92E8AF'};
export const snap=(value:number)=>Math.round(value/2)*2;

// Reserve UI space without changing pendulum geometry or tower motion.
export function portraitLayout(width:number,height:number,safeTop=0){
  if(width>600||width>=height)return {top:0,buffs:0};
  const scale=width/height<.85?Math.min(width/430,height/760):height/720;
  const top=Math.ceil(Math.max(64,safeTop+60)/2)*2;
  // Lowest possible hanging room bottom (vertical rope, before zooming out).
  const roomBottom=top+Math.max(126*scale,(height-top)*.23)+88*scale;
  return {top,buffs:Math.ceil((roomBottom+16)/2)*2};
}
