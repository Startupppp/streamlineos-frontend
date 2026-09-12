# FD7 UI Consistency Audit

Source audit date: 2026-09-12. Read-only. No browser interaction or screenshots.
Scope: signup→org-setup→dashboard, invitations→employee admission, `/settings/billing`,
`/settings/billing/ai-credits`, inbox (`/inbox`), `/calendar`, chat (`/chat`).
Broader brand redesign and Build screen deletion remain deferred per FD7.

---

## Part 1 — Existing system (reuse baseline)

### Semantic color tokens

Defined in `frontend/globals.css` (`:root` + `.dark`) and `frontend/themes.css`
(status tokens and larger palette at ~line 1361).

| Group | Token names |
|---|---|
| Surface | `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted`, `--muted-foreground` |
| Action | `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground` |
| Hover wash | `--accent`, `--accent-foreground` (neutral, NOT brand blue) |
| Structure | `--border`, `--input`, `--ring` |
| Destructive | `--destructive`, `--destructive-foreground` |
| Brand | `--brand-deep`, `--brand-core`, `--brand-bright`, `--brand-cyan`, `--gradient-signature` |
| Charts | `--chart-1` .. `--chart-5` |
| Sidebar chrome | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` |
| Status surface/ink/rule | `--status-{success,warning,danger,info,neutral}-surface/ink/ink-strong/rule` (themes.css ~1361) |
| Status fill utilities | `bg-status-{tone}-fill`, `hover:bg-status-{tone}-fill-hover` (via design-tokens/index.ts) |
| Legacy aliases | `--gold` (→ blue-500), `--blue` (→ blue-700) |

### Gate results

| Gate | Command | Result |
|---|---|---|
| Arbitrary colors | `node scripts/check-no-arbitrary-colors.mjs` | ✔ 0 violations (6007 files scanned) |
| Hand-rolled empty states | `node scripts/check-no-handrolled-empty-states.mjs` | ✔ 0 violations (3991 files) |
| Icon-only buttons without aria-label | `node scripts/check-no-unlabeled-icon-buttons.mjs` | ✔ 0 violations — **known gap: only scans `size="icon"` buttons; `size="sm"` icon-only bypasses this gate (see F2)** |
| Named handlers | `node scripts/check-named-handlers.mjs` | ✔ 0 non-trivial closures in release scope (44 in crm/inventory/landing — excluded by R-10b) |
| File sizes ≤500 | `node scripts/check-file-sizes.mjs` | ✔ 0 in-scope files over 500 lines |
| Files over 300 | `node scripts/check-over-300.mjs` | ✔ 511 of 5990 > 300 lines (baseline 513, net improving) |
| Client pages | `node scripts/check-client-pages.mjs` | ✔ 138/600 (23%), ceiling 304 |

### Canonical primitive index (FD7 flows)

| Need | Canonical component / path |
|---|---|
| Page shell | `PageWrapper` — `components/ui/page-wrapper.tsx` |
| Page chrome constants | `PAGE_CHROME_X`, `CONTENT_PANEL_SOLID`, `FILTER_TOOLBAR_ROW`, `FILTER_SELECT_TRIGGER`, `PAGE_BODY_SKELETON_CLASS`, `PAGE_BODY_EMPTY_CLASS` — `components/ui/content-fill-panel.tsx` |
| Tab body class | `TABS_CONTENT_PAGE_BODY_CLASS` — `components/ui/tabs.tsx:63` |
| Field sizing | `FIELD_CONTROL_CLASS`, `FIELD_SELECT_CONTENT_CLASS` — `components/ui/field-control.ts` |
| Table + skeleton | `DataTable`, `DataTableSkeleton` — `components/ui/data-table.tsx` |
| Stats | `StatCard`, `StatCardGrid`, `StatCardGridSkeleton` — `components/ui/stat-card.tsx` |
| Cursor pagination (standalone) | `TablePagination` cursor mode — `components/ui/table-pagination.tsx` |
| Cursor pagination (inside DataTable) | `pagination={{ mode:"cursor", ... }}` prop on `DataTable` |
| Form shells | `EntityFormSheet`, `EntityFormDialog` — `components/shared/` |
| Form primitives | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — `components/ui/form.tsx` |
| Async button | `LoadingButton` — `components/ui/loading-button.tsx` |
| Animated icon button | `AnimatedIconButton` — `components/ui/animated-icon-button.tsx` |
| Empty state | `EmptyState` — `components/ui/empty-state.tsx` |
| Error state | `ErrorState` — `components/shared/error-state.tsx` |
| Access denied | `NoPermissionState` — `components/shared/no-permission-state.tsx` |
| Loading (page-level) | `LoadingState` — `components/shared/loading-state.tsx` |
| Skeleton (generic) | `Skeleton` — `components/ui/skeleton.tsx` |
| Tabs toolbar | `PageTabsToolbar` — `components/ui/page-tabs-toolbar.tsx` |
| Mobile shell variant | `useShellVariant()` + `MobileModuleBottomNav`, `MobileShellFab`, `ChatMobileBottomNav` — `components/layout/shell-variant-context.tsx` |
| Error message extraction | `getErrorMessage` — `lib/get-error-message.ts` |

### Typography in use

Geist via `next/font`, cv02/cv03/cv04/cv11 alternates global. Per-role classes
defined in `frontend/CLAUDE.md §7` (page title `text-lg font-semibold tracking-tight`,
section heading `text-sm font-semibold`, body `text-sm`, dense/table `text-[11px]`,
table header `text-[10px] uppercase tracking-wider font-bold`, mono/numbers
`font-mono text-[11px]`).

### Mobile shell primitives

Shell variant is selected from `Sec-CH-UA-Mobile` (via `next.config.ts`). The
`useShellVariant()` hook returns `"mobile"` or `"desktop"` based on that header.
Mobile uses `Sheet` for left nav (`w-[17rem]`), `MobileModuleBottomNav` for bottom
tabs (max 5), `MobileShellFab` for FAB, and `ChatMobileBottomNav` during active
conversations. Calendar switches to `"list"` view mode when `isMobile`.

---

## Part 2 — Inconsistencies in the selected flows

> Note: screenshots and live browser interaction are NOT covered by this source audit.
> All findings anchored to `file:line` in the source tree.

### Finding summary table

| # | Severity | File:line | What's wrong | Canonical replacement |
|---|---|---|---|---|
| F1 | HIGH | `app/(auth)/invitation/[token]/page.tsx:284-348` | Form not using canonical Form primitives; no `FormMessage`; validation errors never render; no `aria-describedby` on inputs | `Form/FormField/FormControl/FormMessage` chain — `components/ui/form.tsx` |
| F2 | HIGH | `features/billing/ai-credits-settings-page.tsx:286-288,377-379` | Two icon-only `RefreshCw` `<Button size="sm">` without `aria-label`; bypasses `check:icon-labels` gate (gate only scans `size="icon"`) | Add `aria-label="Refresh"` or use `AnimatedIconButton icon={RefreshCwIcon} aria-label="Refresh"` — `components/ui/animated-icon-button.tsx` |
| F3 | HIGH | `features/chat/chat-home-page.tsx:191` | Page root is a bare `<div>` — no `PageWrapper`, no page title, violates AP-6 | `PageWrapper` with `noInternalScroll` — `components/ui/page-wrapper.tsx` (T6 template) |
| F4 | MEDIUM | `features/billing/ai-credits-settings-page.tsx:56,319` | Hardcoded heights `h-[220px]` (chart skeleton) and `h-[180px]` (pack skeleton div) violate "Never hardcode heights" | `<Skeleton>` shaped to real content without fixed heights — `components/ui/skeleton.tsx` |
| F5 | MEDIUM | `features/billing/ai-credits-settings-page.tsx:316-321` | Hand-rolled `animate-pulse div` instead of `<Skeleton>` component | `<Skeleton className="...">` — `components/ui/skeleton.tsx` |
| F6 | MEDIUM | `features/billing/ai-credits-settings-page.tsx:348,374` | Shell cards use `rounded-lg` instead of `rounded-xl` (AP-4 adjacent) | `CONTENT_PANEL_SOLID` constant (`rounded-xl border border-border bg-card shadow-sm`) — `components/ui/content-fill-panel.tsx` |
| F7 | MEDIUM | `features/billing/ai-credits-settings-page.tsx:400-419` | Cursor pagination via unlisted `CursorPageControls` + `DataTable pagination={{pageSize}}` instead of canonical DataTable cursor mode | `DataTable` with `pagination={{ mode:"cursor", pageSize, hasMore, hasPrevious, onNext, onPrevious, onPageSizeChange }}` — `components/ui/data-table.tsx` |
| F8 | MEDIUM | `features/notifications/unified-inbox/inbox-shell.tsx:76-93,211-220` | Custom `InboxViewTab` with `<button aria-pressed>` instead of `PageTabsToolbar` or `Tabs` | `PageTabsToolbar` — `components/ui/page-tabs-toolbar.tsx`; or `Tabs/TabsList/TabsTrigger` — `components/ui/tabs.tsx` |
| F9 | LOW | `app/(auth)/invitation/[token]/page.tsx:34-38` | Zod schema `newUserSchema` defined inline in page file instead of a sibling `*-schema.ts` | Create `invitation-schema.ts` in same directory; import `z.infer` type from it |
| F10 | LOW | `features/billing/billing-settings-page.tsx:57,61,65` | `TabsContent` hand-writes `className="flex-1 min-h-0 mt-0 overflow-y-auto"` — adds unconditional `flex-1` and extra `overflow-y-auto`; CLAUDE.md T3 requires `TABS_CONTENT_PAGE_BODY_CLASS` | `TABS_CONTENT_PAGE_BODY_CLASS` — `components/ui/tabs.tsx:63` |

---

### F1 — Invitation form missing canonical Form primitives

**File:** `app/(auth)/invitation/[token]/page.tsx:284-348`

The new-user branch renders a raw `<form onSubmit={form.handleSubmit(onSubmit)}>` with
`<Label>` + `<Input>` connected via `form.register()`. This pattern:

- Omits `Form` (FormProvider wrapper), `FormField` (Controller), `FormItem`, `FormLabel`,
  `FormControl` (the Slot that writes `id`, `aria-describedby`, `aria-invalid`), and
  `FormMessage` (role="alert" aria-live="polite").
- Means `firstName`/`lastName` have no `aria-describedby` pointing at their error message.
- Means validation errors from `zodResolver` never render — the user gets no feedback if
  the names exceed the backend's max length.
- The `form.register()` path does NOT wire `aria-invalid` automatically.

The existing-user branch (`invitation.userExists`) uses `<LoadingButton>` correctly and
has no form fields, so F1 is the new-user path only (lines 284–348).

**Canonical:** Wrap in `<Form form={form}>` (FormProvider), replace each field block with
`<FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />`.

---

### F2 — AI Credits: icon-only buttons missing `aria-label`

**File:** `features/billing/ai-credits-settings-page.tsx`

Line 286: `<Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 w-8 p-0">`  
Line 377: `<Button variant="ghost" size="sm" onClick={handleRefresh}>`

