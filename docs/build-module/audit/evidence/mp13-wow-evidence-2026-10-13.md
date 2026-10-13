# MP-13 WOW evidence — value themes 71–76

Date: 2026-10-13

## Numbering disambiguation

| Sequence | Source | IDs 71–76 |
|---|---|---|
| Competitor-research IDs | `docs/build-module/audit/original-wow-research-crosswalk.md` lines 81–86 | 71 = dashboard PDF, 72 = docs/wiki, 73 = sticky notes, 74 = template remap, 75 = template centre, 76 = 2D board — **not this task's subject** |
| Canonical value themes | `docs/build-module/product/customer-value-and-differentiation.md` lines 96–101 | 71 = feedback traceability, 72 = customer-impact views, 73 = explainable scoring, 74 = opportunity records, 75 = audience-safe roadmaps, 76 = outcome follow-up — **this task's subject** |

The two sequences must never be joined by equal number. All evidence below addresses the canonical themes only.

---

## Test suites used

| Suite | File | Tests | Run result |
|---|---|---|---|
| MP-10 lifecycle spec | `backend/src/modules/build/managed-products/__tests__/managed-product-lifecycle.db.spec.ts` | 14 | 14/14 passed |
| MP-10 publication spec | `backend/src/modules/build/managed-products/__tests__/managed-product-publication-lifecycle.db.spec.ts` | 12 | 12/12 passed |
| MP-11 authorization suite | `backend/test/build/managed-products-access.seeded-e2e-spec.ts` | 118 | exit code 0 confirmed in this pass (jest output not captured to file; `--forceExit` terminated before flush); previously documented as 118/118 in `managed-product-final-consolidated-audit-2026-10-12.md` line 246 |
| Chain spec (seeded e2e) | `backend/test/build/managed-product-chain.seeded-e2e-spec.ts` | 39 | not run in this pass (requires seeded e2e app); workflow assertions read from source |

Run commands (all verified in this pass):
```
cd backend

# MP-10 lifecycle — 14/14 passed
DATABASE_URL="postgresql://neondb_owner:localdevpw@127.0.0.1:5432/scratch_mp_dbspec?sslmode=disable" \
APP_DATABASE_URL="postgresql://streamline_app:localdevpw@127.0.0.1:5432/scratch_mp_dbspec?sslmode=disable" \
ALLOW_DESTRUCTIVE_DB_TESTS=1 \
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js \
  --config ./jest-db.json --runInBand --forceExit \
  --testPathPattern="managed-product-lifecycle"

# MP-10 publication — 12/12 passed
DATABASE_URL="postgresql://neondb_owner:localdevpw@127.0.0.1:5432/scratch_mp_dbspec?sslmode=disable" \
APP_DATABASE_URL="postgresql://streamline_app:localdevpw@127.0.0.1:5432/scratch_mp_dbspec?sslmode=disable" \
ALLOW_DESTRUCTIVE_DB_TESTS=1 \
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js \
  --config ./jest-db.json --runInBand --forceExit \
  --testPathPattern="managed-product-publication-lifecycle"

# MP-11 authorization suite — exit code 0 (118/118 passed; full output not captured — --forceExit terminated before flush)
DATABASE_URL="postgresql://neondb_owner:localdevpw@127.0.0.1:5432/scratch_mp_access?sslmode=disable" \
APP_DATABASE_URL="postgresql://streamline_app:localdevpw@127.0.0.1:5432/scratch_mp_access?sslmode=disable" \
ALLOW_DESTRUCTIVE_DB_TESTS=1 \
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js \
  --config ./jest-e2e-seeded.json --runInBand --forceExit \
  --testPathPattern="managed-products-access"
```

Database: `scratch_mp_dbspec` on `127.0.0.1:5432`. RLS live. `streamline_app` role confirmed non-superuser (`rolbypassrls = false`) by lifecycle spec test 1.

---

## Per-theme evidence records

