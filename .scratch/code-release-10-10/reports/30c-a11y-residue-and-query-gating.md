# 30c — the a11y residue closed to its territory boundary, the closure residue converted, and box 28.2 unblocked

Session S13. Continues `reports/30b-states-a11y-and-journeys.md` (S11) and
`reports/38c-closure-residue.md` (S11) rather than replacing either. FE =
`streamlineos-frontend/frontend`.

Three tickets were in scope: 28 (three PARTIAL boxes), 30 (three open) and 38 (one open).
**Boxes 30.4 and 30.5, and boxes 28.6 and 28.7, were not worked.** No browser, dev server or
database was started this session; anything below that reads as a number came from a command
whose output I read.

---

## 1. Ticket 30 box 2 — 24 unreachable click targets became 10

S11 measured 632 lowercase-element click targets across 3,646 `.tsx` files, 24 of them
unreachable from a keyboard, and left the box open on that fraction. Fourteen of the 24 were in
this territory. All fourteen are fixed.

| | S11 | now |
|---|---|---|
| files scanned | 3,646 | 3,647 |
| click targets (the denominator) | 632 | **633** |
| unreachable | 24 | **10** |
| reachable | 608 / 632 · 96.2% | **623 / 633 · 98.4%** |

`components/__tests__/keyboard-reachability.contract.test.ts` ratchet lowered 24 → 10.

### The six that were a real defect, not a scan artefact

Six of the fourteen were an action cell wrapping row controls in
`<div onClick={(e) => e.stopPropagation()}>`. That stops the mouse click reaching the row. It
does **not** stop the keydown — and `DataTable`'s row handler does not look at the event target:

```
onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row.original); } } : undefined}
```

So Enter or Space on a nested Revoke / Edit / Mark-sent button fired **both** the control and the
row's navigation. A mouse user was protected; a keyboard user was not. All six now spread the
shared `propagationShield` from `lib/keyboard-activation.ts`, which carries both halves.

`components/__tests__/row-action-shield.a11y.test.tsx` — **7 cases, 2 bite proofs**: an unshielded
cell reaches the row on Enter, and a *click-only*-shielded cell also reaches the row on Enter,
which is the exact state the six were in. The shield stops Enter and Space, still stops the mouse
click, does not swallow the control's own activation, and the row itself still activates from the
keyboard.

Converted: `features/payroll/payout/bank-transfers/batches-table.tsx` ·
`features/payroll/taxes/tax-windows-tab.tsx` · `features/settings/api-tokens/org-tokens-tab.tsx` ·
`features/sign/envelopes/envelope-list.tsx` · `features/users/user-sessions-tab.tsx` ·
`features/users/user-table-columns.tsx` (which had a private copy of the same shield).

### The eight that had no keyboard equivalent at all

| Site | Was | Now |
|---|---|---|
| `components/editor/plate/plate-elements.tsx:278` | a `<span onClick>` page-link chip inside the editor | `activationProps(handleClick, "Open page …")` — role, tab order, Enter/Space, a name |
| `components/ui/avatar-stack.tsx:33` | a `<div onClick={() => onSelect?.(id)}>` inside `TooltipTrigger asChild` | a real `<button aria-pressed>` when `onSelect` is given, a plain `<span>` when it is not |
| `features/accounting/banking/.../reconciliation-match-panel.tsx:175` | the whole suggestion card took the click, and it holds its own Confirm button | `CARD_ACTIVATOR_CLASS` on the match label, `relative z-10` on the Confirm group |
| `features/accounting/expenses/create-batch-sheet.tsx:178` | a row whose click toggled the checkbox it contained | a `<label htmlFor>` for that checkbox; the row's own `onClick` and the checkbox's `stopPropagation` both went away |
| `features/dashboard/public-documents-card.tsx:113` | a row that opened the file, with hover-only actions | a stretched activator over the document name, plus `focus-within:opacity-100` so a keyboard reveals the actions it could already focus |
| `features/mail/email-chips-input.tsx:116` | `onClick` on the shell forwarding focus to the input | `onPointerDown` guarded on the shell itself — see below |
| `features/sign/builder/pdf-canvas.tsx:98` | click-to-place-a-field at x/y; no keyboard path | Enter or Space places the field at the centre of the page |
| `features/users/user-import-dialog.tsx:148` | a `<div>` dropzone opening the file picker | a `<button type="button">`, with the hidden `<input type="file">` moved out of it |

**The chips shell is the one judgement call and it is stated rather than hidden.** Its click did
not activate anything — it forwarded focus to a text box that is already in the tab order, so
there is no keyboard equivalent to supply. Moving it to `onPointerDown`, guarded on
`event.target === event.currentTarget`, says what it is: a pointer affordance. It is not a scan
dodge in the sense that matters — the element performs no action a keyboard user is now denied —
but it is the one of the fourteen where the scan stopped flagging a site without the site gaining
a keyboard path, and a reader should weigh it that way.

