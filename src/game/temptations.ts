export const BALANCE_RULESET='balance-b-20261128';
export type TemptationBuff={id:string;source:string;tone:'positive'|'negative';symbol:string;label:string;speed?:number;angle?:number;ddl?:number};
export type TemptationOutcome={gpaCost?:number;practice?:number;competition?:number;buff?:TemptationBuff;label:string;metric:'practice'|'competition'|'temptation'|'coffee'};
export type TemptationDefinition={id:string;weight:number;risksGpa:boolean;preview:readonly string[];perfect:TemptationOutcome;success:TemptationOutcome};
const rest:TemptationOutcome={buff:{id:'rest',source:'爱你老己',tone:'positive',symbol:'↔',label:'幅 −15% · ×1',angle:.85},label:'下投摆幅 −15%',metric:'coffee'};
const snack:TemptationOutcome={buff:{id:'snack',source:'夜宵补给',tone:'positive',symbol:'＋',label:'DDL +1s · ×1',ddl:1},label:'下投 DDL +1s',metric:'coffee'};
const binge:TemptationOutcome={gpaCost:.1,buff:{id:'binge',source:'先看两集红果',tone:'positive',symbol:'»',label:'速 −20% · ×1',speed:.8},label:'GPA −0.10',metric:'temptation'};
const stream:TemptationOutcome={buff:{id:'stream',source:'康神开播了',tone:'negative',symbol:'↔',label:'幅 +15% · ×1',angle:1.15},label:'下投摆幅 +15%',metric:'temptation'};
export const TEMPTATIONS:readonly TemptationDefinition[]=[
  {id:'tempt_selflove',weight:.25,risksGpa:false,preview:['下投 摆幅 −15%','无额外扣分'],perfect:rest,success:rest},
  {id:'tempt_snack',weight:.15,risksGpa:false,preview:['下投 DDL +1s','无额外扣分'],perfect:snack,success:snack},
  {id:'tempt_hongguo',weight:.20,risksGpa:true,preview:['本投 GPA −0.10','下投 摆速 −20%'],perfect:binge,success:binge},
  {id:'tempt_delta',weight:.15,risksGpa:true,preview:['完美 实践 +2','落稳 GPA −0.10'],perfect:{practice:2,label:'实践 +2',metric:'practice'},success:{gpaCost:.1,label:'GPA −0.10',metric:'temptation'}},
  {id:'tempt_hok',weight:.15,risksGpa:false,preview:['完美 竞赛 +3','落稳 下投速 +15%'],perfect:{competition:3,label:'竞赛 +3',metric:'competition'},success:{buff:{id:'tilt',source:'赢一把王者就睡',tone:'negative',symbol:'»',label:'速 +15% · ×1',speed:1.15},label:'下投摆速 +15%',metric:'temptation'}},
  {id:'tempt_kangshen',weight:.10,risksGpa:false,preview:['下投 摆幅 +15%','可免费跳过'],perfect:stream,success:stream},
];
export const temptationDefinition=(id:string)=>TEMPTATIONS.find(t=>t.id===id)!;
export const eligibleTemptations=(gpa:number)=>TEMPTATIONS.filter(t=>gpa>=.3||!t.risksGpa);
export const temptationOutcome=(id:string,perfect:boolean)=>temptationDefinition(id)[perfect?'perfect':'success'];
export type TemptationMetrics={offered:number;accepted:number;skipped:number;perfect:number;success:number;miss:number;gpaCost:number;practice:number;competition:number;buffTurns:number};
export const emptyTemptationMetrics=():TemptationMetrics=>({offered:0,accepted:0,skipped:0,perfect:0,success:0,miss:0,gpaCost:0,practice:0,competition:0,buffTurns:0});
