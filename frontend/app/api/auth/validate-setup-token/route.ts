import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api/backend-proxy";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return proxyToBackend(req, `/organization/setup-token/validate${search}`, { method: "GET" });
}
