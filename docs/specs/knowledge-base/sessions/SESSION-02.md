# Session 02 — Wiki Home: one action model, card pager, URL-backed controls

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S06 (Wiki Home), everything except the tree — the tree belongs to SESSION-01.

**The defect.** Page-card and row menus are assembled ad hoc on each surface, so the same page
offers different actions depending on where you see it, and an action added in one place is
missing in the others. The card view has no pager at all — it renders whatever the first response
held. URL-backed `status`/`spaceId`/owner/view controls are partly wired; measure which.

**Migration tag allocated to you:** `1213` (spare — only if you genuinely need one).

## Files you own

Frontend:
- `frontend/features/wiki/components/wiki-home-page.tsx` + `wiki-home-page.test.tsx`
- `frontend/features/wiki/components/wiki-home-all-pages.tsx`
- `frontend/features/wiki/components/wiki-page-card.tsx` + `wiki-page-card.test.tsx`
- `frontend/features/wiki/components/wiki-page-collection-table.tsx` + its test
- `frontend/features/wiki/components/quick-find-dialog.tsx`
- `frontend/features/wiki/components/kb-collection-badges.tsx`
- `frontend/features/wiki/lib/kb-page-status.ts`
- `frontend/features/wiki/lib/wiki-schema.ts`
- `frontend/hooks/api/kb/page-collection.ts`, `kb-page-collection-schema.ts`
- **NEW, yours to create:** `frontend/features/wiki/lib/page-action-descriptors.ts`

## Todo

- [ ] Measure first: list every place a page action menu is built today (`wiki-page-card.tsx`,
      `wiki-page-collection-table.tsx`, `page-document-toolbar.tsx`, `page-tree-item.tsx`) and
      record which actions each offers. The differences are the bug.
- [ ] Create the single action-descriptor module: one exported descriptor per action
      (favorite, comments, metadata, backlinks, linked records, history, duplicate, move, save
      template, export, archive/delete) carrying `id`, `label`, `icon`, required permission,
      availability predicate over the page, and the handler contract.
- [ ] `wiki-page-card.tsx` and `wiki-page-collection-table.tsx` render their menus **only** from
      the descriptor list. No surface-local action arrays survive.
- [ ] Descriptor availability respects permission: an action the actor cannot perform is absent,
      not present-and-failing.
- [ ] `page-document-toolbar.tsx` and `page-tree-item.tsx` are owned by SESSION-04 and SESSION-01 —
      post `HANDOFF` lines asking them to consume your module. Do not edit those files.
- [ ] Card view gains a cursor pager matching the table's, sharing one `hasMore` signal. No silent
      client-side slice anywhere.
- [ ] Result count is server-projected, not `items.length`.
- [ ] `status`, `spaceId`, owner and view (card/list) are URL-backed and survive reload and
      back/forward. Selection, menus and dialogs stay local.
- [ ] Compact search field hands off to `/knowledge/wiki/search` preserving the typed query.
- [ ] Quick find "View all" preserves the query into the full search route.
- [ ] Trust badges on every card: draft/published/archived, verified/stale, owner missing.
- [ ] First-run empty state offers all three paths: blank page, template, import — each gated on
      the permission it needs.
- [ ] All six states on Wiki Home: loading, ready, first empty, filtered empty, error with retry
      and request id, denied.
- [ ] Keyboard path for every card action; usable at 375 px; no action is menu-only on mobile.
- [ ] Tests: descriptor-parity spec proving card, table and toolbar offer the identical action set
      for the same page; pager spec; URL round-trip spec.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] Frontend `type-check` and `type-check:specs` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output and file:line here as you close each box)_
