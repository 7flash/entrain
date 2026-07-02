import { allSoundtracks, soundtracksByCategory } from "@/lib/soundtracks";
import { json } from "@/lib/http";

export function GET() {
  return json({
    ok: true,
    soundtracks: allSoundtracks().map(({ session, ...meta }) => meta),
    groups: soundtracksByCategory().map((g) => ({
      category: g.category,
      count: g.templates.length,
    })),
  });
}
