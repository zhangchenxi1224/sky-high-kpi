import {clamp, RULES} from './rules';

const singleImpactTravel=RULES.width*.23;
const maxHeightTravel=RULES.width*.28;
const smooth=(t:number)=>t*t*(3-2*t);

/** Visual response only. The game advances this at 120 Hz alongside the classic sway. */
export class TowerMotion {
  stress=0;
  feedback='';
  edgeSlope=0;
  private age=0;
  private start=0;
  private peak=0;
  private severity=0;
  private previousSide=0;
  private reversal=0;
  private rollPhase=0;
  private heightPhase=0;
  private flexStress=0;
  private centered=true;
  private edge=0;
  private history=new Float64Array(32);
  private head=0;

  atDepth(depth:number){
    // About 33 ms between neighbouring floors. Both rooms at a joint use the same sample.
    const lag=clamp(Math.round(depth*4),0,this.history.length-1);
    return this.history[(this.head-lag+this.history.length)%this.history.length];
  }

  jointOffset(depth:number,floors:number){
    if(depth>=floors)return 0;
    // Ease only the newly landed floor into the amplitude. The slow wave runs through landings.
    const height=floors-1+smooth(Math.min(1,this.age/.43));
    const heightFactor=height*height/(height*height+18*18);
    const heightSway=maxHeightTravel*heightFactor*Math.sin(this.heightPhase);
    const jointHeight=(floors-depth)/floors;
    const drift=heightSway*jointHeight**1.4;
    const flexDepth=Math.min(floors,4+4*this.flexStress);
    const impactWeight=Math.max(0,1-(depth/flexDepth)**1.4);
    return drift+this.atDepth(depth)*impactWeight;
  }

  get landingScaleY(){
    // Compress against the supporting roof, spring above rest, then settle before the next swing.
    const t=this.age;
    if(t>=.38)return 1;
    const squash=this.centered?.16:.16+.04*this.severity;
    if(t<.07)return 1-squash*smooth(t/.07);
    if(t<.19)return 1-squash+1.5*squash*smooth((t-.07)/.12);
    if(t<.30)return 1+squash*(.5-.6*smooth((t-.19)/.11));
    return 1-.1*squash*(1-smooth((t-.30)/.08));
  }

  land(delta:number,perfect:boolean){
    const previousStress=this.stress;
    const fraction=Math.abs(delta)/RULES.width;
    const side=Math.sign(delta);
    this.age=0;
    this.start=this.atDepth(0);
    this.centered=perfect;
    this.severity=clamp(fraction/.5,0,1);
    this.edge=perfect?0:smooth(clamp((fraction-.39)/.09,0,1));
    this.feedback='';
    if(perfect){
      this.stress*=.60;
      this.previousSide=0;
      if(previousStress>=.28)this.feedback='对齐了 · 楼在回稳';
      return;
    }

    const sameSide=side===this.previousSide;
    this.reversal=side===-this.previousSide?previousStress:0;
    this.previousSide=side;
    this.stress=clamp(.82*previousStress+.49*this.severity**1.25,0,1);
    const intensity=this.severity**.8*(.84+.30*this.stress+(sameSide?.22*previousStress:0));
    const travel=singleImpactTravel+.09*RULES.width*previousStress;
    this.peak=side*travel*Math.min(1,intensity);
    if(fraction>=.42)this.feedback='险些落空';
    else if(previousStress<.55&&this.stress>=.55)this.feedback='连续搭偏 · 楼开始摇了';
  }

  step(dt:number){
    this.age+=dt;
    this.heightPhase=(this.heightPhase+dt*2.1)%(2*Math.PI);
    // The tower keeps its own slow rhythm between drops, including when the next brick lands on the opposite side.
    this.rollPhase=(this.rollPhase+dt*4.4)%(2*Math.PI);
    this.flexStress+=(this.stress-this.flexStress)*(1-Math.exp(-dt*7));
    const rocking=.23*RULES.width*this.stress**1.45*Math.sin(this.rollPhase);
    const attack=.065+.10*this.severity;
    const hold=.11*this.edge;
    const lean=Math.sign(this.peak)*(.03*this.severity+.06*this.edge);
    let position:number;
    this.edgeSlope=0;
    if(this.centered){
      const fade=Math.exp(-5*this.age);
      position=this.start*fade*Math.cos(6*this.age)+rocking*(1-fade);
    }else if(this.age<=attack+hold){
      const progress=smooth(Math.min(1,this.age/attack));
      position=this.start+(this.peak-this.start)*progress;
      this.edgeSlope=lean*progress;
    }else{
      const elapsed=this.age-attack-hold;
      const damping=6.5-3.3*this.severity-1.2*this.stress;
      const decay=(1+damping*elapsed)*Math.exp(-damping*elapsed);
      const frequency=8.4+1.8*this.reversal;
      const rebound=Math.cos(frequency*elapsed);
      position=this.peak*decay*rebound+rocking*(1-decay);
      this.edgeSlope=lean*Math.exp(-5*elapsed)*rebound;
    }
    this.head=(this.head+1)%this.history.length;
    this.history[this.head]=position;
  }
}
