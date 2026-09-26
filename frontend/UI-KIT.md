# frontend/UI-KIT.md — component index, tokens, templates

Reference for `frontend/CLAUDE.md`. Rules live there and cite this file by anchor. Nothing here is optional: if a component is listed, reimplementing it is a defect (FE-30).

---

## Import index

**Adding or extending a shared component means adding its row here in the same change.**

| Need | Component · Path |
|---|---|
| Page shell | `PageWrapper`, `PageSection` — `components/ui/page-wrapper.tsx` |
| Page chrome constants | `PAGE_CHROME_X`, `PAGE_CHROME_BOTTOM`, `CONTENT_PANEL_SOLID`, `CONTENT_FILL_PANEL`, `FILTER_TOOLBAR_ROW`, `FILTER_SELECT_TRIGGER`, `PAGE_BODY_SKELETON_CLASS`, `PAGE_BODY_EMPTY_CLASS`, `STICKY_FOOTER_ABOVE_MOBILE_NAV` (a wizard/form footer that stays visible above the mobile module nav) — `components/ui/content-fill-panel.tsx` |
| Field sizing constants | `FIELD_CONTROL_CLASS`, `FIELD_CONTROL_HOVER_CLASS`, `FIELD_SELECT_CONTENT_CLASS`, `FIELD_DATE_POPOVER_CONTENT_CLASS`, `INLINE_POPOVER_MIN_CLASS` — `components/ui/field-control.ts` (all fields use the same primary-tinted hover: a `primary/50` border and `primary/5` surface; focus remains the stronger ring state) |
| Build page chrome | `PmPageShell`, `PmSection`, `PmPanel`, `PmStaggerList`, `PM_PANEL`, `PM_PANEL_SOLID`, `PM_FILL_SECTION`, `PM_FILL_PANEL`, `PM_TOOLBAR`, `PM_ROW` — `components/pm-chrome` (the Build/PM body layer **inside** `PageWrapper`: `PageWrapper` → `PmPageShell` → `PmSection`. The shell, section, and panel own `w-full min-w-0`; `PmPageShell` owns the `gap-4` rhythm and fill chain, so a call site passes no layout classes; `PmSection` takes `PM_FILL_SECTION` plus at most a `gap-*`) |
| Build list UX | `BuildListToolbar` — `features/build/shared/build-list-toolbar.tsx` (the ONE adaptive filter row for a Build list: search leftmost, ordered filters, `trailing` view/display controls; below `md` more than two slots collapse into a labelled Drawer with a live active count, Clear all and Done) · `buildToolbarLayout` — `…/build-list-toolbar-layout.ts` (the pure slot/collapse decision) · `BuildFilterSelect`, `BUILD_FILTER_TRIGGER_CLASS` — `…/build-filter-select.tsx` · `BuildHeaderActions`, `BuildHeaderAction` — `…/build-header-actions.tsx` (one row below `sm`: one action fills it, two split it, three or more keep the primary beside an overflow) · `planBuildHeaderActions` — `…/build-header-actions-plan.ts` · `BuildMobileCard` — `…/build-mobile-card.tsx` (the body of a `DataTable` `mobileCard`: identity, status, the person accountable, ≤2 meta fields, row actions) · `useBuildListFilters`, `BUILD_FILTER_ALL` — `…/use-build-list-filters.ts` (URL-backed filter state; a sentinel deletes its param, search debounces 300ms, any change drops `cursor`/`page`, and `resetKey` feeds `useCursorPager`) · `BulkActionBar` — `…/bulk-action-bar.tsx` (the ONE selection-aware bulk bar for a Build ticket collection: assign, status, priority, cycle, label, and clear-selection, each gated on `useCan`; ticket-shaped collections only — a non-ticket entity needs its own bulk mutation, not this bar) |
| Table · skeleton | `DataTable`, `DataTableColumn` — `components/ui/data-table.tsx` · `DataTableSkeleton` — `components/ui/data-table-skeleton.tsx` (pass `headers` — the table's real column labels — from a route `loading.tsx`; `columns` alone renders numbered screen-reader placeholders. Add `mobileCards` whenever the real table carries `mobileCard`, so the skeleton below `sm` is card-shaped rather than a skeleton of a table the page will never paint) |
| Pagination | `TablePagination`, `useCursorPager` — `components/ui/table-pagination.tsx` · `DataTablePagination` — `components/shared/data-table-pagination.tsx` · `CursorPageControls` — `components/ui/cursor-page-controls.tsx` · `InfiniteScrollSentinel` — `components/ui/infinite-scroll-sentinel.tsx` |
| Stats · search | `StatCard`, `StatCardGrid`, `StatCardSkeleton`, `StatCardGridSkeleton` — `components/ui/stat-card.tsx` · `SearchInput` — `components/ui/search-input.tsx` |
| Alert | `Alert`, `AlertTitle`, `AlertDescription` — `components/ui/alert.tsx` (shadcn-compatible compact contextual guidance; use `variant="destructive"` only for destructive guidance) |
| Tabs | `Tabs`, `TABS_CONTENT_PAGE_BODY_CLASS` — `components/ui/tabs.tsx` (the default is the canonical segmented treatment: `border-input bg-card` shell, selected `bg-primary text-primary-foreground`; use it for mutually exclusive content views) · `PageTabsToolbar` — `components/ui/page-tabs-toolbar.tsx` (`collapseBelow="xl"` is the standard for dense Build toolbars; search stays visible while secondary filters collapse) |
| Form shells · primitives | `EntityFormSheet`, `EntityFormDialog`, `AppSheet`, `AppDialog` — `components/shared` · `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — `components/ui/form.tsx` |
| Confirm | `ConfirmDialog` · `UnsavedChangesDialog` · `ConfirmSheet`, `ConfirmWithReasonSheet` — `components/ui/` |
| Unsaved-work guard | `DirtyStateProvider`, `useRegisterDirtyState`, `useHasUnsavedWork`, `useNavigationLeave` — `components/shared/dirty-state-context.tsx` (`useRequestLeave` is HR's leave-request mutation — a different thing) |
| Async button · animated icon | `LoadingButton` — `components/ui/loading-button.tsx` · `AnimatedIconButton` — `components/ui/animated-icon-button.tsx` · `useAnimatedIcon` — `hooks/common/use-animated-icon.ts` |
| States | `EmptyState` — `components/ui/empty-state.tsx` · `ErrorState` (pass `error` and it shows the failed request's copyable reference; `PageState` does this for you), `ErrorReference` — `components/shared/error-reference.tsx` (the request id with a Copy control, for any inline error message; renders nothing for an error with no id), `LoadingState`, `AccessDenied`, `NoPermissionState` — `components/shared` · `PageState` — `components/shared/page-state.tsx` · `usePageState` — `hooks/api/use-page-state.ts` · `AnonymitySuppressedNotice`, `anonymitySuppressedMessage` — `components/shared/anonymity-suppressed-notice.tsx` (an anonymised aggregate the backend answered `suppressed`/below `minResponses`: renders the threshold notice, never an empty chart) |
| Compensation | `CtcBreakdownPanel` — `components/shared/ctc-breakdown-panel.tsx` (the structured CTC on an offer, on the candidate's public page and the recruiter's card; takes the backend-computed `ctcPreview` — it renders totals, it never adds money up itself — plus an optional recruiter-only `warning` for a breakdown that will refuse approval) |
| Approval routing | `ApprovalRoutePanel` — `components/shared/approval-route-panel.tsx` (who approves a request, why, SLA and escalation; takes an `ApprovalRouteSummary` — `summarizeApprovalRoute` for HR's `useMyApprover(kind)` / page `approvalRoute`, `summarizeTimesheetApprover` in `features/timesheets/approval-route-summary.ts` for `usePeriodApproverPreview`; optional `unownedAction` `{href,label}` replaces the ask-an-admin hint with a link when nobody can approve — HR fills it from `useNoApproverFix`) |
| Sanitised HTML | `SanitizedHtml` — `components/shared/sanitized-html.tsx` · `useSanitizedHtml` — `hooks/common/use-sanitized-html.ts` · `sanitizeHtml`, `SanitizeHtmlPolicy` — `lib/sanitize-html.ts` (the ONE DOMPurify entry; sanitises after mount via a dynamic import, so never `import { sanitizeHtml }` statically and never import `isomorphic-dompurify` elsewhere — `lib/sanitize-html-import-boundary.test.ts` fails the build) |
| Horizontal scroll affordance | `useHorizontalOverflow(ref, revision?)` + `OVERFLOW_EDGE_FADE_CLASS` — `hooks/common/use-horizontal-overflow.ts` (a scrolling row fades the edge that hides more; `StatCardGrid`, `TabsList` and the timesheet week grid already use it — apply to any new `overflow-x-auto scrollbar-hide` row) |
| Employee support vocabulary | `SUPPORT_QUEUES`, `SUPPORT_QUEUE_LABELS`, `HELPDESK_CATEGORIES`, `HELPDESK_CATEGORY_LABELS`, `helpdeskCategoryLabel`, `isSupportQueue` — `lib/employee-support.ts` (the ONE list of queues and categories; the Zod contracts in `hooks/api/hr/helpdesk-schema.ts` and both surfaces under `features/employee-support/` read it) |
| HR invite resend | `ResendInviteButton` — `components/hr/resend-invite-button.tsx` (self-gates on `hr:onboarding:manage`; onboarding tracker rows and the employee header card both mount it) · `describeUnsentInvite` — `components/hr/invite-delivery.ts` (the one reading of the onboard/resend `invite` outcome) |
| Mobile overlay · badges | `ResponsivePopover`, `Drawer` — `components/ui/` · `Badge`, `SemanticBadge`, `StatusBadge`, `StatusMapBadge` — `components/ui/` · `SourceBadge` — `components/shared/source-badge.tsx` (what a knowledge-base entry that is NOT a wiki page really is — `kind="hr-document"` today; add a kind there rather than a local badge, so every list and header says the same thing about the same source) |
| Pickers | `PhoneInput` · `DatePicker`, `DateRangePicker` · `Combobox`, `UserCombobox` — `components/ui/` |
| Board skeletons | `KanbanBoardSkeleton`, `KanbanColumnSkeleton` — `components/ui/kanban-skeleton.tsx` |
| Rich surface (HR + Administration) | `RichPanel`, `RichPageContent`, `RichHero`, `RichQuickAction`, `RichIconWell` — `components/shared/rich-surface.tsx` (re-exported `Hr*` from `features/hr/shared/hr-ui.tsx`) |
| AI | `AiActionsMenu`, `AiUsageChip` — `components/ai/` |
| Plate list model (KB Wiki) | `listStyleTypeOf`, `listIndentOf`, `listPaddingRem`, `listOrdinalOf`, `listOrdinalLabel`, `isListItemChecked` — `components/editor/plate/plate-list-model.ts` |
| KB chat bubbles | `ChatBubble`, `TypingBubble`, `ChatMessage` — `components/kb/kb-chat-bubble.tsx` |
| Party merge | `PartyMergeDialog`, `DuplicatePartyCard` — `components/party-merge/` |
| Call intelligence | `CallAnalysisPanel`, `callIntelligenceHref` — `components/call-intelligence/` |
| API · errors · contracts | `apiClient` — `lib/api-client.ts` · `ApiError`, `isApiError`, `getApiErrorCode`, `lazyContract`, `applyContract` — **`lib/api-envelope.ts`** (api-client re-exports; import from the owner) · `getRetryAfterSeconds` — `lib/api-client.ts` · `getErrorMessage` — `lib/get-error-message.ts` · `queryRetryDelay`, `readErrorReachesBoundary`, `INLINE_READ_ERROR` — `lib/query-error-policy.ts` |
| Query keys | `queryKeys` aggregate — `lib/query-keys.ts` (**barrel; do not import from production code**) · 43 domain factories — `lib/query-keys/<domain>.ts` |
| Mutations | `useAuthorizedMutation` — `hooks/api/authorized-mutation.ts` (permission-bound mutation wrapper) |
| Access | `useAccess`, `useCan`, `useCanState`, `useModuleEnabled`, `usePermissionCatalog` — `hooks/api/access.ts` · `useOrgDisplay` — `hooks/api/org-display.ts` · `<RequireModule module="…">` — `components/auth/require-module.tsx` · `requirePermission` — `lib/rbac/require-permission.ts` |
| Design tokens | `STATUS_TONES`, `statusToneClasses`, `typeScaleClass`, `densityAttribute`, `DENSITY_MODES` — `lib/design-tokens/index.ts` (values in `globals.css`; live gallery at `/design-system`, dev only) |
| Person display | `getUserDisplayName`, `getUserInitials` — `lib/person-display.ts` |
| Presence | `PresenceDot`, `AvatarWithPresence` — `components/shared/presence-dot.tsx` · `PresenceStatusPicker` — `components/shared/presence-status-picker.tsx` · `usePresenceSelection` — `hooks/common/use-presence-selection.ts` · `usePresenceMap`, `usePresenceCustomStatus` — `hooks/api/chat-core-read.ts` · `PRESENCE_STATUSES`, `presenceLabel`, `presenceDotClass`, `isPresenceStatus` — `lib/presence.ts` |
| Org-scoped storage | `lib/org-scoped-storage.tsx` (**`.tsx`, not `.ts`**) |
| Format · motion | `formatMoney`, `formatMoneyCompact`, `MoneyDisplay`, `formatAmountInCurrency`, `formatINR`, `formatINRCompact`, `formatCurrencyFull`, `getInitials`, `formatTime`, `formatFileSize`, `calcPercent`, `numberToWords` — `lib/format-utils.ts` · `staggerContainer`, `fadeUp`, `fadeIn`, `slideInLeft`, `scaleIn` — `lib/motion-variants.ts` · dates — `lib/date-utils.ts` |

### Money and dates

Render tenant money in **that organisation's** currency: `formatMoneyCompact(value, useOrgDisplay())` for stats and dense cells, `formatMoney` for full precision. `useOrgDisplay` reads ungated `GET /me/org-display` — every member sees money somewhere, so it must not depend on `settings:view`.

A row storing its own `currency` column renders through `formatAmountInCurrency(amount, currency)`, pinned by `lib/row-currency-render-contract.test.ts`, which fails on any `formatINR*(x.amount)`. Legacy INR-hardcoded helpers: `formatCurrency` aliases `formatINRCompact` (`₹1.2Cr`/`₹3.4L`/`₹12K`); `formatINR` renders `₹1,23,456`; `formatCurrencyFull(amount, currency?, locale?, maxFrac?)` defaults `INR`/`en-IN`.

Dates go through `lib/date-utils.ts` + `date-fns` `format` — never inline `toLocaleDateString`. `formatShortDate` for a date, `formatDateTime` where the time is the question (logs, audit trails), `formatRelativeTime` for a feed.

---

## Tokens

Tokens live in `globals.css` (repo root, imported by `app/layout.tsx:5`) — Tailwind 4 CSS-first, `:root` + `.dark`, no `tailwind.config`. 525 custom properties.

- `--primary` ink CTA fill · `--ring` focus rings · `--brand-*` + `--gradient-signature` landing/onboarding/marketing only · `--chart-1..5` chart seeds · `--sidebar-*` sidebar chrome.
- **`--accent` is a NEUTRAL hover wash, not brand blue.** shadcn primitives paint `bg-accent text-accent-foreground` on hover/focus, so a chromatic value makes every menu hover illegible.
- **Semantic status:** `statusToneClasses(tone)` from `lib/design-tokens` gives `bg-status-<tone>-surface` / `text-status-<tone>-ink` / `border-status-<tone>-rule` for `success` · `warning` · `danger` · `info` · `neutral`. The dark pairing is built in — never hand-write a `dark:` twin.
- Legacy literals `bg-X-50 text-X-700 border-X-200` (emerald = completed/active/approved · amber = pending/expiring · red = error/rejected/overdue · blue = draft/in-progress/info · slate = closed/archived) stay valid until ticket 17 migrates them. **Add no new ones.** Every legacy light tint carries `dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`; standalone colored icons carry `dark:text-X-400`.
- **Borders:** `border-border` full opacity for structure; **≥70%** on any card/panel outer boundary; `/60` only for hairline dividers inside dense rows.
- **Per-module identity accent** — identity moments only (activity-bar icon tint, active nav indicator, module hero tint, chart seed), never buttons, hovers or body text: CRM/Sales `blue-600` · Build/PM `violet-600` · HR/People `emerald-600` · Inventory `amber-600` · Billing/Finance `cyan-700` · Support `rose-600` · Admin/Settings `slate-600`.

> **HR + Administration rich-surface exception.** The HRMS gradient hero, colored tone tiles and tinted chrome are DESIRED, and `/settings/*` follows the same treatment. The kit is `components/shared/rich-surface.tsx`, re-exported as `Hr*` by `features/hr/shared/hr-ui.tsx` — Administration imports the **shared** module, never `features/hr/**`. For these two only, `rounded-2xl` and `backdrop-blur` are sanctioned and override the card-radius rule and AP-4. Structural rules (fill chain, `h-9` controls, `LoadingButton`, `getErrorMessage`, a11y) are **not** relaxed.

### Type scale

Geist via `next/font`, no second sans-serif; the `cv02`/`cv03`/`cv04`/`cv11` alternates are global — don't remove them.

| Role | Class |
|---|---|
| Page title default · display | `text-lg font-semibold tracking-tight` · `text-2xl font-extrabold tracking-[-0.02em]` |
| Section heading · sub-heading | `text-sm font-semibold` · `text-[13px] font-medium` |
| Body · dense/table cell | `text-sm` · `text-[11px]` |
| Label · caption | `text-[13px] font-medium` · `text-[11px] font-medium tracking-wider` |
| Table header · badge | `text-[10px] uppercase tracking-wider font-bold` · `text-[10px]` |
| Mono / numbers | `font-mono text-[11px]` |

`h1`–`h6` default to `-0.02em` / weight 600; `font-extrabold` only for `variant="display"` and marketing.

### Spacing — base unit 4px

Never `p-[7px]`, `mt-[13px]`, `gap-[5px]`.

- Page chrome belongs to `components/ui/content-fill-panel.tsx`: `PAGE_CHROME_X` = `px-4 sm:px-6 lg:px-8`, `PAGE_CHROME_BOTTOM` = `pb-0`.
- **Card padding** standard `p-4` · compact list `p-3` · metric `p-4 sm:p-5` · section header in card `px-4 py-3`.
- **Gaps** `gap-1` icon+label · `gap-2` field stack/button group · `gap-3` filter bar & header actions · `gap-4` card grid · `gap-6` section separator.
- **Surface hierarchy from the existing shadcn palette:** page canvas `background` → cards/panels `card` → grouped controls/columns `muted` → table headers `muted` with a 2px divider → selected tabs/rows `accent`. Light-mode `border`/`input` use the existing slate-300 strength so panels and controls remain legible on white; themed light palettes mix their brand into that same base. Calendar and workload headers may use `secondary` where they need a stronger schedule band. Do not add parallel surface palette options; the existing variables are tuned for light/dark and every selectable primary palette inherits them.
- **Table density from the primitives:** `TableHead` `h-10 px-2 text-sm font-medium text-muted-foreground whitespace-nowrap` · `TableRow` `hover:bg-muted data-[state=selected]:bg-accent border-b` · `DataTable` header `sticky top-0 z-10 bg-muted border-b-2` · skeleton cell `px-2 py-2 text-sm`. **Anything denser than `h-10` is not implemented.**
- **Radius scale** (`--radius: 0.625rem`): `sm` 6 · `md` 8 · `lg` 10 · `xl` 14px. Inputs/tables `rounded-md`, cards/panels `rounded-xl`, `2xl`/`3xl` marketing + the HR/Administration rich surface only.
- **Shadows:** `shadow-sm` for page panels, `shadow-noir` inside `<Card>`. `shadow-soft`/`shadow-medium` are **deprecated**.

### Motion

| Context | Spec |
|---|---|
| Button hover · press | 150ms `transition-colors` (CSS, no Framer) · `whileTap={{ scale: 0.97 }}` |
| Dropdown/popover · Dialog | 150ms `ease-out` `tailwindcss-animate` · `fade-in-0 zoom-in-95` |
| Sheet slide-in | 200ms `ease-out`, matched to its side |
| Page / step transition | opacity + x, `duration: 0.22, ease: "easeOut"`, inside `<AnimatePresence mode="wait">` |
| List stagger · skeleton shimmer | `delay: index * 0.08` · 1.5s linear infinite (CSS) |

**Never animates:** sidebar width (CSS `transition-[width]` only) · table rows on data refresh · hover states · status badge changes.

### Icon sizes

nav / row action / filter `h-4 w-4` · button icon `h-3.5 w-3.5` (small `h-3 w-3`) · card/stat `h-5 w-5` · empty-state `h-8 w-8` · full-page illustration `h-12 w-12`. `AnimatedIconButton`'s `iconSize` defaults to 14; pass 16 where the static icon was `h-4 w-4`.

Animated icon names are **not** 1:1 with lucide (`MoreHorizontal` → `EllipsisIcon`); verify the export in `node_modules/@animateicons/react`. **`PencilIcon` does not exist — keep `Pencil` static.**

---

## Overlay ladder

Always use the lowest rung that suffices. Escalating past the first rung that fits is a violation, not a style choice.

```
ONE field on a record already on screen?
├─ YES → bounded option set?  NO → RUNG 1 inline edit (no overlay)
│                             YES → RUNG 2 ResponsivePopover (Drawer < md)
└─ NO  → ≤5 fields, no context needed      → RUNG 3 EntityFormDialog   sm:max-w-md
         6+ / multi-section / keep context → RUNG 4 EntityFormSheet    sm:max-w-md–lg
         read-only detail of one record    → RUNG 4 AppSheet           sm:max-w-lg–xl
         irreversible / lifecycle          → ConfirmDialog destructive (any field count)
         substantial entity or workspace   → RUNG 5 full page route
```

Rung 1 `features/build/views/card-inline-fields.tsx` · rung 2 `components/ui/responsive-popover.tsx` (`INLINE_POPOVER_MIN_CLASS`) · rungs 3–4 `components/shared` · confirms `components/ui/confirm-dialog.tsx`, `unsaved-changes-dialog.tsx`.

**Sheet/dialog zones** — header and footer never scroll:

```tsx
<SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
  <div className="shrink-0 px-6 py-4 border-b"><SheetHeader>…</SheetHeader></div>
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">{/* fields */}</div>
  <div className="shrink-0 px-6 py-4 border-t">
    <div className="grid grid-cols-2 gap-2">      {/* 3+ → grid-flow-col auto-cols-fr */}
      <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
      <Button type="submit">Save Changes</Button>
    </div>
  </div>
