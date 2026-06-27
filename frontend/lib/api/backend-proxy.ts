import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function proxyToBackend(
  req: NextRequest,
  path: string,
  options?: { auth?: string; method?: string },
): Promise<NextResponse> {
  const method = options?.method ?? "POST";
  const url = `${BACKEND_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.auth) headers["Authorization"] = `Bearer ${options.auth}`;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";

  if (ip) headers["X-Forwarded-For"] = ip;

  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;

  try {
    const fetchInit: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD") {
      fetchInit.body = (await req.text()) || undefined;
    }

    const res = await fetch(url, fetchInit);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
