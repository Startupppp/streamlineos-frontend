# c27 — Indexed knowledge obeys the same visibility as direct reads|||| done 
|||| done 
PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)|||| done 
|||| done 
**Wave 1** · 5 tickets, 2 done, 3 in-progress.|||| done 
|||| done 
The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity.|||| done 
|||| done 
| # | Ticket | Blocked by | done |
|---|---|---| done |
| 01 | [Wiki text search uses a bounded id probe](issues/01-wiki-search-id-probe.md) | — | done |
| 02 | Every content type enters one ingestion state machine | — | done |
| 03 | [ACL revisions reindex before stale chunks win](issues/03-acl-revision-reindex.md) | 02 | done |
| 04 | [Chatbot retrieval is permissioned and bounded](issues/04-chatbot-retrieval-contract.md) | 01, 02, 03 | done |
| 05 | [Revision and chunk retention are explicit](issues/05-revision-and-chunk-retention.md) | 02 | done |
|||| done 