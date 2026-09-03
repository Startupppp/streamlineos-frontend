# Cross-tenant 404 contract — findings #165, #166, #167

Owner: cross-tenant HTTP probe follow-up. Repo: `streamlineos-backend` (branch `main`).
Raw probe: `scratchpad/bola-live-offline.json` (1,921 routes; PASS 666 · UNPROBEABLE 1138 ·
NO-404 113 · SERVER-ERROR 2 · LEAK 1 · INCONCLUSIVE 1).

**None of the 113 is a leak.** The probe issues three requests per route — the caller's own id,
another organisation's id, and an id belonging to no organisation. On all 113 the cross-tenant and
absent answers are **identical**, so the handler never resolves the path object and nothing about
another tenant is disclosed. They are contract defects: the API's own rule ("a cross-tenant miss is
404, never 403, never a success") is not observably true on them, and any future change that *does*
start resolving the object inherits a surface with no negative case to fail.

---

## Item 1 — the 113 missing 404s (#165)

| bucket | count |
|---|---|
| **Fixed** | **84** |
| Excluded scope (`crm`/`leads`/`deals`/`contacts`/`inventory`) — recorded, not touched | 17 |
| Another agent's territory (`src/modules/e-sign/**`) — recorded, not touched | 4 |
| Not applicable (the path segment is not a tenant object) | 8 |
| **Still open** | **0** |

### Write verbs (the 32 the finding singled out)

23 of the 32 fixed, 7 excluded scope, 2 not applicable. All 23 previously returned 204/200/201
whether the object existed or not; each now returns the affected row ids and refuses an empty result
with 404, so a caller (and a retry or idempotency layer) can tell a successful write from a no-op.

Fixed: `POST /hr/policies/:policyId/archive` · `DELETE /hr/attendance/holidays/:holidayId` ·
`DELETE /hr/leave-policies/:policyId` · `DELETE /hr/shifts/:shiftId` ·
`DELETE /hr/recruitment/interviews/:interviewId` · `DELETE /hr/recruitment/jobs/:jobId` ·
`DELETE /hr/recruitment/reports/scheduled/:reportId` · `DELETE /hr/recruitment/vendors/:vendorId` ·
`DELETE /hr/rich-documents/:documentId` · `DELETE /org/announcements/:announcementId` ·
`DELETE /organization/custom-domains/:domainId` · `POST /organization/custom-domains/:domainId/verify` ·
`PATCH /chat/huddles/:huddleId/heartbeat` · `POST /chat/channels/:channelId/refresh-name` ·
`POST /chat/channels/:channelId/huddle/start` · `DELETE /chat/saved/:messageId` ·
`DELETE /build/:projectId/cycles/:cycleId` · `DELETE /build/:projectId/modules/:moduleId` ·
`DELETE /build/members/:userId` · `DELETE /kb/pages/:pageId/favorite` ·
`DELETE /support/vip-clients/:clientId` · `POST /payroll/runs/:runId/payslips/retry-failed` ·
`PATCH /surveys/:surveyId/reorder` · `POST /surveys/:surveyId/export`.

**Excluded-scope write verbs (7, named so the count is honest, NOT fixed):**
`DELETE /contacts/:contactId` · `DELETE /deals/:dealId` · `DELETE /leads/:leadId` ·
`DELETE /crm/assignment-rules/:ruleId` · `DELETE /crm/email-templates/:templateId` ·
`DELETE /crm/scoring-rules/:ruleId` · `DELETE /crm/sla/policies/:policyId`.
All seven are the 204-on-nothing shape the finding describes and are still open.

### The single highest-leverage defect found — build's org-owner short-circuit

`resolveProjectAccess` (`src/modules/build/core/project-access.ts`) and
`ProjectsMembersService.assertProjectAccess` both returned access **before** they looked the project
up:

```ts
if (u.isOrgOwner) return { hasAccess: true, role: "OWNER" };   // project never resolved
```

So every `/build/:projectId/*` route that *did* call the guard still answered 200 for a project in
another organisation, because the probing principal is an org owner. Reordering the lookup ahead of
the owner and `build:manage` short-circuits fixed 16 routes in one change; `assertProjectInOrg` /
`assertTicketInOrg` cover the 10 that had no guard at all. **Not a leak** — the routes then filter
their own rows by `org_id`, so an owner of org A saw an empty list, not org B's data. But it is the
exact precondition under which a future non-org-scoped projection *would* leak.

### Not applicable (8) — the path segment is not a tenant object

- `POST /onboarding/tours/:tourKey/complete`, `.../dismiss` — `tourKey` is a free-form client string
  upserted per (org, user, key); there is no object to resolve. **Separate finding, not fixed:** any
  arbitrary string creates a `user_tour_progress` row, so a caller can grow that table without bound
  from a path parameter. Unbounded-write shape, not a tenancy shape.
- `GET /build/:projectId/labels` — the handler calls `listLabels(u.orgId)` and ignores `:projectId`.
- `GET /finance/reconciliation/:bankAccountId/rules` — the handler ignores `:bankAccountId`.
- `GET /public/kb/widget/:orgId`, `.../script`, `GET /public/org/:orgId` — `@Public` routes where the
  URL `orgId` *is* the tenant selector by design (CLAUDE.md §5).
