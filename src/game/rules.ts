import memes from '../config/memePack.json';
export const RULES = {version:'2026.11.5', width:88, height:88, gravity:1400, ddl:6, perfect:.06, volunteerPerfect:.12, omegaMin:1.43,omegaMax:3.905,highPressureOmega:3.135,towerSway:true,fitnessChance:.04,fitnessKpi:30,fitnessBoost:.15};
export type Kind = 'study'|'research'|'competition'|'volunteer'|'practice'|'coffee'|'notes'|'temptation'|'fitness';
export type KPI = {gpa:number;research:number;competition:number;volunteer:number;practice:number};
export type Block = {id:string;kind:Kind;name:string;sprite:number;value:number};
export const emptyKpi=():KPI=>({gpa:0,research:0,competition:0,volunteer:0,practice:0});
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const round=(v:number)=>Math.round((v+Number.EPSILON)*10000)/10000;
export const score=(floor:number,k:KPI)=>Math.round(floor*10+k.gpa*100+k.research*30+k.competition*15+k.volunteer*5+k.practice*20);
export function difficulty(n:number,rollback=0){
  const effective=Math.max(1,n-rollback);
  const climbed=effective-1;
  const omega=RULES.omegaMin+(RULES.omegaMax-RULES.omegaMin)*(1-Math.exp(-climbed/26));
  const angle=18+27*(1-Math.exp(-climbed/22));
  return {effective,omega,angle};
}
export const judge=(delta:number,kind:Kind)=>Math.abs(delta)<=RULES.width*(kind==='volunteer'?.12:.06)+1e-9?'PERFECT':Math.abs(delta)<=RULES.width*.5+1e-9?'SUCCESS':'MISS';
const drawKinds=['study','volunteer','practice','research','competition','coffee','notes','temptation','fitness'] as const;
const drawSchedule=[
  {floor:3,  percent:[60,25,15, 0, 0,0,0,0]},
  {floor:8,  percent:[48,16,14, 8, 6,4,3,1]},
  {floor:20, percent:[40,13,12,12,11,5,4,3]},
  {floor:35, percent:[34,11,12,15,14,5,4,5]},
];
export function weights(n:number,boostTemptation=false){
  const floor=clamp(n,drawSchedule[0].floor,drawSchedule.at(-1)!.floor);
  const index=drawSchedule.findIndex(row=>row.floor>=floor);
  const end=drawSchedule[index], start=drawSchedule[Math.max(0,index-1)];
  const t=index===0?0:(floor-start.floor)/(end.floor-start.floor);
  const blend=t*t*(3-2*t);
  const base=start.percent.map((p,i)=>(p+(end.percent[i]-p)*blend)/100);
  const temptation=drawKinds.indexOf('temptation');
  const original=base[temptation];
  const selected=boostTemptation?Math.min(.10,original*2):original;
  // Keep test's absolute temptation chance; fitness takes 4% from the other seven kinds.
  const fitness=n>=4?RULES.fitnessChance:0;
  return [...base.map((p,i)=>i===temptation?selected:p*(1-selected-fitness)/(1-original)),fitness];
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
export function drawBlock(n:number,random:()=>number,highPressure:boolean,recentTemptation:boolean):Block {
  const pick=(list:Block[])=>({...list[Math.min(list.length-1,Math.floor(random()*list.length))]});
  let roll=random();
  const odds=weights(n,highPressure&&!recentTemptation);
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
    return {kpi:k,label:'GPA −0.15',multiplier};
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
export type TitleStats={floor:number;kpi:KPI;accepted:number;maxSkipStreak:number;maxCombo:number;researchImperfect:number;counts:Partial<Record<Kind,number>>};
export function getTitle(s:TitleStats){
  const k=s.kpi;const volunteerValue=k.volunteer*5+k.practice*20;const social=socialMetrics(k);
  const nGpa=clamp(k.gpa/4,0,1),nResearch=clamp(k.research/15,0,1),nCompetition=clamp(k.competition/30,0,1),nVolunteer=clamp(k.volunteer/30,0,1),nPractice=clamp(k.practice/15,0,1);
  const comeback=s.floor>=20&&nGpa<=.75&&Math.max(nCompetition,nPractice)>=.5&&s.maxCombo>=3;
  const allRounder=s.floor>=25&&[nGpa,nResearch,nCompetition,nVolunteer,nPractice].every(v=>v>=.55);
  const projectStar=s.floor>=15&&social.social>=.62&&(nCompetition+nPractice)/2>=.55;
  const libraryHermit=s.floor>=15&&social.academic>=.65&&social.id==='introvert';
  const exactScore=score(s.floor,k);
  const rule=exactScore===1103?'chenze1103':s.accepted>=3?'temptation':s.maxSkipStreak>=3&&s.floor>20?'resist':comeback?'comeback':s.floor>=30&&k.gpa>=3.8?'champion':allRounder?'allRounder':projectStar?'projectStar':volunteerValue>Math.max(k.gpa*100,k.research*30,k.competition*15)&&s.maxCombo>=3?'volunteer':(s.counts.research??0)>=Math.max(1,...Object.values(s.counts))&&s.researchImperfect>=2?'research':libraryHermit?'libraryHermit':s.floor<=5?'early':'default';
  return memes.titles.find(t=>t.rule===rule)!;
}
export const FIXED_SEQUENCE=['study','volunteer','practice','research','competition','fitness','coffee','notes',...memes.temptationSkins.map(s=>s.id)];
