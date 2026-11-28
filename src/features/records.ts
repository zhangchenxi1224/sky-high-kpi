import {BALANCE_RULESET,type TemptationMetrics} from '../game/temptations';
import {restorePlayerStats,type LocalPlayerStats} from './bird-ending';
export type RecordEntry={date:string;floor:number;score:number;gpa:number;title:string;personaId?:string;ruleset?:string;temptationStats?:Record<string,TemptationMetrics>};
export type StoredProgress={ruleset?:string;records?:RecordEntry[];legacyRecords?:RecordEntry[];playerStats?:LocalPlayerStats;legacyPlayerStats?:LocalPlayerStats};
export function restoreBalanceProgress(saved:StoredProgress){
  const records=Array.isArray(saved.records)?saved.records:[],legacy=Array.isArray(saved.legacyRecords)?saved.legacyRecords:[];
  if(saved.ruleset===BALANCE_RULESET)return {ruleset:BALANCE_RULESET,records,legacyRecords:legacy,playerStats:restorePlayerStats(saved.playerStats,records),legacyPlayerStats:saved.legacyPlayerStats};
  const previous=restorePlayerStats(saved.playerStats,records);
  return {ruleset:BALANCE_RULESET,records:[] as RecordEntry[],legacyRecords:[...legacy,...records],legacyPlayerStats:previous,
    playerStats:{...restorePlayerStats(undefined),unlockedPersonas:previous.unlockedPersonas,lastBirdLineId:previous.lastBirdLineId}};
}
