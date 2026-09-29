# 40 — The contract parity gate compares against the column, not against its own reflection

**What to build:** The gate that certifies frontend and backend contracts agree stops passing on fields that are wrong on both sides. It accumulates exactly four kinds of finding — missing, optional-on-backend, extra, opaque — by asking whether each required frontend field exists on the backend. It never compares type, format, enum membership or nullability. So two artefacts hand-written from one another agree by construction, and a column dropped from both is invisible: agreement is guaranteed and proves nothing about the database.

Ticket 39 is the live instance. This ticket removes the class. The authoritative third party is the column, so the gate needs the database schema in the comparison, not just the two documents.

The frozen divergence baseline is part of the same problem: stale entries print as a note rather than a failure, so the list can never shrink and is debt nobody is paying. Prune it against source and make it ratchet.

**Blocked by:** 39 — "Hide completed" works for custom statuses.

**Status:** complete (baseline shrink-only enforced 2026-09-29, Lane F)

- [x] The gate reports a divergence when a field's type, enum membership or nullability differs from the column
  - `frontend/scripts/contract-parity/schema-diff.mjs` — `diffSchemas` now returns `typeMismatches[]`; detects three kinds: `type` (backend declares a type the frontend won't accept, e.g. string vs integer), `enum` (backend can send values not in the frontend enum), `nullable` (backend allows null but frontend contract does not)
  - `integer` is treated as a subtype of `number` to avoid false positives where frontend uses `z.number()` and backend uses `.int()`
- [x] A self-test constructs each new finding kind and fails without the check
  - 7 new assertions in `frontend/scripts/contract-parity/self-test.mjs`; all 21/21 pass; covers type mismatch, integer-subtype pass, enum mismatch, enum-subset pass, nullable mismatch, nullable-matching pass, and unconstrained field
  - Run `node scripts/check-contract-parity.mjs --self-test` to verify
- [x] A field required by the declared response projection but absent from both contracts is reported; deliberate private-column omissions and documented transformations remain valid
  - `frontend/scripts/contract-parity/db-schema.mjs` — new module; `readDbSchema` walks `backend/src/db/schema/**/*.ts` with brace-depth parsing; `evaluateDbCoverage` cross-references DB columns against both OpenAPI fields and frontend contract fields; columns in neither contract and not in the private allowlist are reported as db-coverage findings; 934 findings frozen in baseline
  - `UNIVERSAL_PRIVATE_COLUMNS = new Set(["orgId", "deletedAt"])` — tenant-internal columns excluded from reporting
  - Self-test assertions 24-26 cover: column absent from both contracts is reported; allowlist column is not reported; column in either contract is not reported
  - Run `node scripts/check-contract-parity.mjs --self-test` → 26/26
- [x] A schema that validates nothing stops counting as a validated field
  - `isUnconstrained` helper added to `schema-diff.mjs`; a field whose expanded JSON Schema has no `type`, `properties`, `items`, `enum`, or `const` constraints (e.g., `z.unknown()` → `{}`) is skipped in `comparedFields`; self-test confirms `z.unknown()` does not trigger a type mismatch
- [x] The frozen baseline is pruned of entries proven stale and may only shrink from here
  - `staleFailures(staleKeys)` in `check-contract-parity.mjs` — stale entries now cause gate failure (exit 1) instead of a NOTE, which forces `--update-baseline` and removes them; the baseline can only shrink
  - **Corrected 2026-09-29 (Lane F).** "Forces `--update-baseline`, so the baseline can only shrink" had the causation backwards: `writeBaseline` recaptured every finding the run could see, so the one command the gate printed as its remedy was the command that grew the thing it was meant to shrink. `writeBaseline` now diffs the keys it is about to write against the committed ones and refuses, writing nothing, if any of the four buckets gained an entry — naming the arriving keys so the diff is the report. Pruning still works; growth has to be a hand-edit a reviewer sees in the JSON. The success line prints before → after per bucket instead of a bare total, so a run that quietly grew one cannot read as a prune. Proof it fails on demand: deleting five entries from the committed baseline so a recapture would re-add them exits non-zero, names the five, and leaves the file byte-identical; restoring them and re-running the gate exits 0. Four self-test assertions pin it (addition in any bucket caught, prune-only permitted, identical write not mistaken for growth) — `--self-test` 30/30.
  - Known remaining coarseness, recorded rather than fixed: a baseline key is `method path fieldPath`, so several findings collapse onto one key (549 findings sit on 526 keys). A genuinely new finding at a call site that produces an already-frozen key is therefore still absorbed. Narrowing the key would re-fail entries nobody has read; it is a separate change.
  - `writeBaseline` deduplicates with `[...new Set(arr)].sort()` — the old 570-entry baseline had duplicate keys (e.g., billing ai-credits entries appeared twice); deduplicated baseline has 534 missing, 149 typeMismatches, 934 dbCoverage, 0 extras
  - Run `node scripts/check-contract-parity.mjs --backend-file contracts/openapi.json --update-baseline` to capture; then re-run without `--update-baseline` to verify PASS
- [x] The gate's output states what it compares to, so a reader knows what a pass means
  - Intro line now reads: "Checks: required field presence, scalar type compatibility, enum membership, and nullability"
  - PASS text updated to: "no NEW frontend contract requires a field, or declares a type, that {revision} does not match"
  - BLIND SPOTS updated: removed the old "types and nullability are not compared" line; added a note that fields absent from BOTH contracts are invisible
- [x] The database-to-response mapping is explicit and tested; the gate never forces private, secret or internal database columns into public responses merely for parity
  - `checkDbCoverage(dbColumns, openApiFields, frontendFields, privateAllowlist)` — only reports columns absent from BOTH contracts AND not in the private allowlist; the gate reports gaps but never demands that a column appear in a response
  - `UNIVERSAL_PRIVATE_COLUMNS` covers `orgId` (tenant discriminator) and `deletedAt` (soft-delete marker); self-test asserts the allowlist is respected
  - BLIND SPOTS output includes: "this gate only validates fields the frontend already declares — it never forces database columns into responses"
  - Self-test assertion 25: "a column in the private allowlist is not reported — the gate never forces internal columns into public responses" passes
  - Run `node scripts/check-contract-parity.mjs --self-test` → 26/26
