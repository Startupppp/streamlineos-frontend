# AI Actions Result Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance shared `AiActionsMenu` with `inline` | `popover` | `sheet` | `dialog` result surfaces, migrate Create Issue / Project / Ticket / Support consumers, and replace precondition `Promise.reject` with `disabledReason` gating.

**Architecture:** Extract shared `AiActionResultBody` for overlay/popover content; add `AiInlinePreview` for form hosts; extend `AiAction` with `surface`, `disabledReason`, `onInlineChange`; `AiActionsMenu` resolves surface per action and routes loading/quota/denied/error/ready to the same surface. Unmigrated callers default to `sheet`.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, shadcn Sheet/Dialog/ResponsivePopover, existing AI components (`AiDraftCard`, `AiQuotaEmptyState`, `AiPermissionDenied`).

---

### Task 1: Shared result body + inline preview

**Files:**
- Create: `frontend/components/ai/ai-action-result-body.tsx`
- Create: `frontend/components/ai/ai-inline-preview.tsx`
- Modify: `frontend/components/ai/index.ts`

- [ ] **Step 1:** Add `AiActionResultState` union and `AiActionResultBody` — skeleton, quota, denied, error+retry, ready with `AiDraftCard`.
- [ ] **Step 2:** Add `AiInlineSession` type and `AiInlinePreview` — compact band with Replace/Reject, `AiUsageChip`, preview modes `title` | `description` | `fields`.
- [ ] **Step 3:** Export new types/components from `index.ts`.

### Task 2: `AiActionsMenu` presentation modes

**Files:**
- Modify: `frontend/components/ai/ai-actions-menu.tsx`

- [ ] **Step 1:** Extend `AiAction` / props: `AiResultSurface`, `defaultSurface`, `disabledReason`, `onInlineChange`.
- [ ] **Step 2:** `disabledReason` on menu items — no `run` when set; show muted reason under label.
- [ ] **Step 3:** Inline path — push `AiInlineSession` via `onInlineChange`; dev console error if missing; cleanup on unmount.
- [ ] **Step 4:** Popover path — `ResponsivePopover` anchored to trigger; max-h scroll; `min(24rem, viewport)` width.
- [ ] **Step 5:** Sheet + Dialog paths — reuse `AiActionResultBody`; default `defaultSurface ?? "sheet"`.
- [ ] **Step 6:** Apply/dismiss closes active overlay; inline apply/reject clears session.

### Task 3: Create Issue inline host

**Files:**
- Modify: `frontend/features/projects/ai/create-ticket-ai-menu.tsx`
- Modify: `frontend/features/projects/tickets/create-ticket-dialog.tsx`

- [ ] **Step 1:** `CreateTicketAiMenu` — all actions `surface: "inline"`; `disabledReason` gating; remove `Promise.reject`; wire three `onInlineChange` callbacks.
- [ ] **Step 2:** `create-ticket-dialog` — state for title/description/fields sessions; render `AiInlinePreview` bands; reject on dialog close.

### Task 4: Project + Ticket + Support surfaces

**Files:**
- Modify: `frontend/features/projects/ai/project-ai-menu.tsx`
- Modify: `frontend/features/projects/ai/ticket-ai-menu.tsx`
- Modify: `frontend/features/support/inbox/ticket-detail-header.tsx`

- [ ] **Step 1:** Project — sheet for summary/risks/weekly; popover for ask.
- [ ] **Step 2:** Ticket — popover for summarize/improve/subtasks; sheet for handoff.
- [ ] **Step 3:** Support — `defaultSurface="popover"`.

### Task 5: Verify

- [ ] **Step 1:** `pnpm -C frontend exec tsc --noEmit`
- [ ] **Step 2:** `pnpm -C frontend lint`
- [ ] **Step 3:** Manual acceptance per spec (New Issue inline, Project/Ticket surfaces, unmigrated Sheet regression).
