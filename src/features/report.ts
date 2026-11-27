import type {Snapshot,Placed} from '../game/engine';
import {getSocialProfile,getTitle} from '../game/rules';
import {birdMoodColors,previewBirdEnding,type BirdEndingLine} from './bird-ending';

export const REPORT_SIZE={width:1080,height:1080};
const xml=(value:string|number)=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]!));
const num=(n:number)=>Number(n.toFixed(2)).toString();
const fit=(text:string,size:number,width:number)=>Math.min(size,width/[...text].reduce((sum,ch)=>sum+(ch.charCodeAt(0)>255?1:.6),0));
export function wrapReportComment(value:string){
  const chars=[...value],weight=(part:string[])=>part.reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.6),0),total=weight(chars);
  if(total<=37)return [value];
  const breaks=chars.flatMap((c,i)=>/[，。；！、]/.test(c)&&i>5&&i<chars.length-6?[i+1]:[]);
  const split=breaks.sort((a,b)=>Math.abs(weight(chars.slice(0,a))-total/2)-Math.abs(weight(chars.slice(0,b))-total/2))[0]??Math.ceil(chars.length/2);
  return [chars.slice(0,split).join(''),chars.slice(split).join('')];
}

// One artwork supplies both the result screen and the downloaded PNG.
export function createReportSvg(s:Snapshot,tower:Placed[],qr:string,bird:string,birdGained=0,ending:BirdEndingLine=previewBirdEnding,birdTextImage?:string){
  const title=getTitle(s),social=getSocialProfile(s.kpi).profile;
  const ink='#172938',cream='#fffaf0';
  const text=(value:string|number,x:number,y:number,size:number,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${xml(value)}</text>`;
  const center=(value:string|number,x:number,y:number,size:number,extra='')=>text(value,x,y,size,`text-anchor="middle" ${extra}`);
  const commentLines=wrapReportComment(title.comment);
  const left=Math.min(-44,...tower.map(p=>p.x-44)),right=Math.max(44,...tower.map(p=>p.x+44));
  const scale=Math.min(1.38,178/Math.max(88,tower.length*88),330/(right-left));
  const tx=279-(left+right)*scale/2;
  const blocks=tower.map(p=>`<rect x="${tx+(p.x-44)*scale}" y="${800+p.y*scale}" width="${Math.max(.7,88*scale-1)}" height="${Math.max(.7,88*scale-1)}" fill="${p.perfect?'#193647':'#294459'}"/>`).join('');
  const cx=786,cy=707,r=91;
  const point=(i:number,radius:number)=>`${cx+Math.cos(-Math.PI/2+i*Math.PI*2/5)*radius},${cy+Math.sin(-Math.PI/2+i*Math.PI*2/5)*radius}`;
  const radar=[s.kpi.gpa/4,s.kpi.research/15,s.kpi.competition/30,s.kpi.volunteer/30,s.kpi.practice/15].map(v=>Math.max(0,Math.min(1,v)));
  const grid=Array.from({length:5},(_,i)=>`<polygon points="${radar.map((_,j)=>point(j,r*(i+1)/5)).join(' ')}" fill="none" stroke="#7b9db4" stroke-width="1.3"/>`).join('');
  const spokes=radar.map((_,i)=>`<path d="M${cx},${cy} L${point(i,r)}" stroke="#a1bacb" stroke-width="1"/>`).join('');
  const summary=`GPA ${s.kpi.gpa.toFixed(2)}　 |　 科研 ${num(s.kpi.research)}　 |　 竞赛 ${num(s.kpi.competition)}　 |　 志愿 ${num(s.kpi.volunteer)}h　 |　 实践 ${num(s.kpi.practice)}`;
  const teeth=Array.from({length:27},(_,i)=>`L${1024-i*36},1047 q-9,-20 -18,0`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2.1" fill="#6bb8ed"/></pattern>
    <pattern id="fine-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#31537a" opacity=".12"/></pattern>
    <linearGradient id="yellow" x2="0" y2="1"><stop stop-color="#ffe783"/><stop offset="1" stop-color="#f4c844"/></linearGradient>
    <linearGradient id="blue" x2="1" y2="1"><stop stop-color="#d5f0ff"/><stop offset="1" stop-color="#83bced"/></linearGradient>
    <linearGradient id="salmon" x2="0" y2="1"><stop stop-color="#ffa98c"/><stop offset="1" stop-color="#e77861"/></linearGradient>
  </defs>
  <g font-family="Microsoft YaHei,PingFang SC,Arial,sans-serif" font-weight="900" fill="${ink}" stroke-linejoin="round">
    <path d="M31 40 L1045 31 L1060 1046 L34 1064Z" fill="${ink}"/>
    <path d="M24 39 L1029 22 L1047 1047 ${teeth} L21 1047 L16 65Z" fill="${cream}" stroke="${ink}" stroke-width="4"/>
    <path d="M22 29 L130 31 L115 93 L32 119Z M67 185 L199 224 L52 227Z M833 185 L1018 237 L945 142Z M31 602 L118 593 L33 758Z M1026 890 L967 1014 L1040 1027Z" fill="url(#dots)" opacity=".75"/>
    <path d="M13 58 L119 8 L133 38 L28 92Z" fill="#ffe38a" stroke="${ink}" stroke-width="3"/>
    ${text("Don't Collapse, MY GPA!",141,68,29,'font-style="italic"')}
    <path d="M594 40 h153 l-7 36 H587Z" fill="url(#yellow)" stroke="${ink}" stroke-width="2.5"/>
    ${center('校园档案',667,66,25)}
    <path d="M846 58 h147" stroke="#8b99a4" stroke-width="10" stroke-dasharray="14 8"/>
    <path d="M256 104 L831 100 L807 119 L856 122 L831 143 L850 148 L823 170 L848 174 L815 195 L840 201 L808 222 L229 225 L254 205 L220 198 L248 177 L219 171 L250 150 L232 142 L264 121 L241 117Z" fill="#f5d44f"/>
    ${center('本科四年综测',540,156,68,'font-style="italic" stroke="#fffdf4" stroke-width="8" paint-order="stroke"')}
    ${center('结业鉴定表',540,220,68,'font-style="italic" stroke="#fffdf4" stroke-width="8" paint-order="stroke"')}
    <path d="M71 251 L567 251 L531 371 L51 371 L48 361 L65 261Z" fill="url(#yellow)" stroke="${ink}" stroke-width="4"/>
    <path d="M582 251 L1000 251 L1014 264 L995 361 L985 371 L548 371Z" fill="url(#blue)" stroke="${ink}" stroke-width="4"/>
    <path d="M562 248 L537 300 L561 298 L529 372 L588 288 L564 290 L591 248Z" fill="#fffdf3" stroke="${ink}" stroke-width="3"/>
    ${center(`${s.floor}F`,300,351,fit(`${s.floor}F`,112,380),'font-family="Arial Black,Arial,sans-serif" font-style="italic" fill="#fffef4" stroke="#101a24" stroke-width="10" paint-order="stroke"')}
    ${center('综测总分',792,284,27)}
    ${center(String(s.score).padStart(5,'0'),782,352,fit(String(s.score).padStart(5,'0'),77,360),'font-family="Arial Black,Arial,sans-serif" font-style="italic" fill="#fff2b2" stroke="#172938" stroke-width="7" paint-order="stroke"')}
    <rect x="265" y="389" width="550" height="39" rx="19" fill="url(#blue)" stroke="#5c7790" stroke-width="2"/>
    ${center(`社交属性 · ${social.name} / ${social.detail}`,540,417,fit(`社交属性 · ${social.name} / ${social.detail}`,26,515))}
    <path d="M192 443 L888 443 L904 458 L889 503 L178 503 L171 490Z" fill="url(#salmon)" stroke="${ink}" stroke-width="4"/>
    <path d="M147 456 l-26 -13 13 28Z M144 486 l-30 10 27 5Z M930 456 l23 -18 -8 29Z M931 490 l31 7 -23 10Z" fill="#f5d44f" stroke="${ink}" stroke-width="2"/>
    ${center(title.name,538,489,fit(title.name,53,675),'font-style="italic" fill="#fffdf4" stroke="#172938" stroke-width="6" paint-order="stroke"')}
    <path d="M238 521 L837 516 L818 540 L850 544 L818 561 L245 561 L257 540 L225 537Z" fill="#e6edf0"/>
    ${commentLines.map((line,i)=>center(line,540,(commentLines.length>1?534:542)+i*29,fit(line,27,900),'fill="#455565"')).join('')}
    <rect x="54" y="584" width="448" height="239" rx="13" fill="${cream}" stroke="${ink}" stroke-width="3"/>
    <rect x="527" y="584" width="499" height="239" rx="13" fill="${cream}" stroke="${ink}" stroke-width="3"/>
    <path d="M60 590 h127 L60 715Z M535 590 h133 L535 715Z M1019 590 h-102 L1019 684Z" fill="url(#dots)" opacity=".6"/>
    <path d="M77 571 L274 568 L266 606 L68 609Z" fill="url(#yellow)" stroke="${ink}" stroke-width="2.5"/>
    ${center('你的天际线',171,597,27,'font-style="italic"')}
    <path d="M126 801 H424" stroke="#355970" stroke-width="3"/>${blocks}
    ${!tower.length?center('地基还在，下把再来',280,716,25,'fill="#6b8795"'):''}
    ${grid}${spokes}<polygon points="${radar.map((v,i)=>point(i,r*v)).join(' ')}" fill="#82b6dc88" stroke="#244d6d" stroke-width="3"/>
    ${center(`GPA ${s.kpi.gpa.toFixed(2)}/4`,786,617,29)}
    ${center('科研',949,696,25)}${center('竞赛',886,807,25)}${center('志愿',677,807,25)}${center('实践',620,696,25)}
    <g transform="translate(940 797) rotate(-12)"><rect x="-102" y="-38" width="204" height="75" fill="#fff9ee" stroke="#cf614e" stroke-width="5"/><rect x="-94" y="-30" width="188" height="59" fill="none" stroke="#cf614e" stroke-width="1.5"/>${center(title.stamp,0,16,fit(title.stamp,45,181),'fill="#cf614e"')}</g>
    <rect x="86" y="844" width="910" height="46" rx="23" fill="url(#blue)" stroke="#2a4053" stroke-width="2"/>
    ${center(summary,540,875,fit(summary,27,875))}
    <image href="${xml(qr)}" x="68" y="919" width="112" height="112"/>
    <path d="M209 919 V1030" stroke="#223849" stroke-width="3"/>
    <path d="M235 953 H688" stroke="#f4d55a" stroke-width="13"/>
    ${text('你的天际线，值得收藏。',232,949,35)}
    ${text('扫码回到校园，再叠一座楼',232,984,25,'fill="#52667a"')}
    ${text(birdGained>0?`已为小鸟存下 ${birdGained} 粒口粮`:'下一次，一起飞得更高',232,1017,23,'fill="#52667a"')}
    <image href="${xml(bird)}" x="708" y="929" width="108" height="113"/>
    <g stroke-linejoin="miter" data-bird-mood="${ending.mood}">
      <title>${xml(ending.text)}</title>
      <path d="M756 904 H1022 V908 H1026 V948 H1022 V952 H792 V956 H788 V960 H784 V964 H780 V952 H756 V948 H752 V908 H756Z" fill="#10172C" transform="translate(2 2)"/>
      <path d="M756 902 H1022 V906 H1026 V946 H1022 V950 H792 V954 H788 V958 H784 V962 H780 V950 H756 V946 H752 V906 H756Z" fill="#172038" stroke="${birdMoodColors[ending.mood]}" stroke-width="2"/>
      ${birdTextImage?`<image href="${xml(birdTextImage)}" x="759" y="906" width="260" height="40" style="image-rendering:pixelated"/>`:center(ending.text,889,934,24,'font-family="CampusPixel,monospace" font-weight="400" fill="#FFF9DB"')}
    </g>
  </g></svg>`;
}
