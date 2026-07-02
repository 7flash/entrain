import { allSoundtracks, soundtracksByCategory } from "@/lib/soundtracks";
import { json } from "@/lib/http";

export function GET() {
  return json({
    ok: true,
    templates: allSoundtracks().map(({ session, ...meta }) => meta),
    soundtracks: allSoundtracks().map(({ session, ...meta }) => meta),
    groups: soundtracksByCategory().map((g) => ({
      category: g.category,
      count: g.templates.length,
    })),
  });
}
