"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useUpdateKbPage, useSetKbPageVisibility, usePublishKbPage, useArchiveKbPage, useUnarchiveKbPage } from "./pages";
import { ApiError } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useRestoreKbVersion } from "./page-versions";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useUpdateKbPage — optimistic concurrency", () => {
  let client: QueryClient;
  let patchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    patchMock = apiClient.patch;
  });

  it("sends expectedContentRevision to the server when provided", async () => {
    const updatedPage = { id: 1, contentRevision: 4, title: "T", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        expectedContentRevision: 3,
      });
    });

    expect(patchMock).toHaveBeenCalledWith(
      "/kb/pages/1",
      expect.objectContaining({ expectedContentRevision: 3 }),
      undefined,
      expect.any(Function),
    );
  });

  it("resolves with the updated page including the new contentRevision", async () => {
    const updatedPage = { id: 1, contentRevision: 4, title: "T", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        expectedContentRevision: 3,
      });
    });

    expect((resolved as { contentRevision: number }).contentRevision).toBe(4);
  });

  it("surfaces a 409 conflict error and does not swallow it", async () => {
    const conflictErr = new ApiError(
      "Page was modified by another editor.",
      409,
      "STALE_REVISION",
    );
    patchMock.mockRejectedValueOnce(conflictErr);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    let caught: unknown;
    await act(async () => {
      caught = await result.current
        .mutateAsync({ pageId: 1, content: { type: "doc" }, expectedContentRevision: 2 })
        .catch((e: unknown) => e);
    });

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
  });

  it("patches the cached page with the revision the save returned instead of refetching it", async () => {
    const cached = {
      id: 1,
      contentRevision: 3,
      title: "Onboarding",
      orgId: "o",
      ancestors: [{ id: 9, title: "Handbook" }],
      isFavorite: true,
    };
    client.setQueryData(knowledgeAndSurveysQueryKeys.kb.page(1), cached);
    patchMock.mockResolvedValueOnce({ ...cached, contentRevision: 4, ancestors: undefined, isFavorite: undefined });

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        expectedContentRevision: 3,
      });
    });

    const after = client.getQueryData(knowledgeAndSurveysQueryKeys.kb.page(1));
    expect(after).toMatchObject({ contentRevision: 4 });
    expect(client.getQueryState(knowledgeAndSurveysQueryKeys.kb.page(1))?.isInvalidated).toBe(false);
  });

  it("does not refetch the tree for a body-only save — the tree renders no body", async () => {
    const invalidate = jest.spyOn(client, "invalidateQueries");
    patchMock.mockResolvedValueOnce({ id: 1, contentRevision: 4, title: "T", orgId: "o" });

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        contentText: "typed",
        expectedContentRevision: 3,
      });
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does refetch the tree for a rename — the tree renders the title", async () => {
    const invalidate = jest.spyOn(client, "invalidateQueries");
    patchMock.mockResolvedValueOnce({ id: 1, contentRevision: 3, title: "Renamed", orgId: "o" });

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ pageId: 1, title: "Renamed", expectedContentRevision: 2 });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree(),
    });
  });

  it("refetches recent and favorite cards after a cover change", async () => {
    const invalidate = jest.spyOn(client, "invalidateQueries");
    patchMock.mockResolvedValueOnce({
      id: 1,
      contentRevision: 3,
      title: "T",
      coverImage: "gradient:ocean",
      orgId: "o",
    });

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ pageId: 1, coverImage: "gradient:ocean" });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: knowledgeAndSurveysQueryKeys.kb.pagesRecent(),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: knowledgeAndSurveysQueryKeys.kb.pagesFavorites(),
    });
  });

  it("always carries the precondition — an unguarded page write is not expressible", async () => {
    const updatedPage = { id: 2, contentRevision: 4, title: "U", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 2,
        title: "Updated",
        expectedContentRevision: 3,
      });
    });

    expect(patchMock).toHaveBeenCalledWith(
      "/kb/pages/2",
      expect.objectContaining({ expectedContentRevision: 3 }),
      undefined,
      expect.any(Function),
    );
  });
});

