import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useMailAction } from "./mail";
import { queryKeys } from "@/lib/query-keys";
import type { MailListResponse, MailMessageSummary } from "@/types/mail";
import type { UnifiedInboxResponse } from "@/types/inbox";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function makeMsg(id: string, isRead: boolean, accountId = 1): MailMessageSummary {
  return {
    id,
    threadId: null,
    accountId,
    provider: "gmail",
    from: { name: "Sender", email: "sender@example.com" },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: `Subject ${id}`,
    snippet: "Snippet",
    date: new Date().toISOString(),
    isRead,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeMailPage(messages: MailMessageSummary[]): MailListResponse {
  return { messages, nextCursor: null, accountErrors: [] };
}

function makeInfiniteMailData(
  pages: MailListResponse[],
): InfiniteData<MailListResponse> {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : i)),
  };
}

function makeUnifiedPage(mailId: string, isRead: boolean): UnifiedInboxResponse {
  return {
    items: [
      {
        kind: "mail",
        id: mailId,
        threadId: null,
        accountId: 1,
        subject: `Mail ${mailId}`,
        snippet: "Snippet",
        timestamp: new Date().toISOString(),
        isRead,
        hasAttachments: false,
        deepLink: null,
        sourceModule: "mail",
        actor: null,
        dedupKey: mailId,
      },
    ],
    hasMore: false,
    nextCursor: null,
    sources: [],
  };
}

function makeInfiniteUnifiedData(
  pages: UnifiedInboxResponse[],
): InfiniteData<UnifiedInboxResponse> {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : i)),
  };
}

describe("query key prefix regression", () => {
  it("messages() with no args is a real invalidation prefix over a params-keyed entry", () => {
    const qc = makeClient();
    qc.setQueryData(
      queryKeys.mail.messages({ folder: "inbox", accountId: 1 }),
      makeInfiniteMailData([makeMailPage([makeMsg("m1", false)])]),
    );
    const matched = qc.getQueriesData({ queryKey: queryKeys.mail.messages() });
    expect(matched).toHaveLength(1);
  });

  it("messages() carries no trailing undefined that would match nothing", () => {
    expect(queryKeys.mail.messages()).toEqual([
      ...queryKeys.mail.all,
      "messages",
    ]);
    expect(queryKeys.mail.messages()).not.toContain(undefined);
  });

  it("messages() matches every distinct filter combination it is meant to invalidate", () => {
    const qc = makeClient();
    for (const folder of ["inbox", "archive", "sent"]) {
      qc.setQueryData(
        queryKeys.mail.messages({ folder, accountId: 1 }),
        makeInfiniteMailData([makeMailPage([makeMsg(`m-${folder}`, false)])]),
      );
    }
    expect(qc.getQueriesData({ queryKey: queryKeys.mail.messages() })).toHaveLength(3);
  });
});

describe("useMailAction — markRead optimistic patch", () => {
  it("patches isRead across all pages and restores on error", async () => {
    const client = makeClient();
    const msgKey = queryKeys.mail.messages({ folder: "inbox", accountId: 1 });
    client.setQueryData<InfiniteData<MailListResponse>>(
      msgKey,
      makeInfiniteMailData([
        makeMailPage([makeMsg("m1", false), makeMsg("m2", false)]),
        makeMailPage([makeMsg("m3", false)]),
      ]),
    );

    const { result } = renderHook(() => useMailAction(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        messageId: "m1",
        body: { action: "markRead", accountId: 1 },
      });
    });

    const after = client.getQueryData<InfiniteData<MailListResponse>>(msgKey);
    expect(after?.pages[0]?.messages[0]?.isRead).toBe(true);
    expect(after?.pages[0]?.messages[1]?.isRead).toBe(false);
    expect(after?.pages[1]?.messages[0]?.isRead).toBe(false);
  });

  it("restores original data on mutation error", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { post: jest.Mock };
    };
    apiClient.post.mockRejectedValueOnce(new Error("Network error"));

    const client = makeClient();
    const msgKey = queryKeys.mail.messages({ folder: "inbox", accountId: 1 });
    const original = makeInfiniteMailData([
      makeMailPage([makeMsg("m10", false)]),
    ]);
    client.setQueryData<InfiniteData<MailListResponse>>(msgKey, original);

    const { result } = renderHook(() => useMailAction(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutate({
        messageId: "m10",
        body: { action: "markRead", accountId: 1 },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<InfiniteData<MailListResponse>>(msgKey);
    expect(restored?.pages[0]?.messages[0]?.isRead).toBe(false);
  });
});

describe("useMailAction — archive optimistic patch", () => {
  it("removes the message from every page", async () => {
    const client = makeClient();
    const msgKey = queryKeys.mail.messages({ folder: "inbox", accountId: 1 });
    client.setQueryData<InfiniteData<MailListResponse>>(
      msgKey,
      makeInfiniteMailData([
        makeMailPage([makeMsg("m1", false), makeMsg("m2", false)]),
        makeMailPage([makeMsg("m1", false), makeMsg("m3", false)]),
      ]),
    );

    const { result } = renderHook(() => useMailAction(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        messageId: "m1",
        body: { action: "archive", accountId: 1 },
      });
    });

    const after = client.getQueryData<InfiniteData<MailListResponse>>(msgKey);
    expect(after?.pages[0]?.messages).toHaveLength(1);
    expect(after?.pages[0]?.messages[0]?.id).toBe("m2");
    expect(after?.pages[1]?.messages).toHaveLength(1);
    expect(after?.pages[1]?.messages[0]?.id).toBe("m3");
  });
});

describe("useMailAction — unified inbox co-patch", () => {
  it("patches isRead in unified inbox alongside mail cache", async () => {
    const client = makeClient();
    const msgKey = queryKeys.mail.messages({ folder: "inbox", accountId: 1 });
    const unifiedKey = queryKeys.inbox.unified({ infinite: true });

    client.setQueryData<InfiniteData<MailListResponse>>(
      msgKey,
      makeInfiniteMailData([makeMailPage([makeMsg("m5", false)])]),
    );
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      unifiedKey,
      makeInfiniteUnifiedData([makeUnifiedPage("m5", false)]),
    );

    const { result } = renderHook(() => useMailAction(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        messageId: "m5",
        body: { action: "markRead", accountId: 1 },
      });
    });

    const mailAfter = client.getQueryData<InfiniteData<MailListResponse>>(msgKey);
    expect(mailAfter?.pages[0]?.messages[0]?.isRead).toBe(true);

    const unifiedAfter = client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey);
    const mailItem = unifiedAfter?.pages[0]?.items[0];
    expect(mailItem?.isRead).toBe(true);
  });

  it("restores unified inbox on error alongside mail cache", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { post: jest.Mock };
    };
    apiClient.post.mockRejectedValueOnce(new Error("Network error"));

    const client = makeClient();
    const msgKey = queryKeys.mail.messages({ folder: "inbox", accountId: 1 });
    const unifiedKey = queryKeys.inbox.unified({ infinite: true });

    client.setQueryData<InfiniteData<MailListResponse>>(
      msgKey,
      makeInfiniteMailData([makeMailPage([makeMsg("m6", false)])]),
    );
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      unifiedKey,
      makeInfiniteUnifiedData([makeUnifiedPage("m6", false)]),
    );

    const { result } = renderHook(() => useMailAction(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutate({
        messageId: "m6",
        body: { action: "markRead", accountId: 1 },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const unifiedRestored = client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey);
    const mailItem = unifiedRestored?.pages[0]?.items[0];
    expect(mailItem?.isRead).toBe(false);
  });
});
