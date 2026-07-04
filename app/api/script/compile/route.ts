import {
  looksLikeSbagen,
  sbagenTextToSession,
  sessionToSbagenText,
} from "@/format/sbagen";
import {
  patternTextToSession,
  sessionToPatternText,
} from "@/format/pattern-text";
import { sanitizeSession } from "@/format/entrain-format";
import { analyzeSession } from "@/format/protocol-analyzer";
import { signalMapForSession } from "@/format/channel-map";
import { json, readJson } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readJson<{
    text?: string;
    name?: string;
    format?: string;
  }>(req);
  const text = String(body?.text || "").trim();
  if (!text)
    return json({ ok: false, error: "script text required" }, { status: 400 });
  try {
    const isSbagen = looksLikeSbagen(text) || body?.format === "sbagen.v1";
    const result = isSbagen
      ? sbagenTextToSession(text, {
          name: body?.name || "Script import",
          defaultDurationMin: 20,
        })
      : { session: patternTextToSession(text), warnings: [] as any[] };
    const session = sanitizeSession(result.session);
    const analysis = analyzeSession(session);
    const signalMap = signalMapForSession(session);
    return json({
      ok: true,
      format: isSbagen ? "sbagen.v1" : "entrain-script.v1",
      session,
      warnings: result.warnings || [],
      analysis,
      signalMap,
      sbagenText: sessionToSbagenText(session),
      entrainText: sessionToPatternText(session),
    });
  } catch (e: any) {
    return json(
      { ok: false, error: e?.message || "script compile failed" },
      { status: 400 },
    );
  }
}
