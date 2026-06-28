import "server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { Invoice, InvoiceStats } from "@/types/invoice";

export interface InvoiceFilters {
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  clientId?: number;
  page?: number;
  limit?: number;
}

interface InvoicesListResponse {
  items: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getInvoices(
  orgId: string,
  filters?: InvoiceFilters,
): Promise<InvoicesListResponse> {
  return serverApiClient.get<InvoicesListResponse>("/invoices", {
    status: filters?.status,
    clientId: filters?.clientId,
    page: filters?.page,
    limit: filters?.limit,
  });
}

export async function getInvoiceStats(orgId: string): Promise<InvoiceStats> {
  return serverApiClient.get<InvoiceStats>("/invoices/stats");
}
