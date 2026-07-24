# AI Actions Result Surface — Design Spec

**Date:** 2026-07-24  
**Scope:** Shared `AiActionsMenu` presentation modes + Project / Ticket / Create Issue / Support AI consumers  
**Status:** Ready for user review (no implementation yet)  
**Living rule:** Constitution §15 — inline AI via `AiActionsMenu`, draft-first Apply; credit-metered; `useCan`-gated

---

## Problem

`AiActionsMenu` always opens a **Sheet** with `AiDraftCard` for every action result. That breaks New Issue UX (Sheet stacks behind / fights the Create Ticket Dialog) and is oversized for short drafts (suggested title, field suggestions). Create Issue also validates preconditions by `Promise.reject` inside `run*`, which surfaces as an error Sheet instead of preventing the click.

---

## Goals

1. One shared `AiActionsMenu` API with **presentation modes** — no Create-Ticket-only fork.
2. Field-targeted drafts apply via **inline Replace / Reject** next to the field.
3. Short / scan-friendly results use a **Popover** anchored to the AI trigger.
4. Long / multi-section / apply-heavy results may use **Sheet or Dialog** only when that overlay is the *only* AI result surface (never stacked behind New Issue).
5. Invalid menu options are **disabled with a short reason** — no click, no error Sheet.
6. Loading / quota(402) / permission(403) / generic errors stay in the **same result surface** as success.

## Non-goals

- New AI backend endpoints or credit model changes.
- Visual companion / mockups.
- Kanban board / virtualization work.
- Per-module forks of `AiActionsMenu`.
- Changing which actions exist (labels, hooks, permissions) beyond surface + disabled gating.

---

## Approved interaction model

| Kind | Surface | Apply UX |
|------|---------|----------|
| Field-targeted (title, description, typed field patch) | Inline preview next to / under the target field | **Replace** / **Reject** (or reject by dismiss) |
| Short / scan-friendly text | Popover anchored to AI button | `AiDraftCard` Apply when `onApply` exists; else copy/dismiss |
| Long / multi-section / apply-heavy | Sheet **or** Dialog (caller chooses) | `AiDraftCard` Apply / dismiss |
| New Issue (`CreateTicketAiMenu`) | **Inline-only** — never Sheet/Dialog | Field Replace / Reject via per-field sparkles triggers |
| Project AI long drafts | Sheet or Dialog OK (page has no competing form overlay) | Apply where defined; most Project actions are read-only drafts |

---

## Architecture — `AiActionsMenu`

### Presentation modes

Extend `AiAction` and menu props so each action (or the menu default) declares how results appear:

```ts
type AiResultSurface = "inline" | "popover" | "sheet" | "dialog";

interface AiAction {
  key: string;
  label: string;
  description?: string;
  run: () => Promise<AiActionResult>;
  onApply?: (text: string) => void;
  applyLabel?: string;
  surface?: AiResultSurface;
  disabledReason?: string;
  onInlineChange?: (session: AiInlineSession | null) => void;
}

interface AiActionsMenuProps {
  actions: AiAction[];
  triggerLabel?: string;
  menuLabel?: string;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
  asSubmenu?: boolean;
  defaultSurface?: AiResultSurface;
}
```

**Prop semantics**

- `surface` — per-action override; falls back to `defaultSurface`, then `"sheet"` (preserves unmigrated callers).
- `disabledReason` — when non-empty, item is disabled, reason shown as muted `text-[11px]` under the label (same slot as `description`), and `run` must not be called. Prefer this over tooltip-only (disabled items are easy to miss with hover-only hints).
- `onInlineChange` — required when `surface === "inline"`. Called with a session on every status transition, and with `null` when the session is cleared (Reject, successful Apply, or menu teardown). If missing for an inline action, skip `run` and log an error in development.
- `onApply(text)` — used by Apply/Replace. Field-patch actions (e.g. priority/labels) may ignore `text` and apply from a closure/ref (today’s `lastFieldsRef` pattern); the menu still invokes `onApply` as the Apply trigger.

### `AiInlineSession` (shared helper contract)

```ts
interface AiInlineSession {
  actionKey: string;
  status: "loading" | "ready" | "quota" | "denied" | "error";
  result?: AiActionResult;
  errorMessage?: string;
  deniedReason?: string;
  apply: () => void;
  reject: () => void;
  retry: () => void;
}
```

Host responsibility (e.g. Create Ticket Dialog):

- On each `onInlineChange(session)`, store session in local state keyed by field (`title` | `description` | `fields`). `null` clears that field’s band.
- Render a compact preview band under/beside that field while session is non-null.
- On dialog close/unmount, call `session.reject()` if a session is active (or rely on menu unmount sending `null`). Invalidating the draft when the user heavily edits the field is optional; minimum is Reject + unmount cleanup.

`AiActionsMenu` still owns: calling `run`, mapping 402/403/errors, retry wiring. For inline mode it does **not** open Popover/Sheet/Dialog; it only pushes session updates through `onInlineChange`.

