import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, seedBackendToken } from "@/lib/api-client";
import { resetOutageCircuit } from "@/lib/api-outage-circuit";
import { ApiContractError, getCorrelationId } from "@/lib/api-envelope";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

let allowed = true;
jest.mock("@/hooks/api/access", () => ({ useCan: () => allowed }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useDryRunImport, useImportKbPages, useKbExportJobs, useKbImportJob, useKbImportJobs, useRetryImportJob } from "./import-export";
import { useExportKbPage } from "./export-page";

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const pagination = { limit: 20, hasMore: false, nextCursor: null };
const importJob = {
  id: 1,
  orgId: "org-1",
  sourceType: "markdown",
  fileKey: null,
  status: "completed",
  totalItems: 3,
  processedItems: 3,
  succeededItems: 3,
  failedItems: 0,
  duplicateItems: 0,
  canRetry: false,
  errorReport: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};
const exportJob = {
  id: 2,
  orgId: "org-1",
  scopeType: "page",
  scopeId: 4,
  format: "markdown",
  status: "completed",
  fileKey: "exports/2.md",
  expiresAt: null,
  createdById: "user-1",
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

let client: QueryClient;

function response(data: unknown, correlationId?: string) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json", ...(correlationId ? { "x-correlation-id": correlationId } : {}) }),
    json: async () => ({ success: true, data }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  allowed = true;
  resetOutageCircuit();
  clearBackendTokenCache();
  seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary }, mutations: { retry: false } } });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

describe("KB import and export hooks through the HTTP parser", () => {
  it("flattens import history while retaining the validated page and cursor in the cache", async () => {
    fetchMock.mockResolvedValue(response({ data: [importJob], pagination }));
    const { result } = renderHook(() => useKbImportJobs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([importJob]);
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.importJobs())).toEqual({
      pages: [{ data: [importJob], pagination }],
      pageParams: [undefined],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/import-jobs");
  });

  it("keeps export history cursor metadata after selecting the flat job list", async () => {
    fetchMock.mockResolvedValueOnce(response({
      data: [exportJob],
      pagination: { limit: 20, hasMore: true, nextCursor: "next-2" },
    }));
    fetchMock.mockResolvedValueOnce(response({ data: [{ ...exportJob, id: 3 }], pagination }));
    const { result } = renderHook(() => useKbExportJobs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.data).toEqual([exportJob]));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data).toEqual([exportJob, { ...exportJob, id: 3 }]));
    expect(fetchMock.mock.calls[1]?.[0]).toContain("cursor=next-2");
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.exportJobs())).toEqual({
      pages: [
        { data: [exportJob], pagination: { limit: 20, hasMore: true, nextCursor: "next-2" } },
        { data: [{ ...exportJob, id: 3 }], pagination },
      ],
      pageParams: [undefined, "next-2"],
    });
  });

  it("keeps a first-read export contract error inline and recovers after retry", async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [exportJob], pagination }, "export-history-123"));
    fetchMock.mockResolvedValueOnce(response({ data: [exportJob], pagination }));
    const { result } = renderHook(() => useKbExportJobs(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(getCorrelationId(result.current.error)).toBe("export-history-123");
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual([exportJob]));
  });

  it("keeps a first-read import contract error inline and recovers after retry", async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [importJob], pagination }, "import-history-123"));
    fetchMock.mockResolvedValueOnce(response({ data: [importJob], pagination }));
    const { result } = renderHook(() => useKbImportJobs(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
    expect(getCorrelationId(result.current.error)).toBe("import-history-123");
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual([importJob]));
  });

  it("preserves a denied import read as pending without fetching", () => {
    allowed = false;
    const { result } = renderHook(() => useKbImportJobs(), { wrapper });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a single import job projection", async () => {
    fetchMock.mockResolvedValue(response(importJob));
    const { result } = renderHook(() => useKbImportJob(1), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(importJob);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/import-jobs/1");
  });

  it("parses import acceptance and dry-run projections", async () => {
    fetchMock.mockResolvedValueOnce(response({ jobId: 5, status: "pending" }));
    fetchMock.mockResolvedValueOnce(response({ total: 1, wouldSucceed: 1, wouldSkip: 0, invalidItems: [] }));
    const { result } = renderHook(() => ({ accepted: useImportKbPages(), preview: useDryRunImport() }), { wrapper });
    const input = { sourceType: "markdown" as const, items: [{ title: "Policy" }] };
    await act(async () => {
      await expect(result.current.accepted.mutateAsync(input)).resolves.toEqual({ jobId: 5, status: "pending" });
      await expect(result.current.preview.mutateAsync(input)).resolves.toEqual({ total: 1, wouldSucceed: 1, wouldSkip: 0, invalidItems: [] });
    });
  });

  it("parses the export result before downloading its content", async () => {
    const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    const createObjectURL = jest.fn(() => "blob:kb-export");
    const revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    fetchMock.mockResolvedValue(response({ jobId: 8, format: "markdown", content: "# Policy" }));
    try {
      const { result } = renderHook(() => useExportKbPage(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync({ pageId: 12, format: "markdown" })).resolves.toEqual({
          jobId: 8,
          format: "markdown",
          content: "# Policy",
        });
      });
      expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/pages/12/export");
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:kb-export");
    } finally {
      click.mockRestore();
      if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
      else Reflect.deleteProperty(URL, "createObjectURL");
      if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
      else Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });

  it("reuses an export key after a failed same-input retry and creates a new key after success", async () => {
    const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:kb-export") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
    fetchMock.mockRejectedValueOnce(new Error("Connection lost"));
    fetchMock.mockResolvedValue(response({ jobId: 8, format: "html", content: "<p>Policy</p>" }));
    try {
      const { result } = renderHook(() => useExportKbPage(), { wrapper });
      const input = { pageId: 12, format: "html" as const };
      await act(async () => {
        await expect(result.current.mutateAsync(input)).rejects.toThrow("Network error");
        resetOutageCircuit();
        await result.current.mutateAsync(input);
        await result.current.mutateAsync(input);
      });
      const keys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("Idempotency-Key"));
      expect(keys[0]).toBeTruthy();
      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).toBeTruthy();
      expect(keys[2]).not.toBe(keys[1]);
    } finally {
      click.mockRestore();
      if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
      else Reflect.deleteProperty(URL, "createObjectURL");
      if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
      else Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });

  it("reuses the retry key until the accepted result settles the operation", async () => {
    fetchMock.mockResolvedValue(response({ jobId: 5, status: "pending" }));
    const { result } = renderHook(() => useRetryImportJob(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(1);
      await result.current.mutateAsync(2);
    });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/import-jobs/1/retry");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/kb/import-jobs/2/retry");
  });
});