- `GET /payroll/people/:organizationPersonId/eligibility` — deliberately left alone. It resolves the
  person and, on a miss, returns a designed report `{ payable: false, reason: "unknown-person" }`.
  Identical for cross-tenant and absent, so no disclosure; turning it into a 404 changes a payroll UI
  contract for a P2 cleanup. **Recorded as a deliberate exception, not a silent gap.**

---

## Item 2 — the 2 surveys 500s (#166) — FIXED

`GET /surveys/:surveyId/builder` and `GET /surveys/:surveyId/logic`:
**control 200 / cross-tenant 500 / absent-org null (not probed).** Verified in source.

Root cause: both reach `SurveyVersionService.getDraftVersion`, which, finding no draft for the
(org, survey) pair, **INSERTs one** — a write on a GET. `survey_versions` carries the composite FK
`(org_id, survey_id) -> survey_forms(org_id, id)`, so the insert raised 23503 and surfaced as an
unhandled `INTERNAL_ERROR` 500. Fixed by asserting the survey is in the caller's org before the
create path (`src/modules/surveys/survey-tenant.ts`), so the answer is now 404.

The same assertion also closed six surveys GETs and two surveys writes that were in the 113.

---

## Item 3 — `POST /organization/custom-domains/:domainId/verify` (#167) — CLASSIFIED

**Control 201 / cross-tenant 400 / absent-org not probed.** Read in source at
`src/modules/organization/core/organization-settings.service.ts:362`.

**Classification: case 1 — the tenant predicate correctly found nothing and the handler mis-shaped
the refusal. It is NOT an existence oracle.** Reasoning:

```ts
const record = await this.db.query.orgCustomDomains.findFirst({
  where: and(eq(orgCustomDomains.id, domainId), eq(orgCustomDomains.orgId, orgId)),
});
if (!record) throw new BadRequestException("Domain not found");
```

The read is org-scoped, and there is exactly **one** miss branch: an id that exists in another org
and an id that exists nowhere both fall into `!record` and get the same 400 with the same body. No
branch anywhere in the handler distinguishes them, so the 400 carries no information about whether
the domain exists elsewhere. The 400 was simply the wrong status.

Fixed anyway, as instructed: it is now `NotFoundException`. Two adjacent defects fixed in the same
pass — the `verifiedAt` UPDATE ran `where(eq(id))` with **no `orgId` predicate** (unexploitable
because the preceding read gates it, but one refactor away from being a cross-tenant write), and
`removeCustomDomain` answered 204 whether or not it deleted anything.

---

## Other defects found while fixing these (all fixed unless stated)

- **`chat` answered 403 where the contract requires 404.** `assertMember` in both
  `chat-huddles.service.ts` and `chat-huddle-signals.service.ts` checked channel *membership* before
  it resolved the channel, so a channel in another org answered `403 "You are not a member of this
  channel"` — which confirms the channel exists. Reordered: the channel is resolved in the caller's
  org first (404), and a genuine same-org non-membership still answers 403. Same shape, same fix, in
  `projects-ticket-relations.service.ts` (`requireMember` before `requireProjectTicket`).
- **`GET /payroll/employees/:employeeUserId`'s own 404 guard could never fire.** The controller has
  `if (!result) throw new NotFoundException(...)`, but `findByUser` always returns
  `{ active: null, components: [], history: [] }` — a truthy object. Now asserts org membership.
- **`detectConflicts` returned `{ conflicts: [], canActivate: false }` for a policy it could not
  find**, which reads to a client as "this policy exists and is blocked". Now 404.
- **`getClientActivities` resolved the account and then `return []` on the miss.** Now 404.

## Cross-territory findings (NOT mine to fix)

- `src/modules/party/legacy-reader-ratchet.spec.ts` is **red on `main` and not my regression**: it
  names `src/db/__tests__/connection-and-query-telemetry.spec.ts` as a new reader of the legacy
  identity tables, and the migration-left count is 30 against a ceiling of 29. That file arrived in
  `ed77b2de` (perf work). Verified red in the live tree at HEAD with none of my files involved.
- 4 e-sign routes in the 113 (`/sign/envelopes/:envelopeId/{audit,documents,fields,recipients}`)
  belong to the agent working `src/modules/e-sign/**` and are untouched.
- 17 CRM/leads/deals/contacts/inventory routes are excluded-scope for this release; all are the
  no-404 shape and 7 of them are write verbs.

## Gates

- `pnpm typecheck` — **exit 0**, 0 errors (run after every commit; last run at HEAD).
- `pnpm check:spec-typecheck` — **exit 0** on my last own-files run. It was exit 2 twice afterwards
  on files that are not mine (`src/modules/kb/wiki/kb-page-tree*.spec.ts`, then
  `src/modules/kb/wiki/kb-page-attachment-purge.spec.ts`, committed by another agent in `0edadaa0`).
  Zero errors were ever attributable to a file I touched.
- Focused jest, hermetic tree (`git archive HEAD src test migrations contracts` into the scratchpad,
  never the shared tree): every fix was proven RED-then-GREEN. Per-module GREEN runs —
  surveys 23/23 suites 118 tests · organization 65/65 443 · build 106/106 593 · hr 199/199 1272 ·
  chat+build+kb+support+payroll 388/388 2721 · party+support+payroll 178/181 1554.
- **Not run:** lint, e2e, seeded e2e, `next build`. A full-repo hermetic sweep was started and cut
  short by the battery warning; every module I touched was swept green individually.
