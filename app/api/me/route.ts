import { allSoundtracks } from "@/lib/soundtracks";
import { getAuthSession } from "@/lib/auth";
import { cookieValue, json } from "@/lib/http";
import { tokenConfig } from "@/lib/token-market";

export function GET(req: Request) {
  const wallet = getAuthSession(cookieValue(req));
  const soundtracks = allSoundtracks().map((s) => ({
    slug: s.slug,
    minTokens: 0,
    tier: "free",
    unlocked: true,
  }));
  return json({
    ok: true,
    publicFreeMode: true,
    token: tokenConfig(),
    wallet: wallet
      ? {
          authenticated: true,
          publicKey: wallet.publicKey,
          balance: wallet.balance,
          expiresAt: wallet.expiresAt,
          balanceRefreshedAt: wallet.lastRefreshedAt,
        }
      : null,
    entitlements: {
      canSavePrivate: !!wallet,
      balance: wallet?.balance || 0,
      soundtracks,
    },
  });
}
