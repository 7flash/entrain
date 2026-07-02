export type LayerType = 'binaural' | 'monaural' | 'iso-smooth' | 'iso-hard' | 'carrier' | 'noise' | 'sample';
export type Wave = 'sine' | 'triangle' | 'sawtooth';
export type NoiseColor = 'white' | 'pink' | 'brown';

export type Keyframe = {
  tMin: number;
  beatHz?: number;
  gainPct: number;
};

export type EntrainLayerV1 = {
  id: string;
  type: LayerType;
  carrierHz?: number;
  wave?: Wave;
  noiseColor?: NoiseColor;
  pan?: number; // -1..1. Binaural layers ignore pan by design.
  panMotion?: { rateHz: number; depth: number }; // rate 0..0.25, depth 0..1.
  sampleName?: string; // Runtime audio buffer is never serialized.
  keyframes: Keyframe[];
};

export type EntrainSessionV1 = {
  format: 'entrain.session.v1';
  name: string;
  description?: string;
  durationMin: number;
  layers: EntrainLayerV1[];
  export?: { fadeSec?: number; sampleRate?: number };
};

export type EntrainTemplateV1 = {
  format: 'entrain.template.v1';
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  minTokens: number;
  session: EntrainSessionV1;
};

export function defaultSession(): EntrainSessionV1 {
  return {
    format: 'entrain.session.v1',
    name: 'Untitled session',
    durationMin: 20,
    layers: [
      { id: crypto.randomUUID?.() || 'layer-alpha', type: 'binaural', carrierHz: 220, wave: 'sine', keyframes: [{ tMin: 0, beatHz: 10, gainPct: 36 }, { tMin: 20, beatHz: 10, gainPct: 36 }] },
      { id: crypto.randomUUID?.() || 'layer-pink', type: 'noise', noiseColor: 'pink', keyframes: [{ tMin: 0, gainPct: 18 }, { tMin: 20, gainPct: 18 }] }
    ],
    export: { fadeSec: 4, sampleRate: 44100 }
  };
}
