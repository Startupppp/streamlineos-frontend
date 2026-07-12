# CRM Leads Frontend Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all hardcoded status/priority/source color maps in the CRM leads fence to the live metadata system (CrmOptionBadge + resolveOption), purge all violet/purple classes (replace with blue-family), wire getErrorMessage to all toast.error(err.message) call sites, split two over-500-line files, and add animated icons + LoadingButton to interactive surfaces.

**Architecture:** All changes are strictly within `frontend/features/crm/leads/**` and `frontend/app/(authenticated)/crm/leads/**`. Read-only shared references: `features/crm/shared/metadata/` (CrmOptionBadge, CrmOptionSelect, getCrmTokenClasses, resolveOption), `hooks/api/crm/metadata.ts` (useCrmOptions, resolveOption), `hooks/common/use-animated-icon.ts`, `components/ui/loading-button.tsx`. The metadata hook returns `CrmOption[]` — each option has `key`, `label`, `color` (a CrmColorToken string like "blue"|"amber"|"violet"), `id`, `sortOrder`, `isActive`. `getCrmTokenClasses(color)` returns `{ badgeClass, dotClass, textClass, chartHex }`. `CrmOptionBadge` renders a styled badge from an option. `resolveOption(options, key)` falls back to `{key, label: key, color: "slate"}`.

**Tech Stack:** Next.js App Router, TypeScript strict, TanStack Query v5, Tailwind CSS, shadcn/ui, @animateicons/react/lucide, lucide-react (fallback only).

---

## File Map

Files to **modify**:
- `frontend/features/crm/leads/lead-table/types.ts` — delete STATUSES, STATUS_COLORS, PRIORITY_COLORS, SOURCE_COLORS exports (keep PRIORITIES, ALL_COLUMNS, PAGE_SIZES, LOST_REASONS, formatters)
- `frontend/features/crm/leads/lead-table/lead-columns.tsx` — swap hardcoded badge/select rendering to CrmOptionBadge + useCrmOptions; purge STATUS_COLORS/PRIORITY_COLORS/SOURCE_COLORS imports
- `frontend/features/crm/leads/lead-table/lead-actions.tsx` — swap STATUSES/PRIORITIES iteration to useCrmOptions; animated icons on row-action buttons
- `frontend/features/crm/leads/leads-toolbar.tsx` — remove FALLBACK_STATUSES; metadata-only filter options
- `frontend/features/crm/leads/leads-kanban.tsx` — QUALIFIED fallback color "violet" → "blue"
- `frontend/features/crm/leads/kanban-card.tsx` — purge SOURCE_COLORS purple entry (website: purple → blue); replace FALLBACK_STATUSES usage with metadata-aware next-stage logic; animated icons on row action buttons; LoadingButton where needed
- `frontend/features/crm/leads/lead-detail-sheet.tsx` — remove FALLBACK_STATUS_CONFIG; use CrmOptionBadge + resolveOption for status badge and statusList construction; ACTIVITY_TYPES static array → useCrmOptions("activity_type"); animated icons on Edit button
- `frontend/features/crm/leads/detail/lead-types.ts` — STATUS_STYLES QUALIFIED violet → blue; TIMELINE_ICONS task purple → blue; PRIORITY_STYLES no change (red/orange/sky are semantic)
- `frontend/features/crm/leads/detail/lead-quick-actions.tsx` (512 lines) — split into `lead-quick-action-buttons.tsx` (action toggle buttons) + `lead-quick-action-forms.tsx` (form panels); purge purple/violet ACTION_BUTTONS colors and Draft button bg; animated icons on toggle buttons; LoadingButton on submit buttons
- `frontend/features/crm/leads/lead-activity-tab.tsx` — email icon bg purple → blue
- `frontend/features/crm/leads/lead-followup-tab.tsx` — email task icon bg purple → blue
- `frontend/features/crm/leads/leads-funnel-view.tsx` — INTERESTED gradient/bg violet → blue
- `frontend/features/crm/leads/ai-email-dialog.tsx` — `toast.error(err.message || ...)` → `toast.error(getErrorMessage(err))`
- `frontend/features/crm/leads/ai-score-button.tsx` — `toast.error(err.message || ...)` → `toast.error(getErrorMessage(err))`
- `frontend/features/crm/leads/lead-distribution-dialog.tsx` — `toast.error(err.message)` → `toast.error(getErrorMessage(err))`; LoadingButton on Distribute Now button
- `frontend/features/crm/leads/csv-upload-dialog.tsx` (505 lines) — split into `csv-upload-step-upload.tsx` (drop zone UI) + keep main dialog as orchestrator; `toast.error(err.message)` → `toast.error(getErrorMessage(err))`

Files to **create**:
- `frontend/features/crm/leads/detail/lead-quick-action-buttons.tsx` — extracted ACTION_BUTTONS + ActionToggleButton + the Draft panel section
- `frontend/features/crm/leads/detail/lead-quick-action-forms.tsx` — extracted Note/Task/Email/Call form panels
- `frontend/features/crm/leads/csv-upload-step-upload.tsx` — extracted upload drop-zone step UI

---

## Task 1: Delete hardcoded color maps from lead-table/types.ts

**Files:**
- Modify: `frontend/features/crm/leads/lead-table/types.ts:66-104`

- [ ] **Step 1: Remove STATUSES, STATUS_COLORS, PRIORITY_COLORS, SOURCE_COLORS from types.ts**

  Delete lines 66–104 (STATUSES const through end of SOURCE_COLORS). Keep everything else (PRIORITIES, PAGE_SIZES, LOST_REASONS, ALL_COLUMNS, DEFAULT_VISIBLE, formatLeadId, formatINR, timeAgo, formatDate, getStoredColumns).

  The file should no longer export:
  - `STATUSES`
  - `STATUS_COLORS`
  - `PRIORITY_COLORS`
  - `SOURCE_COLORS`

