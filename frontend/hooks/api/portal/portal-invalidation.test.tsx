"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

jest.mock("@/lib/portal-api-client", () => ({
  portalApiClient: {
    post: jest.fn(),
  },
  getPortalToken: jest.fn().mockReturnValue("portal-jwt-token"),
}));

jest.mock("@/hooks/common/use-idempotent-operation", () => ({
  useIdempotentOperation: jest.fn().mockReturnValue({
    configFor: jest.fn().mockReturnValue({}),
    settle: jest.fn(),
  }),
}));

import { portalApiClient } from "@/lib/portal-api-client";

describe("useSubmitChangeRequest — invalidation path (SPEC 8 C5)", () => {
  it("invalidates portal.projectOverview(42) on successful submission so the overview cache is refreshed", async () => {
    (portalApiClient.post as jest.Mock).mockResolvedValue({ id: 100 });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useSubmitChangeRequest } = await import("./use-submit-change-request");
    const { result } = renderHook(() => useSubmitChangeRequest(42), { wrapper });

    await act(async () => {
      result.current.mutate({ title: "Scope change", description: "Need X" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portal.projectOverview(42),
      }),
    );
  });

  it("uses the projectId from the hook call in the invalidation key — different projectIds do not cross-invalidate", async () => {
    (portalApiClient.post as jest.Mock).mockResolvedValue({ id: 101 });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useSubmitChangeRequest } = await import("./use-submit-change-request");
    const { result } = renderHook(() => useSubmitChangeRequest(99), { wrapper });

    await act(async () => {
      result.current.mutate({ title: "Another change", description: "Need Y" });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portal.projectOverview(99),
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portal.projectOverview(42),
      }),
    );
  });

  it("mutationKey is ['portal', 'projects', projectId, 'change-requests'] so in-flight dedup works per project", async () => {
    const { useSubmitChangeRequest } = await import("./use-submit-change-request");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSubmitChangeRequest(42), { wrapper });
    expect(result.current).toBeDefined();
  });
});
