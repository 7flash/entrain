import type { EntrainTemplateV1 } from "@/format/entrain-format";
import { getAuthSession } from "./auth";
import { cookieValue, json } from "./http";

export type UserAuth = ReturnType<typeof getAuthSession>;
export type SoundtrackAction =
  "view" | "play" | "export" | "clone" | "room" | "buy";
export type LibraryAction = "list" | "save" | "update" | "delete";

export type AccessDecision = {
  ok: boolean;
  code: "ok" | "login_required" | "not_found";
  message: string;
  minTokens: number;
  balance: number;
  requiresWallet: boolean; // compatibility with older clients; always false in Google/free mode
  requiresLogin?: boolean;
  staleBalance: boolean;
  balanceRefreshedAt?: number;
  ownedByUser?: boolean;
  purchased?: boolean;
};

export function authFromRequest(req: Request) {
  return getAuthSession(cookieValue(req));
}

export function decideSoundtrackAccess(
  template: EntrainTemplateV1 | null,
  auth: UserAuth,
  _action: SoundtrackAction = "play",
): AccessDecision {
  if (!template)
    return {
      ok: false,
      code: "not_found",
      message: "Soundtrack not found",
      minTokens: 0,
      balance: 0,
      requiresWallet: false,
      requiresLogin: false,
      staleBalance: false,
      balanceRefreshedAt: auth?.lastRefreshedAt,
    };
  return {
    ok: true,
    code: "ok",
    message: "Public catalogue soundtrack unlocked.",
    minTokens: 0,
    balance: 0,
    requiresWallet: false,
    requiresLogin: false,
    staleBalance: false,
    balanceRefreshedAt: auth?.lastRefreshedAt,
    ownedByUser: false,
    purchased: true,
  };
}

export type LibraryAccessDecision = {
  ok: boolean;
  code: "ok" | "login_required";
  message: string;
  balance?: number;
  balanceRefreshedAt?: number;
  requiresLogin?: boolean;
};

export function decideLibraryAccess(
  auth: UserAuth,
  action: LibraryAction = "save",
): LibraryAccessDecision {
  if (!auth)
    return {
      ok: false,
      code: "login_required",
      message: `Sign in with Google to ${action} tracks in your saved library.`,
      requiresLogin: true,
    };
  return {
    ok: true,
    code: "ok",
    message: "Google library unlocked",
    balance: 0,
    balanceRefreshedAt: auth.lastRefreshedAt,
  };
}

export function accessJson(
  decision: AccessDecision,
  extra: Record<string, unknown> = {},
) {
  const status = decision.code === "not_found" ? 404 : decision.ok ? 200 : 403;
  return json(
    {
      ...decision,
      ok: decision.ok,
      error: decision.ok ? undefined : decision.message,
      ...extra,
    },
    { status },
  );
}
