# Lane 4 blockers — roadmap prioritization & CRM revenue/tier inputs

Scope: BLD-07-008 (roadmap → project-work links + progress) and BLD-09-A03 (feedback →
roadmap → delivery evidence). Everything below was declined because the data does not
exist on a live write path, not because it was hard. Paths are repo-relative.

Rule applied throughout: **a column existing, or being echoed in a Zod response schema,
is not evidence the data exists.** A field was only wired as a prioritization input after
a production writer was found.

---

## B1. There is no tier / plan / segment / ARR / MRR / contract-value field on the account entity

**Question.** Where should "this account is worth more, weight its requests higher" read from?

**Why it blocks.** The account record is `business_parties`
(`backend/src/db/schema/party/business-parties.ts:34`). Its full column list is
partyId, organizationId, partyType, partyKind, name, legalName, displayName, taxNumber,
website, email, phone, timezone, status, customFields, notes, jobTitle, department,
companyName, employerPartyId, whatsappPhone, avatarUrl, linkedinUrl, socialProfiles,
city, state, domain, industry, companySize, description. There is **no** tier, plan,
segment, ARR, MRR, revenue or contract-value column. `crm_organizations` was dropped;
`CrmOrganizationsService` synthesises the legacy integer id through `crm_org_party_map`
(`backend/src/modules/crm/core/crm-organizations.service.ts:40-58`).

The only tier-adjacent field that is both real and published is `companySize`
(`business-parties.ts:155`), an **employee-count band** — `orgSizeEnum` =
`["1-10","11-50","51-200","201-1000","1000+"]`
(`backend/src/db/schema/common/enums.ts:40`). It is not revenue and must not be
presented as revenue.

**Options.**
1. Add a `business_parties.account_tier` enum + a migration, and decide who writes it
   (manual CRM field vs. derived from billing). Requires a migration — out of this lane.
2. Weight on `companySize` and label the UI "Company size", never "Tier"/"Value".
3. Do not weight by account at all (what this lane shipped).

**Decision needed before any revenue weighting is built.**

---

## B2. `GET /crm/organizations/:id/roll-up` joins accounts to deals by fuzzy name match

**Question.** Is `totalDealValue` fit to feed a score, or is it an approximation that must
stay a display-only figure?

**Why it blocks.** In `backend/src/modules/crm/core/crm-organizations-insights.service.ts`:

- line 124: the account→deal join is
  `or(...orgNames.map((n) => ilike(deals.name, `%${n}%`)))` — a **substring match on the
  deal's free-text title**, not a foreign key. An account named "Acme" matches a deal
  titled "Acme Corp renewal" and also "Pacme migration".
- line 117: `totalDealValue` is `COALESCE(SUM(deals.value), 0)` over **every stage** —
  open, won and lost are summed together. Nothing filters won.

So the published `totalDealValue` is neither recognised revenue nor pipeline: it is the
sum of all deals whose title happens to contain the account name. Feeding it into a
prioritization score would launder an approximation into a number that looks precise.

Secondary defect on the same surface: `deals.stage` is free text
(`backend/src/db/schema/crm/deals.ts:29`, default `'LEAD'`) and `deals` has **no currency
column** (`value` is a bare `decimal(15,2)`, line 26). Won/lost is resolved at query time
against tenant-configurable `crm_pipeline_stages.stage_type`, so two tenants can disagree
about what "won" means. Summing across tenants or currencies is unsound.

**Options.**
1. Add `deals.party_id` (FK) + a backfill, then recompute the roll-up on the FK and filter
   to won stages. Requires a migration.
2. Keep the roll-up as a display-only "indicative" figure and label it as approximate.
3. Leave it untouched and never use it as a score input (what this lane did).

---

## B3. `crm_companies.revenue` has no production write path

**Question.** Is `crm_companies` a live table or demo scaffolding?

**Why it blocks.** `crmCompanies` is declared at
`backend/src/db/schema/crm/analytics.ts:26` with
`revenue decimal(15,2) NOT NULL DEFAULT '0'` (line 31) and
`renewalValue` (line 33). A full-repo grep for `crmCompanies` finds **only reads**:
`crm-ce-dashboard.service.ts:56-95` and `crm-people.service.ts:128-129`, plus test
fixtures. There is no `insert(crmCompanies)`, no `update(crmCompanies)`, and no raw
`INSERT INTO crm_companies` anywhere in `backend/src`.

A column that only ever defaults to `0` and is never written is not revenue. Any non-zero
value in a tenant's `crm_companies.revenue` came from a seed script, not from the product.

**Options.**
1. Build the write path (a CRM screen that sets revenue) and then treat it as verified.
2. Retire `crm_companies` into `business_parties` as ticket 25 did for the other identity
   tables, deciding the revenue field's owner at that point.
3. Treat any value there as demo data (what this lane did).

---

## B4. `feedback_posts.crm_organization_id`, `.crm_contact_id` and `.account_value_snapshot` are dead placeholders

**Question.** How does a roadmap item reach the revenue of the accounts that asked for it?

