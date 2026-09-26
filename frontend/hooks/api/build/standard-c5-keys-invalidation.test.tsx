"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((fn: () => unknown) => fn),
  applyContract: jest.fn((_, data) => data),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = require("@tanstack/react-query");
      return useMutation(options);
    },
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({ data: null, refetch: jest.fn() }),
}));

import { apiClient } from "@/lib/api-client";

describe("SPEC 2 — change-requests cache keys (Requirement C5)", () => {
  it("list(42) is distinct from list(43) so different projects have isolated cache entries", () => {
    const key42 = buildWorkQueryKeys.projects.changeRequests.list(42);
    const key43 = buildWorkQueryKeys.projects.changeRequests.list(43);
    expect(key42).not.toEqual(key43);
    expect(key42).toContain(42);
    expect(key43).toContain(43);
  });

  it("list(42, filters) is distinct from list(42) so filtered results do not pollute the base cache", () => {
    const baseKey = buildWorkQueryKeys.projects.changeRequests.list(42);
    const filteredKey = buildWorkQueryKeys.projects.changeRequests.list(42, {
      status: "open",
    });
    expect(filteredKey).not.toEqual(baseKey);
    expect(filteredKey.length).toBeGreaterThan(baseKey.length);
  });

  it("list(42) is a prefix of list(42, filters) so invalidating the base flushes all filter variants", () => {
    const base = buildWorkQueryKeys.projects.changeRequests.list(42);
    const filtered = buildWorkQueryKeys.projects.changeRequests.list(42, { impact: "high" });
    expect(Array.from(filtered).slice(0, base.length)).toEqual(Array.from(base));
  });

  it("detail(42, 7) contains both projectId and changeRequestId", () => {
    const key = buildWorkQueryKeys.projects.changeRequests.detail(42, 7);
    expect(key).toContain(42);
    expect(key).toContain(7);
  });

  it("detail(42, 7) is distinct from detail(42, 8)", () => {
    const key7 = buildWorkQueryKeys.projects.changeRequests.detail(42, 7);
    const key8 = buildWorkQueryKeys.projects.changeRequests.detail(42, 8);
    expect(key7).not.toEqual(key8);
  });
});

describe("SPEC 2 — change-requests invalidation on create/delete (Requirement C5)", () => {
  it("useCreateChangeRequest invalidates changeRequests.list(projectId) on success", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 10, title: "New CR" });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useCreateChangeRequest } = await import("./change-requests");
    const { result } = renderHook(() => useCreateChangeRequest(42), { wrapper });

    await act(async () => {
      result.current.mutate({
        title: "Scope change",
        description: "details",
        impact: "medium",
      });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.changeRequests.list(42),
      }),
    );
  });

  it("useDeleteChangeRequest invalidates changeRequests.list(projectId) on success", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useDeleteChangeRequest } = await import("./change-requests");
    const { result } = renderHook(() => useDeleteChangeRequest(42), { wrapper });

    await act(async () => {
      result.current.mutate(7);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.changeRequests.list(42),
      }),
    );
  });

  it("create projectId 99 does not invalidate list(42)", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 11, title: "Another CR" });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useCreateChangeRequest } = await import("./change-requests");
    const { result } = renderHook(() => useCreateChangeRequest(99), { wrapper });

    await act(async () => {
      result.current.mutate({ title: "Scoped CR", description: "d", impact: "low" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.changeRequests.list(99),
      }),
    );
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.changeRequests.list(42),
      }),
    );
  });
});

describe("SPEC 4 — updates cache keys (Requirement C5)", () => {
  it("updates.list(42) is distinct from updates.list(43)", () => {
    const key42 = buildWorkQueryKeys.projects.updates.list(42);
    const key43 = buildWorkQueryKeys.projects.updates.list(43);
    expect(key42).not.toEqual(key43);
    expect(key42).toContain(42);
    expect(key43).toContain(43);
  });

  it("updates.list(42, filters) is distinct from list(42) so filter variants are partitioned", () => {
    const baseKey = buildWorkQueryKeys.projects.updates.list(42);
    const filteredKey = buildWorkQueryKeys.projects.updates.list(42, { authorId: "u1" });
    expect(filteredKey).not.toEqual(baseKey);
    expect(filteredKey.length).toBeGreaterThan(baseKey.length);
  });

  it("updates.list(42) is a prefix of the filtered key so invalidating the base flushes all filter variants", () => {
    const base = buildWorkQueryKeys.projects.updates.list(42);
    const filtered = buildWorkQueryKeys.projects.updates.list(42, { from: "2025-01-01" });
    expect(Array.from(filtered).slice(0, base.length)).toEqual(Array.from(base));
  });
});

describe("SPEC 4 — updates invalidation on create/delete (Requirement C5)", () => {
  it("useCreateProjectUpdate invalidates updates.list(projectId) on success", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ updateId: 20 });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useCreateProjectUpdate } = await import("./project-updates");
    const { result } = renderHook(() => useCreateProjectUpdate(42), { wrapper });

    await act(async () => {
      result.current.mutate({ body: "Milestone reached" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.updates.list(42),
      }),
    );
  });

  it("useDeleteProjectUpdate invalidates updates.list(projectId) on success", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useDeleteProjectUpdate } = await import("./project-updates");
    const { result } = renderHook(() => useDeleteProjectUpdate(42), { wrapper });

    await act(async () => {
      result.current.mutate(1);
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.updates.list(42),
      }),
    );
  });

  it("delete invalidation uses base key (no filter arg) so all filter variants are flushed at once", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useDeleteProjectUpdate } = await import("./project-updates");
    const { result } = renderHook(() => useDeleteProjectUpdate(42), { wrapper });

    await act(async () => {
      result.current.mutate(2);
      await new Promise((r) => setTimeout(r, 0));
    });

    const calls = (spy.mock.calls as Array<[{ queryKey: unknown[] }]>).map(
      (c) => c[0].queryKey,
    );
    const invalidatedKey = calls.find(
      (k) => JSON.stringify(k) === JSON.stringify(buildWorkQueryKeys.projects.updates.list(42)),
    );
    expect(invalidatedKey).toBeDefined();
    expect(invalidatedKey).not.toContain(expect.any(Object));
  });
});