</SheetContent>
```

`SheetContent` is **always** `p-0`; the body **must** carry `min-h-0`. `SheetTitle` `text-base font-semibold`, `SheetDescription` `text-[13px] text-muted-foreground`. Widths: short form `sm:max-w-md` · long form `sm:max-w-md`–`lg` · detail `sm:max-w-lg`–`xl` · full-context edit `sm:max-w-2xl` · mobile nav `w-[17rem]`.

---

## The scroll chain

Only **one** element scrolls: `PageWrapper`'s content zone. The shell is `overflow-hidden` above it.

```
PageWrapper           flex h-full min-h-0 flex-1 flex-col   ← owned by the component
├── header zone       shrink-0
├── filter zone       shrink-0, one non-wrapping scrollable row
└── content zone      flex-1 min-h-0 overflow-y-auto        ← the ONE scroller
    └── your body     must carry flex-1 min-h-0 to fill it
```

A body using `space-y-4` instead of `flex flex-1 min-h-0 flex-col` leaves dead background above the Ask OS bar; a `DataTable`/`EmptyState`/`ErrorState` without `flex-1 min-h-0` stops short of the shell edge. `noInternalScroll` moves scroll responsibility to **you** — only for boards and maps.

### Shell layout

```
h-dvh flex flex-col overflow-hidden
├── [TrialBanner — shrinks to 0 when inactive] · [CommandPalette — Portal, z-50]
└── flex-1 flex min-h-0
    ├── aside [Sidebar — w-[17rem] / w-[3.5rem] collapsed, hidden md:flex]
    │   └── logo + workspace switcher · primary nav (≤7) · module nav · user/settings footer
    └── div [Content — flex-1 min-w-0 flex flex-col overflow-hidden]
        ├── GlobalHeader [h-10 shrink-0 border-b px-4]   (hidden below md)
        └── main [flex-1 min-w-0 flex flex-col overflow-hidden]
            └── div [flex-1 min-h-0 overflow-auto flex flex-col pb-16 md:pb-0]
                └── [PageWrapper] header shrink-0 · filters shrink-0 · content flex-1 min-h-0 overflow-y-auto
