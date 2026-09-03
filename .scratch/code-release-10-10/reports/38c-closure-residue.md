# 38c — Box 1's residue: converted, counted, and the rest ruled out of scope

Session S11. Supersedes nothing; it closes out the residue `reports/38-handler-responsibility.md`
§6 left named. Every number came from a command whose output I read.

FE = `streamlineos-frontend/frontend`.

---

## 1. What the residue actually was, re-measured at head

The S10 report counted 38 risky closures. Two things happened since: the five cross-feature
duplications got their shared homes (commit `6081382d3`, `lib/keyboard-activation.ts` +
`lib/toggle-in-list.ts`), and other lanes moved code. So it was re-measured rather than assumed.

Scanner: every `.tsx` under `frontend/`, each JSX attribute matching `on[A-Z]…={`, brace-matched
through quotes and nested braces, classified by whether the expression is an arrow or function
expression, whether it is non-trivial (a statement, multiple lines, `await`, `try`), and whether it
is risky (a mutation, a network call, validation, a parse, a storage or navigation call — something
that can fail or that encodes a rule).

| | S10 | At my start | After |
|---|---|---|---|
| `.tsx` files scanned | 3,223 | 3,808 | 3,808 |
| Inline arrows in JSX event props | 1,427 | **1,577** | **1,562** |
| …non-trivial | 205 | 207 | 196 |
| …risky | 82 | **27** | **16** |
| …risky in `features/build\|hr\|chat\|notifications` | 38 | **11** | **0** |

The repo-wide risky count fell 82 → 27 without me, which is other lanes doing their own conversions.
The 11 in my territory are the ones I owned, and all 11 are converted.

---

## 2. The largest finding: one rule, 44 call sites, eight spellings, and a real defect

A text input always hands back a string, so every numeric form field has to decide what an emptied
box means. That decision was retyped at **44 `field.onChange` call sites** in at least eight
spellings, and they **disagree**:

| Spelling | An emptied box becomes |
|---|---|
| `Number(v)` | `0` |
| `parseInt(v, 10)` | `NaN` |
| `parseInt(v)` (no radix) | `NaN` |
| `parseFloat(v) \|\| 0` | `0` |
| `parseInt(v, 10) \|\| 0` | `0` |
| `v ? Number(v) : 0` | `0` |
| `v ? Number(v) : undefined` | `undefined` |
| `v === "" ? undefined : Number(v)` | `undefined` |

`NaN` is the harmful one and it is not theoretical. `features/hr/shifts/shift-form-sheet.tsx:61`
declares `breakMinutes: z.number().int().min(0).max(480)` — **required**. Clearing that box sent
`NaN` into the resolver, so the user was told "Expected number, received nan" instead of "Required",
and `.min(0)` never ran at all. Four fields across three HR files were in this state
(`shift-form-sheet` ×2, `biometric/add-device-sheet`, `enterprise/comp/exercise-dialog` ×2 — the last
two without even a radix).

`features/sign/settings/general-settings-form.tsx:30` already had the correct shape as a private
local helper (`toNumber`, `NaN → undefined`) used eight times in that one file. Per reuse-before-create
it was promoted rather than reinvented — and it had to move to `lib/`, because `features/A` may not
import from `features/B`.

**`frontend/lib/numeric-field.ts`** now owns it: `numericFieldValue(raw)` returns `undefined` for an
empty, whitespace-only, non-numeric or non-finite box and the number otherwise, and
`numericFieldChange(field.onChange)` is the react-hook-form binding, so the JSX prop holds a **call**
rather than a closure. It deliberately does not truncate a decimal — `Number("1.5")` stays `1.5` so
that a `z.number().int()` field can say "expected integer" instead of silently accepting `1`.

Pinned by `frontend/lib/__tests__/numeric-field.test.ts` — 13 cases, two of them bite proofs: one
asserts `parseInt("", 10)` is `NaN` and that this function is not, the other asserts `Number("")` is
`0` and that this function is not.

Converted (8 fields, 5 files): `hr/shifts/shift-form-sheet.tsx` ×2 · `hr/assets/asset-form-sheet.tsx`
· `hr/biometric/add-device-sheet.tsx` · `hr/enterprise/comp/exercise-dialog.tsx` ×2 ·
`hr/recruitment/candidates-list/add-candidate-sheet.tsx` ·
`hr/recruitment/candidates-list/edit-candidate-sheet.tsx`.

---

## 3. The other seven conversions

| File | Was | Now |
|---|---|---|
| `features/chat/channel-info-panel.tsx:181` | `unpinMessage.mutate({…})` inline in `onClick` | `unpinMessageHandler(pin.messageId)` |
| `features/chat/channel-info-panel.tsx:258` | `muteChannel.mutate({…})` inline in `onClick` | `muteChannelHandler(opt.value)` |
| `features/chat/channel-info-panel.tsx:215` | `MUTE_OPTIONS` declared **inside the render**, rebuilt every render | module-level `as const` |
| `features/build/teams/team-form-sheet.tsx:253` | the team-key format rule (`toUpperCase().replace(/[^A-Z0-9]/g, "")`) inline in `onChange` | named `toTeamKey` + `teamKeyChange` |
| `features/hr/documents/document-editor-page.tsx:167` | `void handleSave().catch(…)` — the same save-and-report pair as the autosave effect at `:59` | one named `saveAndReportFailure`, used by both |
| `features/hr/employees/detail/timeline-tab.tsx:55` | two conditional refetches inline in `onRetry` | named `handleRetry` |
| `features/hr/templates/survey-editor.tsx:109` | `split(",").map(trim).filter(Boolean)` inline in `onChange` | named `parseOptionList` + `optionListHandler` |

