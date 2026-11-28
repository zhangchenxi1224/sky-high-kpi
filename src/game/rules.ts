import memes from '../config/memePack.json';
const swingSpeedScale=1.08, swingAngleScale=1.06;
export const RULES = {version:'2026.11.8', width:88, height:88, gravity:1400, ddl:6, perfect:.06, volunteerPerfect:.12, omegaMin:1.43*swingSpeedScale,omegaMax:3.905*swingSpeedScale,highPressureOmega:3.135*swingSpeedScale,angleMin:18*swingAngleScale,angleMax:45*swingAngleScale,towerSway:true,fitnessChance:.04,fitnessKpi:30,fitnessBoost:.15};
export const OPENING_DRAW_RULES={lastFloor:8,maxStudyStreak:2};
export const TEMPTATION_RULES={cooldown:3,minGpa:.30,highPressureMultiplier:1.5,minDifficultyProgress:.65,reliefDecay:1};
export const temptationRelief=(floor:number)=>floor<=20?6:floor<=40?4:2;
export type Kind = 'study'|'research'|'competition'|'volunteer'|'practice'|'coffee'|'notes'|'temptation'|'fitness';
export type KPI = {gpa:number;research:number;competition:number;volunteer:number;practice:number};
export type Block = {id:string;kind:Kind;name:string;sprite:number;value:number};
export const emptyKpi=():KPI=>({gpa:0,research:0,competition:0,volunteer:0,practice:0});
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const round=(v:number)=>Math.round((v+Number.EPSILON)*10000)/10000;
export const score=(floor:number,k:KPI)=>Math.round(floor*10+k.gpa*100+k.research*30+k.competition*15+k.volunteer*5+k.practice*20);
export function difficulty(n:number,rollback=0){
  const effective=Math.max(1+(Math.max(1,n)-1)*TEMPTATION_RULES.minDifficultyProgress,n-clamp(rollback,0,6));
  const climbed=effective-1;
  const omega=RULES.omegaMin+(RULES.omegaMax-RULES.omegaMin)*(1-Math.exp(-climbed/26));
  const angle=RULES.angleMin+(RULES.angleMax-RULES.angleMin)*(1-Math.exp(-climbed/22));
  return {effective,omega,angle};
}
export const judge=(delta:number,kind:Kind)=>Math.abs(delta)<=RULES.width*(kind==='volunteer'?.12:.06)+1e-9?'PERFECT':Math.abs(delta)<=RULES.width*.5+1e-9?'SUCCESS':'MISS';
const drawKinds=['study','volunteer','practice','research','competition','coffee','notes','temptation','fitness'] as const;
const drawSchedule=[
  {floor:3,  percent:[60,25,15, 0, 0,0,0,0],temptation:0},
  {floor:8,  percent:[48,16,14, 8, 6,4,3,1],temptation:.01},
  {floor:20, percent:[40,13,12,12,11,5,4,3],temptation:.02},
  {floor:35, percent:[34,11,12,15,14,5,4,5],temptation:.03},
];
export function weights(n:number,boostTemptation=false,context:{recentTemptation?:boolean;gpa?:number;history?:readonly Kind[]}={}){
  const floor=clamp(n,drawSchedule[0].floor,drawSchedule.at(-1)!.floor);
  const index=drawSchedule.findIndex(row=>row.floor>=floor);
  const end=drawSchedule[index], start=drawSchedule[Math.max(0,index-1)];
  const t=index===0?0:(floor-start.floor)/(end.floor-start.floor);
  const blend=t*t*(3-2*t);
  const base=start.percent.map((p,i)=>(p+(end.percent[i]-p)*blend)/100);
  const temptation=drawKinds.indexOf('temptation');
  const original=base[temptation];
  const natural=start.temptation+(end.temptation-start.temptation)*blend;
  const blocked=context.recentTemptation||(context.gpa??4)<TEMPTATION_RULES.minGpa;
  const selected=blocked?0:natural*(boostTemptation?TEMPTATION_RULES.highPressureMultiplier:1);
  const recent=context.history?.slice(-OPENING_DRAW_RULES.maxStudyStreak)??[];
  const restStudy=n<=OPENING_DRAW_RULES.lastFloor&&recent.length===OPENING_DRAW_RULES.maxStudyStreak&&recent.every(kind=>kind==='study');
  const positive=base.map((p,i)=>i===temptation||(restStudy&&i===0)?0:p);
  const positiveTotal=positive.reduce((a,b)=>a+b,0);
  // Keep fitness at 4%; redistribute protected temptation odds among positive categories.
  // The opening cooldown only redistributes study odds among the other positive kinds.
  const fitness=n>=4?RULES.fitnessChance:0;
  return [...positive.map((p,i)=>i===temptation?selected:p*(1-selected-fitness)/(restStudy?positiveTotal:1-original)),fitness];
}
export const seeded=(seed:number)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
export const catalog:Block[]=[
  {id:'study',kind:'study',name:'高数',sprite:0,value:.20},
  {id:'linear',kind:'study',name:'线性代数',sprite:0,value:.23},
  {id:'major',kind:'study',name:'核心专业课',sprite:0,value:.26},
  {id:'research',kind:'research',name:'论文室',sprite:1,value:2},
  {id:'research_ddl',kind:'research',name:'顶会 DDL',sprite:1,value:3},
  {id:'research_code',kind:'research',name:'老艺术家手搓代码',sprite:1,value:1},
  {id:'competition',kind:'competition',name:'竞赛活动室',sprite:2,value:4},
  {id:'innovation',kind:'competition',name:'国家级大创',sprite:2,value:6},
  {id:'volunteer',kind:'volunteer',name:'志愿服务站',sprite:3,value:4},
  {id:'volunteer_two',kind:'volunteer',name:'综测跑刀鼠鼠',sprite:3,value:2},
  {id:'practice',kind:'practice',name:'社会实践',sprite:4,value:2},
  {id:'survey',kind:'practice',name:'调研报告',sprite:4,value:3},
  {id:'practice_one',kind:'practice',name:'收藏夹实践课',sprite:4,value:1},
  {id:'coffee',kind:'coffee',name:'续命冰美式',sprite:5,value:0},
  {id:'notes',kind:'notes',name:'复习邪修秘籍',sprite:6,value:.1},
  {id:'fitness',kind:'fitness',name:'体测训练室',sprite:12,value:0},
  ...memes.temptationSkins.map(s=>({id:s.id,kind:'temptation' as Kind,name:s.name,sprite:s.sprite,value:-.15}))
];
export function drawBlock(n:number,random:()=>number,highPressure:boolean,recentTemptation:boolean,gpa=4,history:readonly Kind[]=[]):Block {
  const pick=(list:Block[])=>({...list[Math.min(list.length-1,Math.floor(random()*list.length))]});
  let roll=random();
  const odds=weights(n,highPressure,{recentTemptation,gpa,history});
  let index=0;
  while(index<odds.length-1&&roll>=odds[index]){
    roll-=odds[index++];
  }
  return pick(catalog.filter(b=>b.kind===drawKinds[index]));
}
export function reward(kpi:KPI,block:Block,perfect:boolean,combo:number,practiceBuff:boolean):{kpi:KPI;label:string;multiplier:number}{
  const k={...kpi};
  const comboMultiplier=perfect?1+Math.min(combo,10)*.1:1;
  const multiplier=comboMultiplier*(practiceBuff?1.25:1);
  if(block.kind==='coffee')return {kpi:k,label:'冰美式 · 减速 5 秒',multiplier};
  if(block.kind==='fitness')return {kpi:k,label:'体测完成 · 无综测收益',multiplier};
  if(block.kind==='temptation'){
    k.gpa=Math.max(0,round(k.gpa-.15));
    const cost=round(kpi.gpa-k.gpa);
    return {kpi:k,label:cost?`GPA −${cost.toFixed(2)}`:'GPA 0.00',multiplier};
  }

  const stat=block.kind==='study'||block.kind==='notes'?'gpa':block.kind;
  const names={gpa:'GPA',research:'科研',competition:'竞赛',volunteer:'志愿',practice:'实践'};
  const unit=stat==='volunteer'?'h':'';
  const balanceAfter=(factor:number)=>{
    const value=round(block.value*factor);
    const gain=stat==='research'&&!perfect?value*.7:value;
    const balance=round(kpi[stat]+gain);
    return stat==='gpa'?clamp(balance,0,4):balance;
  };
  k[stat]=balanceAfter(multiplier);
  const credited=round(k[stat]-kpi[stat]);
  const extra=practiceBuff?round(k[stat]-balanceAfter(comboMultiplier)):0;
  const amount=stat==='gpa'&&!extra?credited.toFixed(2):String(credited);
  let label=`${names[stat]} +${amount}${unit}`;
  if(extra>0)label+=`（实践多赚 ${extra}${unit}）`;
  return {kpi:k,label,multiplier};
}
export type SocialId='extrovert'|'introvert'|'ambivert'|'spectator';
export type SocialMetrics={id:SocialId;academic:number;social:number;delta:number};
export function socialMetrics(k:KPI):SocialMetrics{
  const nGpa=clamp(k.gpa/4,0,1),nResearch=clamp(k.research/15,0,1),nCompetition=clamp(k.competition/30,0,1),nVolunteer=clamp(k.volunteer/30,0,1),nPractice=clamp(k.practice/15,0,1);
  const academic=nGpa*.65+nResearch*.35;
  const social=nCompetition*.3+nVolunteer*.4+nPractice*.3;
  const delta=social-academic;
  const id:SocialId=Math.max(academic,social)<.2?'spectator':delta>=.15?'extrovert':delta<=-.15?'introvert':'ambivert';
  return {id,academic,social,delta};
}
export function getSocialProfile(k:KPI){
  const metrics=socialMetrics(k);
  return {metrics,profile:memes.socialProfiles.find(p=>p.id===metrics.id)!};
}
export type TitleStats={floor:number;kpi:KPI;accepted:number;maxSkipStreak:number;maxCombo:number;researchImperfect:number;counts:Partial<Record<Kind,number>>;lateLandings?:number;narrowLandings?:number;ddlForcedMiss?:boolean};
export function getTitle(s:TitleStats){
  const k=s.kpi;const volunteerValue=k.volunteer*5+k.practice*20;const social=socialMetrics(k);
  const nGpa=clamp(k.gpa/4,0,1),nResearch=clamp(k.research/15,0,1),nCompetition=clamp(k.competition/30,0,1),nVolunteer=clamp(k.volunteer/30,0,1),nPractice=clamp(k.practice/15,0,1);
  const comeback=s.floor>=20&&nGpa<=.75&&Math.max(nCompetition,nPractice)>=.5&&s.maxCombo>=3;
  const allRounder=s.floor>=25&&[nGpa,nResearch,nCompetition,nVolunteer,nPractice].every(v=>v>=.55);
  const projectStar=s.floor>=15&&social.social>=.62&&(nCompetition+nPractice)/2>=.55;
  const libraryHermit=s.floor>=15&&social.academic>=.65&&social.id==='introvert';
  const exactScore=score(s.floor,k);
  // Priority follows the agreed insertion positions; the first match wins.
  const candidates:[string,boolean][]=[
    ['chenze1103',exactScore===1103],
    ['zeroGpa',s.floor>=10&&k.gpa===0],
    ['secretGrinder',s.accepted>=2&&s.floor>=22&&k.gpa>=3.3],
    ['temptation',s.accepted>=3],
    ['resist',s.maxSkipStreak>=3&&s.floor>20],
    ['comeback',comeback],
    ['champion',s.floor>=30&&k.gpa>=3.8],
    ['precision',s.maxCombo>=7],
    ['allRounder',allRounder],
    ['deadline',s.floor>=8&&((s.lateLandings??0)>=3||s.ddlForcedMiss===true)],
    ['projectStar',projectStar],
    ['volunteer',volunteerValue>Math.max(k.gpa*100,k.research*30,k.competition*15)&&s.maxCombo>=3],
    ['campusHelper',s.floor>=12&&k.volunteer>=20&&k.gpa<=2.2],
    ['research',(s.counts.research??0)>=Math.max(1,...Object.values(s.counts))&&s.researchImperfect>=2],
    ['itemMaster',s.floor>=15&&(s.counts.coffee??0)+(s.counts.notes??0)>=3],
    ['examPurist',s.floor>=15&&k.gpa>=3.6&&k.research<=2&&k.competition<=5&&k.volunteer<=4&&k.practice<=2],
    ['libraryHermit',libraryHermit],
    ['narrowMiracle',s.floor>=16&&s.maxCombo<=1&&(s.narrowLandings??0)>=5],
    ['early',s.floor<=5],
    ['default',true]
  ];
  const rule=candidates.find(([,matches])=>matches)![0];
  return memes.titles.find(t=>t.rule===rule)!;
}
export const FIXED_SEQUENCE=['study','volunteer','practice','research','competition','fitness','coffee','notes',...memes.temptationSkins.flatMap(s=>[s.id,'study','volunteer','practice'])];
