import {
  sanitizeSession,
  type EntrainLayerV1,
  type EntrainSessionV1,
  type Keyframe,
  type LayerType,
  type Wave,
} from "./entrain-format";

export type SbagenImportWarning = { level: "info" | "warn"; message: string };
export type SbagenImportResult = {
  session: EntrainSessionV1;
  warnings: SbagenImportWarning[];
};

type EntrainLayerDirective = {
  layer?: number;
  type?: LayerType;
  wave?: Wave;
  noiseColor?: "white" | "pink" | "brown";
  ambienceRecipe?: string;
  pan?: number;
  mute?: boolean;
  solo?: boolean;
  edgeMs?: number;
  duty?: number;
  sampleLoopMode?: string;
  loopStartSec?: number;
  loopEndSec?: number;
  loopCrossfadeSec?: number;
  raw?: Record<string, string>;
};
type EntrainPlaybackDirective = {
  spatialMode?: "headphones" | "transaural" | "monaural";
  tauUs?: number;
  crosstalkGain?: number;
  firTaps?: number;
};

type StateComponent =
  | {
      kind: "noise";
      color: "white" | "pink" | "brown";
      gainPct: number;
      entrain?: EntrainLayerDirective;
    }
  | {
      kind: "binaural";
      carrierHz: number;
      beatHz: number;
      gainPct: number;
      entrain?: EntrainLayerDirective;
    }
  | {
      kind: "sample";
      sampleName: string;
      gainPct: number;
      entrain?: EntrainLayerDirective;
    };

type State = { label: string; components: StateComponent[] };
type Transition = { from: string; to: string; durMin: number };
type ScheduledComponent = StateComponent & { tMin: number };

const uid = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const round = (n: number, d = 3) => Number(n.toFixed(d));

export function looksLikeSbagen(text: string) {
  const cleaned = stripComments(String(text || "")).trim();
  return (
    /^@entrain\b/im.test(cleaned) ||
    /^\w[\w.-]*\s*:/m.test(cleaned) ||
    /^\w[\w.-]*\s*->\s*\+?\d{1,2}:\d{2}(?::\d{2})?\s+\w[\w.-]*/m.test(cleaned)
  );
}

