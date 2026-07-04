import { clearAuthSession } from "@/lib/auth";
import { cookieValue, clearSessionCookie, json } from "@/lib/http";

export function POST(req: Request) {
  clearAuthSession(cookieValue(req));
  return json(
    { ok: true },
    { headers: { "set-cookie": clearSessionCookie() } },
  );
}
