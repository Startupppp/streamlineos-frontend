import * as fs from "fs";
import * as path from "path";
import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import { ApiError } from "@/lib/api-envelope";
import { backendPath } from "@/test-utils/backend-repo";
import type { RequestConfig } from "@/lib/api-client";
import type { AccessResponse } from "@/types/access";

/**
 * Every `@Idempotent` chat route, and the hook that calls it.
 *
 * `IdempotencyInterceptor` (backend src/common/idempotency/idempotency.interceptor.ts:87)
 * reads `idempotency-key` off the request and throws
 * `BadRequestException("An Idempotency-Key header is required for this operation")`
 * BEFORE the handler runs. The header is therefore part of the route's contract, not a
 * reliability nicety — a hook that omits it does not "lose replay protection", it 400s
 * every single call.
 *
 * Measured at backend 299cd1009 / frontend 7633c38b9, before this file existed: the chat
 * module had THREE `@Idempotent` routes and ALL THREE were called with no header —
 * `/chat/entity-actions/submit` (chat-entities.ts), `/chat/huddles/:huddleId/invite`
 * (chat-huddles.ts) and, once they were fenced, `/chat/actions/create-task-from-message` and
 * `/chat/channels/:channelId/summarize`. Grepping every `hooks/api/chat*.ts` at that commit
 * returns 0 occurrences of "Idempotency-Key", so the count of chat hooks that got this right
 * was 0 of 0. That is why the corpus below is
 * DERIVED from the backend's own controllers rather than listed by hand: a table of the
 * three routes already known to be broken cannot see the fourth.
 */

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn(), patch: jest.fn() },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import {
  useSubmitEntityAction,
  useCreateTaskFromMessage,
} from "@/hooks/api/chat-entities";
import { useInviteToHuddle } from "@/hooks/api/chat-huddles";
import { useChatSummarize } from "@/hooks/api/chat-summarize";

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

/** Measured: entity-actions/submit, huddles/:id/invite, actions/create-task-from-message, summarize. */
const MEASURED_FENCED_ROUTE_FLOOR = 4;

const CHAT_CONTROLLER_DIR = backendPath("src", "modules", "chat");

/**
 * The full route path of every `@Idempotent` handler in the backend's chat module.
 *
 * Read from source rather than from a checked-in copy, and by walking BACK from the
 * `@Idempotent` line to the nearest HTTP-method decorator and then to the enclosing
 * `@Controller` prefix — the same reason the backend's own gate script does it that way:
 * `@Post("submit")` under `@Controller("chat/entity-actions")` is anonymous on the method
 * decorator alone.
 */
