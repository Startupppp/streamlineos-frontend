# 18 — The API surface is versioned and its contract is generated in CI

**What to build:** A deployed web or mobile client keeps working across a backend release, and a breaking change is a declared new version rather than a discovery. The contract is generated from the code on every build, so drift between what the server accepts and what the client sends is a failing check instead of a silent no-op.

**Blocked by:** None — can start immediately

**Status:** done · 3 criteria open (2 on an explicit user ruling, 1 with no subject yet)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #21 — *"Development-only OpenAPI and a base frontend query key without organization identity make compatibility and cross-org cache safety depend on convention."* Ticket 17 is the cache half; this is the contract half. Root `CLAUDE.md` §5 already requires client types to mirror the backend Zod schema exactly *because* drift silently strips fields into no-ops — this ticket makes that requirement checkable rather than reviewable. The error envelope is already standardised (`lib/api-client.ts` parses `message` as string or string array, `{ success, data }`, `204` → `undefined`).

Three facts verified 2026-08-28 that narrow this ticket considerably:

- **Swagger exists but is development-only.** `backend/src/main.ts:97-110` builds the document and calls `SwaggerModule.setup` inside `if (isDevelopment)`. Production never builds it or exposes `api/docs`. The `recordRouteClassification` call that stamps `x-exposure` onto operations is inside that same block — so moving generation into CI must keep that stamping.
- **No versioning exists at all.** `enableVersioning`, `VersioningType` and `@Version(` produce zero matches in `backend/src`.
- **⚠️ Idempotency is already built — adopt it, do not rebuild it.** `common/idempotency/idempotency.interceptor.ts` is a full `NestInterceptor` claiming against a `commandFences` table with `IN_FLIGHT` / `COMPLETED` / `FAILED` states, handling replay, 409-while-in-flight and parameter mismatch. Schema at `db/schema/common/idempotency.ts`. This ticket's idempotency criterion is *enumerating which retryable commands opt in*, not writing a mechanism.

---

## ⚠️ User ruling, 2026-08-28: no API versioning

> *"for the api's don't maintain the versions keep them as it is how it is there right now"*

Given mid-session, after URI versioning (`/v1` alongside `VERSION_NEUTRAL`) had been agreed and before any of it was written. **No route changed.** `enableVersioning` is still absent from `backend/src`, exactly as it was. Criterion 2 and the webhook half of criterion 6 are left open on that ruling rather than silently reinterpreted.

## Acceptance criteria

- [x] OpenAPI is generated in CI from the running Nest metadata and Zod schemas, and the build fails if the committed artifact is stale.

  `pnpm openapi:generate` boots the real application graph with `NestFactory.create` — it never calls `init()` or `listen()`, so **no database connection is opened** and CI needs no credentials, only format-valid dummy env values. `src/common/openapi/build-openapi-document.ts` is now the single builder used by both the generator and `main.ts`'s dev Swagger UI, so the two cannot drift; the `recordRouteClassification` stamping was kept when generation moved.

  ```
  $ pnpm openapi:generate
  openapi.json written — 3537 operations
  exposure stamped on 3537, 0 undeclared
  zod contracts applied to 1914 operations
  every zod schema converted
  ```

  The Zod half is real, not nominal. A first pass read only `@Validate({ body, query, params })` metadata and reached **232** operations — and **zero** request bodies for timesheets, because the dominant pattern here is the parameter pipe `@Body(new ZodValidationPipe(schema))`. Reading `ROUTE_ARGS_METADATA` and lifting the schema off the `ZodValidationPipe` instance took it to **1,914 operations and 1,310 request bodies**. Without that the drift check below could not fire a single field-level rule, and would have reported a clean run while proving nothing.

  Staleness gate, proved by staging a stale artifact and watching it fail — not by assertion:

  ```
  $ pnpm openapi:check                      # fresh
  openapi.json is current — 3537 operations, 1914 carrying a zod contract

  $ node -e '<delete one path, rename one operationId>'
  staged a stale artifact: removed /cron/timesheets-exception-detection and renamed an operation on /access/delegations

  $ pnpm openapi:check                      # stale
  openapi.json is STALE. Run: pnpm openapi:generate
    changed GET /access/delegations
    added   GET /cron/timesheets-exception-detection
    added   POST /cron/timesheets-exception-detection
  exit 1

  $ pnpm openapi:check:self-test
  self-test passed — the staleness check detects a changed operation, a removed route and an added route,
  and reports nothing for an identical artifact
  ```

  Wired as the `OpenAPI contract is current` step in `backend/.github/workflows/ci.yml`.