```

**Mobile chrome.** Nav is a left `Sheet` (`w-[17rem]`). Each module's primary destinations become `MobileModuleBottomNav` (fixed bottom, z-40, `pb-safe`, `MAX_MOBILE_MODULE_TABS = 5`, overflow in the Menu drawer). `MobileShellFab` opens Ask OS · Menu · Search · Profile. Chat keeps `ChatMobileBottomNav`; module tabs and FAB are suppressed during an open conversation. Reserve `pb-[calc(4rem+…)]` only when a bottom bar is mounted.

---

## Screen templates

Copy the archetype, fill in the entity. **Anything not shown is owned by a primitive** — never write page padding, control heights, table density, card radius or the scroll container.

### T1 · List + filters + table

Canonical: `features/settings/organization/hierarchy/branches-page.tsx`

```tsx
<PageWrapper
  title="Branches"
  subtitle="Branches within your organization."          // descriptive, not a bare row count
  actions={                                              // secondary first, ONE primary last, max 3
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button variant="outline" size="sm" className="flex-1 text-xs sm:flex-none" onClick={handleToggle}>…</Button>
      {canManage ? (
        <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm"
          className="flex-1 sm:flex-none" onClick={handleCreate}>Add Branch</AnimatedIconButton>
      ) : null}
    </div>
  }
  filters={<SearchInput placeholder="Search branches…" value={search} onValueChange={handleSearch} />}
