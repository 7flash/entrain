import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { cookieValue, json, readJson } from '@/lib/http';

export async function POST(req: Request) {
  const auth = getAuthSession(cookieValue(req));
  if (!auth) return json({ ok: false, error: 'wallet session required' }, { status: 401 });
  const body = await readJson<any>(req);
  if (!body?.session || !body?.name) return json({ ok: false, error: 'name and session required' }, { status: 400 });
  const row = db.savedSessions.insert({ publicKey: auth.publicKey, slug: body.slug || 'custom', name: body.name, session: body.session, createdAt: Date.now() });
  return json({ ok: true, saved: row });
}

export function GET(req: Request) {
  const auth = getAuthSession(cookieValue(req));
  if (!auth) return json({ ok: false, error: 'wallet session required' }, { status: 401 });
  const rows = db.savedSessions.select().where({ publicKey: auth.publicKey }).orderBy('createdAt','DESC').limit(50).all();
  return json({ ok: true, sessions: rows });
}
