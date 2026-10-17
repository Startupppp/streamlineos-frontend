import { QueryClient } from "@tanstack/react-query";

const projectId = 12;
const releaseBaseKey = ["app", "projects", projectId, "releases"] as const;

type Release = {
  id: number;
  projectId: number;
  name: string;
  version: string;
  status: string;
  rowVersion: number;
  description: null;
  releaseDate: null;
  publishedAt: null;
  readiness: null;
  riskLevel: null;
  ticketCount: number;
  createdBy: null;
  createdByUser: null;
  createdAt: string;
  updatedAt: string;
};

type ReleasePage = {
  data: Release[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 1,
    projectId,
    name: "Alpha",
    version: "1.0.0",
    status: "draft",
    rowVersion: 1,
    description: null,
    releaseDate: null,
    publishedAt: null,
    readiness: null,
    riskLevel: null,
    ticketCount: 0,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function makePage(releases: Release[]): ReleasePage {
  return {
    data: releases,
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };
}

describe("releases cache-patch behavior (FE-133)", () => {
  let qc: QueryClient;
  const cacheKey = [...releaseBaseKey, {}] as const;

  beforeEach(() => {
    qc = new QueryClient();
    qc.setQueryData(cacheKey, makePage([makeRelease({ id: 1 }), makeRelease({ id: 2 })]));
  });

  it("prepends a created release to the cache without refetching", () => {
    const created = makeRelease({ id: 99, version: "3.0.0" });
    qc.setQueriesData<ReleasePage>(
      { queryKey: releaseBaseKey },
      (old) => old ? { ...old, data: [created, ...old.data] } : old,
    );
    const result = qc.getQueryData<ReleasePage>(cacheKey);
    expect(result?.data[0]).toMatchObject({ id: 99 });
    expect(result?.data).toHaveLength(3);
  });

  it("replaces the updated release in-place in the cache", () => {
    const updated = makeRelease({ id: 1, version: "1.1.0", rowVersion: 2 });
    qc.setQueriesData<ReleasePage>(
      { queryKey: releaseBaseKey },
      (old) => old ? { ...old, data: old.data.map((r) => r.id === updated.id ? updated : r) } : old,
    );
    const result = qc.getQueryData<ReleasePage>(cacheKey);
    expect(result?.data.find((r) => r.id === 1)?.version).toBe("1.1.0");
    expect(result?.data).toHaveLength(2);
  });

  it("removes a deleted release from the cache", () => {
    const releaseId = 1;
    qc.setQueriesData<ReleasePage>(
      { queryKey: releaseBaseKey },
      (old) => old ? { ...old, data: old.data.filter((r) => r.id !== releaseId) } : old,
    );
    const result = qc.getQueryData<ReleasePage>(cacheKey);
    expect(result?.data.find((r) => r.id === releaseId)).toBeUndefined();
    expect(result?.data).toHaveLength(1);
  });

  it("preserves pagination metadata when patching", () => {
    const created = makeRelease({ id: 50 });
    qc.setQueriesData<ReleasePage>(
      { queryKey: releaseBaseKey },
      (old) => old ? { ...old, data: [created, ...old.data] } : old,
    );
    const result = qc.getQueryData<ReleasePage>(cacheKey);
    expect(result?.pagination).toEqual({ limit: 25, hasMore: false, nextCursor: null });
  });
});