`<label>` was considered for the shell and rejected: the input's accessible name would have become
every email chip in the box.

### The denominator was corrected upward, not down

`countClickSites` counted `onClick` and `activationProps(` but not `propagationShield`. Converting
a finding onto the shield would therefore have removed it from the population it was counted
against — 632 would have become 624 and the ratio would have improved because the question was
withdrawn. `SHARED_ACTIVATION` now matches either helper, which also picked up three pre-existing
shield sites that had never been counted: 632 → 633. Two new self-tests pin it, one a bite proof
asserting a shielded site is both reachable and still in the denominator.

### What remains — 10, none of them fixable from here

`features/build/views/kanban-ticket-card.tsx:74` (build, another owner; S11 argued it and the
argument stands) · `features/crm` 7 (`contacts/contact-list-page.tsx:186`,
`deals/deal-kanban-card.tsx:156`, `deals/deal-list.tsx:69`, `leads/kanban-card.tsx:177,369,386`,
`settings/shared/chip-control.tsx:91`) · `app/(authenticated)/inventory/purchase-orders/page.tsx:198,253`.
CRM and Inventory are excluded from this release. Nine of the ten are ordinary card/row
activations that would take the same treatment as the eight above if the exclusion were lifted.

Beyond reachability, ARIA relationships and live-region correctness across 556 pages are still
established only by the rendered suites, unchanged from S11.

---

## 2. Ticket 38 box 1 — 10 of the 16 named closures converted, and one of them hid a defect

S11 named 16 risky inline closures and listed them by owner. Ten are in this territory and all ten
are converted. The remaining six are `features/inventory` (5) and `features/crm` (1) — out of
release scope.

**The bank/tax code rule is the finding.** It was written three ways and they disagree on the one
case that separates them, a paste:

| Spelling | `SBIN0001234 ` pasted into an IFSC field becomes |
|---|---|
| `if (/^[A-Z0-9]*$/.test(v) && v.length <= 11) field.onChange(v)` | **nothing happens** |
| `e.target.value.toUpperCase()` | `SBIN0001234 ` — fails the `^[A-Z]{4}0[A-Z0-9]{6}$` check |
| uppercase → strip → truncate | `SBIN0001234` |

The first is the harmful one and it is not theoretical. The field is controlled, so when the test
fails `field.onChange` is never called and React puts the old value straight back: the box looks
frozen and nothing says why. An IFSC copied from a bank statement carries a trailing space or a
hyphen more often than not. The PF/UAN and ESI fields beside it had the same reject-the-edit
shape against a length cap, so a long paste vanished too.

`lib/code-field.ts` owns it now — `codeFieldValue` / `codeFieldChange` (uppercase, strip
non-alphanumerics, truncate at the cap) and `digitsFieldValue` / `digitsFieldChange` for the
digits-only variant. `lib/comma-list.ts` takes over `parseOptionList`, which S11 had left as a
private function in `features/hr/templates/survey-editor.tsx` and which
`components/automations/ai-node-config-forms.tsx:296` could not import from there.

Pinned by `lib/__tests__/code-field.test.ts` (**16 cases, 3 bite proofs** — one asserts the
reject-the-edit test really does refuse the pasted code, one that upper-casing alone leaves it
failing the IFSC regex while this function does not, one that the length test drops a long paste
entirely) and `lib/__tests__/comma-list.test.ts` (**8 cases, 2 bite proofs** on the blank a
trailing comma leaves and the spaces a bare split keeps).

Converted: `components/hr/_onboarding/step-banking.tsx` ×3 ·
`components/hr/_onboarding/step-skills-pay.tsx` ×3 ·
`components/automations/ai-node-config-forms.tsx` ×2 ·
`components/assistant/global-ask-os.tsx` · `features/surveys/respondent/simple-question-input.tsx` ·
`features/accounting/assets/create-asset-sheet.tsx` ×2 (the depreciation-method closure beside the
named one was the same shape) · `features/payroll/ess/components/ess-bank-section.tsx`.

**Recorded, not fixed:** `components/hr/_onboarding/step-banking.tsx:33` holds the account-holder
name to `/^[A-Za-z\s]*$/` with the same reject-the-edit shape, so a pasted `O'Brien` or a name with
a diacritic silently does nothing. Converting it to strip-instead-of-reject would enshrine a
Latin-only name rule in a shared module. Which characters a person's name may contain is a product
decision, not a refactor, and it is handed up rather than decided here.

**The box still cannot tick**, and for S11's reason, unchanged: clause two — "No inline arrow or
function expression appears in a JSX event prop" — is written as an absolute and 1,562 occurrences
remain. That remainder was ruled out of scope in writing and was not reopened.

---

