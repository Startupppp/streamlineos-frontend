# c27 — Indexed knowledge obeys the same visibility as direct reads

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 5 tickets, 0 done.

The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity: wiki text search still lacks the RLS id probe, article ingestion is synchronous, ACL revisions need a durable reindex path, and revision retention is unbounded.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Wiki text search uses a bounded id probe](issues/01-wiki-search-id-probe.md) | — | ready-for-agent |
| 02 | [Every content type enters one ingestion state machine](issues/02-one-ingestion-state-machine.md) | — | ready-for-agent |
| 03 | [ACL revisions reindex before stale chunks win](issues/03-acl-revision-reindex.md) | 02 | ready-for-agent |
| 04 | [Chatbot retrieval is permissioned and bounded](issues/04-chatbot-retrieval-contract.md) | 01, 02, 03 | ready-for-agent |
| 05 | [Revision and chunk retention are explicit](issues/05-revision-and-chunk-retention.md) | 02 | ready-for-agent |
