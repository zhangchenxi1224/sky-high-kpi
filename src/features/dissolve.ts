export const DISSOLVE_DURATION=800;
export const DISSOLVE_CELL=10;
/** Stable coordinate noise: a cell never changes its assigned time mid-transition. */
export function dissolveThreshold(col:number,row:number,rows:number){
  const hash=Math.imul(col+17,374761393)^Math.imul(row+31,668265263);
  const noise=((hash^(hash>>>13))>>>0)/4294967295;
  return .8*(1-(row+.5)/rows)+noise*.2;
}
export function dissolveFrame(elapsed:number,duration=DISSOLVE_DURATION){
  const t=Math.max(0,Math.min(1,elapsed/duration));
  return {covered:t>=.5,done:t>=1,progress:t<.5?t*2:(t-.5)*2};
}