export function sbagenTextToSession(
  text: string,
  options: { name?: string; defaultDurationMin?: number } = {},
): SbagenImportResult {
  const warnings: SbagenImportWarning[] = [];
  const states = new Map<string, State>();
  const transitions: Transition[] = [];
  const rawLines = String(text || "").split(/\r?\n/);
  let pendingLayerDirectives: EntrainLayerDirective[] = [];
  let playbackDirective: EntrainPlaybackDirective | null = null;

  for (const raw of rawLines) {
    const line = stripComments(raw).trim();
    if (!line) continue;

    if (/^@entrain\b/i.test(line)) {
      const directive = parseEntrianDirective(line, warnings);
      if (directive?.kind === "playback")
        playbackDirective = directive.playback;
      if (directive?.kind === "layer")
        pendingLayerDirectives.push(directive.layer);
      continue;
    }

    const transition = line.match(
      /^(\w[\w.-]*)\s*->\s*\+?(\d{1,2}:\d{2}(?::\d{2})?)\s+(\w[\w.-]*)\s*$/,
    );
    if (transition) {
      transitions.push({
        from: transition[1],
        durMin: parseClockToMinutes(transition[2]),
        to: transition[3],
      });
      continue;
    }

    const state = line.match(/^(\w[\w.-]*)\s*:\s*(.+)$/);
    if (state) {
      const components = parseComponents(state[2], warnings);
      states.set(state[1], {
        label: state[1],
        components: applyLayerDirectives(components, pendingLayerDirectives),
      });
      pendingLayerDirectives = [];
      continue;
    }

    warnings.push({
      level: "warn",
      message: `Ignored unsupported SBaGen line: ${line}`,
    });
  }

  if (!states.size) {
    const session = sanitizeSession({
      name: options.name || "Imported SBaGen script",
      durationMin: options.defaultDurationMin || 20,
      notes: "No valid SBaGen states were found.",
    });
    return {
      session,
      warnings: [
        {
          level: "warn",
          message: "No valid SBaGen state definitions were found.",
        },
        ...warnings,
      ],
    };
  }

  const durationMin = transitions.length
    ? round(
        transitions.reduce((a, t) => a + t.durMin, 0),
        4,
      )
    : clamp(options.defaultDurationMin || 20, 1, 180);
  const timeline = new Map<string, ScheduledComponent[]>();
  const firstState = transitions[0]?.from || [...states.keys()][0];

  if (transitions.length) {
    let cursor = 0;
    for (const tr of transitions) {
      const from = states.get(tr.from);
      const to = states.get(tr.to);
      if (!from || !to) {
        warnings.push({
          level: "warn",
          message: `Transition ${tr.from} -> ${tr.to} references an undefined state.`,
        });
        continue;
      }
      addTransitionSnapshot(
        timeline,
        from,
        to,
        cursor,
        round(cursor + tr.durMin, 4),
      );
      cursor = round(cursor + tr.durMin, 4);
    }
  } else {
    const s = states.get(firstState)!;
    addStateSnapshot(timeline, s, 0);
    addStateSnapshot(timeline, s, durationMin);
  }

  const layers: EntrainLayerV1[] = [];
  for (const [key, points] of timeline) {
    const sorted = mergePoints(points, durationMin);
    const first = sorted[0];
    if (!first) continue;
    const meta = first.entrain || {};
    const declaredType = meta.type;

    if (first.kind === "noise" && declaredType === "procedural-ambience") {
      layers.push({
        id: uid(),
        type: "procedural-ambience",
        ambienceRecipe: (meta.ambienceRecipe || "pink-rain") as any,
        seed: meta.raw?.seed ? Number(meta.raw.seed) : undefined,
        keyframes: sorted.map((p) => ({ tMin: p.tMin, gainPct: p.gainPct })),
      });
      continue;
    }

    if (first.kind === "noise" && !isCarrierishType(declaredType)) {
      layers.push({
        id: uid(),
        type: "noise",
        noiseColor: meta.noiseColor || first.color,
        pan: meta.pan,
        mute: meta.mute,
        solo: meta.solo,
        keyframes: sorted.map((p) => ({ tMin: p.tMin, gainPct: p.gainPct })),
      });
      continue;
    }

    if (first.kind === "sample" && !isCarrierishType(declaredType)) {
      layers.push({
        id: uid(),
        type: "sample",
        sampleName: first.sampleName,
        sampleLoop: {
          mode: meta.sampleLoopMode === "crossfade" ? "crossfade" : "native",
          startSec: meta.loopStartSec ?? 0,
          endSec: meta.loopEndSec,
          crossfadeSec: meta.loopCrossfadeSec ?? 0,
        },
        pan: meta.pan ?? 0,
        mute: meta.mute,
        solo: meta.solo,
        keyframes: sorted.map((p) => ({ tMin: p.tMin, gainPct: p.gainPct })),
      });
      warnings.push({
        level: "info",
        message: `Imported ambience reference "${first.sampleName}" as a local-file layer. The audio file must be loaded in the browser.`,
      });
      continue;
    }

    const carrierHz = first.kind === "binaural" ? first.carrierHz : 220;
    const layerType = isCarrierishType(declaredType)
      ? declaredType!
      : "binaural";
    const keyframes = sorted.map((p) => ({
      tMin: p.tMin,
      beatHz: p.kind === "binaural" ? p.beatHz : 0.1,
      carrierHz: p.kind === "binaural" ? p.carrierHz : carrierHz,
      gainPct: p.gainPct,
    }));
    const layer: EntrainLayerV1 = {
      id: uid(),
      type: layerType,
      carrierHz,
      wave: meta.wave || "sine",
      pan: meta.pan,
      mute: meta.mute,
      solo: meta.solo,
      keyframes,
    };
    if (layerType === "iso-trap") {
      layer.isoPulse = {
        edgeMs: clamp(Number(meta.edgeMs ?? 8), 1, 100),
        duty: clamp(Number(meta.duty ?? 0.5), 0.05, 0.95),
      };
    }
    if (layerType === "additive") {
      layer.partials = parsePartials(meta.raw?.partials);
      layer.envelope = parseEnvelope(meta.raw?.envelope);
    }
    if (layerType === "karplus") {
      layer.karplus = {
        rateHz: Number(meta.raw?.rateHz || carrierHz),
        decay: clamp(Number(meta.raw?.decay || 0.85), 0.05, 0.995),
        brightness: clamp(Number(meta.raw?.brightness || 0.6), 0.01, 1),
        durationSec: clamp(Number(meta.raw?.durationSec || 2), 0.05, 30),
      };
    }
    layers.push(layer);
    if (carrierHz > 1000)
      warnings.push({
        level: "warn",
        message: `Carrier ${carrierHz} Hz is above the usual binaural range; the analyzer will flag it.`,
      });
    if (sorted.some((p) => p.kind === "binaural" && p.beatHz > 30))
      warnings.push({
        level: "warn",
        message: `A binaural beat above 30 Hz may not fuse cleanly.`,
      });
    if (declaredType && declaredType !== "binaural") {
      warnings.push({
        level: "info",
        message: `Restored ENTRAIN ${declaredType} layer metadata from @entrain directives.`,
      });
    } else if (key.startsWith("layer:")) {
      warnings.push({
        level: "info",
        message: `Restored ENTRAIN wave/layer metadata from @entrain directives.`,
      });
    }
  }

  const session = sanitizeSession({
    format: "entrain.session.v1",
    name: options.name || `SBaGen import · ${firstState}`,
    durationMin,
    loop: { mode: transitions.length ? "hold-last" : "repeat" },
    playback: playbackFromDirective(playbackDirective) || undefined,
    notes: sbagenNotes(text, warnings),
    layers: layers.length ? layers : undefined,
    export: { fadeSec: 4, sampleRate: 44100 },
  });
  return { session, warnings };
}