**And one banned cast removed.** `survey-editor.tsx:76` was
`onValueChange={(v) => handleChange(q.id, { type: v as SurveyQuestion["type"] })}` — three violations
stacked: an inline closure, an `as X` cast (shared CLAUDE.md §6), and a guard that would accept any
string the Select was ever given. It is now `isSurveyQuestionType`, a predicate built from the same
`QUESTION_TYPES` constant the `<SelectItem>`s render, so the guard cannot drift from the list.

---

## 4. The explicit scope judgement the box was ambiguous about

The box has two clauses and they now have different answers.

**Clause one — "Non-trivial UI events and form actions use named, typed handlers whose names express
user intent."** Closed for `features/build|hr|chat|notifications`: 0 risky closures remain there,
measured, down from 11.

**Clause two — "No inline arrow or function expression appears in a JSX event prop."** This is
literally false at **1,562** occurrences and I am ruling the remainder out of scope rather than
leaving it ambiguous.

The reason is that roughly 84% of the 1,562 are `onClick={() => setOpen(true)}`: one call to a stable
`useState` setter, holding no rule, no mutation, no network call, no validation and no failure mode.
Naming them changes no behaviour, produces no test that could bite, and would touch on the order of
1,300 files — which the PRD's closure protocol forbids doing for naming taste, and which would
collide with every other lane in this release. The remaining ~180 non-trivial-but-not-risky ones are
two-statement `onOpenChange` reset pairs and `e.stopPropagation(); doThing(row)` row actions, which
are legible as written.

**The box therefore stays unticked**, because clause two is written as an absolute and is not met —
not because clause one is unfinished.

---

## 5. What remains, named, all outside this session's territory

16 risky closures repo-wide. Two of them are the rule this session just gave a home to and can import
it directly:

- `components/automations/ai-node-config-forms.tsx:380` — `e.target.value === "" ? undefined : Number(…)`
- `features/surveys/respondent/simple-question-input.tsx:41` — the same

The rest, by owner:

- `components/hr/_onboarding/step-banking.tsx:93` and `:140`, `step-skills-pay.tsx:77` and `:125` —
  an IFSC uppercase-and-length rule, a trim-and-length rule, the same team-key rule
  `toTeamKey` now owns, and a numeric coercion. Four rules inline in an onboarding form.
- `components/assistant/global-ask-os.tsx:421` — `renameConversation.mutate` inline.
- `components/automations/ai-node-config-forms.tsx:296` — the same comma-list parse
  `parseOptionList` now owns.
- `features/inventory/components/order-line-table.tsx:146`, `receive-goods-sheet.tsx:381`,
  `stock/create-adjustment-sheet.tsx:119`, `stock/new-transfer-sheet.tsx:110`,
  `warehouse/warehouse-create-sheet.tsx:138` — four of these are a coerce-then-reset-a-dependent-field
  pair, which is one shared rule, not five.
- `features/crm/autonomy/autonomy-switches-panel.tsx:116` — `setSwitch.mutate` inline.
- `features/accounting/assets/create-asset-sheet.tsx:92` — `form.setValue` with a coercion.
- `features/payroll/ess/components/ess-bank-section.tsx:256` — the IFSC uppercase rule the S10 report
  named as the best next candidate. Still there.

---

## 6. Gates — command, exit code, number

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **2** | 12 errors, **none mine**: 9 in `features/calendar/meeting-follow-up-panel.tsx`, 3 in `features/calendar/meeting-prep-panel.tsx`, all against `hooks/api/meetings-ai.ts`, which is ` M` in the shared tree — another lane mid-change. 0 errors in any path I touched. |
| `npx eslint` on all 13 files I changed | **0** | 0 errors, 1 pre-existing warning (`react-hooks/set-state-in-effect` at `shift-form-sheet.tsx:115`, untouched by me) |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="(numeric-field\|keyboard-activation\|toggle-in-list)"` | **0** | 3 suites, **27 tests passed** |
| `pnpm -s check:empty-states` | **0** | 0 violations, 3,817 files |
| `pnpm -s check:icon-labels` | **0** | 0 violations, 3,817 files |
| `pnpm -s check:type-assertions` | **0** | no forced-typing escape in application code |
| `pnpm -s check:import-direction` | **0** | 194/194, at baseline |
| closure scanner (scratch, not committed) | — | 1,562 inline / 196 non-trivial / **16 risky / 0 risky in my territory** |

**Not run:** `pnpm lint` repo-wide (reported red at 14 errors before I started; I linted my 13 files
instead), `next build`, backend gates.