- [ ] The API declares a version; a breaking change ships under a new one, and compatibility adapters are removed only on consumer evidence rather than on a schedule.

  **Open on the user's explicit instruction above.** The agreed design was `enableVersioning({ type: VersioningType.URI, defaultVersion: ["1", VERSION_NEUTRAL] })`, which serves every route at both `/v1/x` and `/x` so no deployed client breaks and the unversioned path *is* the compatibility window. It was not implemented. Nothing was half-done: there is no `@Version`, no `enableVersioning`, and no route moved.

- [x] Retryable commands accept an idempotency key and honour it, so a client retry after a timeout does not double-charge, double-post or double-invite.

  The existing `@Idempotent` mechanism was adopted, not rebuilt. Fenced handlers went **167 → 220**. Selection was the money / stock / invitation / outbound-send / ledger-posting classes, derived from source rather than from a handed-over list.

  Four exclusion classes were verified before anything was touched, because `IdempotencyInterceptor` throws `BadRequestException` when the header is absent — *before* it checks for a user — so fencing a route whose caller does not send the header is an outage:
  - `frontend/lib/api-client.ts` auto-generates an `Idempotency-Key` for every mutating request **except** paths in `PUBLIC_AUTH_PATHS`. Invitation accept/decline, magic-link, verify-email and email-otp are in that set and were left unfenced.
  - `frontend/lib/portal-api-client.ts` sends no key at all, so `modules/portal/**` was left alone.
  - `@Public()` handlers and inbound provider webhooks were excluded — external callers send no key.
  - Nine handlers already run their **own** service-level receipt from an explicit `@Headers("idempotency-key")` (`inv-stock-adjustments`, `inv-sales-orders`, `shipments`, payroll and finance approvals). Double-fencing them would have put two mechanisms on one key. They are named `bespoke-mechanism` skips in the check's output, not hidden.

  **Re-verified from the client side after the rollout**, by matching every fenced operation in the artifact against every `apiClient.<verb>` call in `hooks/`, `features/`, `lib/`, `components/` and `app/`: 221 fenced operations, 143 frontend call sites reach one, and **no fenced route is `@Public()`** — the seven non-`permissioned` ones are `in-service` or `universal`, all authenticated, so `authedFetch`'s `!isPublic` condition never skips a fenced route. Only 7 call sites set the header themselves; the other 136 rely on the `api-client.ts:150-153` default, which is why that default is load-bearing rather than a convenience.

  **Cost of the rollout, paid down as far as this session's territory allows:** fencing `ownership/transfer` broke `module-access.controller.e2e-spec.ts`, which sent no header. S1 diagnosed it and I applied the fix they named — four requests now set a unique `Idempotency-Key`, and the per-module matrix gets its own `sub` because `@UseRateLimit` buckets on `req.user?.userId` and thirteen iterations were exhausting one 5-per-hour tier. Both are in HEAD. The suite is still red at **19 of 168**, for two harness reasons that are not fixable from this session: the fence claim dies `23503` because `signToken` mints `org_1` and no such organisation row exists (`e2e-app.ts:144` documents the same trap for the region registry and stubs around it), and the rate-limit tier is never reset, so the suite is not repeatable within an hour. Handed to S1 with both causes and the dead end — `overrideProvider(IdempotencyInterceptor)` does not take effect — written down.

  **Limit worth naming:** the default key is `newIdempotencyKey()` per *transport call*. A TanStack Query retry re-invokes the mutation function, producing a new key, so the fence does not dedupe a client-initiated retry — only a duplicate of the same in-flight request. Retry-safety in the strict sense holds where the caller pins a key across attempts, as `features/payroll/payout/bank-transfers/batches-table.tsx:46` does with `useState` and `features/timesheets/billing/billing-export-dialog.tsx:72` with `useMemo`. Call sites that generate `crypto.randomUUID()` inline get no more protection than the default.

  ```
  $ pnpm check:idempotent-commands
  Controllers scanned   520
  Handlers in scope     9
  EXCLUDED BY DESIGN — named, not hidden:
    SKIP  src/modules/finance/controls/approvals.controller.ts:48  approve(":requestId/approve")  — bespoke-mechanism
    …9 entries…
  OK — every in-scope mutating handler carries @Idempotent.

  $ pnpm check:idempotent-commands:self-test
  { "pass": true, "checks": { "fencedHandlerNotReported": true, "unfencedPublishIsDetected": true,
    "unfencedHandlerHasCorrectRoute": true, "publicRouteIsSkipped": true, "alreadyFencedIsClean": true,
    "bespokeHandlerIsDetected": true } }
  ```

  Wired as the `Retryable commands are fenced` CI step, so a new money/invite/send route cannot ship unfenced.

