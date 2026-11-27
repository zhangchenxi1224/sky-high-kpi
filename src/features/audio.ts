import {assetUrl} from './assets';
// Imported lazily after a gesture so audio stays compatible with mobile autoplay policies.
type Synth={ZZFX:{audioContext:AudioContext;play:(...args:any[])=>AudioBufferSourceNode}};
export class Sound {
  synth:Synth|null=null;music=false;effects=true;
  private track:HTMLAudioElement|null=null;private unlocked=false;private isPaused=false;
  constructor(private createTrack=()=>new Audio(assetUrl('campus-bgm.mp3'))){}
  get paused(){return this.isPaused;}
  set paused(value:boolean){this.isPaused=value;this.syncMusic();}
  private syncMusic(){
    if(!this.music||this.isPaused||!this.unlocked){this.track?.pause();return;}
    if(!this.track){this.track=this.createTrack();this.track.loop=true;this.track.volume=.32;this.track.preload='none';
      if(typeof document!=='undefined'){this.track.hidden=true;this.track.dataset.bgm='campus';document.body.append(this.track);}
    }
    if(this.track.paused)void this.track.play().catch(()=>{/* Retry on the next user gesture if autoplay was blocked. */});
  }
  async unlock(){
    this.unlocked=true;this.syncMusic();
    try{this.synth??=await import('zzfx') as Synth;await this.synth.ZZFX.audioContext.resume();}catch{/* Audio is optional; a blocked device never stops play. */}
  }
  note(freq:number,volume=.08,duration=.12){if(!this.synth||this.paused)return;this.synth.ZZFX.play(volume,0,freq,.01,duration,.1,0,1,0,0,0,0,0,0,0,0,0,.6);}
  effect(type:string,combo=0){if(!this.effects)return;if(type==='perfect'){const step=Math.max(0,Math.min(combo-1,14));this.note([261.63,293.66,329.63,392,440][step%5]*2**Math.floor(step/5),.16,.14);}else if(type==='land')this.note(180,.15,.09);else if(type==='miss')this.note(75,.2,.3);else if(type==='warning')this.note(110,.18,.08);else if(type==='drop')this.note(330,.07,.04);}
  setMusic(enabled:boolean){this.music=enabled;this.syncMusic();}
  dispose(){this.track?.pause();}
}
