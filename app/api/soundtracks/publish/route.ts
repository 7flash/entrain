import { authFromRequest } from "@/lib/access-policy";
import { json, readJson } from "@/lib/http";
import { publishCommunitySoundtrack } from "@/lib/marketplace";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { PUBLIC_FREE_MODE } from "@/lib/config";

export async function POST(req: Request) {
  if (PUBLIC_FREE_MODE)
    return json(
      {
        ok: false,
        error:
          "Publishing and creator payments are disabled in public/free mode. Use Studio private # share URLs, JSON export, or admin publishing.",
      },
      { status: 403 },
    );
  const rl = rateLimit(clientKey(req, "publish-soundtrack"), 12, 60_000);
  if (!rl.ok)
    return json(
      { ok: false, error: "Too many publish attempts. Slow down." },
      { status: 429 },
    );
  const auth = authFromRequest(req);
  if (!auth)
    return json(
      {
        ok: false,
        error: "Connect Phantom to publish to the catalogue.",
        requiresWallet: true,
      },
      { status: 401 },
    );
  try {
    const body = await readJson(req);
    const result = publishCommunitySoundtrack(auth.publicKey, body || {});
    return json({
      ok: true,
      slug: (result.row as any).slug,
      published: result.published,
      needsReview: result.needsReview,
      analysis: result.analysis,
      claimRisk: result.claimRisk,
      soundtrack: result.row,
    });
  } catch (e: any) {
    return json(
      { ok: false, error: e.message || "publish failed" },
      { status: 400 },
    );
  }
}