### Surface rendering rules inside `AiActionsMenu`

1. Resolve surface: `action.surface ?? defaultSurface ?? "sheet"`.
2. **popover** — `Popover` / `ResponsivePopover` anchored to the trigger button (not the menu item). Content reuses the same inner body as today’s Sheet (skeleton, quota, denied, error+retry, `AiDraftCard`). Cap max height; scroll inside. Width ~`min(24rem, viewport)`.
3. **sheet** — current Sheet behavior (unchanged chrome).
4. **dialog** — centered Dialog with the same body as Sheet; use when the page already uses Dialog density and Sheet would feel wrong. Never open if a parent Dialog is already open for the same workflow (Create Issue forbids this by using inline-only).
5. **inline** — no overlay; require `onInlineChange`. If missing in dev, fail loudly (console error / no-op run).

### Overlay stacking rule (hard)

- Never open AI Sheet/Dialog **while** New Issue Dialog is open.
- Create Issue actions must all use `surface: "inline"` (enforced in `CreateTicketAiMenu`, not by guessing at runtime).
- Popover on Create Issue is also forbidden for field-targeted actions (approved: inline Replace/Reject). Popover may only be used for Create Issue if a future non-field, short, non-apply action is added — out of scope today.

### Default for existing callers

Unmigrated callers keep `defaultSurface: "sheet"` so Support, HR, CRM, KB, etc. do not regress. Migration of those callers to popover/sheet rules is **encouraged but not required** in this change set except where listed under Files Impacted.

---

## New Issue — inline preview UX

**Host:** `create-ticket-dialog.tsx` + `useCreateTicketAi` (`create-ticket-ai-menu.tsx`).

### Field-level triggers (not header menu)

Each AI action is a compact sparkles trigger (`AiFieldTrigger`) at the **end of its target field**, gated by `projects:ai:use`. No centralized header dropdown.

| Action | Trigger placement | Enable when |
|--------|-------------------|-------------|
| Suggest title | End of title input | Project selected + description plain text |
| Improve description | Top-right of description editor | Project selected + title or description |
| Suggest priority & labels | End of properties row | Project selected + title or description |

Click runs the mutation and shows an **inline Replace/Reject band** under that field (`AiInlinePreview`). Never Sheet/Popover for these three.

### Actions → surfaces

| Action | Surface | Target field | Apply |
|--------|---------|--------------|-------|
| Suggest title | `inline` | Title input | Replace title / Reject |
| Improve description | `inline` | Description editor | Replace description HTML / Reject |
| Suggest priority & labels | `inline` | Fields row (priority / points / labels) | Apply patch / Reject |

### Disabled gating (no reject-in-`run`)

Remove `Promise.reject` precondition paths from `run*`. Instead set per-action `disabledReason` on each field trigger:

| Action | Condition | `disabledReason` |
|--------|-----------|------------------|
| All | `projectId == null` | `"Select a project first"` |
| Suggest title | No description plain text | `"Add a description first"` |
| Improve description | No title and no description | `"Add a title or description first"` |
| Suggest fields | No title and no description | `"Add a title or description first"` |
| Any | Form submit/upload pending | Trigger disabled (no tooltip) |

When `disabledReason` is set, the field trigger is disabled and shows the reason via tooltip (`title` fallback). Do not open any result surface.

### Inline preview chrome

Compact band (not a second card wrapping the whole form):

- Loading: 2–3 line skeletons in the band.
- Ready: draft text (title = single line truncate+expand; description = scrollable HTML/plaintext preview capped ~8rem; fields = short summary lines + rationale).
- Quota / denied / error: same shared empty/denied/error components scaled to the band; Retry where applicable.
- Actions: primary **Replace** / **Apply suggestions** (`LoadingButton` only if apply itself is async — today apply is sync form setValue); secondary **Reject**.
- `AiUsageChip` when `aiUsage` present.
- Reject clears the band; Replace calls existing `onApplyTitle` / `onApplyDescription` / `onApplyFields` then clears.

### Trigger placement

Field-level sparkles at end of title, description editor, and properties row. Header has no AI menu.

---

## Project AI — header dropdown removed

**Previous host:** `project-ai-menu.tsx` (deleted). The project board/detail header **no longer** shows an AI dropdown — users reach project AI via the dedicated **AI Assistant** page (`/projects/[projectId]/ai`, sidebar nav under Configure).

Ticket detail still uses `TicketAiMenu` (popover/sheet per action). Out of scope for this slice: re-surface Project AI actions elsewhere.

---

## Ticket AI & Support AI

### Ticket AI (`ticket-ai-menu.tsx`) — this slice

| Action | Surface |
|--------|---------|
| Summarize | `popover` |
| Improve description | `popover` + Apply → `onApplyDescription` |
| Suggest subtasks | `popover` |
| Handoff summary | `sheet` |

Create Issue is the **must-ship** inline host in this slice. Ticket Improve stays popover+Apply so we do not block on wiring a description inline band into ticket detail / submenu contexts. A follow-up may move Improve to `inline` once the detail editor hosts `onInlineChange`.

