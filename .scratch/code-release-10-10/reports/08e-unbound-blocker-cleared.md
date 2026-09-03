# 08e — Box 4's blocker is cleared, the population re-measured at head, four more fields removed

Ticket 08, box 4. Report 08c held the box open on two independent grounds; 08d cleared the
second (the section-5 defect residue). **This pass clears the first — the 35 unbound routes —
re-measures the whole population at head, and removes four more fields.** The box still does not
close, for a third reason that is neither of the first two and is stated in §7.

Every number below names the command and the exit code that produced it.

---

## 1. The blocker as written is gone

08c recorded: *"35 of 1,941 validated body/query slots are UNBOUND — `@Validate({ body: S })`
beside a hand-written `@Body() body: { … }`, so the runtime and compile-time contracts are
unlinked and NO instrument can see a read there."*

Re-ran `body-binding.mjs` unchanged against head — exit 0:

| | 08c (2026-09-03 12:55) | head (2026-09-03 14:0x) |
|---|---|---|
| slots | 1,941 | 1,941 |
| body:BOUND | 1,358 | 1,379 |
| body:UNBOUND | 30 | **9** |
| query:BOUND | 542 | 547 |
| query:UNBOUND | 5 | **0** |

**26 of the 35 were repaired by commit `09c01de8` (another lane), which retyped twenty
controllers' `@Body()` as `z.infer<typeof theValidatingSchema>`.**

**The remaining 9 were never unbound. They are an artifact of the instrument**, and every one
carried `schemaFieldCount: 0`. Their schemas are six `z.union` / `z.discriminatedUnion`, one
`z.record` and one empty `z.object({})`:

```
updateExpensePatchSchema  submitApprovalSchema  verifyMfaSchema  scoreLeadBodySchema
createOrSubmitAssessmentSchema  createOrRespondSurveySchema      (z.union)
leadFormBodySchema (z.record)   checkOutSchema (z.object({}), used by two controllers)
```

`checker.getPropertiesOfType()` on a **union** returns only the properties common to *every*
constituent — zero for disjoint shapes — so the binding test could never hit. Read directly, all
nine bind correctly (`z.infer<typeof scoreLeadBodySchema>`, `SubmitApprovalInput`,
`VerifyMfaInput`, `UpdateExpensePatchInput`, `LeadFormBody`, `CheckOutInput`). Patched the
instrument to walk union constituents and to report a schema with no resolvable object
properties as NO-FIELDS rather than UNBOUND — exit 0:

```
1941 slots — body:BOUND 1385 · body:NO-FIELDS 3 · body:no-param 2
             query:BOUND 547 · query:no-param 4      UNBOUND 0
```

**UNBOUND is zero.** No route in the backend now declares its request shape twice without linking
the two.

### 1.1 It is ratcheted, not just fixed

`pnpm check:body-binding` (new, `src/scripts/check-body-binding.mjs`) — **exit 0**, 1,941 slots,
1,932 BOUND, 0 UNBOUND, 3 NO-FIELDS, 6 no-param.

**Bite-proved in a hermetic tree; the shared working tree was never mutated.** `git archive HEAD
src | tar -x` into a scratch dir, then one route reverted to the pre-`09c01de8` style
(`auth.controller.ts` `@Body() body: z.infer<typeof resendVerificationSchema>` → `{ email: string }`):

| control | exit | result |
|---|---|---|
| unmodified HEAD tree | **0** | BOUND 1932, UNBOUND 0 |
| one route reverted | **1** | BOUND 1931, **UNBOUND 1**, naming `auth.controller.ts:160 resendVerification` |

The gate bites at the granularity it claims and is silent at head.

---

## 2. The population re-measured at head, not carried forward

