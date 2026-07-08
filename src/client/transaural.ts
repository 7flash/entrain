export type SpatialOutputMode = "headphones" | "transaural" | "monaural";

export type TransauralPlaybackConfig = {
  spatialMode: SpatialOutputMode;
  tauUs: number;
  crosstalkGain: number;
  firTaps: number;
};

export const DEFAULT_TRANSAURAL = {
  tauUs: 260,
  crosstalkGain: 0.9,
  firTaps: 6,
} as const;

const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));

export function normalizeSpatialMode(value: any): SpatialOutputMode {
  return value === "transaural" ||
    value === "monaural" ||
    value === "headphones"
    ? value
    : "headphones";
}

export function transauralConfigFromSession(
  session: any,
): TransauralPlaybackConfig {
  const playback = session?.playback || {};
  const t = playback.transaural || {};
  return {
    spatialMode: normalizeSpatialMode(playback.spatialMode),
    tauUs: Math.round(
      clamp(Number(t.tauUs ?? DEFAULT_TRANSAURAL.tauUs), 40, 480),
    ),
    crosstalkGain: clamp(
      Number(t.crosstalkGain ?? DEFAULT_TRANSAURAL.crosstalkGain),
      0.3,
      0.97,
    ),
    firTaps: Math.round(
      clamp(Number(t.firTaps ?? DEFAULT_TRANSAURAL.firTaps), 2, 12),
    ),
  };
}

export function setSessionSpatialMode(session: any, mode: SpatialOutputMode) {
  session.playback = {
    ...(session.playback || {}),
    spatialMode: normalizeSpatialMode(mode),
    transaural: {
      ...DEFAULT_TRANSAURAL,
      ...(session.playback?.transaural || {}),
    },
  };
}

export function transauralSummary(session: any) {
  const c = transauralConfigFromSession(session);
  if (c.spatialMode === "headphones") return "headphones / raw stereo";
  if (c.spatialMode === "monaural") return "speaker-safe monaural fallback";
  return `transaural speakers · τ ${c.tauUs} µs · g ${c.crosstalkGain.toFixed(2)}`;
}

function connectTap(
  ctx: BaseAudioContext,
  source: AudioNode,
  merger: ChannelMergerNode,
  channel: 0 | 1,
  delaySec: number,
  gainValue: number,
) {
  const g = ctx.createGain();
  g.gain.value = gainValue;
  if (delaySec > 0) {
    const d = ctx.createDelay(Math.max(0.02, delaySec + 0.005));
    d.delayTime.value = delaySec;
    source.connect(d);
    d.connect(g);
  } else {
    source.connect(g);
  }
  g.connect(merger, 0, channel);
}

/**
 * Approximate two-speaker crosstalk cancellation for any stereo target node.
 *
 * Ear model:
 *   E_L = S_L + g·Dτ(S_R)
 *   E_R = g·Dτ(S_L) + S_R
 *
 * Inverse is expanded as a finite alternating delay series. That makes it work
 * for ENTRAIN's gliding binaural oscillators and offline WAV renders without
 * rescheduling per-frequency PeriodicWave coefficients.
 */
export function connectTransauralMatrix(
  ctx: BaseAudioContext,
  leftTarget: AudioNode,
  rightTarget: AudioNode,
  destination: AudioNode,
  cfg: Pick<TransauralPlaybackConfig, "tauUs" | "crosstalkGain" | "firTaps">,
) {
  const tauSec =
    clamp(Number(cfg.tauUs || DEFAULT_TRANSAURAL.tauUs), 40, 480) / 1_000_000;
  const g = clamp(
    Number(cfg.crosstalkGain || DEFAULT_TRANSAURAL.crosstalkGain),
    0.3,
    0.97,
  );
  const taps = Math.round(
    clamp(Number(cfg.firTaps || DEFAULT_TRANSAURAL.firTaps), 2, 12),
  );
  const merger = ctx.createChannelMerger(2);
  let abs = 0;
  for (let n = 0; n <= taps; n++) abs += Math.pow(g, n);
  const norm = 0.9 / Math.max(1, abs);

  for (let n = 0; n <= taps; n++) {
    const own = n % 2 === 0;
    const coeff = (own ? 1 : -1) * Math.pow(g, n) * norm;
    const delaySec = tauSec * n;
    connectTap(ctx, own ? leftTarget : rightTarget, merger, 0, delaySec, coeff);
    connectTap(ctx, own ? rightTarget : leftTarget, merger, 1, delaySec, coeff);
  }
  merger.connect(destination);
  return merger;
}