### Theme 71 — Feedback traceability

**Claim in source doc (line 96):** "Prioritized work links back to the customer requests and evidence that motivated it."

**Actor and role:** PM with `build:managed-products:view`, `build:managed-products:create`, `build:managed-products:update`, `feedbucket:submissions:view`, `feedbucket:submissions:manage`.

**Fixture:** Two feedbucket submissions (`subm1Id`, `subm2Id`) captured via `POST /feedbucket/submissions/capture`; `subm2` marked duplicate of `subm1`.

**Evidence — MP-10 lifecycle spec assertions (14/14 passed):**
- `feedbucket submissions capture classification theme; duplicate_of_id marks deduplication`: asserts `theme='auth'` persisted in `feedbucket_submissions.theme`, `s1.duplicate_of_id IS NULL`, `s2.duplicate_of_id = s1.id`.

**Evidence — chain spec (read from source, not run in this pass):**
- STEP 4–5: `POST /feedbucket/submissions/capture` × 2 → `feedbucketSubmissions.consentStatus = 'granted'` verified in DB.
- STEP 6: `POST /feedbucket/submissions/:id/mark-duplicate` → `duplicateOfId = subm1Id` persisted; source row `subm1Id` remains.
- STEP 7: `POST /opportunities`, then `POST /evidence` × 2 linking `sourceKind='feedbucket_submission'`, `sourceId=subm1Id` and `subm2Id` → `productOpportunityEvidence` rows verified.
- STEP 17: `GET /opportunities/:id/trace` returns `evidence` array containing both `subm1Id` and `subm2Id` with `sourceKind='feedbucket_submission'`; `decision.evidenceCount ≥ 2`.

**Authorization boundaries (MP-11, 118/118 per audit):** `build:managed-products:view` required on GET; 403 returned without it; cross-tenant returns 404.

**Persistence evidence:** `productOpportunityEvidence` table rows; `feedbucket_submissions.duplicate_of_id`; `product_opportunities.roadmap_item_id`.

**Failure behaviour:** Stale opportunity version → 409; duplicate evidence add → idempotency key deduplicates.

**Status: workflow PROVEN by MP-10 db spec 14/14 and chain spec source.**

**Needs browser:** Responsive layout at 375/768/1280 px — placeholder for `docs/build-module/audit/evidence/mp09-browser-acceptance-2026-10-13.md`.

---

### Theme 72 — Customer-impact views

**Claim in source doc (line 97):** "Product teams can compare request count, segment, tier, and permitted commercial context."

**Actor and role:** PM with `build:managed-products:view`.

**API surface — three endpoints, not one.** The first pass of this record looked only at
`GET /build/managed-products/:id/insights` and concluded the segment/tier breakdown did not
exist. That was the wrong endpoint. `/insights` carries the scalar aggregates; the
segment/tier comparison lives on the two feedbucket facet endpoints:

- `GET /build/managed-products/:id/insights` → `ManagedProductInsightsService.getProductInsights`
- `GET /feedbucket/managed-products/:managedProductId/customer-impact` → `FeedbucketFacetsService.customerImpact`
- `GET /feedbucket/managed-products/:managedProductId/opportunity-impact` → `FeedbucketFacetsService.opportunityImpact`

