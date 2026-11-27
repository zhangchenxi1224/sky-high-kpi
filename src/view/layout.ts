export const metricColors={study:'#66B2FF',notes:'#66B2FF',research:'#C58BFF',competition:'#FFA94D',volunteer:'#FF6B81',practice:'#FFE066',temptation:'#FF3B5C',coffee:'#74F2FF',fitness:'#92E8AF'};
export const snap=(value:number)=>Math.round(value/2)*2;

// Reserve the compact top controls. Buffs are normal-flow children of the HUD,
// never positioned using playfield or crane geometry.
export function portraitLayout(width:number,height:number,safeTop=0){
  if(width>600||width>=height)return {top:0};
  const top=Math.ceil(Math.max(64,safeTop+60)/2)*2;
  return {top};
}
