import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DAILY_BIRD_FOOD,type BirdDay} from '../features/bird';
import {placeBirdBubble,randomBirdPerch,type BirdBubblePlacement,type BirdHeading} from './birdPlacement';

const passingThoughts=[
  '今天也替你收好一阵风，等你回来再一起叠高。',
  '不用每天都闪闪发光，能回来吃饭就很好了。',
  '你认真生活的样子，我有在好好看着。',
  '飞累了就停一会儿，天空不会催你。',
  '慢一点也没关系，我把羽毛晒暖了。',
];

type Props={day:BirdDay;feeding:boolean;bubbleEnabled:boolean;onFeed:()=>void};
const birdAssets={idle:'assets/bird-idle.webp',upstroke:'assets/bird-upstroke.webp',fly:'assets/bird-fly.webp',happy:'assets/bird-happy.webp'};

export function BirdCompanion({day,feeding,bubbleEnabled,onFeed}:Props){
  const [thought,setThought]=useState(0);
  const [perch,setPerch]=useState(0);
  const [bubbleOpen,setBubbleOpen]=useState(true);
  const [flying,setFlying]=useState(false);
  const [heading,setHeading]=useState<BirdHeading>('right');
  const [bubbleLayout,setBubbleLayout]=useState<BirdBubblePlacement>({direction:'top',left:0,top:0});
  const landingTimer=useRef<number|null>(null);
  const birdRef=useRef<HTMLButtonElement>(null);
  const bubbleRef=useRef<HTMLDivElement>(null);
  const messages=feeding
    ?['这一口刚刚好，谢谢你记得回来。']
    :day.food===0
      ?['小口袋还空着。去叠一层楼，回来就有饭啦。',...passingThoughts.slice(0,2)]
      :day.fed===0
        ?[`今天的小米已经装好 ${day.food} 粒，先吃一口再出发吧。`,...passingThoughts.slice(0,2)]
        :passingThoughts;
  const line=messages[thought%messages.length];

  const flyToNext=useCallback((showBubble=true)=>{
    if(feeding||flying)return;
    const next=randomBirdPerch(perch);
    setBubbleOpen(false);
    setFlying(true);
    setHeading(next.heading);
    setPerch(next.perch);
    setThought(value=>value+1);
    landingTimer.current=window.setTimeout(()=>{
      setFlying(false);
      setBubbleOpen(showBubble);
    },1050);
  },[feeding,flying,perch]);

  useEffect(()=>()=>{if(landingTimer.current!==null)window.clearTimeout(landingTimer.current);},[]);
  useEffect(()=>{setThought(0);},[feeding,day.food===0,day.fed===0]);
  useEffect(()=>{setBubbleOpen(bubbleEnabled);},[bubbleEnabled]);
  useEffect(()=>{
    if(!bubbleOpen||flying||feeding)return;
    const timer=window.setTimeout(()=>setBubbleOpen(false),6000);
    return()=>window.clearTimeout(timer);
  },[bubbleOpen,flying,feeding]);
  useEffect(()=>{
    if(feeding||flying)return;
    const timer=window.setTimeout(()=>flyToNext(false),26000);
    return()=>window.clearTimeout(timer);
  },[feeding,flying,flyToNext,perch]);
  useLayoutEffect(()=>{
    const place=()=>{
      const bird=birdRef.current,bubble=bubbleRef.current;
      if(!bird||!bubble)return;
      const birdRect=bird.getBoundingClientRect(),bubbleRect=bubble.getBoundingClientRect();
      setBubbleLayout(placeBirdBubble(birdRect,{width:bubbleRect.width,height:bubbleRect.height},{width:innerWidth,height:innerHeight}));
    };
    place();
    window.addEventListener('resize',place);
    return()=>window.removeEventListener('resize',place);
  },[bubbleOpen,flying,line,day.food,day.fed,feeding,perch]);

  const bubbleVisible=bubbleEnabled&&bubbleOpen&&!flying;
  const handleBirdClick=()=>{
    if(feeding||flying)return;
    if(!bubbleEnabled){onFeed();return;}
    flyToNext(true);
  };

  return <><aside className="bird-companion" aria-label="校园小鸟伙伴">
    <div className="bird-perch">
      <button ref={birdRef} type="button" className={`bird-stage perch-${perch} facing-${heading}${feeding?' feeding':''}${flying?' flying':''}`} onClick={handleBirdClick} aria-label={bubbleEnabled?'让小鸟飞到另一个位置':'喂小鸟一口'} title={bubbleEnabled?'点一下，换个位置':'点一下，喂它一口'}>
        <img className="bird-idle-frame" src={birdAssets.idle} alt="一只青蓝色的小鸟"/>
        <img className="bird-upstroke-frame" src={birdAssets.upstroke} alt="" aria-hidden="true"/>
        <img className="bird-fly-frame" src={birdAssets.fly} alt="" aria-hidden="true"/>
        <img className="bird-happy-frame" src={birdAssets.happy} alt="" aria-hidden="true"/>
        {feeding&&<div className="bird-crumbs" aria-hidden="true"><i/><i/><i/></div>}
      </button>
    </div>
  </aside>
  {createPortal(<div ref={bubbleRef} className={`bird-chat dir-${bubbleLayout.direction}${bubbleVisible?' visible':' hidden'}`} style={{left:bubbleLayout.left,top:bubbleLayout.top}} aria-hidden={!bubbleVisible}>
      <p role="status" aria-live="polite">{line}</p>
      <div className="bird-food" aria-label={`今日剩余口粮 ${day.food} 粒，上限 ${DAILY_BIRD_FOOD} 粒`}>
        <div className="bird-grains">{Array.from({length:DAILY_BIRD_FOOD},(_,index)=><i className={index<day.food?'full':''} key={index}/>)}</div>
        <span>今日 {day.food}/{DAILY_BIRD_FOOD}</span>
        <button className="pixel-button gold bird-feed" disabled={feeding||day.food<=0} onClick={onFeed}>
          {feeding?'正在吃…':day.food>0?'喂一口':'还没有口粮'}
        </button>
      </div>
      <small>{day.fed>0?`今天已经陪你吃了 ${day.fed} 口`:'游戏分数会装进它每天的小口袋'}</small>
    </div>,document.body)}
  </>;
}