>
  <PageState resolution={pageState}>
    <DataTable
      data={rows} columns={columns} getRowKey={(row) => row.id}
      isLoading={isLoading} emptyState={emptyState} minWidth="1000px"
      className="flex-1 min-h-0"                          // mandatory — this is the fill chain
      pagination={{ mode: "server", page, pageSize, total: data?.total ?? 0,
        onPageChange: setPage, onPageSizeChange: setPageSize, pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS }}
    />
  </PageState>
</PageWrapper>
```

`flex-1 min-h-0` on `DataTable` is not optional · `pagination` is **server** mode for anything that can exceed a page · `minWidth` forces horizontal scroll rather than crushing columns · a sole filter fills mobile width (never a Drawer), 2+ filters keep search first and collapse the rest below `md` · at 375px actions become a full-width row and the table becomes cards via `mobileCard`.

### T2 · List + cards

Same header/filters as T1; body is `<div className="flex flex-1 min-h-0 flex-col gap-3">` wrapping a `grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3` of `bg-card rounded-xl border border-border shadow-sm p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer` cards, then `<TablePagination />`. Only the card is `rounded-xl`; inner rows and chips stay `rounded-lg`/`rounded-md`.

### T3 · Detail + tabs

`PageWrapper` with `contentClassName="flex min-h-0 flex-1 flex-col"` → `<Tabs>` carrying the same three classes → each body-filling `TabsContent` on `TABS_CONTENT_PAGE_BODY_CLASS` (hand-writing `flex-1 min-h-0 mt-0` omits the `data-[state=active]:` guards). `backHref` only on a page with no sidebar entry · tab state syncs to the URL · 5+ triggers as a status filter is **AP-2**.

### T4 · Settings section — Administration & HR

`features/settings/organization/organization-settings-page.tsx`: `PageWrapper` → `<RichPageContent className="flex-1 min-h-0">` → `OrgSettingsCard` (title, description, `icon`, optional `action` gated on `canEdit`) → `SettingsFieldGrid` / `SettingsField`. `OrgSettingsCard` sits on `RichPanel` + `RichIconWell`; `RichPageContent` supplies the `gap-3 sm:gap-4` rhythm — never `space-y-*` here.

### T5 · Module hub / landing

`features/hr/hub/hr-hub-page.tsx`: `PageWrapper variant="display"` → `RichPageContent` → `RichHero` of `RichQuickAction` tiles (horizontally scrollable on mobile) → queues / today / metrics bands. Every panel self-gates on its endpoint's exact permission and renders **nothing** when unheld, so a 2-permission user gets a short clean page rather than a wall of empty states.

### T6 · Board / kanban

The one screen that owns its scroll. `PageWrapper … noInternalScroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"` → a `flex min-h-0 flex-1 gap-3 overflow-x-auto` rail → per column `flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card`, with a `shrink-0` header and a `flex-1 min-h-0 overflow-y-auto p-2` body. Column totals come from a server aggregate, never `COUNT(*)` per render. Past ~50 cards use `react-window` v2 with `Droppable mode="virtual"` + `renderClone`.

