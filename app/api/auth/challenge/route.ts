import { createChallenge } from "@/lib/auth";
import { json, readJson } from "@/lib/http";

type Body = { publicKey?: string };
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const publicKey = body?.publicKey?.trim();
  if (!publicKey)
    return json({ ok: false, error: "publicKey required" }, { status: 400 });
  const c = await createChallenge(publicKey);
  return json({ ok: true, ...c });
}
