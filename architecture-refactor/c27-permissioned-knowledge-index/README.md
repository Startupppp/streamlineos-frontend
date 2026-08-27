# c27 — Indexed knowledge obeys the same visibility as direct reads

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 5 tickets, 4 done, 1 in-progress.

The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Wiki text search uses a bounded id probe](issues/01-wiki-search-id-probe.md) | — | **done** |
| 02 | [Every content type enters one ingestion state machine](issues/02-one-ingestion-state-machine.md) | — | **done** |
| 03 | [ACL revisions reindex before stale chunks win](issues/03-acl-revision-reindex.md) | 02 | **done** — widening resolved against the PRD (no queue needed); a separate finding is recorded: the revision gate is inert until existing chunks are re-indexed |
| 04 | [Chatbot retrieval is permissioned and bounded](issues/04-chatbot-retrieval-contract.md) | 01, 02, 03 | **done** — an unseeded KB now spends nothing per question |
| 05 | [Revision and chunk retention are explicit](issues/05-revision-and-chunk-retention.md) | 02 | done — snapshot criterion closed by measurement (96 kB) |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.

**Retiring a ticket means marking it done, never deleting the file** — the issue `.md` carries the `file:line` evidence behind each ticked box, and a withdrawn criterion's reasoning lives there too.
