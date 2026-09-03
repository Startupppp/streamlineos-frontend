# 38d — Box 1, clause one, closed at zero; clause two, argued and left open

Session S14. This closes ticket 38 box 1 **under a stated interpretation**, and says plainly
what that interpretation is and why the box as literally worded should not be implemented.

FE = `streamlineos-frontend/frontend`. Every number below came from a command I ran and read.

---

## 1. The measurement, and why the previous denominator could not be trusted

Prior sessions counted with a brace-matching scanner over raw text. I re-measured with the
**TypeScript compiler AST** — `ts.createSourceFile(..., ScriptKind.TSX)`, then every
`JsxAttribute` whose name matches `/^on[A-Z]/` and whose initializer is a `JsxExpression`
wrapping an `ArrowFunction` or `FunctionExpression`. A regex over JSX both over-counts (an
arrow in a non-event prop, an arrow inside a string literal) and under-counts (a multi-line
body, a nested brace), and an unreliable denominator makes this box unfalsifiable in either
direction.

My own first scan under-counted too, and the gate caught it: I had excluded any directory
named `public`, which silently dropped `features/sign/public/`. That directory held a real
violation (`public-field-overlay.tsx:138`). The committed gate uses the repo's shared
`isExcludedScanDir`, so it cannot make that mistake.

Same scanner, same corpus, before and after:

| | before (base of this session) | after |
|---|---|---|
| `.tsx`/`.jsx` files scanned | 3,831 | 3,832 |
| inline closures in JSX event props | 1,569 | **1,475** |
| **non-trivial, release scope** | **95** | **0** |
| non-trivial, out of release scope | 44 | 44 |

The "before" figure was produced by running today's gate over `git archive` of my base commit
in a temp tree. The two runs are one commit-range apart in a shared working tree, so the
94-closure drop is mine plus whatever other lanes landed; the **95 → 0** is the number I own.

---

## 2. The line I drew, and why the box should not be read literally

The box has two clauses and they do not agree.

**Clause one — "Non-trivial UI events and form actions use named, typed handlers whose names
express user intent."** This is the substantive one and it is now met at **zero** for every
release-scope path.

**Clause two — "No inline arrow or function expression appears in a JSX event prop."**
This is an absolute, it is false at 1,475 occurrences, and **it should not be implemented as
written.** Roughly four in five of those are `onClick={() => setOpen(true)}` — one call to a
stable setter, holding no rule, no mutation, no failure mode. Hoisting it to
`const handleOpen = () => setOpen(true)` twenty lines up makes the JSX *harder* to read, not
easier: the reader now has to go and look. Converting all of them touches on the order of
1,300 files, produces no test that could bite, and collides with every other lane in this
release. I am not narrowing the box quietly — I am saying the second clause is a bad rule and
recording the judgement, exactly as R-10 already did.

So the gate enforces the word the box itself uses, **NON-TRIVIAL**, and draws that line at
**routing versus computing**:

> A closure in a JSX event prop is **TRIVIAL** when it only ROUTES the event to code that is
> already named — at most two statements, each of them a single call whose arguments hold no
> computation, or a bare guard around one.
>
> It is **NON-TRIVIAL** when it COMPUTES: a call nested in an argument, a local declaration,
> a loop or switch, `try`/`catch`, `await`, or more than two statements.

**The justification is empirical, not stylistic.** Every defect ticket 38 has ever found lived
on the computing side — the numeric coercion in eight disagreeing spellings, one of which put
`NaN` into a required `z.number()`; the code field written as "reject the whole edit", which a
controlled input turns into a box that appears frozen. Not one lived on the routing side.
`e.stopPropagation(); onDelete(row)` has never hidden a bug and naming it would not have found
one.

Concretely accepted as trivial and left alone: single-setter clicks, `(e) => e.stopPropagation()`,
`e.stopPropagation(); handleEdit(row)`, `setEditTarget(x); setSheetOpen(true)`,
`(open) => { if (!open) onClose(); }`, functional updaters `setOpen((v) => !v)` and
`setForm((p) => ({ ...p, name: e.target.value }))`, and nullish adapters `(v) => f.onChange(v ?? "")`.
**1,475 of these, deliberately.**

