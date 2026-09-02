# 29 — Frontend module matrices for Calendar, Inbox/mail and Knowledge

**What to build:** The §10.13, §10.14 and §10.16 frontend criteria, plus the Knowledge backend query/worker criteria that ride with them.

**Blocked by:** 28.

**Status:** ready-for-agent

- [ ] **Calendar:** one `/calendar` serving everyone with module events as toggleable sources; timezone display, series-versus-instance edits, cursor/range keys, and DST, exception, conflict and reminder coverage. No module-specific calendar page exists.
- [ ] **Inbox/mail:** indexed conversation ordering, search and unread; incremental sync; idempotent send and receive; bounce/retry/DLQ; invalidation of list, thread and count keys.
- [ ] **Inbox/mail frontend:** infinite lists, thread hydration, optimistic read/label rollback, compose and send states, offline and reconnect, sanitization, and account-revocation behaviour.
- [ ] **Knowledge:** spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state carry tenant-composite integrity.
- [ ] **Knowledge queries/workers:** revision and search plans, ingestion leases with retry and DLQ, chunk dedupe, permission-aware cache keys, purge and reindex.
- [ ] KB cache keys include the ACL dimension as a **required** field. An optional ACL version produces an ACL-blind cache key, and the revision gate's null branch skips the check entirely.
- [ ] Knowledge comment permissions follow the approved model, rechecking current page and article visibility at the data seam on every action.
- [ ] A cursor value of undefined vanishes in JSON serialization and replays the first page forever — assert the cursor survives the round trip.
