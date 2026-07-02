# ENTRAIN TradJS Server v0.4

Server-backed ENTRAIN with a first-class **pattern format**, database-backed **ready brainwave soundtracks**, a free editor, wallet-saved private library, and Phantom/SPL-token gates for prepared rows.

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

The product unit is no longer a vague “template.” It is a **playable pattern row**:

```txt
soundtrack row = public metadata + minTokens gate + entrain.session.v1 JSON
saved session row = wallet owner + private metadata + entrain.session.v1 JSON
```

The browser player understands the same `entrain.session.v1` object everywhere:

- `/studio` creates and plays custom tracks for free.
- `/studio` can export JSON, share a URL hash, and render WAV locally without login.
- Saving to `/library` requires Phantom authorization, but does not require a token threshold.
- `/soundtracks` lists prepared database rows as ready brainwave soundtracks.
- `/soundtracks/[slug]` can play continuously, render an exact length, render N repetitions, clone to editor, or clone into the private library.
- Gated prepared rows require `wallet.balance >= row.minTokens` before the server returns playable session JSON.
- `/admin` manages prepared soundtrack rows and can publish/draft/archive them.

## What is new in v0.4

- Added `src/lib/soundtracks.ts` as the semantic layer over legacy `templates` storage.
- Added `src/lib/access-policy.ts` so play/export/clone/library gates use one policy instead of scattered checks.
- Added `/api/me` for wallet entitlement state.
- Added `/api/soundtracks/[slug]` for public metadata and access preview.
- Added `/api/soundtracks/[slug]/clone` for server-side private cloning after both wallet and token access checks.
- Added private library update/delete endpoints: `/api/sessions/[id]`.
- Library UI now supports favorite/unfavorite and delete.
- Admin rows now carry `status`, `formatVersion`, and `patternHash` fields.
- Soundtrack cards/details now show derived pattern stats: duration, layer count, bands, sample layers, pan motion, and crossfade-loop flags.
- Format helpers now expose `summarizeSession`, `bandForHz`, `sessionNeedsLocalFiles`, and `publicSessionCopy`.

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
  export?: { fadeSec?: number, sampleRate?: 32000 | 44100 | 48000 },
  layers: [
    {
      id: string,
      type: 'binaural' | 'monaural' | 'iso-smooth' | 'iso-hard' | 'carrier' | 'noise' | 'sample',
      carrierHz?: number,
      wave?: 'sine' | 'triangle' | 'sawtooth',
      noiseColor?: 'white' | 'pink' | 'brown',
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

## Token gates

The client asks Phantom to sign a nonce. The server verifies the ed25519 signature, reads the configured SPL token balance, writes a short-lived HTTP-only session in SQLite, then serves gated soundtrack JSON through `/api/access?slug=...` only when `balance >= minTokens`.

Set `ALLOW_DEV_UNLOCK=1` in `.env` for local UI work without a token balance.

## Admin workflow

1. Design a track in `/studio`.
2. Click **Admin draft**.
3. Open `/admin` and click **Use current editor session**.
4. Add slug, title, description, tags, token gate, and status.
5. Save as draft or publish.

For production, replace the `ADMIN_TOKEN` scaffold with a wallet-role or server-side admin-account check.

## Ambience files

Ambience files are decoded into runtime-only `AudioBuffer`s. JSON, saved sessions, and share URLs preserve filenames and loop settings only. After loading a shared/saved session, reload the local audio file before playback/export.
