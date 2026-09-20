# DOC-11 — Release Verification and Rollout

## Outcome

P0 Documents ships only when the journeys below pass on one named
frontend/backend revision pair, in a named disposable environment, with
failed and unrun checks still visible.

## Journeys (P0)

1. **Member** — open Ask KB, ask a question, follow a citation to a page,
   use Quick find, open Wiki Home, open My pages / Shared (correct
   emptiness), cannot see Manage items they lack.
2. **Author** — create page, autosave, conflict, share private → org,
   favorite from card, move, duplicate, restore from Trash.
3. **Manager** — space archive blocked by pages, review approve/reject,
   import paste with `Title *`, export gated, analytics date range, bulk
   trash restore with a partial deny.
4. **Project contributor** — Build wiki page is the same record; no leak
   of other projects.
5. **Denied actor** — direct URL to Templates / Analytics / Import shows
   `NoPermissionState`; API 403.
6. **Public reader** — valid token shows only that page; invalid or
   **revoked** token 404; no chrome of private siblings. Expiry is P2
   (D22) and is not a P0 test.
7. **Alias** — `/kb`, `/docs`, `/knowledge-base`, `/knowledge/wiki/pages/:id`,
   `/ask` land on live wiki / Ask KB routes.
8. **Mobile** — 375px: Drawer reaches Library/Manage/Trash/Quick find;
   metadata sheet opens; Reviews `mobileCard`.
9. **Theme** — light and dark: canvas ≠ card ≠ sheet on Home + metadata
   sheet + confirm dialog.

## P1 Journeys (full program, not P0)

Each item has its own acceptance checkbox — do not bundle them.

- [ ] **DOC-11-P1-A** Content management health presets + bulk owner/verify.
- [ ] **DOC-11-P1-B** Ask Insights assign/dismiss/solve (`gapKind=ai_no_context`).
- [ ] **DOC-11-P1-C** Research briefs under `/knowledge/wiki/research-briefs`.
- [ ] **DOC-11-P1-D** Space members sheet.
- [ ] **DOC-11-P1-E** Review overdue SLA (derived overdue + notify).
- [ ] **DOC-11-P1-F** Share/comment/review notifications (D22).
- [ ] **DOC-11-P1-G** HTML/ZIP import completeness.
- [ ] **DOC-11-P1-H** Public helpful/not-helpful.

## Checks

### Types / contracts / cycles

- [ ] **DOC-11-001** Focused frontend tests for wiki nav, shares, search
      URL, bulk partial, form requiredness.
- [ ] **DOC-11-002** Backend e2e: allow/deny/cross-tenant on list, get,
      search, ask citation, bulk, sources, analytics titles.
- [ ] **DOC-11-003** `pnpm check:cycles` + `:self-test` both repos.
- [ ] **DOC-11-004** Permission-catalog drift test green.

### Database

- [ ] **DOC-11-005** EXPLAIN (ANALYZE, BUFFERS) for list, search FTS,
      sources, reviews join — recorded in DOC-07 evidence.
- [ ] **DOC-11-006** Share-grant and space-archive migrations applied on
      the named disposable env; rollback script reviewed.

### Browser

- [ ] **DOC-11-007** Authenticated non-empty org, 375/768/1280, light/dark,
      journeys 1–9. Record what was not run.
- [ ] **DOC-11-008** Axe on Home, editor, search, trash, one sheet.

### Docs / catalog

- [ ] **DOC-11-009** `frontend/PAGES.md` + root `PAGES.md` match shipped
      routes. DOC-14 rows checked with evidence level.
- [ ] **DOC-11-010** Residual risks listed (silent tree more-than-200,
      leftover articles, P1 Manage unshipped, etc.).

### Disaster recovery (P0 product, not only migration)

Named disposable environment. RPO **24h**, RTO **8h** unless ops sets
stricter numbers in the env runbook.

- [ ] **DOC-11-012** Restore drill: database + object storage for page
      media/sources; pages render; signed URLs re-issue; search index
      rebuild job run; attachments consistent with DB rows.
- [ ] **DOC-11-013** Retention matrix recorded: conversations, `kb_events`,
      import/export artifacts, sources, public tokens, audit rows, in-memory
      drafts. Default, hard bound, deletion/anonymize, legal-hold, owning
      job. Trash retention stays 1–365 days.

### Cutover (articles → pages) — separate gate

- [ ] **DOC-11-011** Migration preview/run on disposable data; citation
      URLs; support gap flow writes pages; `/support/kb` deleted only after
      zero article writes; public `/help` re-pointed or kept as a renderer.

## Release Decision

| Gate | Required |
|---|---|
| P0 release | Journeys 1–9 + DOC-11-001–010 + all P0 checkboxes in DOC-00–10, 14 |
| Full program | P1 journeys + DOC-11-011 + Manage/Insights/briefs |

Do not claim “zero bugs” or a quality score from static checks.

## Evidence Log

Record:

`YYYY-MM-DD — P0|FULL — frontend SHA — backend SHA — env name — commands —
browser notes — EXPLAIN files — residual risks`