Both render only a `<RefreshCw className="h-3.5 w-3.5" />` child with no visible text and no
`aria-label`/`aria-labelledby`/`title`. The gate `check:icon-labels` (scripts/check-no-unlabeled-icon-buttons.mjs)
scans for `size="icon"` — these use `size="sm"` and are invisible to it. A screen reader user
hears only "button" with no action name.

**Fix:** Add `aria-label="Refresh"` to both, or replace with
`<AnimatedIconButton icon={RefreshCwIcon} variant="ghost" size="icon" aria-label="Refresh" />`.

---

### F3 — Chat page AP-6: missing PageWrapper

**File:** `features/chat/chat-home-page.tsx:191`

```tsx
return (
  <div className="flex flex-1 min-h-0 flex-col">    // line 191 — bare div, no PageWrapper
    ...
```

The chat is a full-screen split panel (sidebar + message area) with no page title in the
standard header zone. CLAUDE.md §14 AP-6 forbids `<div>` page roots for authenticated pages.
CLAUDE.md §16 T6 (board/kanban) shows how a full-screen layout still uses
`<PageWrapper noInternalScroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">`.

Chat can use the T6 shell: `<PageWrapper noInternalScroll className="flex ...">` with
`VisuallyHidden` title (for a11y) or an actual title row rendered inside.