> **dnd gotcha:** react-window v2's `List` holds the scroll container in `useState(null)`, so `api.element` is `null` on first render and `@hello-pangea/dnd` trips "innerRef has not been provided with a HTMLElement". Wrap `<List>` in a `display:contents` shell and point `provided.innerRef` at `shellRef.current.firstElementChild` in a `useLayoutEffect`.

### T7 · Fill-height list page

`PageWrapper` gets `noInternalScroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"`. Body order = stats row (`shrink-0 mb-2`) → conditional bulk bar → table card (`flex-1 min-h-0`), the card being `<Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">` around `<CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">`. Filters render above it, `shrink-0`, no border/background, search `min-w-0 flex-1 lg:max-w-md`. Non-fill pages (settings, detail sub-tables) use `<Card className="overflow-hidden"><CardContent className="p-0 overflow-x-auto">`.

---

## Component contracts

**Buttons** — one default-variant `<Button>` per view. Default (slate-900 fill) = the single most important action · Outline = secondary (Export, Edit, Cancel) · Ghost = tertiary/icon-only · Destructive = delete confirm only, inside `AlertDialogAction`. `h-9` standard, `h-7` icon-only in table rows. Press feedback is built into `Button` — never re-add `active:scale`.

**Cards** — `<Card>` primitive (`bg-card text-card-foreground flex flex-col rounded-xl border border-border/70 shadow-noir`) when you need CardHeader/Content/Footer, or a plain panel via `CONTENT_PANEL_SOLID` (`rounded-xl border border-border bg-card shadow-sm`) — import the constant, never retype it. Always `bg-card`, never `bg-white`; translucent fills ≥75% card opacity with ≥70% borders. Clickable cards add `hover:border-primary/40 hover:shadow-md transition-all cursor-pointer`.

