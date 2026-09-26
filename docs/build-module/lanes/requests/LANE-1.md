# Lane 1 Requests — Organization work surfaces & directory

These are changes Lane 1 needs but cannot make because they touch request-only shared files.

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

