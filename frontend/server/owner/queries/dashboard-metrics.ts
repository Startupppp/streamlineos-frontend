import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type PlatformDashboardMetrics = {
  customers: { total: number; activeLast30d: number };
  users: { total: number };
  messages: { total: number; unread: number };
  leads: { total: number; newLast7d: number };
  visits: { last30d: number; uniqueLast30d: number };
  revenue: { last30dInr: number; lifetimeInr: number; transactions: number };
  series: {
    visitsByDay: Array<{ date: string; count: number }>;
    revenueByMonth: Array<{ month: string; amount: number }>;
  };
};

export async function getDashboardMetrics(): Promise<PlatformDashboardMetrics> {
  return serverApiClient.get<PlatformDashboardMetrics>("/platform/metrics");
}