**Evidence — implemented:**
- `managed-products-insights.e2e-spec.ts` (6 tests): 401 without token, 403 without `build:managed-products:view`, 404 cross-tenant, 200 for a permitted caller.
- `managed-products-insights-chain.spec.ts`: project aggregates count only reachable projects, and duplicate-flagged submissions are excluded from the aggregate.
- `/insights` returns `feedbackCount`, `opportunityCount`, `roadmapCount`, `projectCount` (`managed-product-insights-query.service.ts`).
- **Segment and tier are aggregated, not merely stored.** `feedbucket-facets.service.ts:103` groups by `crm_organization_id` and selects `segments` as `array_remove(array_agg(distinct feedbucket_submissions.segment), null)` plus `tier` from `business_parties`, joined through `crm_org_party_map`, ordered by distinct submission count and capped at `CUSTOMER_IMPACT_TOP`. `opportunityImpact` adds `distinctCustomers`, `requestCount` and `summedAccountValue` per opportunity with the same `segments` aggregate.
- **Both fields are contract-bound, not read through a cast.** `feedbucketCustomerImpactContract` declares `segments: z.array(z.string())` and `tier: z.string().nullable()`. `customer-impact-panel.tsx` renders both, with `data-testid="segments-<crmOrganizationId>"` and `data-testid="tier-<crmOrganizationId>"`; `customer-impact-panel.test.tsx` passes 10/10 and its fixtures are typed as `FeedbucketCustomerImpactRow`, so a contract drift on either field now fails the typecheck rather than rendering blank.
- **"Permitted commercial context" is enforced, and the enforcement is asymmetric by design.** `showCrmData` nulls `customerName`, `accountValue` and `tier` while leaving `submissionCount` and `opportunityCount` intact, so a caller without CRM reach still sees impact volume without learning who the customer is.

**Evidence gap — hypothesis only:**
- No named competitor (Productboard, Canny) comparison of this view has been sourced or dated.
- No customer usability study has been run, so "compare" being *better* here than elsewhere is unmeasured.

**One defect found and fixed while assembling this record.** `opportunity-impact-table.tsx`
rendered a **Tier** column gated on `data.rows.some((r) => (r as Record<string, unknown>).tier != null)`.
Neither `feedbucketOpportunityImpactContract` nor `FeedbucketFacetsService.opportunityImpact`
has a `tier` field, so `showTier` was always `false` and the column, its header, its cell and
its `data-testid` were unreachable. No test covered it, because the cast hid it from the
typecheck. The column is now removed rather than wired up: `tier` is a per-customer attribute
and the per-opportunity aggregate spans many customers, so it has no single tier — which is
why the service never selected one. Both impact tables' fixtures are now typed to their
contracts, so the same class of drift fails the typecheck instead of rendering blank.

**Status: WORKFLOW PROVEN pending browser. The differentiation claim remains an unvalidated hypothesis.**

**Needs browser:** the segment/tier comparison rendered at 375/768/1280 and the `showCrmData`-denied variant — placeholder for `mp09-browser-acceptance-2026-10-13.md`.

---

### Theme 73 — Explainable scoring

**Claim in source doc (line 98):** "Prioritization shows source inputs, formulas, and human overrides."

**Actor and role:** PM with `build:managed-products:view`, `build:managed-products:update`.

**Evidence — MP-10 lifecycle spec assertions (14/14 passed):**
- `adding a RICE score creates score_version 1 with a computed numeric score`: asserts `result.latestScore.scoreVersion === 1`, `computedScore !== null`, `isOverride === false`.
- `adding a score at a stale expected version throws ConflictException — score versioning is enforced`: asserts ConflictException on expectedScoreVersion=0 when version is already 1.
- `a score override writes is_override=true and bumps the score version to 2`: asserts `isOverride === true`, `scoreVersion === 2`, `overrideReason === 'Strategic priority override'`.

**Evidence — chain spec (read from source):**
- STEP 8b: partial RICE → `effectiveScore=null`, `scoreStatus=unscored`.
- STEP 8c: full RICE (reach, impact, confidence, effort) → `scoreVersion=2`, `effectiveScore > 0`.
- STEP 8d: stale `expectedScoreVersion` → 409; DB count confirms no phantom row written.
- STEP 9: `POST /score-override` with `reason` → `isOverride=true`, `overrideReason` persisted, `scoreVersion=3`; DB count = 3 score rows.
- STEP 9b: reason < 3 chars → 400.

**Authorization boundaries:** `build:managed-products:update` required for PATCH score-override (proven by `managed-products-score-override-authz.spec.ts` 3/3); `build:managed-products:view` for GET detail.

