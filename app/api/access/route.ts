import { findSoundtrack } from "@/lib/soundtracks";
import {
  accessJson,
  authFromRequest,
  decideSoundtrackAccess,
} from "@/lib/access-policy";
import { db } from "@/lib/db";

export function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const action = (url.searchParams.get("action") || "play") as any;
  const soundtrack = findSoundtrack(slug);
  const auth = authFromRequest(req);
  const decision = decideSoundtrackAccess(soundtrack, auth, action);
  if (!decision.ok)
    return accessJson(decision, {
      tier: soundtrack?.tier,
      summaryStats: soundtrack?.summaryStats,
    });
  try {
    db.playEvents.insert({
      publicKey: auth?.publicKey,
      soundtrackSlug: slug,
      action: `access:${action}`,
      createdAt: Date.now(),
    });
  } catch {}
  return accessJson(decision, { template: soundtrack, soundtrack, user: auth });
}
