# Session 03 — Spaces: members, server counts, space detail

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S07, everything except the lazy hierarchy — that belongs to SESSION-01.

**The defect.** `GET /kb/spaces/:id/members` exists and has **zero consumers** — there is no
members sheet anywhere. `askIndexed` is computed as `pageCount > 0`, which is not an index
measurement and will claim a space is searchable when nothing was ever indexed. Neither spaces
page has a test file. Page/member counts need to be server-projected, not derived client-side.

**Migration tag allocated to you:** `1206_kb_space_member_counts`.

## Files you own

Backend (`backend/src/modules/kb/`):
- `wiki/kb-spaces.controller.ts`, `wiki/kb-spaces.service.ts`
- `wiki/kb-members.controller.ts`, `wiki/kb-members.service.ts`
- `wiki/kb-spaces-*.spec.ts`, `wiki/kb-space-*.spec.ts`, `wiki/kb-members.controller.e2e-spec.ts`
- `wiki/kb-membership-uniqueness.spec.ts`
- `wiki/dto/` — space and member DTOs only
- `core/authorization/knowledge-space-scope.ts`

Frontend:
- `frontend/features/wiki/components/spaces-page.tsx`, `space-detail-page.tsx`
- `frontend/features/wiki/components/space-card.tsx`, `space-sheet.tsx`
- `frontend/features/wiki/components/space-archive-impact.tsx`
- `frontend/features/wiki/components/spaces-page-schema.ts`
- `frontend/hooks/api/kb/spaces.ts`
- **NEW, yours to create:** `spaces-page.test.tsx`, `space-detail-page.test.tsx`,
  `space-members-sheet.tsx`

Migration: `backend/migrations/1206_kb_space_member_counts.sql` + its rollback.

## Todo

- [ ] Measure first: confirm `GET /kb/spaces/:id/members` is genuinely unconsumed, and read how
      `askIndexed` is currently computed. Record both with `file:line`.
- [ ] Page and member counts come from a server projection with a matching index, not from
      counting returned rows. Add the index in `1206` with a tenant-leading key.
- [ ] `askIndexed` reflects a real index measurement — chunks or vectors actually present for the
      space — not `pageCount > 0`. A space with pages and no chunks must report not-indexed.
- [ ] Members sheet: consumes `GET /kb/spaces/:id/members`, shows role and access, is cursor-based,
      and is reachable by keyboard and at 375 px.
- [ ] Space list: search, audience and status filters, cursor, list view; all URL-backed.
- [ ] Owner, last-updated and a manager health summary on each space.
- [ ] Archive/restore is the only customer-facing removal; restore is idempotent; the hard delete
      is gone from the customer surface.
- [ ] Archive impact preview states pages, public links, record links and Ask index impact before
      the user confirms.
- [ ] Space detail: breadcrumb, audience/access badge, in-space search, status and owner filters,
      create-in-space, review-policy summary.
- [ ] Inaccessible and not-found are indistinguishable 404s on the API, and the page renders a
      recovery state rather than a generic error for both.
- [ ] `move` checks both the source space and the target space — not only the page being moved.
      (The target-parent hole was closed on 2026-09-25 in `kb-page-tree.service.ts`; the **space**
      arm is the remaining half. That file is SESSION-01's — post a `HANDOFF` if the change
      belongs there, and put the space-authorization logic in `knowledge-space-scope.ts`.)
- [ ] Tenant-isolation spec on members: a sibling org's membership is never listed or resolvable.
- [ ] Test files for both spaces pages covering all six states.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output and file:line here as you close each box)_
