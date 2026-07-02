import { findTemplate } from '@/lib/templates';
import { cookieValue, json } from '@/lib/http';
import { getAuthSession } from '@/lib/auth';

export function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const template = findTemplate(slug);
  if (!template) return json({ ok: false, error: 'template not found' }, { status: 404 });
  const auth = getAuthSession(cookieValue(req));
  const unlocked = template.minTokens <= 0 || Number(auth?.balance || 0) >= template.minTokens;
  if (!unlocked) return json({ ok: false, requiresWallet: true, error: `Requires ${template.minTokens} $ENTRAIN`, minTokens: template.minTokens, balance: auth?.balance || 0 }, { status: 403 });
  return json({ ok: true, template, wallet: auth });
}
