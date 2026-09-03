# 08c — Unread request/DTO/Zod fields: the instrument, the measurement, and what it found

Ticket 08, box 4. The box was recorded **BLOCKED — permanently, on tool capability**, on the
grounds that "no instrument in either repository resolves a FIELD": knip resolves files and
exports, `tsc --noUnusedLocals` does not reach object members, and the only remaining evidence
would be a text search, which AGENT-BRIEF rule 8 forbids as sole grounds for a deletion.

**The first half of that finding is correct and the conclusion drawn from it is not.** knip and
`--noUnusedLocals` do stop at a file/export boundary. The type checker underneath them does not.
This pass built the missing instrument, ran it over the whole backend, and cut five request
fields on compiler evidence. It also found four blind spots that would each have produced a
wrong deletion, and a residue of fields that are not dead weight at all.

Everything below names the command, the exit code and the number.

---

## 1. The instrument

`getSymbolAtLocation` on the `name` of a property access whose object is `z.infer<typeof schema>`
returns a symbol whose `declarations` are the **original `PropertyAssignment` inside the
`z.object({ ... })` literal**, with file and character offset. Verified on a three-file probe
against this repository's own zod before a line of the analysis was written:

```
access: dto.readField -> symbol: readField
  decls: [ 'dto.ts:3 kind=PropertyAssignment text="readField: z.string()"' ]
```

That is field granularity, resolved by the compiler, not by a name match. Scripts preserved at
`reports/08c-field-reach/`:

| script | what it does |
|---|---|
| `enumerate-fields.mjs` | AST enumeration of every `z.object({…})` literal and its top-level fields |
| `field-reach.mjs` | whole-program property reachability through the type checker |
| `schema-roles.mjs` | which schemas have a consumer TypeScript cannot see (`@Validate({params})`, AI `schema:`) |
| `body-binding.mjs` | is a route's `@Body()`/`@Query()` type actually derived from its validating schema |
| `mutate2.mjs`, `bite-round.mjs`, `drive.sh` | the deletion bite, driven to a fixed point in a hermetic tree |

**Self-test (anti-vacuity control), `field-reach.mjs` on the probe tree — exit 0:**

```
REACHED   destructuredField   {"destructure":1}
REACHED   constructedField    {"construct":1}
REACHED   readField           {"mirror":1}
REACHED   elementField        {"element":1}
UNREACHED spreadOnlyField
UNREACHED neverReadField
```

Five distinct read forms are each detected; two genuinely unread fields are each reported. The
instrument bites *and* is silent in the right places.

---

## 2. The measurement

`node field-reach.mjs <backend> tsconfig.test.json` — exit 0, **5,708 program files, 410,074
property references resolved.**

`node enumerate-fields.mjs` — exit 0, **5,595 files parsed, 3,096 non-spec `z.object` literals
(2,805 named export consts, 291 inline), 10,281 top-level fields, 2,362 `.strict()`, 2,990
`@Validate` decorators, 0 class-validator DTOs** — the request surface here is entirely Zod.

