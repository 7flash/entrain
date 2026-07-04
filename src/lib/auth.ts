import { db } from "./db";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SESSION_COOKIE,
} from "./config";
import { cookieValue } from "./http";

const SESSION_MS = 30 * 24 * 60 * 60_000;

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};
type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

export type UserAuthSession = {
  sessionId: string;
  userId: string;
  publicKey: string; // compatibility alias used by older library code; stores userId, not a wallet key
  email: string;
  name?: string;
  picture?: string;
  balance: number;
  expiresAt: number;
  lastRefreshedAt: number;
};

export function googleConfigured() {
  return !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET;
}

export function googleStartUrl(state: string, next = "/") {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state + ":" + encodeURIComponent(next || "/"));
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function handleGoogleCallback(code: string) {
  if (!googleConfigured())
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  const form = new URLSearchParams();
  form.set("code", code);
  form.set("client_id", GOOGLE_CLIENT_ID);
  form.set("client_secret", GOOGLE_CLIENT_SECRET);
  form.set("redirect_uri", GOOGLE_REDIRECT_URI);
  form.set("grant_type", "authorization_code");
  const token = (await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  }).then((r) => r.json())) as GoogleTokenResponse;
  if (!token.access_token)
    throw new Error(
      token.error_description || token.error || "Google token exchange failed",
    );
  const info = (await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { authorization: `Bearer ${token.access_token}` },
    },
  ).then((r) => r.json())) as GoogleUserInfo;
  if (!info.sub || !info.email)
    throw new Error("Google profile did not include email/sub.");
  return await createGoogleSession(info);
}

export async function createGoogleSession(info: GoogleUserInfo) {
  const now = Date.now();
  let user = db.users.select().where({ googleSub: info.sub }).first() as any;
  if (!user) {
    user = db.users.insert({
      userId: crypto.randomUUID(),
      googleSub: info.sub,
      email: info.email,
      name: info.name || info.email.split("@")[0],
      picture: info.picture || "",
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    }) as any;
  } else {
    db.users
      .update({
        email: info.email,
        name: info.name || user.name,
        picture: info.picture || user.picture || "",
        lastLoginAt: now,
        updatedAt: now,
      })
      .where({ userId: user.userId })
      .run();
    user = db.users.select().where({ userId: user.userId }).first() as any;
  }
  const sessionId = crypto.randomUUID();
  const expiresAt = now + SESSION_MS;
  db.userSessions.insert({
    sessionId,
    userId: user.userId,
    email: user.email,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return {
    sessionId,
    userId: user.userId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    maxAgeSec: Math.floor(SESSION_MS / 1000),
    expiresAt,
  };
}

export function getAuthSession(
  sessionId?: string | null,
): UserAuthSession | null {
  if (!sessionId) return null;
  const row = db.userSessions.select().where({ sessionId }).first() as any;
  if (!row || Number(row.expiresAt || 0) < Date.now()) return null;
  const user = db.users.select().where({ userId: row.userId }).first() as any;
  if (!user) return null;
  return {
    sessionId,
    userId: user.userId,
    publicKey: user.userId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    balance: 0,
    expiresAt: Number(row.expiresAt),
    lastRefreshedAt: Number(row.updatedAt || row.createdAt || 0),
  };
}

export function authFromCookie(req: Request) {
  return getAuthSession(cookieValue(req, SESSION_COOKIE));
}

export function clearAuthSession(sessionId?: string | null) {
  if (!sessionId) return;
  try {
    db.userSessions.delete().where({ sessionId }).run();
  } catch {}
}

// Legacy API compatibility: disabled intentionally.
export function createChallenge() {
  throw new Error("Legacy wallet login is disabled. Use Google sign-in.");
}
export async function verifyWallet() {
  throw new Error("Legacy wallet login is disabled. Use Google sign-in.");
}
export async function refreshWalletSession(sessionId?: string | null) {
  const s = getAuthSession(sessionId);
  if (!s) throw new Error("Google session required");
  return {
    sessionId: s.sessionId,
    publicKey: s.publicKey,
    userId: s.userId,
    email: s.email,
    balance: 0,
    maxAgeSec: Math.floor((s.expiresAt - Date.now()) / 1000),
    expiresAt: s.expiresAt,
  };
}
