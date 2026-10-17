import { managedProductRelationsGetManagedProductSummaryResponseSchema } from "@/contracts/build-contracts.generated";
import { compactManagedProductSummarySchema } from "./managed-product-summary";

const releasesSchema = compactManagedProductSummarySchema(
  managedProductRelationsGetManagedProductSummaryResponseSchema,
).shape.previews.shape.releases;

describe("managed product summary release previews", () => {
  const legacyPreview = {
    id: 1,
    orgId: "org-1",
    managedProductId: 2,
    name: "October release",
    version: "1.0",
    description: null,
    status: "released",
    releaseDate: "2026-10-14",
    createdBy: null,
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  };

  it("accepts the compact response from an older API instance", () => {
    expect(releasesSchema.safeParse([legacyPreview]).success).toBe(true);
  });

  it("still rejects a preview with an invalid status", () => {
    expect(releasesSchema.safeParse([{ ...legacyPreview, status: "unknown" }]).success).toBe(false);
  });
});