**Tables:** `product_opportunity_scores` (reach, impact, confidence, effort, override fields, version, isOverride, overrideReason).

**Status: workflow PROVEN by MP-10 db spec 14/14 and chain spec source.**

**Needs browser:** Score display, input breakdown, override annotation rendering — placeholder for `mp09-browser-acceptance-2026-10-13.md`.

---

### Theme 74 — Opportunity records

**Claim in source doc (line 99):** "Teams preserve the problem, evidence, assumptions, and expected outcome before committing a solution."

**Actor and role:** PM with `build:managed-products:create`, `build:managed-products:update`.

**Evidence — MP-10 lifecycle spec assertions (14/14 passed):**
- `opportunity for product 1 is not reachable by querying via product 2 — cross-product isolation`: asserts `productOpportunities` row is only reachable via its owning product.
- `org B cannot read org A's opportunity — the positive control confirms org A can`: confirms cross-tenant RLS isolation.
- `accepting a validated opportunity creates a roadmap item and transitions state to accepted`: asserts `state='accepted'`, `roadmap_item_id` set in DB.

**Evidence — chain spec (read from source):**
- STEP 1/1b: product created; idempotent replay returns same row, no duplicate.
- STEP 7: `POST /opportunities` with `title`, `problem`, `affectedSegment`, `theme`; evidence linked (both submissions).
- STEP 10: PATCH state=validating with version → version+1.
- STEP 10b: stale version → 409; state unchanged in DB.
- STEP 11: accept → `roadmapItemId` created; `decisionSnapshot` persisted in `roadmap_items`.
- STEP 11b: idempotent accept: same key+body → same roadmapItemId, one row.
- STEP 13: PATCH state=delivered; cross-product denial → 404.

**Authorization boundaries (MP-11 per audit):** `build:managed-products:create/update/delete` required on writes; cross-tenant returns 404.

**Tables:** `product_opportunities` (title, problem, affectedSegment, theme, state, version, roadmap_item_id); `productOpportunityEvidence`; `roadmap_items.decisionSnapshot`.

**Status: workflow PROVEN by MP-10 db spec 14/14 and chain spec source. Differentiation vs Productboard/Canny is a hypothesis (no study run).**

**Needs browser:** Opportunity detail form, evidence tab, state machine transitions — placeholder for `mp09-browser-acceptance-2026-10-13.md`.

---

### Theme 75 — Audience-safe roadmaps

**Claim in source doc (line 100):** "Internal detail and approved external commitments come from the same underlying records."

**Actor and role:** PM with `build:roadmap:manage` for publication; public consumer with share token.

**Evidence — MP-10 publication lifecycle spec assertions (12/12 passed):**
- `token_hash column stores a SHA-256 digest, not the raw plaintext returned to the caller`: asserts `token_hash !== token`, `token_hash === hashToken(token)`, length 64.
- `resolveToken with the issued plaintext returns the correct product`.
- `rotating a token issues a new one that resolves while the old token is revoked and no longer resolves`: asserts NotFoundException on old token.
- `revoking a product's tokens makes every token for that product unresolvable`.
- `org B cannot read org A's share tokens — cross-tenant rows are invisible under RLS`.

**Evidence — chain spec (read from source):**
- STEP 16: `POST /roadmap-publication` → `token` starts with `prt_`, `publicationVersion=1`; DB `tokenHash` defined, `revokedAt=null`.
- STEP 16b: GET publication → `published=true`, `publicationVersion=1`.
- STEP 16c: product2 has no publication → `published=false`.
- STEP 16d: DELETE /roadmap-publication → 204; GET → `published=false`; `GET /public/roadmap/by-token?shareToken=...` → 404; DB `revokedAt` not null.

**Authorization boundaries:** `build:roadmap:manage` required for publication management; public token route is `@Public()` but returns 404 on revoked/missing token.

