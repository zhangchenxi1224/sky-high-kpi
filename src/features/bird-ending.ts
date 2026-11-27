import memes from '../config/memePack.json';

export type BirdMood='gold'|'unlock'|'encourage'|'comfort'|'idle';
export type BirdEndingLine={mood:BirdMood;text:string;templateId:string};
export type LocalPlayerStats={totalRuns:number;bestScore:number;bestFloor:number;unlockedPersonas:string[];recentLowStreak:number;lastBirdLineId?:string};
export type EndingRun={score:number;floor:number;personaId:string};
type LegacyRecord={score:number;floor:number;title:string;personaId?:string};
export const personaIds=memes.titles.map(title=>title.rule);
export const MAX_BIRD_CHARS=10;
export const previewBirdEnding:BirdEndingLine={mood:'idle',text:'下回再来，一起飞！',templateId:'preview'};
export const birdMoodColors:Record<BirdMood,string>={gold:'#FFD43B',unlock:'#2EE59D',encourage:'#FF9F43',comfort:'#74C0FC',idle:'#E6EEFF'};
const nonnegative=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;

// The previous version only kept its ten best runs. Recover everything those records prove,
// without inventing older runs or discarding future discoveries when the leaderboard fills up.
export function restorePlayerStats(stored:Partial<LocalPlayerStats>|undefined,records:LegacyRecord[]=[]):LocalPlayerStats{
  const fromRecords=records.map(r=>r.personaId??memes.titles.find(t=>t.name===r.title)?.rule);
  const known=Array.isArray(stored?.unlockedPersonas)?stored.unlockedPersonas:[];
  return {
    totalRuns:Math.max(nonnegative(stored?.totalRuns),records.length),
    bestScore:Math.max(nonnegative(stored?.bestScore),0,...records.map(r=>nonnegative(r.score))),
    bestFloor:Math.max(nonnegative(stored?.bestFloor),0,...records.map(r=>nonnegative(r.floor))),
    unlockedPersonas:[...new Set([...known,...fromRecords].filter((id):id is string=>typeof id==='string'&&personaIds.includes(id)))],
    recentLowStreak:nonnegative(stored?.recentLowStreak),
    lastBirdLineId:typeof stored?.lastBirdLineId==='string'?stored.lastBirdLineId:undefined,
  };
}

export function pickBirdLine(key:keyof typeof memes.birdEndingLines,vars:{u:number;t:number;f:number},lastId?:string,random=Math.random){
  const candidates=memes.birdEndingLines[key].map((template,index)=>({
    templateId:`${key}:${index}`,
    text:template.replace(/\{([utf])\}/g,(_,key:'u'|'t'|'f')=>String(vars[key])),
  })).filter(line=>Array.from(line.text).length<=MAX_BIRD_CHARS);
  const fresh=candidates.filter(line=>line.templateId!==lastId),pool=fresh.length?fresh:candidates;
  return pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))]??{templateId:`${key}:fallback`,text:'下回再来！'};
}

// Resolve against the pre-save snapshot. Return both values so persistence cannot change
// this run's line during rerenders, poster generation, downloads or opening the leaderboard.
export function settleBirdEnding(run:EndingRun,previous:LocalPlayerStats,random=Math.random):{line:BirdEndingLine;stats:LocalPlayerStats}{
  const prev=restorePlayerStats(previous),first=prev.totalRuns===0;
  const newPersona=personaIds.includes(run.personaId)&&!prev.unlockedPersonas.includes(run.personaId);
  const unlocked=newPersona?[...prev.unlockedPersonas,run.personaId]:prev.unlockedPersonas;
  const bestScore=!first&&run.score>prev.bestScore,bestFloor=!first&&run.floor>prev.bestFloor,record=bestScore||bestFloor;
  const close=!first&&!record&&prev.bestScore>0&&run.score>=prev.bestScore*.88;
  const low=run.floor<=5||(!first&&prev.bestScore>0&&run.score<prev.bestScore*.45);
  const lowStreak=low?prev.recentLowStreak+1:0;
  const rough=run.floor<=5||(prev.totalRuns>=2&&low)||lowStreak>=2;
  let key:keyof typeof memes.birdEndingLines='normal',mood:BirdMood='idle';
  if(newPersona&&unlocked.length===personaIds.length){key='all_unlocked';mood='gold';}
  else if(newPersona&&record){key='double_win';mood='gold';}
  else if(newPersona){key=first?'first_unlock':'new_persona';mood='unlock';}
  else if(record){key=bestScore?'new_best':'new_best_floor';mood='gold';}
  else if(close){key='close_call';mood='encourage';}
  else if(rough){key='rough_run';mood='comfort';}
  const line={mood,...pickBirdLine(key,{u:unlocked.length,t:personaIds.length,f:run.floor},prev.lastBirdLineId,random)};
  return {line,stats:{totalRuns:prev.totalRuns+1,bestScore:Math.max(prev.bestScore,run.score),bestFloor:Math.max(prev.bestFloor,run.floor),unlockedPersonas:unlocked,recentLowStreak:lowStreak,lastBirdLineId:line.templateId}};
}