**StatCard** — `rounded-lg border border-border bg-card px-3 py-2.5` (~56px): tinted icon square (`h-8 w-8 rounded-md`) left, label `text-[11px] font-medium text-muted-foreground` (no uppercase) + value `text-lg font-semibold tabular-nums` right. `tone`: `default` · `blue` · `emerald` · `amber` · `red` · `violet` (RBAC/privileged); optional `delta`, `hint` (never with `delta`; truncates unless `wrapHint`, for a hint that carries data), `href`, `isLoading`. **`StatCardGrid` is always ONE horizontal row:** `repeat(N, minmax(10rem, 1fr))` from child count, `gap-3`, horizontal-scroll container **at every breakpoint** (`overflow-x-auto scrollbar-hide touch-pan-x`) so the ROW scrolls and the PAGE never does. Never `md:overflow-x-visible`, never multi-row, never wrap.

**DataTable** props:

| Prop | Notes |
|---|---|
| `data` `T[]` · `columns` `DataTableColumn<T>[]` | required |
| `getRowKey` `(row, index) => string \| number` | required — takes **index too** |
| `isLoading` · `emptyState` | skeleton rows matching column count · rendered in a colspan cell |
| `pagination` | `{ pageSize?; onPageSizeChange? }` \| `{ mode: "server"; page; pageSize; total; onPageChange; … }` \| cursor variant — **always pass it** |
| `selection` | `{ selected: Set<…>; onChange; isRowSelectable? }` — adds the checkbox column |
| `sortState` | `{ fields; field; direction; onChange }` = **server sort, the only sort there is**; omit it and no header offers to reorder |
| `mobileCard` | `(row, index) => ReactNode`, replaces the table below `sm` |
| `mobileCardBreakpoint` | `"sm"` (default) or `"xl"`: where cards give way to the table. Use `"xl"` when a trailing action column clips at 768-1024px with the sidebar open |
| `scrollRegionLabel` | names the scrolling element and makes it the one keyboard stop (`role="region"`, `tabIndex=0`) for a table wider than its container |
| `search` / `toolbar` | declared and compiling — **do not pass them** |
| `onRowClick` · `footer` · `minWidth` · `className` · `rowClassName` | `rowClassName: (row, index) => string` |

