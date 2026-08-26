# c27 — Indexed knowledge obeys the same visibility as direct reads

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 5 tickets, 2 done, 3 in-progress.

The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Wiki text search uses a bounded id probe](issues/01-wiki-search-id-probe.md) | — | done |
| 02 | Every content type enters one ingestion state machine | — | done |
| 03 | [ACL revisions reindex before stale chunks win](issues/03-acl-revision-reindex.md) | 02 | in-progress — widening-queues-refresh semantics open |
| 04 | [Chatbot retrieval is permissioned and bounded](issues/04-chatbot-retrieval-contract.md) | 01, 02, 03 | in-progress — no-eligible-content short-circuit not independently verified |
| 05 | [Revision and chunk retention are explicit](issues/05-revision-and-chunk-retention.md) | 02 | in-progress — stale-chunk sweep done; storage-policy/restore/erasure open |