The tree moved under 08c (26 rebound controllers, 08d's four removals, other lanes), so every
number was re-derived rather than reused.

`enumerate-fields.mjs` — exit 0: 5,612 files, 3,122 `z.object` literals (3,096 non-spec),
**10,272 top-level fields**, 2,362 `.strict()`, 2,990 `@Validate`.

`field-reach.mjs <backend> tsconfig.test.json` — exit 0, run **three times**: 411,760 / 411,760 /
411,789 property references, 138,034 / 138,034 / 138,041 declaration sites. Far more stable than
08c's 97,832 / 136,730 / 129,558, but still not identical, so the **union (138,140)** was used —
the conservative direction. `classify.mjs` — exit 0:

| population | 08c | head |
|---|---|---|
| top-level `z.object` fields | 10,277 | **10,268** |
| READ (checker resolved ≥1 reference) | 8,452 | **8,492** |
| zero resolved references | 1,825 | **1,776** |
| … CRM / inventory (excluded) | 186 | 186 |
| … **RETAINED BY RULE** | 99 | **89** — tenant/actor 29 · idempotency/version 12 · authz-dimension 31 · audit 17 |
| … CANDIDATE | 1,540 | **1,501** |
| **route-bound (body\|query) candidates** | **96** | **58** |

The 96 → 58 drop is the blocker clearing: fields on the 26 rebound routes now resolve real reads.

---

## 3. The bite: sentinel rename over all 58

08c drove deletion rounds to a fixed point. This pass used a **single sentinel round over the
whole candidate set**, which is strictly stronger and structurally immune to the
`Record<string, never>` trap 08c §3.1 discovered: renaming never empties a literal, so no string
index signature can appear, and any read of the original name is a hard TS2339.

Hermetic tree (`rsync` of `src test evals` + tsconfigs, `node_modules` symlinked). Baseline
`tsc --noEmit -p tsconfig.test.json` — **exit 2, 2 errors**, both pre-existing and in another
lane's territory (`test/security/bola/bola-headcount-plan-404.spec.ts`,
`bola-survey-collector-404.spec.ts`). Treated as the floor. (`pnpm check:spec-typecheck` at head
is **exit 0**; the two are transient in that lane's in-flight work, not mine.)

`mutate-sentinel.mjs bite route-bound-candidates.json` → 58 renamed across 16 files.
`tsc --noEmit -p tsconfig.test.json` — **exit 2, 96 errors** = 94 above the floor.

**46 of 58 REJECTED — the whole KB wiki block (`createPageSchema`, `updatePageSchema`,
`movePageSchema`, `lockPageSchema`, `searchPagesSchema`, `listPagesSchema`,
`listVersionsQuerySchema`, `verifyPageSchema`) and the whole platform block
(`createGrantSchema`, `listGrantsQuerySchema`, `listLogsQuerySchema`, `listMessagesQuerySchema`,
`contactFormSchema`).** Those 46 are read; the reachability map missed them.

**12 survived.**

---

## 4. All 12 survivors triaged by hand. Only 4 are removable.

**Two blind spots this pass found that 08c had not named.** Either one, trusted blindly, produces
a wrong deletion.

### 4.1 FIFTH blind spot — a read through `@Query("literal")`

08c structurally excluded 694 `@Param` fields because `@Param("ticketId")` is a string literal no
property access resolves. **It did not apply the same reasoning to `@Query`.** Five survivors are
read exactly that way, on a route whose handler declares no bare `@Query()` parameter at all:

```ts
// kb-comments.controller.ts:44 and kb-page-comments.controller.ts:42
@Validate({ params: articleIdParams, query: cursorQuery })
async list(@Query("afterCreatedAt") afterCreatedAt: string | undefined,
           @Query("afterId")        afterId: string | undefined, …)

// integrations-git.controller.ts:23
@Validate({ query: webhookQuerySchema })
async webhook(@Query("connectionId") connectionId: string | undefined, …)
```

Measured: **6 `no-param` slots carry 9 candidate fields, and 5 of those 9 survived the bite** —
`cursorQuery.afterCreatedAt`/`.afterId` on both controllers, and
`webhookQuerySchema.connectionId`. Removing any of them breaks KB comment pagination or the git
webhook's connection routing, and `.strict()` would turn each into a 400. **All five retained.**

### 4.2 SIXTH blind spot — a re-parse at the seam

08c named the `as` cast (`ingress.accept(body as InboundCommunicationEvent)`) as blind spot 3.
The same erasure happens when a handler re-validates the body with a *different* schema, because
`.parse()` takes `unknown`:

```ts
// recruitment-candidate-ai.service.ts:285
const parsedBody = resumeParseBodySchema.parse(body);
text = parsedBody.resumeText.trim().slice(0, 100000);
```

`resumeParseRequestSchema.resumeText` is read on every text-paste resume parse, and no instrument
sees it. **This is one of the 29 fields 08c dropped for the unbound reason — the blocker
accidentally protected it.** Retained.

### 4.3 The verdict table

| field | verdict | evidence |
|---|---|---|
| `cursorQuery.afterCreatedAt` ×2, `.afterId` ×2 | **RETAIN** | read via `@Query("literal")` (§4.1) |
| `webhookQuerySchema.connectionId` | **RETAIN** | read via `@Query("connectionId")` (§4.1) |
| `resumeParseRequestSchema.resumeText` | **RETAIN** | read via `resumeParseBodySchema.parse(body)` (§4.2) |
| `nextBestActionsSchema.withEvidence` | **RETAIN** | CRM — excluded from this release |
| `approveLeaveSchema.forceApprove` | **RETAIN** | 08c's rule stands: its sibling `justification` is unread *and* an audit field, so removing `forceApprove` alone orphans a justification for an override no longer in the contract. The pair is unimplemented HR work. |
| `registerSchema.plan` | **REMOVE** | `AuthService.register` reads `email/companyName/firstName/lastName` and hardcodes `plan: TRIAL_PLAN`. No caller in either repo (`/auth/register` appears in the frontend only inside the vendored `openapi.json`); no spec sends it. Registry: `internal`, `consumers: []`. |
| `createEpicSchema.assigneeId` | **REMOVE** | `EpicsService.createEpic` writes `assigneeMembershipId: undefined`. Nothing posts to `POST /build/{projectId}/epics` at all — the epics UI creates through the tickets route (`create-epic-dialog.tsx:62` → `createTicket.mutate`); `hooks/api/build/advanced.ts:33` only GETs. The declared `z.string()` could not have reached the `integer` membership column anyway. |
| `createBugFromResultSchema.assigneeId` | **REMOVE** | `TestRunsService.createBugFromResult` writes `assigneeMembershipId: undefined`. `useCreateBugFromResult` (`hooks/api/build/qa.ts:183`) types its payload `{title?, severity?}` — `assigneeId` is not even in the hook. |
| `createScorecardTemplateSchema.isBlindMode` | **REMOVE** | `scorecard_templates` (`db/schema/hr/hiring-core.ts:22`) has **no `is_blind_mode` column**; `createTemplate` inserts `orgId, name, criteria, createdBy`. The hook's type allowed it but the one call site, `scorecard-templates-page.tsx:166`, sends `{name, criteria}` only — the same "hook forwards it, caller never sets it" shape 08d corrected for `attachmentSchema.fileKey`. The genuine blind-mode path is `useSubmitScorecard` → `hiring_interviews.is_blind_mode`, untouched. |

**4 removed, 8 retained.** Each removal was checked against the frontend by hand as well as by the
bite, and each of the four routes is `internal` with `consumers: []` in
`contracts/api-contract-registry.json`, so no published contract is broken.

---

## 5. Removed as ONE contract change

backend Zod → regenerated `openapi.json` → vendored frontend copy → frontend hook type.

All four schemas are `.strict()`, so each field is now **rejected**, not stripped —
AGENT-BRIEF rule 9. `openapi.json` request bodies carry `additionalProperties: false`, and the
regeneration is exactly **0 insertions, 13 deletions**, nothing else.

Pinned by `src/test/removed-unread-request-fields.spec.ts`, with the control run both ways:

| | exit | result |
|---|---|---|
| spec against the changed schemas | **0** | 4/4 pass |
| spec against unmodified HEAD schemas (`git archive HEAD`, hermetic) | **1** | **4/4 fail** |

The spec is not vacuous: it fails when the fields are present and passes when they are gone.

---

## 6. Gates — command, exit code, number

| command | exit | number |
|---|---|---|
| BE `tsc --noEmit -p tsconfig.json` | **0** | 0 errors, log 0 bytes (not a crashed tsc) |
| BE `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE `pnpm openapi:generate` | **0** | 3,642 operations, 3,099 with a zod contract, 0 undeclared exposure |
| BE `pnpm openapi:check` | **0** | artifact current (was exit 1, stale on exactly my 4 routes and nothing else) |
| BE `pnpm check:contract-breaking-change` | **0** | — |
| BE `pnpm check:contract-registry` | **0** | — |
| BE `pnpm check:openapi-coverage` | **0** | — |
| BE `pnpm check:operation-ids` | **0** | — |
| BE `pnpm check:envelope-consistency` | **0** | — |
| BE `pnpm check:body-binding` (new) | **0** | 1,941 slots, 1,932 BOUND, **0 UNBOUND** |
| BE `jest --runInBand --testPathPattern="(modules/auth\|build/execution\|build/qa\|hr/interviews\|src/test/removed)"` | **0** | **33 suites, 186 tests** |
| FE `pnpm type-check` | **0** | 0 errors |
| FE `pnpm check:contract-vendor` | **0** | sha256 `35bfdbd141aff26a…` both sides |
| FE `pnpm check:contract-drift` | **0** | — |
| FE `pnpm check:response-contracts` | **0** | — |
| FE `jest --runInBand --testPathPattern="(recruitment\|interview\|contract\|scorecard)"` | **0** | **25 suites, 340 tests** |
| bite baseline, hermetic, `tsc -p tsconfig.test.json` | 2 | 2 pre-existing errors in another lane's `test/security/bola/**` — the floor |
| sentinel bite, 58 renamed | 2 | 96 errors = 94 above the floor → 46 rejected, 12 survivors |

---

## 7. Why the box STILL does not close — a third reason, replacing both earlier ones

Both recorded blockers are now struck. **The box remains open on its RESPONSE half, which no
instrument in this release has ever measured, and which is not measurable as the artifact stands.**

Measured directly against `openapi.json` at head, by me, not carried forward from 08c:

```
operations:                 3,642
with a requestBody schema:  1,394
with a 2xx JSON schema:         1   (GET /calendar/admin/settings)
```

**One operation in 3,642 declares what it returns.** The box asks that unused *response* fields be
removed "across backend, OpenAPI and frontend hooks/forms as one contract change". There is no
response contract to minimise against: a response field's only definition is the Drizzle
projection on one side and an `apiClient.get<T>` **cast** on the other, and per AGENT-BRIEF rule 11
nothing arbitrates those two. Over-fetched projection columns certainly exist; nothing here has
counted them, and counting them is a different instrument from the one this ticket built.

**Two bounded exclusions remain on the request half, both stated rather than resolved:**

1. **694 `@Param` fields** and the `@Query("literal")` class (§4.1) are excluded structurally, not
   resolved. §4.1 is the measured proof that the exclusion is load-bearing: 5 of 9 candidates on a
   `no-param` slot survived the bite and are alive.
2. **407 fields bound to no route** were not examined. They are out of the request/response
   contract surface as scoped, but they are not proven dead either.

**R-11 should now read:** blocked on the **response contract**, not on tool capability and not on
the 35 unbound routes. Both of those are struck, with the evidence above. The request half of this
box is executed: the full population was re-measured at head, every route-bound candidate was
bitten, all 12 survivors were triaged by hand, 4 were removed as one contract change and 8 were
retained with a written reason.

---

## 8. Cross-territory findings, not fixed here

- **`createScorecardTemplateSchema.isBlindMode` had no column to write to.** If HR wants blind
  scorecard *templates*, that needs a migration adding `scorecard_templates.is_blind_mode` plus a
  service write — not a schema field. Routed to the HR lane.
- **`POST /build/{projectId}/epics` has no client at all.** The epics UI creates epics through the
  tickets route. The whole route may be dead; that is a Build-lane call, not a field question.
- **Two pre-existing typecheck errors** in `test/security/bola/bola-headcount-plan-404.spec.ts`
  and `bola-survey-collector-404.spec.ts` under `tsconfig.test.json`. Not mine, not touched;
  `pnpm check:spec-typecheck` is green, so they are in-flight rather than landed.
