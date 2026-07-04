import { json } from "@/lib/http";
export function POST() {
  return json(
    {
      ok: false,
      error:
        "Public community publishing is disabled. Save to Google library and share /shared links, or use admin curation for catalogue rows.",
    },
    { status: 410 },
  );
}
