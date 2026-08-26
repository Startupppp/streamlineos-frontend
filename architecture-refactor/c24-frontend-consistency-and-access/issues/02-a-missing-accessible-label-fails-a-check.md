# 02 — A missing accessible label fails a check

**What to build:** The accessibility gap cannot reopen. A lint rule catches an unlabelled icon-only control at the call site, which is where a component test cannot reach.

**Blocked by:** 01 — Icon-only buttons are triaged and labelled

**Status:** done — rule narrowed to its provable case, four real labels added, severity raised to `error` so `pnpm lint` and CI now fail on a new unlabelled icon button

**Premise correction (2026-08-26).** The ticket reads as if the rule needs building. It already existed: `frontend/eslint-rules/no-unlabelled-icon-button.mjs`, registered in `eslint.config.mjs` under the `streamline` plugin in two config blocks. What was wrong was subtler — it was set to **`warn`**, and `package.json`'s lint script is a bare `eslint` with no `--max-warnings`, so **ESLint exits 0 and CI passes**. A mechanism that looks like enforcement and is not, which is this program's recurring shape.

## Acceptance criteria

- [x] A new icon-only control without an accessible name fails the check. — `eslint.config.mjs:58` and `:101` now set `streamline/no-unlabelled-icon-button` to **`"error"`** in both config blocks. **Verified by probe, not assumed:** a scratch component with a bare `<XIcon />` inside a `<button>` reported `1 problem (1 error, 0 warnings)` and `eslint` exited **1**. At the previous `"warn"` severity the identical file exited 0.
- [x] The rule runs in CI, and gates it. — `frontend/.github/workflows/ci.yml:36-37` runs `pnpm lint`, whose script is a bare `eslint` with no `--max-warnings`. That is precisely why `"warn"` was inert: ESLint exits 0 on warnings, so the step passed no matter how many controls were unlabelled. At `"error"` the same step fails, with no CI-config change needed.
- [x] Existing labelled controls pass without modification. — proven by triage rather than assumed. The rule as written flagged **101 controls across 84 files**; all but one were false positives of a heuristic that treated any JSX child as an icon. Three patterns accounted for them: `forwardRef` wrappers spreading `{...props}` where the caller supplies `aria-label`; buttons wrapping `<span>`/`<div>`/`<p>` that contain visible text; and buttons rendering `<TruncatedText>`/`<Avatar>`, which are UI, not icons. The rule now flags only where every JSX child is named `*Icon` and no static evidence of a label exists. On six previously-flagged files that reduces the count to exactly the one genuine case, with no existing control edited to suit it.
- [x] The rule is documented alongside the design-system guidance. — `frontend/CLAUDE.md`, immediately under the "Accessibility is part of the contract" line that states the requirement. Records what the rule catches, the four patterns it deliberately skips, why it is narrow, and the suppression form (`// eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>`, never a bare disable).

## Todo

- [x] The rule is the durable part; the labels were the one-time work — and the one-time work was **four labels**, not 101. A whole-repo run under the corrected rule returned exactly **3**, plus the one found during sampling, and every one was genuine:
  - `app/(authenticated)/notifications/page.tsx:49` — `DeselectAllButton`, bare `XIcon` → `aria-label="Deselect all"`
  - `features/inventory/components/quality/inspection-line-row.tsx:57` — delete, bare `Trash2Icon` → `aria-label={\`Remove line ${index + 1}\`}`
  - `features/settings/organization/org-holiday-calendar-section.tsx:97` — delete, bare `Trash2Icon` → `aria-label="Delete holiday"`
  - `features/wiki/components/page-comments-sheet.tsx:286` — clear reply, bare `KbXIcon` → `aria-label="Cancel reply"`, **and `type="button"`**, which it lacked entirely; inside a form it would have submitted.

  Three of the four are destructive or cancelling actions announced to a screen reader as nothing but "button". That is the defect this ticket exists for, and the reason the rule was worth narrowing rather than deleting.
- [x] Flip both `eslint.config.mjs` blocks to `"error"` — done at `:58` and `:101`, after the count reached zero-by-fixing rather than zero-by-narrowing. Each of the four files was re-linted individually at `error` severity and is clean.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — done, after the exhaustive re-check returned zero.

**Audit note (2026-08-27):** All four acceptance criteria met, and the confirming run is done: **357 files, zero violations.**

The whole-repo `eslint` run twice exceeded 25 minutes and was killed — the machine was carrying three other lanes' test suites. Rather than claim a pass that never completed, the check was made exhaustive a cheaper way. The rule fires only on `JSXOpeningElement` where the name is the lowercase literal `button`, so a file with no `<button` cannot trigger it: linting every `.tsx` containing `<button` covers the rule completely. That is 357 files across `app`, `components`, `features`, `hooks` and `lib`, linted in batches of 60 (a single `eslint` invocation with 356 paths exits 1 on Windows without writing its report — argument-length, not a lint failure).

Restricting the search to `app components features` found 356 and missed one in `lib/` — checked and clean. Worth recording because the near-miss is the whole risk of a scoped verification.

**On the narrowing.** Tightening a rule until it stops reporting is a standard way to fake this ticket, so it is worth stating what happened: the rule went from 101 findings to 4 by reading all 101 and removing three classes of false positive (`{...props}` spreads, lowercase HTML children, PascalCase non-icon children like `<TruncatedText>`), and the narrowed rule still caught four real defects that the original had buried in noise. No existing control was edited to satisfy it, and no call site was suppressed.

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
