export const DAILY_BIRD_FOOD=8;
const STORAGE_KEY='sky-high-kpi-bird-v1';

export type BirdDay={date:string;food:number;fed:number};

export function birdDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

const freshBirdDay=(date=new Date()):BirdDay=>({date:birdDateKey(date),food:0,fed:0});

export function normalizeBirdDay(value:unknown,date=new Date()):BirdDay{
  if(!value||typeof value!=='object')return freshBirdDay(date);
  const saved=value as Partial<BirdDay>;
  if(saved.date!==birdDateKey(date))return freshBirdDay(date);
  const food=Math.floor(Number(saved.food)),fed=Math.floor(Number(saved.fed));
  return {
    date:saved.date,
    food:Number.isFinite(food)?Math.max(0,Math.min(DAILY_BIRD_FOOD,food)):0,
    fed:Number.isFinite(fed)?Math.max(0,fed):0,
  };
}

export function loadBirdDay(date=new Date()){
  try{
    return normalizeBirdDay(JSON.parse(localStorage.getItem(STORAGE_KEY)??'null'),date);
  }catch{
    return freshBirdDay(date);
  }
}

export function saveBirdDay(day:BirdDay){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(day));}catch{}
}

export function addScoreToBird(day:BirdDay,score:number,date=new Date()){
  const current=normalizeBirdDay(day,date);
  const gained=Math.min(DAILY_BIRD_FOOD-current.food,Math.ceil(Math.max(0,score)/100));
  return {day:{...current,food:current.food+gained},gained};
}

export function feedBirdDay(day:BirdDay,date=new Date()){
  const current=normalizeBirdDay(day,date);
  if(current.food<=0)return current;
  return {...current,food:current.food-1,fed:current.fed+1};
}
