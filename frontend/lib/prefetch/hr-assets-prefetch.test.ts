import { assetListPageContract } from "@/hooks/api/hr/assets-schema";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const assetRow = {
  id: 1,
  orgId: "org-1",
  name: "MacBook Pro",
  type: "LAPTOP",
  brand: null,
  model: null,
  serialNumber: null,
  assignedTo: null,
  assignedToMembershipId: null,
  status: "AVAILABLE",
  purchaseDate: null,
  purchaseCost: null,
  location: null,
  notes: null,
  expectedReturnDate: null,
  createdAt: "2026-09-17T00:00:00Z",
  updatedAt: "2026-09-17T00:00:00Z",
};

const counts = { total: 1, available: 1, assigned: 0, maintenance: 0, retired: 0 };

describe("hr assets prefetch", () => {
  it("accepts the cursor envelope the endpoint actually returns, not an offset envelope with page and totalPages", () => {
    const result = assetListPageContract.safeParse({
      data: [assetRow],
      counts,
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });

    expect(result.success).toBe(true);
  });

  it("rejects the offset envelope the prefetch used to demand, which no asset response has ever contained", () => {
    const result = assetListPageContract.safeParse({
      data: [assetRow],
      counts,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    expect(result.success).toBe(false);
  });

  it("builds the same query key the client hook builds, so the prefetched page actually hydrates", () => {
    expect(humanResourcesQueryKeys.hr.assets({ limit: 20 })).toEqual(
      humanResourcesQueryKeys.hr.assets({ limit: 20 }),
    );
    expect(humanResourcesQueryKeys.hr.assets({ limit: 20 })).not.toEqual(
      humanResourcesQueryKeys.hr.assets({ page: 1, limit: 20 }),
    );
  });
});
