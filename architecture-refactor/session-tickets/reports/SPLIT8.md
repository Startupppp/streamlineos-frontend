# SPLIT8 — Over-threshold file inventory and splits

## 1. Verified over-threshold inventory

### Files over 500 lines (pre-split, source truth from `wc -l` on the working tree)

`feedbucket-widget/` was initially excluded by mistake. Correct scope includes it — it is hand-written TypeScript, not generated or vendored.

| Path | Lines (pre-split) | Exempt | Action |
|---|---|---|---|
| `feedbucket-widget/src/ui.ts` | 1024 | No — hand-written vanilla TS | **SPLIT** — 4-way extraction |
| `feedbucket-widget/src/annotator.ts` | 617 | No — hand-written vanilla TS | **SPLIT** — icon+styles extracted |
| `components/automations/automation-trigger-data.ts` | 605 | No | **SPLIT** — by module domain |
| `features/chat/channel-sidebar.tsx` | 535 | No | **SPLIT** — 3 sub-components |
| `features/crm/import/planned-import-section.tsx` | 523 | No | **SPLIT** — 2 card components extracted |
| `features/chat/huddle-panel.tsx` | 513 | No | **SPLIT** — 2 sub-components |
| `hooks/api/inventory/reports.ts` | 510 | No | **SPLIT** — types extracted to `reports-types.ts` |
| `app/(authenticated)/inventory/sales-orders/[soId]/page.tsx` | 510 | No | **SPLIT** — helpers extracted to `so-detail-helpers.tsx` |
| `features/hr/performance/pip-tab.tsx` | 504 | No | **SPLIT** — `PipCard` extracted |
| `hooks/api/accounting/core.ts` | 501 | No | **SPLIT** — 4 domain files + keys file |

**Total over 500 (pre-split): 10 files.** All 10 were split. No file was left over threshold by an indefinite deferral.

---

## 2. Splits performed — Session 1 (prior)

### Split A — `channel-sidebar.tsx` (535 → 414 lines)

**Responsibility split:** sidebar orchestration, thin ChannelItem adapter, collapsed rail, archived-channels section.

| File | Lines | Responsibility |
|---|---|---|
| `features/chat/channel-list-entry.tsx` | 41 | `ChannelListEntry` — thin ChannelItem adapter |
| `features/chat/channel-compact-rail.tsx` | 91 | `ChannelCompactRail` + `CompactRailButton` — collapsed rail |
| `features/chat/channel-archived-section.tsx` | 84 | `ChannelArchivedSection` — archived list |
| `features/chat/channel-sidebar.tsx` (updated) | 414 | Orchestration, state, filters, expanded sections |

Importers of `ChannelSidebar` unchanged. Cycle check: acyclic by construction.

### Split B — `huddle-panel.tsx` (513 → 440 lines)

**Responsibility split:** invite dialog (own state + mutation) and collapsed mini-bar extracted.

| File | Lines | Responsibility |
|---|---|---|
| `features/chat/huddle-invite-section.tsx` | 79 | `HuddleInviteSection` — invite state + hook |
| `features/chat/huddle-mini-bar.tsx` | 65 | `HuddleMiniBar` — collapsed participant controls |
| `features/chat/huddle-panel.tsx` (updated) | 440 | Session lifecycle, WebRTC, reactions, controls bar |

`inviteUserId` / `useInviteToHuddle` moved into `HuddleInviteSection`. Props interface unchanged.

### Split C — `automation-trigger-data.ts` (605 → 28 lines)

**Responsibility split:** each module owns its trigger metadata; shared types in a neutral file.

