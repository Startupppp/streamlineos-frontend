# 25 — A party's employer is another party, and Companies is a fourth identity table

**Status:** done — Companies was the fifth identity table (0262/0263/0264).
**Track:** A — identity convergence (added mid-phase)
**Blocks:** 08
**Blocked by:** 02, 22

## Why this ticket exists

Three agents reached the same wall independently while migrating their modules,
and ticket 01 named it first: **`contacts.organization_id` is a foreign key to
`crm_organizations`, and a party's employer should be another party.** Nothing
gives `crm_organizations` rows anything to point at, so every migrate batch left
that column behind as "association-only" and `contacts` cannot be dropped.

The phase treated `contacts`, `clients`, `leads` and `business_parties` as the
identity split. It is actually five tables. `crm_organizations` is a company
record with `name`, `domain`, `industry`, `size`, `website`, `linkedin_url`,
`description`, `health_score`, `parent_id`, `merged_into_id` and its own merge
service — which is to say it is Party, built again, with its own duplicate
handling.

The ticket 19 audit found the consequence in the navigation: **Companies
(`/crm/organizations`), Business Parties (`/party/parties`) and Clients
(`/clients`) are three parallel organisation surfaces**, plus a fourth party
surface under accounting.

## The decision

**`crm_organizations` converges into Party, and Party gains an employer link to
another Party.**

Not "add an `employer_name` column" — that is the free-text `company_name` ticket
01 already added as a stopgap, and it cannot answer "who else works here", which
is the entire point of an employer relation.

The precedent is settled twice over in this phase: `is_vendor` became a
`party_roles` row rather than a boolean, and identifiers became a table rather
than columns. A company is a party with a role, not a separate species.

**The timing is unusually favourable and will not stay that way.**
`crm_organizations` currently holds **zero rows** in development, and of one
`contacts` row, **none carries an `organization_id`**. The backfill is therefore
near-trivial to get right now and will not be once a tenant has used the feature.

## Acceptance criteria

- [ ] `party_type` gains a company-shaped value, or the existing vocabulary is
      shown to already cover it. Today it is `CUSTOMER | VENDOR | PARTNER | BOTH`
      — none of which says "this party is an organisation rather than a person".
      Decide deliberately and say why.
- [ ] Party gains `employer_party_id`, a composite tenant FK to
      `business_parties`. **Single-column is wrong here** — it is the same
      cross-tenant hole the issues table avoided.
- [ ] A resolver maps a `crm_organizations` id to its Party, following
      `party-legacy-seam.ts`, so old ids and URLs keep resolving after the drop.
- [ ] A backfill creates one Party per `crm_organizations` row, carrying its
      fields, and re-points `contacts.organization_id` onto
      `employer_party_id`. A test asserts no `crm_organizations` row lacks a
      Party.
- [ ] `crm_organizations.merged_into_id` converges onto `party_merges` — through
      `PartyMergeService`, snapshotted and reversible, **never** an SQL rewrite.
      `crm-org-merge.service.ts` is a second merge mechanism and this is the
      ticket that retires it.
- [ ] Every write path for `crm_organizations` goes through the mirror writer,
      as tickets 03–07 did for the other four tables.
- [ ] **The three parallel surfaces become one.** Companies, Business Parties and
      Clients are one list of parties filtered by role. A rewrite absorbs the old
      surface rather than standing beside it.
- [ ] `crm_organizations` is removed from `KNOWN_READERS` when its readers are.
- [ ] Every existing e2e suite passes unchanged; an edit means behaviour changed
      and that is the finding.

## Notes

`deals`, `build/roadmap` and `build/feedback` also reference
`crm_organizations` — this reaches outside CRM, which is a reason to do it
carefully, not a reason to defer it.

After this, ticket 08 can drop `contacts`. Before it, ticket 08 cannot, and no
amount of work on the other four tables changes that.
