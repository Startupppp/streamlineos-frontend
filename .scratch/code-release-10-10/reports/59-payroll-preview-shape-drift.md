# 59 — The payroll setup review step showed "—" for every salary component

**Status:** fixed, both repos · **the FRONTEND was the wrong side** · contracts on both preview
seams · bite-proved in both directions, hermetically · one further latent divergence found in the
sibling template preview and fixed with it.

The eighth confirmed instance of the class in report 57. Follows 48, 49, 57.

---

## 1. The defect, and the verdict on which side was wrong

`features/payroll/setup/steps/step-review.tsx:130` rendered

```tsx
{formatMoney(line.monthlyAmount, currency)}/mo
```

over `POST /payroll/policies/preview`, read through `apiClient.post<PolicyPreviewResult>` — a cast.
`PolicyQueryService.preview` returned `components: TemplateComponentDef[]`, which has never carried
a `monthlyAmount`. `formatMoney(undefined)` returns `"—"`, so **every line of the Salary Components
panel on the final step of payroll setup read as an em dash.** Both repos typechecked clean.

The handed-down description said the fix was probably to call `computeTemplatePreview`, "the correct
shape next door". **It is not, and that matters.** Checked before changing anything:

| Evidence | Where |
|---|---|
| The request schema is `.strict()` and has **no `annualCtc`** | `setup.schemas.ts` `policyPreviewSchema` |
| The wizard draft has no CTC field, and no step collects one | `setup-draft-schema.ts` |
| `computeTemplatePreview(components, annualCtc)` needs one | `lib/template-preview.ts:66` |
| `BASIC` is `ctc * 0.40`, so with no basis the whole sheet collapses | `template-seeds/indian-standard-seeds.ts` |

Calling it there would have replaced "—" with a **fabricated** sheet: measured in the spec,
every EARNING renders `0.00`, gross is `0.00` and net take-home is `-200.00` (the fixed
professional tax survives). A plausible wrong number on a salary screen is worse than an em dash.

**So the frontend was wrong.** The two previews legitimately differ: the TEMPLATE preview takes a
CTC from the user (`TemplatePreviewSheet` has an Annual CTC input) and simulates a payslip; the
POLICY preview takes none and can only describe what each component *is*. One client type over both
is the whole bug.

## 2. What changed

**Backend** (`f22c79f07`) — the endpoint now projects to a declared, **total** wire shape instead of
leaking the seed literal or the stored `defaultComponents` jsonb (both of which reach it through an
unchecked `as TemplateComponentDef[]`). An unset optional becomes an explicit `null` rather than a
key `JSON.stringify` drops on the floor. `POLICY_PREVIEW_WIRE_KEYS` and
`POLICY_PREVIEW_COMPONENT_WIRE_KEYS` are exported so the spec asserts the key set, not a sample.

**Frontend** (`e4aa46309`) — `describeComponentBasis` renders the basis the route *does* supply:
`ctc * 0.40`, `50% of Basic`, `₹200.00/mo`, `Attendance-linked`, `Entered per run`. The raw
`PERCENT_OF_BASIC` enum chip that sat beside the name is gone with it. Both preview seams now pass a
`ResponseContract`, and every preview type is `z.infer`'d from that contract, so a hand-written type
can no longer disagree with what the seam accepts.

## 3. The sibling, checked as asked — it disagreed too

`POST /payroll/templates/:id/preview` returns
`{ template: { id, key, name }, effectiveToggles, ...computeTemplatePreview(...) }`. The client
declared:

| Field | Declared | Emitted |
|---|---|---|
| `template` | `TemplateRow` — 18 fields | a 3-field stub; `complexity`, `defaultComponents`, `createdAt` … never arrive |
| `annualCtc` | `string` | `number` |
| `monthlyCtc` | `string` | `number` (`annualCtc / 12`) |

Not user-visible today only because `formatMoney` accepts `string | number` and the sheet reads
`template.name` from its own prop rather than from the response. Any future read of
`previewData.template.<anything else>` is an `undefined`. Fixed in the same commit and contracted.

`POST /payroll/payslip-templates/preview` was checked and **agrees** — `{ html: string }` on both
sides. It is the only other payroll preview surface.

