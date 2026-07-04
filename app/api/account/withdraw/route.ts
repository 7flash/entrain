import { json } from "@/lib/http";
export function POST() {
  return json(
    {
      ok: false,
      error:
        "Withdrawals are disabled. ENTRAIN has no token rewards or payments.",
    },
    { status: 410 },
  );
}