function parseComponents(body: string, warnings: SbagenImportWarning[]) {
  const tokens = body.match(/(?:"[^"]+"|'[^']+'|\S+)/g) || [];
  const components: StateComponent[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = unquote(tokens[i]);
    const noise = token.match(/^(pink|white|brown)\/(\d+(?:\.\d+)?)$/i);
    if (noise) {
      components.push({
        kind: "noise",
        color: noise[1].toLowerCase() as any,
        gainPct: clamp(Number(noise[2]), 0, 100),
      });
      continue;
    }

    const beatPlus = token.match(
      /^(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/,
    );
    const beatBracket = token.match(
      /^(\d+(?:\.\d+)?)\[(\d+(?:\.\d+)?)\](?:\/(\d+(?:\.\d+)?))?$/,
    );
    const beat = beatPlus || beatBracket;
    if (beat) {
      components.push({
        kind: "binaural",
        carrierHz: Number(beat[1]),
        beatHz: Number(beat[2]),
        gainPct: clamp(Number(beat[3] ?? 50), 0, 100),
      });
      continue;
    }

    const samplePair = tokens[i + 1]
      ? unquote(tokens[i + 1]).match(/^mix\/(\d+(?:\.\d+)?)$/i)
      : null;
    if (/\.(wav|mp3|ogg|flac|aac|m4a)$/i.test(token) && samplePair) {
      components.push({
        kind: "sample",
        sampleName: token,
        gainPct: clamp(Number(samplePair[1]), 0, 100),
      });
      i++;
      continue;
    }

    const sampleDirect = token.match(
      /^(.+\.(?:wav|mp3|ogg|flac|aac|m4a))\/(\d+(?:\.\d+)?)$/i,
    );
    if (sampleDirect) {
      components.push({
        kind: "sample",
        sampleName: sampleDirect[1],
        gainPct: clamp(Number(sampleDirect[2]), 0, 100),
      });
      continue;
    }

    warnings.push({
      level: "warn",
      message: `Ignored unsupported SBaGen token: ${token}`,
    });
  }
  return components;
}

function parseEntrianDirective(
  line: string,
  warnings: SbagenImportWarning[],
):
  | { kind: "layer"; layer: EntrainLayerDirective }
  | { kind: "playback"; playback: EntrainPlaybackDirective }
  | null {
  const body = line.replace(/^@entrain\s*/i, "").trim();
  if (!body) return null;
  const first = body.split(/\s+/, 1)[0]?.toLowerCase();
  const attrs = parseAttrs(
    first === "layer" || first === "playback" ? body.slice(first.length) : body,
  );
  if (first === "playback" || attrs.spatialMode) {
    return {
      kind: "playback",
      playback: {
        spatialMode: spatialMode(attrs.spatialMode),
        tauUs: numAttr(attrs.tauUs),
        crosstalkGain: numAttr(attrs.crosstalkGain),
        firTaps: numAttr(attrs.firTaps),
      },
    };
  }
  const layer = numAttr(attrs.layer || attrs.l);
  if (!layer) {
    warnings.push({
      level: "warn",
      message: `Ignored @entrain layer directive without layer number: ${line}`,
    });
    return null;
  }
  return {
    kind: "layer",
    layer: {
      layer,
      type: layerType(attrs.type),
      wave: waveType(attrs.wave),
      noiseColor: noiseColor(attrs.noiseColor || attrs.color),
      ambienceRecipe: attrs.ambienceRecipe || attrs.recipe,
      pan: numAttr(attrs.pan),
      mute: boolAttr(attrs.mute),
      solo: boolAttr(attrs.solo),
      edgeMs: numAttr(attrs.edgeMs),
      duty: numAttr(attrs.duty),
      sampleLoopMode: attrs.sampleLoopMode || attrs.loopMode,
      loopStartSec: numAttr(attrs.loopStartSec),
      loopEndSec: numAttr(attrs.loopEndSec),
      loopCrossfadeSec: numAttr(attrs.loopCrossfadeSec),
      raw: attrs,
    },
  };
}

function parseAttrs(s: string) {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z][\w.-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

function applyLayerDirectives(
  components: StateComponent[],
  directives: EntrainLayerDirective[],
) {
  if (!directives.length) return components;
  const byLayer = new Map<number, EntrainLayerDirective>();
  for (const d of directives) if (d.layer) byLayer.set(d.layer, d);
  return components.map((c, i) => ({
    ...c,
    entrain: byLayer.get(i + 1) || c.entrain,
  })) as StateComponent[];
}

function addTransitionSnapshot(
  timeline: Map<string, ScheduledComponent[]>,
  from: State,
  to: State,
  startMin: number,
  endMin: number,
) {
  const a = new Map(from.components.map((c) => [componentKey(c), c]));
  const b = new Map(to.components.map((c) => [componentKey(c), c]));
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const start = a.get(key) || silentLike(b.get(key)!);
    const end = b.get(key) || silentLike(a.get(key)!);
    pushScheduled(timeline, key, {
      ...start,
      tMin: startMin,
    } as ScheduledComponent);
    pushScheduled(timeline, key, {
      ...end,
      tMin: endMin,
    } as ScheduledComponent);
  }
}

function silentLike(c: StateComponent): StateComponent {
  return { ...c, gainPct: 0 } as StateComponent;
}

function pushScheduled(
  timeline: Map<string, ScheduledComponent[]>,
  key: string,
  point: ScheduledComponent,
) {
  const list = timeline.get(key) || [];
  list.push(point);
  timeline.set(key, list);
}

function componentKey(c: StateComponent) {
  if (c.entrain?.layer) return `layer:${c.entrain.layer}`;
  if (c.kind === "noise") return `noise:${c.color}`;
  if (c.kind === "sample") return `sample:${c.sampleName}`;
  return `binaural:${round(c.carrierHz, 4)}`;
}

function addStateSnapshot(
  timeline: Map<string, ScheduledComponent[]>,
  state: State,
  tMin: number,
) {
  for (const c of state.components) {
    const key = componentKey(c);
    const list = timeline.get(key) || [];
    list.push({ ...c, tMin });
    timeline.set(key, list as ScheduledComponent[]);
  }
}

function mergePoints(points: ScheduledComponent[], durationMin: number) {
  const byTime = new Map<number, ScheduledComponent>();
  for (const p of points)
    byTime.set(round(clamp(p.tMin, 0, durationMin), 4), {
      ...p,
      tMin: round(clamp(p.tMin, 0, durationMin), 4),
    });
  return [...byTime.values()].sort((a, b) => a.tMin - b.tMin);
}

function stripComments(s: string) {
  return String(s || "").replace(/\s*(#|;).*$/, "");
}
function unquote(s: string) {
  return String(s || "")
    .trim()
    .replace(/^[']|[']$/g, "")
    .replace(/^["]|["]$/g, "");
}
function parseClockToMinutes(clock: string) {
  const parts = clock.split(":").map(Number);
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) / 60;
  return (parts[0] * 3600 + parts[1] * 60 + parts[2]) / 60;
}
function sbagenNotes(source: string, warnings: SbagenImportWarning[]) {
  const warningText = warnings.length
    ? `\n\nImport notes:\n${warnings.map((w) => `- ${w.level}: ${w.message}`).join("\n")}`
    : "";
  return `Imported from SBaGen-style script. SBaGen labels become ENTRAIN timeline keyframes; carrier+beat tokens become beat layers. @entrain directive lines restore ENTRAIN-only layer type, waveform, isochronic pulse, loop, pan, and playback metadata.${warningText}\n\nOriginal script:\n${source.slice(0, 4000)}`;
}

export function sessionToSbagenText(input: any) {
  const s = sanitizeSession(input);
  const times = collectTimes(s).sort((a, b) => a - b);
  if (times.length < 2) times.push(s.durationMin);
  const lines: string[] = [];
  const playback = playbackDirectiveLine(s);
  if (playback) lines.push(playback);

  times.forEach((t, i) => {
    const label = `s${i}`;
    const components = s.layers.map((l) => layerToSbagenTokenAt(l, t));
    s.layers.forEach((l, layerIndex) => {
      lines.push(layerDirectiveLine(l, layerIndex + 1));
    });
    lines.push(
      `${label}: ${components.length ? components.join(" ") : "pink/0"}`,
    );
  });
  for (let i = 0; i < times.length - 1; i++) {
    const durMin = Math.max(0, times[i + 1] - times[i]);
    if (durMin > 0) lines.push(`s${i} -> +${formatClock(durMin)} s${i + 1}`);
  }
  return `${lines.join("\n")}\n`;
}

export function sbagenExportWarnings(input: any) {
  const s = sanitizeSession(input);
  const warnings: string[] = [];
  const typeCounts = new Map<string, number>();
  for (const l of s.layers)
    typeCounts.set(l.type, (typeCounts.get(l.type) || 0) + 1);
  const extended = ["monaural", "iso-smooth", "iso-trap", "iso-hard"].filter(
    (t) => typeCounts.has(t),
  );
  if (extended.length)
    warnings.push(
      `${extended.join(", ")} layer metadata is preserved in @entrain directives; plain SBaGen players will hear a binaural carrier+beat approximation.`,
    );
  const ambience = s.layers.filter((l) => l.type === "procedural-ambience");
  if (ambience.length)
    warnings.push(
      `procedural ambience metadata is preserved in @entrain directives; plain SBaGen players will hear a static noise-bed approximation.`,
    );
  const unsupported = ["carrier", "additive", "karplus"].filter((t) =>
    typeCounts.has(t),
  );
  if (unsupported.length)
    warnings.push(
      `${unsupported.join(", ")} layer metadata is preserved in @entrain directives; plain SBaGen audio is an approximate carrier token.`,
    );
  if (s.layers.some((l) => l.type === "sample" && !l.sampleName))
    warnings.push(
      `empty sample layers are exported as silent placeholders because SBaGen needs a file name.`,
    );
  if (s.playback?.spatialMode === "transaural")
    warnings.push(
      `transaural speaker playback is preserved in @entrain playback metadata; plain SBaGen players ignore it.`,
    );
  return warnings;
}

function collectTimes(s: EntrainSessionV1) {
  const set = new Set<number>([0, s.durationMin]);
  for (const l of s.layers)
    for (const k of l.keyframes || [])
      set.add(round(clamp(k.tMin, 0, s.durationMin), 4));
  return [...set];
}
function layerToSbagenTokenAt(l: EntrainLayerV1, tMin: number) {
  const gain = Math.round(valueAt(l.keyframes || [], "gainPct", tMin));
  if (l.type === "noise") return `${l.noiseColor || "pink"}/${gain}`;
  if (l.type === "procedural-ambience")
    return `${noiseForRecipe(l.ambienceRecipe)}/${gain}`;
  if (l.type === "sample") {
    const sample = l.sampleName || `entrain-layer-${safeLayerId(l.id)}.wav`;
    return `${quoteIfNeeded(sample)} mix/${gain}`;
  }
  const carrier = round(
    valueAt(l.keyframes || [], "carrierHz", tMin, l.carrierHz || 220),
    3,
  );
  const beatFallback =
    l.type === "carrier" || l.type === "additive" || l.type === "karplus"
      ? 0.01
      : 10;
  const beat = round(
    Math.max(0.01, valueAt(l.keyframes || [], "beatHz", tMin, beatFallback)),
    3,
  );
  return `${carrier}+${beat}/${gain}`;
}
function valueAt(
  kfs: Keyframe[],
  key: "gainPct" | "beatHz" | "carrierHz",
  tMin: number,
  fallback = key === "gainPct" ? 0 : key === "carrierHz" ? 220 : 10,
) {
  const pts = [...(kfs || [])].sort((a, b) => a.tMin - b.tMin);
  if (!pts.length) return fallback;
  const val = (p: any) => Number(p[key] ?? fallback);
  if (tMin <= pts[0].tMin) return val(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    if (tMin <= pts[i].tMin) {
      const a = pts[i - 1],
        b = pts[i];
      const f = (tMin - a.tMin) / Math.max(1e-9, b.tMin - a.tMin);
      return val(a) + (val(b) - val(a)) * f;
    }
  }
  return val(pts[pts.length - 1]);
}
function layerDirectiveLine(l: EntrainLayerV1, layer: number) {
  const parts = ["@entrain", `layer=${layer}`, `type=${l.type}`];
  if (l.wave) parts.push(`wave=${l.wave}`);
  if (l.noiseColor) parts.push(`noiseColor=${l.noiseColor}`);
  if (l.ambienceRecipe) parts.push(`ambienceRecipe=${l.ambienceRecipe}`);
  if (Number.isFinite(l.pan as number))
    parts.push(`pan=${round(Number(l.pan), 4)}`);
  if (l.mute) parts.push("mute=1");
  if (l.solo) parts.push("solo=1");
  if (l.isoPulse) {
    parts.push(`edgeMs=${round(l.isoPulse.edgeMs, 3)}`);
    parts.push(`duty=${round(l.isoPulse.duty, 4)}`);
  }
  if (l.sampleLoop) {
    parts.push(`sampleLoopMode=${l.sampleLoop.mode}`);
    if (l.sampleLoop.startSec != null)
      parts.push(`loopStartSec=${round(l.sampleLoop.startSec, 4)}`);
    if (l.sampleLoop.endSec != null)
      parts.push(`loopEndSec=${round(l.sampleLoop.endSec, 4)}`);
    if (l.sampleLoop.crossfadeSec != null)
      parts.push(`loopCrossfadeSec=${round(l.sampleLoop.crossfadeSec, 4)}`);
  }
  if (l.type === "additive" && l.partials?.length)
    parts.push(`partials=${quoteAttr(serializePartials(l.partials))}`);
  if (l.type === "additive" && l.envelope)
    parts.push(`envelope=${quoteAttr(serializeEnvelope(l.envelope))}`);
  if (l.type === "karplus" && l.karplus) {
    parts.push(`rateHz=${round(l.karplus.rateHz, 4)}`);
    parts.push(`decay=${round(l.karplus.decay, 4)}`);
    parts.push(`brightness=${round(l.karplus.brightness, 4)}`);
    parts.push(`durationSec=${round(l.karplus.durationSec, 4)}`);
  }
  return parts.join(" ");
}
function playbackDirectiveLine(s: EntrainSessionV1) {
  const p = s.playback;
  if (!p?.spatialMode || p.spatialMode === "headphones") return "";
  const parts = ["@entrain", "playback", `spatialMode=${p.spatialMode}`];
  if (p.transaural?.tauUs != null)
    parts.push(`tauUs=${round(p.transaural.tauUs, 4)}`);
  if (p.transaural?.crosstalkGain != null)
    parts.push(`crosstalkGain=${round(p.transaural.crosstalkGain, 4)}`);
  if (p.transaural?.firTaps != null)
    parts.push(`firTaps=${Math.round(p.transaural.firTaps)}`);
  return parts.join(" ");
}
function noiseForRecipe(recipe: any) {
  return String(recipe || "").includes("brown") ? "brown" : "pink";
}
function formatClock(min: number) {
  const total = Math.round(min * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function quoteIfNeeded(s: string) {
  return /\s/.test(s) ? JSON.stringify(s) : s;
}
function quoteAttr(s: string) {
  return JSON.stringify(s);
}
function safeLayerId(id: string) {
  return (
    String(id || "x")
      .replace(/[^a-z0-9-]+/gi, "")
      .slice(0, 16) || "x"
  );
}
function numAttr(v: string | undefined) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function boolAttr(v: string | undefined) {
  if (v == null) return undefined;
  return /^(1|true|yes|on)$/i.test(v);
}
function spatialMode(v: string | undefined) {
  return v === "transaural" || v === "monaural" || v === "headphones"
    ? v
    : undefined;
}
function layerType(v: string | undefined): LayerType | undefined {
  const allowed = [
    "binaural",
    "monaural",
    "iso-smooth",
    "iso-trap",
    "iso-hard",
    "carrier",
    "noise",
    "sample",
    "procedural-ambience",
    "additive",
    "karplus",
  ];
  return allowed.includes(String(v)) ? (v as LayerType) : undefined;
}
function waveType(v: string | undefined): Wave | undefined {
  return v === "sine" || v === "triangle" || v === "sawtooth" ? v : undefined;
}
function noiseColor(v: string | undefined) {
  return v === "white" || v === "pink" || v === "brown" ? v : undefined;
}
function isCarrierishType(v: LayerType | undefined) {
  return (
    !!v &&
    [
      "binaural",
      "monaural",
      "iso-smooth",
      "iso-trap",
      "iso-hard",
      "carrier",
      "additive",
      "karplus",
    ].includes(v)
  );
}
function playbackFromDirective(d: EntrainPlaybackDirective | null) {
  if (!d?.spatialMode) return null;
  if (d.spatialMode !== "transaural") return { spatialMode: d.spatialMode };
  return {
    spatialMode: "transaural" as const,
    transaural: {
      tauUs: clamp(Number(d.tauUs ?? 260), 40, 480),
      crosstalkGain: clamp(Number(d.crosstalkGain ?? 0.9), 0.3, 0.97),
      firTaps: d.firTaps,
    },
  };
}
function serializePartials(partials: any[]) {
  return partials
    .map((p) =>
      [p.ratio, p.gain, p.decaySec, p.detuneCents]
        .filter((x) => x != null)
        .join(":"),
    )
    .join(",");
}
function parsePartials(s: string | undefined) {
  if (!s) return undefined;
  const partials = s
    .split(",")
    .map((chunk) => {
      const [ratio, gain, decaySec, detuneCents] = chunk.split(":").map(Number);
      if (!Number.isFinite(ratio) || !Number.isFinite(gain)) return null;
      return {
        ratio,
        gain,
        decaySec: Number.isFinite(decaySec) ? decaySec : undefined,
        detuneCents: Number.isFinite(detuneCents) ? detuneCents : undefined,
      };
    })
    .filter(Boolean) as any[];
  return partials.length ? partials : undefined;
}
function serializeEnvelope(e: any) {
  return [e.attackMs, e.decayMs, e.sustain, e.releaseMs].join(":");
}
function parseEnvelope(s: string | undefined) {
  if (!s) return undefined;
  const [attackMs, decayMs, sustain, releaseMs] = s.split(":").map(Number);
  if (![attackMs, decayMs, sustain, releaseMs].every(Number.isFinite))
    return undefined;
  return { attackMs, decayMs, sustain, releaseMs };
}
