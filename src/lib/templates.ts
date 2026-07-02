import type { EntrainTemplateV1, EntrainSessionV1 } from '@/format/entrain-format';
import { db } from './db';
import { dbMeasure } from './measure';

function s(id: string, name: string, durationMin: number, layers: EntrainSessionV1['layers']): EntrainSessionV1 {
  return { format: 'entrain.session.v1', name, durationMin, layers, export: { fadeSec: 4, sampleRate: 44100 } };
}

export const seedTemplates: EntrainTemplateV1[] = [
  {
    format: 'entrain.template.v1', slug: 'alpha-wind-down', title: 'Alpha → Theta Wind-down', category: 'relax', minTokens: 0,
    summary: 'A gentle alpha-to-theta descent with a pink noise bed.',
    description: 'Designed as a transparent version of the common wind-down descent: start in relaxed alpha, glide toward upper theta, and keep a low masking bed underneath.',
    tags: ['binaural', 'alpha', 'theta', 'free'],
    session: s('alpha-wind-down','Alpha → Theta Wind-down',20,[
      { id:'alpha-theta', type:'binaural', carrierHz:220, wave:'sine', keyframes:[{tMin:0,beatHz:10,gainPct:45},{tMin:15,beatHz:6,gainPct:42},{tMin:20,beatHz:6,gainPct:36}] },
      { id:'pink-bed', type:'noise', noiseColor:'pink', pan:0, keyframes:[{tMin:0,gainPct:20},{tMin:20,gainPct:24}] }
    ])
  },
  {
    format: 'entrain.template.v1', slug: 'focus-drill', title: 'Beta Focus Drill', category: 'focus', minTokens: 0,
    summary: 'A crisp 18 Hz isochronic drill with a quiet alpha stabilizer.',
    description: 'A practical focus-training setup based on a fast external anchor: beta-rate isochronic pulses, a fixed point, and a softer alpha bed.',
    tags: ['isochronic', 'beta', 'focus', 'free'],
    session: s('focus-drill','Beta Focus Drill',20,[
      { id:'beta-iso', type:'iso-smooth', carrierHz:260, wave:'sine', pan:0, panMotion:{rateHz:0.02,depth:0.2}, keyframes:[{tMin:0,beatHz:18,gainPct:50},{tMin:20,beatHz:18,gainPct:50}] },
      { id:'alpha-bed', type:'binaural', carrierHz:220, wave:'sine', keyframes:[{tMin:0,beatHz:10,gainPct:22},{tMin:20,beatHz:10,gainPct:22}] },
      { id:'pink-bed', type:'noise', noiseColor:'pink', keyframes:[{tMin:0,gainPct:15},{tMin:20,gainPct:15}] }
    ])
  },
  {
    format: 'entrain.template.v1', slug: 'focus-10', title: 'Focus 10-style Stack', category: 'gateway', minTokens: 1,
    summary: 'Multiplexed low-frequency binaural stack plus pink noise bed.',
    description: 'A template for the classic mind-awake/body-asleep idea: slow delta anchor, theta support, and a non-musical bed. This is descriptive and experimental, not a medical or consciousness claim.',
    tags: ['binaural', 'delta', 'theta', 'holder'],
    session: s('focus-10','Focus 10-style Stack',35,[
      { id:'delta-anchor', type:'binaural', carrierHz:100, wave:'sine', keyframes:[{tMin:0,beatHz:1.5,gainPct:52},{tMin:35,beatHz:1.5,gainPct:52}] },
      { id:'theta-support', type:'binaural', carrierHz:200, wave:'sine', keyframes:[{tMin:0,beatHz:4,gainPct:44},{tMin:35,beatHz:4,gainPct:44}] },
      { id:'pink-bed', type:'noise', noiseColor:'pink', pan:0, panMotion:{rateHz:0.03,depth:0.18}, keyframes:[{tMin:0,gainPct:20},{tMin:35,gainPct:20}] }
    ])
  },
  {
    format: 'entrain.template.v1', slug: 'deep-carrier-descent', title: 'Deep Carrier Descent', category: 'premium', minTokens: 10,
    summary: 'A 60-minute binaural descent from alpha toward low delta.',
    description: 'A long-form template for export: low carrier, slow descent, brown noise bed, and explicit fade envelopes. This is a candidate for paid/premium holder tiers.',
    tags: ['binaural', 'longform', 'delta', 'premium'],
    session: s('deep-carrier-descent','Deep Carrier Descent',60,[
      { id:'descent', type:'binaural', carrierHz:110, wave:'sine', keyframes:[{tMin:0,beatHz:10,gainPct:55},{tMin:30,beatHz:2.5,gainPct:55},{tMin:60,beatHz:1.5,gainPct:48}] },
      { id:'brown-bed', type:'noise', noiseColor:'brown', pan:0, panMotion:{rateHz:0.015,depth:0.12}, keyframes:[{tMin:0,gainPct:26},{tMin:60,gainPct:30}] },
      { id:'ambience-placeholder', type:'sample', sampleName:'optional local rain.wav', pan:0, panMotion:{rateHz:0.03,depth:0.35}, keyframes:[{tMin:0,gainPct:0},{tMin:5,gainPct:18},{tMin:60,gainPct:18}] }
    ])
  }
];

export function seedIfNeeded() {
  return dbMeasure.measure('Seed templates', () => {
    if (db.templates.count() > 0) return false;
    db.templates.insertMany(seedTemplates.map((t, i) => ({
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      description: t.description,
      category: t.category,
      tags: t.tags,
      minTokens: t.minTokens,
      session: t.session,
      sortOrder: i,
      isPublished: true,
    })));
    return true;
  });
}

function fallbackRows() {
  return seedTemplates.map((t, i) => ({ ...t, sortOrder: i, isPublished: true }));
}

export function allTemplates() {
  const rows = db.templates.select().where({ isPublished: true }).orderBy('sortOrder', 'ASC').all() as any[];
  return (rows.length ? rows : fallbackRows()).map(normalizeTemplate);
}

export function featuredTemplates(n = 3) {
  return allTemplates().slice(0, n);
}

export function findTemplate(slug: string) {
  const row = db.templates.select().where({ slug, isPublished: true }).first() as any;
  return row ? normalizeTemplate(row) : seedTemplates.find((t) => t.slug === slug) || null;
}

function normalizeTemplate(row: any): EntrainTemplateV1 {
  return {
    format: 'entrain.template.v1',
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
    minTokens: Number(row.minTokens || 0),
    session: row.session,
  };
}
