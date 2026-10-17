import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    refetch: jest.fn().mockResolvedValue({ data: { isOrgOwner: true } }),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), patch: jest.fn() },
  isApiError: () => false,
}));

const mockPost = jest.mocked(apiClient.post);
const mockPatch = jest.mocked(apiClient.patch);

interface CachedRow {
  id: number;
  sentiment: string | null;
  theme: string | null;
  duplicateOfId: number | null;
  duplicateCount: number;
}

const LIST_KEY = growthAndSignQueryKeys.feedbucket.submissions({ managedProductId: 39, page: 1, limit: 25 });

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function seed(client: QueryClient, rows: CachedRow[]) {
  client.setQueryData(LIST_KEY, { data: rows, total: rows.length });
  for (const row of rows) client.setQueryData(growthAndSignQueryKeys.feedbucket.submission(row.id), row);
}

function listRow(client: QueryClient, id: number) {
  return client.getQueryData<{ data: CachedRow[] }>(LIST_KEY)?.data.find((row) => row.id === id);
}

function detail(client: QueryClient, id: number) {
  return client.getQueryData<CachedRow>(growthAndSignQueryKeys.feedbucket.submission(id));
}

const ORIGINAL: CachedRow = { id: 95, sentiment: "positive", theme: "Export", duplicateOfId: null, duplicateCount: 0 };
const COPY: CachedRow = { id: 96, sentiment: null, theme: "Export", duplicateOfId: null, duplicateCount: 0 };

beforeEach(() => {
  mockPost.mockReset();
  mockPatch.mockReset();
});

describe("feedbucket triage writes keep the product feedback list in step without a refetch", () => {
  it("shows the saved classification on the list row", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client, [ORIGINAL, COPY]);
    mockPatch.mockResolvedValue({
      id: 95,
      theme: "Data export",
      segment: "QA",
      sentiment: "neutral",
      consentStatus: "unknown",
      consentRecordedAt: null,
      updatedAt: "2026-10-11T10:04:26.040Z",
    });
    const { useClassifySubmission } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useClassifySubmission(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: 95, input: { sentiment: "neutral" } });
    });
    expect(listRow(client, 95)).toMatchObject({ sentiment: "neutral", theme: "Data export" });
    expect(listRow(client, 96)).toMatchObject({ sentiment: null, theme: "Export" });
  });

  it("marks the copy and raises the original's frequency on the list and detail", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client, [ORIGINAL, COPY]);
    mockPost.mockResolvedValue({ id: 96, duplicateOfId: 95 });
    const { useMarkDuplicate } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useMarkDuplicate(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: 96, duplicateOfId: 95 });
    });
    expect(listRow(client, 96)?.duplicateOfId).toBe(95);
    expect(listRow(client, 95)?.duplicateCount).toBe(1);
    expect(detail(client, 95)?.duplicateCount).toBe(1);
  });

  it("clears the mark and lowers the original's frequency on unmark", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client, [{ ...ORIGINAL, duplicateCount: 1 }, { ...COPY, duplicateOfId: 95 }]);
    mockPost.mockResolvedValue({ id: 96 });
    const { useUnmarkDuplicate } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useUnmarkDuplicate(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: 96 });
    });
    expect(listRow(client, 96)?.duplicateOfId).toBeNull();
    expect(listRow(client, 95)?.duplicateCount).toBe(0);
    expect(detail(client, 95)?.duplicateCount).toBe(0);
  });

  it("raises the product overview feedback count without refetching the summary", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    const summaryKey = buildWorkQueryKeys.projects.managedProducts.summary(39);
    client.setQueryData(summaryKey, {
      evidence: { feedbackCount: 4, feedbackLast30d: 2, themedCount: 1, latestFeedbackAt: null },
    });
    mockPost.mockResolvedValue({ submissionId: 101, widgetId: 7, widgetCreated: false });
    const { useCaptureSubmission } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useCaptureSubmission(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({
        managedProductId: 39,
        message: "QA BV cache count",
        sourceChannel: "manual",
        type: "idea",
        consentStatus: "unknown",
      });
    });
    expect(client.getQueryData<{ evidence: { feedbackCount: number; feedbackLast30d: number; themedCount: number; latestFeedbackAt: string | null } }>(summaryKey)?.evidence).toMatchObject({
      feedbackCount: 5,
      feedbackLast30d: 3,
      themedCount: 1,
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("leaves the list untouched when the write fails", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client, [ORIGINAL, COPY]);
    mockPost.mockRejectedValue(new Error("Server error"));
    const { useMarkDuplicate } = await import("./use-feedbucket-submissions");
    const { result } = renderHook(() => useMarkDuplicate(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ submissionId: 96, duplicateOfId: 95 }).catch(() => undefined);
    });
    expect(listRow(client, 96)?.duplicateOfId).toBeNull();
    expect(listRow(client, 95)?.duplicateCount).toBe(0);
  });
});
