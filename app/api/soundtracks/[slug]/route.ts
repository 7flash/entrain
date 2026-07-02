import { findSoundtrack } from "@/lib/soundtracks";
import { authFromRequest, decideSoundtrackAccess } from "@/lib/access-policy";
import { json } from "@/lib/http";

type Props = { params: { slug: string } };

export function GET(req: Request, { params }: Props) {
  const soundtrack = findSoundtrack(params.slug);
  if (!soundtrack)
    return json({ ok: false, error: "soundtrack not found" }, { status: 404 });
  const { session, ...meta } = soundtrack;
  const access = decideSoundtrackAccess(
    soundtrack,
    authFromRequest(req),
    "view",
  );
  return json({ ok: true, soundtrack: meta, access });
}
