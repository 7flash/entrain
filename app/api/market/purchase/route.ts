import { json } from "@/lib/http";
export function GET() {
  return json(
    {
      ok: false,
      error:
        "Payments are disabled. ENTRAIN uses free catalogue soundtracks and Google-saved share links.",
    },
    { status: 410 },
  );
}
export function POST() {
  return json(
    {
      ok: false,
      error:
        "Payments are disabled. ENTRAIN uses free catalogue soundtracks and Google-saved share links.",
    },
    { status: 410 },
  );
}
