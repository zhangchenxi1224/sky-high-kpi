import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {assetUrl} from '../features/assets';
import {MAX_FOOD,birdBubbleDelay,nextBirdPerch,placeBirdBubble,type BirdDay,type BubblePosition} from '../features/bird';
import './bird.css';

const messages=['今天也替你收好一阵风，等你回来再一起叠高。','不用每天都闪闪发光，能回来吃饭就很好了。','你认真生活的样子，我有在好好看着。','飞累了就停一会儿，天空不会催你。','慢一点也没关系，我把羽毛晒暖了。'];
export function BirdCompanion({day,feeding,bubbleEnabled,onFeed}:{day:BirdDay;feeding:boolean;bubbleEnabled:boolean;onFeed:()=>void}){
  const [messageIndex,setMessageIndex]=useState(0),[perch,setPerch]=useState(0),[shown,setShown]=useState(true),[flying,setFlying]=useState(false),[heading,setHeading]=useState('right');
  const [position,setPosition]=useState<BubblePosition>({direction:'top',left:0,top:0});
  const moveTimer=useRef<number|null>(null),bird=useRef<HTMLButtonElement>(null),bubble=useRef<HTMLDivElement>(null);
  const pool=feeding?['这一口刚刚好，谢谢你记得回来。']:day.food===0?['小口袋还空着。去叠一层楼，回来就有饭啦。',...messages.slice(0,2)]:day.fed===0?[`今天的小米已经装好 ${day.food} 粒，先吃一口再出发吧。`,...messages.slice(0,2)]:messages;
  const message=pool[messageIndex%pool.length];
  const move=useCallback(()=>{
    if(feeding||flying)return;
    const next=nextBirdPerch(perch);
    setFlying(true);setHeading(next.heading);setPerch(next.perch);setMessageIndex(i=>i+1);
    moveTimer.current=window.setTimeout(()=>setFlying(false),1050);
  },[feeding,flying,perch]);
  useEffect(()=>()=>{if(moveTimer.current!==null)window.clearTimeout(moveTimer.current);},[]);
  useEffect(()=>setMessageIndex(0),[feeding,day.food===0,day.fed===0]);
  useEffect(()=>setShown(bubbleEnabled),[bubbleEnabled]);
  useEffect(()=>{if(!shown||feeding)return;const timer=window.setTimeout(()=>setShown(false),6000);return()=>window.clearTimeout(timer);},[shown,feeding]);
  useEffect(()=>{if(!bubbleEnabled||shown||feeding)return;const timer=window.setTimeout(()=>setShown(true),birdBubbleDelay());return()=>window.clearTimeout(timer);},[bubbleEnabled,shown,feeding]);
  useEffect(()=>{if(feeding||flying)return;const timer=window.setTimeout(move,26000);return()=>window.clearTimeout(timer);},[feeding,flying,move,perch]);
  useLayoutEffect(()=>{
    const update=()=>{
      if(!bird.current||!bubble.current)return;
      const avoid=Array.from(bird.current.closest('.welcome')?.querySelectorAll('.start-game,.welcome-links,.welcome-copy,.best-note')??[]).map(el=>el.getBoundingClientRect());
      setPosition(placeBirdBubble(bird.current.getBoundingClientRect(),bubble.current.getBoundingClientRect(),{width:innerWidth,height:innerHeight},avoid));
    };
    update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);
  },[shown,flying,message,day.food,day.fed,feeding,perch]);
  const visible=bubbleEnabled&&shown&&!flying;
  const clickBird=()=>{if(feeding||flying)return;if(bubbleEnabled)move();else onFeed();};
  return <>
    <aside className="bird-companion" aria-label="校园小鸟伙伴"><div className="bird-perch">
      <button ref={bird} type="button" className={`bird-stage perch-${perch} facing-${heading}${feeding?' feeding':''}${flying?' flying':''}`} onClick={clickBird} aria-label={bubbleEnabled?'让小鸟飞到另一个位置':'喂小鸟一口'} title={bubbleEnabled?'点一下，换个位置':'点一下，喂它一口'}>
        <img className="bird-idle-frame" src={assetUrl('bird-idle.webp')} alt="一只青蓝色的小鸟"/>
        <img className="bird-upstroke-frame" src={assetUrl('bird-upstroke.webp')} alt="" aria-hidden="true"/>
        <img className="bird-fly-frame" src={assetUrl('bird-fly.webp')} alt="" aria-hidden="true"/>
        <img className="bird-happy-frame" src={assetUrl('bird-happy-full.webp')} alt="" aria-hidden="true"/>
        {feeding&&<div className="bird-crumbs" aria-hidden="true"><i/><i/><i/></div>}
      </button>
    </div></aside>
    {createPortal(<div ref={bubble} className={`bird-chat dir-${position.direction}${visible?' visible':' hidden'}`} style={{left:position.left,top:position.top}} aria-hidden={!visible} inert={!visible}>
      <p role="status" aria-live="polite">{message}</p>
      <div className="bird-food" aria-label={`今日剩余口粮 ${day.food} 粒，上限 ${MAX_FOOD} 粒`}>
        <div className="bird-grains">{Array.from({length:MAX_FOOD},(_,i)=><i key={i} className={i<day.food?'full':''}/>)}</div>
        <span>今日 {day.food}/{MAX_FOOD}</span><button className="pixel-button gold bird-feed" disabled={feeding||day.food<=0} onClick={onFeed}>{feeding?'正在吃…':day.food>0?'喂一口':'还没有口粮'}</button>
      </div>
      <small>{day.fed>0?`今天已经陪你吃了 ${day.fed} 口`:'游戏分数会装进它每天的小口袋'}</small>
    </div>,document.body)}
  </>;
}
