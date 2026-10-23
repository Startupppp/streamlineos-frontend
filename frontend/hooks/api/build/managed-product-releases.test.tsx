import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  useCreateManagedProductRelease,
  useInfiniteManagedProductReleases,
  useUpdateManagedProductRelease,
} from "./managed-product-releases";
import type { ManagedProductRelease, ManagedProductReleasesPage } from "./managed-product-releases";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPost = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));

const DRAFT: ManagedProductRelease = {
  id: 1,
  orgId: "org-1",
  managedProductId: 7,
  name: "Spring launch",
  version: "2.0.0",
  description: null,
  status: "draft",
  releaseDate: null,
  recordRevision: 1,
  ownerUserId: null,
  ownerUser: null,
  qaState: null,
  deploymentEvidenceUrl: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  projectReleaseId: null,
  projectRelease: null,
  allowedActions: ["view", "update", "archive"],
  linkedRoadmapItemCount: 0,
};

function page(rows: ManagedProductRelease[]): ManagedProductReleasesPage {
  return { data: rows, pagination: { limit: 100, hasMore: false, nextCursor: null } };
}

function setup() {
  const client = createAppQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  const single = buildWorkQueryKeys.projects.managedProducts.releases(7);
  const timeline = buildWorkQueryKeys.projects.managedProducts.releasesTimeline(7, { limit: 100 });
  client.setQueryData(single, page([DRAFT]));
  client.setQueryData<InfiniteData<ManagedProductReleasesPage>>(timeline, {
    pages: [page([DRAFT])],
    pageParams: [undefined],
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, single, timeline, wrapper: Wrapper };
}

beforeEach(() => {
  mockGet.mockReset();
  mockPatch.mockReset();
  mockPost.mockReset();
});

it("patches the single page and every timeline cache from the update response without invalidating", async () => {
  const { client, single, timeline, wrapper } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const released = { ...DRAFT, status: "released", releaseDate: "2026-10-11", updatedAt: "2026-10-11T00:00:00Z" };
  mockPatch.mockResolvedValue(released);
  const { result } = renderHook(() => useUpdateManagedProductRelease(7), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ releaseId: 1, status: "released", releaseDate: "2026-10-11", expectedRevision: 1 });
  });
  expect(client.getQueryData<ManagedProductReleasesPage>(single)?.data[0]).toEqual(released);
  expect(
    client.getQueryData<InfiniteData<ManagedProductReleasesPage>>(timeline)?.pages[0].data[0],
  ).toEqual(released);
  expect(invalidate).not.toHaveBeenCalled();
});

it("prepends a created release to the first page of each cache", async () => {
  const { client, single, timeline, wrapper } = setup();
  const created = { ...DRAFT, id: 2, name: "Autumn fixes" };
  mockPost.mockResolvedValue(created);
  const { result } = renderHook(() => useCreateManagedProductRelease(7), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ name: "Autumn fixes", version: "2.0.1" });
  });
  expect(client.getQueryData<ManagedProductReleasesPage>(single)?.data.map((r) => r.id)).toEqual([2, 1]);
  expect(
    client.getQueryData<InfiniteData<ManagedProductReleasesPage>>(timeline)?.pages[0].data.map((r) => r.id),
  ).toEqual([2, 1]);
});

describe("useInfiniteManagedProductReleases — search param (BSN-RELEASE-SEARCH)", () => {
  function makeWrapper() {
    const client = createAppQueryClient();
    client.setDefaultOptions({ queries: { retry: false } });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return { client, wrapper: Wrapper };
  }

  it("includes search in the query key and sends it to the API when provided so filtered results are cached separately", async () => {
    const releasePage: ManagedProductReleasesPage = {
      data: [DRAFT],
      pagination: { limit: 10, hasMore: false, nextCursor: null },
    };
    mockGet.mockResolvedValue(releasePage);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useInfiniteManagedProductReleases(7, { limit: 10, search: "bugfix" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, params] = mockGet.mock.calls[0] as [string, Record<string, string>];
    expect(params.search).toBe("bugfix");
  });

  it("omits search from the API call when search is not provided so unfiltered queries stay cache-compatible", async () => {
    const releasePage: ManagedProductReleasesPage = {
      data: [DRAFT],
      pagination: { limit: 10, hasMore: false, nextCursor: null },
    };
    mockGet.mockResolvedValue(releasePage);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useInfiniteManagedProductReleases(7, { limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, params] = mockGet.mock.calls[0] as [string, Record<string, string>];
    expect(params.search).toBeUndefined();
  });

  it("produces different query keys for different search values so cached pages do not bleed across filters", () => {
    const withSearch = buildWorkQueryKeys.projects.managedProducts.releasesTimeline(7, { limit: 10, search: "v2" });
    const withoutSearch = buildWorkQueryKeys.projects.managedProducts.releasesTimeline(7, { limit: 10 });
    expect(withSearch).not.toEqual(withoutSearch);
  });

  it("query key without search is a prefix of the key with search so patchReleaseCaches invalidates all variants", () => {
    const base = buildWorkQueryKeys.projects.managedProducts.releasesTimeline(7);
    const withSearch = buildWorkQueryKeys.projects.managedProducts.releasesTimeline(7, { limit: 10, search: "v2" });
    expect(withSearch.slice(0, base.length)).toEqual(base);
  });
});