- [ ] Error envelopes, cursor/filter/sort contracts and deprecation dates are part of the generated artifact, not documented separately.

  **Two of the three shipped; the third has no subject.** The artifact carries, as reusable components derived from what the code actually does (`AllExceptionsFilter`, `ResponseTransformInterceptor`), not from a written description:

  ```
  components.schemas    : ApiErrorEnvelope, CursorPage, OffsetPage, OffsetPagination, SuccessEnvelope, ValidationIssue
  components.parameters : CursorParam, IdempotencyKeyHeader, LimitParam, PageParam, SearchParam, SortByParam, SortDirectionParam
  components.responses  : BadRequest, Conflict, Forbidden, NotFound, ServiceUnavailable, TooManyRequests, Unauthorized, UnprocessableEntity
  x-exposure counts     : {"permissioned":3183,"public":213,"universal":94,"in-service":47}
  x-idempotency-command : 223 operations
  ```

  **Deprecation dates are not in the artifact.** No route in `backend/src` is currently marked deprecated, so a `@Deprecated({ since, sunset })` decorator would have zero call sites — a speculative abstraction, which root `CLAUDE.md` §9 forbids. The box stays open rather than being ticked against a mechanism with nothing to describe. What would close it: the first genuinely deprecated route, plus a decorator stamping `deprecated: true` and `x-sunset` in `build-openapi-document.ts`.

- [x] A check compares the frontend's request/response types against the generated contract and fails on drift — the review-time rule becomes a build-time one.

  `frontend/scripts/check-contract-drift.mjs`, scoped to **`timesheets`** so it did not fail on 3,537 handlers on its first run. It extracts the frontend's calls statically (53 found; 24 with a resolved body type, 29 unresolved, 2 skipped computed paths) and compares them against the vendored contract on five rules: unknown path, method mismatch, extra body field, missing required field, and enum-member drift. It prints the resolved/unresolved counts every run and **fails if the resolved fraction drops below a floor**, so a future refactor that breaks the extractor surfaces as a failure rather than as a clean run.

  Split by responsibility once it passed, because the single file reached 851 lines and §7's hard review limit is 500: `scripts/check-contract-drift.mjs` (103) is the entry and owns every path constant, `contract-drift/frontend-calls.mjs` (237) is the static extractor, `contract-drift/rules.mjs` (153) the five rules and the floor, `contract-drift/known-drift.mjs` (156) the dated baseline, `contract-drift/self-test.mjs` the eighteen cases. Output is byte-identical before and after.

  **Post-split review found one vacuous-pass hole, now closed.** An adversarial read of the split against
  the original confirmed zero lost coverage — all five rules, the resolution floor and the baseline logic
  are semantically identical, and the split actually *added* a missing-fixture check. But it faithfully
  carried forward a pre-existing bug: `checkResolutionFloor` returned `null` when `calls.length === 0`, and
  `walkTs` swallows a missing directory, so renaming the timesheets hook folders would have yielded zero
  calls, zero violations and a green tick. A `MIN_CALLS_SCANNED = 20` floor now fails that case — 53 calls
  are found today, so ordinary hook removal does not trip it. Two self-test cases cover it (18 total), and
  an end-to-end probe against deliberately wrong directory names confirms `0 calls → scan floor violated`
  while the real directories still pass at 24/53 resolved.

  **On its first live run it found six real drifts** — the whole reason the ticket exists:

  ```
  ✖  6 contract drift violation(s):
    enum member drift on POST /timesheets/entries — billingType: frontend can send [INTERNAL] but contract enum is
      [BILLABLE, NON_BILLABLE, FIXED]; source: frontend can send [GRID] but contract enum is [MANUAL, TIMER, API, IMPORT]
    enum member drift on PATCH /timesheets/entries/{entryId} — billingType: [INTERNAL] vs [BILLABLE, NON_BILLABLE, FIXED]
    extra body fields on POST /timesheets/exceptions/{exceptionId}/resolve not in contract schema: reason
    enum member drift on POST /timesheets/rates — billingType: [INTERNAL] vs [BILLABLE, NON_BILLABLE, FIXED]
    enum member drift on PATCH /timesheets/rates/{rateId} — billingType: [INTERNAL] vs [BILLABLE, NON_BILLABLE, FIXED]
    enum member drift on PATCH /timesheets/settings — approvalMode: frontend can send [NONE, PROJECT, CLIENT]
      but contract enum is [MANAGER, AUTO, MULTI_LEVEL]
  ```

  All six verified at source — see *Findings* below. Narrowings (contract allows a member the frontend omits) are reported separately and do not fail, because a narrowing is not a defect.

  Because which side is right is a product question and the check is a CI gate for five concurrent sessions, the six are held in a dated `KNOWN_DRIFT` baseline: they are **printed in full on every run** under a heading that calls them unfixed, the run warns that they are tracked and not failing, and **any new drift still fails**. Match granularity is `(type, endpoint, field, sorted members)`, so a different member on an already-baselined field is new drift. A **stale** baseline entry — one that no longer matches a real violation — also fails, so the list cannot rot into a blindfold.

  ```
  $ node scripts/check-contract-drift.mjs
  Timesheets calls extracted: 53 (body resolved: 24, body unresolved: 29, skipped computed paths: 2)
    5 narrowing(s) — contract allows values the frontend type does not include (not a failure): …
    6 known drift(s) tracked in KNOWN_DRIFT baseline — not yet fixed, not failing CI: …
  ⚠  6 known baselined drift(s) are tracked but not failing CI. Fix them when the product decision lands.
  ✔  No new timesheets contract drift detected.
  exit 0

  $ node scripts/check-contract-drift.mjs --self-test
  16 passed, 0 failed
  ```

