import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useBulkInviteUsers,
  useCancelInvitation,
  useInviteUser,
  useResendInvite,
} from "./users";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: () => true,
}));

const mockedPost = apiClient.post as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

function createClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function expectDirectoryPeopleInvalidated(
  invalidateSpy: jest.SpyInstance,
): void {
  const invalidatedKeys = invalidateSpy.mock.calls.map(
    (call) => call[0]?.queryKey as readonly unknown[],
  );
  expect(invalidatedKeys).toContainEqual(queryKeys.directory.peopleAll);
}

describe("invitation directory cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ success: true });
    mockedDelete.mockResolvedValue({ success: true });
  });

  it("refreshes person access after a single invitation", async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useInviteUser(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "jane@example.com",
        role: "MEMBER",
      });
    });

    expectDirectoryPeopleInvalidated(invalidateSpy);
    expect(mockedPost.mock.calls[0]?.[2]?.headers?.["Idempotency-Key"]).toEqual(
      expect.any(String),
    );
    expect(
      invalidateSpy.mock.calls.some(
        (call) =>
          JSON.stringify(call[0]?.queryKey) ===
          JSON.stringify(queryKeys.users.all),
      ),
    ).toBe(false);
  });

  it("refreshes person access after bulk invitations", async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useBulkInviteUsers(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        emails: ["jane@example.com", "sam@example.com"],
        role: "MEMBER",
      });
    });

    expectDirectoryPeopleInvalidated(invalidateSpy);
  });

  it("refreshes person access after resending an invitation", async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useResendInvite(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync("invite-1");
    });

    expectDirectoryPeopleInvalidated(invalidateSpy);
  });

  it("refreshes person access after cancelling an invitation", async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCancelInvitation(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync("invite-1");
    });

    expectDirectoryPeopleInvalidated(invalidateSpy);
  });
});
