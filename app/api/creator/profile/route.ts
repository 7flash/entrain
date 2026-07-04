import { authFromRequest } from "@/lib/access-policy";
import { db } from "@/lib/db";
import { json } from "@/lib/http";
import { MAX_SHARED_TRACKS_PER_USER } from "@/lib/config";
export function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth)
    return json({ ok: false, error: "Sign in with Google." }, { status: 401 });
  const tracks = db.savedSessions
    .select()
    .where({ publicKey: auth.publicKey })
    .orderBy("createdAt", "DESC")
    .limit(MAX_SHARED_TRACKS_PER_USER)
    .all();
  return json({
    ok: true,
    profile: { email: auth.email, name: auth.name, picture: auth.picture },
    tracks,
    publishingEnabled: false,
    message:
      "Public publishing and payments are disabled. Use saved share links.",
  });
}
export function POST() {
  return json(
    {
      ok: false,
      error:
        "Creator profiles are disabled while marketplace publishing is paused.",
    },
    { status: 410 },
  );
}