- [ ] Webhooks and outbound events are versioned independently of the REST surface, because their consumers upgrade on a different clock.

  **Half already true, half open on the user's ruling.** Internal outbox events **are** versioned independently: `common/outbox/outbox-event-schema.ts:12` carries `schemaVersion: z.number().int().positive().default(1)`, persisted through `buildOutboxEvent` (`outbox-envelope.ts:24`) onto the `outbox_events` row, entirely separate from anything REST.

  Outbound **webhook** payloads are not: `modules/webhooks/webhooks-dispatch.service.ts:61` sends `{ event, data, timestamp }` with no version field. Adding one is a single additive change at that line. I did not ship it: the user ruled versioning out this session, and unlike an internal event this changes a payload third parties consume and sign against, which is an outward-facing change I should not make unasked.

## Todo

- [x] Generate before versioning. A version applied to an ungenerated surface documents nothing. — generation shipped; versioning then ruled out, so the order held either way.
- [x] Start the drift check on one module rather than 3,500 handlers. — `timesheets` only.
- [x] Idempotency keys belong on the commands that can be safely retried; enumerate those rather than adding the parameter everywhere. — 220 of 2,058 mutating handlers, with four named exclusion classes.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Findings — six real client/API drifts in timesheets, verified at source

Both failure modes root `CLAUDE.md` §5 warns about are present. The backend schemas are plain `z.object()`, so:

- an **unknown key is stripped silently** — `reason` on `POST /timesheets/exceptions/{exceptionId}/resolve` never reaches the handler and the caller gets a 200;
- an **invalid enum member throws** — `ZodValidationPipe` calls `.parse()`, so the request dies as a 400 `VALIDATION_FAILED`.

| Field | Frontend | Backend Zod |
|---|---|---|
| `billingType` | `"BILLABLE" \| "NON_BILLABLE" \| "INTERNAL"` — `features/timesheets/types.ts:11` | `z.enum(["BILLABLE","NON_BILLABLE","FIXED"])` — `core/dto/entries.schemas.ts:26,36`, `core/dto/rates.schemas.ts:13` |
| `source` | `"MANUAL" \| "TIMER" \| "GRID" \| "IMPORT"` — `types.ts:13` | `z.enum(["MANUAL","TIMER","API","IMPORT"])` — `core/dto/entries.schemas.ts:28` |
| `approvalMode` | `"NONE" \| "MANAGER" \| "PROJECT" \| "CLIENT"` — `types.ts:22` | `z.enum(["MANAGER","AUTO","MULTI_LEVEL"])` — `core/dto/settings.schemas.ts:21` |

Only `MANAGER` overlaps on `approvalMode`, so three of its four frontend options 400. **Which side is authoritative is a product question** — whether the product has a `FIXED` or an `INTERNAL` billing type is not mine to decide, and neither `features/timesheets` nor `modules/timesheets` is this session's territory. Left for the owner, recorded as a dated baseline in the check so it goes active immediately without blocking five concurrent sessions, and so any *new* drift still fails.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
