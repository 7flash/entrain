import { render } from 'tradjs/client';
import type { EntrainSessionV1 } from '@/format/entrain-format';
import { defaultSession } from '@/format/entrain-format';
import { createAudioEngine } from '@/client/audio-engine';

let session: EntrainSessionV1 = defaultSession();
let engine = createAudioEngine(() => session);
let status = 'idle';

function App() {
  return (
    <div>
      <div className="panel toolbar">
        <div>
          <strong>{session.name}</strong>
          <div className="small">{session.durationMin} min · {session.layers.length} layers · {status}</div>
        </div>
        <div className="tagrow">
          <button className="btn primary" onClick={toggle}>{engine.running ? 'Stop' : 'Start'}</button>
          <button className="btn" onClick={addAmbience}>+ Ambience file</button>
          <button className="btn" onClick={exportJson}>Export JSON</button>
          <label className="btn">Import JSON<input type="file" accept=".json,application/json" style={{ display:'none' }} onChange={importJson} /></label>
        </div>
      </div>
      <div className="panel studio-grid">
        <aside>
          <div className="field"><label>Session name</label><input value={session.name} onInput={(e: any) => { session.name = e.currentTarget.value; repaint(); }} /></div>
          <div className="field"><label>Duration minutes</label><input type="number" min="1" max="180" value={String(session.durationMin)} onInput={(e: any) => { session.durationMin = Number(e.currentTarget.value || 1); repaint(); }} /></div>
          <button className="btn" onClick={addLayer}>+ Tone layer</button>
          <div id="scope" className="scope"><canvas id="scope-canvas" /></div>
        </aside>
        <section>
          {session.layers.map((l) => <div className="layer" key={l.id}>
            <div className="layer-head"><strong>{l.type}</strong><button className="btn" onClick={() => removeLayer(l.id)}>remove</button></div>
            <div className="two">
              <div className="field"><label>Type</label><select value={l.type} onChange={(e:any)=>{ l.type=e.currentTarget.value; repaint(true); }}><option value="binaural">binaural</option><option value="monaural">monaural</option><option value="iso-smooth">iso smooth</option><option value="iso-hard">iso hard</option><option value="carrier">carrier</option><option value="noise">noise</option><option value="sample">ambience sample</option></select></div>
              <div className="field"><label>Gain %</label><input type="range" min="0" max="100" value={String(l.keyframes[0]?.gainPct || 0)} onInput={(e:any)=>{ l.keyframes.forEach(k=>k.gainPct=Number(e.currentTarget.value)); repaint(true); }} /></div>
              {l.type !== 'noise' && l.type !== 'sample' ? <div className="field"><label>Carrier Hz</label><input type="number" value={String(l.carrierHz || 220)} onInput={(e:any)=>{ l.carrierHz=Number(e.currentTarget.value); repaint(true); }} /></div> : null}
              {l.type !== 'noise' && l.type !== 'carrier' && l.type !== 'sample' ? <div className="field"><label>Beat Hz</label><input type="number" step="0.1" value={String(l.keyframes[0]?.beatHz || 10)} onInput={(e:any)=>{ l.keyframes.forEach(k=>k.beatHz=Number(e.currentTarget.value)); repaint(true); }} /></div> : null}
              {l.type !== 'binaural' ? <div className="field"><label>Pan</label><input type="range" min="-1" max="1" step="0.01" value={String(l.pan || 0)} onInput={(e:any)=>{ l.pan=Number(e.currentTarget.value); repaint(true); }} /></div> : null}
              {l.type !== 'binaural' ? <div className="field"><label>Pan motion Hz</label><input type="range" min="0" max="0.25" step="0.005" value={String(l.panMotion?.rateHz || 0)} onInput={(e:any)=>{ l.panMotion = { rateHz:Number(e.currentTarget.value), depth:l.panMotion?.depth ?? .4 }; repaint(true); }} /></div> : null}
              {l.type !== 'binaural' && (l.panMotion?.rateHz || 0) > 0 ? <div className="field"><label>Motion depth</label><input type="range" min="0" max="1" step="0.01" value={String(l.panMotion?.depth || .4)} onInput={(e:any)=>{ l.panMotion = { rateHz:l.panMotion?.rateHz || 0, depth:Number(e.currentTarget.value) }; repaint(true); }} /></div> : null}
              {l.type === 'sample' ? <div className="field"><label>Ambience file</label><input type="file" accept="audio/*" onChange={(e:any)=>loadSample(l.id, e.currentTarget.files?.[0])} /></div> : null}
            </div>
          </div>)}
        </section>
      </div>
    </div>
  );
}

function addLayer() { session.layers.push({ id: crypto.randomUUID(), type:'binaural', carrierHz:220, wave:'sine', keyframes:[{ tMin:0, beatHz:10, gainPct:35 }, { tMin:session.durationMin, beatHz:10, gainPct:35 }] }); repaint(true); }
function addAmbience() { session.layers.push({ id: crypto.randomUUID(), type:'sample', sampleName:'load a file', pan:0, panMotion:{ rateHz:.03, depth:.35 }, keyframes:[{ tMin:0, gainPct:22 }, { tMin:session.durationMin, gainPct:22 }] }); repaint(true); }
function removeLayer(id: string) { session.layers = session.layers.filter((l) => l.id !== id); repaint(true); }
async function loadSample(id: string, file?: File) { if (!file) return; await engine.loadSample(id, file); const l=session.layers.find(x=>x.id===id); if(l) l.sampleName=file.name; repaint(true); }
async function toggle() { if (engine.running) { engine.stop(); status='idle'; } else { await engine.start(); status='running'; draw(); } repaint(); }
function exportJson() { const clean = JSON.stringify(session, null, 2); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([clean],{type:'application/json'})); a.download=session.name.replace(/\W+/g,'_')+'.entrain.json'; a.click(); }
async function importJson(e: any) { const f=e.currentTarget.files?.[0]; if(!f)return; session = JSON.parse(await f.text()); engine.stop(); engine = createAudioEngine(() => session); repaint(); }
function repaint(rebuild=false) { if (rebuild && engine.running) engine.rebuild(); render(<App />, document.getElementById('studio-root')!); }
function draw(){ if(!engine.running) return; const canvas=document.getElementById('scope-canvas') as HTMLCanvasElement|null; if(canvas) engine.drawScope(canvas); requestAnimationFrame(draw); }

export default function mount() {
  const raw = sessionStorage.getItem('entrain:loaded-session');
  if (raw) session = JSON.parse(raw);
  render(<App />, document.getElementById('studio-root')!);
  return () => { engine.stop(); render(null, document.getElementById('studio-root')!); };
}
