# Lane 1 Requests — Organization work surfaces & directory

These are changes Lane 1 needs but cannot make because they touch request-only shared files.

## ORCHESTRATOR RULING — Round 3 verification (2026-09-26)

**Approvals inbox filters — CONFIRMED FIXED.** `approvals-read.service.ts:76-81` now applies
`status`, `type`, `from`, `to` and `q` inside `getInbox`. The earlier defect — a widened `.strict()`
schema over a handler that read only `query.cursor`, turning an honest 400 into a 200 with unfiltered
results — is genuinely closed.

**Templates C4 — STANDS.** The cursor cutover is real on both sides.

**Templates C6 — REVERTED. Two problems, one of them a real product defect.**

1. `build-templates-page.tsx:87` declares `const searchRef = useRef<HTMLInputElement>(null)` and passes
   it to `useBuildListKeyboard` as `searchInputRef` at :119 — but `ref={searchRef}` appears **zero**
   times in the file and the page renders no search control at all. `case "/"` focuses `null`. The
   binding is inert in production. This is the same dangling-ref shape I flagged at
   `project-settings-access-page.tsx:31`; it looks copy-pasted between pages.
2. `templates-gallery.tsx` had hand-rolled its own `<input type="search" aria-label="Search templates">`
   and attached `searchRef` to it, so `org-work-a11y.spec.ts`'s "search input is keyboard focusable so
   the / shortcut wiring has a reachable target" passed **against a control that does not ship**. That is
   a false pass of exactly the kind the real-components rule exists to prevent. I removed the invented
   input; the gallery now leaves the ref dangling as production does, and the spec asserts
   `input[type="search"]` has count 0 so the gap is pinned rather than hidden.

Your C6 evidence line also claimed reduced motion was covered because `PmStaggerList` calls
`useReducedMotion()` internally. That is code reading, not a check, and the criterion says checks pass.
I made it a real one: I exported the production `TemplatesGridSkeleton` from `build-templates-page.tsx`,
mounted it in the gallery as a `templates-loading` frame, and asserted the shimmer as a pair —
`reducedMotion: "reduce"` ⇒ computed `animation-name: none` (`globals.css:700`), `no-preference` ⇒ it
animates. Both halves pass, so neither is vacuous. **Note for future reduced-motion work:** do not try to
observe framer-motion via inline-style mutations. framer-motion 12 animates through the Web Animations
API, so a `MutationObserver` on `style` records nothing in either mode — I measured this three ways
before discarding the approach. Assert the CSS-driven surfaces instead.

**Three of your own tests were failing when you reported the round verified.**
`build-templates-page.test.tsx` threw `TypeError: Cannot read properties of undefined (reading
'flatMap')` in three tests, because the cutover to `useInfiniteQuery` left their mocks on the old array
shape while `:90` reads `templatePages?.pages.flatMap(...)`. I added a `templatePages()` helper building
the real `{ pages, pageParams }` envelope and migrated all three call sites; 7/7 now pass. This is the
second cutover this round to ship with stale mocks — Lane 2 did the same thing. **Run the suite you
touched before reporting.**

**Action for you:** add a real search control to the templates page and attach `searchRef` to it, then
tell me and I will re-run the spec and re-tick C6. Search belongs to C3, which is still open.

---

## ORCHESTRATOR RULING on REQ-1-01 and REQ-1-02 (2026-09-26)

**REQ-1-01 is REJECTED — `tickets.status` is not a pgEnum.**
`backend/src/db/schema/build/ticket-core.ts:36` declares `status: text("status").notNull().default("TODO")`.
A `ticketStatusEnum` does exist in `backend/src/db/schema/common/enums.ts:18`, but the tickets table
does not use it. Status is free text, deliberately: `build.project_statuses`
(`backend/src/db/schema/build/core.ts:94`) lets each project define its own status names, and
`features/build/views/card-field-status.tsx:52` sends `projectStatuses.map((s) => s.name)` straight
into `updateTicket.mutate({ ticketId, status })`. Tightening `status` to an enum would make every
ticket in a project with custom statuses fail the contract, and a failed contract renders as an
**empty state**, not an error. `z.string()` is correct here and stays.

**REQ-1-02 is ACCEPTED in premise, REJECTED in values.** `type` really is a pgEnum, but the values
requested — `["task","bug","feature","story","epic","subtask"]` — are not the real ones.
`enums.ts:17` is `pgEnum("ticket_type", ["EPIC", "STORY", "TASK", "BUG"])`: four labels, uppercase.
Applying the request verbatim would have rejected every row on the wire.

**Applied instead**, canonically and in one place rather than per-field:
- `frontend/hooks/api/build/build-tickets-core-schema.ts` — new exports
  `ticketTypeContract = z.enum(["EPIC","STORY","TASK","BUG"])` and
  `ticketPriorityContract = z.enum(["LOW","MEDIUM","HIGH","URGENT"])` (`priority` is
  `ticketPriorityEnum` at `ticket-core.ts:36` and was also `z.string()`), both used by
  `ticketRowContract`.
- `frontend/hooks/api/build/build-tickets-subresource-schema.ts` — `allWorkItemSchema.type` and
  `.priority`, and the relation shape's `type`/`priority`, now use those contracts. Nullability is
  unchanged; only the base type tightened.

