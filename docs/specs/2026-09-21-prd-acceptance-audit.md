# PRD acceptance audit — 2026-09-21

One day spent auditing every unchecked acceptance box in `docs/specs/**` and
`architecture-refactor/prd/completion-plan.md`. This file records **what was
verified**, what was closed, what was reopened, and how the remainder groups by
size. It is a status record, not a new authority: the module PRDs remain the
normative acceptance catalog and the execution ledgers remain the schedulers.

---

## 1. Exact counts

Measured by walking every `- [ ]` / `- [x]` in tracked markdown, not estimated.

| | Before | After |
|---|---|---|
| Checked | 112 | **120** |
| Unchecked | 1,333 | **1,325** |
| Total boxes | 1,445 | 1,445 |
| Files carrying boxes | 73 | 73 |

**Completed this session: 11.** Every one re-verified by hand against source
before ticking — no tick rests on an agent's report alone.

**Reopened: 3.** Each was ticked `[x]` and each is false in current source.

**Partially complete: 66.** Items where some named sub-clause is satisfied and
at least one is not. These stay unchecked by design; a partial tick would be a
false completion.

**Remaining: 1,325 unchecked**, of which **1,259** are open with no verified
partial progress.

Per tracker:

| Tracker | Open before | Open after |
|---|---|---|
| `docs/specs/build/**` | 657 | 653 |
| `docs/specs/hrms-module/**` | 360 | 359 |
| `docs/specs/documents-module/**` | 261 | 258 |
| `architecture-refactor/prd/completion-plan.md` | 45 | 45 |
| `architecture-refactor/final-refactor/evidence/**` | 9 | 9 |
| `2026-09-18-chat-os-prd.md` | 1 | 1 |

The last 55 were **not audited** — out of time, not out of scope. Say so
rather than implying coverage.

---

## 2. Method, and what it cannot support

Nine read-only auditors covered ~1,275 of the 1,333 open boxes, each required
to produce a `path:line` anchor or return OPEN. Then **every** `COMPLETE`
claim was independently re-verified before any box was ticked.

That re-verification mattered. Of 13 claimed complete, **2 were rejected**:

- **`BLD-05A-003`** — the inline-schema half is true, but its text also demands
  "no duplicate shape remains". Zero inline `z.object(` does not prove two
  `*-schema.ts` files don't declare one shape. Left open.
- **`HRM-14f-001`** — no such open item exists; `14f-catalog-payroll.md` has
  three open boxes (`010`, `011`, `012`). The id was invented. (Its underlying
  evidence was real, and closed the genuine item `HRM-12-016` instead.)

**A source read is not a passing journey.** Nothing here certifies a customer
outcome. There is no local Postgres, Redis or Docker on this machine (5432,
5433 and 6379 all refuse) and `backend/.env` points at production, so every
item needing an applied migration, a seeded database, a real browser, a
provider or a deployment stayed open **as a matter of fact**, whatever the
source looks like.

---

## 3. Closed — 11 items

| Item | What proves it |
|---|---|
| `BLD-03-021` | No get-by-id route exists; both list paths narrow to `or(shared, own)`; all four mutation paths throw `Forbidden`. Eight tests added, **bite-proved** — neutering the guards fails exactly the four negative cases. |
| `BLD-05-037` | Zero inline `z.object(` outside `*-schema.ts` in Build, widened past the original census to `discriminatedUnion`/`tuple`/`record`. |
| `BLD-06B-006` | 36 schema files ↔ 36 matrix rows, `comm` empty in both directions, no duplicate row. |
| `BSN-01-033` | Catalog order, Overview as `primary[0]`, `href === basePath`, `exact: true`, and a ceiling test so a tenth destination fails loudly. 14 tests pass. |
| `HRM-01-002` | Both retired route directories gone; zero `href`/`push`/`redirect` callers. |
| `HRM-02-004` | No `settings/workers` directory; `/directory/workers` present. |
| `HRM-12-002` | Same evidence as `HRM-01-002`. |
| `HRM-12-016` | Keys discriminated `by-run` vs `detail`; collision test mounts both hooks at `runId === batchId === 1` and passes. |
| `DOC-00-D08-A` | No Build wiki table; Build route renders the Documents feature; project ACL is a real predicate and the update path asserts it. |
| `DOC-07-018` | GET and PATCH both `kb:settings:manage`; PATCH body has exactly one key. |
| `DOC-08-008` | No `lib/services/`; the only non-auth `app/api` route is a generic authenticated image proxy, inspected rather than assumed. |

