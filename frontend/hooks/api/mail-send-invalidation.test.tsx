import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { ReplyMailBody, SendMailBody } from "@/types/mail";

/**
 * `/me/inbox/unified` serves mail as a first-class kind, so a send or a reply
 * changes what it returns. `useMailAction` invalidates both `mail.all` and
 * `inbox.all`; send and reply invalidated only `mail.all`, so the unified inbox
 * kept serving pages that predate the message for the life of its staleTime.
 */

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import { useSendMail, useReplyMail } from "@/hooks/api/mail";

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const ACCESS: AccessResponse = {
  scopes: { "mail:messages:send": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { mail: true },
};

const SEND: SendMailBody = {
  accountId: 1,
  to: ["someone@example.com"],
  subject: "Hello",
  bodyHtml: "<p>Hi</p>",
};

const REPLY: ReplyMailBody = {
  accountId: 1,
  messageId: "msg-1",
  threadId: "thread-1",
  bodyHtml: "<p>Reply</p>",
  to: [],
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

function invalidatedPrefixes(spy: jest.SpyInstance): string[][] {
  return spy.mock.calls
    .map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey)
    .filter((key): key is string[] => Array.isArray(key))
    .map((key) => key.map(String));
}

function contains(prefixes: string[][], target: readonly unknown[]): boolean {
  const wanted = target.map(String);
  return prefixes.some(
    (prefix) =>
      prefix.length === wanted.length &&
      prefix.every((segment, i) => segment === wanted[i]),
  );
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ sent: true });
});

describe("useSendMail invalidation", () => {
  it("invalidates the mail prefix", async () => {
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(SEND);
    });
    await waitFor(() =>
      expect(contains(invalidatedPrefixes(spy), queryKeys.mail.all)).toBe(true),
    );
  });

  it("also invalidates the unified inbox prefix, which serves the same message", async () => {
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(SEND);
    });
    await waitFor(() =>
      expect(contains(invalidatedPrefixes(spy), queryKeys.inbox.all)).toBe(true),
    );
  });
});

describe("useReplyMail invalidation", () => {
  it("invalidates the mail prefix", async () => {
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useReplyMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(REPLY);
    });
    await waitFor(() =>
      expect(contains(invalidatedPrefixes(spy), queryKeys.mail.all)).toBe(true),
    );
  });

  it("also invalidates the unified inbox prefix", async () => {
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useReplyMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(REPLY);
    });
    await waitFor(() =>
      expect(contains(invalidatedPrefixes(spy), queryKeys.inbox.all)).toBe(true),
    );
  });
});

describe("BITE PROOF: the assertion can distinguish a prefix that was never invalidated", () => {
  it("a send does not invalidate an unrelated prefix", async () => {
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(SEND);
    });
    expect(contains(invalidatedPrefixes(spy), queryKeys.calendar.all)).toBe(false);
  });

  it("a failed send invalidates nothing, because onSuccess never runs", async () => {
    post.mockRejectedValueOnce(new Error("network down"));
    const client = newClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync(SEND).catch(() => undefined);
    });
    expect(contains(invalidatedPrefixes(spy), queryKeys.mail.all)).toBe(false);
    expect(contains(invalidatedPrefixes(spy), queryKeys.inbox.all)).toBe(false);
  });
});
