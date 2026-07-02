import { authFromRequest } from "@/lib/access-policy";
import { allSoundtracks } from "@/lib/soundtracks";
import { json } from "@/lib/http";
import { tokenConfig } from "@/lib/token-market";

export function GET(req: Request) {
  const auth = authFromRequest(req);
  const balance = Number(auth?.balance || 0);
  const soundtracks = allSoundtracks().map((s) => ({
    slug: s.slug,
    minTokens: s.minTokens,
    tier: s.tier,
    unlocked: s.minTokens <= 0 || balance >= s.minTokens,
  }));
  return json({
    ok: true,
    token: tokenConfig(),
    wallet: auth
      ? { publicKey: auth.publicKey, balance, expiresAt: auth.expiresAt }
      : null,
    entitlements: { canSavePrivate: !!auth, balance, soundtracks },
  });
}