---

## 3. What the 95 conversions actually were

| Class | n | What it was |
|---|---|---|
| Numeric coercion | 44 | `Number(e.target.value)` (NaN into a required schema), `parseFloat(v) \|\| 0`, `parseInt(v)` with no radix, `v === "" ? 0 : Number(v)`, and a Select's `Number(v)` |
| Per-site orchestration | 21 | a `setTimeout` plus a DOM query behind `onValueChange`; an RHF `register().onChange` chained with a slug rule; two date coercions; three cursor-pagination updaters; a snooze that mutates and then closes the drawer |
| Restricted-field rules | 7 | the Latin-only-name and digits-only "reject the edit" rules (R-10c, preserved verbatim) |
| Agenda generation | 5 | five dropdown items, one of which also carried a banned `as AgendaSource[]` cast |
| List membership | 3 | `checked ? [...list, v] : list.filter(...)` retyped where `lib/toggle-in-list.ts` already owned it |
| Case normalisation | 4 | `e.target.value.toUpperCase()` / `.toLowerCase()` on a GSTIN, a product key, a workspace key, a secret name |
| Activation key | 3 | `if (e.key === "Enter" \|\| e.key === " ")` retyped where `lib/keyboard-activation.ts` already owned it |
| Guarded select | 4 | `SHARE_ROLES.find(...)` / `isScopeType(v)` narrowing inline in `onValueChange` |
| Remainder | 4 | a read-only form's no-op `async () => {}`, a `String()` coercion, two page-index updates |

**Two things worth naming.**

`features/sign/settings/general-settings-form.tsx` carried a private `toNumber` used at eight
`onChange` sites. Report 38c records that `lib/numeric-field.ts` was **promoted out of this very
file** — and the file itself was never converted back to it. It is now, so the rule lives in one
place with tests instead of in the file it was extracted from.

`lib/case-field.ts` is new and its header says what it is NOT: it is deliberately not
`codeFieldValue`, which also strips every non-alphanumeric character and truncates at a cap.
That is right for an IFSC and wrong for a GSTIN typed with a space or a secret name with an
underscore. Conflating them would have been a silent behaviour change at four sites.

**Behaviour deltas, stated rather than buried.** Three conversions route a lossy spelling to the
shared, tested rule and therefore change behaviour in the direction that module exists to fix:
`parseInt` no longer silently truncates `1.5` to `1` (a `z.number().int()` field now says so),
`Number("abc")` no longer leaks `NaN`, and `Number("")` no longer becomes `0` where the field is
optional. Everything else preserves behaviour exactly, including the `setListMembership` swap
(the helper additionally refuses to push a duplicate, which a checkbox cannot produce).

**R-10c is preserved, not decided.** `components/hr/_onboarding/restricted-field-change.ts` gives
the name rules a NAME while leaving them byte-identical, and its header records that the reject-
the-edit shape makes a pasted "O'Brien" silently do nothing, that widening the pattern is the HR
product owner's call, and that the module must not move to `lib/` because a shared home would
bless a Latin-only name rule for the whole repo. The handler clause is satisfied; the product
question is untouched.

---

## 4. The gate

`frontend/scripts/check-named-handlers.mjs`, wired as `check:named-handlers` and
`check:named-handlers:self-test` beside the other `check:*` scripts.

- **Threshold is ZERO for release-scope code, not a ratcheted baseline**, and the script says so
  in its own success output so nobody can mistake it for a laundered number.
- **Out-of-scope prefixes are explicit and counted.** `features/crm`, `features/inventory`, their
  `app/(authenticated)` route folders, `app/(public)`, `features/marketing`, `features/landing`.
  The 44 non-trivial closures they hold are printed on **every** run — inventory 31, crm 11,
  landing 2 — so the exclusion cannot quietly grow. `app/(public)` and `features/marketing` hold
  **zero**; those two entries are inert and exist only to make the boundary explicit.
- **Vacuity floor** at 500 files, matching the other gates: a broken walk fails rather than
  reporting a clean tree.
- **33 self-tests, 6 of them bite proofs**, covering both directions — eight shapes that must stay
  inline, seven that must be rejected, plus the scope exclusions and the corpus floor.

