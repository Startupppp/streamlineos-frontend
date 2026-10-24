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

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), put: jest.fn(), get: jest.fn(), patch: jest.fn() },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import {
  useSubmitEntityAction,
  useCreateTaskFromMessage,
} from "@/hooks/api/chat-entities";
import { useInviteToHuddle, useSetHuddleDefault } from "@/hooks/api/chat-huddles";
import { useChatSummarize } from "@/hooks/api/chat-summarize";

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const put = apiClient.put as jest.MockedFunction<typeof apiClient.put>;

const MEASURED_FENCED_ROUTE_FLOOR = 4;

const CHAT_CONTROLLER_DIR = backendPath("src", "modules", "chat");

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
  readonly url: string;
  readonly useHook: () => unknown;
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
  "/chat/huddle/meeting-accounts/default": {
    url: "/chat/huddle/meeting-accounts/default",
    useHook: useSetHuddleDefault,
    call: asMutation as FencedCall["call"],
    input: { connectionId: 7 },
    otherInput: { connectionId: 8 },
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
    "chat:huddles:start": "all",
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

function sentCalls() {
  return [...post.mock.calls, ...put.mock.calls];
}

function keySentOn(url: string): string | undefined {
  const call = sentCalls().find(([called]) => called === url);
  if (call === undefined) return undefined;
  const config = call[2] as RequestConfig | undefined;
  return config?.headers?.["Idempotency-Key"];
}

function allKeysSent(): (string | undefined)[] {
  return sentCalls().map(
    ([, , config]) => (config as RequestConfig | undefined)?.headers?.["Idempotency-Key"],
  );
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
  put.mockReset();
  put.mockResolvedValue({ ok: true });
});

describe("every @Idempotent chat route is called with an Idempotency-Key", () => {
  it("reads the fenced routes out of the backend's own chat controllers", () => {
    const routes = backendFencedChatRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(MEASURED_FENCED_ROUTE_FLOOR);
    for (const route of routes) expect(route.startsWith("/chat")).toBe(true);
  });

  it("has a caller in this file for every fenced chat route", () => {
    expect(backendFencedChatRoutes()).toEqual(Object.keys(CALLERS).sort());
  });

  it.each(Object.entries(CALLERS))(
    "%s sends a key",
    async (_route, caller) => {
      await run(caller, caller.input);

      expect(sentCalls().map(([url]) => url)).toContain(caller.url);
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
      put.mockReset();
      put.mockRejectedValue(
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
      put.mockReset();
      put.mockRejectedValue(
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