describe("KB page visibility and status revision requests", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends the visibility precondition", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { patch: jest.Mock } };
    apiClient.patch.mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useSetKbPageVisibility(), { wrapper: wrapper(makeClient()) });
    await act(async () => { await result.current.mutateAsync({ pageId: 1, visibility: "public", expectedContentRevision: 4 }); });
    expect(apiClient.patch).toHaveBeenCalledWith("/kb/pages/1/visibility", { visibility: "public", expectedContentRevision: 4 }, undefined, expect.any(Function));
  });

  it("writes the saved visibility into the open page at once, so the share badge does not lag behind a refetch", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { patch: jest.Mock } };
    apiClient.patch.mockResolvedValueOnce({ id: 1, visibility: "private", publicToken: null, contentRevision: 5 });
    const client = makeClient();
    const key = knowledgeAndSurveysQueryKeys.kb.page(1);
    client.setQueryData(key, { id: 1, visibility: "public", publicToken: "tok", contentRevision: 4, title: "T" });
    const { result } = renderHook(() => useSetKbPageVisibility(), { wrapper: wrapper(client) });
    await act(async () => { await result.current.mutateAsync({ pageId: 1, visibility: "private", expectedContentRevision: 4 }); });
    expect(client.getQueryData(key)).toEqual({ id: 1, visibility: "private", publicToken: null, contentRevision: 5, title: "T" });
  });

  it.each([
    ["publish", usePublishKbPage],
    ["archive", useArchiveKbPage],
    ["unarchive", useUnarchiveKbPage],
  ] as const)("sends the %s precondition", async (action, hook) => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };
    apiClient.post.mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => hook(), { wrapper: wrapper(makeClient()) });
    await act(async () => { await result.current.mutateAsync({ pageId: 1, expectedContentRevision: 4 }); });
    expect(apiClient.post).toHaveBeenCalledWith(`/kb/pages/1/${action}`, { expectedContentRevision: 4 }, action === "publish" ? expect.anything() : undefined, expect.any(Function));
  });

  it("reuses the publish idempotency key for the same revision after a transport failure", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };
    apiClient.post.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => usePublishKbPage(), { wrapper: wrapper(makeClient()) });
    const input = { pageId: 1, expectedContentRevision: 4 };
    await act(async () => { await result.current.mutateAsync(input).catch(() => undefined); });
    await act(async () => { await result.current.mutateAsync(input); });
    expect(apiClient.post.mock.calls[0]?.[2].headers["Idempotency-Key"]).toBeTruthy();
    expect(apiClient.post.mock.calls[1]?.[2].headers["Idempotency-Key"]).toBe(apiClient.post.mock.calls[0]?.[2].headers["Idempotency-Key"]);
  });
});

describe("KB page version restore request", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends the observed revision and reuses its idempotency key across a failed retry", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };
    apiClient.post.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useRestoreKbVersion(), { wrapper: wrapper(makeClient()) });
    const input = { pageId: 1, versionNumber: 2, expectedContentRevision: 4 };
    await act(async () => { await result.current.mutateAsync(input).catch(() => undefined); });
    await act(async () => { await result.current.mutateAsync(input); });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, "/kb/pages/1/versions/2/restore", { expectedContentRevision: 4 }, expect.anything(), expect.any(Function));
    expect(apiClient.post.mock.calls[0]?.[2].headers["Idempotency-Key"]).toBeTruthy();
    expect(apiClient.post.mock.calls[1]?.[2].headers["Idempotency-Key"]).toBe(apiClient.post.mock.calls[0]?.[2].headers["Idempotency-Key"]);
  });

  it("uses a fresh idempotency key for a new restore intent", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as { apiClient: { post: jest.Mock } };
    apiClient.post.mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useRestoreKbVersion(), { wrapper: wrapper(makeClient()) });
    await act(async () => { await result.current.mutateAsync({ pageId: 1, versionNumber: 2, expectedContentRevision: 4 }); });
    await act(async () => { await result.current.mutateAsync({ pageId: 1, versionNumber: 2, expectedContentRevision: 4 }); });
    expect(apiClient.post.mock.calls[1]?.[2].headers["Idempotency-Key"]).not.toBe(apiClient.post.mock.calls[0]?.[2].headers["Idempotency-Key"]);
  });
});
