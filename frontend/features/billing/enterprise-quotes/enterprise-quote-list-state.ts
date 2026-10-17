import { ENTERPRISE_QUOTE_STATUSES, type EnterpriseQuoteStatus } from "@/hooks/api/billing/billing-growth-schema";

/** Shared by the route's prefetch and the page, so both build the same query key. */
export const ENTERPRISE_QUOTE_PAGE_SIZE = 20;

export function readQuoteStatus(raw: string | null | undefined): EnterpriseQuoteStatus | undefined {
  return ENTERPRISE_QUOTE_STATUSES.find((status) => status === raw);
}
