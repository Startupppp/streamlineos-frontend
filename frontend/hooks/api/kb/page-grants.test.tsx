import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { ApiContractError } from "@/lib/api-envelope";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";

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
  client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary }, mutations: { retry: false } } });
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
    expect(result.current.data).toEqual([grant]);
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.pageGrants(12))).toEqual({
      pages: [{ data: [grant], pagination }],
      pageParams: [undefined],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/pages/12/grants");
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("limit=100");
  });

  it("accepts a manage-level grant returned by the backend list", async () => {
    const manageGrant = { ...grant, access: "manage" };
    fetchMock.mockResolvedValue(response({ data: [manageGrant], pagination }));
    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([manageGrant]);
  });

  it("follows the backend cursor and retains both raw pages", async () => {
    const secondGrant = { ...grant, id: 6, granteeName: "Grace" };
    fetchMock
      .mockResolvedValueOnce(response({
        data: [grant],
        pagination: { limit: 50, hasMore: true, nextCursor: "next-page" },
      }))
      .mockResolvedValueOnce(response({ data: [secondGrant], pagination }));

    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data).toEqual([grant, secondGrant]));
    expect(result.current.hasNextPage).toBe(false);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/kb/pages/12/grants?cursor=next-page");
    expect(client.getQueryData(knowledgeAndSurveysQueryKeys.kb.pageGrants(12))).toEqual({
      pages: [
        { data: [grant], pagination: { limit: 50, hasMore: true, nextCursor: "next-page" } },
        { data: [secondGrant], pagination },
      ],
      pageParams: [undefined, "next-page"],
    });
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

  it("accepts a created manage-level grant through the strict response parser", async () => {
    const manageGrant = { ...grant, access: "manage" };
    fetchMock.mockResolvedValue(response(manageGrant));
    const { result } = renderHook(() => useCreateKbPageGrant(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ pageId: 12, membershipId: 30, access: "manage" })).resolves.toEqual(manageGrant);
    });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ membershipId: 30, access: "manage" }));
  });

  it("rejects a list item missing the grantee projection", async () => {
    const incomplete = Object.fromEntries(Object.entries(grant).filter(([key]) => key !== "granteeEmail"));
    fetchMock.mockResolvedValue(response({ data: [incomplete], pagination }));
    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
  });

  it("keeps a first-read grants projection error inline and recovers after retry", async () => {
    const incomplete = Object.fromEntries(Object.entries(grant).filter(([key]) => key !== "granteeEmail"));
    fetchMock.mockResolvedValueOnce(response({ data: [incomplete], pagination }));
    fetchMock.mockResolvedValueOnce(response({ data: [grant], pagination }));
    const { result } = renderHook(() => useKbPageGrants(12), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiContractError);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toEqual([grant]));
  });

  it("rejects an unknown access level instead of weakening the grant contract", async () => {
    fetchMock.mockResolvedValue(response({ data: [{ ...grant, access: "admin" }], pagination }));
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
