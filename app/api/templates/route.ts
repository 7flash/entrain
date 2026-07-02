import { allTemplates } from '@/lib/templates';
import { json } from '@/lib/http';

export function GET() {
  return json({ ok: true, templates: allTemplates().map(({ session, ...meta }) => meta) });
}
