import { db } from "@/lib/db";
import { json } from "@/lib/http";

type Props = { params: { shareId: string } };
export function GET(_req: Request, { params }: Props) {
  const row = db.savedSessions
    .select()
    .where({ shareId: params.shareId, isShared: true })
    .first() as any;
  if (!row)
    return json(
      { ok: false, error: "Shared track not found or no longer shared." },
      { status: 404 },
    );
  try {
    db.savedSessions
      .update({ lastPlayedAt: Date.now(), updatedAt: Date.now() })
      .where({ id: row.id })
      .run();
  } catch {}
  return json({
    ok: true,
    track: {
      id: row.id,
      shareId: row.shareId,
      name: row.name,
      description: row.description,
      ownerEmail: row.ownerEmail,
      session: row.session,
      scriptFormat: row.scriptFormat,
      scriptText: row.scriptText,
      createdAt: row.createdAt,
    },
  });
}
