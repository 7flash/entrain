import { tokenConfig } from "@/lib/token-market";
import { json } from "@/lib/http";

export function GET() {
  return json({ ok: true, ...tokenConfig() });
}
