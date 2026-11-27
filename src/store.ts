import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {restorePlayerStats,settleBirdEnding,type BirdEndingLine,type LocalPlayerStats} from './features/bird-ending';
export type RecordEntry={date:string;floor:number;score:number;gpa:number;title:string;personaId?:string};
type Preferences={music:boolean;effects:boolean;night:boolean;detailedSway:boolean;birdBubble:boolean;records:RecordEntry[];playerStats:LocalPlayerStats;toggle:(key:'music'|'effects'|'night'|'detailedSway'|'birdBubble')=>void;save:(r:RecordEntry&{personaId:string})=>BirdEndingLine};
export const usePreferences=create<Preferences>()(persist((set,get)=>({music:true,effects:true,night:false,detailedSway:true,birdBubble:false,records:[],playerStats:restorePlayerStats(undefined),toggle:key=>set(s=>({[key]:!s[key]})),save:record=>{
  const previous=get(),result=settleBirdEnding(record,previous.playerStats);
  set({playerStats:result.stats,records:[...previous.records,record].sort((a,b)=>b.score-a.score).slice(0,10)});
  return result.line;
}}),{
  name:'sky-high-kpi-v1',version:1,
  // Preserve legacy scores and scenery settings; audio, FX and bird talk are per visit.
  migrate:state=>state as Preferences,
  partialize:({music,effects,birdBubble,...settings})=>settings,
  merge:(stored,current)=>{
    const saved=(stored??{}) as Partial<Preferences>;
    return {...current,...saved,playerStats:restorePlayerStats(saved.playerStats,saved.records),music:true,effects:true,birdBubble:false};
  },
}));
