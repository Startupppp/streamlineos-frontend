# 35: Consolidate formatters and page states

**What to build:** Money/date/number formatting and empty/loading/error states use organization-aware shared primitives consistently across in-scope modules.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Local formatters migrate to canonical organization-aware helpers or documented valid exceptions.

  **19 → 0.** Every `new Intl.NumberFormat(` outside `lib/format-utils.ts` is gone; no exception was needed.

  | Shape | Replacement |
  |---|---|
  | client component rendering the organization's own money | `useOrgDisplay()` + `formatMoney` / `formatMoneyCompact` |
  | non-hook module, or a per-record currency that is not the organization's | `formatCurrencyFull(value, currency)` |
  | plain number for a chart axis | new `formatNumber(value, locale)` |
  | locale-aware percentage | new `formatPercent(value, locale)` |

  Two sites were not money at all and would have been wrong to convert with a money helper: `features/build/reports/chart-card.tsx` formats bare axis ticks, and `features/renderer/format-value.tsx` formats a percentage. `lib/format-utils.ts` gained `formatNumber` and `formatPercent` for them, with tests covering locale variation, negatives and zero.

  **One site was a structural defect rather than a formatting one.** `features/payroll/shared/payroll-format.ts` exported a function literally named `formatMoney` taking `(value, currencyString)` — colliding with the canonical `formatMoney(value, MoneyDisplay)`. It is now a thin wrapper over `formatCurrencyFull` preserving its `"—"` guard, so its 35+ payroll callers are unchanged and the name no longer means two things.

  `scripts/check-no-local-formatters.mjs` gained the exception mechanism the criterion asks for — `{ file, line, reason }` entries, failing on a missing reason and on a stale entry so dead exemptions cannot accumulate. It is registered and empty.

  Review found the checker had **no self-test**, unlike its two siblings, so a typo in its pattern would have reported perfect compliance. It now has five assertions (`--self-test`) covering detection, a whitespace-padded form, three non-false-positives, line attribution and that the walk reaches the tree, plus a hard floor on files scanned in the real run. Registered as `check:formatters:self-test`.

  **One conversion was a precision regression and is reverted.** Four `ActionCard` figures in `features/accounting/overview/overview-client.tsx` — AR overdue, AP due, Tax Payable and burn rate — previously rendered at full integer precision and were swapped to `formatMoneyCompact`, turning a statutory Tax Payable figure into `₹12.3L`. They now use `formatCurrencyFull(value, currency, locale, 0)`. The four `StatCard` values above them were already compact and correctly stay compact.

- [x] Hand-written empty states migrate to shared states or documented specialized exceptions.

  **The reported 26 was an undercount, and finding that out was the substantive part of this ticket.**

  `check-no-handrolled-empty-states.mjs` skipped an entire file if the string `"EmptyState"` appeared anywhere in it. So converting one of five hand-rolled blocks in a file silenced the other four — a false pass by construction. The checker now scans per block with a line number.

  Rewriting it turned 26 reported files into **57 blocks**: 26 in the first pass, then 31 more that the file-level skip had been masking. All 57 are resolved — 54 converted, 3 registered as exceptions.

  | Shape | Replacement |
  |---|---|
  | full-panel empty | `<EmptyState className="flex-1">` |
  | `DataTable` `emptyState` prop | `<EmptyState className="border-0 bg-transparent min-h-[40vh]">` — the table already owns the chrome |
  | an error hand-rolled as an empty state | `<ErrorState onRetry={refetch}>` with `getErrorMessage` |
  | a hand-rolled access denial | `<NoPermissionState>` |

  Nine exceptions are registered, each with a reason: the three AI welcome screens (`ask-os-chat-utils`, `build/ai/ai-chat-panel`, `wiki/kb-chat-parts`), the chat welcome with three icon actions that `EmptyState` cannot express (it supports two, as buttons), the org-setup animated preview overlay, the HR rich-surface work-log cards, the chart-empty primitive itself (converting it would be circular), a CRM chart container that was a false positive, and an expense-upload dropzone matched only because `EmptyUploadIllustration` contains the word "empty".

  The rewritten checker carries a self-test that builds a synthetic hand-rolled block and asserts it is still detected, because a check narrowed until it matches nothing reports perfect compliance.

- [x] Currency, locale, filtered-empty, loading and retry behavior remain correct.

  Filter-empty is kept distinct from data-empty: where filters are active the copy says results do not match and offers a way to clear them; where there is no data it offers the create action. Every existing illustration is passed through the `illustration` prop rather than dropped, and every CTA keeps its permission condition.

  **Currency rendering changes for organizations not configured in INR, and that is the intended fix**, not an incidental one. Money on a tenant's records must render in that tenant's currency. Affected: accounting cash-flow, project budget, banking hub, accounting overview, HR analytics payroll cost, timesheet rates. `features/inventory/**` is an excluded domain, so its three sites adopt the shared helper and change nothing else; payroll stays INR-defaulted, which is what its callers pass.

  One cosmetic difference is worth recording: `features/accounting/shared/money.tsx` previously hand-built compact strings for non-INR currencies and fell back to two decimals below 1,000. `Intl` compact renders `$12` where the old code rendered `$12.00`. Values at or above 1K are identical.

- [x] Formatter and empty-state structural checks pass.

  ```
  $ node scripts/check-no-local-formatters.mjs
  ✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts.
  EXIT=0

  $ node scripts/check-no-handrolled-empty-states.mjs
  ✔  No hand-rolled empty states found outside EmptyState.
  EXIT=0

  $ npx tsc --noEmit                                    → EXIT=0
  $ node ./node_modules/jest/bin/jest.js lib/format-utils features/payroll → 45 passed
  ```

  **A caution about reading these exit codes.** An earlier verification loop in this session reported every check as passing because it was written as `echo "exit=$? $(tail -1 log)"` — the command substitution runs first and resets `$?`, so a failing check reported 0. The contract-drift check was red for some time behind that. Capture the exit code on its own line.