`DataTableColumn<T>` = `{ key; header; cell: (row) => ReactNode; className?; headerClassName? }`. Search and filters live in `PageWrapper`'s `filters` prop above the card.

**Sorting is the server's.** `sortState.fields` names the `key`s the endpoint accepts; a column in that list gets a header control, every other column gets none. Canonical `features/directory/users/users-page.tsx` — the only file passing `sortState`; one `as const` list feeds both the URL-param parse and `fields`, which is what stops them drifting. A `DataTable` holds one page, so a client-side column sort reorders that page and presents it as a sorted table. `components/ui/data-table-sorting.test.tsx` holds the line.

**Pagination — two components, not interchangeable.** `DataTablePagination` is what `DataTable` renders internally — never mount it yourself. `TablePagination` is for every **non-`DataTable`** paginated surface. Both take a `mode` discriminant; offset is the default. Offset = `{ page, pageSize, total }`, rendering "Showing 21–40 of 312". **Cursor = `{ mode: "cursor", rowCount, hasMore, hasPrevious, onNext, onPrevious }`, prev/next only** — a keyset list has no total and nothing may be faked; the inactive half of each variant is typed `never`. Drive it with `useCursorPager(resetKey?)`, which owns the cursor stack — "previous" in a keyset list is the cursor that produced the previous page, not a subtraction. Pass a `resetKey` summarising active filters + page size and the stack rewinds during the render the key changes.

**Infinite scroll — `InfiniteScrollSentinel` (`components/ui/infinite-scroll-sentinel.tsx`).** The third form, and the one FE-125 requires wherever a reveal button used to sit on a keyset read. Drop it after the last row: `<InfiniteScrollSentinel hasNextPage={q.hasNextPage} isFetchingNextPage={q.isFetchingNextPage} onLoadMore={q.fetchNextPage} label="Load more tickets" />` — the props line up with `useInfiniteQuery` directly. It observes itself 300px before it enters the viewport, fetches once, and will not stack a second request while one is in flight. It renders `null` when the collection is exhausted unless you pass `exhausted`. **The `label` is not decoration:** scrolling is not an affordance a keyboard or screen-reader user has, so the sentinel also renders a `sr-only focus:not-sr-only` button carrying that label, which is the accessible path and the fallback where `IntersectionObserver` is absent (jsdom, SSR, old browsers). Name it for the rows — "Load more tickets", not "Load more". Infinite scroll does **not** exempt you from FE-112: an accumulating `useInfiniteQuery` still mounts every row it has loaded, so windowing (`react-window` v2) is still required wherever the list can grow large.

**PageWrapper props:** `title?` (the h1) · `subtitle?` · `badge?` · `backHref?` / `onBack?` / `backLabel?` · `leading?` · `actions?` (max 3) · `filters?` · `filtersClassName?` · `actionsInline?` · `children` · `className?` / `contentClassName?` · `noInternalScroll?` · `variant?: "default" | "display"`. **There is no `eyebrow` and no `filtersCollapseBreakpoint`.** Title classes belong to the component: default `text-base sm:text-lg font-semibold tracking-tight leading-tight`; display `font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em]`. `badge` renders `bg-primary/10 border-primary/20 text-[11px] tabular-nums`. A string `title` is auto-wrapped in `<TruncatedText>`; a `ReactNode` title is not.

**Form shells** — `EntityFormSheet` / `EntityFormDialog`, generic over `<TInput, TOutput>`: `open` · `onOpenChange` · `title` · `description?` · `resolver` · `defaultValues` · `onSubmit` · `isSubmitting?` · `submitLabel?` · `cancelLabel?` · `side?` (Sheet only) · `className?` · `resetOnOpen?` · `children: (form) => ReactNode`.

