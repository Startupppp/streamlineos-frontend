import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarBookingResources, useCreateInventoryCalendarEquipment, useInventoryCalendarEquipment, usePendingCalendarBookingAllocations, useResolveCalendarBookingAllocation } from "./booking-resources";

const get = jest.fn();
const put = jest.fn();
const post = jest.fn();
let accessSnapshot: { isOrgOwner: boolean; scopes: Record<string, "all"> } | undefined;

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: accessSnapshot, isError: false, refetch: async () => ({ data: accessSnapshot }) }),
  useCan: (permission: string) => Boolean(accessSnapshot?.scopes[permission]),
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: Boolean(accessSnapshot?.scopes[permission]),
    denied: Boolean(accessSnapshot) && !accessSnapshot?.scopes[permission],
    pending: !accessSnapshot,
    unavailable: false,
  }),
}));

jest.mock("./booking-rules", () => ({
  useBookingScope: () => ({ orgId: "org-1", userId: "user-1", membershipId: 7, accessVersion: 1, canRead: Boolean(accessSnapshot?.scopes["calendar:read"]) }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args), put: (...args: unknown[]) => put(...args), post: (...args: unknown[]) => post(...args) },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  get.mockReset().mockResolvedValue({ items: [], nextCursor: null });
  put.mockReset().mockResolvedValue({});
  post.mockReset().mockResolvedValue({ id: 27 });
  accessSnapshot = undefined;
});

it("creates Inventory-owned equipment through the Calendar equipment contract", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "inventory:warehouses:manage": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result } = renderHook(() => useCreateInventoryCalendarEquipment(), { wrapper: wrapper(client) });

  await act(async () => {
    await result.current.mutateAsync({ warehouseId: 4, name: "QA camera", location: "Studio", capacity: 1 });
  });
  expect(post).toHaveBeenCalledWith("/inventory/calendar-equipment", { warehouseId: 4, name: "QA camera", location: "Studio", capacity: 1 }, undefined, expect.anything());
});

it("allows an Inventory manager without Calendar read to load and resolve resource approvals", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "inventory:warehouses:manage": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result } = renderHook(() => ({ pending: usePendingCalendarBookingAllocations(), resolve: useResolveCalendarBookingAllocation("booking-1") }), { wrapper: wrapper(client) });

  await waitFor(() => expect(get).toHaveBeenCalledWith("/calendar/resources/pending-allocation-pages", undefined, expect.anything(), expect.anything()));
  expect(result.current.pending.access.allowed).toBe(true);
  await act(async () => {
    await result.current.resolve.mutateAsync({ resourceId: 3, expectedVersion: 2, outcome: "approved", ownerReceiptId: "receipt-1" });
  });
  expect(put).toHaveBeenCalledWith("/calendar/resources/bookings/booking-1/allocations/3", expect.objectContaining({ ownerReceiptId: "receipt-1" }), undefined, expect.anything());
});

it("reloads an empty approval queue when an owner returns after an external booking", async () => {
  accessSnapshot = { isOrgOwner: true, scopes: { "calendar:admin:manage": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = renderHook(() => usePendingCalendarBookingAllocations(), { wrapper: wrapper(client) });
  await waitFor(() => expect(first.result.current.data?.items).toEqual([]));
  first.unmount();

  const allocation = {
    bookingId: "booking-qa",
    resourceId: 1,
    resourceName: "Calendar QA room",
    ownership: "calendar",
    startAt: "2026-10-22T05:30:00.000Z",
    endAt: "2026-10-22T06:00:00.000Z",
    state: "pending",
    reasonCode: "resource_approval_pending",
    version: 1,
    canApprove: true,
    approvalReceiptId: "calendar:1:1",
  };
  get.mockResolvedValue({ items: [allocation], nextCursor: null });
  const second = renderHook(() => usePendingCalendarBookingAllocations(), { wrapper: wrapper(client) });
  await waitFor(() => expect(second.result.current.data?.items).toEqual([allocation]));
  expect(get).toHaveBeenCalledTimes(2);
  second.unmount();
});

it("refreshes a visible empty approval queue after a guest booking changes it", async () => {
  accessSnapshot = { isOrgOwner: true, scopes: { "calendar:admin:manage": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const hook = renderHook(() => usePendingCalendarBookingAllocations(), { wrapper: wrapper(client) });
  await waitFor(() => expect(hook.result.current.data?.items).toEqual([]));

  get.mockResolvedValue({ items: [{ bookingId: "booking-qa" }], nextCursor: null });
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  await waitFor(() => expect(hook.result.current.data?.items).toHaveLength(1));
  expect(get).toHaveBeenCalledTimes(2);
  hook.unmount();
  focusManager.setFocused(undefined);
});

it("does not expose the approval endpoint or mutation to a Calendar reader", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result } = renderHook(() => ({ pending: usePendingCalendarBookingAllocations(), resolve: useResolveCalendarBookingAllocation("booking-1") }), { wrapper: wrapper(client) });

  expect(result.current.pending.access.denied).toBe(true);
  expect(get).not.toHaveBeenCalled();
  await expect(result.current.resolve.mutateAsync({ resourceId: 3, expectedVersion: 2, outcome: "approved", ownerReceiptId: "receipt-1" })).rejects.toThrow("Missing permission");
  expect(put).not.toHaveBeenCalled();
});

it("requests the selected Inventory equipment catalog page", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "inventory:warehouses:read": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  renderHook(() => useInventoryCalendarEquipment(12), { wrapper: wrapper(client) });
  await waitFor(() => expect(get).toHaveBeenCalledWith(
    "/inventory/calendar-equipment",
    { limit: 50, cursor: 12 },
    expect.anything(),
    expect.anything(),
  ));
});

it("requests the selected Calendar resource catalog page", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  renderHook(() => useCalendarBookingResources("42"), { wrapper: wrapper(client) });

  await waitFor(() => expect(get).toHaveBeenCalledWith(
    "/calendar/resources",
    { limit: 50, cursor: "42" },
    expect.anything(),
    expect.anything(),
  ));
});
