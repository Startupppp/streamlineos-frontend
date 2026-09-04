import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { applyMailActionToCaches, restoreMailCaches } from "./mail-action-cache";
import { queryKeys } from "@/lib/query-keys";
import type { MailListResponse, MailMessageSummary } from "@/types/mail";
import type { UnifiedInboxResponse } from "@/types/inbox";

/**
 * A message id belongs to the provider, not to us. Two connected mailboxes can
 * hand back the same id, which is why every mail list keys its rows
 * `accountId-id`. The optimistic patches must match on the same pair.
 *
 * markRead and star always did. archive/trash did not: it filtered on the id
 * alone, in both the folder listing and the unified inbox, so archiving in one
 * mailbox deleted the other mailbox's row from the cache — and no request was in
 * flight for that row, so nothing would ever put it back.
 */

const ACCOUNT_A = 1;
const ACCOUNT_B = 2;
const SHARED_ID = "shared-message-id";

function makeMsg(accountId: number, isRead = false): MailMessageSummary {
  return {
    id: SHARED_ID,
    threadId: null,
    accountId,
    provider: "gmail",
    from: { name: "Sender", email: `sender-${accountId}@example.com` },
    to: [{ name: "Me", email: "me@example.com" }],
    subject: `Subject for account ${accountId}`,
    snippet: "Snippet",
    date: "2026-01-01T00:00:00.000Z",
    isRead,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeUnifiedItem(accountId: number, isRead = false) {
  return {
    kind: "mail" as const,
    id: SHARED_ID,
    threadId: null,
    accountId,
    subject: `Subject for account ${accountId}`,
    snippet: "Snippet",
    timestamp: "2026-01-01T00:00:00.000Z",
    isRead,
    hasAttachments: false,
    deepLink: null,
    sourceModule: "mail",
    actor: null,
    dedupKey: `${accountId}-${SHARED_ID}`,
  };
}

const MAIL_KEY = queryKeys.mail.messages({ folder: "inbox", accountId: "all" });
const UNIFIED_KEY = [...queryKeys.inbox.all, "unified", { limit: 25 }] as const;

function seed(isRead = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData<InfiniteData<MailListResponse>>(MAIL_KEY, {
    pages: [
      {
        messages: [makeMsg(ACCOUNT_A, isRead), makeMsg(ACCOUNT_B, isRead)],
        nextCursor: null,
        accountErrors: [],
      },
    ],
    pageParams: [undefined],
  });
  qc.setQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY, {
    pages: [
      {
        items: [makeUnifiedItem(ACCOUNT_A, isRead), makeUnifiedItem(ACCOUNT_B, isRead)],
        hasMore: false,
        nextCursor: null,
        sources: [],
      },
    ],
    pageParams: [undefined],
  });
  return qc;
}

function mailRows(qc: QueryClient): MailMessageSummary[] {
  return (
    qc.getQueryData<InfiniteData<MailListResponse>>(MAIL_KEY)?.pages.flatMap(
      (p) => p.messages,
    ) ?? []
  );
}

function unifiedRows(qc: QueryClient) {
  return (
    qc.getQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY)?.pages.flatMap(
      (p) => p.items,
    ) ?? []
  );
}

describe("applyMailActionToCaches — patches are scoped to the acting account", () => {
  it("BITE: archiving in one mailbox leaves the other mailbox's same-id row in the folder list", async () => {
    const qc = seed();

    await applyMailActionToCaches(qc, SHARED_ID, {
      accountId: ACCOUNT_A,
      action: "archive",
    });

    expect(mailRows(qc).map((m) => m.accountId)).toEqual([ACCOUNT_B]);
  });

  it("BITE: the same is true of the unified inbox", async () => {
    const qc = seed();

    await applyMailActionToCaches(qc, SHARED_ID, {
      accountId: ACCOUNT_A,
      action: "trash",
    });

    expect(unifiedRows(qc).map((i) => i.kind === "mail" && i.accountId)).toEqual([
      ACCOUNT_B,
    ]);
  });

  it("BITE: marking read in one mailbox does not mark the other mailbox's row read", async () => {
    const qc = seed(false);

    await applyMailActionToCaches(qc, SHARED_ID, {
      accountId: ACCOUNT_A,
      action: "markRead",
    });

    expect(mailRows(qc).map((m) => [m.accountId, m.isRead])).toEqual([
      [ACCOUNT_A, true],
      [ACCOUNT_B, false],
    ]);
    expect(
      unifiedRows(qc).map((i) => (i.kind === "mail" ? [i.accountId, i.isRead] : null)),
    ).toEqual([
      [ACCOUNT_A, true],
      [ACCOUNT_B, false],
    ]);
  });

  it("still removes the acting account's own row", async () => {
    const qc = seed();

    await applyMailActionToCaches(qc, SHARED_ID, {
      accountId: ACCOUNT_A,
      action: "archive",
    });

    expect(mailRows(qc).some((m) => m.accountId === ACCOUNT_A)).toBe(false);
  });

  it("a failed action restores both caches exactly", async () => {
    const qc = seed();
    const before = JSON.stringify([mailRows(qc), unifiedRows(qc)]);

    const ctx = await applyMailActionToCaches(qc, SHARED_ID, {
      accountId: ACCOUNT_A,
      action: "archive",
    });
    restoreMailCaches(qc, ctx);

    expect(JSON.stringify([mailRows(qc), unifiedRows(qc)])).toBe(before);
  });
});
