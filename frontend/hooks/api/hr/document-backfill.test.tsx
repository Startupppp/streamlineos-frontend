import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useBackfillDocuments, type DocumentBackfillPage } from "./document-backfill";
import { documentBackfillContract } from "./document-backfill-schema";

const mockPost = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { post: (...a: unknown[]) => mockPost(...a) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useAccess: () => ({ data: {}, refetch: jest.fn() }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function page(overrides: Partial<DocumentBackfillPage> = {}): DocumentBackfillPage {
  return {
    dryRun: true,
    scanned: 5,
    eligible: 2,
    proposals: { allEmployees: 1, hrOnly: 1 },
    skipped: { alreadyClassified: 0, belongsToAnEmployee: 3, typeNotAllowed: 0, hiringArtefact: 0, inactive: 0 },
    applied: 0,
    nextCursor: 5,
    done: true,
    sample: [{ documentId: 1, name: "Leave policy", audience: "ALL_EMPLOYEES" }],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockCan.mockReturnValue(true);
});

describe("useBackfillDocuments", () => {
  it("posts the dry-run flag and the cursor, and leaves the page size to the server unless one is given", async () => {
    mockPost.mockResolvedValue(page());
    const { result } = renderHook(() => useBackfillDocuments(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ dryRun: true, cursor: 0 });
      await result.current.mutateAsync({ dryRun: false, cursor: 40, limit: 25 });
    });

    expect(mockPost.mock.calls[0]?.slice(0, 2)).toEqual(["/hr/documents/kb-link/backfill", { dryRun: true, cursor: 0 }]);
    expect(mockPost.mock.calls[1]?.slice(0, 2)).toEqual(["/hr/documents/kb-link/backfill", { dryRun: false, cursor: 40, limit: 25 }]);
  });

  it("refreshes the HR document list after a page that changed something", async () => {
    mockPost.mockResolvedValue(page({ dryRun: false, applied: 2 }));
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useBackfillDocuments(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ dryRun: false, cursor: 0 });
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: humanResourcesQueryKeys.hr.documentsAll }));
  });

  it("leaves the list alone after a preview, and after a real page that changed nothing", async () => {
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useBackfillDocuments(), { wrapper });

    mockPost.mockResolvedValueOnce(page({ dryRun: true, applied: 0 }));
    await act(async () => {
      await result.current.mutateAsync({ dryRun: true, cursor: 0 });
    });
    mockPost.mockResolvedValueOnce(page({ dryRun: false, applied: 0 }));
    await act(async () => {
      await result.current.mutateAsync({ dryRun: false, cursor: 0 });
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not reach the server for someone who may not publish documents", async () => {
    mockCan.mockReturnValue(false);
    const { result } = renderHook(() => useBackfillDocuments(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ dryRun: true, cursor: 0 })).rejects.toThrow(/hr:documents:publish/);
    });

    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe("documentBackfillContract", () => {
  it("accepts what the server sends, including the end of the scan", () => {
    expect(documentBackfillContract.safeParse(page({ nextCursor: null, done: true })).success).toBe(true);
    expect(documentBackfillContract.safeParse(page({ sample: [] })).success).toBe(true);
  });

  it("refuses a page with a count that is not a count, or an audience it does not know", () => {
    expect(documentBackfillContract.safeParse({ ...page(), scanned: -1 }).success).toBe(false);
    expect(documentBackfillContract.safeParse({ ...page(), sample: [{ documentId: 1, name: "x", audience: "EVERYONE" }] }).success).toBe(false);
  });
});
