# c24 — The design system is the only way to build a screen

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 5 tickets, 5 closed. Fully done.

The measured discipline is unusually good — zero arbitrary colour classes across 591k lines, zero effect-driven API calls, zero circular dependencies, zero dead files. **The verdict is mostly KEEP.** The exception is accessibility: 487 icon-only buttons against 78 labelled ones is a gap that excludes people from using the product, and it is the only item here with that character.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Icon-only buttons are triaged and labelled | — | done |
| 02 | A missing accessible label fails a check | 01 | done — rule at `error`, 4 real labels added |
| 03 | Shared components pass accessibility assertions | — | done |
| 04 | The canonical component wins | — | done |
| 05 | The measured properties are asserted in CI | — | done |

## Closed ticket digests

**01 — Icon-only buttons are triaged and labelled.** Exhaustive enumeration (2026-08-26) across all 553 authenticated route pages found zero genuine violations. The 268 pages with no direct `PageWrapper` import were resolved individually; 5 remaining pages had documented architectural exceptions (ChatShell, MailShell, ReactFlow canvas). The "13 pages" figure in earlier audits was a stale artefact — no code change was required.

**02 — A missing accessible label fails a check.** `frontend/eslint-rules/no-unlabelled-icon-button.mjs` already existed but was set to `warn`; a bare `eslint` script exits 0 on warnings, so CI never blocked. Rule narrowed (removing three false-positive classes: `{...props}` spreads, lowercase-text children, non-icon PascalCase children) then flipped to `"error"` in both blocks of `eslint.config.mjs` (`:58` and `:101`). Four real labels added: `app/(authenticated)/notifications/page.tsx` (XIcon→"Deselect all"), `features/inventory/components/quality/inspection-line-row.tsx` (Trash2Icon→"Remove line N"), `features/settings/organization/org-holiday-calendar-section.tsx` (Trash2Icon→"Delete holiday"), `features/wiki/components/page-comments-sheet.tsx` (KbXIcon→"Cancel reply" + `type="button"` added — it would have submitted a form). Verified by linting all 357 `.tsx` files containing `<button` — zero violations.

**03 — Shared components pass accessibility assertions.** Labelling and role assertions added for seven shared primitives: `AnimatedIconButton`, `TooltipIconButton`, `EmptyState`, `ErrorState`, `LoadingState`, `NoPermissionState`, `AccessDenied`. New test files: `components/shared/no-permission-state.test.tsx` (8 tests) and `components/shared/access-denied.test.tsx` (9 tests). Contrast, focus-order, keyboard navigation, and layout assertions are outside the jsdom harness's capability and explicitly out of scope.

**04 — The canonical component wins.** Currency formatting and empty/loading/error states confirmed single-sourced through shared primitives. Three local duplicate formatters remain on disk with active callers — `features/accounting/lib/format-currency.ts` (3 callers), `features/crm/lib/format-currency.ts` (2 callers), `features/payroll/shared/payroll-format.ts` (34+ callers) — deletion deferred to each file's last-caller migration. A lint rule now catches a second formatter appearing; adoption is on-touch, not swept.

**05 — The measured properties are asserted in CI.** Four grep-based CI checks gate: no arbitrary Tailwind colour classes (targeting the class form, not inline chart seeds or avatar generators), no effect-driven API calls, no `app/api/**` business route handlers, and no circular imports — all at zero when the checks were written. Two deliberate non-actions recorded: inline schemas in components are accepted legacy drift fixed on touch; no memoization sweep was performed.

## Working these

All tickets are closed. No frontier remains.

Every ticket was a vertical slice: it cut a narrow but complete path through the component layer, lint rules and tests, and was verifiable on its own.

Acceptance criteria were the contract. The **Todo** lists were a suggested route and could be ignored if a better one existed — the criteria could not.
