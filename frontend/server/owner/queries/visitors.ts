import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export async function getVisitorAnalytics() {
  return serverApiClient.get<{
    byDay: unknown[];
    topPaths: unknown[];
    topReferrers: unknown[];
    recent: unknown[];
  }>("/platform/visitors");
}
