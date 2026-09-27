# 40 — The contract parity gate compares against the column, not against its own reflection

**What to build:** The gate that certifies frontend and backend contracts agree stops passing on fields that are wrong on both sides. It accumulates exactly four kinds of finding — missing, optional-on-backend, extra, opaque — by asking whether each required frontend field exists on the backend. It never compares type, format, enum membership or nullability. So two artefacts hand-written from one another agree by construction, and a column dropped from both is invisible: agreement is guaranteed and proves nothing about the database.

Ticket 39 is the live instance. This ticket removes the class. The authoritative third party is the column, so the gate needs the database schema in the comparison, not just the two documents.

The frozen divergence baseline is part of the same problem: stale entries print as a note rather than a failure, so the list can never shrink and is debt nobody is paying. Prune it against source and make it ratchet.

**Blocked by:** 39 — "Hide completed" works for custom statuses.

**Status:** ready-for-agent

- [x] The gate reports a divergence when a field's type, enum membership or nullability differs from the column
  - `frontend/scripts/contract-parity/schema-diff.mjs` — `diffSchemas` now returns `typeMismatches[]`; detects three kinds: `type` (backend declares a type the frontend won't accept, e.g. string vs integer), `enum` (backend can send values not in the frontend enum), `nullable` (backend allows null but frontend contract does not)
  - `integer` is treated as a subtype of `number` to avoid false positives where frontend uses `z.number()` and backend uses `.int()`
- [x] A self-test constructs each new finding kind and fails without the check
  - 7 new assertions in `frontend/scripts/contract-parity/self-test.mjs`; all 21/21 pass; covers type mismatch, integer-subtype pass, enum mismatch, enum-subset pass, nullable mismatch, nullable-matching pass, and unconstrained field
  - Run `node scripts/check-contract-parity.mjs --self-test` to verify
- [ ] A field required by the declared response projection but absent from both contracts is reported; deliberate private-column omissions and documented transformations remain valid
  - Requires comparing against the Drizzle DB schema, not just the two documents; gate has no DB schema access. Report to orchestrator — needs a catalog-driven extension (see ticket description: "the gate needs the database schema in the comparison").
- [x] A schema that validates nothing stops counting as a validated field
  - `isUnconstrained` helper added to `schema-diff.mjs`; a field whose expanded JSON Schema has no `type`, `properties`, `items`, `enum`, or `const` constraints (e.g., `z.unknown()` → `{}`) is skipped in `comparedFields`; self-test confirms `z.unknown()` does not trigger a type mismatch
- [ ] The frozen baseline is pruned of entries proven stale and may only shrink from here
  - Cannot be done statically; requires running the gate against the live backend document. Report to orchestrator.
- [x] The gate's output states what it compares to, so a reader knows what a pass means
  - Intro line now reads: "Checks: required field presence, scalar type compatibility, enum membership, and nullability"
  - PASS text updated to: "no NEW frontend contract requires a field, or declares a type, that {revision} does not match"
  - BLIND SPOTS updated: removed the old "types and nullability are not compared" line; added a note that fields absent from BOTH contracts are invisible
- [ ] The database-to-response mapping is explicit and tested; the gate never forces private, secret or internal database columns into public responses merely for parity
  - The gate is safe by design: it only validates fields the frontend contract already declares, so it can never force a private column into a response. Added explicit note in BLIND SPOTS output. The "explicit and tested" requirement for Box 3 (DB schema comparison) is unimplemented — blocked on the same missing DB schema access noted above.
