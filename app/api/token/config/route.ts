import { json } from "@/lib/http";
export function GET() {
  return json({
    ok: true,
    payments: false,
    message:
      "Token gates are disabled. ENTRAIN uses Google accounts for saved share links.",
  });
}
