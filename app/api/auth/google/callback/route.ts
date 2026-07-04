import { handleGoogleCallback } from "@/lib/auth";
import { COOKIE_SECURE, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/config";
import { cookieValue, sessionCookie } from "@/lib/http";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const stateParam = url.searchParams.get("state") || "";
  const [state, encodedNext] = stateParam.split(":");
  const expected = cookieValue(req, GOOGLE_OAUTH_STATE_COOKIE);
  if (!code || !state || !expected || state !== expected)
    return new Response("Invalid or expired Google login state.", {
      status: 400,
    });
  try {
    const s = await handleGoogleCallback(code);
    const next = decodeURIComponent(encodedNext || "/account");
    const clearState = `${GOOGLE_OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? "; Secure" : ""}`;
    const headers = new Headers();
    headers.set(
      "location",
      new URL(next.startsWith("/") ? next : "/account", url.origin).toString(),
    );
    headers.append("set-cookie", sessionCookie(s.sessionId, s.maxAgeSec));
    headers.append("set-cookie", clearState);
    return new Response(null, { status: 302, headers });
  } catch (e: any) {
    return new Response(e.message || "Google login failed", { status: 401 });
  }
}
