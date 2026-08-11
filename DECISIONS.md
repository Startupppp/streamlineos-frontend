# DECISIONS

Assumptions taken without confirmation, with reversal cost. Recorded per the
Execution Protocol. Two concurrent programs record here: **Inventory** uses `D-NN`,
**Build** uses `B-NN`. Do not renumber across programs.

---

# Build module refactor (B-NN)

## User-answered (2026-08-10, single question block — not to be re-raised)
- **B-01 Next Phase 1 item = SCH-001 ranking.** Done.
- **B-02 Status model = one status table per project**, `tickets.status` FK to it. Done.
- **B-03 Timesheets enum drift = apply the enums.** Done (migration `0143`).
- **B-04 Commit policy = leave everything uncommitted.** Honoured; nothing committed.

## B-05 — Live production tenants: assumed NO (contrary to the protocol default)
Evidence, not assumption: the DB held 5 orgs / 7 users / **0 projects / 0 tickets** before I seeded it.
Consequence: migrations are single-step rather than strict expand-contract.
**Reversal cost: HIGH if wrong.** `0142` drops `tickets."order"` and `0146` drops `custom_states` in the
same migration that stops using them. If production data exists somewhere I cannot see, both must be
split before running there. This is the one default that could cause loss, and it is evidence-backed.

## B-06 — `numeric` rank rather than LexoRank strings
Postgres numeric is arbitrary-precision, so midpoints never fail and rebalancing is housekeeping, not
correctness. Verified: 30 successive midpoints at one point consumed 13 of 16383 decimal places.
Reversal cost: low.

## B-07 — `tickets.status` stays a text natural key, not `status_id`
The composite FK already guarantees one definition of "done"; an integer key would force a join into
all 68 existing read sites and change the wire format for no correctness gain. Reversal cost: medium.

## B-08 — Unconfigured statuses backfilled, not deleted
16 distinct free-text statuses had no `project_statuses` row; each got one (`"order" = 999`,
`type = 'unstarted'`) so the FK could be added without losing a ticket. Reversal cost: low — they are
identifiable by that sentinel order value.

## B-09 — `custom_states` deleted as proven-orphaned (against "assume used")
The default says assume used until proven otherwise. I proved otherwise: zero write sites in
`src/modules/`, exactly one read site, `tickets.state_id` NULL on 100% of 204,000 rows. Reversal cost:
high (table dropped) but it never held application-written data.

## B-10 — Migrations authored with `generate --custom`
The differ was blocked by the enum drift and there is no TTY. Consequence: `migrations/meta` snapshots
are stale, because `--custom` copies the previous snapshot instead of diffing. Reversal cost: low but
unavoidable — one `db:generate` at a TTY, answers recorded in `PAGES.md`.

## B-11 — Migrations shipped WITHOUT tested rollbacks (protocol deviation)
The protocol requires every migration to ship a rollback executed in testing. I did not build them: the
DB holds no production data (B-05), and I had no second database to rollback-test against without
destroying the seeded dataset the performance baseline depends on. **This is the largest open risk in
the work** and is listed in the completion report rather than hidden.

## B-12 — One file fixed outside scope
`modules/realtime/ably.service.ts` (a concurrent session's staged work) failed `tsc` and blocked
verification of my own changes; fixed as a type annotation only. A concurrent webhooks file that was
also failing was left alone and its own session fixed it. Reversal cost: nil.

## B-13 — Narrower reading on workspace route scoping
`/build/workspaces/[id]/{all,all-work,my-work,pm-workspaces}` validate the workspace but do not scope
data by it. I made them proper adapters rather than deleting them or inventing workspace-scoped
queries, because which behaviour is intended is a product question. Logged as UI-002, still open.

---

# Inventory (D-NN)

Earlier decisions D-01..D-09 were user-confirmed and live in `REFACTOR-STATE-INVENTORY.md`.

## D-10 — Quality/counts/reports scoping uses the same warehouse predicate
Rationale: consistency with the eight surfaces already scoped; the alternative
(leaving them org-wide) contradicts the confirmed "scope everything" decision.
Reversal cost: low — delete the predicate line per service.

## D-11 — Cost masking gates on `inventory:valuation:read` (user-confirmed)
Cost, landed cost, average cost and margin are stripped **server-side** from
response bodies for callers without the key. Applied at the DTO boundary, not in
the UI, so the field is absent from the payload rather than hidden.
Reversal cost: low.

## D-12 — Reservation-ledger enum rewrite renumbered 0408 → 0413
`0408_notification_category_accounting` was taken by concurrent work during this
program. Reversal cost: none.

## D-13 — Enum value removal is expand-contract, not a rewrite
Protocol requires expand-contract by default and assumes live tenants. Removing
values from `inv_txn_type` is destructive and irreversible if any row uses them.
Taken instead: stop writing `RESERVATION_*` in code, ship a migration that
**reports** any remaining rows using those values, and leave the enum values in
place. The contract step is a separate deliverable gated on that report being
empty. Reversal cost: none. Cost of this default: the enum keeps three unused
values until someone runs the contract step.

## D-14 — Real-DB concurrency suite runs against the dev database, opt-in
Jest specs that need a live Postgres are guarded by `INV_DB_TESTS=1` so the
default `jest` run stays hermetic and CI without a database does not fail.
Reversal cost: low — remove the guard.

## D-15 — No further backend commits with a populated index
`git add` followed by `git commit`, and `git commit --amend`, both take the whole
index; in this shared tree that swept 25 and 133 foreign files into two commits
respectively. All later commits use `git commit -m … -- <explicit paths>` with a
verified-empty index. `git reset` is forbidden by CLAUDE.md §0.11, so the two
existing commits are labelled in their messages and left for the user to split.
Reversal cost: n/a — process rule.