| population | count |
|---|---|
| top-level `z.object` fields (non-spec) | **10,277** |
| READ — the checker resolved ≥1 reference | **8,452** |
| zero resolved references | **1,825** |
| … in CRM / inventory (excluded from this release) | 186 |
| … **RETAINED BY RULE** (the box's four protected classes) | **99** |
| … CANDIDATE (input to the bite, never a verdict) | 1,540 |

Retained-by-rule breakdown: tenant/actor **32**, idempotency/version **13**,
authorization dimension **34**, audit **20**. Read-kind tally across the 8,452:
`access 6574 · construct 1459 · mirror 1398 · spread 1286 · destructure 797 · wholeobject 551 ·
cast 25`.

### 2.1 Most of the 1,540 have a consumer TypeScript cannot see

| bucket | count | why zero reads is not evidence |
|---|---|---|
| route **params** schemas | **694** | read via `@Param("ticketId")` — a string literal; no property access ever resolves |
| no route binding found | 407 | not bound to a route at all; out of the box's scope |
| nested inline literal | 224 | reached through the parent's type, not its own |
| **model contract** (AI structured output / tool args) | 79 | the field IS the contract with the model, and the parsed object is returned whole — e.g. `translationSchema.{translatedText,detectedSourceLanguage}`, returned as `gatewayResult.data` |
| anonymous literal | 40 | no enclosing const to resolve against |
| **request BODY** | **70** | genuine candidates |
| **request QUERY** | **26** | genuine candidates |

**96 route-bound candidates** survive to the bite.

---

## 3. The bite, and the four blind spots it exposed

Every removal here is decided by **deleting the field in a hermetic copy of the tree and reading
`tsc`**. The shared working tree was never mutated. Baseline in that copy:
`tsc --noEmit -p tsconfig.test.json` → **exit 0, 0 errors**.

```
drive.sh round 1   96 in  →  67 deleted, 29 deferred  → TSC EXIT=2, 69 errors → 61 survive
drive.sh round 2   61 in  →  41 deleted, 20 deferred  → TSC EXIT=2, 15 errors → 53 survive
drive.sh round 3   53 in  →  33 deleted, 20 deferred  → TSC EXIT=0,  0 errors
sentinel round     33 deleted + 20 sentinel-renamed   → TSC EXIT=2,  8 errors →  6 rejected
```

**47 fields are tsc-bite clean. 29 of those sit on a route no instrument can see (§3.3), leaving
18.**

### 3.1 A single-shot bite is unsound: `Record<string, never>`

Deleting **every** field of a `z.object` leaves `z.object({})`, which zod infers as
`Record<string, never>`. That type carries a **string index signature**, so `body.anything`
type-checks and every read of every deleted field goes silent.

Measured, not argued: a first pass deleted 364 fields and reported **90** errors. A second pass
deleting a strict **subset of 138** reported **30 errors the first pass had not**, including the
entire `platform.service.ts` contact form (`email`, `phone`, `company`, `topic`, `message`).
The driver now keeps one field back from any literal it would empty, and uses a **sentinel
rename** for those instead — the literal stays non-empty, so no index signature appears, and any
read of the original name is a hard TS2339. The sentinel round caught 6 more, including
`kb-pages` `intervalDays`, `isLocked`, `q` and `projectId`.

### 3.2 A hand-written mirror type severs the symbol link

`entities.controller.ts` passes `body: CreateEntityInput` to
`entities.service.create(orgId, userId, body)` — whose parameter is a hand-written structural
type `{ legalName: string; pan?: string; tan?: string; pfEstablishmentCode?: string; … }`. The
service then reads `body.pan` at line 69, but that read resolves to the **service's own** property
declaration, not the schema's. Deleting the schema field does not even break the build, because
the mirrored property is optional: the shortened object stays assignable and `pan` becomes
`undefined` on every request.

Eight payroll statutory identifiers sat in the candidate list for exactly this reason, along with
the whole of `updateEventPolicySchema` (9 fields), `createTravelRequestSchema` (7) and
`createLeavePolicySchema` (8). A `mirror` rule — a value flowing into a differently-typed
parameter marks every field the two types share by name — moved them all out. It is deliberately
conservative; it can only ever *reduce* the removal set.

### 3.3 An `as` cast at the seam, and a route whose two contracts are unrelated

`inbound-ingress.controller.ts` does `this.ingress.accept(body as InboundCommunicationEvent)`,
erasing the schema type before the call. Every field of that webhook payload — `provider`,
`providerMessageId`, `participants`, `body` — read as unreferenced. A `cast` rule fixed it.

The deeper version is structural. **`body-binding.mjs`, exit 0: of 1,941 validated body/query
slots on controller routes, 1,900 are BOUND, 35 are UNBOUND and 6 have no parameter at all.**
An UNBOUND route declares its shape twice and links the two declarations not at all —
`@Validate({ body: resendVerificationSchema })` beside `@Body() body: { email: string }`. On such
a route neither instrument can see a read, so **no field may be removed there on tool evidence**,
and 29 of the 47 bite-clean fields were dropped for exactly that reason
(`resendVerificationSchema.email`, `kbAiAskBodySchema.question`, `partyMergeBodySchema.leftPartyId`,
`resumeParseRequestSchema.resumeText`, all ten of `auditEntrySchema` …). Full list:
`reports/08c-field-reach/unbound-routes.json`.

Nine of the 35 are worse than merely unlinked: the parameter is typed `unknown`
(`chat-assistant` ×4, `crm-ai.scoreLead`, `engagement` ×2, `recruitment.resumeParse`) or
`Record<string, unknown>` (`public.submitLeadForm`, `feedbucket` ×2). **Recommendation for a
later ticket: a gate asserting that every `@Validate({body: S})` route types its `@Body()` as
`z.infer<typeof S>`.** 1,900/1,941 already do, so the ratchet is cheap.

### 3.4 The mirror rule is not run-to-run stable

Three full `field-reach` runs produced 97,832 / 136,730 / 129,558 reached declaration sites — the
third is not a superset of the second, so the checker's mirror/cast resolution depends on
instantiation order. **The union of all three (137,739) was used**, which is the conservative
direction: more reached, fewer removals. A future gate must union repeated runs or accept that a
single run can under-report reads.

---

## 4. What was removed — 5 backend fields, 1 frontend type field, as one contract change

| field | why it is dead, read from the handler |
|---|---|
| `surveys createAttemptSchema.accessToken` | copy-paste from `survey-public.schemas.ts` (where it IS read, `survey-response.service.ts:69`). The handler calls `createAttempt(orgId, surveyId, body.participantId ?? null)`. The frontend never issues this POST. |
| `payroll listJobsQuerySchema.failedOnly` | `jobs.controller.ts` calls `this.jobs.listFailed(...)` **unconditionally** when no `runId` — the flag never selected anything. No frontend hook calls `/payroll/jobs`. |
| `ai/blog suggestTitleSchema.excerpt` | `suggestTitlePrompt` reads `draft?.content \|\| post.content \|\| post.excerpt` — never `draft.excerpt`. Removed from the service signature too, so the schema and the parameter type do not drift apart. No frontend calls `/ai/blog/*`. |
| `finance categorizeSuggestSchema.amount` | dead on **both** sides: `receipt-edit-sheet.tsx:73` calls `suggestMutation.mutate({ merchant })`. Removed from `CategorizeSuggestInput` in the same change. |
| `finance budgetVsActualQuerySchema.format` | `getBudgetVsActual` passes `budgetId, from, to`; the csv branch was never built. The frontend does not call `/accounting/reports/budget-vs-actual`. |

`openapi.json` request bodies are generated from these Zod schemas (`additionalProperties:false`
comes from `.strict()`), so regenerating propagates the removal to the artifact and the vendored
copy — verified: `createAttempt` body is now `{participantId}` only, `/payroll/jobs` params are
`[runId,cursor,limit]`, `budget-vs-actual` params are `[budgetId,from,to]`.

### Retained, with the reason

- **99 fields retained by rule.** The box names four classes and they were applied literally.
- **`approveLeaveSchema.forceApprove`** is bite-clean and the frontend sends only `{comment}` —
  but its sibling `justification` is unread *and* an audit field, so the rule retains it.
  Removing `forceApprove` alone would leave an orphan justification for an override that no
  longer exists in the contract. **Both retained**; the pair is an unimplemented override and
  belongs to HR, not to a minimisation pass.
- **`nextBestActionsSchema.withEvidence`** — CRM, excluded from this release.

---

## 5. The residue is not dead weight — it is a client sending a field the server drops

This is the finding that matters most. Of the 18 that survived every filter, the majority are
**live frontend inputs the backend discards**. Removing them would delete the intent and hide the
bug; each is a defect for its owning lane.

| severity | route / field | what actually happens |
|---|---|---|
| **P1 data loss** | `POST /support/portal/tickets` — `createPortalTicketSchema.attachments` | `new-ticket-sheet.tsx:151` uploads files and sends `attachments`. `SupportPortalService.createTicket` picks `title, category, description, customFields` and **drops attachments**. The sibling `addMessage` forwards them — so attaching to a *reply* works and attaching to the *first* message silently does not. |
| **P2 correctness** | `POST .../simulate/approval-routing` — `simulateApprovalRoutingSchema.employeeId` (**required**) | the frontend sends the employee being simulated; the handler ignores it. The approval simulator does not simulate for the employee it was asked about. |
| **P2 correctness** | `POST /payroll/policies/preview` — `policyPreviewSchema.currency` | `step-review.tsx:67` sends `currency: draft.profile?.currency`; the preview ignores it. |
| **P2 correctness** | `GET /hr/payroll-inputs/…` — `sectionQuerySchema.preview` | `payroll-inputs.ts:172` sends `preview: "true"`; the handler never reads it. |
| **P2 data loss** | `POST /build/:projectId/tickets/:ticketId/attachments` — `attachmentSchema.fileKey` | `ticket-sub-resources.ts:127` sends `fileKey`; the backend never stores it. |
| **P3 scope** | `POST /support/kb/ask` — `kbAskSchema.articleId` | handler calls `ask.ask(u, { question: body.question })`; an "ask about this article" is answered against the whole KB. |
| **P3 unimplemented** | `createScorecardTemplateSchema.isBlindMode`, `scheduleInterviewSchema.createMeet`, `createEpicSchema.assigneeId`, `createBugFromResultSchema.assigneeId`, `registerSchema.plan`, `saveSnapshotSchema.{citations,confidence}` | declared, accepted, ignored. Some are declared on the frontend type too but never populated. |

None of these were touched. They need their owning lane to either implement the field or remove
it together with the UI that sends it.

---

## 6. Gates — command, exit code, number

| command | exit | number |
|---|---|---|
| BE `pnpm typecheck` | **0** | 0 errors |
| BE `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| BE `pnpm openapi:generate` | **0** | 3,643 operations, 3,099 with a zod contract, 0 undeclared exposure |
| BE `pnpm openapi:check` | **0** | artifact current — 3,643 operations |
| BE `pnpm check:contract-breaking-change` | **0** | — |
| BE `pnpm check:contract-registry` | **0** | 3,656 classified (102 published / 3,554 internal) |
| BE `check:openapi-coverage`, `check:openapi-path-params`, `check:operation-ids`, `check:bounded-contracts`, `check:envelope-consistency` | **0** each | — |
| BE `jest --runInBand --testPathPattern="(surveys\|payroll/jobs\|blog-ai\|categorize\|finance/reports\|analytics-reports)"` | **0** | 41 suites, 207 tests |
| FE `pnpm type-check` | **0** | 0 errors |
| FE `check:contract-vendor` | **0** | sha256 `5cbd926a…` both sides (**was exit 1 at head**) |
| FE `check:contract-drift` | **0** | no new drift |
| FE `check:response-contracts` | **0** | 69/2,665 parsed, at baseline |
| FE `jest --runInBand --testPathPattern="(accounting\|insights\|contract)"` | **0** | 28 suites, 347 tests |
| bite baseline, hermetic tree, `tsc -p tsconfig.test.json` | **0** | 0 errors |
| bite fixed point, round 3 | **0** | 33 fields deleted, 0 errors |

---

## 7. Found red at head, not caused by this ticket

- **`openapi.json` was 31 operations stale.** Committed artifact 3,613 operations against 3,643
  declared in source: the ten AI `/stream` routes, `/ai/usage`,
  `/crm/settings/custom-fields`, `/webhooks/calendar/provider`,
  `/payroll/filings/export/jobs/{jobId}` and others landed without regenerating (1 operation
  removed). `openapi:check` and `check:contract-vendor` were therefore both red at head — the
  vendored copy hashed `ae149514` against the backend's `4437cad8`. Regenerated and re-vendored
  in **their own commits**, so 31 operations of other lanes' work are not filed under a message
  describing none of it.
- **31 operations had never been classified in the contract registry.** The stale artifact was
  hiding them from a fail-closed gate that treats an unclassified operation as a *published
  customer contract*. `registry:generate` is bookkeeping (classification derives from the
  `x-exposure` already stamped on all 3,643); diff verified as 31 added, 0 removed, 0 existing
  entries reclassified.
- **The artifact goes stale again within minutes, and no lane owns regenerating it.** Re-checked
  after this ticket's commits: `openapi:check` is **exit 1** again — `removed GET
  /settings/permissions`, from commit `8634cba3` (settings lane), landed after my regeneration.
  `check:contract-vendor` stays **exit 0** (both copies still match each other). Not chased: a
  route deletion is precisely what `check:contract-breaking-change` exists to catch, and it can
  only see it once the deleting lane regenerates. **Recommendation: make `openapi:generate` part
  of the commit that changes a route, or wire `openapi:check` into CI so a stale artifact cannot
  reach head — it hid 31 operations from two fail-closed gates for the whole of this release.**

- **`POST /webhooks/calendar/provider` was published with no declared replay rule.** Declared as
  `advisory-dedup-unfenced` from reading the handler: sequential redeliveries are refused twice
  (the `updatedAt >= providerUpdatedAt` watermark, then the PENDING/IN_FLIGHT queue check), but
  concurrent ones are not — the queue SELECT and the queue INSERT are two separate
  `runInNewTenantTransaction` calls and `calendar_provider_sync_queue` has no unique constraint.
  **The calendar lane should review that wording.**

---

## 8. What this measurement still misses

State this with any number quoted from it.

1. **Access through `any`, or a cast that erases the type** — the `cast` rule name-matches an
   `as` target, but `as any` and `as unknown as T` defeat it.
2. **Dynamic keys** — `x[k]`, `Object.keys(x).forEach(k => x[k])`.
3. **The other repository.** The frontend does not import backend types, so no frontend read is
   visible to the backend program. Every removal here was additionally checked against the
   frontend hook and form by hand; that step is not automated.
4. **Non-TypeScript consumers** — SQL, a template, a queue payload deserialised as `unknown`,
   and the 79 model-contract schemas whose reader is a language model.
5. **`@Param` string literals** — 694 fields, structurally excluded rather than resolved.
6. **Responses.** `contracts/openapi.json` carries a 2xx response schema for **1 of 3,613**
   operations (1,379 carry a request-body schema). There is no response contract to minimise
   against; a response field's only definition is the Drizzle projection. This box's response
   half cannot be measured until `check:response-contracts` retires more of its 97.8% cast debt.
7. **Run-to-run instability** in the mirror/cast rules (§3.4) — mitigated by unioning three runs,
   not solved.

---

## 9. Verdict on box 4 and on R-11

The box's blocker as written — "no instrument in either repository resolves a FIELD" — is
**withdrawn**. An instrument exists, it is in `reports/08c-field-reach/`, it self-tests, and five
fields were removed on its evidence plus a compiler bite, with the OpenAPI artifact and the
frontend type moved in the same change.

The box is **not** closed, and should not be, for a reason the original blocker did not name:
**35 UNBOUND routes plus 6 with no parameter are structurally unmeasurable**, and the residue on
the measurable routes is overwhelmingly *unimplemented intent* rather than dead weight — seven
defects in §5 that belong to their owning lanes. Removing those fields would delete a feature and
hide a bug. R-11 should be rewritten from "blocked on tool capability, permanent" to
"blocked on §5 defect triage and on the 35 unbound routes", with the tool blocker struck.
