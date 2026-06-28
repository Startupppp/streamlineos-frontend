import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type PlatformPayment = {
  id: number;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  method: string | null;
  description: string | null;
  customerEmail: string | null;
  orgName: string | null;
  orgSlug: string | null;
  createdAt: string | Date;
};

export type RevenueSummary = {
  byStatus: { status: string; count: number; total: number }[];
  byMonth: { month: string; amount: number }[];
  byMethod: { method: string; count: number }[];
};

export async function listPayments(limit = 100): Promise<PlatformPayment[]> {
  return serverApiClient.get<PlatformPayment[]>(
    "/platform/revenue/payments",
    limit !== 100 ? { limit } : undefined,
  );
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  return serverApiClient.get<RevenueSummary>("/platform/revenue/summary");
}
