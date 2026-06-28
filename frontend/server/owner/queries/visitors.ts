import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type VisitByDay = { date: string; visits: number; unique: number };
export type TopPath = { path: string; visits: number };
export type TopReferrer = { referrer: string | null; visits: number };
export type RecentVisit = { path: string; referrer: string | null; country: string | null; userAgent: string | null; createdAt: string | Date };

export type VisitorAnalytics = {
  byDay: VisitByDay[];
  topPaths: TopPath[];
  topReferrers: TopReferrer[];
  recent: RecentVisit[];
};

export async function getVisitorAnalytics(): Promise<VisitorAnalytics> {
  return serverApiClient.get<VisitorAnalytics>("/platform/visitors");
}
