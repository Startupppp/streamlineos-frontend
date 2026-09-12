import type { ApiOracle } from "./api-oracle";

export interface Reservation {
  id: number;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  productVariantId: number;
  locationId: number | null;
  reservedQty: string;
  status: "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";
}

/**
 * One order's reservation, in a given state.
 *
 * The endpoint filters by variant and status but not by source, and it imposes
 * no ordering, so the row is found by paging rather than by trusting the first
 * page — a tenant that has run this suite fifty times has fifty consumed
 * reservations for the same variant, and "it was on page one last week" is not
 * a contract.
 */
export async function reservationFor(
  api: ApiOracle,
  match: { variantId: number; soId: number; status: Reservation["status"] },
  maxPages = 5,
): Promise<Reservation | undefined> {
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await api.get<{ items: Reservation[]; totalPages: number }>(
      "/inventory/stock/reservations",
      { variantId: match.variantId, status: match.status, page, limit: 100 },
    );
    const hit = (res.items ?? []).find(
      (row) => row.sourceType === "inv_sales_order" && row.sourceId === String(match.soId),
    );
    if (hit) return hit;
    if (page >= (res.totalPages ?? 1)) break;
  }
  return undefined;
}
