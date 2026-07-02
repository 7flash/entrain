import type { EntrainLayerV1, EntrainSessionV1, Keyframe } from '@/format/entrain-format';

const clamp = (v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

type Graph = { ctx: AudioContext; master: GainNode; analyser: AnalyserNode; stops: AudioScheduledSourceNode[] };

export function createAudioEngine(getSession: () => EntrainSessionV1) {
  let ctx: AudioContext | null = null;
  let graph: Graph | null = null;
  const samples = new Map<string, AudioBuffer>();

  function tlVal(pts: Keyframe[], key: 'beatHz'|'gainPct', tMin: number) {
    const sorted = [...pts].sort((a,b)=>a.tMin-b.tMin);
    if (!sorted.length) return 0;
    if (tMin <= sorted[0].tMin) return Number(sorted[0][key] || 0);
    for (let i=1;i<sorted.length;i++) if (tMin <= sorted[i].tMin) {
      const a=sorted[i-1], b=sorted[i], f=(tMin-a.tMin)/Math.max(1e-9,b.tMin-a.tMin);
      return Number(a[key] || 0) + (Number(b[key] || 0)-Number(a[key] || 0))*f;
    }
    return Number(sorted[sorted.length-1][key] || 0);
  }
  function scheduleParam(param: AudioParam, pts: Keyframe[], key: 'beatHz'|'gainPct', map:(x:number)=>number, start:number, durSec:number) {
    param.setValueAtTime(map(tlVal(pts,key,0)), start);
    for (const p of [...pts].sort((a,b)=>a.tMin-b.tMin)) {
      const rel = p.tMin * 60;
      if (rel <= 0.01 || rel > durSec) continue;
      param.linearRampToValueAtTime(map(Number(p[key] || 0)), start + rel);
    }
  }
  function buildLayer(ctx: AudioContext, l: EntrainLayerV1, start:number, durSec:number, count:number) {
    const layerGain = ctx.createGain();
    scheduleParam(layerGain.gain, l.keyframes, 'gainPct', v => (v/100) * (0.55/Math.sqrt(Math.max(1,count))), start, durSec);
    let input: AudioNode = layerGain;
    const stops: AudioScheduledSourceNode[] = [];
    if (l.type !== 'binaural' && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      const staticPan = clamp(l.pan || 0, -1, 1);
      p.pan.setValueAtTime(staticPan, start);
      if ((l.panMotion?.rateHz || 0) > 0) {
        const lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=clamp(l.panMotion!.rateHz,0,0.25);
        const pg = ctx.createGain(); pg.gain.value=clamp(l.panMotion!.depth,0,1) * (1 - Math.abs(staticPan));
        lfo.connect(pg); pg.connect(p.pan); lfo.start(start); lfo.stop(start+durSec+.1); stops.push(lfo);
      }
      p.connect(layerGain); input = p;
    }
    const stopAt = start + durSec + .1;
    if (l.type === 'sample') {
      const b = samples.get(l.id); if (!b) return { node: layerGain, stops };
      const src = ctx.createBufferSource(); src.buffer=b; src.loop=true; src.connect(input); src.start(start); src.stop(stopAt); stops.push(src); return { node: layerGain, stops };
    }
    if (l.type === 'noise') {
      const src = noise(ctx, l.noiseColor || 'pink'); src.connect(input); src.start(start); src.stop(stopAt); stops.push(src); return { node: layerGain, stops };
    }
    if (l.type === 'carrier') {
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value=l.carrierHz || 220; o.connect(input); o.start(start); o.stop(stopAt); stops.push(o); return { node: layerGain, stops };
    }
    const carrier = l.carrierHz || 220;
    if (l.type === 'binaural' || l.type === 'monaural') {
      const a=ctx.createOscillator(), b=ctx.createOscillator(); a.type=b.type=l.wave||'sine';
      scheduleParam(a.frequency,l.keyframes,'beatHz', hz=>Math.max(20,carrier-hz/2), start, durSec);
      scheduleParam(b.frequency,l.keyframes,'beatHz', hz=>Math.max(20,carrier+hz/2), start, durSec);
      const ga=ctx.createGain(), gb=ctx.createGain(); ga.gain.value=gb.gain.value=.5;
      if (l.type === 'binaural') { const m=ctx.createChannelMerger(2); a.connect(ga); ga.connect(m,0,0); b.connect(gb); gb.connect(m,0,1); m.connect(layerGain); }
      else { a.connect(ga); b.connect(gb); ga.connect(input); gb.connect(input); }
      a.start(start); b.start(start); a.stop(stopAt); b.stop(stopAt); stops.push(a,b); return { node: layerGain, stops };
    }
    const car=ctx.createOscillator(); car.type=l.wave||'sine'; car.frequency.value=carrier;
    const amp=ctx.createGain(); amp.gain.value=0;
    const lfo=ctx.createOscillator(); lfo.type = l.type==='iso-hard'?'square':'sine';
    scheduleParam(lfo.frequency,l.keyframes,'beatHz',hz=>Math.max(.1,hz), start, durSec);
    const mg=ctx.createGain(); mg.gain.value=l.type==='iso-hard'?.47:.4;
    const off=ctx.createConstantSource(); off.offset.value=l.type==='iso-hard'?.50:.56;
    lfo.connect(mg); mg.connect(amp.gain); off.connect(amp.gain); car.connect(amp); amp.connect(input);
    car.start(start); lfo.start(start); off.start(start); car.stop(stopAt); lfo.stop(stopAt); off.stop(stopAt); stops.push(car,lfo,off); return { node: layerGain, stops };
  }
  function build() {
    if (!ctx) throw new Error('no context');
    const session=getSession(), start=ctx.currentTime+.04, dur=session.durationMin*60;
    const master=ctx.createGain(); master.gain.setValueAtTime(0,start); master.gain.linearRampToValueAtTime(.75,start+.8);
    const stops: AudioScheduledSourceNode[]=[];
    const layers=session.layers;
    for (const l of layers) { const out=buildLayer(ctx,l,start,dur,layers.length); out.node.connect(master); stops.push(...out.stops); }
    const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=8; master.connect(comp);
    const analyser=ctx.createAnalyser(); analyser.fftSize=2048; comp.connect(analyser); analyser.connect(ctx.destination);
    graph={ctx,master,analyser,stops};
  }
  return {
    get running(){ return !!graph; },
    async start(){ ctx = ctx || new AudioContext(); await ctx.resume(); build(); },
    stop(){ if(!graph) return; const t=graph.ctx.currentTime; graph.master.gain.setTargetAtTime(0.0001,t,.04); setTimeout(()=>graph?.stops.forEach(s=>{try{s.stop()}catch{}}),180); graph=null; },
    rebuild(){ const was=!!graph; this.stop(); if(was) setTimeout(()=>this.start(),120); },
    async loadSample(layerId:string, file:File){ ctx = ctx || new AudioContext(); samples.set(layerId, await ctx.decodeAudioData(await file.arrayBuffer())); },
    drawScope(canvas: HTMLCanvasElement){ if(!graph)return; const r=canvas.getBoundingClientRect(), d=devicePixelRatio||1; canvas.width=r.width*d; canvas.height=r.height*d; const x=canvas.getContext('2d')!; x.setTransform(d,0,0,d,0,0); const arr=new Uint8Array(graph.analyser.fftSize); graph.analyser.getByteTimeDomainData(arr); x.clearRect(0,0,r.width,r.height); x.strokeStyle='#54dccf'; x.beginPath(); arr.forEach((v,i)=>{ const px=i/(arr.length-1)*r.width, py=r.height/2+((v-128)/128)*r.height*.42; i?x.lineTo(px,py):x.moveTo(px,py); }); x.stroke(); }
  };
}
function noise(ctx: AudioContext, color:string) {
  const len=ctx.sampleRate*2, buf=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=buf.getChannelData(ch); let last=0,b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; if(color==='white')d[i]=w; else if(color==='brown'){ last=(last+.02*w)/1.02; d[i]=last*3.5; } else { b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; } } }
  const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true; return src;
}
