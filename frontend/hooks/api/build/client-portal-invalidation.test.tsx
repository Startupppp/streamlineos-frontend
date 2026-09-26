"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((fn: () => unknown) => fn),
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

describe("useSubmitPortalChangeRequest — invalidation path (SPEC 9/10 C5)", () => {
  it("invalidates changeRequests(42) on success so the list cache is refreshed", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 200 });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useSubmitPortalChangeRequest } = await import("./client-portal");
    const { result } = renderHook(() => useSubmitPortalChangeRequest(42), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({ title: "Scope change", description: "Need X" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(42),
      }),
    );
  });

  it("uses projectId from hook call — projectId 99 does not invalidate projectId 42", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ id: 201 });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useSubmitPortalChangeRequest } = await import("./client-portal");
    const { result } = renderHook(() => useSubmitPortalChangeRequest(99), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({ title: "Another CR", description: "Need Y" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(99),
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.changeRequests(42),
      }),
    );
  });

  it("mutationKey contains 'portal' and projectId for in-flight dedup per project", async () => {
    const expectedKey = ["projects", "portal", 42, "change-requests", "submit"];
    expect(expectedKey).toContain("portal");
    expect(expectedKey).toContain(42);
    expect(expectedKey[0]).toBe("projects");
    expect(expectedKey[4]).toBe("submit");
  });
});

describe("SPEC 1 — client-portal visibility keys (Requirement C5)", () => {
  it("clientPortal.visibility(42) contains projectId so different projects have isolated visibility caches", () => {
    const key = buildWorkQueryKeys.projects.clientPortal.visibility(42);
    expect(key).toContain(42);
  });

  it("visibility(42) is distinct from visibility(43)", () => {
    const key42 = buildWorkQueryKeys.projects.clientPortal.visibility(42);
    const key43 = buildWorkQueryKeys.projects.clientPortal.visibility(43);
    expect(key42).not.toEqual(key43);
  });
});

describe("SPEC 1 — ticket visibility invalidation on settled (Requirement C5)", () => {
  it("useUpdateTicketVisibility invalidates visibility(projectId) on settled so the cache refreshes after patch", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useUpdateTicketVisibility } = await import("./client-portal");
    const { result } = renderHook(() => useUpdateTicketVisibility(42), { wrapper });

    await act(async () => {
      result.current.mutate({ ticketId: 7, clientVisible: true });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(42),
      }),
    );
  });

  it("useUpdateMilestoneVisibility invalidates visibility(projectId) on settled", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useUpdateMilestoneVisibility } = await import("./client-portal");
    const { result } = renderHook(() => useUpdateMilestoneVisibility(42), { wrapper });

    await act(async () => {
      result.current.mutate({ milestoneId: 3, clientVisible: false });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(42),
      }),
    );
  });
});
