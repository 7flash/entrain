import { getAuthSession } from "@/lib/auth";
import { cookieValue, json } from "@/lib/http";

export function GET(req: Request) {
  const user = getAuthSession(cookieValue(req));
  return json({
    ok: true,
    user: user
      ? {
          authenticated: true,
          userId: user.userId,
          email: user.email,
          name: user.name,
          picture: user.picture,
          expiresAt: user.expiresAt,
        }
      : null,
    entitlements: { canSavePrivate: !!user, catalogueUnlocked: true },
  });
}
