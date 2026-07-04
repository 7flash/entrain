import { json } from "@/lib/http";
export function GET() {
  return json(
    { ok: false, error: "Token market card is disabled." },
    { status: 410 },
  );
}
