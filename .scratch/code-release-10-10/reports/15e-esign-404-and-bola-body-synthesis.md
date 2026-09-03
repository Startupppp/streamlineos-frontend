# 15e — the three e-sign child reads, and the harness gap that hid 24% of the surface

Owner: e-sign module + BOLA harness. Repo: `streamlineos-backend`.
Territory held: `src/modules/e-sign/**`, `test/security/bola/**`.

---

## P1 FOUND AND FIXED — `GET /sign/documents/:documentId/preview` served any envelope in the org

Not in the ticket, not in the register, found while closing the three below and fixed in the same
pass. `sign:documents:view` is **not scopable**, so every holder of it resolves scope `"all"`;
`getPreviewUrl` bound only `orgId`. A member whose `sign:envelope:view` is `own` — or a person handed
`sign:documents:view` through a `user_permission_grants` row while their envelope view stayed
narrow — could mint a 15-minute signed URL for the **source PDF of any envelope in the
organisation** by walking `documentId`.

This is the exact shape register #15 already closed for `/certificate` and `/final-pdf`; the preview
route was missed because it reads `sign_documents` rather than `sign_certificates`. It now resolves
`sign:envelope:view` through `resolveEnvelopeViewScope` and asserts the envelope through
`mustGetVisibleEnvelope`, reusing the missing-document message so an unowned document and an absent
one are indistinguishable.

Bite-proved: `bola-esign-envelope-children-404.spec.ts` asserts the storage service is never asked
for a URL on the refusal, and that the refusal body is byte-identical to a missing document's.

Cross-tenant it was never a leak — the read was org-scoped. This is a **within-tenant scope
escalation**, and it is a P1 because the object it hands over is an executed contract.

---

## Item 1 — the three cross-tenant reads (register A-3)

**The count in the ticket was right and the register's correction was right: three, not four.**
Verified in source before changing anything — `SignAuditService.listForEnvelope`
(`sign-audit.service.ts:110`) already called `mustGetVisibleEnvelope`, so `.../audit` needed nothing.
The other three were a bare `findMany` on `(orgId, envelopeId)`:

| route | was | now |
|---|---|---|
| `GET /sign/envelopes/:envelopeId/fields` | `sign-fields.service.ts:156` → `[]` / 200 | 404 |
| `GET /sign/envelopes/:envelopeId/recipients` | `sign-recipients.service.ts:150` → `[]` / 200 | 404 |
| `GET /sign/envelopes/:envelopeId/documents` | `sign-documents.service.ts:119` → `[]` / 200 | 404 |

**Why `[]`/200 is a defect even though no row crossed.** The response separates "this envelope
exists and has no fields" from "this envelope is not yours". That is precisely the oracle the 404
contract exists to prevent: the caller learns an envelope id is live in some other organisation.
Cross-tenant and absent now answer the **same** 404 — never 403, never an empty 200 — which the
regression spec asserts by comparing the two exception bodies rather than just their status.

**Shape of the fix.** The scope is a **required** parameter on all three service methods, following
the module's own precedent (`SignAuditService.listForEnvelope`, arity-pinned at 3 in
`sign-certificate-download-scope.spec.ts`). An optional scope with a permissive default is the
fail-open shape the constitution names, so the seven internal callers (envelopes ×2, dispatch ×3,
sweeps, validation) name `SYSTEM_ENVELOPE_SCOPE` explicitly — the constant that already exists for
exactly this. Controllers resolve `resolveEnvelopeViewScope(access, user)` rather than reading
`readRequestScope(req)`: the documents route is gated on the non-scopable `sign:documents:view`, so
reading the route's own scope would have resolved `"all"` for everyone — the exact no-op CLAUDE.md
§5 warns about.

**Deliberately not changed.** `SignEnvelopesService.getFull` answers **403** for an in-org envelope
outside the caller's scope. That is a same-tenant scope refusal, not a cross-tenant one (the org
predicate runs first, so another tenant's id is already 404), it matches the chat fix's rule that a
genuine same-org non-membership stays 403, and `sign-envelope-get-authz.spec.ts` pins it
deliberately. Recorded rather than silently flipped.

### Bite proof

Guard removed from all three services, suite re-run, guard restored in a `try/finally`:

```
pnpm exec jest --runInBand --testPathPattern=bola-esign-envelope-children-404
  guard present  -> exit 0,  34 passed / 34
  guard removed  -> exit 1,  18 failed / 12 passed
```

---

## Item 2 — the harness gap (register A-1)

