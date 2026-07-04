import { json } from "@/lib/http";
export function POST() {
  return json(
    {
      ok: false,
      error: "Legacy wallet login is disabled. Use Google sign-in.",
    },
    { status: 410 },
  );
}
