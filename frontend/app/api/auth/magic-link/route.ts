import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const res = await fetch(`${BACKEND_URL}/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: parsed.data.email }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to send link" }, { status: res.status });
  }

  return NextResponse.json({ message: "If an account exists, a sign-in link has been sent" });
}