| File | Lines | Responsibility |
|---|---|---|
| `automation-trigger-types.ts` | 12 | `TriggerModule` + `TriggerMeta` types |
| `automation-trigger-data-crm.ts` | 44 | CRM triggers |
| `automation-trigger-data-support.ts` | 57 | Support triggers |
| `automation-trigger-data-finance.ts` | 23 | Finance triggers |
| `automation-trigger-data-hr-recruitment.ts` | 182 | HR recruitment triggers |
| `automation-trigger-data-hr-employee.ts` | 286 | HR employee lifecycle triggers |
| `automation-trigger-data.ts` (barrel) | 28 | Assembles `TRIGGER_META`, re-exports all |

---

## 3. Splits performed — Session 2 (this session)

### Split D — `feedbucket-widget/src/annotator.ts` (617 → 487 lines)

**Responsibility split:** SVG icon utilities and CSS styles extracted from `Annotator` class.

| File | Lines | Responsibility |
|---|---|---|
| `feedbucket-widget/src/annotator-icon-util.ts` | 64 | `NS`, `STROKE`, `Tool` type, `TYPES`, `icon()`, `filledRectIcon()`, `TOOL_ICONS` |
| `feedbucket-widget/src/annotator-styles.ts` | 68 | `annotatorStyles(): string` — CSS template literal |
| `feedbucket-widget/src/annotator.ts` (updated) | 487 | `Annotator` class: draw loop, tools, export |

Behavior: `this.styles()` method removed; `style.textContent = annotatorStyles()` calls the extracted function.

### Split E — `feedbucket-widget/src/ui.ts` (1024 → 539 lines)

**Responsibility split:** drag state machine, launcher DOM factory, panel DOM factory, shared types/utilities extracted. Widget state machine (17 named handlers + business flow methods) stays in `ui.ts` — irreducible minimum.

| File | Lines | Responsibility |
|---|---|---|
| `feedbucket-widget/src/ui-icon-util.ts` | 54 | `NS`, `POSITION_KEY`, `FeedbackType`, `ViewState`, `FEEDBACK_TYPES`, `IconSpec`, `svgIcon()` |
| `feedbucket-widget/src/ui-drag.ts` | 183 | `DragManager` class — all drag state + 4 pointer event handlers |
| `feedbucket-widget/src/ui-launcher-builder.ts` | 108 | `buildLauncher()` — launcher DOM factory, `buildLogoMark()`, `launcherButton()` |
| `feedbucket-widget/src/ui-panel-builder.ts` | 260 | `buildFeedbackPanel()`, `buildResultView()` — panel DOM factories, all refs/callbacks |
| `feedbucket-widget/src/ui.ts` (updated) | 539 | `FeedbucketWidget` class: widget state + 17 named handlers + business flows |

`ui.ts` at 539 lines exceeds 500 by 39. Rationale for residual: the class has 17 named handlers (CLAUDE.md §6 bans anonymous handlers), each referencing 4–11 `this.*` fields spanning drag, capture, AI assist, screenshot, recording, and submission state. Extracting any method group requires passing a 10+ field context bag — which is worse architecture than leaving them co-located. Reduction from 1024 → 539 (47%) represents the achievable split.

### Split F — `hooks/api/accounting/core.ts` (501 → 7-line barrel)

**Responsibility split:** COA, GL, fiscal periods/opening balance, and recurring journals are four distinct domains.

| File | Lines | Responsibility |
|---|---|---|
| `hooks/api/accounting/core-keys.ts` | 22 | `coreKeys` factory + `toQuery` utility — neutral, no React, imported by all 4 domain files |
| `hooks/api/accounting/core-coa.ts` | 150 | COA types + read/mutation hooks + journal approval hooks |
| `hooks/api/accounting/core-gl.ts` | 75 | GL types + `useGeneralLedger`, `useGlAccounts` |
| `hooks/api/accounting/core-periods.ts` | 154 | Period types + period lifecycle hooks + opening balance hooks |
| `hooks/api/accounting/core-recurring.ts` | 116 | Recurring journal types + CRUD hooks |
| `hooks/api/accounting/core.ts` (barrel) | 7 | `export *` from all 4 domains + `./dimensions` |

