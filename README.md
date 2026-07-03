# ENTRAIN TradJS Server v0.23

Studio workflow now uses operator-first carrier checks and global point tabs.

- Studio starts new tone layers as plain carriers, so operators verify the chosen carrier is steady before adding modulation.
- Added operator guide instructions for carrier validation, isochronic smooth setup, and beat-threshold tuning.
- Added global timeline point tabs that snapshot the whole layer stack at a timestamp. Carrier frequency, beat Hz, and gain interpolate between point tabs in the playable ENTRAIN session format.
- Added per-keyframe `carrierHz`, so carrier glides are first-class and render live/offline.
- Moved wave, pan, sample loop, and raw keyframe tables under Advanced layer details.
- Added Copy algorithm JSON for inspecting/importing the exact playable format.

Local run:

```bash
bun install
cp .env.example .env
bun run sync:soundtracks
bun run dev
```

# ENTRAIN TradJS Server v0.22

Local-first TradJS/Bun app for ENTRAIN Studio, prepared soundtracks, wallet-gated access, synced rooms, creator publishing, and private hash-based session sharing.

## v0.22 focus: DSP correctness, marketplace hardening, and protocol authoring

This pass applies the latest audit/reports from first principles:

- Corrected isochronic depth:
  - smooth isochronic now uses `(1 + sine) / 2`, reaching true silence with smooth edges.
  - hard isochronic now uses `(1 + square) / 2`, reaching full-depth gating.
- Replaced the always-working master compressor with a dormant safety limiter:
  - threshold `-1.5 dBFS`, hard knee, high ratio.
  - normal analyzer-passed sessions should not have their beat/pulse envelopes flattened.
- Fixed procedural ambience loop seams:
  - bowl-drone is rendered as a 16-second snapped harmonic loop with seam polish.
  - stochastic noise/ambience loops are longer and lightly crossfaded.
  - added portable `heavy-rain-bowls` ambience recipe for Deep Descent-style masking.
- Added shared format primitives:
  - `hasBeat`, `hasCarrier`, `sampleTimeline`, `BANDS`, and `MIX` live in the format layer.
  - analyzer and engine share the same mix constants.
- Added `createLinearGlideKeyframes()` and a Studio **Protocol replicator** helper.
- Updated Deep Descent 60 with explicit glide formulas and the heavy-rain-bowls recipe.
- Added `docs/acoustic-specifications.md` with binaural math, glide math, isochronic envelope rules, and SBaGen mapping.
- Hardened paid creator purchases:
  - server-issued purchase intents,
  - exact lamport amount with tiny unique dust,
  - memo-bound slug/intent,
  - transaction signature reuse rejection.
- Admin token is no longer accepted through a GET query parameter.
- Paid community tracks now default to pending review; claim scanning is triage, not auto-approval.
- Studio sliders preserve envelopes:
  - gain slider scales keyframes proportionally,
  - beat-start slider edits the first keyframe only,
  - timeline table remains authoritative.
- Studio rebuilds are debounced during slider drag so playback does not jump to zero.
- Hold-last live playback now actually holds beyond the pattern duration.
- Local WAV render cap is reduced to 60 minutes to avoid large OfflineAudioContext memory blowups.
- Token market polling pauses in hidden tabs and refreshes less aggressively.
- Added a lightweight maintenance sweep for expired challenges, sessions, purchase intents, sync rooms, and old play events.

## Run locally

```bash
bun install
cp .env.example .env
bun run sync:soundtracks
bun run dev
```

Studio remains no-login-first: edit, play, render WAV, import/export, and share private hash URLs without connecting Phantom.