Two of these (`HRM-01-002`/`HRM-12-002`) needed a distinction an automated
scan gets wrong: the surviving `/payroll/me/*` strings are the **live
self-service API**, not callers of the deleted page.

---

## 4. Reopened — 3 items that were ticked and are not true

All three verified directly, not taken on report.

| Item | Source contradicting it |
|---|---|
| `HRM-02-012` `/hr/service-delivery` merged into cases | Page still at `app/(authenticated)/hr/service-delivery/page.tsx`, still linked at `sidebar-nav-routes-hr-governance.ts:40`. |
| `HRM-02-013` `/hr/simulator` out of customer nav | Page still exists, still linked at `sidebar-nav-routes-hr-governance.ts:134`. Also blocks `HRM-03-007`, whose nav test must assert its absence. |
| `HRM-03-005` biometric/devices under a "Time clocks" parent | `sidebar-nav-routes-hr-foundation.ts:103-114` — flat siblings, no parent node. They also gate on different keys (`hr:attendance:manage` vs `hr:biometric:manage`), which the grouping has to resolve. |

**The pattern worth naming:** each tick recorded a *locked decision*, not
completed work. A disposition table and an acceptance checklist were being
ticked with one mark. Anything ticked in a page-inventory PRD should be
re-read with that in mind.

---

## 5. Remaining work, grouped by size

The three-bucket grouping below covers the **tractable** subset. The majority
of the 1,325 is not blocked on effort at all — see §6.

### Small — hours, one or two files, no contract change

| Fix | Closes |
|---|---|
| Guard `router.push` with `useNavigationLeave` at `use-keyboard-shortcuts.ts:49,55` and the `backlog`/`my-work` row handlers | `BSN-04-A03`, unblocks `BSN-05-027` |
| Five wrong-destination navigations (`product-feedback-page.tsx:150`, `views-page.tsx:63`, `ticket-detail-page.tsx:87,234`, `module-card.tsx:120`, `project-settings-page.tsx:196`) | `BLD-01-001`…`005`, `BLD-02A-015` |
| Add `/payroll/setup` to `sidebar-nav-groups-payroll.ts` | `HRM-12-001`, `HRM-14f-002` |
| Add a "Time clocks" parent group | `HRM-00-D06-A`, `HRM-03-005` |
| Remove `/hr/simulator` from customer nav | `HRM-02-013`, `HRM-00-D11-A`, unblocks `HRM-03-007` |
| `SheetContent`/`DialogContent` default `bg-background` → `bg-popover` | `DOC-09-001`, `DOC-09-002`, + the canvas≠card≠sheet acceptance |
| Delete the empty `knowledge/wiki/{recent,favorites}` route directories | `DOC-01-004` (latent 404 traps) |

### Medium — a day, several files or one API contract

| Fix | Closes |
|---|---|
| Thread `projectId` through ticket get/update/delete + subresources; fix the duplicated loose `ticketInProjectParams` | `BLD-06-003/004/007/040`, `BLD-07-022` |
| Enforce `expiresAt` in every portal-grant read | `BLD-07-030/A06`, advances `BLD-06-006/034` |
| Reject-not-coerce in `ticket.schemas.ts` filters | `BLD-03-002/A02`, `BLD-05-012` |
| Replace hard-coded `'DONE'` with a completed-category lookup | `BLD-04-023/038`, advances `04-027/028/029` |
| `ticketDetailSchema` to carry `assignees` | `BLD-06-008`, `BLD-07-035` |
| Cap `GET /hr/directory` (1000) and `TEAM_LEAVES_CAP` (500) to ≤100 + cursors | `HRM-04-002/003/012`, `HRM-07-001/002` |
| Publish `invalidateHrOrgCaches` + register dashboard metric keys | `HRM-07-003/004/005/015` |
| Collapse `hr:leaves:view`/`:read` and sibling aliases | `HRM-08-005/006`, `HRM-12-008`, unblocks `HRM-13-010` |
| `@Validate` query schemas on three HR controllers + `checkEmail` | `HRM-06-004/005` |
| Sync the frontend KB permission catalog (20 keys vs backend 44) | `DOC-00-D10-A`, `DOC-07-032/033` |
| Merge `/hr/service-delivery` into Cases | `HRM-02-012`, `HRM-00-D05-A`, `HRM-14d-001` |