---

### F4 + F5 — AI Credits: hardcoded skeleton heights and raw animate-pulse

**File:** `features/billing/ai-credits-settings-page.tsx`

Line 56 (chart lazy fallback): `<Skeleton className="h-[220px] w-full rounded-lg" />`  
Line 319 (pack skeleton div): `className="h-[180px] rounded-lg border border-border bg-card animate-pulse"`

CLAUDE.md §7: "Never hardcode heights." Skeleton blocks are visual Xeroxes — they should
match the real content's natural height, not set a fixed dimension that fights the flex
chain at 200% zoom or 360px width. Line 319 also uses a raw `div` with `animate-pulse`
rather than `<Skeleton>` from `components/ui/skeleton.tsx`, which is the canonical
shimmer component.

**Fix:** Replace fixed heights with `aspect-*` or `min-h-*` relative to content.
Replace the animate-pulse div with `<Skeleton className="rounded-lg" />`.

---

### F6 — AI Credits: `rounded-lg` on shell cards

**File:** `features/billing/ai-credits-settings-page.tsx:348,374`

Line 348: `<div className="rounded-lg border border-border bg-card p-4">` (Auto Top-Up)  
Line 374: `<div className="overflow-hidden rounded-lg border border-border bg-card">` (Usage History)

CLAUDE.md §10: "**`rounded-xl` is the shell card radius**". Both should import and use
`CONTENT_PANEL_SOLID` from `components/ui/content-fill-panel.tsx` or at minimum change
`rounded-lg` → `rounded-xl`.