## 3. Ticket 28 box 2 — the blocker dissolved; 105 of 133 reads gated

S12 wrote: *"an AST scan finds 123 of 929 `useQuery`/`useInfiniteQuery` calls with no `enabled`
gate at all. Each needs its exact backend `@RequirePermission` key … Blocked on per-route backend
reading."*

**It was not blocked.** `frontend/contracts/openapi.json` carries `x-exposure` and `x-permission`
on every operation, generated from the controllers' own decorators. Resolving each ungated read's
URL against it answers the question mechanically.

Re-scanned at head with the TypeScript compiler API (`.ts` and `.tsx`, including
`useSuspenseQuery`, which is why the count is 133 rather than 123):

| | count |
|---|---|
| ungated reads under `hooks/api/**` | **133** |
| …whose route the backend declares `permissioned` | **115** |
| …`universal` | 6 |
| …`public` | 1 |
| …`in-service` | 1 |
| …unresolved (path built from a `BASE` const) | 10 |
| distinct permission keys needed | **55** |
| …of those already in the frontend catalog | **55 / 55** |

That last row matters: `useGatedQuery` takes a `PermissionKey`, so a key that had drifted from the
backend catalog would fail `tsc` rather than fail silently at runtime.

**105 converted.** The scan was verified against backend source, not only the snapshot — the
snapshot is known stale on `git-integration` (report 28 §red gates) — and every spot check matched
its controller: `support:macros:view` (`support-macros.controller.ts:62`), `support:reports:view`
(`support-csat.controller.ts:36`), `surveys:analytics:view`
(`survey-analytics.controller.ts:39`), `hr:travel:view` / `hr:travel:manage`
(`expenses/travel.controller.ts:28,45`), `sign:envelope:view`
(`sign-envelopes.controller.ts:54`), `crm:leads:view` (`leads.controller.ts:48,79`), `tasks:read`
(`tasks.controller.ts:61`) and `settings:api-tokens:read`
(`api-tokens/user/user-api-tokens.controller.ts:35`) — the last confirming that a `/me/*` route
really does require it, so gating there is right rather than over-gating.

### Why this is a defect and not tidiness

A v5 disabled query reports `isPending: true, isFetching: false` — identical to a finished empty
read. So a read that could only ever come back 403 was (a) sent on every mount of every page that
uses it, and (b) rendered downstream as "none yet" rather than as a permission failure.
`useGatedQuery` fixes both: it suppresses the request and attaches the `PermissionGate` to the
result.

`hooks/api/gated-read-suppression.test.tsx` — **14 cases** over four hooks chosen one per shape
(a bare list, a list with query params, a `/me` route, a cursor-paginated list). While denied,
nothing is sent; once allowed, it is; the key asked for is exactly the one the backend enforces;
and the gate travels on the result so a screen can tell denied from empty. The bite proof is an
ungated `useQuery` against the same route, which still fires while denied.

### What is deliberately held back

- **`access.ts` ×3.** `gated-query.ts` imports `usePermissionGate` from `access.ts`; gating inside
  `access.ts` is an import cycle and `check:cycles` would go red. It needs the gate helper split
  out of `access.ts` first, which is a wider change than this box.
- **`leads.ts` ×7 (`crm:leads:view`) and `inv-ai-explain.ts` ×1 (`inventory:reports:read`).** The
  keys are known and each is a one-line change; CRM and Inventory are out of release scope.
- **10 unresolved**, all building their path from a module-local `BASE`:
  `hr/enterprise-ops-accommodations.ts:64` · `hr/enterprise-ops-emergency.ts:52` ·
  `hr/enterprise-ops-event-stream.ts:52,60,68` · `hr/enterprise-ops-identity.ts:66,74` ·
  `hr/enterprise-ops-simulator.ts:30` · `hr/recruitment/interviews.ts:267` · `sign/public.ts:46`.
  Mechanical, not blocked.
- **8 correctly need no gate** — `universal`/`public`/`in-service`: `/me/login-history`,
  `/org/announcements`, `/sessions`, `/auth/mfa/status`, `/me/org-display`, `/billing/plans`,
  `/blog/feed`, `/rbac/discovery/grantable`.

The **required-identifier** half of box 2 (a read that interpolates a possibly-undefined id and
fires anyway) was not re-audited this session.

### Three specs had to learn a second mock, and their assertions did not change

`hooks/api/hr/__tests__/cursor-pagination.test.ts`,
`hooks/api/hr/__tests__/benefits-safety-cursor-pagination.test.ts` and
`hooks/api/user-api-tokens-pagination.test.tsx` mocked `@/hooks/api/access` with `useCan` alone, so
`usePermissionGate` was `undefined` once the hooks under test started calling it. Each gained a
`usePermissionGate` mock returning an allowed gate. Nothing they assert was weakened — and the
gate's own biting is proved by the dedicated spec above rather than by these.

