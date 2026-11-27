export type Metric='gpa'|'research'|'competition'|'volunteer'|'practice';

/** Small, fixed-palette pixel icons; no platform-dependent emoji rendering. */
export function MetricIcon({kind}:{kind:Metric}){
  return <svg className={`metric-icon icon-${kind}`} viewBox="0 0 32 28" aria-hidden="true" shapeRendering="crispEdges">
    {kind==='gpa'&&<><path fill="#96713b" d="M7 13h19v10l-9 4-10-4z"/><path fill="#e4b856" d="M1 8 16 1 31 8v5l-15 7L1 13z"/><path fill="#ffeaa4" d="M1 8 16 1 31 8l-15 7z"/><path fill="#fff4cb" d="m3 8 13-5 12 5-12-3z"/><path stroke="#ffdc7f" strokeWidth="2" d="M28 12v12"/></>}
    {kind==='research'&&<><path fill="#203445" d="M11 1h10v4h-2v9l8 10v3H5v-3l8-10V5h-2z"/><path fill="#d7edf0" d="M12 2h8v2h-3v11l8 10H7l8-10V4h-3z"/><path fill="#6eafb8" d="M12 18h8l5 7H7z"/><path fill="#b3e5e3" d="M11 19h3v3h-3zM17 22h4v2h-4z"/><path fill="#fffbea" d="M14 5h1v10h-1z"/></>}
    {kind==='competition'&&<><path fill="#bc862d" d="M9 2h14v12l-4 5v5h5v3H8v-3h5v-5l-4-5z"/><path fill="#ffe698" d="M11 2h10v10l-3 5h-4l-3-5z"/><path stroke="#e6b652" strokeWidth="3" fill="none" d="M9 4H4v7l6 4M23 4h5v7l-6 4"/><path fill="#fff4c2" d="M12 3h3v9h-3zM10 24h12v2H10z"/></>}
    {kind==='volunteer'&&<><path fill="#a74e45" d="M3 4h9l4 4 4-4h9v13L16 28 3 17z"/><path fill="#eb967c" d="M5 3h7l4 5 4-5h7l3 4v7L16 26 2 14V7z"/><path fill="#ffc3a0" d="M5 5h6v3H7v5H4V8z"/><path fill="#cd6e60" d="m27 14-11 9v3l14-12V9h-3z"/></>}
    {kind==='practice'&&<><path fill="#aa8137" d="M3 8h26v18H3zM11 1h10v7h-3V4h-4v4h-3z"/><path fill="#eed282" d="M2 8h28v10H2z"/><path fill="#d6ae57" d="M4 20h24v5H4z"/><path fill="#ffe9a3" d="M4 9h24v2H4z"/><path fill="#594d37" d="M14 15h4v6h-4z"/><path fill="#fff0af" d="M15 15h2v3h-2z"/></>}
  </svg>;
}