### Large — multi-day, architectural, or a data model

| Work | Scale |
|---|---|
| **`workLocation` end-to-end (DR-HRM-08)** — **zero occurrences repo-wide** | ~12 HRMS items across `08`, `10`, `13`, `14b`, payroll |
| `GET /kb/pages` list endpoint, retiring tree-as-list | 5+ DOC items |
| Page-share schema + service | `DOC-08-002`, `DOC-14-D-001`, `DOC-10-002`, `DOC-11-006` |
| Unify page ACL through `KbAccessService` (pages and articles use two different functions today) | `DOC-08-001` + its acceptance |
| Sprint/Cycle consolidation | `BLD-00-D03-A`, `BLD-07-001`…`004`, `BLD-10-012` |
| Bulk endpoints — none exist in KB; HR has only `onboard/bulk` | `DOC-05-006`…`009`, `DOC-07-004`; `HRM-05-005`…`010` |
| Build project settings IA — none of the 11 target subroutes exist | `BLD-02B-001`, `BLD-02F-006` |
| Ticket import UI | `BLD-05-015/016/034`, `BLD-05A-008` |

---

## 6. What actually blocks the bulk

Ranked by how many boxes each unblocks — all three dwarf the code work above.

1. **A real browser against a booted stack.** The single largest category.
   `frontend/scripts/browser-journeys.mjs` already wires axe-core, keyboard
   verdicts, contrast-against-painted-colour and overflow checks; it has never
   been run and recorded against Build. This gates most of `BLD-08`, most of
   the `BSN-05` release matrix, `HRM-09`, `HRM-11` and `DOC-11`.
2. **A local Postgres.** `backend/src/scripts/seed-scratch-e2e.mjs` already
   passes its self-test and refuses any non-scratch target; it has never been
   pointed at a database. This gates `BLD-10-007` and the whole `livedb` tier
   (~15 items in `BLD-10` alone), plus the 73-file backend e2e status tier.
3. **Product decisions.** Not engineering tasks; starting them as such wastes
   the day. Largest: the Sprint/Cycle consolidation, `BLD-09-021`'s non-goals
   wording, and the seven `BLD-10-A0x` sign-offs.

⚠ **Do not close the route-census gate by regenerating the snapshot.**
`build-route-census.mjs --check` fails with `recorded=93, actual=92` and a
stale `/build/{projectId}/sprints`. Regenerating makes it green and hides the
open question, which is whether the planning/velocity/complete-sprint
capability was **ported** into `/cycles` or simply deleted with the route. Red
is currently telling the truth. Resolve the port first.

---

## 7. Code changed today

Deliberately confined to quick, low-risk work that unblocks checklist items.

- **`check:test-integrity` is green**, both ratchets from red to 0, self-test
  33 assertions. 12 bare `.toThrow()` sites — each satisfiable by a
  `TypeError` from a mis-shaped double, so each certified nothing — now name
  `ZodError`. 2 tautologies asserting `expect(true).toBe(true)` removed; both
  described code review of a *different* module, and neither closure depended
  on them. This gate is named as acceptance evidence in `BLD-10-067`.
- **Eight tests** pinning `BLD-03-021`, bite-proved against a neutered guard.

Tests run: **13 suites, 125 tests, all passing** — 12 frontend suites (108) and
the backend `workspace-tenant-isolation.spec.ts` (17). `check:prd-traceability`
and its self-test still pass. Nothing here is a browser or database proof.

### Gates still red (unchanged, and not mine)

`check:test-typecheck` (121 errors / 38 files — one Build file is a reserved
packet), `check:file-sizes` (10 over 500), `check:over-300` (34 above
baseline), `check:type-assertions`, `check:permission-binding` and
`check:command-catalog` (16 findings, all outside Build).

⚠ On `check:command-catalog`: `useSubmitReferral` and internal-job application
are flagged as wanting `hr:requisitions:*`, but CLAUDE.md §8 makes referrals
and internal job openings **universal self-service**. The correct key may be
neither what the hook declares nor what the vendored contract asks for. That
is a product rule to settle before any mechanical fix.
