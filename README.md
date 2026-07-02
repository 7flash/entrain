# ENTRAIN TradJS Server

This is the server-backed version of ENTRAIN Studio:

- TradJS app routes and API routes.
- `tradjs/client` for browser UI; no React dependency.
- `sqlite-zod-orm` database with Zod-backed schema definitions.
- `measure-fn` wrappers around DB, auth, and Solana RPC operations.
- A first-class ENTRAIN template/session format.
- Phantom wallet signed-message login and server-side token-gated templates.

## Run

```bash
bun install
cp .env.example .env
bun run seed
bun run dev
```

Open `http://localhost:3000`.

## Format overview

Templates are stored as rows with metadata and an `EntrainerSessionV1` JSON payload:

```ts
{
  format: "entrain.session.v1",
  name: string,
  durationMin: number,
  layers: [
    {
      id: string,
      type: "binaural" | "monaural" | "iso-smooth" | "iso-hard" | "carrier" | "noise" | "sample",
      carrierHz?: number,
      wave?: "sine" | "triangle" | "sawtooth",
      noiseColor?: "white" | "pink" | "brown",
      pan?: number,
      panMotion?: { rateHz: number, depth: number },
      sampleName?: string,
      keyframes: [{ tMin: number, beatHz?: number, gainPct: number }]
    }
  ]
}
```

The `sample` layer intentionally stores only `sampleName`. Local audio buffers are runtime-only in the browser and must be reloaded after importing a session.

## Token gates

The server owns access decisions. The client connects Phantom, signs a nonce message, and posts the signature to `/api/auth/verify`. The server verifies the signature, checks SPL token accounts over RPC, stores a short-lived server session in SQLite, and uses that session when `/api/access?slug=...` is requested.

Free templates use `minTokens: 0`. Locked templates specify a positive threshold.