### What was actually wrong

`bola-live-cross-tenant.seeded-e2e-spec.ts:164` sent `req.send({})` for every POST/PUT/PATCH. A
`.strict()` Zod object with any required field rejects `{}`, so the **own-tenant control** answered
400 and `score()` — correctly — refused to grade the route. 468 routes were filed UNPROBEABLE for
that reason: 41% of the unprobeable set, 24% of the whole object-addressable surface.

### Two corrections to the register's framing

1. **Only 418 of the 468 are body-shaped.** Recounted from `bola-live-offline.json`: 293 POST, 115
   PATCH, 10 PUT — and **34 GET plus 16 DELETE**, whose control 400s on a missing required **query**
   parameter (`from`/`to` on the accounting statements) or a param whose declared type the harness
   mis-binds. "The probe sends no request body" is two thirds of the story, so query parameters are
   synthesised too.
2. **Six mutating object-addressable routes are absent from `openapi.json` entirely**, so nothing can
   be derived for them and `check:openapi-coverage` never counted them:
   `PATCH /crm/settings/custom-fields/:fieldId` · `PATCH /integrations/git/connections/:connectionId` ·
   `POST /ai/blog/posts/:postId/{improve-writing,suggest-title,summarize}/stream` ·
   `POST /ai/surveys/:surveyId/summarize-responses/stream`. Pinned by name in the spec so a seventh
   fails rather than being rounded away. **Cross-territory — not fixed here.**

### What was built

`test/security/bola/live/body-synthesis.ts` derives a **minimal valid** request per route from the
committed contract: only `required` properties, each at the smallest value its own constraints
admit. A fatter body fails more often, not less. It **refuses to guess** — an unsatisfiable schema
returns the reason and no body, so the route stays UNPROBEABLE with an explanation instead of being
sent a request that will 400 and be recorded as though it had been asked. Every outcome now carries
`bodySource`, so a route probed with a derived body can never be confused with one probed with `{}`.

Two things the naive version gets wrong and this one does not: Zod's leap-year-aware `date-time`
pattern (satisfied by trying real candidates against the regex rather than generating from it), and
`\p{L}` classes, which are **inert without the `u` flag** — a name pattern that accepts every letter
rejects every candidate when the flag is dropped in serialisation.

### Offline measurement — `pnpm exec jest --testPathPattern=bola-body-synthesis`, exit 0, 20/20

| measure | number |
|---|---|
| mutating operations in the contract | 1,371 (matches `check:openapi-coverage`) |
| declaring a JSON body | 1,362 |
| **given a body** | **1,362 / 1,362 (100%)** |
| carrying no JSON body (multipart uploads, named individually) | 9 |
| derived bodies violating their own schema, per an independently written reader | **0** |
| operations that reject `{}` | 911 |
| of those, accepting the derived body | **911 / 911** |
| mutating object-addressable routes equipped from the contract | **1,082 / 1,088** (the 6 above) |

The validator in the spec is written separately from the generator on purpose. It caught a real
disagreement — the `\p{L}` flag — which a self-checking generator would have called green.

### Live measurement

Run against a private copy (`scratch_t15_body`, `CREATE DATABASE ... TEMPLATE scratch_t15`, 8
organisations) with source org `…0001` and prober org `…0003` — the only two with all 20 modules
enabled; the first pair tried (`…0002`) answered **402** to everything and would have scored the
whole run INCONCLUSIVE. `AUTH_SIGNING_KEYS` was a locally generated Ed25519 placeholder, never a
real credential. `APP_DATABASE_URL` ran as the non-owner `streamline_app` role so RLS was live.

**LIVE BITE — the body actually unlocks the control.** A new harness proof
(`harnessProofs.bodyUnlocksControl`) sends both requests to the same route with the same token:

```
PATCH /build/:projectId/approvals/:approvalId/decide      {} = 400   derived body = 200
PATCH /build/:projectId/budget                            {} = 400   derived body = 200
PATCH /build/:projectId/client-visibility/tickets/:id      {} = 400   derived body = 200
PATCH /build/:projectId/client-visibility/attachments/:id  {} = 400   derived body = 200
```

8 sampled controls rejected `{}`; 4 were unlocked outright and the rest moved from a *validation*
400 to a semantic answer (409/404) — i.e. the boundary now accepts the request and the handler
decides, which is the state the sweep needs.

`BOLA_LIVE_ONLY_FILE` was added so the previous run's bucket can be re-probed as a named list;
`BOLA_LIVE_ONLY` is a single substring and cannot express "these 468".

