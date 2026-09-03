import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { usePermissionGate } from "@/hooks/api/access";
import { useMyTravelRequests } from "@/hooks/api/hr/travel";
import { useSupportMacros } from "@/hooks/api/support/macros";
import { useSupportSavedViews } from "@/hooks/api/support/views";
import { useUserApiTokens } from "@/hooks/api/user-api-tokens";
import { queryKeys } from "@/lib/query-keys";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: jest.fn(),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(() => ({ mutate: jest.fn() })),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedGate = usePermissionGate as jest.Mock;

function allow(): void {
  mockedGate.mockImplementation((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  }));
}

function deny(): void {
  mockedGate.mockImplementation((permission: string) => ({
    permission,
    allowed: false,
    denied: true,
    pending: false,
  }));
}

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * A read whose backend route carries `@RequirePermission` used to be sent
 * regardless: the caller had no `enabled`, so every page mount fired a request
 * that could only come back 403, and a v5 disabled-vs-empty read is
 * indistinguishable downstream — the screen rendered "none yet" over a
 * permission failure.
 *
 * These four hooks stand for the 105 converted this pass, one per shape:
 * a bare list, a list with query params, one whose route lives under `/me`,
 * and one carrying cursor params.
 */
describe("a permissioned read is not sent when the permission is absent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } });
  });

  const cases: [string, () => unknown, string][] = [
    ["useMyTravelRequests", () => useMyTravelRequests(), "hr:travel:view"],
    ["useSupportMacros", () => useSupportMacros(), "support:macros:view"],
    ["useSupportSavedViews", () => useSupportSavedViews(), "support:tickets:view"],
    ["useUserApiTokens", () => useUserApiTokens({ limit: 20 }), "settings:api-tokens:read"],
  ];

  it.each(cases)("%s sends nothing while denied", async (_name, run) => {
    deny();
    renderHook(run, { wrapper: wrapper() });
    await waitFor(() => expect(mockedGate).toHaveBeenCalled());
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it.each(cases)("%s sends the read once allowed", async (_name, run) => {
    allow();
    renderHook(run, { wrapper: wrapper() });
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
  });

  it.each(cases)("%s asks for exactly the key its backend route enforces", (_name, run, permission) => {
    allow();
    renderHook(run, { wrapper: wrapper() });
    expect(mockedGate).toHaveBeenCalledWith(permission);
  });

  it("carries the gate on the result so a screen can tell denied from empty", async () => {
    deny();
    const { result } = renderHook(() => useMyTravelRequests(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.access).toBeDefined());
    expect(result.current.access.denied).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("BITE PROOF — an ungated useQuery of the same route sends the request while denied", async () => {
    deny();
    renderHook(
      () =>
        useQuery({
          queryKey: queryKeys.hr.travelMine(),
          queryFn: ({ signal }) => apiClient.get("/hr/travel", undefined, signal),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
  });
});