Circular import prevention: `core-keys.ts` is imported by domain files but never imports from them or from `core.ts`. No cycle possible.

All existing callers import from `hooks/api/accounting/core` — the barrel re-exports every symbol, so zero import-site changes required.

### Split G — `features/hr/performance/pip-tab.tsx` (504 → 392 lines)

**Responsibility split:** card rendering (avatar, status badge, dropdown actions) extracted as `PipCard`.

| File | Lines | Responsibility |
|---|---|---|
| `features/hr/performance/pip-card.tsx` | 135 | `PipCard` — per-PIP card with named action handlers (`handleEdit`, `handleComplete`, `handleExtend`, `handleTerminate`) |
| `features/hr/performance/pip-tab.tsx` (updated) | 392 | State machine, form handlers, list orchestration |

`PipCard` receives `pip: PIP`, `onOpenEdit`, `onUpdateStatus` — no prop drilling beyond 2 levels.

### Split H — `hooks/api/inventory/reports.ts` (510 → 258 lines + 287-line types file)

**Responsibility split:** all type definitions (public + internal raw response types) extracted.

| File | Lines | Responsibility |
|---|---|---|
| `hooks/api/inventory/reports-types.ts` | 287 | All interfaces: exported (`MovementType`, `StockSummaryRow`, etc.) + internal raw API shapes (`RawTransactionRow`, `RawReorderEnvelope`, etc.) |
| `hooks/api/inventory/reports.ts` (updated) | 258 | `"use client"` + transform functions + 6 hooks; re-exports public types via `export type { … } from "./reports-types"` |

All callers import from `hooks/api/inventory/reports` — public exports unchanged.

### Split I — `inventory/sales-orders/[soId]/page.tsx` (510 → 367 lines)

**Responsibility split:** pure helpers and UI-only sub-components extracted.

| File | Lines | Responsibility |
|---|---|---|
| `so-detail-helpers.tsx` | 154 | `FulfillmentStepper`, `AtpIndicator`, `formatNum`, `SoLine` type, `buildSoLineColumns`, step constants |
| `page.tsx` (updated) | 367 | Page state, mutation handlers, layout, dialogs, sheets |

`FulfillmentStepper` and `AtpIndicator` have zero shared state with the page component — clean extraction.

### Split J — `features/crm/import/planned-import-section.tsx` (523 → 407 lines)

**Responsibility split:** preview result card and committed success card extracted. State machine stays — the pipeline's sequenced invariants (overrides applied only at preview, not at commit) require shared state.

| File | Lines | Responsibility |
|---|---|---|
| `features/crm/import/import-preview-card.tsx` | 134 | `ImportPreviewCard` — `ColumnMappingReview` + summary grid + row list + commit button; `Summary` and `toneFor` co-located |
| `features/crm/import/import-committed-card.tsx` | 38 | `ImportCommittedCard` — success state with revert action |
| `features/crm/import/planned-import-section.tsx` (updated) | 407 | State machine, upload card, `sameAnswers` utility |

---

## 4. Files remaining over 500 post-split

| File | Final lines | Notes |
|---|---|---|
| `feedbucket-widget/src/ui.ts` | 539 | Defensible minimum for widget state machine — see Split E rationale above |

---

## 5. Madge / cycle verification

`madge` is not installed in `frontend/node_modules/.bin/`. Import graph acyclicity verified by manual trace for every touched path:

- Splits A, B: parent → extracted children; children do not import back. Acyclic.
- Split C: module data files import types from neutral `automation-trigger-types.ts`; barrel imports module files. No cycle.
- Splits D, E: `annotator.ts` / `ui.ts` import from their extracted helpers; helpers have no imports from parent files. Acyclic.
- Split F: `core-keys.ts` ← domain files ← `core.ts` (barrel). Strictly layered; `core-keys.ts` imports nothing from the accounting hook layer. Acyclic.
- Splits G–J: parent imports extracted child; child does not import parent. Acyclic.