---

## 4. Not worked this session — stated plainly

- **Ticket 30 box 4 (layout at 375/768/1280)** and **box 5 (journeys)**. No browser, no dev server,
  no database. S11's numbers stand unchanged, as does its blocker: `/build/all` renders "Failed to
  load projects" because `types/projects/projects.ts:344` declares `page` and
  `projects-page.tsx:293` sends it against a cursor-based `.strict()` DTO, so no board can be
  opened and no board can be measured. That fix is `types/**` plus the backend schema.
- **Ticket 28 box 6** (per-screen states) and **box 7** (contract conversion, 55 of 2502 seam
  calls). Untouched. One note for whoever picks up box 6: its item (1) — *"no surface reads
  `fetchStatus === 'paused'`"* — is **stale**. Ticket 30's S11 pass gave both
  `components/shared/loading-state.tsx` and `components/ui/data-table.tsx` the paused branch. The
  private `useOnlineStatus` copy in
  `features/inventory/components/tools/barcode-client.tsx:26` is still there.
- **`check:dead-code`'s two unclassified exports in `hooks/api/meetings-ai.ts`** were left alone,
  per instruction. `useMeetingPrep` is deliberately kept — `meeting-prep-panel.tsx` renders a
  structured result and adopting the stream there is ticket 11's open box. Teaching the gate about
  it was not done either, so that red stands.
- **`pnpm lint` repo-wide** was not run; the changed files were linted individually.
- **`next build`** was not run. No backend gate was run.

---

## 5. Gates — command, exit code, number

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` (run 3×, after each landing) | **0** | **0 errors** each time |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="(row-action-shield\|keyboard-reachability)"` | **0** | 2 suites / **21 tests** |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="(code-field\|comma-list\|numeric-field\|keyboard-activation\|toggle-in-list)"` | **0** | 5 suites / **48 tests** |
| `pnpm -C frontend exec jest --maxWorkers=2 --testPathPattern="(hooks/api\|lib/query-keys\|lib/api-)"` | **0** | **65 suites / 725 tests** |
| `pnpm -C frontend exec jest --runInBand --testPathPattern="gated-read-suppression"` | **0** | **14 tests** |
| `pnpm -s check:cycles` | **0** | no circular dependency, 5,278 files |
| `pnpm -s check:type-assertions` | **0** | 4,264 files, 0 `as any`/`@ts-ignore`, 7 ledgered double casts at their recorded count |
| `pnpm -s check:import-direction` | **0** | cross-feature-import 182/182, at baseline |
| `npx eslint` on the 17 files of commit 1 | **0** | 0 errors, 1 pre-existing warning (`public-documents-card.tsx:243`, untouched) |
| `npx eslint` on the 12 files of commit 2 | **0** | 0 errors, 0 warnings |
| keyboard reachability scan | — | 3,647 files · **633 click targets** · **10 unreachable** |
| risky-closure scan (scratch, looser than S11's) | — | 3,814 files · 1,574 inline · 190 non-trivial; **all 10 named sites in this territory now clean** |

**Not run:** `pnpm lint` repo-wide · `next build` · `scripts/browser-journeys.mjs` (needs a live
app and a minted session) · every backend gate · `check:dead-code`, `check:file-sizes`,
`check:command-catalog` (all three were red before this session on paths this session did not
touch).

The closure scanner used here is deliberately looser than S11's — it counts `Number(`, `.trim(`
and `.replace(` as risky — so its 138 is **not** comparable to S11's 16 and is not offered as a
successor to that number. The claim made here is narrower and checkable: the 10 sites S11 named in
this territory return zero hits.

---

## 6. Cross-territory findings

1. **`components/hr/_onboarding/step-banking.tsx:33`** — the account-holder name field rejects any
   character outside `/^[A-Za-z\s]*$/`, silently, on paste. A product decision about names, not a
   refactor. Recorded in ticket 38.
2. **`hooks/api/access.ts` needs its gate helper extracted** before its own three ungated reads can
   be gated. Owner: whoever owns the access seam.
3. **`leads.ts` ×7 and `inv-ai-explain.ts` ×1 are one-line fixes with the keys already known**
   (`crm:leads:view`, `inventory:reports:read`) the moment the CRM/Inventory exclusion lifts.
4. **`contracts/openapi.json` is a usable permission oracle** and nothing was using it that way.
   `check:command-catalog` reads it only to classify `useGatedQuery` mutations. A gate that fails
   on any ungated read whose route is `x-exposure: permissioned` is now writable and would keep
   this box closed; it was not written this session.
5. S11's findings 1–4 and 8 (the `/build/all` drift, the `/calendar` 62-day window, the
   `undici`/`jsdom` mismatch, the CRM `lead_party_map` grouping error, the three files over 500
   lines) were **not** revisited and are assumed to stand.
