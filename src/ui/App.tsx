import {useEffect,useRef,useState} from 'react';
import {GameEngine,type Snapshot} from '../game/engine';
import {getTitle,RULES} from '../game/rules';
import {Renderer} from '../view/renderer';
import {Sound} from '../features/audio';
import {ResultScreen} from './ResultScreen';
import {usePreferences} from '../store';
import {BirdCompanion} from './BirdCompanion';
import {earnBirdFood,feedBird,loadBirdDay,saveBirdDay} from '../features/bird';
import {assetUrl} from '../features/assets';
import {GameHud} from './GameHud';
import {MetricIcon} from './MetricIcon';
import {ComboOverlay} from './ComboOverlay';
import {PixelDissolve} from './PixelDissolve';
import './screens.css';
import './hud.css';
const query=new URLSearchParams(location.search);
const initialSeed=Number(query.get('seed'))||Date.now()>>>0;
const mode=query.get('mode')==='fixed'?'fixed':'normal';
const randomPlayUrl=new URL(location.href);
for(const key of ['mode','demo','seed'])randomPlayUrl.searchParams.delete(key);
const swayDemo=mode==='fixed'&&query.get('demo')==='sway';
// Equal alternating misses of the center reveal cumulative shake without net tower lean.
const demoOffsets=[0,0,0,0,0,0,28,-28,28,-28,40,0,0,0];
function demoDropReady(game:GameEngine){
  const offset=game.currentX-game.topX;
  const target=swayDemo?demoOffsets[game.floor%demoOffsets.length]:0;
  return Math.abs(offset-target)<2.5;
}
const fmt=(n:number)=>Number(n.toFixed(2)).toString();
function StatGrid({s}:{s:Snapshot}){return <div className="stat-grid"><div><span>绩点 GPA</span><b>{s.kpi.gpa.toFixed(2)}<small> / 4.00</small></b><small>落稳课业砖 {s.counts.study??0} 块</small></div><div><span>科研成果</span><b>{fmt(s.kpi.research)}</b></div><div><span>竞赛积分</span><b>{fmt(s.kpi.competition)}</b></div><div><span>志愿时长</span><b>{fmt(s.kpi.volunteer)}<small> h</small></b></div><div><span>社会实践</span><b>{fmt(s.kpi.practice)}</b></div><div><span>最高连击</span><b>{s.maxCombo}<small> COMBO</small></b></div></div>}
const instructions=[
  ['课业','PERFECT 额外 +1 连击，GPA +0.20 / 0.23 / 0.26',0],
  ['科研','普通落稳拿 70%，完美拿全额；下一块摆速 +12%',1],
  ['竞赛','积分 +4 或 +6；偏移超 25% 时下块摆幅 +15%',2],
  ['志愿','完美窗口加宽至砖宽的 12%',3],
  ['实践','接下来两块的正向 KPI 收益 +25%',4],
  ['体测','第 4 层起固定 4%；竞赛+志愿 ≥ 30 达标，否则后 1～3 投摆速/幅 +15%',12],
  ['冰美式','未来 5 秒摆速 −45%',5],
  ['邪修秘籍','GPA +0.10，后三投摆幅 −30%',6],
  ['赛博诱惑','GPA −0.15，难度暂缓 6 / 4 / 2 层，不叠加；每落稳一块非诱惑砖恢复一档。出现后至少间隔 3 块，GPA 低于 0.30 时不再出现；可免费跳过',11],
] as const;
export function App(){
  const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<GameEngine>(new GameEngine(initialSeed,mode)),renderer=useRef<Renderer|null>(null),sound=useRef(new Sound());
  const [s,setS]=useState(engine.current.snapshot()),[panel,setPanel]=useState<'campus'|'rules'|'records'|null>(null);
  const autoRef=useRef(false);const [auto,setAuto]=useState(false),[fps,setFps]=useState(0);
  const prefs=usePreferences(),[assetReady,setAssetReady]=useState(false);
  const [transitioning,setTransitioning]=useState(false),transitionRef=useRef(false);
  const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReducedMotion(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const [birdDay,setBirdDay]=useState(()=>loadBirdDay()),[feeding,setFeeding]=useState(false),[birdFlyaway,setBirdFlyaway]=useState(false),[birdGained,setBirdGained]=useState(0);
  const birdTimers=useRef<number[]>([]);
  useEffect(()=>()=>birdTimers.current.forEach(window.clearTimeout),[]);
  const refresh=()=>setS(engine.current.snapshot());
  const start=()=>{
    if(engine.current.phase==='READY'){setBirdFlyaway(true);birdTimers.current.push(window.setTimeout(()=>setBirdFlyaway(false),900));}
    setBirdGained(0);
    void sound.current.unlock();
    engine.current.start();
    refresh();
  };
  const drop=()=>{
    if(transitionRef.current)return;
    if(!engine.current.drop())return;
    (document.activeElement as HTMLElement|null)?.blur();
    refresh();
  };
  const restart=()=>{
    const game=new GameEngine(Number(query.get('seed'))||Date.now()>>>0,mode);
    renderer.current?.resize(innerWidth,innerHeight,game);
    engine.current=game;
    attach(game);

    setPanel(null);

    start();
  };
  const returnHome=(openBirdConversation=false)=>{
    usePreferences.setState({birdBubble:openBirdConversation});
    const game=new GameEngine(Number(query.get('seed'))||Date.now()>>>0,mode);
    renderer.current?.resize(innerWidth,innerHeight,game);
    engine.current=game;attach(game);setPanel(null);setBirdDay(loadBirdDay());setBirdGained(0);
    autoRef.current=false;setAuto(false);refresh();
  };
  const feed=()=>{
    if(feeding||birdDay.food<=0)return;
    const next=feedBird(loadBirdDay());setBirdDay(next);saveBirdDay(next);setFeeding(true);
    birdTimers.current.push(window.setTimeout(()=>setFeeding(false),750));
  };
  const attach=(e:GameEngine)=>{e.on(event=>{
    if(event.type==='land')sound.current.effect(event.perfect?'perfect':'land',event.combo);
    else sound.current.effect(event.type);
    if(event.type==='over'&&e.mode==='normal'){
      const final=e.snapshot(),earned=earnBirdFood(loadBirdDay(),final.score);
      saveBirdDay(earned.day);setBirdDay(earned.day);setBirdGained(earned.gained);
      usePreferences.getState().save({date:new Date().toISOString(),floor:final.floor,score:final.score,gpa:final.kpi.gpa,title:getTitle(final).name});
    }
    refresh();
  });};
  useEffect(()=>{
    const e=engine.current;const r=new Renderer(canvas.current!);renderer.current=r;attach(e);
    const resize=()=>r.resize(innerWidth,innerHeight,engine.current);resize();window.addEventListener('resize',resize);
    let raf=0,previous=performance.now(),lastHud=0,frameCount=0,fpsTime=previous;
    const tick=(now:number)=>{const delta=Math.min(.1,(now-previous)/1000);previous=now;frameCount++;if(now-fpsTime>=1000){setFps(Math.round(frameCount*1000/(now-fpsTime)));fpsTime=now;frameCount=0;}const game=engine.current;game.update(delta,autoRef.current&&game.mode==='fixed'?demoDropReady:undefined);r.render(game);if(now-lastHud>60){setS(game.snapshot());lastHud=now;}if(r.assetsReady)setAssetReady(true);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    const hidden=()=>{if(document.hidden){if(engine.current.phase!=='READY'&&!engine.current.finished)engine.current.paused=true;sound.current.paused=true;refresh();}else{sound.current.paused=engine.current.paused&&!transitionRef.current;}};document.addEventListener('visibilitychange',hidden);
    const interact=(event:Event)=>{
      if(event.target instanceof Element&&event.target.closest('.music-control'))return;
      sound.current.paused=document.hidden||(engine.current.paused&&!transitionRef.current);
      void sound.current.unlock();
    };
    window.addEventListener('pointerup',interact);window.addEventListener('keydown',interact);
    const key=(event:KeyboardEvent)=>{
      if(transitionRef.current){event.preventDefault();return;}
      if(event.repeat)return;
      const dialogs=document.querySelectorAll('[role="dialog"]');
      if(event.code==='Escape'&&(!dialogs.length||dialogs[0].getAttribute('aria-labelledby')==='pause-title')){
        engine.current.togglePause();
        refresh();
        return;
      }
      if(dialogs.length||(event.target instanceof Element&&event.target.closest('input,textarea,select,button,a')))return;
      if(event.code==='Space'){event.preventDefault();drop();}
      else if(event.code==='KeyS'){engine.current.skipCurrentBlock();refresh();}
    };
    window.addEventListener('keydown',key);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);window.removeEventListener('pointerup',interact);window.removeEventListener('keydown',interact);document.removeEventListener('visibilitychange',hidden);e.listeners.clear();sound.current.dispose();};
  },[]);
  useEffect(()=>{sound.current.effects=prefs.effects;if(renderer.current){renderer.current.effects=prefs.effects;renderer.current.night=prefs.night;}sound.current.setMusic(prefs.music);return()=>sound.current.dispose();},[prefs.music,prefs.effects,prefs.night]);
  useEffect(()=>{sound.current.paused=document.hidden||(s.paused&&!transitioning);},[s.paused,transitioning]);
  useEffect(()=>{if(renderer.current)renderer.current.detailedSway=prefs.detailedSway;},[prefs.detailedSway]);
  useEffect(()=>{if(!s.paused&&s.phase==='SWINGING'&&s.ddl<=2&&s.ddl>0){sound.current.effect('warning');}},[Math.ceil(s.ddl*3),s.paused]);
  const openPanel=(p:typeof panel)=>{if(engine.current.phase!=='READY'&&!engine.current.finished)engine.current.paused=true;setPanel(p);refresh();};
  const closePanel=()=>{setPanel(null);engine.current.paused=false;refresh();};
  const active=s.phase==='SWINGING';const preview=s.phase==='READY';
  return <main className={`game-shell ${preview?'is-home':''} ${s.finished?'is-finished':''} ${s.paused?'is-paused':''} ${transitioning?'is-transitioning':''}`} aria-label="Don't Collapse, MY GPA!">
    <canvas ref={canvas} className="game-canvas" onPointerDown={preview?undefined:drop} aria-label="游戏画面：点击或按空格松钩"/>
    <GameHud s={s}/>
    <ComboOverlay s={s} effects={prefs.effects} reducedMotion={reducedMotion}/>
    <nav className="top-controls" aria-label="游戏设置">
      {!preview&&s.phase!=='GAME_OVER'&&<button className="pixel-button gold pause-control" onClick={()=>{engine.current.togglePause();refresh();}}>Ⅱ 暂停</button>}
      <button className={`pixel-button red music-control ${prefs.music?'':'muted'}`} aria-pressed={prefs.music} onClick={()=>{const enabled=!prefs.music;prefs.toggle('music');sound.current.setMusic(enabled);if(enabled)void sound.current.unlock();}}><span>♫</span> 音乐{prefs.music?'':' ×'}</button>
      <button className={`pixel-button blue ${prefs.effects?'':'muted'}`} aria-pressed={prefs.effects} onClick={()=>prefs.toggle('effects')}><span>✦</span> 特效{prefs.effects?'':' ×'}</button>
      <button className="pixel-button green" onClick={()=>openPanel('campus')}><span>▥</span> 校区</button>
    </nav>
    {mode==='fixed'&&!s.finished&&<><button className="demo-button" aria-pressed={auto} onClick={()=>{autoRef.current=!autoRef.current;setAuto(autoRef.current);if(preview)engine.current.start();refresh();}}>{auto?'关闭自动演示':swayDemo?'演示搭偏与回稳':'自动演示全部砖块'}</button><output className="fps-readout">{fps} FPS · DPR {Number(Math.min(devicePixelRatio,2).toFixed(2))}</output></>}
    {preview&&<section className="welcome arcade-home" aria-label="开始游戏">
      <div className="welcome-copy"><h1><img className="game-logo" src={assetUrl('title.svg')} alt="Don't Collapse, MY GPA!"/></h1></div>
      <div className="home-start"><button className="arcade-button start-game" onClick={()=>{if(transitionRef.current)return;void sound.current.unlock();transitionRef.current=true;setTransitioning(true);}} disabled={!assetReady||transitioning}><span aria-hidden="true">▶</span>{assetReady?'开始游戏':'加载中…'}</button>
        {mode==='fixed'&&<div className="welcome-links"><a className="text-link play-random" href={randomPlayUrl.href}>去随机试玩</a></div>}
      </div>
      {!panel&&<BirdCompanion day={birdDay} feeding={feeding} bubbleEnabled={prefs.birdBubble} onFeed={feed}/>}
    </section>}
    {birdFlyaway&&<div className="bird-flyaway" aria-hidden="true"><img src={assetUrl('bird-fly.webp')} alt=""/></div>}
    {!preview&&s.message&&s.elapsed<s.messageUntil&&!s.finished&&<div className="sr-only" role="status" key={s.message}>{s.message}</div>}
    <div className={`ddl-meter ${active&&s.ddl<=2?'urgent':''}`} aria-label={`DDL 剩余 ${active?Math.ceil(s.ddl):0} 秒`}><span className="ddl-title pixel-label">DDL</span><div className="ddl-clock">{active?<>{Math.ceil(s.ddl)}<small>s</small></>:'−'}</div><div className="ddl-track"><div style={{height:active?`${s.ddl/RULES.ddl*100}%`:'0%'}}/><i/><i/><i/></div></div>
    <div className="bottom-actions">
      {active&&s.current?.kind==='temptation'&&<button className="pixel-button red skip" onPointerDown={event=>{event.preventDefault();event.stopPropagation();engine.current.skipCurrentBlock();refresh();}} onClick={event=>{if(event.detail===0){engine.current.skipCurrentBlock();refresh();}}}>» 跳过诱惑</button>}
      {!preview&&!s.finished&&<button className="pixel-button blue drop" disabled={!active||s.paused} onPointerDown={event=>{event.preventDefault();drop();}} onClick={event=>{if(event.detail===0)drop();}}>{active?'↓ 点击松钩':s.phase==='GAME_OVER'?'下把再来':'漂亮！'}</button>}
    </div>
    <div className="score-panel ink-panel" aria-label={`综测总分 ${s.score}`}><MetricIcon kind="gpa"/><strong>{String(s.score).padStart(5,'0')}</strong><span>综测</span></div>
    {s.paused&&!transitioning&&!panel&&!s.finished&&<div className="modal-backdrop"><section className="pixel-modal compact" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span className="modal-eyebrow pixel-label">TAKE A BREATH</span><h2 id="pause-title">课间休息</h2><p>DDL 和吊车已暂停，喝口水再继续。</p><div className="result-buttons"><button className="pixel-button blue" autoFocus onClick={()=>{engine.current.paused=false;void sound.current.unlock();refresh();}}>继续卷楼</button><button className="pixel-button gold" onClick={restart}>重新开局</button></div></section></div>}
    {s.finished&&!panel&&<ResultScreen snapshot={s} tower={engine.current.tower} birdGained={birdGained} onRestart={restart} onHome={returnHome} onRecords={()=>openPanel('records')} randomUrl={randomPlayUrl.href}/>}
    {panel&&<div className="modal-backdrop"><section className="pixel-modal campus-modal" role="dialog" aria-modal="true" aria-labelledby="campus-title"><button className="close" aria-label="关闭窗口" onClick={closePanel}>×</button><span className="modal-eyebrow pixel-label">CAMPUS NOTICEBOARD</span><h2 id="campus-title">{panel==='rules'?'新生入学指南':panel==='records'?'本机成绩榜':'校园公告栏'}</h2><div className="tabs pixel-tabs"><button className={panel==='campus'?'selected':''} onClick={()=>setPanel('campus')}>本局账本</button><button className={panel==='rules'?'selected':''} onClick={()=>setPanel('rules')}>玩法指南</button><button className={panel==='records'?'selected':''} onClick={()=>setPanel('records')}>成绩榜</button></div>
      {panel==='campus'&&<><StatGrid s={s}/><div className="campus-options"><span>校园景色</span><button className="pixel-button blue" onClick={()=>prefs.toggle('night')}>{prefs.night?'星空校区':'日落校区'}</button></div><div className="campus-options"><label htmlFor="sway-style">楼体摇晃</label><select id="sway-style" value={prefs.detailedSway?'detailed':'classic'} onChange={()=>prefs.toggle('detailedSway')}><option value="detailed">细腻</option><option value="classic">经典</option></select></div><div className="campus-options"><span>小鸟气泡</span><button className="pixel-button gold" aria-pressed={prefs.birdBubble} onClick={()=>prefs.toggle('birdBubble')}>{prefs.birdBubble?'已开启':'已关闭'}</button></div><p className="small-print">每一块小楼，都算大学的一次努力。成绩仅保存在当前浏览器。</p><button className="pixel-button blue wide" onClick={closePanel}>{preview?'回到校园':'继续卷楼'}</button></>}
      {panel==='rules'&&<><p>对准楼顶，点击画面或按 <kbd>SPACE</kbd> 松钩。每投只有 <b>{RULES.ddl} 秒</b>，落空一次即结束。</p><div className="rule-summary pixel-tags"><span>完美 ≤ 6%</span><span>落稳 ≤ 50%</span><span>超出即落空</span></div><p className="small-print">百分比为砖块中心相对下层中心的偏移 / 砖宽；志愿砖完美窗口为 12%。</p><div className="block-guide">{instructions.map(([name,desc,sprite])=><div key={name}><div className={`mini-room ${sprite===12?'fitness':''}`} style={sprite===12?{backgroundImage:`url("${assetUrl('fitness.webp')}")`}:{backgroundPosition:`${sprite%4*100/3}% ${Math.floor(sprite/4)*50}%`}}/><div><b>{name}</b><span>{desc}</span></div></div>)}</div><p className="small-print">PERFECT 每级连击增加 10% 正向收益，最高 ×2；课业额外 +1 连击。诱惑扣分不翻倍。竞赛记原始积分，每点折算 15 分。</p><p className="small-print">综测 = 层数×10 + GPA×100 + 科研×30 + 竞赛×15 + 志愿×5 + 实践×20。按 Esc 暂停，S 跳过诱惑。</p><button className="pixel-button blue wide" onClick={closePanel}>懂了，去卷楼</button></>}
      {panel==='records'&&<><p className="small-print">当前浏览器 · 按综测总分排序 · 保留前 10 名</p>{prefs.records.length?<ol className="record-list">{prefs.records.map((r,i)=><li key={r.date+i}><span>{i+1}</span><div><b>{r.title}</b><small>{r.floor}F · GPA {r.gpa.toFixed(2)}</small></div><strong>{r.score}</strong></li>)}</ol>:<div className="empty-record">还没有成绩。<br/>校园的天际线，等你来写。</div>}<button className="pixel-button blue wide" onClick={closePanel}>返回校园</button></>}
    </section></div>}
    {transitioning&&<PixelDissolve motion={prefs.effects&&!reducedMotion} onCovered={()=>{start();engine.current.paused=true;refresh();}} onComplete={()=>{transitionRef.current=false;setTransitioning(false);engine.current.paused=document.hidden;refresh();}}/>}
    <div className="sr-only" role="status" aria-live="polite">{s.phase==='CAMERA_SHIFT'?`${s.verdict}，${s.floor} 层，${s.rewardLabel}`:s.finished?`本局结束，${s.floor} 层，${s.score} 分`:''}</div>
  </main>;
}
