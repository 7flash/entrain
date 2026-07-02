import { db } from "@/lib/db";
import { ADMIN_TOKEN } from "@/lib/config";
import { json } from "@/lib/http";
import { buildAuditReport } from "@/lib/audit-report";

function isAdmin(req: Request) {
  if (!ADMIN_TOKEN) return process.env.NODE_ENV !== "production";
  const token =
    req.headers.get("x-admin-token") ||
    new URL(req.url).searchParams.get("adminToken");
  return token === ADMIN_TOKEN;
}

export function GET(req: Request) {
  if (!isAdmin(req))
    return json({ ok: false, error: "admin token required" }, { status: 401 });
  const url = new URL(req.url);
  const includeSignals = url.searchParams.get("signals") === "1";
  const rows = db.templates.select().orderBy("sortOrder", "ASC").all() as any[];
  return json({ ok: true, report: buildAuditReport(rows, { includeSignals }) });
}
