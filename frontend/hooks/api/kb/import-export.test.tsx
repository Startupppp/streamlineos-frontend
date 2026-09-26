import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockGet = jest.fn<Promise<unknown>, [string, unknown, unknown, unknown]>();
const mockUseCan = jest.fn<boolean, [string]>();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (path: string, params: unknown, signal: unknown, contract: unknown) =>
      mockGet(path, params, signal, contract),
    post: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_key: string, options: { mutationFn: (v: unknown) => Promise<unknown> }) => {
    const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useKbImportJobs, useKbExportJobs } from "./import-export";

const PAGINATION = { limit: 20, hasMore: false, nextCursor: null };

const IMPORT_JOB = {
  id: 1,
  orgId: "org-1",
  sourceType: "markdown",
  fileKey: null,
  status: "completed" as const,
  totalItems: 3,
  processedItems: 3,
  succeededItems: 3,
  failedItems: 0,
  duplicateItems: 0,
  errorReport: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

const EXPORT_JOB = {
  id: 2,
  orgId: "org-1",
  scopeType: "page",
  scopeId: 4,
  format: "markdown" as const,
  status: "completed" as const,
  fileKey: "exports/2.md",
  expiresAt: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useKbImportJobs — wire-shape is visible through selectFlatPages", () => {
  it("returns the flat jobs array when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [IMPORT_JOB], pagination: PAGINATION });

    const { result } = renderHook(() => useKbImportJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([IMPORT_JOB]);
  });

  it("when the wire renames data to items the result is not the job list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [IMPORT_JOB], pagination: PAGINATION });

    const { result } = renderHook(() => useKbImportJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).not.toEqual([IMPORT_JOB]);
  });

  it("data is undefined when the user lacks the import permission, so a disabled query is distinguishable from an empty list", () => {
    mockUseCan.mockReturnValue(false);
    mockGet.mockResolvedValue({ data: [IMPORT_JOB], pagination: PAGINATION });

    const { result } = renderHook(() => useKbImportJobs(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("fetches from /kb/import-jobs so the query talks to the correct endpoint", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useKbImportJobs(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/import-jobs");
  });

  it("exposes hasNextPage so the consumer can call fetchNextPage when the wire says there are more pages", async () => {
    mockGet.mockResolvedValue({
      data: [IMPORT_JOB],
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-2" },
    });

    const { result } = renderHook(() => useKbImportJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.data).toEqual([IMPORT_JOB]);
  });
});

describe("useKbExportJobs — wire-shape is visible through selectFlatPages", () => {
  it("returns the flat jobs array when the wire sends { data: [], pagination }", async () => {
    mockGet.mockResolvedValue({ data: [EXPORT_JOB], pagination: PAGINATION });

    const { result } = renderHook(() => useKbExportJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([EXPORT_JOB]);
  });

  it("when the wire renames data to items the result is not the job list — so a wire-shape change breaks the test above", async () => {
    mockGet.mockResolvedValue({ items: [EXPORT_JOB], pagination: PAGINATION });

    const { result } = renderHook(() => useKbExportJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).not.toEqual([EXPORT_JOB]);
  });

  it("fetches from /kb/export-jobs so the query talks to the correct endpoint", async () => {
    mockGet.mockResolvedValue({ data: [], pagination: PAGINATION });

    renderHook(() => useKbExportJobs(), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/kb/export-jobs");
  });
});