- [ ] **Step 2: Verify no other file in the fence imports the deleted exports**

  Run:
  ```
  grep -rn "STATUSES\|STATUS_COLORS\|PRIORITY_COLORS\|SOURCE_COLORS" frontend/features/crm/leads/lead-table/
  ```
  Expected: `types.ts` has none; `lead-columns.tsx` imports them (will be fixed in Task 2); `lead-actions.tsx` imports `STATUSES`/`PRIORITIES` (will be fixed in Task 3).

---

## Task 2: lead-columns.tsx — metadata-driven status/priority/source badges + inline edits

**Files:**
- Modify: `frontend/features/crm/leads/lead-table/lead-columns.tsx`

Context: `useLeadCellRenderer` already receives `onStatusChange`, `onPriorityChange`, `onAssign`. The hook needs access to `useCrmOptions` for iterating status/priority options in the inline selects and for badge rendering. Since the hook is called at component level, call `useCrmOptions` at the top of `useLeadCellRenderer` (it's already a hook called inside a component — this is fine).

- [ ] **Step 1: Update imports**

  Remove: `STATUSES, PRIORITIES, STATUS_COLORS, PRIORITY_COLORS, SOURCE_COLORS` from `./types` import.
  Add:
  ```ts
  import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
  import { CrmOptionBadge } from "@/features/crm/shared/metadata";
  ```

- [ ] **Step 2: Inside useLeadCellRenderer, add metadata hooks at the top**

  ```ts
  export function useLeadCellRenderer({ ... }: ...) {
    const router = useRouter();
    const { data: statusOptions = [] } = useCrmOptions("lead_status");
    const { data: priorityOptions = [] } = useCrmOptions("priority");
    const { data: sourceOptions = [] } = useCrmOptions("source");
    // ... rest unchanged
  ```

- [ ] **Step 3: Replace "source" case**

  Old:
  ```ts
  case "source":
    return lead.source ? (
      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5 border-0 font-medium", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}>
        {lead.source.replace("_", " ")}
      </Badge>
    ) : <span className="text-[11px] text-muted-foreground/50">—</span>;
  ```

  New:
  ```ts
  case "source":
    if (!lead.source) return <span className="text-[11px] text-muted-foreground/50">—</span>;
    return (
      <CrmOptionBadge
        option={resolveOption(sourceOptions, lead.source)}
        size="table"
      />
    );
  ```

- [ ] **Step 4: Replace "status" case — badge + inline edit select**

  Old badge uses `STATUS_COLORS[lead.status]`. New:
  ```ts
  case "status":
    if (isEditing) {
      return (
        <Select
          defaultValue={lead.status}
          onValueChange={(v) => {
            onStatusChange(lead.id, v, lead.name);
            setEditingCell(null);
          }}
        >
          <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s.id} value={s.key} className="text-[11px]">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <div
        className="cursor-pointer"
        onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "status" })}
      >
        <CrmOptionBadge
          option={resolveOption(statusOptions, lead.status)}
          size="table"
        />
      </div>
    );
  ```

- [ ] **Step 5: Replace "priority" case — badge + inline edit select**

  Old badge uses `PRIORITY_COLORS[lead.priority]`. New:
  ```ts
  case "priority":
    if (isEditing) {
      return (
        <Select
          defaultValue={lead.priority || ""}
          onValueChange={(v) => {
            onPriorityChange(lead.id, v);
            setEditingCell(null);
          }}
        >
          <SelectTrigger className="h-6 text-[10px] w-[80px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {priorityOptions.map((p) => (
              <SelectItem key={p.id} value={p.key} className="text-[11px]">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (!lead.priority) return <span className="text-[11px] text-muted-foreground/50">—</span>;
    return (
      <div
        className="cursor-pointer"
        onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "priority" })}
      >
        <CrmOptionBadge
          option={resolveOption(priorityOptions, lead.priority)}
          size="table"
        />
      </div>
    );
  ```

- [ ] **Step 6: Typecheck the fence**

  ```
  cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 3: lead-actions.tsx (BulkActionsBar) — metadata-driven status/priority selects

**Files:**
- Modify: `frontend/features/crm/leads/lead-table/lead-actions.tsx`

Context: `BulkActionsBar` currently iterates `STATUSES` and `PRIORITIES` (imported from `./types`) for the bulk-update selects. These need to come from metadata instead. `BulkActionsBar` is a component so hooks are allowed at its top level.

- [ ] **Step 1: Update imports in lead-actions.tsx**

  Remove `STATUSES, PRIORITIES` from `./types` import (keep `Lead, TeamMember, LOST_REASONS`).
  Add:
  ```ts
  import { useCrmOptions } from "@/hooks/api/crm/metadata";
  ```

- [ ] **Step 2: Add metadata hooks inside BulkActionsBar**

  ```ts
  export function BulkActionsBar({ ... }: BulkActionsBarProps) {
    const { data: statusOptions = [] } = useCrmOptions("lead_status");
    const { data: priorityOptions = [] } = useCrmOptions("priority");
    // ... rest of existing state/callbacks unchanged
  ```

- [ ] **Step 3: Swap the bulk-status SelectContent**

  Old:
  ```tsx
  {STATUSES.map((s) => (
    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
  ))}
  ```
  New:
  ```tsx
  {statusOptions.map((s) => (
    <SelectItem key={s.id} value={s.key} className="text-xs">{s.label}</SelectItem>
  ))}
  ```

- [ ] **Step 4: Swap the bulk-priority SelectContent**

  Old:
  ```tsx
  {PRIORITIES.map((p) => (
    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
  ))}
  ```
  New:
  ```tsx
  {priorityOptions.map((p) => (
    <SelectItem key={p.id} value={p.key} className="text-xs">{p.label}</SelectItem>
  ))}
  ```

- [ ] **Step 5: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 4: leads-toolbar.tsx — remove FALLBACK_STATUSES

**Files:**
- Modify: `frontend/features/crm/leads/leads-toolbar.tsx:11,37-39`

- [ ] **Step 1: Delete the FALLBACK_STATUSES constant and its usage**

  Remove line 11:
  ```ts
  const FALLBACK_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
  ```

  Update lines 37–39:
  ```ts
  const statuses = statusOptions.length > 0 ? statusOptions : FALLBACK_STATUSES.map((s) => ({ key: s, label: s }));
  const priorities = priorityOptions.length > 0 ? priorityOptions : [];
  const sources = sourceOptions.length > 0 ? sourceOptions : [];
  ```
  Becomes:
  ```ts
  const statuses = statusOptions;
  const priorities = priorityOptions;
  const sources = sourceOptions;
  ```
  (The hook already returns `[]` before data loads; empty dropdown is the correct behavior per task spec.)

- [ ] **Step 2: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 5: leads-kanban.tsx — fix QUALIFIED fallback color violet → blue

**Files:**
- Modify: `frontend/features/crm/leads/leads-kanban.tsx:15`

Context: The kanban already prefers metadata over fallbacks (`const columns = metaOptions.length > 0 ? metaOptions : FALLBACK_OPTIONS`). The only fix needed is the fallback color for QUALIFIED.

- [ ] **Step 1: Change QUALIFIED fallback color**

  Old:
  ```ts
  { key: "QUALIFIED", label: "Qualified", color: "violet", isTerminal: false },
  ```
  New:
  ```ts
  { key: "QUALIFIED", label: "Qualified", color: "blue", isTerminal: false },
  ```

---

## Task 6: kanban-card.tsx — purple purge in SOURCE_COLORS + metadata-aware next stage

**Files:**
- Modify: `frontend/features/crm/leads/kanban-card.tsx`

- [ ] **Step 1: Fix website SOURCE_COLORS entry**

  Old:
  ```ts
  website: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ```
  New:
  ```ts
  website: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ```

- [ ] **Step 2: Fix handleMoveNext to use metadata-aware status list**

  The current `handleMoveNext` hardcodes `FALLBACK_STATUSES`. Since this component renders inside `LeadsKanban` which already receives `columns` from metadata, we need to pass the ordered status keys down or derive them from metadata in the card itself.

  The cleanest approach (no prop-drilling change): accept an optional `allStatusKeys: string[]` prop from `KanbanCard`, defaulting to `FALLBACK_STATUSES`. The kanban passes the ordered column keys.

  Update `KanbanCardProps`:
  ```ts
  interface KanbanCardProps {
    lead: BoardLead;
    index: number;
    status: string;
    allStatusKeys?: string[];
    onOpen: (id: number) => void;
    onMoveStatus: (leadId: number, status: string, expectedStatus?: string) => void;
  }
  ```

  Update `handleMoveNext`:
  ```ts
  const handleMoveNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const keys = allStatusKeys ?? (FALLBACK_STATUSES as readonly string[]);
      const nextIdx = keys.indexOf(status) + 1;
      if (nextIdx > 0 && nextIdx < keys.length - 1)
        onMoveStatus(lead.id, keys[nextIdx] as string, status);
    },
    [lead.id, status, allStatusKeys, onMoveStatus],
  );
  ```

  Update `LeadsKanban` to pass `allStatusKeys`:
  In `leads-kanban.tsx`, inside the `columns.map`, pass:
  ```tsx
  <KanbanCard
    key={lead.id}
    lead={lead}
    index={index}
    status={option.key}
    allStatusKeys={columns.map((c) => c.key)}
    onOpen={onOpenLead}
    onMoveStatus={onMoveStatus}
  />
  ```

- [ ] **Step 3: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 7: lead-detail-sheet.tsx — remove FALLBACK_STATUS_CONFIG, use metadata; ACTIVITY_TYPES → useCrmOptions

**Files:**
- Modify: `frontend/features/crm/leads/lead-detail-sheet.tsx`

Context:
- Lines 33–41: `FALLBACK_STATUSES` and `FALLBACK_STATUS_CONFIG` define per-status color/label. Replace with `resolveOption(statusOptions, key)` + `CrmOptionBadge`.
- Line 43: `ACTIVITY_TYPES` static array drives a guard. Replace with `useCrmOptions("activity_type")` and derive valid type keys from metadata.
- `statusList` construction (lines 108–114) uses the fallback config for border classes. Replace with `resolveOption` + `getCrmTokenClasses`.
- The Badge at line 204–212 uses `FALLBACK_STATUS_CONFIG[lead.status]` directly. Replace with `CrmOptionBadge`.

- [ ] **Step 1: Remove FALLBACK_STATUSES, FALLBACK_STATUS_CONFIG, ACTIVITY_TYPES**

  Delete lines 33–46 entirely.

- [ ] **Step 2: Update imports**

  Add:
  ```ts
  import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
  import { CrmOptionBadge, getCrmTokenClasses } from "@/features/crm/shared/metadata";
  ```
  Remove the `useCrmOptions` import that was already there (it was `import { useCrmOptions } from "@/hooks/api/crm";`) — replace with the direct path to keep consistent with the rest of the fence: `@/hooks/api/crm/metadata`.

- [ ] **Step 3: Add useCrmOptions("activity_type") hook**

  Inside `LeadDetailSheet`, after `const { data: statusOptions = [] } = useCrmOptions("lead_status");`, add:
  ```ts
  const { data: activityTypeOptions = [] } = useCrmOptions("activity_type");
  ```

- [ ] **Step 4: Replace statusList construction**

  Old:
  ```ts
  const statusList = statusOptions.length > 0
    ? statusOptions.map((o) => ({ key: o.key, label: o.label, border: `border-${o.color}-500/20` }))
    : FALLBACK_STATUSES.map((k) => ({
        key: k,
        label: FALLBACK_STATUS_CONFIG[k]?.label ?? k,
        border: FALLBACK_STATUS_CONFIG[k]?.border ?? "border-border",
      }));
  ```
  New:
  ```ts
  const statusList = statusOptions.map((o) => ({
    key: o.key,
    label: o.label,
    border: getCrmTokenClasses(o.color).badgeClass,
  }));
  ```

- [ ] **Step 5: Replace the header status Badge with CrmOptionBadge**

  Old (lines 203–212):
  ```tsx
  <Badge
    className={cn(
      "shrink-0",
      FALLBACK_STATUS_CONFIG[lead.status]?.bg ?? "bg-muted/30",
      FALLBACK_STATUS_CONFIG[lead.status]?.color ?? "text-foreground",
      FALLBACK_STATUS_CONFIG[lead.status]?.border ?? "border-border",
      "border",
    )}
  >
    {statusList.find((s) => s.key === lead.status)?.label ?? lead.status}
  </Badge>
  ```
  New:
  ```tsx
  <CrmOptionBadge
    option={resolveOption(statusOptions, lead.status)}
    size="card"
    className="shrink-0"
  />
  ```

- [ ] **Step 6: Replace the isActivityType guard to use metadata keys**

  Old (line 44–46):
  ```ts
  function isActivityType(v: unknown): v is (typeof ACTIVITY_TYPES)[number] {
    return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
  }
  ```
  This was a module-level function referencing the now-deleted `ACTIVITY_TYPES`. Since `activityTypeOptions` is now loaded from metadata, the guard needs to live inside the handler where the hook data is in scope.

  Move validation inline in `handleLogActivity`:
  ```ts
  const handleLogActivity = useCallback(
    async (formData: FormData) => {
      if (!leadId) return;
      try {
        const activityType = formData.get("activityType");
        const validTypes = activityTypeOptions.map((o) => o.key);
        if (typeof activityType !== "string" || !validTypes.includes(activityType)) {
          toast.error("Invalid activity type");
          return;
        }
        await logActivity.mutateAsync({
          leadId,
          type: activityType,
          // ... rest unchanged
        });
        toast.success("Activity logged");
      } catch {
        toast.error("Failed to log activity");
      }
    },
    [leadId, logActivity, activityTypeOptions],
  );
  ```

  Note: the `type` on `mutateAsync` was previously typed as `(typeof ACTIVITY_TYPES)[number]`. Remove that cast — the mutation accepts `string` (check the hook; if the type is a literal union, cast to `string` or update the hook's input type to accept `string`).

- [ ] **Step 7: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 8: lead-types.ts — violet → blue, purple → blue

**Files:**
- Modify: `frontend/features/crm/leads/detail/lead-types.ts:19,38`

- [ ] **Step 1: Fix STATUS_STYLES QUALIFIED entry**

  Old:
  ```ts
  QUALIFIED:  { color: "text-white", bg: "bg-violet-600  border border-violet-500"  },
  ```
  New:
  ```ts
  QUALIFIED:  { color: "text-white", bg: "bg-blue-600  border border-blue-500"  },
  ```

- [ ] **Step 2: Fix TIMELINE_ICONS task entry**

  Old:
  ```ts
  task: { icon: ListTodo, color: "bg-purple-500/15 text-purple-400" },
  ```
  New:
  ```ts
  task: { icon: ListTodo, color: "bg-blue-500/15 text-blue-400" },
  ```

---

## Task 9: lead-activity-tab.tsx + lead-followup-tab.tsx — purple → blue for email icon bg

**Files:**
- Modify: `frontend/features/crm/leads/lead-activity-tab.tsx:51`
- Modify: `frontend/features/crm/leads/lead-followup-tab.tsx:280`

- [ ] **Step 1: lead-activity-tab.tsx — email activity bg purple → blue**

  Old:
  ```ts
  : activity.type === "email"
    ? "bg-purple-500/15 text-purple-400"
  ```
  New:
  ```ts
  : activity.type === "email"
    ? "bg-blue-500/15 text-blue-400"
  ```

- [ ] **Step 2: lead-followup-tab.tsx — EMAIL task bg purple → blue**

  Old:
  ```ts
  : task.type === "EMAIL"
    ? "bg-purple-500/15 text-purple-400"
  ```
  New:
  ```ts
  : task.type === "EMAIL"
    ? "bg-blue-500/15 text-blue-400"
  ```

---

## Task 10: leads-funnel-view.tsx — INTERESTED violet → blue

**Files:**
- Modify: `frontend/features/crm/leads/leads-funnel-view.tsx:24,32`

- [ ] **Step 1: Fix STAGE_COLORS INTERESTED**

  Old:
  ```ts
  INTERESTED: "from-violet-400 to-violet-500",
  ```
  New:
  ```ts
  INTERESTED: "from-blue-400 to-blue-500",
  ```

- [ ] **Step 2: Fix STAGE_BG INTERESTED**

  Old:
  ```ts
  INTERESTED: "bg-violet-50 border-violet-200",
  ```
  New:
  ```ts
  INTERESTED: "bg-blue-50 border-blue-200",
  ```

---

## Task 11: getErrorMessage in ai-email-dialog.tsx, ai-score-button.tsx, csv-upload-dialog.tsx, lead-distribution-dialog.tsx

**Files:**
- Modify: `frontend/features/crm/leads/ai-email-dialog.tsx:78`
- Modify: `frontend/features/crm/leads/ai-score-button.tsx:47`
- Modify: `frontend/features/crm/leads/csv-upload-dialog.tsx:329`
- Modify: `frontend/features/crm/leads/lead-distribution-dialog.tsx:56`

Import path confirmed from existing usages in the fence: `@/lib/get-error-message`.

- [ ] **Step 1: ai-email-dialog.tsx**

  Add import:
  ```ts
  import { getErrorMessage } from "@/lib/get-error-message";
  ```

  Old (line ~78):
  ```ts
  onError: (err) => toast.error(err.message || "Email generation failed"),
  ```
  New:
  ```ts
  onError: (err) => toast.error(getErrorMessage(err)),
  ```

- [ ] **Step 2: ai-score-button.tsx**

  Add import:
  ```ts
  import { getErrorMessage } from "@/lib/get-error-message";
  ```

  Old (line ~47):
  ```ts
  onError: (err) => toast.error(err.message || "AI scoring failed"),
  ```
  New:
  ```ts
  onError: (err) => toast.error(getErrorMessage(err)),
  ```

- [ ] **Step 3: csv-upload-dialog.tsx**

  Add import:
  ```ts
  import { getErrorMessage } from "@/lib/get-error-message";
  ```

  Old (line ~329):
  ```ts
  onError: (err) => toast.error(err.message),
  ```
  New:
  ```ts
  onError: (err) => toast.error(getErrorMessage(err)),
  ```

- [ ] **Step 4: lead-distribution-dialog.tsx**

  Add import:
  ```ts
  import { getErrorMessage } from "@/lib/get-error-message";
  ```

  Old (line ~56):
  ```ts
  onError: (err) => toast.error(err.message),
  ```
  New:
  ```ts
  onError: (err) => toast.error(getErrorMessage(err)),
  ```

- [ ] **Step 5: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 12: Split lead-quick-actions.tsx (512 lines) into three files

**Files:**
- Modify: `frontend/features/crm/leads/detail/lead-quick-actions.tsx` — keep as thin orchestrator, import from the two new files
- Create: `frontend/features/crm/leads/detail/lead-quick-action-buttons.tsx` — ACTION_BUTTONS constant + ActionToggleButton component + DraftPanel component
- Create: `frontend/features/crm/leads/detail/lead-quick-action-forms.tsx` — NotePanel, TaskPanel, EmailPanel, CallPanel form components

Responsibilities:
- `lead-quick-action-buttons.tsx`: exports `ACTION_BUTTONS`, `ActionToggleButton`, `DraftPanel`
- `lead-quick-action-forms.tsx`: exports `NotePanel`, `TaskPanel`, `EmailPanel`, `CallPanel` — each takes its `UseFormReturn` + submit handler + isPending + cancel handler
- `lead-quick-actions.tsx`: imports all sub-components, orchestrates which panel renders, passes props through

Additionally: purge purple/violet colors from `ACTION_BUTTONS` (email → blue, draft → blue); swap `bg-violet-600` on Draft Generate button → `bg-blue-600 hover:bg-blue-700`.

- [ ] **Step 1: Create lead-quick-action-buttons.tsx**

  ```tsx
  "use client";

  import { useCallback } from "react";
  import { Phone, Mail, StickyNote, ListTodo, Wand2, Loader2 } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/lib/utils";
  import type { QuickAction } from "./lead-types";

  export const ACTION_BUTTONS = [
    { key: "call"  as const, label: "Log Call",    icon: Phone,     color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"   },
    { key: "email" as const, label: "Send Email",  icon: Mail,      color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"   },
    { key: "note"  as const, label: "Add Note",    icon: StickyNote,color: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
    { key: "task"  as const, label: "New Task",    icon: ListTodo,  color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
    { key: "draft" as const, label: "Draft Email", icon: Wand2,     color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"   },
  ] as const;

  type ActionButtonData = (typeof ACTION_BUTTONS)[number];

  interface ActionToggleButtonProps {
    action: ActionButtonData;
    isActive: boolean;
    onSetActiveAction: (action: QuickAction) => void;
  }

  export function ActionToggleButton({ action, isActive, onSetActiveAction }: ActionToggleButtonProps) {
    const handleClick = useCallback(
      () => onSetActiveAction(isActive ? null : action.key),
      [isActive, action.key, onSetActiveAction],
    );
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(action.color, isActive && "ring-2 ring-current/30")}
        onClick={handleClick}
      >
        <action.icon className="h-4 w-4 mr-1.5" />
        {action.label}
      </Button>
    );
  }

  interface DraftPanelProps {
    leadName?: string;
    isPending: boolean;
    onGenerate: () => void;
    onCancel: () => void;
  }

  export function DraftPanel({ leadName, isPending, onGenerate, onCancel }: DraftPanelProps) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">AI Email Draft</p>
            <p className="text-xs text-muted-foreground">
              Generate a professional email for{" "}
              <span className="font-medium text-foreground">{leadName ?? "this lead"}</span>
              {" "}using AI. The draft will pre-fill the email form for your review.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onGenerate}
            disabled={isPending || !leadName}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-1.5" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Create lead-quick-action-forms.tsx**

  Extract the four form panels (note, task, email, call). Each panel receives its form, submit handler, isPending, and cancel handler. Import `LoadingButton` instead of disabled Button.

  ```tsx
  "use client";

  import { type UseFormReturn } from "react-hook-form";
  import { FileText } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { LoadingButton } from "@/components/ui/loading-button";
  import { Input } from "@/components/ui/input";
  import { DatePicker } from "@/components/ui/date-picker";
  import { Textarea } from "@/components/ui/textarea";
  import {
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  } from "@/components/ui/form";
  import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  } from "@/components/ui/select";
  import type { NoteForm, TaskForm, EmailForm, CallForm } from "./lead-types";

  interface NotePanelProps {
    form: UseFormReturn<NoteForm>;
    onSubmit: (data: NoteForm) => void;
    isPending: boolean;
    onCancel: () => void;
  }

  export function NotePanel({ form, onSubmit, isPending, onCancel }: NotePanelProps) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
          <FormField control={form.control} name="body" render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl><Textarea {...field} placeholder="Write a note..." rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving...">Save Note</LoadingButton>
          </div>
        </form>
      </Form>
    );
  }

  interface TaskPanelProps {
    form: UseFormReturn<TaskForm>;
    onSubmit: (data: TaskForm) => void;
    isPending: boolean;
    onCancel: () => void;
  }

  export function TaskPanel({ form, onSubmit, isPending, onCancel }: TaskPanelProps) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl><Input {...field} placeholder="Follow up with..." /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <DatePicker value={field.value || ""} onChange={field.onChange} placeholder="Select due date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Creating...">Create Task</LoadingButton>
          </div>
        </form>
      </Form>
    );
  }

  interface EmailPanelProps {
    form: UseFormReturn<EmailForm>;
    onSubmit: (data: EmailForm) => void;
    isPending: boolean;
    onCancel: () => void;
    leadName?: string;
    emailTemplates?: { id: number; name: string; subject: string; body: string }[];
    onApplyTemplate: (templateId: string) => void;
  }

  export function EmailPanel({ form, onSubmit, isPending, onCancel, emailTemplates, onApplyTemplate }: EmailPanelProps) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
          {emailTemplates && emailTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select onValueChange={onApplyTemplate}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Use a template…" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <FormField control={form.control} name="to" render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <FormControl><Input {...field} placeholder="email@example.com" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl><Input {...field} placeholder="Subject" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="body" render={({ field }) => (
            <FormItem>
              <FormLabel>Body</FormLabel>
              <FormControl><Textarea {...field} placeholder="Email body..." rows={4} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Sending...">Send Email</LoadingButton>
          </div>
        </form>
      </Form>
    );
  }

  interface CallPanelProps {
    form: UseFormReturn<CallForm>;
    onSubmit: (data: CallForm) => void;
    isPending: boolean;
    onCancel: () => void;
  }

  export function CallPanel({ form, onSubmit, isPending, onCancel }: CallPanelProps) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl><Input {...field} placeholder="Brief description" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="duration" render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (min)</FormLabel>
                <FormControl><Input type="number" {...field} placeholder="30" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="outcome" render={({ field }) => (
              <FormItem>
                <FormLabel>Outcome</FormLabel>
                <FormControl><Input {...field} placeholder="Positive / Follow up" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl><Textarea {...field} rows={2} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Logging...">Log Call</LoadingButton>
          </div>
        </form>
      </Form>
    );
  }
  ```

- [ ] **Step 3: Rewrite lead-quick-actions.tsx as thin orchestrator**

  The main file now only: imports from the two new files, holds the `generateEmailMutation` + `emailTemplates` data, handles `handleApplyTemplate` + `handleGenerateDraft`, and renders the correct panel. All the heavy panel JSX is gone.

  ```tsx
  "use client";

  import { useCallback } from "react";
  import { type UseFormReturn } from "react-hook-form";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { useGenerateEmail } from "@/hooks/api/ai";
  import { useEmailTemplates } from "@/hooks/api/crm-settings";
  import { ACTION_BUTTONS, ActionToggleButton, DraftPanel } from "./lead-quick-action-buttons";
  import { NotePanel, TaskPanel, EmailPanel, CallPanel } from "./lead-quick-action-forms";
  import { type QuickAction, type NoteForm, type TaskForm, type EmailForm, type CallForm } from "./lead-types";

  interface LeadQuickActionsProps {
    activeAction: QuickAction;
    onSetActiveAction: (action: QuickAction) => void;
    noteForm: UseFormReturn<NoteForm>;
    taskForm: UseFormReturn<TaskForm>;
    emailForm: UseFormReturn<EmailForm>;
    callForm: UseFormReturn<CallForm>;
    onNoteSubmit: (data: NoteForm) => void;
    onTaskSubmit: (data: TaskForm) => void;
    onEmailSubmit: (data: EmailForm) => void;
    onCallSubmit: (data: CallForm) => void;
    isNotePending: boolean;
    isTaskPending: boolean;
    isEmailPending: boolean;
    isCallPending: boolean;
    leadName?: string;
    leadEmail?: string;
    leadContext?: string;
    onDraftEmail?: (subject: string, body: string) => void;
  }

  export function LeadQuickActions({
    activeAction, onSetActiveAction,
    noteForm, taskForm, emailForm, callForm,
    onNoteSubmit, onTaskSubmit, onEmailSubmit, onCallSubmit,
    isNotePending, isTaskPending, isEmailPending, isCallPending,
    leadName, leadContext, onDraftEmail,
  }: LeadQuickActionsProps) {
    const handleCancelAction = useCallback(() => onSetActiveAction(null), [onSetActiveAction]);
    const generateEmailMutation = useGenerateEmail();
    const { data: emailTemplates } = useEmailTemplates({ limit: 50 });

    const handleApplyTemplate = useCallback((templateId: string) => {
      const template = emailTemplates?.find((t) => String(t.id) === templateId);
      if (!template) return;
      emailForm.setValue("subject", template.subject.replace(/\{\{lead_name\}\}/gi, leadName ?? ""));
      emailForm.setValue("body", template.body.replace(/\{\{lead_name\}\}/gi, leadName ?? ""));
    }, [emailTemplates, leadName, emailForm]);

    const handleGenerateDraft = useCallback(() => {
      if (!leadName) return;
      generateEmailMutation.mutate(
        { leadName, context: leadContext, tone: "formal" },
        { onSuccess: (result) => onDraftEmail?.(result.subject, result.body) },
      );
    }, [leadName, leadContext, onDraftEmail, generateEmailMutation]);

    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ACTION_BUTTONS.map((action) => (
              <ActionToggleButton
                key={action.key}
                action={action}
                isActive={activeAction === action.key}
                onSetActiveAction={onSetActiveAction}
              />
            ))}
          </div>

          {activeAction === "draft" && (
            <DraftPanel
              leadName={leadName}
              isPending={generateEmailMutation.isPending}
              onGenerate={handleGenerateDraft}
              onCancel={handleCancelAction}
            />
          )}
          {activeAction === "note" && (
            <NotePanel form={noteForm} onSubmit={onNoteSubmit} isPending={isNotePending} onCancel={handleCancelAction} />
          )}
          {activeAction === "task" && (
            <TaskPanel form={taskForm} onSubmit={onTaskSubmit} isPending={isTaskPending} onCancel={handleCancelAction} />
          )}
          {activeAction === "email" && (
            <EmailPanel
              form={emailForm}
              onSubmit={onEmailSubmit}
              isPending={isEmailPending}
              onCancel={handleCancelAction}
              emailTemplates={emailTemplates}
              onApplyTemplate={handleApplyTemplate}
            />
          )}
          {activeAction === "call" && (
            <CallPanel form={callForm} onSubmit={onCallSubmit} isPending={isCallPending} onCancel={handleCancelAction} />
          )}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **Step 4: Verify line counts**

  ```
  wc -l frontend/features/crm/leads/detail/lead-quick-actions.tsx \
         frontend/features/crm/leads/detail/lead-quick-action-buttons.tsx \
         frontend/features/crm/leads/detail/lead-quick-action-forms.tsx
  ```
  Expected: all three well under 200 lines each.

- [ ] **Step 5: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 13: Split csv-upload-dialog.tsx (505 lines) — extract upload drop-zone step

**Files:**
- Create: `frontend/features/crm/leads/csv-upload-step-upload.tsx` — the upload drop-zone UI (~50 lines)
- Modify: `frontend/features/crm/leads/csv-upload-dialog.tsx` — import from new file, fix toast.error(err.message)

The split responsibility: the upload step (step === "upload") JSX is cohesive and self-contained. Extract it into `CsvUploadStepUpload`.

- [ ] **Step 1: Create csv-upload-step-upload.tsx**

  ```tsx
  "use client";

  import { Upload, FileText, Download } from "lucide-react";
  import { Button } from "@/components/ui/button";

  interface CsvUploadStepUploadProps {
    onBrowseClick: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadTemplate: () => void;
  }

  export function CsvUploadStepUpload({
    onBrowseClick,
    onDragOver,
    onDrop,
    onFileInputChange,
    onDownloadTemplate,
  }: CsvUploadStepUploadProps) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors"
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">Drop your file here</p>
          <p className="text-xs text-muted-foreground mb-3">
            Supports .csv, .xlsx, and .xls
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            id="lead-file-upload"
            aria-label="Upload leads file"
            onChange={onFileInputChange}
          />
          <Button variant="outline" size="sm" onClick={onBrowseClick}>
            <FileText className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Required: <code className="text-foreground">name</code>.
            Optional: email, phone, company, source, city, designation, priority, notes
          </p>
          <Button variant="ghost" size="sm" onClick={onDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Template
          </Button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Update csv-upload-dialog.tsx to import and use the new component**

  Add import:
  ```ts
  import { CsvUploadStepUpload } from "./csv-upload-step-upload";
  import { getErrorMessage } from "@/lib/get-error-message";
  ```

  Replace the `{step === "upload" && !isParsing && ( <div className="space-y-4"> ... </div> )}` block with:
  ```tsx
  {step === "upload" && !isParsing && (
    <CsvUploadStepUpload
      onBrowseClick={handleBrowseClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onFileInputChange={handleFileInputChange}
      onDownloadTemplate={downloadTemplate}
    />
  )}
  ```

  Fix the onError callback in `handleImport`:
  ```ts
  onError: (err) => toast.error(getErrorMessage(err)),
  ```

- [ ] **Step 3: Verify line counts**

  ```
  wc -l frontend/features/crm/leads/csv-upload-dialog.tsx \
         frontend/features/crm/leads/csv-upload-step-upload.tsx
  ```
  Expected: both under 500 lines.

- [ ] **Step 4: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 14: LoadingButton on lead-distribution-dialog.tsx

**Files:**
- Modify: `frontend/features/crm/leads/lead-distribution-dialog.tsx`

Context: The "Distribute Now" button manually disables + shows `Loader2`. Replace with `<LoadingButton>`.

- [ ] **Step 1: Add LoadingButton import**

  ```ts
  import { LoadingButton } from "@/components/ui/loading-button";
  ```

- [ ] **Step 2: Replace the Distribute Now button**

  Old:
  ```tsx
  <Button onClick={handleDistribute} disabled={distributeMutation.isPending}>
    {distributeMutation.isPending && (
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    )}
    Distribute Now
  </Button>
  ```
  New:
  ```tsx
  <LoadingButton onClick={handleDistribute} isPending={distributeMutation.isPending} loadingText="Distributing...">
    Distribute Now
  </LoadingButton>
  ```

  Remove `Loader2` from imports if now unused.

- [ ] **Step 3: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 15: Animated icons on interactive surfaces

**Files:**
- Modify: `frontend/features/crm/leads/lead-detail-sheet.tsx` — Edit button
- Modify: `frontend/features/crm/leads/detail/lead-quick-action-buttons.tsx` — ACTION_BUTTONS toggle buttons
- Modify: `frontend/features/crm/leads/kanban-card.tsx` — mark-lost (X) and move-next (ArrowRight) row action buttons

Context from kb-icons.tsx pattern: for each interactive surface, import the `XxxIcon` from `@animateicons/react/lucide`, call `useAnimatedIcon()` (`{ iconRef, hoverHandlers }`), attach `ref={iconRef}` to the icon and spread `hoverHandlers` on the hoverable element.

Available in @animateicons/react/lucide (confirmed from kb-icons.tsx imports): `XIcon`, `MoveRightIcon`, `Edit3` is NOT in the animated set (no `Edit3Icon`; use `UserPenIcon` which maps to edit, or keep static `Edit3`). `Mail`, `Phone`, `StickyNote`, `ListTodo`, `Wand2` are not in the animated set (no exact match in kb-icons.tsx). Use static lucide-react for icons not in the set.

For the kanban card row actions:
- `X` → `XIcon` from `@animateicons/react/lucide` (confirmed as animated)
- `ArrowRight` → `MoveRightIcon` from `@animateicons/react/lucide` (confirmed as animated)

For lead-detail-sheet Edit button:
- `Edit3` from lucide-react is NOT in the animated set → keep static.

For lead-quick-action-buttons toggle buttons:
- `Phone`, `Mail`, `StickyNote`, `ListTodo`, `Wand2` are NOT in the animated set → keep static lucide-react icons.

- [ ] **Step 1: Animate kanban-card.tsx row action buttons**

  Add imports:
  ```ts
  import { XIcon, MoveRightIcon } from "@animateicons/react/lucide";
  import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
  ```

  Remove `X` and `ArrowRight` from lucide-react imports (keep others: `Plus`, `GripVertical`, `Building2`, `Clock`, `AlertTriangle`, `Info`).

  The two row action buttons render inside `handleMarkLost` and `handleMoveNext` button elements. Since each button needs its own `iconRef`/`hoverHandlers`, create two separate `useAnimatedIcon()` calls at the top of `KanbanCard`:

  ```ts
  export function KanbanCard({ lead, index, status, allStatusKeys, onOpen, onMoveStatus }: KanbanCardProps) {
    const selfAssign = useSelfAssignLead();
    const lostIconAnim = useAnimatedIcon();
    const nextIconAnim = useAnimatedIcon();
    // ... rest unchanged
  ```

  Update the mark-lost button:
  ```tsx
  <button
    onClick={handleMarkLost}
    className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
    aria-label="Mark as lost"
    {...lostIconAnim.hoverHandlers}
  >
    <XIcon ref={lostIconAnim.iconRef} className="h-3 w-3 text-red-400" size={12} />
  </button>
  ```

  Update the move-next button:
  ```tsx
  <button
    onClick={handleMoveNext}
    className="h-5 w-5 rounded flex items-center justify-center hover:bg-blue-500/20 transition-colors"
    aria-label="Move to next stage"
    {...nextIconAnim.hoverHandlers}
  >
    <MoveRightIcon ref={nextIconAnim.iconRef} className="h-3 w-3 text-blue-600" size={12} />
  </button>
  ```

- [ ] **Step 2: Typecheck**

  ```
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: empty.

---

## Task 16: Final typecheck + purple/violet grep verification

- [ ] **Step 1: Full typecheck targeting only crm/leads errors**

  ```
  cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "crm/leads"
  ```
  Expected: no output (empty).

- [ ] **Step 2: Purple/violet purge verification**

  ```
  grep -rn "violet\|purple" frontend/features/crm/leads/ --include="*.ts" --include="*.tsx"
  ```
  Expected: no matches. If any remain, fix them.

- [ ] **Step 3: Verify file sizes**

  ```
  wc -l frontend/features/crm/leads/detail/lead-quick-actions.tsx \
         frontend/features/crm/leads/detail/lead-quick-action-buttons.tsx \
         frontend/features/crm/leads/detail/lead-quick-action-forms.tsx \
         frontend/features/crm/leads/csv-upload-dialog.tsx \
         frontend/features/crm/leads/csv-upload-step-upload.tsx
  ```
  Expected: all under 300 lines.

- [ ] **Step 4: Verify deleted exports are gone**

  ```
  grep -n "export const STATUSES\|export const STATUS_COLORS\|export const PRIORITY_COLORS\|export const SOURCE_COLORS" frontend/features/crm/leads/lead-table/types.ts
  ```
  Expected: no output.

- [ ] **Step 5: Verify getErrorMessage is used (not err.message direct) in all 4 files**

  ```
  grep -n "err\.message" frontend/features/crm/leads/ai-email-dialog.tsx \
       frontend/features/crm/leads/ai-score-button.tsx \
       frontend/features/crm/leads/csv-upload-dialog.tsx \
       frontend/features/crm/leads/lead-distribution-dialog.tsx
  ```
  Expected: no output.