**Why it blocks.** `backend/src/db/schema/build/roadmap.ts:64-66` declares
`crmContactId`, `crmOrganizationId` and
`accountValueSnapshot decimal(15,2)` on `feedback_posts`, and two of the three are
published on `feedbackPostSchema`
(`backend/src/modules/build/core/dto/build-roadmap-response.schemas.ts:49-50`) and on the
frontend contract (`frontend/hooks/api/build/roadmap-schema.ts`). Indexes exist for both
(`roadmap.ts:78-79`).

**Nothing writes any of them.** `createFeedback` and `updateFeedback`
(`backend/src/modules/build/core/projects-feedback.service.ts:65-101`) never set them; the
public intake path does not either; `accountValueSnapshot` has zero references outside the
schema file. The only other hits repo-wide are response schemas and test fixtures.

Consequence: the chain **roadmap item → linked feedback → CRM account → that account's
revenue** has no live segment at the CRM-account step. It cannot be built without first
deciding who writes `crm_organization_id` and when.

**Options.**
1. Populate `crm_organization_id` at intake (match the submitter's email domain to a
   `business_parties` row) and decide whether `account_value_snapshot` is a snapshot or a
   live join — snapshots need a write policy and a staleness answer.
2. Drop the three columns as dead weight (destructive migration + rollback, BE-71).
3. Leave them and never read them as a prioritization input (what this lane did).

---

## B5. `roadmap_items` has no CRM-linking column at all

**Why it blocks.** `backend/src/db/schema/build/roadmap.ts:12-38` — the table links to
`projects` and `tickets` (composite FKs, lines 34-35) and nothing else. There is no
`crm_organization_id`, no `customer_id`, no `party_id`. A roadmap item therefore cannot
name the accounts that want it except transitively through linked feedback, which is
blocked by B4.

**Documentation drift worth fixing:** the header comment in
`backend/src/modules/crm/core/crm-organizations.service.ts:49` asserts that
`roadmap_items.crm_organization_id` is one of the integer ids the legacy map still has to
serve. **That column does not exist.** Anyone reading that comment will plan against a
column that was never created.

---

## B6. The published CRM organization contract exposes no value signal

**Why it blocks.** `backend/src/modules/crm/core/dto/crm-organizations-response.schemas.ts:4-14`
publishes exactly `{id, name, domain, industry, size, website, linkedinUrl, description,
createdAt}` — projected from `COMPANY_COLUMNS`
(`backend/src/modules/crm/core/lib/crm-org-listing.ts:44-54`). It does **not** publish
lifetimeValue, health, churn risk, tags or customFields. Even if a value existed on the
row, no consumer could read it through the published contract without a contract change.

---

## B7. Undecided: should the prioritization score be visible on the public roadmap board?

**Question.** `GET /public/roadmap` renders `planned/in_progress/completed` to anonymous
voters (`backend/src/modules/public/roadmap.service.ts`). Should an anonymous visitor see
a RICE score, and if so should they see the inputs?

**Why it blocks.** Internal effort estimates are commercially sensitive. This lane
deliberately gated the score behind `build:roadmap:view` and left the public board
unchanged. If product wants scores public that is a contract change to
`publicRoadmapItemSchema`, not a bug fix.

**Options.** (a) keep it internal-only (shipped default); (b) publish the score but not
the inputs; (c) publish both.

---

## B8. Frontend query-key factory needs a `roadmap.signals` entry

Not a product question — an ownership one. `useRoadmapItemSignals`
(`frontend/hooks/api/build/roadmap.ts`) currently derives its key as
`[...knowledgeAndSurveysQueryKeys.roadmap.item(id), "signals"]` because
`frontend/lib/query-keys/knowledge-and-surveys.ts` is outside this lane's allowlist. The
derived key is prefix-compatible with `roadmap.all`, so invalidation works, but FE-19 wants
the factory to own it.

**Requested change** (one entry, inside the existing `roadmap` block at
`frontend/lib/query-keys/knowledge-and-surveys.ts:72-90`):

```ts
signals: (roadmapItemId: number) =>
  [...base, "roadmap", "item", roadmapItemId, "signals"] as const,
```

---

## What was wired, and the proof each input is live

| Input | Verdict | Proof |
|---|---|---|
| `reach` / `impact` / `confidence` / `effort` | **wired** | Real nullable int columns (`backend/src/db/schema/build/roadmap.ts:25-28`), now accepted on create/update and echoed back with a computed score. |
| `roadmap_items.votes` | **wired** | Live writer: `backend/src/modules/public/roadmap.service.ts:119-125` increments it inside a transaction guarded by a `roadmap_votes` insert with `onConflictDoNothing`. |
| linked feedback count | **wired** | `feedbackPosts.linkedRoadmapItemId` FK (`roadmap.ts:76`) is accepted by `createFeedbackSchema`/`updateFeedbackSchema` and written at `projects-feedback.service.ts:77` and `:95`. |
| linked project work (progress) | **wired** | `roadmap_items.projectId` / `.epicTicketId` composite FKs (`roadmap.ts:34-35`), already accepted on create/update. |
| account tier / ARR / MRR | **declined** | B1 — no column. |
| `roll-up.totalDealValue` | **declined** | B2 — fuzzy name join, all stages summed. |
| `crm_companies.revenue` | **declined** | B3 — no write path. |
| `feedback_posts.accountValueSnapshot` | **declined** | B4 — no write path. |
| CRM account of a roadmap item | **declined** | B4 + B5 — no live link. |
