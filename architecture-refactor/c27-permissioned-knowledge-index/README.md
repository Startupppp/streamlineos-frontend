# c27 — Indexed knowledge obeys the same visibility as direct reads

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 5 tickets, 2 done, 2 in-progress, 1 open.

The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Wiki text search uses a bounded id probe](issues/01-wiki-search-id-probe.md) | — | done |
| 02 | [Every content type enters one ingestion state machine](issues/02-one-ingestion-state-machine.md) | — | done |
| 03 | [ACL revisions reindex before stale chunks win](issues/03-acl-revision-reindex.md) | 02 | in-progress — widening-queues-refresh semantics + cross-tenant tests open |
| 04 | [Chatbot retrieval is permissioned and bounded](issues/04-chatbot-retrieval-contract.md) | 01, 02, 03 | in-progress — prompt-injection tests + source-citation re-resolution open |
| 05 | [Revision and chunk retention are explicit](issues/05-revision-and-chunk-retention.md) | 02 | ready-for-agent — not started, deferred by the implementing agent for scope reasons |
