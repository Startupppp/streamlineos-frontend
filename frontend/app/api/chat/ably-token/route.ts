import { NextResponse } from "next/server";
import { makeBackendToken } from "@/lib/api/make-backend-token";
import { withAuth } from "@/lib/api/helpers";

export async function GET() {
  return withAuth(async (session) => {
    const auth = await makeBackendToken(session);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/chat/ably-token`;
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${auth}` },
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  });
}
