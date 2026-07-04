// Legacy filename kept to avoid touching every old import. This is now Google account auth, not Phantom.
export type WalletState = {
  authenticated: boolean;
  publicKey: string | null;
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  balance: number;
  expiresAt?: number | null;
};
export type TokenMeta = {
  ticker: string;
  displayName: string;
  chainId: string;
  tokenAddress: string;
  solanaRpc?: string;
};

export async function getTokenMeta(): Promise<TokenMeta> {
  return { ticker: "", displayName: "", chainId: "none", tokenAddress: "" };
}
export function tokenLabel(_amount: number | string) {
  return "";
}

export async function getWalletState(): Promise<WalletState> {
  const r = await fetch("/api/auth/session")
    .then((x) => x.json())
    .catch(() => ({ authenticated: false }));
  return {
    authenticated: !!r.authenticated,
    publicKey: r.userId || null,
    userId: r.userId || null,
    email: r.email || null,
    name: r.name || null,
    picture: r.picture || null,
    balance: 0,
    expiresAt: r.expiresAt || null,
  };
}

export async function refreshWalletBalance() {
  const r = await fetch("/api/auth/refresh", { method: "POST" }).then((x) =>
    x.json(),
  );
  if (!r.ok) throw new Error(r.error || "session refresh failed");
  return {
    authenticated: true,
    publicKey: r.userId || r.publicKey || null,
    userId: r.userId || null,
    email: r.email || null,
    balance: 0,
    expiresAt: r.expiresAt || null,
  } as WalletState;
}

export async function connectAndVerify() {
  location.href = `/api/auth/google/start?next=${encodeURIComponent(location.pathname + location.search)}`;
  throw new Error("Redirecting to Google sign-in…");
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  location.reload();
}

export function tierLabel(_minTokens: number) {
  return "free";
}

export async function paySol() {
  throw new Error(
    "Payments are disabled. ENTRAIN now uses Google accounts and free sharing.",
  );
}
