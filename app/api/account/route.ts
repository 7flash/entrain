import { authFromRequest } from "@/lib/access-policy";
import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { MAX_SHARED_TRACKS_PER_USER } from "@/lib/config";

export function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth)
    return json({ ok: false, error: "Sign in with Google." }, { status: 401 });
  const saved = db.savedSessions
    .select()
    .where({ publicKey: auth.publicKey })
    .all() as any[];
  return json({
    ok: true,
    user: {
      userId: auth.userId,
      email: auth.email,
      name: auth.name,
      picture: auth.picture,
    },
    savedCount: saved.length,
    sharedCount: saved.filter((s) => s.isShared).length,
    limit: MAX_SHARED_TRACKS_PER_USER,
    remaining: Math.max(0, MAX_SHARED_TRACKS_PER_USER - saved.length),
  });
}
