jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock("@/lib/query-cache-control", () => ({
  registerQueryCacheClearer: jest.fn(() => jest.fn()),
}));

import { useEffect } from "react";
import { render } from "@testing-library/react";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { QueryProvider } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";

const ORG_A = "org-a";
const ORG_B = "org-b";
const USER = "user-1";

let capturedClient: QueryClient | null = null;

function requireCapturedClient(): QueryClient {
  if (!capturedClient) throw new Error("QueryProvider did not expose a QueryClient");
  return capturedClient;
}

function ClientCapture() {
  const client = useQueryClient();
  useEffect(() => {
    capturedClient = client;
  }, [client]);
  return null;
}

function setSession(orgId: string, userId: string) {
  (useSession as jest.Mock).mockReturnValue({
    data: { user: { id: userId }, orgId },
    status: "authenticated",
    update: jest.fn(),
  });
}

describe("QueryProvider scope isolation on org switch", () => {
  beforeEach(() => {
    capturedClient = null;
    jest.clearAllMocks();
    setSession(ORG_A, USER);
  });

  it("re-mounting on org switch produces a different QueryClient instance", () => {
    const { rerender } = render(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );
    const orgAClient = requireCapturedClient();

    setSession(ORG_B, USER);
    rerender(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );
    const orgBClient = requireCapturedClient();

    expect(orgBClient).not.toBe(orgAClient);
  });

  it("data written under Org A is not readable under Org B without calling clear()", () => {
    const DATA = { isOrgOwner: false, modules: {}, scopes: {} };
    const keys = [
      queryKeys.access.me(),
      queryKeys.hr.attendanceStatus(),
      queryKeys.notifications.unreadCount(),
      queryKeys.dashboard.stats(),
    ] as const;

    const { rerender } = render(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );

    const orgAClient = requireCapturedClient();
    for (const key of keys) {
      orgAClient.setQueryData(key, DATA);
    }
    for (const key of keys) {
      expect(orgAClient.getQueryData(key)).toEqual(DATA);
    }

    setSession(ORG_B, USER);
    rerender(
      <QueryProvider>
        <ClientCapture />
      </QueryProvider>,
    );

    const orgBClient = requireCapturedClient();
    expect(orgBClient).not.toBe(orgAClient);

    for (const key of keys) {
      expect(orgBClient.getQueryData(key)).toBeUndefined();
    }
  });

  it("proves the guard bites: a plain QueryClient exposes cross-org data", () => {
    const DATA = { secret: "belongs-to-org-a-only" };
    const key = queryKeys.notifications.unreadCount();

    const plainClient = new QueryClient();
    plainClient.setQueryData(key, DATA);

    expect(plainClient.getQueryData(key)).toEqual(DATA);

    const hashA = scopedQueryKeyHashFn(authenticatedScope(ORG_A, USER))(key);
    const hashB = scopedQueryKeyHashFn(authenticatedScope(ORG_B, USER))(key);
    expect(hashA).not.toBe(hashB);

    const scopedA = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(ORG_A, USER)) } },
    });
    scopedA.setQueryData(key, DATA);

    const scopedB = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(ORG_B, USER)) } },
    });
    expect(scopedB.getQueryData(key)).toBeUndefined();
  });
});

describe("scopedQueryKeyHashFn canonicalises filter objects", () => {
  const SCOPE = authenticatedScope(ORG_A, USER);
  const hash = scopedQueryKeyHashFn(SCOPE);

  it("hashes two orderings of the same params object identically", () => {
    const insertionOrderA = ["streamlineos", "tickets", { limit: 20, cursor: "abc", status: "OPEN" }];
    const insertionOrderB = ["streamlineos", "tickets", { status: "OPEN", cursor: "abc", limit: 20 }];

    expect(hash(insertionOrderA)).toBe(hash(insertionOrderB));
  });

  it("canonicalises nested params objects too", () => {
    const a = ["streamlineos", "tickets", { page: 1, filters: { sort: "asc", q: "x" } }];
    const b = ["streamlineos", "tickets", { filters: { q: "x", sort: "asc" }, page: 1 }];

    expect(hash(a)).toBe(hash(b));
  });

  it("a scoped QueryClient reads back data written under the other ordering", () => {
    const DATA = { rows: [1, 2, 3] };
    const written = ["streamlineos", "tickets", { limit: 20, cursor: "abc" }];
    const read = ["streamlineos", "tickets", { cursor: "abc", limit: 20 }];

    const client = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: hash } },
    });
    client.setQueryData(written, DATA);

    expect(client.getQueryData(read)).toEqual(DATA);
  });

  it("proves the guard bites: raw JSON.stringify splits the same filter set in two", () => {
    const written = ["streamlineos", "tickets", { limit: 20, cursor: "abc" }];
    const read = ["streamlineos", "tickets", { cursor: "abc", limit: 20 }];

    const insertionOrderHash = (queryKey: unknown) => JSON.stringify([SCOPE, queryKey]);
    expect(insertionOrderHash(written)).not.toBe(insertionOrderHash(read));

    const client = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: insertionOrderHash } },
    });
    client.setQueryData(written, { rows: [1, 2, 3] });

    expect(client.getQueryData(read)).toBeUndefined();
  });

  it("still separates scopes and leaves object-free keys byte-identical", () => {
    const key = queryKeys.notifications.unreadCount();
    expect(hash(key)).toBe(JSON.stringify([SCOPE, key]));
    expect(hash(key)).not.toBe(scopedQueryKeyHashFn(authenticatedScope(ORG_B, USER))(key));
  });
});