```tsx
// canonical: features/build/epics/create-epic-dialog.tsx
const handleSubmit = (data: CreateSprintInput) => createSprint.mutate(payload, {
  onSuccess: () => { toast.success("Sprint created successfully"); setOpen(false); },
  onError: (error) => { toast.error(getErrorMessage(error)); },
});

<EntityFormSheet<CreateSprintInput>
  open={open} onOpenChange={setOpen} title="Create new sprint"
  resolver={zodResolver(createSprintSchema)} defaultValues={{ name: "", … }}
  onSubmit={handleSubmit} isSubmitting={createSprint.isPending} submitLabel="Create sprint"
>
  {(form) => <SprintFormFields form={form} />}
</EntityFormSheet>
```

**Field primitives** (`components/ui/form.tsx`): `Form` (FormProvider) · `FormField` (Controller + name context) · `FormItem` (`div.grid.gap-2`) · `FormLabel` (auto `htmlFor`, `data-[error=true]:text-destructive`) · `FormControl` (Slot wiring `id`, `aria-describedby`, `aria-invalid`) · `FormDescription` · `FormMessage` (`text-destructive text-xs`, `role="alert" aria-live="polite"`). Label above control, helper below, error below helper. `FormMessage` renders `null` with no error — never conditionally mount it. All controls inherit `h-9 / text-sm` from `FIELD_CONTROL_CLASS`.

**Confirmations** — `UnsavedChangesDialog { open, onOpenChange, title?, description?, keepEditingLabel?, discardLabel?, saveLabel?, onSave?, onDiscard, isSaving? }` (omit `onSave` → Discard + Keep editing only). `ConfirmDialog { title, description, icon?, content?, confirmLabel?, cancelLabel?, destructive?, isPending?, confirmIcon?, hideConfirm?, keepOpenOnConfirm?, onConfirm } & ({ trigger } | { open, onOpenChange })` — trigger XOR controlled, enforced by the type. `keepOpenOnConfirm` keeps a failed action's dialog open; `hideConfirm` makes it a blocked-state explainer.

**States** — **Empty**: `<EmptyState>` fills available height and provides its own `min-h-80`; the default illustration is `size-48` on mobile and `size-56` from `sm`: illustration → title (short noun phrase) → one-sentence description → **one** CTA. Full-page empties use a themed SVG from `components/illustrations`; compact/table-cell empties retain the compact preset. **Filter-empty ≠ data-empty:** filters active → "No results match your filters." + Clear filters; no data → the create action. **Loading**: skeletons, never standalone spinners — `<DataTableSkeleton rows columns />` (defaults 12/4), `StatCardGridSkeleton`, `KanbanBoardSkeleton`, or `<Skeleton>` shaped to real content. A skeleton is a **visual Xerox** — same sections and columns, ~9–12 dense rows, filling remaining height, one non-wrapping row of `h-9` blocks for filters. Suppress under 200ms (`isPending && !data`). **Error**: `<ErrorState>` — friendly non-technical title, `description` that may include a user-actionable error, `onRetry` wired to `refetch`, `className="flex-1"`.

**Filters & toolbars** — 2–4 mutually exclusive views → `Tabs`/segmented chips · 5+ status options → `Select` · multiple facets → one `Select` each · free text → `SearchInput` + `useDebouncedValue` (≥300ms; the component does not debounce for you) · dates → `DateRangePicker` or two `date` inputs, never free text · bulk actions → a contextual toolbar shown only when rows are selected.

```tsx
<div className={FILTER_TOOLBAR_ROW}>            // components/ui/content-fill-panel.tsx
  <SearchInput … />
  <Select …><SelectTrigger className={FILTER_SELECT_TRIGGER} />…</Select>
  <div className="ml-auto flex shrink-0 items-center gap-2">{/* export/secondary */}</div>
</div>
```

**Build lists use `BuildListToolbar`, not a hand-built row.** A Build list page passes it to `PageWrapper`'s `filters` prop and declares its controls; it never writes breakpoint logic. Order is fixed — search, then the most general categorical filter, then specific filters, then `trailing` view/display/export. Below `md`: one control fills the row, two split it evenly, and a third collapses everything after search into the filters Drawer, whose trigger carries the count of active filters it hides. There is never a fourth mobile row for chips, Clear or display settings. Three functional bands at most precede content — identity, actions (`BuildHeaderActions`), filters.

**Sentinel-default Selects:** the first option is an "all" sentinel with a descriptive label (`<SelectItem value="all">All statuses</SelectItem>`); choosing it **removes** the query param rather than setting `"all"`. `FILTER_SELECT_TRIGGER` carries colour chrome only (`border-input bg-card`), deliberately **no height class**. `FILTER_TOOLBAR_ROW` is the only filter-row container: one row, `flex-nowrap`, `overflow-x-auto scrollbar-hide`, children `shrink-0`. Filter rows never wrap; never hide overflow with `overflow-hidden`. No card or panel around a filter row — fields already carry `border-input bg-card`. Search leftmost, status second, specific filters after, export/secondary at `ml-auto`. `SelectContent className="min-w-[var(--radix-select-trigger-width)]"` (`FIELD_SELECT_CONTENT_CLASS`) — never `w-[…]`, which clips.

**Badges** — `<Badge variant="outline">` + semantic classes: table row `h-4 px-1.5 py-0 text-[9px]` · card chip `h-5 px-2 py-0.5 text-[10px]` · header/filter `h-5 px-2 py-0.5 text-xs`.
