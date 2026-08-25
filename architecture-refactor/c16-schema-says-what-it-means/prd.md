# c16 · The schema says what it means

**Status: not started; targeted defects, no rewrite.** Re-verified at source 2026-08-26. The large schema has strong composite tenant foreign keys, tenant-led indexes, self-maintaining `org_id` triggers and broad RLS coverage. **The schema is in good shape** and this spec proposes no redesign. It names places where schema or read/write behavior states something other than the truth, plus conventions that should stop spreading. c25-04 separately turns RLS coverage and policy shape into a release invariant.

## Problem Statement

**As a developer, `hr_people` and `organization_people` both claim to be the person.** Eleven identity columns — name, email, phone, date of birth, gender, address, emergency contact — exist on both. They are joined by `organization_person_id`, a text column with **no foreign key**, so nothing prevents the link pointing at a row that does not exist, and nothing says which side wins when they disagree.

**As a user, my calendar event has no timezone.** `calendar_events.start_date` and `end_date` are naive timestamps. 1,592 of 1,775 timestamp columns are naive, with nothing pinning a zone. For most tables this is survivable; for a calendar it is the core of the product — a meeting at 09:00 is a different instant in two offices, and a DST boundary shifts it.

**As a user, my recurring event does not recur.** `is_recurring` and `recurring_rule` are written at two call sites and read by nothing. The product promises recurrence; the schema records the intent and no code expands it.

**As a developer, invoice line items are a JSONB array while quote line items are a table.** `quote_line_items` exists as a real table with a foreign key. `invoices.lineItems` is a JSONB array of the same shape. Same domain concept, two representations, in one module — so a line item can be queried, aggregated and joined for a quote and not for an invoice.

**As a developer, `audit_logs.org_id` is nullable.** An audit row with no tenant is either a platform event or a bug, and the schema does not distinguish them — so neither can a query, and an audit trail that cannot be reliably scoped is not one.

**As a developer, a candidate's résumé text is in the row.** `candidates.resume_text` is large text on a table that is listed and filtered constantly.

## Solution

Four targeted changes. No rewrite, no key-type migration, no partitioning.

**Name a winner for person identity.** One table owns identity; the other holds only what is specific to it, and the link becomes a real foreign key. Which one wins is the whole decision and it must be made explicitly rather than by writing a sync.

**Give calendar events a timezone.** Store the instant and the originating zone, so a recurring event can expand correctly across a DST boundary. Then either implement recurrence expansion or drop the columns that pretend it exists.

**Give every calendar source one bounded overlap contract.** Native reads currently fetch all rows whose start lies in the range, the aggregate sorts everything in memory, and Outlook update/delete can silently do nothing. Each adapter must query interval overlap, apply a stable cursor and hard cap before materialization, and expose mutation capabilities explicitly. The relational attendee table becomes canonical; the JSONB id copy is reconciled and removed.

**Normalise invoice line items** to match quotes, which already does it correctly.

**Make `audit_logs.org_id` non-nullable**, with an explicit representation for platform-level events.

Plus one convention: **stop adding naive timestamps.** Do not migrate 1,592 columns — pin the convention for new ones and fix the tables where a zone is semantically required.

## User Stories

1. As a developer, I want one table to own a person's identity, so that two rows cannot disagree about someone's name.
2. As a developer, I want the link between person records to be a real foreign key, so that it cannot point at nothing.
3. As a developer, I want to know which fields belong to which table, so that I do not write a sync between them.
4. As an HR administrator, I want a corrected phone number to be correct everywhere, so that a change does not have to be made twice.
5. As a user in another office, I want a meeting to show at the right local time, so that scheduling across regions works.
6. As a user, I want a recurring meeting to still be correct after a daylight-saving change, so that it does not silently shift by an hour.
7. As a user, I want a recurring event to actually recur, so that the feature exists.
8. As a user, I want to change one occurrence without changing the series, so that exceptions are possible.
9. As a user, I want to end a series without deleting its history, so that past occurrences remain.
10. As a finance user, I want to filter invoices by what is on their lines, so that line items are queryable.
11. As a finance user, I want line-item totals to reconcile with the invoice total, so that a stored array cannot drift from its parent.
12. As a finance user, I want invoices and quotes to behave the same, so that converting one to the other is not a translation.
13. As a security reviewer, I want every audit row to name its tenant, so that an audit trail can be scoped with confidence.
14. As a security reviewer, I want platform-level events distinguishable from tenant events, so that absence of a tenant is meaningful rather than ambiguous.
15. As a recruiter, I want the candidate list to load quickly, so that browsing is not slowed by résumé text.
16. As a developer, I want new timestamp columns to carry a zone, so that this class of defect stops growing.
17. As an operator, I want every schema change to be safe to apply online, so that a migration does not take a lock that stalls the product.
18. As an operator, I want a migration to be verifiable after the fact, so that a partially-executed one is detectable.

## Implementation Decisions

**Already shipped — do not re-litigate**

