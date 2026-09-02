# 15 — BOLA/IDOR sweep across every object-addressable surface

**What to build:** Systematic broken-object-level-authorization testing across reads, writes, bulk actions, files, exports, search and vector queries, realtime channels, background jobs and public/share-token paths. A cross-tenant miss returns 404, never 403 — a 403 confirms the object exists.

**Blocked by:** None — can start immediately.

**Status:** swept — harness shipped, 1 hole fixed, 13 open defects reported

Full report: `.scratch/code-release-10-10/reports/15-bola-sweep.md`
Harness: `backend/test/security/bola/**` — `npx jest test/security/bola --maxWorkers=2` → 10 suites, 93 tests, green.

- [ ] Every object-addressable route is probed with an id belonging to another organization and returns 404.
      PARTIAL: 1,912/1,912 (100%) of object-addressable routes swept statically to the data layer; separately, all 13 `@Public()` routes whose tenant selector is a path `:orgId` were audited for a credential (ticket-07 follow-up) — payment webhooks verify an HMAC over a preserved raw body with `timingSafeEqual`, support inbound requires a per-org shared secret, and `PATCH /public/whiteboard-links/:token` is clean (192-bit token, uniform 404, editor capability check, single-board scope); 1,896 (99.16%) bind a tenant, all 16 remaining named with a reason. Enumerator totals match `pnpm -s check:route-classification` exactly (3,602/236/100/3,206/60/0). Live HTTP probing covered 1 route (the one fixed), 5 assertions. BLOCKED on full live probing: needs a booted API against a seeded two-org database.
- [ ] Bulk endpoints are probed with a mixed-tenant id list; the whole request fails rather than silently processing the subset the caller owns.
      NO — 15 confirmed silent-subset sites plus 1 fully unscoped (`enrollSequence`, on a table with no `org_id`). Detector finds 55 caller-supplied bulk sites: 4 fail-whole, 51 with no count check. Ratcheted in `bola-bulk-mixed-tenant.spec.ts`. Reference fix shape already in-repo at `projects-tickets-query.service.ts:155`.
- [ ] Export and search/vector paths apply the same DataScope as their sibling list endpoints.
      NO — 6 hand-verified disclosures on the same permission key: `/deals/aging`, `/clients/export`, `/leads/export`, `/contacts/export`, `/kb/search`, `/sign/reports/dashboard`. `/deals/export` itself is already fixed and is pinned as such. Detector reports 43 keys / 335 collection reads showing the shape (a triage surface, not 335 defects); ratcheted in `bola-scope-sibling-drift.spec.ts`.
- [ ] Realtime channel capability is tenant-checked at grant time, not only at subscribe time.
      PROPERTY HOLDS, not ticked because the evidence is static, not a live subscribe attempt. Three minting surfaces exist (`GET /chat/ably-token`, `GET /support/ably-token`, `POST /notifications/events/token`); none accepts a channel name or resource id in any form, and each derives its channel set from an org-bound membership or DataScope query. The pre-existing spec covered only chat, by source-text regex; `bola-scope-gate-integrity.spec.ts` now covers all three.
- [ ] Any optional filter that widens scope is authorized, and the gate is confirmed to actually bite.
      NO — 4 defects: `GET /tasks` gates on `crm:tasks:view !== "none"` where the key IS scopable, so `own`/`team` pass and the owner predicate is dropped (a live no-op gate); `GET /leads/export` `assigneeId` ungated; `goals-scope.ts` and `assets-scope.ts` fail OPEN because `build:goals:manage` and `hr:assets:manage` are not marked scopable, so every caller resolves `all`; `GET /timesheets/billing/rate-preview` `userId` ungated. 25 filters verified correct. The `hr:employees:manage`-beside-`:view` trap was checked against the role templates (HR_ADMIN/BRANCH_HR/RECRUITER hold both) — no current filter is gated that way. Gated in `bola-scope-gate-integrity.spec.ts`.
- [ ] Authorization is asserted at the data layer for every read and write.
      PARTIAL: 99.16% of the object-addressable surface (1,896/1,912). 1 hole fixed (`DELETE /hr/recruitment/jobs/:jobId/recruiters` — now asserts job ownership and returns 404, not 403). 5 remain open in `/blog/admin/*`, where every customer org admin holds the key to the vendor's global marketing blog. Gated by `bola-data-layer-binding.spec.ts` so no new unbound route can be added silently.
