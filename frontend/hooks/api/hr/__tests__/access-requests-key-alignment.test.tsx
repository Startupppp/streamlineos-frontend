import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import {
  useAccessRequests,
  useCreateAccessRequest,
  useUpdateAccessRequest,
} from "@/hooks/api/hr/access-requests";

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: jest.fn().mockReturnValue({ allowed: true, denied: false, pending: false }),
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({ data: { permissions: [] }, refetch: jest.fn() }),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

const ROW = {
  id: "ar-1",
  orgId: "org-1",
  employeeId: "emp-1",
  systemName: "Jira",
  accessLevel: "read",
  status: "requested",
  grantedBy: null,
  revokedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue([ROW]);
  mockedPost.mockResolvedValue(ROW);
  mockedPatch.mockResolvedValue(ROW);
});

describe("access-requests cache keys", () => {
  it("refetches the employee-filtered read after a create, so the invalidation is a real prefix of the read key", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => ({
        list: useAccessRequests("emp-1"),
        create: useCreateAccessRequest(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.create.mutateAsync({
        employeeId: "emp-1",
        systemName: "Jira",
        accessLevel: "read",
      });
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it("refetches the unfiltered read after an update, so both list variants stay consistent", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(
      () => ({
        list: useAccessRequests(),
        update: useUpdateAccessRequest(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.update.mutateAsync({
        accessRequestId: "ar-1",
        status: "granted",
      });
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });
});
