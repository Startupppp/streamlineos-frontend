import type { ManagedProductRelease, ManagedProductReleaseDetail } from "@/hooks/api/build/managed-product-releases";

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
    recordRevision: 1,
    ownerUserId: null,
    qaState: null,
    deploymentEvidenceUrl: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    allowedActions: ["view", "update", "archive"],
    linkedRoadmapItemCount: 0,
    projectReleaseId: null,
    projectRelease: null,
    ...overrides,
  };
}

export function buildReleaseDetail(
  overrides: Partial<ManagedProductReleaseDetail>,
): ManagedProductReleaseDetail {
  return {
    id: 1,
    orgId: "org-1",
    managedProductId: 7,
    name: "Release",
    version: "1.0.0",
    description: null,
    status: "draft",
    releaseDate: null,
    recordRevision: 1,
    ownerUserId: null,
    qaState: null,
    deploymentEvidenceUrl: null,
    projectReleaseId: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    allowedActions: ["view", "update", "archive"],
    linkedRoadmapItemCount: 0,
    projectRelease: null,
    evidence: null,
    ...overrides,
  };
}
