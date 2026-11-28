export const MAX_FOOD=8;
export const BIRD_STORAGE_KEY='sky-high-kpi-bird-v1';
export type BirdDay={date:string;food:number;fed:number};
export function localDate(now=new Date()){
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
const emptyDay=(now:Date):BirdDay=>({date:localDate(now),food:0,fed:0});
export function normalizeBirdDay(value:unknown,now=new Date()):BirdDay{
  if(!value||typeof value!=='object')return emptyDay(now);
  const data=value as Partial<BirdDay>;
  if(data.date!==localDate(now))return emptyDay(now);
  const food=Math.floor(Number(data.food)),fed=Math.floor(Number(data.fed));
  return {date:data.date,food:Number.isFinite(food)?Math.max(0,Math.min(MAX_FOOD,food)):0,fed:Number.isFinite(fed)?Math.max(0,fed):0};
}
export function loadBirdDay(now=new Date()):BirdDay{
  try{return normalizeBirdDay(JSON.parse(localStorage.getItem(BIRD_STORAGE_KEY)??'null'),now);}catch{return emptyDay(now);}
}
export function saveBirdDay(day:BirdDay){try{localStorage.setItem(BIRD_STORAGE_KEY,JSON.stringify(day));}catch{/* Storage may be unavailable in private browsing. */}}
export function earnBirdFood(value:BirdDay,score:number,now=new Date()){
  const day=normalizeBirdDay(value,now);
  const gained=Math.min(MAX_FOOD-day.food,Math.ceil(Math.max(0,Number.isFinite(score)?score:0)/100));
  return {day:{...day,food:day.food+gained},gained};
}
export function feedBird(value:BirdDay,now=new Date()):BirdDay{
  const day=normalizeBirdDay(value,now);
  return day.food>0?{...day,food:day.food-1,fed:day.fed+1}:day;
}

type Size={width:number;height:number};
type Rect={left:number;right:number;top:number;bottom:number};
export type BubblePosition={direction:string;left:number;top:number};
export function placeBirdBubble(rect:Rect,size:Size,viewport:Size,avoid:Rect[]=[]):BubblePosition{
  const gap=10,pad=8,w=Math.min(size.width,Math.max(0,viewport.width-pad*2)),h=Math.min(size.height,Math.max(0,viewport.height-pad*2));
  const cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2;
  const candidates=[
    {direction:'right',left:rect.right+gap,top:cy-h/2,bias:150},
    {direction:'left',left:rect.left-gap-w,top:cy-h/2,bias:150},
    {direction:'bottom-right',left:rect.right+gap,top:rect.bottom+gap,bias:45},
    {direction:'bottom-left',left:rect.left-gap-w,top:rect.bottom+gap,bias:45},
    {direction:'top-right',left:rect.right+gap,top:rect.top-gap-h,bias:45},
    {direction:'top-left',left:rect.left-gap-w,top:rect.top-gap-h,bias:45},
    {direction:'bottom',left:cx-w/2,top:rect.bottom+gap,bias:0},
    {direction:'top',left:cx-w/2,top:rect.top-gap-h,bias:0},
  ];
  let best:BubblePosition&{score:number}={direction:'top',left:pad,top:pad,score:-Infinity};
  for(const candidate of candidates){
    const left=Math.max(pad,Math.min(Math.max(pad,viewport.width-w-pad),candidate.left));
    const top=Math.max(pad,Math.min(Math.max(pad,viewport.height-h-pad),candidate.top));
    const moved=Math.abs(left-candidate.left)+Math.abs(top-candidate.top);
    const overlap=avoid.reduce((area,r)=>area+Math.max(0,Math.min(left+w,r.right+gap)-Math.max(left,r.left-gap))*Math.max(0,Math.min(top+h,r.bottom+gap)-Math.max(top,r.top-gap)),0);
    const score=Math.min(left-pad,top-pad,viewport.width-left-w-pad,viewport.height-top-h-pad)+candidate.bias-moved*1000-overlap*10000;
    if(score>best.score)best={direction:candidate.direction,left,top,score};
  }
  return best;
}
export function nextBirdPerch(current:number,count=7,random=Math.random){
  if(count<=1)return {perch:0,heading:'right'};
  const options=Array.from({length:count},(_,i)=>i).filter(i=>i!==Math.max(0,Math.min(count-1,current)));
  const perch=options[Math.min(options.length-1,Math.floor(random()*options.length))];
  return {perch,heading:perch>current?'right':'left'};
}
export const birdBubbleDelay=(random=Math.random)=>Math.round(45000+30000*Math.max(0,Math.min(1,random())));
