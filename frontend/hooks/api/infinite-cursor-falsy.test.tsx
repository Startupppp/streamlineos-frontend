import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useScope: () => "ALL",
  useAccess: () => ({ data: { isOrgOwner: true, modules: {}, scopes: {} } }),
  useModuleEnabled: () => true,
  usePermissionGate: () => ({ allowed: true, denied: false, isLoading: false }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/ai-text-stream", () => ({
  useAiTextStream: () => ({ start: jest.fn(), abort: jest.fn(), isStreaming: false }),
}));

jest.mock("@/hooks/common/use-idempotent-operation", () => ({
  useIdempotentOperation: () => ({ nextKey: () => "k", withKey: (b: unknown) => b }),
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

type Case = {
  name: string;
  module: string;
  run: (mod: Record<string, unknown>) => unknown;
  firstPage: unknown;
  expectCursor: (calls: unknown[][]) => void;
};

function paramsOf(calls: unknown[][]): Array<Record<string, unknown> | undefined> {
  return calls.map((call) => call[1] as Record<string, unknown> | undefined);
}

function urlsOf(calls: unknown[][]): string[] {
  return calls.map((call) => String(call[0]));
}

const CASES: Case[] = [
  {
    name: "useSavedMessages sends numeric cursor 0",
    module: "./chat-saved",
    run: (m) => (m["useSavedMessages"] as () => unknown)(),
    firstPage: { messages: [], nextCursor: 0 },
    expectCursor: (calls) => expect(paramsOf(calls)[1]).toEqual({ cursor: 0 }),
  },
  {
    name: "useAiConversations sends numeric cursor 0",
    module: "./chat-ai-assistant",
    run: (m) => (m["useAiConversations"] as (e: boolean) => unknown)(true),
    firstPage: { conversations: [], nextCursor: 0 },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: 0 })),
  },
  {
    name: "useKbResearchBriefs sends numeric cursor 0",
    module: "./kb/research-briefs",
    run: (m) => (m["useKbResearchBriefs"] as (l?: number) => unknown)(20),
    firstPage: { items: [], nextCursor: 0 },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: 0 })),
  },
  {
    name: "useKbConversationMessages sends numeric cursor 0",
    module: "./kb/chat-history",
    run: (m) =>
      (m["useKbConversationMessages"] as (c: number | null, e: boolean) => unknown)(7, true),
    firstPage: { messages: [], nextCursor: 0 },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: 0 })),
  },
  {
    name: "useChatMessages sends numeric cursor 0",
    module: "./chat-core-read",
    run: (m) => (m["useChatMessages"] as (c: number) => unknown)(3),
    firstPage: { messages: [], nextCursor: 0 },
    expectCursor: (calls) => expect(paramsOf(calls)[1]).toEqual({ cursor: 0 }),
  },
  {
    name: "useThreadReplies sends numeric cursor 0",
    module: "./chat-search",
    run: (m) => (m["useThreadReplies"] as (c: number, i: number) => unknown)(3, 4),
    firstPage: { messages: [], nextCursor: 0 },
    expectCursor: (calls) => expect(paramsOf(calls)[1]).toEqual({ cursor: 0 }),
  },
  {
    name: "useKbPageVersionsInfinite sends empty-string cursor",
    module: "./kb/page-versions",
    run: (m) => (m["useKbPageVersionsInfinite"] as (p: number) => unknown)(5),
    firstPage: { data: [], pagination: { limit: 20, nextCursor: "", hasMore: true } },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: "" })),
  },
  {
    name: "useInfiniteKbPageCollection sends empty-string cursor",
    module: "./kb/page-collection",
    run: (m) => (m["useInfiniteKbPageCollection"] as (p: object) => unknown)({ kind: "file" }),
    firstPage: { data: [], pagination: { limit: 50, nextCursor: "", hasMore: true } },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: "" })),
  },
  {
    name: "useUnifiedInbox sends empty-string cursor",
    module: "./inbox",
    run: (m) => (m["useUnifiedInbox"] as () => unknown)(),
    firstPage: { items: [], hasMore: true, nextCursor: "", sources: [] },
    expectCursor: (calls) =>
      expect(paramsOf(calls)[1]).toEqual(expect.objectContaining({ cursor: "" })),
  },
  {
    name: "useMailMessages sends empty-string cursor",
    module: "./mail",
    run: (m) => (m["useMailMessages"] as (p: object) => unknown)({ folder: "INBOX" }),
    firstPage: { messages: [], nextCursor: "" },
    expectCursor: (calls) => expect(urlsOf(calls)[1]).toContain("cursor="),
  },
];

describe("a falsy cursor reaches the request instead of replaying page one", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(CASES)("$name", async ({ module, run, firstPage, expectCursor }) => {
    let served = 0;
    apiClient.get.mockImplementation(() => {
      served += 1;
      return Promise.resolve(served === 1 ? firstPage : { ...(firstPage as object) });
    });

    const mod = (await import(module)) as Record<string, unknown>;
    const { result } = renderHook(
      () => run(mod) as { isSuccess: boolean; hasNextPage: boolean; fetchNextPage: () => Promise<unknown> },
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(apiClient.get.mock.calls.length).toBeGreaterThan(1));

    expectCursor(apiClient.get.mock.calls);
  });
});

const ROOTS = ["hooks", "app", "features", "lib", "components"];

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const TRUTHY_GUARDS: Array<{ label: string; re: RegExp }> = [
  { label: "if (pageParam)", re: /\bif\s*\(\s*!?\s*pageParam\s*\)/ },
  { label: "pageParam ? …", re: /(?<![A-Za-z_$])pageParam\s*\?[^?.]/ },
  { label: "pageParam && …", re: /(?<![A-Za-z_$])pageParam\s*&&/ },
  { label: "!pageParam", re: /!\s*pageParam(?![A-Za-z_$])/ },
  { label: "(pageParam as T) ? …", re: /\(\s*pageParam\s+as\s[^)]*\)\s*\?/ },
];

describe("no infinite query guards its cursor by truthiness", () => {
  it("finds no truthiness guard in any file that declares initialPageParam", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root, [])) {
        const source = readFileSync(file, "utf8");
        if (!source.includes("initialPageParam")) continue;
        const code = stripComments(source);
        for (const { label, re } of TRUTHY_GUARDS)
          if (re.test(code)) offenders.push(`${file}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("proves the scan bites: it flags the guard it is meant to catch", () => {
    const sample = `
      initialPageParam: undefined as number | undefined,
      queryFn: ({ pageParam }) => {
        if (pageParam) params.cursor = pageParam;
      },
    `;
    const hits = TRUTHY_GUARDS.filter(({ re }) => re.test(sample)).map((g) => g.label);
    expect(hits).toContain("if (pageParam)");
  });
});
