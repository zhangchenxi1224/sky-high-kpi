import {useEffect,useState} from 'react';
import type {Snapshot,Placed} from '../game/engine';
import {getTitle} from '../game/rules';
import {makePoster} from '../features/poster';
import {previewBirdEnding,type BirdEndingLine} from '../features/bird-ending';

type Props={snapshot:Snapshot;tower:Placed[];birdGained:number;birdEnding?:BirdEndingLine;onRestart:()=>void;onHome:(openBirdConversation?:boolean)=>void;onRecords:()=>void;randomUrl:string};
export function ResultScreen({snapshot:s,tower,birdGained,birdEnding=previewBirdEnding,onRestart,onHome,onRecords,randomUrl}:Props){
  const [poster,setPoster]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let current=true;setError(false);
    makePoster(s,tower,birdGained,birdEnding).then(image=>{if(current)setPoster(image);}).catch(()=>{if(current)setError(true);});
    return()=>{current=false;};
  },[s.seed,s.floor,s.score,birdGained,birdEnding,retry]);
  const title=getTitle(s);
  return <div className="report-backdrop"><section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
    <h2 id="report-title" className="sr-only">本科四年综测结业鉴定表</h2>
    <div className="report-artwork">
      <button className="report-close" aria-label="关闭结算，回到首页" onClick={()=>onHome()}>×</button>
      {poster?<img className="report-image" src={poster} alt={`${s.floor} 层，综测 ${s.score} 分，${title.name}。结业鉴定表包含真实塔形、五维雷达图与校园小鸟。小鸟：${birdEnding.text}`}/>:<div className="report-loading" role="status"><b>{s.floor}F · {s.score}</b><span>{error?'成绩卡暂时没有生成成功':'正在印制你的校园档案…'}</span>{error&&<button className="pixel-button gold" onClick={()=>setRetry(r=>r+1)}>重试生成</button>}</div>}
    </div>
    <p className="report-save-hint">手机可长按图片保存</p>
    <div className="report-actions">
      {poster?<a className="comic-button comic-blue" download={`Don't Collapse, MY GPA!-${s.floor}F-${s.score}.png`} href={poster}>保存 PNG</a>:<button className="comic-button comic-blue" disabled>保存 PNG</button>}
      <button className="comic-button comic-gold" onClick={onRestart}>重开大学</button>
    </div>
    <div className="report-links"><button onClick={()=>onHome(true)}>回首页喂小鸟</button><span>·</span><button onClick={onRecords}>成绩榜</button>{s.mode==='fixed'&&<><span>·</span><a href={randomUrl}>去随机试玩</a></>}</div>
  </section></div>;
}
