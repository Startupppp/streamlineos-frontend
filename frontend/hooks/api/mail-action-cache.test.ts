import { QueryClient } from "@tanstack/react-query";
import { applyMailActionToCaches, invalidateAfterMailSend } from "./mail-action-cache";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { MailMessageDetail } from "@/types/mail";
import type { UnifiedInboxCount } from "@/types/inbox";

function makeQcWithCountAndInfinite(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Count query — flat object, not InfiniteData. Shares the "unified" prefix.
  qc.setQueryData<UnifiedInboxCount>(platformCoreQueryKeys.inbox.unified({ count: true }), {
    notification: 1,
    mail: 3,
    approval: 1,
    total: 5,
    mailExact: true,
    approvalExact: true,
  });
  // Infinite inbox query — InfiniteData shape expected by the updater.
  qc.setQueryData(platformCoreQueryKeys.inbox.unified({ limit: 25 }), {
    pages: [
      {
        items: [
          { kind: "mail" as const, id: "msg-1", accountId: 1, isRead: false },
        ],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  });
  return qc;
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
      id: "msg-1",
      threadId: "thread-1",
      accountId: 1,
      provider: "gmail",
      from: { name: null, email: "sender@example.com" },
      to: [],
      cc: [],
      subject: "Subject",
      snippet: "Snippet",
      date: "2026-10-09T00:00:00.000Z",
      isRead: false,
      isStarred: false,
      hasAttachments: false,
      bodyHtml: "<p>Body</p>",
      bodyText: "Body",
      attachments: [],
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
    const keys = spy.mock.calls.map(
      (c) => (c[0] as { queryKey?: unknown }).queryKey,
    );
    expect(keys).toContainEqual(directoryAndOwnershipQueryKeys.mail.all);
  });

  it("marks the inbox prefix stale so the unified inbox refetches", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = jest.spyOn(qc, "invalidateQueries");
    invalidateAfterMailSend(qc);
    const keys = spy.mock.calls.map(
      (c) => (c[0] as { queryKey?: unknown }).queryKey,
    );
    expect(keys).toContainEqual(platformCoreQueryKeys.inbox.all);
  });
});
