import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useUpdateTicket } from "./ticket-update-mutation";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";

const mockResolveTicketVersions = jest.fn(() => ({
  versions: { "7": 1 },
  missingTicketIds: [],
}));

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true }, refetch: jest.fn() }),
}));

jest.mock("@/lib/rbac/permission-gate", () => ({
  grantsPermission: () => true,
}));

jest.mock("@/hooks/api/build/ticket-cache", () => ({
  patchTicketCollections: jest.fn(() => ({})),
  patchAllWorkCollections: jest.fn(() => []),
  restoreTicketCollections: jest.fn(),
  restoreAllWorkCollections: jest.fn(),
  revalidateAllWorkCollections: jest.fn(),
  rollbackTicketFields: jest.fn((current: unknown) => current),
  ticketRollback: jest.fn(() => (t: unknown) => t),
  resolveTicketVersions: (...args: unknown[]) => mockResolveTicketVersions(...args),
  resolveTicketStatus: jest.fn(() => undefined),
}));

jest.mock("@/hooks/api/build/ticket-cache-invalidation", () => ({
  invalidateTicketUpdateViews: jest.fn(),
}));

jest.mock("@/hooks/api/build/build-tickets-subresource-schema", () => ({
  ticketUpdateRequestContract: { parse: jest.fn() },
  ticketUpdateResultContract: { parse: jest.fn((x: unknown) => x) },
}));

const PATCH_RESPONSE = { updated: true, updatedAt: "2026-01-01T00:00:00Z", version: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveTicketVersions.mockReset().mockReturnValue({
    versions: { "7": 1 },
    missingTicketIds: [],
  });
});

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

it("invalidates the bugs.detail query when the mutation settles after a type change to BUG, so TicketQaEvidence does not stay blank", async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");

  jest.mocked(apiClient.patch).mockResolvedValueOnce(PATCH_RESPONSE);

  const { result } = renderHook(() => useUpdateTicket(40), {
    wrapper: makeWrapper(client),
  });

  await act(async () => {
    result.current.mutate({ ticketId: 7, version: 1, type: "BUG" });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const bugsDetailKey = buildWorkQueryKeys.projects.bugs.detail(40, 7);
  expect(invalidate).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: bugsDetailKey }),
  );

  client.clear();
});

it("does not invalidate bugs.detail when the mutation updates a field other than type", async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");

  jest.mocked(apiClient.patch).mockResolvedValueOnce(PATCH_RESPONSE);

  const { result } = renderHook(() => useUpdateTicket(40), {
    wrapper: makeWrapper(client),
  });

  await act(async () => {
    result.current.mutate({ ticketId: 7, version: 1, status: "DONE" });
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const bugsDetailKey = buildWorkQueryKeys.projects.bugs.detail(40, 7);
  expect(invalidate).not.toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: bugsDetailKey }),
  );

  client.clear();
});

it("serializes rapid edits for one ticket and sends the authoritative version to the next write", async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const first = Promise.withResolvers<typeof PATCH_RESPONSE>();
  mockResolveTicketVersions
    .mockReturnValueOnce({ versions: { "7": 1 }, missingTicketIds: [] })
    .mockReturnValueOnce({ versions: { "7": 2 }, missingTicketIds: [] });
  jest.mocked(apiClient.patch)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ ...PATCH_RESPONSE, version: 3 });

  const firstHook = renderHook(() => useUpdateTicket(40), {
    wrapper: makeWrapper(client),
  });
  const secondHook = renderHook(() => useUpdateTicket(40), {
    wrapper: makeWrapper(client),
  });

  let firstWrite: Promise<unknown> = Promise.resolve();
  let secondWrite: Promise<unknown> = Promise.resolve();
  act(() => {
    firstWrite = firstHook.result.current.mutateAsync({ ticketId: 7, version: 1, priority: "HIGH" });
    secondWrite = secondHook.result.current.mutateAsync({ ticketId: 7, version: 1, dueDate: "2026-01-02" });
  });

  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
  first.resolve(PATCH_RESPONSE);
  await firstWrite;
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(2));
  expect(apiClient.patch).toHaveBeenLastCalledWith(
    "/build/40/tickets/7",
    expect.objectContaining({ version: 2, dueDate: "2026-01-02" }),
    undefined,
    expect.anything(),
  );
  await secondWrite;
  client.clear();
});
