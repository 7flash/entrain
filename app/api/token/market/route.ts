import { getTokenMarketSnapshot } from "@/lib/token-market";
import { json } from "@/lib/http";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const snapshot = await getTokenMarketSnapshot(force);
  return json(snapshot, { status: snapshot.ok ? 200 : 503 });
}