### The first run produced a false LEAK, and the cause was my own change

Worth reading before trusting any number below. The first re-probe scored
`POST /build/:projectId/labels` a **LEAK**: control 201 / cross-tenant 201 / absent 500. It is not
one. The created row carries the **prober's own** `orgId`; nothing of the source tenant was
disclosed.

What happened is that a **constant** synthesised body collides with a unique index, and the
collision lands on the **third** request — the absent-id control, the one `disambiguate()` uses to
tell a leak from a miss. `build.ticket_labels` carries `uniq_ticket_labels_org_name (org_id, name)`;
verified in `pg_indexes` and by the two surviving rows, one per org. Order of requests for a
mutating verb is probe → control → absent, and probe and absent are both sent as the **prober**, so
the third request re-inserted a name the first had just created, raised 23503/23505 and answered
500. 201 ≠ 500, so the LEAK could not be demoted to NO-404.

**The bias is systematic and always toward LEAK**, because the cross-tenant probe is the first of
the three and therefore the one that succeeds. A sweep that reports false P1s is worse than one that
reports none.

Fixed: each of the three requests now carries its own nonce, applied **only where the schema
constrains nothing** — an enum, a const, a format or a pattern still wins, so a patterned unique
column remains a named residual rather than a wrong verdict. With no nonce the output is unchanged,
so the offline numbers stay reproducible. Four tests pin it. The database was then **recreated from
the pristine template** and the run restarted, so no result below is contaminated by the first
attempt's writes.

RESULT_PLACEHOLDER

---

## `POST /crm/consent/contacts/:contactId` accepts another organisation's contact id

Scored **LEAK** by the probe. Read in source and in `pg_constraint` before believing it, and the
honest classification is narrower than LEAK but wider than nothing.

`CrmConsentService.record` never resolves the contact. It inserts
`(org_id = caller's own, contact_id = whatever the path said, channel, status, …)`. So:

- **No cross-tenant row is read or returned.** The response is `{"success":true}` and the row that
  lands carries the **prober's** `org_id`. It is not a read leak.
- **A cross-tenant WRITE does land.** The new consent row references another organisation's
  contact, because `crm_contact_channel_consent.contact_id` carries a **bare, non-composite** FK —
  `FOREIGN KEY (contact_id) REFERENCES contacts(id)` — while the sibling `contact_party_id` on the
  same table is correctly composite, `(org_id, contact_party_id) -> business_parties(organization_id, party_id)`.
  One column on one table missed the rule backend/CLAUDE.md §3 states.
- **The answer is a cross-platform existence oracle.** Cross-tenant id → 200. Id belonging to no
  organisation → **500**, because the bare FK is then violated. So the response distinguishes "a
  contact with this id exists somewhere on the platform" from "it does not" — which is precisely
  what the 404 contract exists to prevent, and precisely why the three-way control is worth paying
  for: the two answers differ, so the verdict could not be demoted to NO-404.

**CRM is excluded from this release, so this is recorded, not fixed.** The fix is two lines: resolve
the contact under the caller's `org_id` first (404 on a miss), and make the FK composite.

## 31 build routes answer 400 to EVERY caller — found by the re-probe, turned into a gate

`req.params` holds the parameters of the **whole** path, the `@Controller` prefix included. A
`.strict()` `@Validate({ params })` schema naming only the handler's own segment therefore rejects
the parent's as an unrecognised key, and the route answers 400 to every caller — its own tenant
included — from the validation interceptor before any handler code runs.

Measured, not inferred: `GET /build/1/bugs/1` answers
`400 {"code":"VALIDATION_FAILED","details":[{"path":"body","message":"Unrecognized key: \"projectId\""}]}`
to the source tenant's own owner on the seeded database. Source confirmed at
`src/modules/build/qa/bugs.controller.ts:32` — `z.object({ bugId }).strict()` under
`@Controller("build/:projectId/bugs")`.

**22 of them were sitting inside the 468**, in a bucket labelled "the probe sends no request body".
No body fixes them. That mislabelling is the point: a control 400 read as *unprobeable* rather than
*broken* is how 31 permanently-failing routes stayed invisible to the sweep, to `tsc`, and to the
unit suites — `isolatedModules` never runs the interceptor.

