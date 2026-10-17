import {
  OWNER,
  OWNER_USER_ID,
  installReleasesMocks,
} from "./releases-page-test-harness";

beforeEach(installReleasesMocks);

it("rejects a release row that omits the createdBy key so a future dropped projection cannot decode silently", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutCreatedBy = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutCreatedBy],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("accepts a release row where createdBy is null since the column may be unset", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithNullCreatedBy = {
    id: 1,
    orgId: "org-abc",
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    readiness: null,
    riskLevel: null,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithNullCreatedBy],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(true);
});

it("rejects a release row that omits publishedAt because a dropped projection must not decode silently", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutPublishedAt = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    ticketCount: 0,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutPublishedAt],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("rejects a release row that omits createdByUser, so a dropped join cannot decode into a permanent dash", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const rowWithoutCreatedByUser = {
    id: 1,
    projectId: 1,
    name: "v1",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    ticketCount: 0,
    createdBy: OWNER_USER_ID,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  };
  const result = projectReleaseListContract.safeParse({
    data: [rowWithoutCreatedByUser],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(false);
});

it("accepts a release row whose createdByUser is the four-field user object the join projects", async () => {
  const { projectReleaseListContract } = await import("@/hooks/api/build/build-project-schema");
  const result = projectReleaseListContract.safeParse({
    data: [
      {
        id: 1,
        orgId: "org-abc",
        projectId: 1,
        name: "v1",
        version: "1.0.0",
        rowVersion: 1,
        description: null,
        status: "draft",
        releaseDate: null,
        publishedAt: null,
        ticketCount: 0,
        readiness: null,
        riskLevel: null,
        createdBy: OWNER_USER_ID,
        createdByUser: OWNER,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });
  expect(result.success).toBe(true);
});
