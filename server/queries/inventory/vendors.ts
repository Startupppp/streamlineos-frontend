"server-only";

import { db } from "@/lib/db";
import { invVendors } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface VendorFilters {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function getVendors(orgId: string, filters?: VendorFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(invVendors.orgId, orgId)];
  if (filters?.isActive !== undefined) {
    conditions.push(eq(invVendors.isActive, filters.isActive));
  }

  const [items, [countResult]] = await Promise.all([
    db.query.invVendors.findMany({
      where: and(...conditions),
      orderBy: [desc(invVendors.createdAt)],
      limit,
      offset,
      with: {
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invVendors)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getVendor(orgId: string, vendorId: number) {
  return db.query.invVendors.findFirst({
    where: and(eq(invVendors.id, vendorId), eq(invVendors.orgId, orgId)),
    with: {
      creator: { columns: { id: true, name: true } },
    },
  });
}
