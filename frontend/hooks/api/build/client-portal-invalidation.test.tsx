"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  ...jest.requireActual<typeof import("@/lib/api-envelope")>("@/lib/api-envelope"),
  lazyContract: jest.fn((fn: () => unknown) => fn),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = jest.requireActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
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

  it("infinite tickets key is prefixed by visibility(42) so mutations invalidate both the base and infinite queries", () => {
    const baseKey = buildWorkQueryKeys.projects.clientPortal.visibility(42) as readonly unknown[];
    const infiniteKey = [...baseKey, "tickets-infinite"] as const;
    expect(infiniteKey.slice(0, baseKey.length)).toEqual(Array.from(baseKey));
  });

  it("infinite milestones key is prefixed by visibility(42) so mutations invalidate both the base and infinite queries", () => {
    const baseKey = buildWorkQueryKeys.projects.clientPortal.visibility(42) as readonly unknown[];
    const infiniteKey = [...baseKey, "milestones-infinite"] as const;
    expect(infiniteKey.slice(0, baseKey.length)).toEqual(Array.from(baseKey));
  });

  it("tickets-infinite and milestones-infinite keys are distinct so each tab has an independent cache", () => {
    const baseKey = buildWorkQueryKeys.projects.clientPortal.visibility(42) as readonly unknown[];
    const ticketsKey = [...baseKey, "tickets-infinite"];
    const milestonesKey = [...baseKey, "milestones-infinite"];
    expect(ticketsKey).not.toEqual(milestonesKey);
  });
});

describe("SPEC 1 — ticket visibility invalidation on settled (Requirement C5)", () => {
  it.each([
    [new ApiError("Conflict", 409), "This action conflicts with existing data."],
    [new ApiError("Forbidden", 403), "You don't have permission for this action."],
    [new TypeError("Failed to fetch"), "Network error. Check your connection and try again."],
  ])("reports a failed visibility command while retaining cache until both refreshes finish (%s)", async (error, message) => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(apiClient.patch).mockRejectedValueOnce(error);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const ticketKey = buildWorkQueryKeys.projects.ticket(42, 7);
    const visibilityKey = buildWorkQueryKeys.projects.clientPortal.visibility(42);
    const oldTicket = { id: 7, clientVisible: false, version: 3 };
    const oldVisibility = { tickets: [oldTicket] };
    qc.setQueryData(ticketKey, oldTicket);
    qc.setQueryData(visibilityKey, oldVisibility);
    let finishTicket = () => {};
    let finishVisibility = () => {};
    const ticketRefresh = new Promise<void>((resolve) => { finishTicket = resolve; });
    const visibilityRefresh = new Promise<void>((resolve) => { finishVisibility = resolve; });
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries")
      .mockReturnValueOnce(visibilityRefresh).mockReturnValueOnce(ticketRefresh);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useUpdateTicketVisibility } = await import("./client-portal");
    const { result } = renderHook(() => useUpdateTicketVisibility(42), { wrapper });
    await act(async () => {
      result.current.mutate({ ticketId: 7, clientVisible: true, version: 3 });
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    expect(qc.getQueryData(ticketKey)).toEqual(oldTicket);
    expect(qc.getQueryData(visibilityKey)).toEqual(oldVisibility);
    expect(result.current.isPending).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ticketKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: visibilityKey });
    await act(async () => { finishTicket(); });
    expect(result.current.isPending).toBe(true);
    await act(async () => { finishVisibility(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(message);
  });

  it.each([false, true])("reconciles visibility and the affected Ticket after a settled patch (failed=%s)", async (failed) => {
    const patchMock = apiClient.patch as jest.Mock;
    if (failed) patchMock.mockRejectedValueOnce(new Error("Visibility conflict"));
    else patchMock.mockResolvedValueOnce({ id: 7, clientVisible: true });
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
      result.current.mutate({ ticketId: 7, clientVisible: true, version: 3 });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(42),
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.ticket(42, 7),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: buildWorkQueryKeys.projects.ticket(42, 8),
    });
  });

  it("useUpdateTicketVisibility sends the row's own version in the body, so the server can compare and swap", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useUpdateTicketVisibility } = await import("./client-portal");
    const { result } = renderHook(() => useUpdateTicketVisibility(42), { wrapper });

    await act(async () => {
      result.current.mutate({ ticketId: 7, clientVisible: true, version: 9 });
      await new Promise((r) => setTimeout(r, 0));
    });

    const body = (apiClient.patch as jest.Mock).mock.calls.at(-1)?.[1];
    expect(body).toEqual({ clientVisible: true, version: 9 });
  });

  it("omits version when the rolling-deploy response did not include it", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ success: true });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useUpdateTicketVisibility } = await import("./client-portal");
    const { result } = renderHook(() => useUpdateTicketVisibility(42), { wrapper });

    await act(async () => {
      result.current.mutate({ ticketId: 7, clientVisible: true });
      await new Promise((r) => setTimeout(r, 0));
    });

    const body = (apiClient.patch as jest.Mock).mock.calls.at(-1)?.[1];
    expect(body).toEqual({ clientVisible: true });
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
