import { db } from "@/lib/db";
import { authFromRequest } from "@/lib/access-policy";
import { json, readJson } from "@/lib/http";
import { upsertCreatorProfile } from "@/lib/marketplace";

type Body = { displayName?: string; bio?: string; payoutWallet?: string };

export function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth)
    return json(
      {
        ok: false,
        error: "Connect Phantom to view creator profile.",
        requiresWallet: true,
      },
      { status: 401 },
    );
  const profile = db.creatorProfiles
    .select()
    .where({ publicKey: auth.publicKey })
    .first();
  const soundtracks = db.templates
    .select()
    .where({ ownerPublicKey: auth.publicKey })
    .orderBy("createdAt", "DESC")
    .limit(100)
    .all();
  return json({
    ok: true,
    profile,
    soundtracks,
    publishingEnabled: false,
    message:
      "Public publishing is disabled for now. Use private # share links or save to your wallet library.",
  });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth)
    return json(
      {
        ok: false,
        error: "Connect Phantom to update creator profile.",
        requiresWallet: true,
      },
      { status: 401 },
    );
  const body = await readJson<Body>(req);
  const profile = upsertCreatorProfile(
    auth.publicKey,
    body?.displayName,
    body?.payoutWallet,
    body?.bio,
  );
  return json({ ok: true, profile });
}
