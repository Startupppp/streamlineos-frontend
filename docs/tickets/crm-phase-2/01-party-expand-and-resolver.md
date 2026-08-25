# 01 — Expand: Party absorbs the legacy fields, and a resolver maps old ids to it

**Status:** done — see notes
**Track:** A — identity convergence
**Blocks:** 02-08
**Blocked by:** —

## Why

Phase 1 added Party beside `contacts`, `clients`, `leads` and `business_parties`
rather than replacing them. The same customer therefore exists four times, and
every screen outside the Phase 1 slice still shows one of the wrong three.

This ticket is the *expand* half of expand–contract. Nothing is removed and
nothing changes behaviour: Party simply becomes capable of carrying everything
the legacy tables carry, and anything holding a legacy id can find the Party.

## Acceptance criteria

- [ ] Party carries every field the four legacy tables carry that it does not
      already — lead-specific, client-specific and contact-specific — with the
      column names chosen for the merged model, not copied from whichever table
      happened to have them first.
- [ ] A compatibility resolver maps `(legacyKind, legacyId) -> partyId` for all
      four tables, backed by a real table rather than a heuristic join, so a
      resolution cannot silently return the wrong person.
- [ ] The resolver is total for existing rows: a backfill migration creates one
      Party per distinct legacy record, and a test asserts every row in each
      legacy table resolves.
- [ ] Merging two legacy records that turn out to be one person resolves both
      ids to the surviving Party, reusing Phase 1's merge, not a second mechanism.
- [ ] No existing module reads Party yet. This ticket adds capability only —
      a diff touching a consuming module is out of scope and belongs to 03-07.
- [ ] Every migration is idempotent and safe on populated tables: no NOT NULL
      without the NOT VALID/VALIDATE two-step, no unique index without a
      duplicate check first.

## Notes for whoever picks this up

The scale, measured on this branch rather than taken from the PRD:
`leads` 70 module files, `contacts` 29, `clients` 24, `businessParties` 9,
across 14 modules — `crm` 25, `leads` 19, `ai` 11, `clients` 8, `email` 7,
`contacts` 6, then a long tail of 1-3 each.

## Notes (2026-08-25)

Done and merged. 35 columns absorbed, three map tables with composite FKs to both
sides, resolver at `src/modules/party/party-legacy-seam.ts`. Migrations 0240 and
0241 applied and verified against the database: 16 columns to 51, zero unmapped
rows in every legacy table. Six fixture-based DB tests prove totality,
idempotency and soft-delete parity — totality is the one property a mocked
database cannot demonstrate.

**Design finding, unresolved:** `contacts.organization_id` is a real FK to
`crm_organizations`, and a party's employer should be another party. Nothing
gives `crm_organizations` parties to point at, so only the free text survives in
`company_name`. That is the largest gap and it blocks a clean contract of
`contacts` in ticket 08.
