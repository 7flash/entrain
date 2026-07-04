import { getAuthSession } from "@/lib/auth";
import { cookieValue, json } from "@/lib/http";

export function GET(req: Request) {
  const s = getAuthSession(cookieValue(req));
  if (!s) return json({ authenticated: false, user: null });
  return json({
    authenticated: true,
    userId: s.userId,
    email: s.email,
    name: s.name,
    picture: s.picture,
    expiresAt: s.expiresAt,
  });
}