### Support AI (`ticket-detail-header.tsx`) — this slice

Set `defaultSurface="popover"` for the Support header menu. Keep existing `onApply` insert-into-composer behavior. Do **not** require composer inline bands in this slice (same follow-up as Ticket Improve). Action set unchanged.

---

## Error, disabled, and loading states

| State | Where it appears | Behavior |
|-------|------------------|----------|
| Disabled menu item | Dropdown item | Grayed; `disabledReason` visible; no `run` |
| Loading | Same surface as the action (inline band / popover / sheet / dialog) | Skeletons |
| Ready | Same surface | `AiDraftCard` or inline band |
| 402 quota | Same surface | `AiQuotaEmptyState` |
| 403 permission | Same surface | `AiPermissionDenied` |
| Other errors | Same surface | `getErrorMessage` + Retry |
| Global menu `disabled` | Trigger button | Existing |

Never toast precondition failures. Never open Sheet solely to show “Add a title first”.

---

## Files impacted

### Must change

| File | Change |
|------|--------|
| `frontend/components/ai/ai-actions-menu.tsx` | Presentation modes; popover/dialog/inline; `disabledReason`; shared result body extract |
| `frontend/components/ai/index.ts` | Export any new types (`AiResultSurface`, `AiInlineSession`) |
| `frontend/features/projects/ai/create-ticket-ai-menu.tsx` | `surface: "inline"`; `disabledReason`; remove reject-in-`run`; wire `onInlineChange` |
| `frontend/features/projects/tickets/create-ticket-dialog.tsx` | Inline preview bands for title / description / fields |
| `frontend/features/projects/ai/project-ai-menu.tsx` | Per-action `surface` (sheet/popover as table above) |
| `frontend/features/projects/ai/ticket-ai-menu.tsx` | Per-action `surface` |

### Should change (same PR if low-risk)

| File | Change |
|------|--------|
| `frontend/features/support/inbox/ticket-detail-header.tsx` | `defaultSurface="popover"` + field-targeted Apply stays |

### Out of scope / do not touch

- Kanban / react-window files.
- Backend AI modules.
- Unlisted module menus (HR, CRM, KB, etc.) beyond default Sheet backward compatibility — optional follow-up to set `popover` where drafts are short.

### Possible small extract (only if file exceeds ~300–500 lines)

- `frontend/components/ai/ai-action-result-body.tsx` — shared loading/quota/denied/error/ready body used by Popover, Sheet, Dialog, and optionally inline band.
- `frontend/components/ai/ai-inline-preview.tsx` — reusable inline Replace/Reject band for form hosts.

---

## Implementation constraints

- Strict TypeScript; no `any` / cast hacks.
- Reuse `AiDraftCard`, `AiQuotaEmptyState`, `AiPermissionDenied`, `getErrorMessage`, `isApiError`, `LoadingButton`, `useAnimatedIcon` / Sparkles trigger patterns.
- Mobile: Popover uses existing `ResponsivePopover` (Drawer `< md`) for non-inline surfaces when the result is popover-mode — except Create Issue remains inline-only (no Drawer stacked on Dialog).
- Prefer-reduced-motion respected via existing animate utilities.
- No new comments in code; no speculative abstractions beyond the session + result-body split above.
- RBAC unchanged: still `useCan("projects:ai:use")` (and Support’s existing gates) at menu mount; 403 still handled in-surface.

---

## Testing / acceptance

1. **New Issue:** With empty title+description, AI items show disabled reasons; no Sheet opens.
2. **New Issue:** With content, Suggest title shows inline band under title; Replace fills input; Reject clears band; Dialog never gains a Sheet sibling.
3. **New Issue:** Improve description / Suggest fields same pattern on their fields.
4. **Project AI:** Weekly update / health / risks open Sheet; Ask opens Popover; loading and 402 render inside that surface.
5. **Ticket AI:** Summarize / improve / subtasks popover; handoff sheet; improve Apply still updates description.
6. **Regression:** A caller that does not pass `defaultSurface` still gets Sheet (KB/HR/CRM smoke).
7. Build + lint + types green; update `PAGES.md` only if a named page audit entry exists for these surfaces.

---

## Rollout order (for later implementation plan)

1. Extract shared result body + add `surface` / `disabledReason` / inline session to `AiActionsMenu` with default Sheet.
2. Migrate `CreateTicketAiMenu` + dialog inline bands.
3. Migrate `ProjectAiMenu` + `TicketAiMenu` surfaces.
4. Support header popover default.
5. Verify unmigrated callers still Sheet.

---

## Open questions (resolved)

| Question | Decision |
|----------|----------|
| Fork vs enhance shared menu? | Enhance shared `AiActionsMenu` |
| Visual companion? | Declined |
| Create Issue Sheet? | Never — inline only |
| Auto-pick surface by string length? | No — caller declares per action |
| Commit design before user review? | Spec written for review; commit only if user asks |
