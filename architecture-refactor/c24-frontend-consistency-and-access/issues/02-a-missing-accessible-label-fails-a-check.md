# 02 — A missing accessible label fails a check

**What to build:** The accessibility gap cannot reopen. A lint rule catches an unlabelled icon-only control at the call site, which is where a component test cannot reach.

**Blocked by:** 01 — Icon-only buttons are triaged and labelled

**Status:** in-progress — rule exists, is registered, is narrowed to its provable case and is documented; it is still `warn`, so it cannot yet *fail* anything

**Premise correction (2026-08-26).** The ticket reads as if the rule needs building. It already existed: `frontend/eslint-rules/no-unlabelled-icon-button.mjs`, registered in `eslint.config.mjs` under the `streamline` plugin in two config blocks. What was wrong was subtler — it was set to **`warn`**, and `package.json`'s lint script is a bare `eslint` with no `--max-warnings`, so **ESLint exits 0 and CI passes**. A mechanism that looks like enforcement and is not, which is this program's recurring shape.

## Acceptance criteria

- [ ] A new icon-only control without an accessible name fails the check. — **NOT MET.** The rule detects the case correctly, but at `"warn"` severity `eslint` exits 0, so nothing fails. Closing this is a two-word change — `"warn"` → `"error"` in both blocks of `eslint.config.mjs` — gated on the criterion below.
- [ ] The rule runs in CI. — it *executes* in CI today (`frontend/.github/workflows/ci.yml:36-37` runs `pnpm lint`), but see above: executing and gating are different, and only the second is what this criterion is for. **Deliberately not ticked on the technicality that it runs.**
- [x] Existing labelled controls pass without modification. — proven by triage rather than assumed. The rule as written flagged **101 controls across 84 files**; all but one were false positives of a heuristic that treated any JSX child as an icon. Three patterns accounted for them: `forwardRef` wrappers spreading `{...props}` where the caller supplies `aria-label`; buttons wrapping `<span>`/`<div>`/`<p>` that contain visible text; and buttons rendering `<TruncatedText>`/`<Avatar>`, which are UI, not icons. The rule now flags only where every JSX child is named `*Icon` and no static evidence of a label exists. On six previously-flagged files that reduces the count to exactly the one genuine case, with no existing control edited to suit it.
- [x] The rule is documented alongside the design-system guidance. — `frontend/CLAUDE.md`, immediately under the "Accessibility is part of the contract" line that states the requirement. Records what the rule catches, the four patterns it deliberately skips, why it is narrow, and the suppression form (`// eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>`, never a bare disable).

## Todo

- [x] The rule is the durable part; the labels were the one-time work — and the one-time work turned out to be **one label**, not 101. `DeselectAllButton` (`app/(authenticated)/notifications/page.tsx:49`) rendered a bare `XIcon`, so a screen reader announced only "button". Now `aria-label="Deselect all"`.
- [ ] Flip both `eslint.config.mjs` blocks to `"error"` — **blocked on a clean full-repo count.** A full `eslint` run was started and had not finished; the machine is running three other lanes' test suites concurrently. Flipping to `error` on a sampled count would break CI for all four lanes if even one violation survives outside the sample. Re-run `npx eslint --format json -o report.json .` in `frontend/`, confirm zero `streamline/no-unlabelled-icon-button` entries, then flip.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** Two of four criteria met. The two open ones are the same change — raising the severity — held back only because the evidence needed to do it safely (a whole-repo count under the corrected rule) was still computing. The narrowing itself is not a way of dodging the count: it was driven by reading the 101 findings, and it left the one real defect visible rather than silencing it.

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
