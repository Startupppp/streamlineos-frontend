import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface ProxyOptions {
  method?: string;
  auth: string | null;
  body?: unknown;
}

export async function proxyToBackend(
  _req: NextRequest,
  path: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  if (!options.auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.auth}`,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data: unknown = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
