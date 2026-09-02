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
