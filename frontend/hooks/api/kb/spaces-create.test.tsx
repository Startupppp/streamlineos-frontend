import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useCreateKbSpace } from "./spaces";

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const input = { name: "Operations", audience: "internal" as const };
const space = {
  id: 19,
  orgId: "org-1",
  name: "Operations",
  slug: "operations",
  description: null,
  audience: "internal",
  icon: null,
  branding: null,
  isPublicHelpCenter: false,
  createdByMembershipId: 5,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
  deletedAt: null,
  type: "team",
  color: null,
  defaultVisibility: "private",
  owningTeamId: null,
  archivedAt: null,
  ownerName: "Author",
};

function response() {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data: space }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetOutageCircuit();
  clearBackendTokenCache();
  const token = "header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature";
  seedBackendToken(token);
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
});

it("reuses one space create key after an interrupted response and rotates it after success", async () => {
  fetchMock.mockRejectedValueOnce(new Error("network interrupted"));
  fetchMock.mockResolvedValue(response());
  const { result } = renderHook(() => useCreateKbSpace(), { wrapper });

  await act(async () => {
    await expect(result.current.mutateAsync(input)).rejects.toThrow("Network error");
  });
  resetOutageCircuit();
  await act(async () => {
    await expect(result.current.mutateAsync(input)).resolves.toEqual(space);
    await expect(result.current.mutateAsync(input)).resolves.toEqual(space);
  });

  const keys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("Idempotency-Key"));
  expect(keys[0]).toBeTruthy();
  expect(keys[0]).toEqual(keys[1]);
  expect(keys[2]).not.toEqual(keys[1]);
  expect(fetchMock.mock.calls.every((call) => call[1]?.body === JSON.stringify(input))).toBe(true);
});