## 4. Proof — the read path's RETURN value, not a typecheck

`src/modules/payroll/setup/__tests__/payroll-policy-preview-wire-shape.spec.ts` drives the real
`PolicyQueryService.preview` with a database double and asserts on the object it hands back:
the declared top-level key set, the declared component key set on every component, that **no**
component carries `monthlyAmount`, that the basis is present on every one, and that a stored
template whose jsonb is missing every optional still totalises to the full key set.

Two BITEs run the client's own renderers against that real payload:

- the pre-fix renderer over the served components yields `{"—"}` — a set of one — across all 8;
- `computeTemplatePreview(seed, 0)` yields all-`0.00` earnings and `-200.00` net, which is what
  "just call the thing next door" would actually have shipped.

`hooks/api/response-contracts-payroll-setup.test.ts` asserts the contract from the other end: the
payload the endpoint emits parses; **the payload it emitted BEFORE fails**, at exactly
`components.0.amount`, `components.0.percent`, `components.0.statutoryKey`; `monthlyAmount` is
stripped and cannot come back; a numeric `percent`, a missing `calcMethod` and a null
`calendarPlan` are all rejected. The template-preview half asserts that a string `annualCtc` — the
pre-fix declaration — fails, and that `template` really does arrive with three keys.

### Bite-proof, hermetic

`git archive HEAD | tar -x` into the scratchpad, `node_modules` symlinked, the fix copied in — the
shared working tree was never planted in.

| Tree | Command | Exit | Result |
|---|---|---|---|
| clean | `jest --runInBand --testPathPattern=payroll-policy-preview-wire-shape` | **0** | 8/8 |
| projection reverted to the raw defs | same | **1** | 2 failed, 6 passed |

The two that fail are the declared-component-keys assertion (`amount`, `percent`, `statutoryKey`
missing from the received set) and the malformed-jsonb totalisation. The gate is not vacuous.

## 5. Gates

| Command | Exit | Number |
|---|---|---|
| `pnpm -C streamlineos-backend typecheck` | 0 | 0 errors |
| `pnpm -C streamlineos-backend check:spec-typecheck` | 0 | clean |
| `pnpm -C streamlineos-backend openapi:check` | 0 | 3,642 operations, 3,099 with a zod contract |
| `jest --runInBand --testPathPattern=payroll` (backend) | 0 | **128 suites / 985 tests** |
| `pnpm -C frontend type-check` | 0 | 0 errors |
| `pnpm -C frontend check:test-typecheck` | 0 | hard gate at zero |
| `jest --runInBand --testPathPattern=payroll` (frontend) | 0 | 7 suites / 49 tests |
| `check:response-contracts` | 0 | 71/2665 parsed, unparsed **2596 → 2594**, risk list 58 → 60 |
| `check:response-contracts --self-test` | 0 | 12/12 |
| `check:contract-vendor` | 0 | sha256 match |
| `check:colors` `check:cycles` `check:formatters` `check:import-direction` `check:named-handlers` `check:query-signal` `check:type-assertions` `check:contract-drift` `check:gated-reads` | 0 | — |
| `check:file-sizes` | **1** | pre-existing, other territories — see below |

`unvalidatedCalls` was **lowered** 2596 → 2594 to the measured value rather than banked as
headroom, and both new routes joined `CONTRACTED_ROUTES`, so neither can lose its contract silently.

**Not run:** `next build`, the seeded e2e suite, eslint, and any browser check of the rendered
screen. The rendering claim rests on `formatMoney`'s own `return "—"` branch and the spec that
drives it, not on a screenshot.

## 6. Cross-territory

`check:file-sizes` exits 1 on four files, none of them payroll and none of them touched here:
`hooks/api/notifications-inbox.ts` (534), `hooks/api/notifications-inbox.test.ts` (666),
`features/crm/settings/automations/builder/automation-builder.tsx` (564),
`app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx` (512). Pre-existing.

## 7. What this does not close

The setup wizard still has **no** way to see a money simulation of the policy it is about to
activate — that lives one step back, in the template preview sheet, and nothing on the review step
links to it. Giving the review step a CTC input would be a product decision and a backend request-
schema change (`policyPreviewSchema` is `.strict()`), not a bug fix, so it was not made here.