**Bite proof, both directions, hermetic.** Run in an rsync'd copy of the tree with a symlinked
`node_modules`, never in the shared working tree (~10 agents were working in it):

| Tree | Command | Exit | Output |
|---|---|---|---|
| clean copy | `node scripts/check-named-handlers.mjs` | **0** | 3,831 files, 1,475 closures, 0 violations |
| `+ onChange={(e) => field.onChange(Number(e.target.value))}` planted in `policy-rules-fields.tsx` | same | **1** | `features/hr/policies/policy-rules-fields.tsx:61  onChange — computes a value inline` |
| `+ onRowClick={(row) => setOpenSubjectId(row.subjectId)}` planted (a TRIVIAL routing closure) | same | **0** | still clean — the gate is not merely counting arrows |
| defect removed | same | **0** | back to 1,475 closures, 0 violations |

`git status --short` on both planted paths in the real tree was empty afterwards.

---

## 5. Gates — command, exit code, number

Exit codes captured with `$?` on an unpiped command (`${PIPESTATUS[0]}` does not work in this zsh).

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **0** | 0 errors |
| `npx eslint <all 66 files I changed>` | **0** | 0 errors, 4 warnings — all four verified pre-existing against the pre-image (`Date.now` in a `useMemo`, a ref read during render, an unused type import) |
| `pnpm -C frontend check:named-handlers` | **0** | 3,832 files · 1,475 inline closures · **0** release-scope violations · 44 excluded |
| `pnpm -C frontend check:named-handlers:self-test` | **0** | 33 passed |
| `jest --runInBand --testPathPattern="(lib/__tests__\|features/renderer\|features/notifications\|features/mail\|features/calendar/calendar-month-year-picker\|features/__tests__\|components/ui/__tests__\|hooks/common/use-cursor-page-stack)"` | **0** | 53 suites, **585 tests** passed |
| `jest --runInBand --testPathPattern="(features/hr\|features/build\|features/sign\|features/surveys\|features/payroll\|features/settings\|features/accounting\|features/party\|features/portal\|features/employee\|features/workflows\|features/billing\|features/org-setup\|components/hr\|lib/prefetch\|lib/renderer\|hooks/api)"` | **0** | 108 suites, **1,148 tests** passed |
| `check:icon-labels` / `check:empty-states` | **0** | 0 violations, 3,832 files each |
| `check:over-300` | **0** | 518 of 5,292 (baseline 519) |
| `check:formatters` / `check:colors` / `check:effect-fetches` | **0** | 0 violations, 5,307 files each |

**Red, and verified NOT mine** (none of the named files appears in any of my six commits):

| Command | Exit | Why it is not mine |
|---|---|---|
| `check:import-direction` | 2 | `shared-imports-feature: 20 (baseline 19)`. All 20 are `components/**` importing `@/features/**`. I added no such import — every import I added is `@/lib/*` or a sibling relative path. |
| `check:type-assertions` | 1 | stale ledger entries for `features/build/forms/public-form-api.ts` and `features/build/intake/public-intake-api.ts` — another lane's files. |
| `check:file-sizes` | 1 | `hooks/api/notifications-inbox.ts` (534) and its test (663) — another lane's files. |

**Not run:** `pnpm lint` repo-wide (I linted my 66 files instead), `next build`, and every backend
gate — this session touched no backend path.

---

## 6. What is left, and who owns it

- **R-10 (clause two, 1,475 inline arrows).** Unchanged, still ACCEPTED, still the release owner's
  ratification. This session's contribution is that the line between what was converted and what
  was not is now written down, gated, and re-measurable in one command instead of living in prose.
- **R-10b (the out-of-scope residue).** 44 non-trivial closures — inventory 31, crm 11, landing 2.
  The gate names them on every run. When CRM or Inventory re-enters scope, delete the prefix from
  `OUT_OF_SCOPE_PREFIXES` and the gate immediately reports the work.
- **R-10c (the Latin-only account-holder-name rule).** Unchanged and still the HR product owner's
  decision. It now has a name and a header explaining the trap, which is as far as a refactor can
  honestly take it.
