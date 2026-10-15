import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePendingCalendarBookingAllocations, useResolveCalendarBookingAllocation } from "./booking-resources";

const get = jest.fn();
const put = jest.fn();
let accessSnapshot: { isOrgOwner: boolean; scopes: Record<string, "all"> } | undefined;

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: accessSnapshot, isError: false, refetch: async () => ({ data: accessSnapshot }) }),
}));

jest.mock("./booking-rules", () => ({
  useBookingScope: () => ({ orgId: "org-1", userId: "user-1", membershipId: 7, accessVersion: 1, canRead: Boolean(accessSnapshot?.scopes["calendar:read"]) }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args), put: (...args: unknown[]) => put(...args) },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  get.mockReset().mockResolvedValue({ items: [], nextCursor: null });
  put.mockReset().mockResolvedValue({});
  accessSnapshot = undefined;
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

it("does not expose the approval endpoint or mutation to a Calendar reader", async () => {
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result } = renderHook(() => ({ pending: usePendingCalendarBookingAllocations(), resolve: useResolveCalendarBookingAllocation("booking-1") }), { wrapper: wrapper(client) });

  expect(result.current.pending.access.denied).toBe(true);
  expect(get).not.toHaveBeenCalled();
  await expect(result.current.resolve.mutateAsync({ resourceId: 3, expectedVersion: 2, outcome: "approved", ownerReceiptId: "receipt-1" })).rejects.toThrow("Missing permission");
  expect(put).not.toHaveBeenCalled();
});
