# 54 — Batch E: the managed-product and portal lists adopt the surface

**What to build:** The managed-product lists — products, product projects, goals, feedback, insights, roadmap — and the client-facing portal lists render through the list surface. This is the last batch, so it also removes whatever remains of the old assembly for pages now fully migrated.

The portal pages carry the extra constraint: an external client's list must never show a control or a column the client cannot have, and its empty state must not disclose that filtered-out rows exist.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each managed-product and portal list renders through the surface
  **Left unchecked: one list in the batch is genuinely unmigrated.** `managed-products/managed-products-page.tsx`
  renders through the surface. Three of the five assigned files are not lists, checked rather than assumed:
  `portal-list-page.tsx` is an animated card grid (`PmStaggerList` + `motion.div` + `Link`),
  `client-visibility-page.tsx` is a tabbed panel of `Switch` toggles, and `client-portal-management-page.tsx`
  is a management tab group with a bespoke `GrantRow`.
  `managed-products/product-feedback-page.tsx` is a real list and is still not migrated. It paginates with
  `mode: "server"` -- a page number and a real `total` -- and the surface accepted only cursor pagination, so
  migrating it would have silently dropped the total and the numbered pager. The surface now carries a server
  pagination mode, so the block is removed, but the page has not been moved across yet.
- [x] A portal list shows no internal-only column or control, and its empty state discloses nothing about excluded rows
  Earned 2026-09-27, and the empty-state half was a real leak. `client-portal/portal-list-page.tsx` is the
  only client-facing list in this batch. Its columns were enumerated against what an external client may see:
  project colour avatar, name, key, status badge, date range, and an arrow that is navigation rather than a
  management control. No edit, delete or management affordance is present, and no internal-only column
  reaches the client surface.
  The empty state read **"You don't have access to any projects yet. Contact your project manager."** To an
  external client whose visible set is decided by a server-side visibility rule, that says projects exist and
  are being withheld -- which is the disclosure this criterion forbids. It now reads "Nothing here yet.
  Contact your project manager if you expect to see a project.", which states the surface is empty without
  implying either that rows exist or that they do not.
  The new assertion in `portal-separation.test.tsx` deliberately tests the **property rather than the string**:
  it sweeps the rendered copy for six disclosure phrasings (`don't have access`, `hidden`, `excluded`,
  `cannot see`, `not shared with you`, `no longer`), so a future rewording cannot quietly reintroduce the leak
  the way asserting one exact sentence would allow.
- [x] No page in the batch changes visibly for either actor kind
  Earned 2026-09-27 with one deliberate exception, which is the change the criterion above requires: the
  portal empty-state copy. Apart from that, `managed-products-page.tsx` behaves as before for an internal
  actor, and the three portal surfaces that were not migrated are untouched. The separation suite asserts both
  actor kinds -- internal management and external portal identity -- and is green at 55 tests across
  `client-portal/`.
- [ ] Any remaining shared assembly helper with no callers left is deleted
  **Left unchecked because the premise is not yet true: no helper is caller-less.** Measured rather than
  assumed -- 82 files under `features/build/` still import `usePageState` or `DataTableSkeleton` directly, so
  neither is dead, and this batch's single migration did not take the last caller of anything. This box cannot
  be settled until batches A through E are all complete; deleting on a partial count is how a helper that four
  unmigrated pages still need gets removed.
- [ ] Each page's rows can be supplied as props
  **Left unchecked: true for the one migrated list, not yet for the batch.** `managed-products-page.tsx`
  passes `rows={displayed}`, so a fixture can drive it without mocking the hook.
  `product-feedback-page.tsx` is unmigrated (see box 1) and still fetches internally with no way to inject
  rows. The three portal surfaces are not lists, so the criterion does not reach them.