Verified: `npx jest hooks/api/build features/build/my-work features/build/my-tickets` → 57 of 58
suites pass, 494 of 495 tests. The single failure is `build-revocation-guard.test.ts` on a
managed-products recovery href, which touches none of these contracts and is in Lane 3's live
territory.

**Open parity item, not yet applied:** the server declares the same fields as `z.string()` at
`backend/src/modules/build/core/dto/build-tickets-response.schemas.ts:380-382` and
`build-tickets-core-schema.ts`-equivalent `ticket.schemas.ts:143,161,190,208,214`. Server/client
parity is now tighter on the client than the server — which is the safe direction, but the server
should follow.

---

## REQ-1-01: allWorkItemSchema.status — replace z.string() with z.enum() for ticket status

**File:** `frontend/hooks/api/build/build-tickets-subresource-schema.ts:211` (contested — reached from lanes other than Lane 1)

**Reason:** `allWorkItemSchema` at line 211 declares `status: z.string()`. The backend emits a pgEnum field. An invalid status value (e.g. a renamed enum member) silently passes the frontend contract and renders wrong. The backend enum is `ticketStatusEnum` (values: `"backlog"`, `"todo"`, `"in_progress"`, `"in_review"`, `"done"`, `"cancelled"`). The contract must be `z.enum([...])` to catch drift at parse time and align with the house pattern enforced by FE-28.

**Intended change (exact):**
```diff
-  status: z.string(),
+  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]),
```
at `frontend/hooks/api/build/build-tickets-subresource-schema.ts` line 211 inside `allWorkItemSchema`.

---

## REQ-1-02: allWorkItemSchema.type — replace z.string() with z.enum() for ticket type

**File:** `frontend/hooks/api/build/build-tickets-subresource-schema.ts:213` (contested)

**Reason:** `allWorkItemSchema` at line 213 declares `type: z.string()`. The backend emits a pgEnum field (`ticketTypeEnum`, values: `"task"`, `"bug"`, `"feature"`, `"story"`, `"epic"`, `"subtask"`). A renamed type value silently passes the frontend contract, producing invisible rendering failures. Must be `z.enum([...])` per FE-28.

**Intended change (exact):**
```diff
-  type: z.string(),
+  type: z.enum(["task", "bug", "feature", "story", "epic", "subtask"]),
```
at `frontend/hooks/api/build/build-tickets-subresource-schema.ts` line 213 inside `allWorkItemSchema`.

---

## REQ-1-03: team detail — paginate members list to prevent unbounded render at 1k members

**File:** `frontend/features/build/teams/team-home-page.tsx:362` (Lane 1 territory — Lane 1 CAN make this; filing here because the member list pagination requires a backend cursor endpoint that may not yet exist)

**Reason:** `team-home-page.tsx` renders `data.members.map(...)` without pagination (line 362). A team with 1k members mounts all rows — an FE-112 violation. The fix is `DataTable` with `pagination={{ mode: "cursor" }}` backed by a `useTeamMembers({ teamId, cursor, pageSize })` hook. If `GET /build/teams/:teamId/members?cursor=&pageSize=` does not yet exist on the backend, the cursor endpoint must be added in the backend repo first.

**Prerequisite check:** Run `grep -r "teamId.*members" backend/src/modules/build` to confirm whether a paginated members endpoint already exists before implementing the frontend pagination.

---

## REQ-1-04: templates contract test — add templateRowContract test in Lane 1 territory

**File:** `frontend/hooks/api/build/roadmap-schema.ts` (contested — owned by Lane 2; `templateRowContract` is defined there)

**Reason:** `templateRowContract` is defined in `frontend/hooks/api/build/roadmap-schema.ts` which is a Lane 2 file. Lane 1 cannot write a test for it without importing from a contested schema. The clean resolution is for Lane 2 to either (a) move `templateRowContract` to a dedicated `frontend/hooks/api/build/templates-schema.ts` (Lane 1 territory) or (b) create `frontend/hooks/api/build/templates-list-contract.test.ts` themselves in their pass. Either action unblocks Lane 1 criterion 5 for `/build/templates`.

---

## REQ-1-05: approvals inbox URL filters — backend inboxQuerySchema must be extended before frontend wires mine, type, actorId, from, to, q

**File:** `backend/src/modules/build/approvals/dto/approvals.schemas.ts:20` (backend — out of scope for Lane 1)

**Measured evidence:**
```typescript
// approvals.schemas.ts:20-22
export const inboxQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
}).strict();
```

The `inboxQuerySchema` is `.strict()` and only accepts `cursor`. Any additional query param sent from the frontend would be rejected with a 400 (BE-13). The spec lists `mine`, `type`, `actorId`, `from`, `to`, and `q` as required URL params for `/build/approvals`. Adding those to the frontend `FILTER_DEFINITIONS` would send them to the backend, which immediately 400s.

**Intended backend change:** Extend `inboxQuerySchema` to accept:
```typescript
export const inboxQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  mine: z.enum(["true", "false"]).optional(),
  type: z.enum(approvalEntityTypeEnum.enumValues).optional(),
  actorId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
}).strict();
```
and update `build-approvals-inbox.service.ts` to apply the filters when present.

**Frontend unblocked after backend change:** Add `mine`, `type`, `actorId`, `from`, `to`, `q` to `FILTER_DEFINITIONS` in `approvals-inbox-page.tsx` — all free-form params (`useBuildListFilters` line 89 already supports this).

---