---

### F7 — AI Credits: cursor pagination via unlisted `CursorPageControls`

**File:** `features/billing/ai-credits-settings-page.tsx:400-419`

The transaction section passes `pagination={{ pageSize: txnLimit }}` (client mode — no
internal pagination renders because `totalPages` stays 1) to `DataTable` and then mounts
a separate `CursorPageControls` (from `components/ui/cursor-page-controls.tsx`) outside.

`CursorPageControls` is not in CLAUDE.md §15 component index and duplicates the functionality
of the canonical `DataTable` cursor pagination (`pagination={{ mode:"cursor", pageSize,
hasMore, hasPrevious, onNext, onPrevious, onPageSizeChange? }}`). Using the cursor mode
directly wires the footer inside `DataTable`, maintains `aria-rowcount={-1}`, and eliminates
the unlisted component dependency.

---

### F8 — InboxShell: custom view-switch tabs

**File:** `features/notifications/unified-inbox/inbox-shell.tsx:76-93,211-220`

The view switcher (All / Notifications / Mail / Approvals) is implemented as a custom
`InboxViewTab` component using plain `<button type="button" aria-pressed={isActive}>` pill
buttons. CLAUDE.md §6: "Tabs sharing a line with search/filters use `PageTabsToolbar`."

`PageTabsToolbar` (components/ui/page-tabs-toolbar.tsx) provides the canonical
`{ tabs, search?, filters?, actions? }` API with correct focus management, keyboard
navigation (arrow keys between tabs), and tab panel association. The custom `InboxViewTab`
has `aria-pressed` (toggle button semantics) rather than `role="tab"` + `aria-controls`,
which is technically valid but inconsistent with the design system convention. If the view
switcher is treated as tabs (content panels switch), `Tabs/TabsList/TabsTrigger` from
`components/ui/tabs.tsx` is the other canonical option.

---

### F9 — Invitation page: inline Zod schema

**File:** `app/(auth)/invitation/[token]/page.tsx:34-38`

```tsx
const newUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
```

Defined inline at the top of the page file. CLAUDE.md §6: "Zod schemas in `*-schema.ts`
beside the feature". Create `app/(auth)/invitation/[token]/invitation-schema.ts` (or
`features/auth/invitation-schema.ts`) and import `{ newUserSchema, type NewUserFormValues }`.

---

### F10 — Billing settings: TabsContent class attrs

**File:** `features/billing/billing-settings-page.tsx:57,61,65`

```tsx
<TabsContent value="plan" className="flex-1 min-h-0 mt-0 overflow-y-auto">
```

The base `TabsContent` component (tabs.tsx:76) already applies
`data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col`.
The call-site adds unconditional `flex-1` (which duplicates and could conflict with the
data-state-guarded version) and `overflow-y-auto` (reasonable for a scrollable settings tab,
but not part of the canonical constant). CLAUDE.md T3: "every body-filling `TabsContent`
uses `TABS_CONTENT_PAGE_BODY_CLASS`". Since the base component already provides the guards,
there is no current render breakage, but the hand-written class diverges from the canonical
constant and will not benefit from future updates to `TABS_CONTENT_PAGE_BODY_CLASS`.

---

## Additional observations (not in top 10)

- **org-setup loading skeleton** (`app/org-setup/page.tsx:197-213`): Uses `<Skeleton>` and
  mirrors the real two-panel layout; `rounded-2xl` on the preview area at line 212 is the
  sanctioned onboarding exception (AP-4). No action needed.
- **Calendar error state** (`features/calendar/calendar-view.tsx:356-369`): Uses a custom
  inline warning `div` instead of `<ErrorState>` for API failures. Functional but inconsistent.
- **`check:icon-labels` gate gap** (UNVERIFIED fix needed in gate): The script
  `scripts/check-no-unlabeled-icon-buttons.mjs` only triggers on `size="icon"` buttons.
  F2's `size="sm"` buttons are not caught. The gate needs to also scan for visually-icon-only
  buttons identified by having no text child.
- **`CursorPageControls` not in §15 index**: If this component is to stay, it should be
  added to the component import index in `frontend/CLAUDE.md §15`; otherwise it should be
  replaced by `TablePagination` cursor mode and deleted.

---

## Unverified

- Before/after screenshots of actual flows with readable content (required by FD7 completion
  criteria) — not covered by this source audit.
- 200% zoom clipping for billing and invitation flows — requires browser verification.
- Keyboard focus on `DeclineInvitationDialog` — radix Dialog includes FocusScope; verified
  via component; runtime behavior not confirmed without browser.
