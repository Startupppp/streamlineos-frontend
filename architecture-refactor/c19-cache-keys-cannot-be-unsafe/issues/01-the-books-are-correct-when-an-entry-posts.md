# 01 — The books are correct the moment an entry posts

**What to build:** A finance user posts a journal entry and the balance sheet includes it. Today the four financial statements are cached for five minutes with no invalidation at all — the journal-posting path has no cache references — so posting an entry leaves the books wrong until the cache expires.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Posting a journal entry, then reading the balance sheet in the same test, shows the entry.
- [ ] The same holds for trial balance, profit and loss, and cash flow.
- [ ] Invalidation happens after the transaction commits, not before.
- [ ] A rolled-back post does not leave the cache showing an entry that never existed.
- [ ] The invalidation carries tenant context — a post-commit hook without it fails with a permission error.

## Todo

- [ ] Invalidate the statement namespace from the posting path
- [ ] Use the post-commit mechanism that opens its own tenant context
- [ ] Assert read-after-write, never that an invalidation was called
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
