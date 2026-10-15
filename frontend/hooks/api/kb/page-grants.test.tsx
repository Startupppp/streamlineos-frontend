import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { ApiContractError } from "@/lib/api-envelope";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useCreateKbPageGrant, useKbPageGrants } from "./page-grants";

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const pagination = { limit: 100, hasMore: false, nextCursor: null };
const grant = {
  id: 5,
  pageId: 12,
  membershipId: 30,
  role: null,
  access: "edit",
  grantedByMembershipId: 2,
  createdAt: "2026-10-16T00:00:00.000Z",
  revokedAt: null,
  granteeName: "Ada",
  granteeEmail: "ada@example.com",
  granteeImage: null,
};

let client: QueryClient;

function response(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetOutageCircuit();
  clearBackendTokenCache();
  seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

describe("KB page grants through the HTTP parser", () => {
  it("reads the list envelope and retains cursor metadata in the query cache", async () => {
    fetchMock.mockResolvedValue(response({ data: [grant], pagination }));
    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ data: [grant], pagination });
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.pageGrants(12))).toEqual({ data: [grant], pagination });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/pages/12/grants?limit=100");
  });

  it("returns a created grant with the same fields as the list item", async () => {
    fetchMock.mockResolvedValue(response(grant));
    const { result } = renderHook(() => useCreateKbPageGrant(), { wrapper });
    let created: unknown;
    await act(async () => {
      created = await result.current.mutateAsync({ pageId: 12, membershipId: 30, access: "edit" });
    });
    expect(created).toEqual(grant);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ membershipId: 30, access: "edit" }));
  });

  it("rejects a list item missing the grantee projection", async () => {
    const incomplete = Object.fromEntries(Object.entries(grant).filter(([key]) => key !== "granteeEmail"));
    fetchMock.mockResolvedValue(response({ data: [incomplete], pagination }));
    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
  });

  it("rejects a created grant missing its membership projection", async () => {
    const incomplete = Object.fromEntries(Object.entries(grant).filter(([key]) => key !== "membershipId"));
    fetchMock.mockResolvedValue(response(incomplete));
    const { result } = renderHook(() => useCreateKbPageGrant(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ pageId: 12, membershipId: 30, access: "edit" })).rejects.toBeInstanceOf(ApiContractError);
    });
  });
});
