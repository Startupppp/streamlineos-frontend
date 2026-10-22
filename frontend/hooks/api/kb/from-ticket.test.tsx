import { readFileSync } from "node:fs";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { backendAvailable, backendPath } from "@/test-utils/backend-repo";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { clearBackendTokenCache, seedBackendToken } from "@/lib/api-client";
import { resetOutageCircuit } from "@/lib/api-outage-circuit";
import { ApiContractError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useCreateKbArticleFromTicket } from "./from-ticket";

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const ARTICLE = {
  id: 91,
  orgId: "org-1",
  categoryId: null,
  spaceId: 4,
  ownerMembershipId: 12,
  title: "Resetting a locked account",
  slug: "resetting-a-locked-account",
  excerpt: null,
  content: "## Problem\n\n1. Do the thing",
  contentText: "Problem Do the thing",
  status: "draft" as const,
  visibility: "internal" as const,
  authorId: "user-1",
  views: 0,
  helpfulCount: 0,
  notHelpfulCount: 0,
  seoTitle: null,
  seoDescription: null,
  reviewIntervalDays: null,
  lastVerifiedAt: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
  aclRevision: 1,
  contentRevision: 1,
  tags: ["support", "accounts"],
};

function response(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data }),
  };
}

function backendArticleFields(): string[] {
  const source = readFileSync(
    backendPath("src", "modules", "kb", "help-centre", "dto", "kb-helpcenter-response.schemas.ts"),
    "utf8",
  );
  const start = source.indexOf("export const kbArticleSchema = z.object({");
  const end = source.indexOf("\n});", start);
  const block = source.slice(start, end);
  return [...block.matchAll(/^ {2}(\w+):/gm)].map((match) => match[1]).concat("tags");
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

describe("POST /kb/articles/from-ticket/:ticketId through the HTTP parser", () => {
  it("reads the backend repository for the response field oracle", () => {
    expect(backendAvailable).toBe(true);
    expect(Object.keys(ARTICLE).sort()).toEqual(backendArticleFields().sort());
  });

  it("returns the created article from a successful envelope with all article fields", async () => {
    fetchMock.mockResolvedValue(response(ARTICLE));
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
    });
    expect(resolved).toEqual(ARTICLE);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/kb/articles/from-ticket/7");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ spaceId: 4 }));
  });

  it("rejects the obsolete success-only response through the hook", async () => {
    fetchMock.mockResolvedValue(response({ success: true }));
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ ticketId: 7, spaceId: 4 })).rejects.toBeInstanceOf(ApiContractError);
    });
  });

  it("rejects object tags through the hook", async () => {
    fetchMock.mockResolvedValue(response({ ...ARTICLE, tags: [{ id: 1, name: "support", slug: "support" }] }));
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ ticketId: 7, spaceId: 4 })).rejects.toBeInstanceOf(ApiContractError);
    });
  });

  it("reuses the operation key on an interrupted retry and settles after success", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network interrupted"));
    fetchMock.mockResolvedValue(response(ARTICLE));
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ ticketId: 7, spaceId: 4 })).rejects.toThrow("Network error");
    });
    resetOutageCircuit();
    await act(async () => {
      await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
      await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
    });
    const keys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("Idempotency-Key"));
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[2]).not.toEqual(keys[1]);
  });

  it("accepts an idempotent server replay with the same article identity", async () => {
    fetchMock.mockResolvedValue(response(ARTICLE));
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    const first = await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
    const replay = await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
    expect(replay.id).toBe(first.id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