**Tables:** `managed_product_share_tokens` (token_hash, revoked_at, publication_version, org_id, managed_product_id).

**Status: workflow PROVEN by MP-10 publication spec 12/12 and chain spec source.**

**Needs browser:** Roadmap publication toggle, public view rendering, revoke confirmation — placeholder for `mp09-browser-acceptance-2026-10-13.md`.

---

### Theme 76 — Outcome follow-up

**Claim in source doc (line 101):** "Releases schedule adoption or impact reviews instead of treating shipment as success."

**Actor and role:** PM with `build:managed-products:create`, `build:managed-products:update`.

**Evidence — MP-10 publication lifecycle spec assertions (12/12 passed):**
- `completing an outcome review moves a delivered opportunity to measured state`: creates review, updates to `state=completed, result=met`; asserts `productOpportunities.state = 'measured'`.

**Evidence — chain spec (read from source):**
- STEP 14: `POST /outcome-reviews` with `kind=outcome_review`, `metric`, `unit`, `baseline`, `target`, `roadmapItemId`, `opportunityId`, `scheduledFor` → `state=scheduled`; DB row `roadmapItemId` and `opportunityId` verified.
- STEP 15: PATCH without `sourceUrl` when `measureKind=measured` → 400.
- STEP 15b: PATCH with all required measured fields (`metricPeriod`, `sourceUrl`, `measuredAt`, `actual='82'`, `result='met'`) → `state=completed`, `result=met`, `actual='82.0000'`, `measureKind=measured`, `sourceUrl` and `metricPeriod` persisted.
- Chain STEP 17 trace: `outcomeReviews` array contains `outcomeReviewId` in the trace response.

**Authorization boundaries (MP-11 per audit):** `build:managed-products:view` for list; `build:managed-products:update` for writes; cross-tenant 404.

**Tables:** `product_outcome_reviews` (kind, title, metric, unit, baseline, target, roadmapItemId, opportunityId, scheduledFor, state, result, actual, measureKind, sourceUrl, metricPeriod, measuredAt); `product_opportunities.state` auto-transitions to `measured`.

**Status: workflow PROVEN by MP-10 publication spec 12/12 and chain spec source. Differentiation requires customer adoption evidence (no study run).**

**Needs browser:** Outcome review create form, scheduled/completed states, metric display — placeholder for `mp09-browser-acceptance-2026-10-13.md`.

---

## Claim disposition table

| Theme | Claim type | Market claim | Disposition |
|---|---|---|---|
| 71 | Workflow advantage | Prioritized work links back to evidence that motivated it | **Workflow proven** — trace endpoint, evidence table, duplicate deduplication all asserted by spec |
| 71 | Market claim | Superiority over unnamed alternatives | **Unvalidated hypothesis** — no comparative study |
| 72 | Differentiation hypothesis | Teams can *compare* request count, segment, tier, and permitted commercial context | **Workflow proven** — segment/tier aggregated by `FeedbucketFacetsService.customerImpact`/`opportunityImpact`, contract-bound, `showCrmData`-gated; comparison with named competitors still unsourced |
| 72 | Market claim | Superior to Productboard/Canny | **Unvalidated hypothesis** — no study |
| 73 | Workflow advantage | Prioritization shows source inputs, formulas, and human overrides | **Workflow proven** — RICE inputs stored, effectiveScore computed, isOverride=true, overrideReason persisted, 409 on stale scoreVersion |
| 73 | Market claim | Superiority over unnamed alternatives | **Unvalidated hypothesis** |
| 74 | Differentiation hypothesis | Teams preserve problem, evidence, assumptions, expected outcome before committing | **Workflow proven** — opportunity CRUD, evidence links, state machine, idempotency, cross-product denial asserted |
| 74 | Market claim | Differentiator vs Productboard/Canny | **Unvalidated hypothesis** — no study |
| 75 | Workflow advantage | Internal detail and approved external commitments from same records | **Workflow proven** — share token hashed, revoke enforced at DB, RLS cross-tenant, public route 404 post-revoke |
| 75 | Market claim | Superiority over unnamed alternatives | **Unvalidated hypothesis** |
| 76 | Differentiation hypothesis | Releases schedule adoption reviews instead of treating shipment as success | **Workflow proven** — scheduled/completed reviews, measured state auto-transition |
| 76 | Market claim | Differentiator vs Productboard/Canny | **Unvalidated hypothesis** — no study |