- **Tenant isolation is sound.** 654 composite tenant foreign keys, 79 `org_id` triggers, RLS on every tenant table. Not in scope here.
- **Key types stay.** 576 serial, 119 identity, 40 uuid, 33 text. Mixed, and the cost of unifying exceeds the benefit. The earlier serial→identity work is unrelated to any int4→bigint question and the two must not be conflated — that conflation has already parked work once.
- **`hrms-phase1-sql-managed.ts` is deliberate.** It is a holding barrel for tables managed by raw SQL, kept out of the runtime barrel so the ORM never manages them, and it is asserted by a migration-integrity spec. Being unimported *is* the design. Dead-code tooling reports all 11 of its files as unused; deleting them removes a spec-guarded arrangement.
- **Table width is not a problem.** 96% of tables are under 25 columns, and large values are already stored out-of-line, so a wide row costs nothing when the query projects. No vertical splitting.

**To build**

- **Person identity: pick the winner explicitly.** Deduplication fails when the canonical side is left implicit — that has happened here before, and a rewritten fixture hid a 20-namespace regression. Decide, write it down, then migrate the loser's columns and add the foreign key.
- **Calendar: store instant plus zone.** A recurring event needs the originating zone, not just an offset, because the offset changes across DST. Adopt a standard recurrence representation and expand server-side; do not hand-roll a rule parser.
- **Calendar expansion is one deep module.** List views, reminders, free/busy and conflict checks cross the same seam and consume the same occurrence expansion. A second recurrence implementation would disagree at DST transitions and on exceptions.
- **Then resolve `recurring_rule`.** Either it drives expansion or it is deleted. A written-never-read column is worse than a missing feature because it looks implemented.
- **Invoice line items become a table**, matching quotes. Migrate existing arrays, then remove the column. Keep the invoice total reconcilable with its lines.
- **`audit_logs.org_id` non-nullable**, with an explicit platform representation. Backfill first, then constrain.
- **`candidates.resume_text` moves to a sidecar** keyed to the candidate. This is the one width-driven split with a real justification.
- **Migrations are online-safe.** Set `lock_timeout`; add constraints `NOT VALID` then validate; create indexes concurrently where the migration runner allows it. Current practice is inconsistent — lock timeouts are set almost everywhere, the other two almost nowhere.
- **Verify after applying.** A migration recorded as applied has already run only half its statements here, and only a catalog diff found it. Applying is not the same as executed.
- **Custom migrations leave the snapshot stale** — generating a custom migration copies the previous snapshot instead of diffing, so the next generate re-proposes applied work. Reconcile deliberately.
- **After any table rewrite, vacuum and analyse.** A rewrite invalidates statistics and empties the visibility map; measured here, one table went from 53 to 201,875 blocks until analysed, and a count stayed wrong until vacuumed.

## Testing Decisions

**What makes a good test here.** Assert the invariant the schema is supposed to guarantee, not the shape of a table. A test that names columns breaks on every migration; a test that asserts "a person has exactly one identity" survives and is the thing that matters.

- **Referential integrity** — inserting a person link pointing at a non-existent row is rejected by the database. This is the assertion the missing foreign key currently makes impossible.
- **No divided identity** — after migration, no query can produce two different values for one person's identity field. A catalog-level assertion, not a unit test.
- **Timezone correctness** — an event created in one zone and read in another shows the correct local time, including across a DST boundary in both directions, and in a zone with a non-hour offset. This is where hand-rolled logic fails.
- **Recurrence expansion** — a series expands to the expected occurrences; a modified occurrence does not alter its siblings; an ended series retains its past. If recurrence is dropped instead, assert the columns are gone.
- **Free/busy parity** — the same expanded occurrence that renders busy also blocks a conflicting write; cancelled and declined occurrences do neither. Test spring-forward, fall-back, all-day and moved-instance cases.
- **Line-item reconciliation** — invoice total equals the sum of its lines, before and after migration. Run against migrated production-shaped data, not just fixtures.
- **Audit tenancy** — every audit row has a tenant or an explicit platform marker; the constraint rejects a row with neither.
- **Migration integrity** — the existing spec asserting SQL-managed objects stay outside the ORM schema and journal must keep passing. It is the guard on the deliberate arrangement above.
- **Applied-versus-executed** — a catalog diff after migration confirms objects exist, not merely that the journal records them.
- **Prior art**: `migration-integrity.spec.ts`, the RLS verification script, and the existing calendar aggregate specs.

## Out of Scope

- Key type unification.
- Migrating all 1,592 naive timestamps.
- Table partitioning.
- Splitting tables by width, beyond the one résumé sidecar.
- Merging one-to-one tables — only six exist and all are justified.
- The finished HRMS phase-1 arrangement.
- Enum consolidation. 415 exist, 306 taxonomy; large but not defective.

## Further Notes

This spec is deliberately short relative to the size of the schema, and that is the finding. A schema this large with tenant foreign keys, triggers, live RLS and a rebuilt-from-empty CI chain is in better shape than most — the honest verdict is **four defects and one convention**, not a redesign.

Two of the four are the same shape: a column that records an intention nobody implemented. `recurring_rule` is written and never read; `organization_person_id` links without constraining. Both read as finished features. That is the class of defect worth watching for here, and it is not visible to any tool — only to reading the write path and the read path together.
