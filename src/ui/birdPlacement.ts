export type BirdBubbleDirection='top'|'bottom'|'left'|'right'|'top-left'|'top-right'|'bottom-left'|'bottom-right';
type Rect={left:number;top:number;right:number;bottom:number};
type Size={width:number;height:number};
export type BirdBubblePlacement={direction:BirdBubbleDirection;left:number;top:number};
export type BirdHeading='left'|'right';

const gap=10,margin=8;
const preference:Record<BirdBubbleDirection,number>={
  right:150,left:150,'bottom-right':45,'bottom-left':45,'top-right':45,'top-left':45,bottom:0,top:0,
};

export function placeBirdBubble(bird:Rect,bubble:Size,viewport:Size):BirdBubblePlacement{
  const width=Math.min(bubble.width,Math.max(0,viewport.width-margin*2));
  const height=Math.min(bubble.height,Math.max(0,viewport.height-margin*2));
  const centerX=(bird.left+bird.right)/2,centerY=(bird.top+bird.bottom)/2;
  const candidates:BirdBubblePlacement[]=[
    {direction:'right',left:bird.right+gap,top:centerY-height/2},
    {direction:'left',left:bird.left-gap-width,top:centerY-height/2},
    {direction:'bottom-right',left:bird.right+gap,top:bird.bottom+gap},
    {direction:'bottom-left',left:bird.left-gap-width,top:bird.bottom+gap},
    {direction:'top-right',left:bird.right+gap,top:bird.top-gap-height},
    {direction:'top-left',left:bird.left-gap-width,top:bird.top-gap-height},
    {direction:'bottom',left:centerX-width/2,top:bird.bottom+gap},
    {direction:'top',left:centerX-width/2,top:bird.top-gap-height},
  ];
  const maxLeft=Math.max(margin,viewport.width-width-margin),maxTop=Math.max(margin,viewport.height-height-margin);
  let best:PlacementScore|null=null;
  for(const candidate of candidates){
    const left=Math.max(margin,Math.min(maxLeft,candidate.left)),top=Math.max(margin,Math.min(maxTop,candidate.top));
    const overflow=Math.abs(left-candidate.left)+Math.abs(top-candidate.top);
    const clearance=Math.min(left-margin,top-margin,viewport.width-left-width-margin,viewport.height-top-height-margin);
    const score=clearance+preference[candidate.direction]-overflow*1000;
    if(!best||score>best.score)best={direction:candidate.direction,left,top,score};
  }
  return best!;
}

export function randomBirdPerch(current:number,count=7,random=Math.random):{perch:number;heading:BirdHeading}{
  const last=Math.max(0,count-1),safe=Math.max(0,Math.min(last,current));
  if(last===0)return {perch:0,heading:'right'};
  const pool=Array.from({length:count},(_,index)=>index).filter(index=>index!==safe);
  const perch=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  return {perch,heading:perch>safe?'right':'left'};
}

export function randomBubbleDelay(random=Math.random,min=45000,max=75000){
  return Math.round(min+(max-min)*Math.max(0,Math.min(1,random())));
}

type PlacementScore=BirdBubblePlacement&{score:number};
