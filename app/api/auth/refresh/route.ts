import { refreshWalletSession } from "@/lib/auth";
import { cookieValue, json, sessionCookie } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const result = await refreshWalletSession(cookieValue(req));
    return json(
      {
        ok: true,
        userId: result.userId,
        email: result.email,
        publicKey: result.publicKey,
        balance: 0,
        expiresAt: result.expiresAt,
      },
      {
        headers: {
          "set-cookie": sessionCookie(result.sessionId, result.maxAgeSec),
        },
      },
    );
  } catch (e: any) {
    return json(
      { ok: false, error: e.message || "Google session required" },
      { status: 401 },
    );
  }
}