function backendFencedChatRoutes(): string[] {
  const routes: string[] = [];
  for (const file of fs.readdirSync(CHAT_CONTROLLER_DIR)) {
    if (!file.endsWith(".controller.ts")) continue;
    const lines = fs
      .readFileSync(path.join(CHAT_CONTROLLER_DIR, file), "utf8")
      .split("\n");
    lines.forEach((line, index) => {
      if (!/^\s*@Idempotent\b/.test(line)) return;
      let method: string | undefined;
      for (let back = index; back >= 0 && method === undefined; back--) {
        const found = /^\s*@(?:Post|Put|Patch|Delete)\s*\(\s*["'`]([^"'`]*)["'`]/.exec(
          lines[back] ?? "",
        );
        if (found) method = found[1];
      }
      let prefix = "";
      for (let back = index; back >= 0; back--) {
        const found = /^\s*@Controller\s*\(\s*["'`]([^"'`]*)["'`]/.exec(
          lines[back] ?? "",
        );
        if (found) {
          prefix = found[1] ?? "";
          break;
        }
      }
      const suffix = method === undefined || method === "" ? "" : `/${method}`;
      routes.push(`/${prefix}${suffix}`);
    });
  }
  return routes.sort();
}

interface FencedCall {
  /** The concrete URL the hook is expected to POST to. */
  readonly url: string;
  readonly useHook: () => unknown;
  /** Not every caller is a mutation — `useChatSummarize` returns a plain async function. */
  readonly call: (hookResult: never, input: never) => Promise<unknown>;
  readonly input: unknown;
  readonly otherInput: unknown;
}

const asMutation = (hookResult: {
  mutateAsync: (input: never) => Promise<unknown>;
}, input: never) => hookResult.mutateAsync(input);

const CALLERS: Readonly<Record<string, FencedCall>> = {
  "/chat/actions/create-task-from-message": {
    url: "/chat/actions/create-task-from-message",
    useHook: useCreateTaskFromMessage,
    call: asMutation as FencedCall["call"],
    input: { channelId: 3, messageId: 9, projectId: 1, type: "TASK" },
    otherInput: { channelId: 3, messageId: 10, projectId: 1, type: "TASK" },
  },
  "/chat/entity-actions/submit": {
    url: "/chat/entity-actions/submit",
    useHook: useSubmitEntityAction,
    call: asMutation as FencedCall["call"],
    input: {
      channelId: 3,
      reference: { type: "ticket", id: "7" },
      actionId: "close",
      input: {},
    },
    otherInput: {
      channelId: 3,
      reference: { type: "ticket", id: "8" },
      actionId: "close",
      input: {},
    },
  },
  "/chat/huddles/:huddleId/invite": {
    url: "/chat/huddles/5/invite",
    useHook: useInviteToHuddle,
    call: asMutation as FencedCall["call"],
    input: { huddleId: 5, userIds: ["user-2"] },
    otherInput: { huddleId: 5, userIds: ["user-3"] },
  },
  "/chat/channels/:channelId/summarize": {
    url: "/chat/channels/3/summarize",
    useHook: useChatSummarize,
    call: ((summarize: (channelId: number) => Promise<unknown>, input: { channelId: number }) =>
      summarize(input.channelId)) as unknown as FencedCall["call"],
    input: { channelId: 3 },
    otherInput: { channelId: 4 },
  },
};

const ACCESS: AccessResponse = {
  scopes: {
    "chat:messages:write": "all",
    "chat:messages:read": "all",
    "chat:channels:write": "all",
  },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { chat: true },
};

function newClient(): QueryClient {
  const client = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function keySentOn(url: string): string | undefined {
  const call = post.mock.calls.find(([called]) => called === url);
  if (call === undefined) return undefined;
  const config = call[2] as RequestConfig | undefined;
  return config?.headers?.["Idempotency-Key"];
}

/**
 * Every key sent, in call order, regardless of URL. The retry and distinct-operation
 * cases reset the mock first and then make exactly two calls, and `useChatSummarize`
 * puts its only input IN the path — so filtering by URL would silently see one call
 * for it and turn the assertion into a no-op.
 */
function allKeysSent(): (string | undefined)[] {
  return post.mock.calls.map(
    ([, , config]) => (config as RequestConfig | undefined)?.headers?.["Idempotency-Key"],
  );
}

function keysSentOn(url: string): (string | undefined)[] {
  return post.mock.calls
    .filter(([called]) => called === url)
    .map(([, , config]) => (config as RequestConfig | undefined)?.headers?.["Idempotency-Key"]);
}

async function run(caller: FencedCall, input: unknown): Promise<void> {
  const { result } = renderHook(caller.useHook, {
    wrapper: wrapperFor(newClient()),
  });
  await act(async () => {
    await caller.call(result.current as never, input as never).catch(() => undefined);
  });
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ ok: true });
});

describe("every @Idempotent chat route is called with an Idempotency-Key", () => {
  it("reads the fenced routes out of the backend's own chat controllers", () => {
    const routes = backendFencedChatRoutes();
    // Anti-vacuity: a regex that stopped matching would derive an EMPTY corpus and
    // every per-route assertion below would silently vanish with it.
    expect(routes.length).toBeGreaterThanOrEqual(MEASURED_FENCED_ROUTE_FLOOR);
    for (const route of routes) expect(route.startsWith("/chat")).toBe(true);
  });

  it("has a caller in this file for every fenced chat route", () => {
    // A fenced route added later with no entry here fails HERE rather than in
    // production with a 400 nobody attributed to a missing header.
    expect(backendFencedChatRoutes()).toEqual(Object.keys(CALLERS).sort());
  });

  it.each(Object.entries(CALLERS))(
    "%s sends a key",
    async (_route, caller) => {
      await run(caller, caller.input);

      expect(post.mock.calls.map(([url]) => url)).toContain(caller.url);
      expect(keySentOn(caller.url)).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  it.each(Object.entries(CALLERS))(
    "%s replays one key across a retry of the same input",
    async (_route, caller) => {
      post.mockReset();
      post.mockRejectedValue(
        new ApiError("Request timed out.", undefined, "TIMEOUT"),
      );

      const { result } = renderHook(caller.useHook, {
        wrapper: wrapperFor(newClient()),
      });
      await act(async () => {
        await caller.call(result.current as never, caller.input as never).catch(() => undefined);
        await caller.call(result.current as never, caller.input as never).catch(() => undefined);
      });

      const keys = allKeysSent();
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBeDefined();
      expect(keys[0]).toBe(keys[1]);
    },
  );

  it.each(Object.entries(CALLERS))(
    "%s treats a different input as a different operation",
    async (_route, caller) => {
      post.mockReset();
      post.mockRejectedValue(
        new ApiError("Network error", undefined, "NETWORK_ERROR"),
      );

      const { result } = renderHook(caller.useHook, {
        wrapper: wrapperFor(newClient()),
      });
      await act(async () => {
        await caller.call(result.current as never, caller.input as never).catch(() => undefined);
        await caller
          .call(result.current as never, caller.otherInput as never)
          .catch(() => undefined);
      });

      const keys = allKeysSent();
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBeDefined();
      expect(keys[0]).not.toBe(keys[1]);
    },
  );
});
