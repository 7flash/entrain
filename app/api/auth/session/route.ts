import { getAuthSession } from '@/lib/auth';
import { cookieValue, json } from '@/lib/http';

export function GET(req: Request) {
  const s = getAuthSession(cookieValue(req));
  if (!s) return json({ authenticated: false, publicKey: null, balance: 0 });
  return json({ authenticated: true, publicKey: s.publicKey, balance: s.balance, expiresAt: s.expiresAt });
}
