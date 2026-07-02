# ENTRAIN TradJS Server v0.5

Server-backed ENTRAIN with a first-class **pattern format**, database-backed **ready brainwave soundtracks**, a free editor, wallet-saved private library, Phantom/SPL-token gates, and a publish-time protocol analyzer.

## Stack

- TradJS app routes and API routes.
- `tradjs/client` browser mounts; no React app shell.
- `sqlite-zod-orm` database with Zod-backed tables.
- `measure-fn` scopes around DB/auth/RPC operations.
- Phantom signed-message login and server-side SPL token balance gates.
- Local Web Audio playback/export; no generated audio or ambience files are uploaded.

## Run

```bash
bun install
cp .env.example .env
bun run seed
bun run dev
```

Open `http://localhost:3000`.

## Product model

The product unit is a **playable pattern row**:

```txt
soundtrack row = public metadata + minTokens gate + entrain.session.v1 JSON + analysis/safety metadata
saved session row = wallet owner + private metadata + entrain.session.v1 JSON
```

The browser player understands the same `entrain.session.v1` object everywhere:

- `/studio` creates and plays custom tracks for free.
- `/studio` can export JSON, compact pattern text, share a URL hash, and render WAV locally without login.
- Saving to `/library` requires Phantom authorization, but does not require a token threshold.
- `/soundtracks` lists prepared database rows as ready brainwave soundtracks.
- `/soundtracks/[slug]` can play continuously, render an exact length, render N repetitions, clone to editor, or clone into the private library.
- Gated prepared rows require `wallet.balance >= row.minTokens` before the server returns playable session JSON.
- `/admin` manages prepared soundtrack rows and can publish/draft/archive them.

## What is new in v0.5

- Added `src/format/protocol-analyzer.ts`.
  - Flags binaural layers that need headphones.
  - Warns/errors on binaural fusion ceiling violations above 30 Hz.
  - Warns on questionable binaural carrier ranges.
  - Estimates peak/RMS headroom before the limiter.
  - Detects local ambience files and native sample-loop click risk.
  - Scans public copy for medical/guaranteed/supernatural claim-risk terms.
- Added session-level loop semantics:
  - `hold-last` for descents.
  - `repeat` for short cyclic patterns.
  - `crossfade-repeat` metadata for loop-oriented soundtracks.
- Added serializable procedural ambience layers:
  - `rain`
  - `pink-rain`
  - `brown-room`
  - `bowl-drone`
- Added compact pattern text import/export in Studio for power-user/admin authoring.
- Admin publish pipeline now blocks publishing if the analyzer finds hard protocol errors or risky public claims. Draft saves are still allowed.
- Prepared rows now store analysis/safety metadata, evidence level, headphone requirement, default loop mode, and default export length.
- Seed soundtracks were renamed away from commercial-template framing into product-ready names:
  - `Mind Awake Body Rest`
  - `Expanded Awareness Stack`
  - `Deep Descent 60`

## Database tables

`src/lib/db.ts` defines:

- `templates` — compatibility table name for prepared soundtrack rows.
- `savedSessions` — private wallet library rows.
- `walletChallenges` — Phantom signed-message nonces.
- `walletSessions` — verified wallet sessions with cached SPL token balance.
- `playEvents` — lightweight activity log for access/save/clone events.

A production migration can rename `templates` to `soundtracks`; the app layer already calls these records soundtracks.

## ENTRAIN session format

```ts
{
  format: 'entrain.session.v1',
  name: string,
  durationMin: number,
  description?: string,
  notes?: string,
  loop?: { mode: 'repeat' | 'hold-last' | 'crossfade-repeat', crossfadeSec?: number },
  export?: { fadeSec?: number, sampleRate?: 32000 | 44100 | 48000 },
  layers: [
    {
      id: string,
      type: 'binaural' | 'monaural' | 'iso-smooth' | 'iso-hard' | 'carrier' | 'noise' | 'sample' | 'procedural-ambience',
      carrierHz?: number,
      wave?: 'sine' | 'triangle' | 'sawtooth',
      noiseColor?: 'white' | 'pink' | 'brown',
      ambienceRecipe?: 'rain' | 'pink-rain' | 'brown-room' | 'bowl-drone',
      seed?: number,
      pan?: number,
      panMotion?: { rateHz: number, depth: number },
      sampleName?: string,
      sampleLoop?: { mode: 'native' | 'crossfade', startSec?: number, endSec?: number, crossfadeSec?: number },
      keyframes: [{ tMin: number, beatHz?: number, gainPct: number }]
    }
  ]
}
```

Binaural layers intentionally ignore pan and pan motion. Panning them would bleed each ear’s carrier into the other and break the interaural offset that creates the beat.

## Compact pattern text

Studio can copy/import a lightweight authoring format:

```txt
name "Mind Awake Body Rest"
duration 35m
loop hold-last
binaural carrier=100 beat=1.5 gain=-34dB
binaural carrier=200 beat=4 gain=-36dB
ambience recipe=pink-rain gain=-18dB seed=1010
```

The canonical stored format remains `entrain.session.v1` JSON.

## Token gates

The client asks Phantom to sign a nonce. The server verifies the ed25519 signature, reads the configured SPL token balance, writes a short-lived HTTP-only session in SQLite, then serves gated soundtrack JSON through `/api/access?slug=...` only when `balance >= minTokens`.

Set `ALLOW_DEV_UNLOCK=1` in `.env` for local UI work without a token balance.

## Admin workflow

1. Design a track in `/studio`.
2. Click **Admin draft**.
3. Open `/admin` and click **Use current editor session**.
4. Add slug, title, description, tags, token gate, and status.
5. Review the analyzer card.
6. Save as draft or publish.

Publishing is blocked when hard protocol errors or claim-risk terms are present. Save as draft while iterating.

For production, replace the `ADMIN_TOKEN` scaffold with a wallet-role or server-side admin-account check.

## Ambience files

Ambience files are decoded into runtime-only `AudioBuffer`s. JSON, saved sessions, and share URLs preserve filenames and loop settings only. After loading a shared/saved session, reload the local audio file before playback/export.

Use procedural ambience layers for prepared soundtracks that must be fully portable without external audio assets.
