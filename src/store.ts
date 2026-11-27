import {create} from 'zustand';
import {persist} from 'zustand/middleware';
export type RecordEntry={date:string;floor:number;score:number;gpa:number;title:string};
type Preferences={music:boolean;effects:boolean;night:boolean;detailedSway:boolean;birdBubble:boolean;records:RecordEntry[];toggle:(key:'music'|'effects'|'night'|'detailedSway'|'birdBubble')=>void;save:(r:RecordEntry)=>void};
export const usePreferences=create<Preferences>()(persist((set)=>({music:true,effects:true,night:false,detailedSway:true,birdBubble:false,records:[],toggle:key=>set(s=>({[key]:!s[key]})),save:record=>set(s=>({records:[...s.records,record].sort((a,b)=>b.score-a.score).slice(0,10)}))}),{
  name:'sky-high-kpi-v1',version:1,
  // Earlier releases persisted their silent default. Enable the new MP3 once,
  // while retaining records/settings and honoring later deliberate mute choices.
  migrate:(state,version)=>version<1?{...(state as Preferences),music:true}:state as Preferences,
  // Conversation belongs to this visit, not the next page load.
  partialize:({birdBubble,...settings})=>settings,
  merge:(stored,current)=>({...current,...stored as Partial<Preferences>,birdBubble:false}),
}));