A static detector (`test/security/bola/strict-params-drift.ts`, 12 tests) finds **31**, nine more
than the probe reached: the other nine were unprobeable for an unrelated reason. All 31 are under
`build/`'s `:projectId` prefix — bugs, decisions, forms, incidents, risks, test-cases, test-runs,
test-suites, workflow — and one omits **two** parameters
(`PATCH /build/:projectId/forms/:formId/submissions/:submissionId`).

**Build is another agent's territory in this release, so they are pinned, not fixed.** A new one
fails the suite; a repaired one is reported rather than failed.

## Also repaired — `bola-scope-sibling-drift.spec.ts` was red before I touched anything

Measured with my e-sign changes swapped out for their `HEAD` contents: **2 failed / 6 passed**,
`total unscoped 330` against a `329` baseline, and `sign:audit:view` drifting with no allowlist
entry. Both are the file's own EXPECTED-CONSEQUENCE shape — the register #15 audit fix made
`sign:audit:view` visible to a detector that needs one scoped and one unscoped sibling. There is no
escalation behind it: `sign:audit:view` is **not scopable**, so no `own`-scoped holder of it exists
and `GET /sign/reports/summary` is the org-wide aggregate that key authorises.

The `FIXED:` assertion also asked `findings` for a key that has now **fully healed**, which reads a
completed fix as a failure and teaches the next person to delete the assertion. It now asks
`handlerScopeEvidence` directly. Baseline ratchets **329 → 328**. Suite is **9/9 green**.

---

## Gates

| command | exit | number |
|---|---|---|
| `pnpm typecheck` | **0** | 0 errors |
| `pnpm check:spec-typecheck` | **0** | passed |
| `pnpm check:openapi-coverage` | **0** | 1,371/1,371 mutating request schemas |
| `jest --runInBand --testPathPattern="e-sign\|esign\|security/bola"` | **0** | **31 suites / 379 tests, all green** |
| `jest --testPathPattern=bola-esign-envelope-children-404` | **0** | 34/34 (18 red with the guard removed) |
| `jest --testPathPattern=bola-body-synthesis` | **0** | 20/20 |
| `jest --testPathPattern=bola-scope-sibling-drift` | **0** | 9/9 (was 2 failed / 6 passed at HEAD) |
| `jest --testPathPattern=bola-strict-params-drift` | **0** | 12/12; 31 routes pinned |
| `pnpm check:scope-application` | **0** | every resolved DataScope reaches a predicate |
| `pnpm check:db-call-count` | **0** | no N+1 regressions |
| `pnpm check:authz-deny` | **0** | uncovered 2,377 (ratchet 2,441) |

**Not run:** lint, `next build`, the full repo-wide jest suite, the full 1,921-route live sweep (only
the named 468 were re-probed).

## Attribution incident

Ten of my `src/modules/e-sign/**` files and my new
`test/security/bola/bola-esign-envelope-children-404.spec.ts` were swallowed into another agent's
commit `2bb472d7 fix(storage): delete pending-purge objects from the bucket their purpose names`,
alongside a `7ba91e37 merge(origin/main)`. Nothing was lost; the content is intact at HEAD under
someone else's message. That is the seventh incident of this shape in this release. Note also that
`test/security/bola/**` is **not** in fact exclusively held — `t15-own-tenant-500.seeded-e2e-spec.ts`
arrived in the same window from another agent.

## Cross-territory findings (not fixed)

- **Six mutating routes are absent from `openapi.json`** (listed above). `check:openapi-coverage`
  reports 1,371/1,371 over the operations the document contains, which is not the same as over the
  operations the guard sees. Owner: API contract owner.
- **31 build routes 400 to every caller** (above). Owner: build module owner. The fix is one line
  per schema — add the parent parameter, or drop `.strict()` on the params object.
- `GET /sign/reports/summary` is org-wide under the non-scopable `sign:audit:view`. Judged correct
  and pinned rather than changed; if the product wants it scoped, `sign:audit:view` must become
  scopable first.
- **Red gates that are not mine**, verified against my own diff (no commit of mine adds a `.select(`,
  `findMany` or `findFirst` under `src/`): `pnpm check:record-access` exit 1 — two reads can return a
  deleted row, in `hr/automations/hr-automation-engine.service.ts:303` and `party/party-tenant.ts:7`.
  `pnpm check:query-projections` exit 1 — the ratchet rose 1,441 → 1,449, entirely in bare
  `.select()` (599 → 608), from other agents' commits in this window. `pnpm check:mock-surface`
  exit 1 — one phantom mock in `organization/core/organization-custom-domains-404.spec.ts`.
