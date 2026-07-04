import { json } from "@/lib/http";
export function GET() {
  return json(
    {
      ok: false,
      error:
        "Room rewards are disabled. ENTRAIN now uses Google accounts and free sharing.",
    },
    { status: 410 },
  );
}