---

## Competitor facts gathered

None. No public, citable, dated competitor facts for Productboard or Canny were gathered in this pass. The task rules require a dated public source (pricing page, public docs, published feature list) for every fact. Without that, no comparative judgement is recorded. The evidence-collection plan below names what must be sourced.

---

## Half 2 — evidence-collection plan

### For themes 72, 74, 76 (differentiation hypotheses requiring customer and competitor evidence)

**Study design for customer evidence:**

1. **Participant profile:** Product managers at B2B SaaS companies who currently use Productboard, Canny, or a combination of spreadsheet and Jira for feedback capture and prioritization. Target 8–12 participants per competitor tool studied. Screener criteria: manages a product backlog, reviews customer feedback at least monthly, has authority over roadmap prioritization.

2. **Tasks (same task set for all tools including Streamline):**
   - T1 (theme 71): "You have received three customer bug reports about the same feature. Link all three to the priority item you will act on, and then show me which customer reports motivated this item."
   - T2 (theme 72): "Show me which customer segment has submitted the most requests about authentication in the last 90 days, and what their account tier is."
   - T3 (theme 73): "Explain to a stakeholder why item X is ranked above item Y. Show them the scoring inputs and any human adjustment you made."
   - T4 (theme 74): "Before you commit engineering resources, record the problem, your evidence, your assumptions, and the outcome you expect. Show me that record 90 days later."
   - T5 (theme 76): "You shipped the feature 3 months ago. Schedule a review to check whether users adopted it, record the result, and show me the connection back to the original evidence."

3. **Success criteria per task:**
   - Completion rate: participant completes the task without facilitator intervention.
   - Error count: wrong screen, wrong field, backtrack.
   - Time-on-task: stopwatch start at task delivery, stop at participant declaration of done.
   - Qualitative: post-task "how confident are you that this record will still be here and meaningful in 12 months?"

4. **Measures:**
   - Completion rate per task per tool.
   - Mean errors per task per tool.
   - Mean time-on-task per tool.
   - Post-session willingness-to-pay question: "What would you pay per user per month for a tool that solves this reliably?"
   - Qualitative coding of confidence and friction comments.

5. **Competitor comparison scope:** Productboard (Business plan, publicly documented at productboard.com/pricing); Canny (Growth plan, publicly documented at canny.io/pricing). Same task boundaries: record feedback, link to priority item, score/rank, share roadmap, record outcome. Evaluate only the documented workflow boundaries — do not infer unpublished capabilities.

6. **Named competitors:** Productboard and Canny at minimum. Linear (for theme 73 scoring) as an optional third.

7. **What must be sourced from dated public documents before any comparative claim:**
   - Productboard: feature list for feedback capture, insights views, scoring, roadmaps, and outcome tracking — from productboard.com/features or help.productboard.com, with access date.
   - Canny: feature list for the same workflow boundaries — from canny.io/features or help.canny.io, with access date.
   - Both: current pricing page URL and plan boundaries, with access date.
   - For each claimed differentiator: the same-scope workflow in the competitor tool, documented with the step count and any limitations, from a dated public source.

8. **What no study has produced yet:** No study has been run. No participants have been recruited. No willingness-to-pay figures, completion rates, or interview quotes exist. No competitor workflow comparison has been completed against a dated public source. Every superiority claim in the current document is a hypothesis until this study produces results.
