import type {Snapshot} from '../game/engine';
import {MetricIcon,type Metric} from './MetricIcon';

const metrics=[['research','科研',''],['competition','竞赛',''],['volunteer','志愿','h'],['practice','实践','']] as const;
const display=(n:number)=>n>=1000?`${Number((n/1000).toFixed(1))}k`:Number(n.toFixed(2)).toString();
export function GameHud({s}:{s:Snapshot}){
  const denseMetrics=metrics.reduce((length,[key,,unit])=>length+display(s.kpi[key]).length+unit.length,0)>13;
  return <div className="hud-top compact-hud">
    <section className="kpi-panel ink-panel" aria-label="楼层与五维指标">
      <div className="kpi-primary"><MetricIcon kind="gpa"/><strong aria-label={`${s.floor} 层`}>{s.floor}<small>F</small></strong><i aria-hidden="true">·</i><span>GPA <b>{s.kpi.gpa.toFixed(2)}</b></span></div>
      <div className={`kpi-secondary${denseMetrics?' dense-metrics':''}`}>{metrics.map(([key,name,unit])=><span key={key} title={`${name} ${s.kpi[key]}${unit}`} aria-label={`${name} ${s.kpi[key]}${unit}`}><MetricIcon kind={key as Metric}/><b>{display(s.kpi[key])}<small>{unit}</small></b></span>)}</div>
    </section>
    {s.statuses.length>0&&!s.finished&&<ul className="status-stack" aria-label="当前增益与减益">{s.statuses.map(status=><li key={status.id} className={`status-chip ${status.tone}`} title={status.description} aria-label={status.description}><span aria-hidden="true">{status.symbol}</span><b>{status.label}</b></li>)}</ul>}
    {s.mode==='fixed'&&<div className="hud-test-note">演示局 · 不计成绩</div>}
  </div>;
}
