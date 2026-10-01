import { QueryClient } from "@tanstack/react-query";
import { applyMailActionToCaches } from "./mail-action-cache";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

function makeQcWithCountAndInfinite(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Count query — flat object, not InfiniteData. Shares the "unified" prefix.
  qc.setQueryData(platformCoreQueryKeys.inbox.unified({ count: true }), { count: 5 });
  // Infinite inbox query — InfiniteData shape expected by the updater.
  qc.setQueryData(platformCoreQueryKeys.inbox.unified({ limit: 25 }), {
    pages: [
      {
        items: [
          { kind: "mail" as const, id: "msg-1", accountId: "acc-1", isRead: false },
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
      applyMailActionToCaches(qc, "msg-1", { action: "archive", accountId: "acc-1" }),
    ).resolves.not.toThrow();
  });

  it("markRead does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "markRead", accountId: "acc-1" }),
    ).resolves.not.toThrow();
  });

  it("markUnread does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "markUnread", accountId: "acc-1" }),
    ).resolves.not.toThrow();
  });

  it("star does not throw when a flat count entry shares the unified prefix", async () => {
    const qc = makeQcWithCountAndInfinite();
    await expect(
      applyMailActionToCaches(qc, "msg-1", { action: "star", accountId: "acc-1" }),
    ).resolves.not.toThrow();
  });

  it("archive still removes the message from the infinite page after the guard", async () => {
    const qc = makeQcWithCountAndInfinite();
    await applyMailActionToCaches(qc, "msg-1", { action: "archive", accountId: "acc-1" });
    const updated = qc.getQueryData<{ pages: Array<{ items: unknown[] }> }>(
      platformCoreQueryKeys.inbox.unified({ limit: 25 }),
    );
    expect(updated?.pages[0].items).toHaveLength(0);
  });
});
