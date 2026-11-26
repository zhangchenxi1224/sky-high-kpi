import {useEffect,useRef,useState} from 'react';
import {GameEngine,type Snapshot} from '../game/engine';
import {getTitle,RULES} from '../game/rules';
import {Renderer} from '../view/renderer';
import {Sound} from '../features/audio';
import {makePoster} from '../features/poster';
import {usePreferences} from '../store';
const query=new URLSearchParams(location.search);
const initialSeed=Number(query.get('seed'))||Date.now()>>>0;
const mode=query.get('mode')==='fixed'?'fixed':'normal';
const swayDemo=mode==='fixed'&&query.get('demo')==='sway';
function demoDropReady(game:GameEngine){
  const offset=game.currentX-game.topX;
  const step=game.floor%12;
  if(swayDemo&&step>=2&&step<7){
    const directed=offset*(game.floor%2===0?-1:1);
    return directed>=32&&directed<=41;
  }
  return Math.abs(offset)<2.5;
}
const fmt=(n:number)=>Number(n.toFixed(2)).toString();
function Cap(){return <svg className="cap" viewBox="0 0 36 28" aria-hidden="true"><path fill="#b58b46" d="M8 14h21v9l-11 5-10-5z"/><path fill="#ffe4a4" d="M1 9 18 1 35 9v4L18 21 1 13z"/><path fill="#d7ad62" d="m1 13 17 8 17-8v-4l-17 8L1 9z"/><path stroke="#fce3a4" strokeWidth="2" d="M31 14v10"/></svg>}
function StatGrid({s}:{s:Snapshot}){return <div className="stat-grid"><div><span>绩点 GPA</span><b>{s.kpi.gpa.toFixed(2)}<small> / 4.00</small></b></div><div><span>科研成果</span><b>{fmt(s.kpi.research)}</b></div><div><span>竞赛积分</span><b>{fmt(s.kpi.competition)}</b></div><div><span>志愿时长</span><b>{fmt(s.kpi.volunteer)}<small> h</small></b></div><div><span>社会实践</span><b>{fmt(s.kpi.practice)}</b></div><div><span>最高连击</span><b>{s.maxCombo}<small> COMBO</small></b></div></div>}
const instructions=[['课业','PERFECT 额外 +1 连击，GPA +0.18～0.28'],['科研','非完美收益减半；下一块摆速 +12%'],['竞赛','积分 +5～8；偏移超 25% 时下块摆幅 +15%'],['志愿','完美窗口加宽至砖宽的 12%'],['实践','接下来两块的正向 KPI 收益 +25%'],['冰美式','未来 5 秒摆速 −45%'],['邪修秘籍','GPA +0.10，后三投摆幅 −30%'],['赛博诱惑','GPA −0.15，难度回退 6 层；也可免费跳过']];
export function App(){
  const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<GameEngine>(new GameEngine(initialSeed,mode)),renderer=useRef<Renderer|null>(null),sound=useRef(new Sound());
  const [s,setS]=useState(engine.current.snapshot()),[panel,setPanel]=useState<'campus'|'rules'|'records'|null>(null),[poster,setPoster]=useState<string|null>(null),[exporting,setExporting]=useState(false),[error,setError]=useState('');
  const autoRef=useRef(false);const [auto,setAuto]=useState(false),[fps,setFps]=useState(0);
  const prefs=usePreferences(),[assetReady,setAssetReady]=useState(false);const best=prefs.records[0];
  const refresh=()=>setS(engine.current.snapshot());
  const start=()=>{
    void sound.current.unlock();
    engine.current.start();
    refresh();
  };
  const drop=()=>{
    if(!engine.current.drop())return;
    (document.activeElement as HTMLElement|null)?.blur();
    refresh();
  };
  const restart=()=>{
    const game=new GameEngine(Number(query.get('seed'))||Date.now()>>>0,mode);
    game.setViewport(renderer.current?.height??720);
    engine.current=game;
    attach(game);
    setPoster(null);
    setPanel(null);
    setError('');
    start();
  };
  const attach=(e:GameEngine)=>{e.on(event=>{
    if(event.type==='land')sound.current.effect(event.perfect?'perfect':'land',event.combo);
    else sound.current.effect(event.type);
    if(event.type==='over'&&e.mode==='normal'){const final=e.snapshot();usePreferences.getState().save({date:new Date().toISOString(),floor:final.floor,score:final.score,gpa:final.kpi.gpa,title:getTitle(final).name});}
    refresh();
  });};
  useEffect(()=>{
    const e=engine.current;const r=new Renderer(canvas.current!);renderer.current=r;attach(e);
    const resize=()=>r.resize(innerWidth,innerHeight,engine.current);resize();window.addEventListener('resize',resize);
    let raf=0,previous=performance.now(),lastHud=0,frameCount=0,fpsTime=previous;
    const tick=(now:number)=>{const delta=Math.min(.1,(now-previous)/1000);previous=now;frameCount++;if(now-fpsTime>=1000){setFps(Math.round(frameCount*1000/(now-fpsTime)));fpsTime=now;frameCount=0;}const game=engine.current;game.update(delta);if(autoRef.current&&game.mode==='fixed'&&!game.paused&&game.phase==='SWINGING'&&demoDropReady(game))game.drop();r.render(game);if(now-lastHud>60){setS(game.snapshot());lastHud=now;}if(r.sprites.length===12)setAssetReady(true);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    const hidden=()=>{if(document.hidden){if(engine.current.phase!=='READY'&&!engine.current.finished)engine.current.paused=true;sound.current.paused=true;refresh();}};document.addEventListener('visibilitychange',hidden);
    const key=(event:KeyboardEvent)=>{
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
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);e.listeners.clear();sound.current.dispose();};
  },[]);
  useEffect(()=>{sound.current.effects=prefs.effects;if(renderer.current){renderer.current.effects=prefs.effects;renderer.current.night=prefs.night;}sound.current.setMusic(prefs.music);return()=>sound.current.dispose();},[prefs.music,prefs.effects,prefs.night]);
  useEffect(()=>{sound.current.paused=s.paused;},[s.paused]);
  useEffect(()=>{if(!s.paused&&s.phase==='SWINGING'&&s.ddl<=2&&s.ddl>0){sound.current.effect('warning');}},[Math.ceil(s.ddl*3),s.paused]);
  const openPanel=(p:typeof panel)=>{if(engine.current.phase!=='READY'&&!engine.current.finished)engine.current.paused=true;setPanel(p);refresh();};
  const closePanel=()=>{setPanel(null);engine.current.paused=false;refresh();};
  const exportPoster=async()=>{setExporting(true);setError('');try{setPoster(await makePoster(engine.current.snapshot(),engine.current.tower));}catch{setError('海报生成暂时失败，请重试。');}finally{setExporting(false);}};
  const active=s.phase==='SWINGING';const title=getTitle(s);const preview=s.phase==='READY';
  return <main className="game-shell" aria-label="绩点卷上天游戏">
    <canvas ref={canvas} className="game-canvas" onPointerDown={preview?undefined:drop} aria-label="游戏画面：点击或按空格松钩"/>
    <div className="hud-top"><div className="floor-panel pixel-panel"><div><Cap/><strong>{s.floor}<em>F</em></strong></div><span>GPA {s.kpi.gpa.toFixed(2)}</span></div>
      {!preview&&s.combo>=3&&<div className="combo">{s.combo}<small>COMBO</small></div>}
      {mode==='fixed'&&<div className="test-badge pixel-label">固定测试局 · 不计成绩</div>}
    </div>
    <nav className="top-controls" aria-label="游戏设置">
      {!preview&&s.phase!=='GAME_OVER'&&<button className="pixel-button gold pause-control" onClick={()=>{engine.current.togglePause();refresh();}}>Ⅱ 暂停</button>}
      <button className={`pixel-button red ${prefs.music?'':'muted'}`} aria-pressed={prefs.music} onClick={()=>{void sound.current.unlock();prefs.toggle('music');}}><span>♫</span> 音乐{prefs.music?'':' ×'}</button>
      <button className={`pixel-button blue ${prefs.effects?'':'muted'}`} aria-pressed={prefs.effects} onClick={()=>prefs.toggle('effects')}><span>✦</span> 特效{prefs.effects?'':' ×'}</button>
      <button className="pixel-button green" onClick={()=>openPanel('campus')}><span>▥</span> 校区</button>
    </nav>
    {mode==='fixed'&&!s.finished&&<><button className="demo-button" aria-pressed={auto} onClick={()=>{autoRef.current=!autoRef.current;setAuto(autoRef.current);if(preview)engine.current.start();refresh();}}>{auto?'关闭自动演示':swayDemo?'演示搭偏与回稳':'自动演示全部砖块'}</button><output className="fps-readout">{fps} FPS · DPR {Number(Math.min(devicePixelRatio,2).toFixed(2))}</output></>}
    {preview&&<section className="welcome" aria-label="开始游戏">
      <div className="welcome-copy"><div className="eyebrow">ONE CLICK. SKY HIGH.</div><h1>绩点卷上天</h1><p>把大学，叠成天空的形状。</p>
      <div className="intro-tags pixel-tags"><span>一键松钩</span><i>✦</i><span>单命挑战</span><i>✦</i><span>无尽高空</span></div></div>
      <button className="pixel-button blue drop" onClick={start}>{assetReady?'开始卷楼':'开始卷楼 · 加载中'}</button>
      <div className="welcome-links"><button className="text-link" onClick={()=>openPanel('rules')}>新生入学指南 <span>?</span></button>
      {best&&<div className="best-note">本机最高纪录　{best.floor}F · {best.score} 分</div>}
      </div>
    </section>}
    {!preview&&s.message&&s.elapsed<s.messageUntil&&!s.finished&&<div className="danmaku" role="status" key={s.message}>{s.message}</div>}
    {!preview&&s.buffs.length>0&&<div className="buffs pixel-buffs">{s.buffs.map(b=><span className="pixel-buff" key={b}>{b}</span>)}</div>}
    <div className={`ddl-meter ${active&&s.ddl<=2?'urgent':''}`} aria-label={`DDL 剩余 ${active?Math.ceil(s.ddl):0} 秒`}><span className="ddl-title pixel-label">DDL</span><div className="ddl-clock">{active?<>{Math.ceil(s.ddl)}<small>s</small></>:'−'}</div><div className="ddl-track"><div style={{height:active?`${s.ddl/RULES.ddl*100}%`:'0%'}}/><i/><i/><i/></div></div>
    <div className="bottom-actions">
      {active&&s.current?.kind==='temptation'&&<button className="pixel-button red skip" onPointerDown={event=>{event.preventDefault();event.stopPropagation();engine.current.skipCurrentBlock();refresh();}} onClick={event=>{if(event.detail===0){engine.current.skipCurrentBlock();refresh();}}}>忍痛跳过</button>}
      {!preview&&!s.finished&&<button className="pixel-button blue drop" disabled={!active||s.paused} onPointerDown={event=>{event.preventDefault();drop();}} onClick={event=>{if(event.detail===0)drop();}}>{active?'↓ 点击松钩':s.phase==='GAME_OVER'?'下把再来':'漂亮！'}</button>}
    </div>
    <div className="score-panel pixel-panel" aria-label={`综测总分 ${s.score}`}><Cap/><strong>{String(s.score).padStart(5,'0')}</strong><span>综测</span></div>
    {s.paused&&!panel&&!s.finished&&<div className="modal-backdrop"><section className="pixel-modal compact" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span className="modal-eyebrow pixel-label">TAKE A BREATH</span><h2 id="pause-title">课间休息</h2><p>DDL 和吊车已暂停，喝口水再继续。</p><div className="result-buttons"><button className="pixel-button blue" autoFocus onClick={()=>{engine.current.paused=false;void sound.current.unlock();refresh();}}>继续卷楼</button><button className="pixel-button gold" onClick={restart}>重新开局</button></div></section></div>}
    {s.finished&&!poster&&<div className="modal-backdrop result-backdrop"><section className="pixel-modal result" role="dialog" aria-modal="true" aria-labelledby="result-title"><span className="modal-eyebrow pixel-label">CAMPUS PERFORMANCE REPORT</span><h2 id="result-title">本次结业鉴定</h2><div className="result-score"><b>{s.floor}<small> F</small></b><div><span>综测总分</span><strong>{s.score.toLocaleString()}</strong></div></div><div className="result-title">{title.name}</div><p>{title.comment}</p><StatGrid s={s}/><div className="result-detail">完美落点 {s.perfects} 次 · 接住诱惑 {s.accepted} 次 · 忍痛跳过 {s.skipped} 次</div>{s.forced&&<p className="forced-note">本局由 {RULES.ddl} 秒 DDL 强制松钩后落空。</p>}<div className="result-buttons"><button className="pixel-button blue" autoFocus onClick={restart}>重开大学</button><button className="pixel-button gold" disabled={exporting} onClick={exportPoster}>{exporting?'正在盖章…':'生成结业海报'}</button></div><button className="text-link pixel-link" onClick={()=>openPanel('records')}>查看本机成绩榜</button>{error&&<p role="alert">{error}</p>}</section></div>}
    {panel&&<div className="modal-backdrop"><section className="pixel-modal campus-modal" role="dialog" aria-modal="true" aria-labelledby="campus-title"><button className="close" aria-label="关闭窗口" onClick={closePanel}>×</button><span className="modal-eyebrow pixel-label">CAMPUS NOTICEBOARD</span><h2 id="campus-title">{panel==='rules'?'新生入学指南':panel==='records'?'本机成绩榜':'校园公告栏'}</h2><div className="tabs pixel-tabs"><button className={panel==='campus'?'selected':''} onClick={()=>setPanel('campus')}>本局账本</button><button className={panel==='rules'?'selected':''} onClick={()=>setPanel('rules')}>玩法指南</button><button className={panel==='records'?'selected':''} onClick={()=>setPanel('records')}>成绩榜</button></div>
      {panel==='campus'&&<><StatGrid s={s}/><div className="campus-options"><span>校园景色</span><button className="pixel-button blue" onClick={()=>prefs.toggle('night')}>{prefs.night?'星空校区':'日落校区'}</button></div><p className="small-print">每一块小楼，都算大学的一次努力。成绩仅保存在当前浏览器。</p><button className="pixel-button blue wide" onClick={closePanel}>{preview?'回到校园':'继续卷楼'}</button></>}
      {panel==='rules'&&<><p>对准楼顶，点击画面或按 <kbd>SPACE</kbd> 松钩。每投只有 <b>{RULES.ddl} 秒</b>，落空一次即结束。</p><div className="rule-summary pixel-tags"><span>完美 ≤ 6%</span><span>落稳 ≤ 50%</span><span>超出即落空</span></div><p className="small-print">百分比为砖块中心相对下层中心的偏移 / 砖宽；志愿砖完美窗口为 12%。</p><div className="block-guide">{instructions.map(([name,desc],i)=><div key={name}><div className="mini-room" style={{backgroundPosition:`${[0,1,2,3,4,5,6,11][i]%4*100/3}% ${Math.floor([0,1,2,3,4,5,6,11][i]/4)*50}%`}}/><div><b>{name}</b><span>{desc}</span></div></div>)}</div><p className="small-print">PERFECT 每级连击增加 10% 正向收益，最高 ×2；课业额外 +1 连击。诱惑扣分不翻倍。竞赛记原始积分，每点折算 15 分。</p><p className="small-print">综测 = 层数×10 + GPA×100 + 科研×30 + 竞赛×15 + 志愿×5 + 实践×20。按 Esc 暂停，S 跳过诱惑。</p><button className="pixel-button blue wide" onClick={closePanel}>懂了，去卷楼</button></>}
      {panel==='records'&&<><p className="small-print">当前浏览器 · 按综测总分排序 · 保留前 10 名</p>{prefs.records.length?<ol className="record-list">{prefs.records.map((r,i)=><li key={r.date+i}><span>{i+1}</span><div><b>{r.title}</b><small>{r.floor}F · GPA {r.gpa.toFixed(2)}</small></div><strong>{r.score}</strong></li>)}</ol>:<div className="empty-record">还没有成绩。<br/>校园的天际线，等你来写。</div>}<button className="pixel-button blue wide" onClick={closePanel}>返回校园</button></>}
    </section></div>}
    {poster&&<div className="modal-backdrop poster-backdrop"><section className="poster-modal" role="dialog" aria-modal="true" aria-label="结业海报"><button className="close" aria-label="关闭海报" onClick={()=>setPoster(null)}>×</button><img src={poster} alt="本科四年综测结业鉴定表，含真实楼塔剪影、五维雷达图和游戏二维码"/><p>手机可长按图片保存</p><div className="result-buttons"><a className="pixel-button gold" download={`绩点卷上天-${s.floor}F-${s.score}.png`} href={poster}>保存 PNG</a><button className="pixel-button blue" onClick={restart}>重开大学</button></div></section></div>}
    <div className="sr-only" role="status" aria-live="polite">{s.phase==='CAMERA_SHIFT'?`${s.verdict}，${s.floor} 层，${s.rewardLabel}`:s.finished?`本局结束，${s.floor} 层，${s.score} 分`:''}</div>
  </main>;
}
