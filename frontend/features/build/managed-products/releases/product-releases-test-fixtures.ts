import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";

export function buildRelease(overrides: Partial<ManagedProductRelease>): ManagedProductRelease {
  return {
    id: 1,
    orgId: "org-1",
    managedProductId: 7,
    name: "Release",
    version: "1.0.0",
    description: null,
    status: "draft",
    releaseDate: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
