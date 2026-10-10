import { render, screen, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import type { ReactElement } from "react";
import { queryKeys } from "@/lib/query-keys";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useMailThread, useMailMessage } from "@/hooks/api/mail";
import {
  applyMailActionToCaches,
  invalidateAfterMailSend,
  seedMailDetailFromSummary,
} from "./mail-action-cache";
import type { MailMessageDetail, MailMessageSummary } from "@/types/mail";
import type { UnifiedInboxCount } from "@/types/inbox";

const apiGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => apiGet(...args) },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const CONFIG: QueryClientConfig = { defaultOptions: { queries: { retry: false } } };
function makeClient(): QueryClient { return new QueryClient(CONFIG); }

function makeQcWithCountAndInfinite(): QueryClient {
  const qc = makeClient();
  qc.setQueryData<UnifiedInboxCount>(platformCoreQueryKeys.inbox.unified({ count: true }), {
    notification: 1, mail: 3, approval: 1, total: 5, mailExact: true, approvalExact: true,
  });
  qc.setQueryData(platformCoreQueryKeys.inbox.unified({ limit: 25 }), {
    pages: [{ items: [{ kind: "mail" as const, id: "msg-1", accountId: 1, isRead: false }], nextCursor: null }],
    pageParams: [undefined],
  });
  return qc;
}

const LIST_ROW: MailMessageSummary = {
  id: "msg-1", threadId: "thread-1", accountId: 7, provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [{ name: null, email: "me@example.com" }],
  subject: "Quarterly plan",
  snippet: "A snippet the list already has",
  date: "2026-02-01T10:00:00.000Z",
  isRead: false, isStarred: false, hasAttachments: false,
};

const SERVER_THREAD: MailMessageDetail[] = [
  { ...LIST_ROW, cc: [], bodyHtml: "<p>the real body</p>", bodyText: null, attachments: [] },
];

function ThreadProbe() {
  const { data, isLoading } = useMailThread(7, "thread-1");
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="subject">{data?.[0]?.subject ?? "-"}</span>
      <span data-testid="body">{data?.[0]?.bodyHtml ?? "no-body"}</span>
    </div>
  );
}

function MessageProbe() {
  const { data, isLoading } = useMailMessage(7, "msg-1");
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="subject">{data?.subject ?? "-"}</span>
    </div>
  );
}

function renderWith(client: QueryClient, node: ReactElement) {
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("applyMailActionToCaches — unified count entry must not crash the updater (#186)", () => {
  it("archive does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "archive", accountId: 1 }),
    ).resolves.not.toThrow();
  });

  it("markRead does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "markRead", accountId: 1 }),
    ).resolves.not.toThrow();
  });

  it("markUnread does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "markUnread", accountId: 1 }),
    ).resolves.not.toThrow();
  });

  it("star does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "star", accountId: 1 }),
    ).resolves.not.toThrow();
  });

  it("archive still removes the message from the infinite page after the guard", async () => {
    const qc = makeQcWithCountAndInfinite();
    await applyMailActionToCaches(qc, "msg-1", { action: "archive", accountId: 1 });
    const updated = qc.getQueryData<{ pages: Array<{ items: unknown[] }> }>(
      platformCoreQueryKeys.inbox.unified({ limit: 25 }),
    );
    expect(updated?.pages[0].items).toHaveLength(0);
  });

  it("updates the selected message and thread caches", async () => {
    const qc = makeQcWithCountAndInfinite();
    const detail = {
      id: "msg-1", threadId: "thread-1", accountId: 1, provider: "gmail",
      from: { name: null, email: "sender@example.com" }, to: [], cc: [],
      subject: "Subject", snippet: "Snippet", date: "2026-10-09T00:00:00.000Z",
      isRead: false, isStarred: false, hasAttachments: false,
      bodyHtml: "<p>Body</p>", bodyText: "Body", attachments: [],
    } satisfies MailMessageDetail;
    qc.setQueryData(directoryAndOwnershipQueryKeys.mail.message(1, "msg-1"), detail);
    qc.setQueryData(directoryAndOwnershipQueryKeys.mail.thread(1, "thread-1"), [detail]);

    await applyMailActionToCaches(qc, "msg-1", { action: "markRead", accountId: 1 });

    expect(qc.getQueryData<MailMessageDetail>(directoryAndOwnershipQueryKeys.mail.message(1, "msg-1"))?.isRead).toBe(true);
    expect(qc.getQueryData<MailMessageDetail[]>(directoryAndOwnershipQueryKeys.mail.thread(1, "thread-1"))?.[0]?.isRead).toBe(true);
  });

  it("keeps the unified unread count consistent", async () => {
    const qc = makeQcWithCountAndInfinite();

    await applyMailActionToCaches(qc, "msg-1", { action: "markRead", accountId: 1 });

    expect(qc.getQueryData<UnifiedInboxCount>(platformCoreQueryKeys.inbox.unified({ count: true }))).toMatchObject({
      mail: 2,
      total: 4,
    });
  });
});

