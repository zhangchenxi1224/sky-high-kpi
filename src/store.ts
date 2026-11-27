import {create} from 'zustand';
import {persist} from 'zustand/middleware';
export type RecordEntry={date:string;floor:number;score:number;gpa:number;title:string};
type Preferences={music:boolean;effects:boolean;night:boolean;detailedSway:boolean;records:RecordEntry[];toggle:(key:'music'|'effects'|'night'|'detailedSway')=>void;save:(r:RecordEntry)=>void};
export const usePreferences=create<Preferences>()(persist((set)=>({music:false,effects:true,night:false,detailedSway:true,records:[],toggle:key=>set(s=>({[key]:!s[key]})),save:record=>set(s=>({records:[...s.records,record].sort((a,b)=>b.score-a.score).slice(0,10)}))}),{name:'sky-high-kpi-v1'}));
