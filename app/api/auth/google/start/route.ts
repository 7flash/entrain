import { googleConfigured, googleStartUrl } from "@/lib/auth";
import { GOOGLE_OAUTH_STATE_COOKIE, COOKIE_SECURE } from "@/lib/config";

export function GET(req: Request) {
  if (!googleConfigured())
    return new Response(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      { status: 500 },
    );
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/account";
  const state = crypto.randomUUID();
  const secure = COOKIE_SECURE ? "; Secure" : "";
  const cookie = `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
  return new Response(null, {
    status: 302,
    headers: { location: googleStartUrl(state, next), "set-cookie": cookie },
  });
}