describe("invalidateAfterMailSend — cache policy owns the send/reply invalidation prefix", () => {
  it("marks the mail prefix stale so list hooks refetch", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = jest.spyOn(qc, "invalidateQueries");
    invalidateAfterMailSend(qc);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(directoryAndOwnershipQueryKeys.mail.all);
  });

  it("marks the inbox prefix stale so the unified inbox refetches", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = jest.spyOn(qc, "invalidateQueries");
    invalidateAfterMailSend(qc);
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(keys).toContainEqual(platformCoreQueryKeys.inbox.all);
  });
});

describe("mail thread hydration — seeding the detail cache from the list row", () => {
  beforeEach(() => {
    apiGet.mockReset().mockResolvedValue(SERVER_THREAD);
  });

  it("carries the list row's own fields into the seeded detail", () => {
    const client = makeClient();
    seedMailDetailFromSummary(client, LIST_ROW);
    const seeded = client.getQueryData<MailMessageDetail[]>(queryKeys.mail.thread(7, "thread-1"));
    expect(seeded?.[0]).toEqual({
      ...LIST_ROW, cc: [], bodyHtml: null, bodyText: null, attachments: [],
    });
  });

  it("renders the thread with no skeleton, then the background refresh replaces the body", async () => {
    const client = makeClient();
    seedMailDetailFromSummary(client, LIST_ROW);

    renderWith(client, <ThreadProbe />);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan");
    expect(screen.getByTestId("body")).toHaveTextContent("no-body");

    await waitFor(() =>
      expect(screen.getByTestId("body")).toHaveTextContent("the real body"),
    );
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it("BITE PROOF — a seed written without an expired timestamp never refreshes, which is the stale-data bug", async () => {
    const client = makeClient();
    client.setQueryData(queryKeys.mail.thread(7, "thread-1"), [
      { ...LIST_ROW, cc: [], bodyHtml: null, bodyText: null, attachments: [] },
    ]);

    renderWith(client, <ThreadProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan"),
    );
    expect(apiGet).not.toHaveBeenCalled();
    expect(screen.getByTestId("body")).toHaveTextContent("no-body");
  });

  it("never overwrites a thread the cache has already hydrated", () => {
    const client = makeClient();
    client.setQueryData(queryKeys.mail.thread(7, "thread-1"), SERVER_THREAD);

    seedMailDetailFromSummary(client, LIST_ROW);

    expect(client.getQueryData(queryKeys.mail.thread(7, "thread-1"))).toEqual(SERVER_THREAD);
  });

  it("seeds the single-message key when the row carries no thread", async () => {
    const client = makeClient();
    apiGet.mockResolvedValue({
      ...LIST_ROW, threadId: null, cc: [], bodyHtml: "<p>single</p>", bodyText: null, attachments: [],
    });
    seedMailDetailFromSummary(client, { ...LIST_ROW, threadId: null });

    expect(client.getQueryData(queryKeys.mail.thread(7, "thread-1"))).toBeUndefined();

    renderWith(client, <MessageProbe />);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan");
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));
  });

  it("marking a just-opened unread message read does not cancel the body fetch for its seeded thread", async () => {
    const client = makeClient();
    let resolveThread: (value: MailMessageDetail[]) => void = () => undefined;
    apiGet.mockReset().mockReturnValue(
      new Promise<MailMessageDetail[]>((resolve) => { resolveThread = resolve; }),
    );
    seedMailDetailFromSummary(client, LIST_ROW);
    renderWith(client, <ThreadProbe />);
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

    await applyMailActionToCaches(client, "msg-1", {
      accountId: 7, action: "markRead", threadId: "thread-1",
    });
    resolveThread(SERVER_THREAD);

    await waitFor(() =>
      expect(screen.getByTestId("body")).toHaveTextContent("the real body"),
    );
    expect(
      client.getQueryData<MailMessageDetail[]>(queryKeys.mail.thread(7, "thread-1"))?.[0]?.isRead,
    ).toBe(true);
  });

  it("a mail action's invalidation still reaches the seeded key", async () => {
    const client = makeClient();
    seedMailDetailFromSummary(client, LIST_ROW);
    renderWith(client, <ThreadProbe />);
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: queryKeys.mail.all });

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
  });
});
