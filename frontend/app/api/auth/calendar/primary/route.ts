import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { makeBackendToken } from "@/lib/api/make-backend-token";
import { z } from "zod";

const schema = z.object({ connectionId: z.number().int().positive() });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const token = await makeBackendToken(session);
  if (!token) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const res = await fetch(
    `${BACKEND_URL}/calendar/connections/${parsed.data.connectionId}/primary`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
