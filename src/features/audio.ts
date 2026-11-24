// Imported lazily after a gesture so audio stays compatible with mobile autoplay policies.
type Synth={ZZFX:{audioContext:AudioContext;play:(...args:any[])=>AudioBufferSourceNode}};
export class Sound {
  synth:Synth|null=null;music=false;effects=true;timer:ReturnType<typeof setInterval>|null=null;step=0;paused=false;
  async unlock(){try{this.synth??=await import('zzfx') as Synth;await this.synth.ZZFX.audioContext.resume();}catch{/* Audio is optional; a blocked audio device must never stop play. */}}
  note(freq:number,volume=.08,duration=.12){if(!this.synth||this.paused)return;this.synth.ZZFX.play(volume,0,freq,.01,duration,.1,0,1,0,0,0,0,0,0,0,0,0,.6);}
  effect(type:string,combo=0){if(!this.effects)return;if(type==='perfect'){const step=Math.max(0,Math.min(combo-1,14));this.note([261.63,293.66,329.63,392,440][step%5]*2**Math.floor(step/5),.16,.14);}else if(type==='land')this.note(180,.15,.09);else if(type==='miss')this.note(75,.2,.3);else if(type==='warning')this.note(110,.18,.08);else if(type==='drop')this.note(330,.07,.04);}
  setMusic(enabled:boolean){this.music=enabled;if(this.timer)clearInterval(this.timer);this.timer=null;if(enabled){const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66,261.63,329.63,440,523.25,587.33,523.25,392,329.63];this.timer=setInterval(()=>{this.note(notes[this.step++%notes.length],.035,.22);},360);}}
  dispose(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
