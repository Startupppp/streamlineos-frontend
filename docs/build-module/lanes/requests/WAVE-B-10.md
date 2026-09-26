# Wave-B-10 requests

## Request 1: Chat notification persistence — inbox cannot see chat mentions

**Filed by:** Wave-B-10 (command-center + inbox)
**Affects:** `frontend/features/build/inbox`, `backend/src/modules/notifications/notifications.service.ts`, `backend/src/modules/chat/`
**Owner:** Wave-B-12 (chat module)

**Issue:** Chat uses Ably for real-time delivery (`useChatGlobalNotifications`). The chat module never calls `notifications.service.create`, so no row lands in the `notifications` table. `GET /notifications?sourceModule=build` returns zero results for chat mentions. The Build inbox shows "All caught up" when a user has received only chat mentions. The inbox cannot distinguish "no events" from "events never persisted."

**Evidence:** `backend/src/modules/notifications/notifications.service.ts` line 120 skips web-push for chat (`if (input.sourceModule === "chat") return;` inside `pushToDevice`), but chat never reaches that path at all — it uses Ably directly and bypasses `notifications.service.create` entirely.

**Ask:**
1. In the chat module (`@mention` event path), call `notifications.service.create` with `sourceModule: "chat"`, `category: "MENTIONS"`, and a stable `dedupKey` so re-delivery of the same message does not create duplicate rows.
2. Confirm that `GET /notifications?sourceModule=chat` returns these rows so a future chat-scoped inbox or the unified inbox can surface them.
3. The Build inbox currently reads `sourceModule: "build"` only. If chat mentions should appear in the Build inbox, either extend the query to `sourceModule IN ('build', 'chat')` or use the unified inbox endpoint.

Until this lands, the C3 row "chat notification type is visible in the inbox" cannot be satisfied.

---

## Request 2: Leave approval double-count in unified inbox

**Filed by:** Wave-B-10 (command-center + inbox)
**Affects:** `backend/src/me/unified-inbox.service.ts`, `backend/src/modules/hr/time/hr-time-approval.adapter.ts`, `backend/src/modules/hr/time/leaves-write.service.ts`
**Owner:** HR module / unified inbox owner

**Issue:** Two independent paths both contribute leave items to `GET /me/inbox/unified`:
1. `dispatchLeaveRequested` persists a `notifications` row with `dedupKey: "notification:{leaveId}"`.
2. `HrTimeApprovalAdapter.fetchLeaves` reads `leave_requests` directly, adding items with `dedupKey: "approval:leave:{leaveId}"`.

These two `dedupKey` namespaces are distinct strings, so the unified inbox merges them without collision detection, doubling every leave approval item visible to approvers.

**Ask:** One of:
- Option A: Remove the `dispatchLeaveRequested` notification row from the unified inbox merge, keeping only the `ApprovalAdapter` path (preferred: single source of truth for leave approvals in inbox).
- Option B: Normalize `dedupKey` prefixes in the unified merge layer so `"notification:{id}"` and `"approval:leave:{id}"` for the same leave request resolve to a single item.
- Option C: Stop `HrTimeApprovalAdapter.fetchLeaves` from reading rows that already have a corresponding `notifications` row.

The Build inbox (`GET /notifications?sourceModule=build`) is **not affected** because leave items have `sourceModule: "hr"`.

---

## Request 3: Inbox URL param naming alignment with spec

**Filed by:** Wave-B-10 (command-center + inbox)
**Affects:** `docs/build-module/10-inbox.md`, `frontend/features/build/inbox/use-inbox-url-state.ts`

**Issue:** The spec (`10-inbox.md`) declares URL params as `unread` and `projectId`. The implementation uses `section` and `project`. These are not just naming differences — a deep-linked URL from the spec (`?unread=true`) will not match the hook's param name (`section`).

**Ask:**
- Either update the spec to reflect the implementation param names (`section`, `project`), or
- Update `use-inbox-url-state.ts` to read `unread` (mapping truthy value to `section: "UNREAD"`) and `projectId` (aliasing to `project` internally).

The current implementation is self-consistent; the spec is stale. Recommend updating the spec unless deep-linkable URLs with the old names are already in use.

---

## Request 4: Command center missing features

**Filed by:** Wave-B-10 (command-center + inbox)
**Affects:** `docs/build-module/10-command-center.md`, `frontend/features/build/command-center/command-center-page.tsx`, `frontend/features/build/command-center/use-keyboard-shortcuts.ts`

**Issue:** The following spec items are listed as "core fields" or URL params for the Command Center but have no implementation:

**Core fields not implemented:**
- `approvals`: no approvals panel in `command-center-page.tsx`
- `risks`: no risks panel
- `releases`: no releases panel
- `agent runs`: no agent-runs panel

**URL params not implemented:** `scope`, `owner`, `health`, `due`, `view` — `command-center-page.tsx` has no `useSearchParams` call; none of these params are read.

**Keyboard shortcuts not implemented:** `/` (search focus), `j/k` (move), `Enter` (open), `e` (edit), `Esc` (close), `?` (shortcut help). Only two-key chords (`c+p`, `c+t`, `g+m`, `g+p`) exist in `use-keyboard-shortcuts.ts`.

**Ask:** Prioritize based on product roadmap. P0 ask: add at least the `scope` URL param (org vs. my work toggle) since it gates the personal-queue vs. cross-project view. P1: approvals panel (high-visibility, actionable). P2: remaining panels and shortcuts.

Until these land, C3 for the Command Center cannot be ticked.
