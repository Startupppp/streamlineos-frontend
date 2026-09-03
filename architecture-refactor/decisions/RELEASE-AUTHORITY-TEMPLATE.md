# Release-authority record — template

Copy this file to `release-authority-YYYY-MM-DD-<scope>.md` for one release. **Do not sign this
template, and never cite it as a release authority.** A copy with an unfilled field is not a
record; a copy with a signature nobody gave is a forged one.

This template serves both release-authority criteria, which are deliberately different:

| Criterion | Scope | Permits the label |
|---|---|---|
| **PRD-C161** | *"Release authority records commit, evidence, accepted code-level residual risks and date."* | **code-level 10/10 release candidate** |
| **PRD-C195** | *"Release authority records commit, environment, evidence, accepted residual risks and date."* | **production-proven 10/10** |

C195 adds one word — **environment** — and that word is the whole difference. A code-level record
describes a commit. A production record describes a commit *running somewhere*. Set
`Record scope` below to exactly one of them and delete the other's rows; a record that straddles
both is a record of neither.

---

## 0. Standing rules for this record

These are not decoration. Each closes a specific way a release record goes wrong.

1. **Every field is filled before any signature is sought.** An approver signing next to a blank
   evidence path is approving nothing.
2. **A gate that exited 2 is INCONCLUSIVE, not passing.** PRD-C016: *"interrupted, skipped and
   prerequisite-blocked gates never count as passing."* Record the exit code, never a verdict word
   alone.
3. **A `:self-test` is not evidence of the rule.** It proves the detector bites. Record both halves
   or neither.
4. **A drill that was not run is not recorded.** Absent evidence is written as absent. Fabricating
   a manifest, an approval or a drill result is the worst outcome available here — far worse than
   recording a criterion as blocked.
5. **Working trees must be clean at both SHAs.** A dirty tree means the recorded SHA does not
   describe what was measured. Record the `git status --porcelain` line count for both repos.
6. **Every accepted residual risk carries a named owner and a dated review.** An accepted risk with
   no owner is an ignored risk.
7. **No signature block may be filled by automation.** An agent may author every other field.

---

## 1. Record identity

- Record ID:
- Record scope: `code-level (PRD-C161)` / `production (PRD-C195)`
- Decision date (UTC):
- Review/expiry date:
- Record status: `approved` / `approved-with-conditions` / `rejected` / `withheld`
- Supersedes (record ID, if any):

## 2. Code under authority

| | Frontend / root | Backend |
|---|---|---|
| Repository | | |
| Branch | | |
| Commit SHA (full) | | |
| Commit date (ISO 8601) | | |
| Working tree clean at measurement? | `git status --porcelain` count: | count: |
| Tag (if cut) | | |

- Both SHAs measured at the same moment: `yes` / `no` —
- Anything in the tree at measurement time that is **not** in either commit:

## 3. Environment under authority

*Required for a production record (PRD-C195). For a code-level record (PRD-C161) write
`NOT APPLICABLE — code-level record` and delete the rows.*

| | |
|---|---|
| Environment name | |
| Region(s) | |
| Cell(s) | |
| Deployed target / URL | |
| Deployed at (UTC) | |
| Deployed artifact digest | |
| Topology export SHA-256 | |
| Database journal entries at deploy | |
| Migration ledger rows at deploy | |
| Attesting operator (name, role) | |

- The deployed commit equals the commit in §2: `yes` / `no` —
- If no, the release authority may not be granted. State why the record continues:

## 4. Evidence index

Every row states the command actually run, its real exit code and where the artifact lives.
`n/r` = not run. An empty result cell voids the row.

### 4.1 Code-level gate — PRD-C190 / PRD-C020 / PRD-C158

The gate list and its exact command are fixed in
`architecture-refactor/final-refactor/evidence/42-production-ops/release-authority/C190-C194-MEASUREMENT-DEFINITION.md`.
Record the run, not a summary of it.

| Gate group | Command | Exit | Pass / Fail / Skip / Inconclusive | Artifact path or hash |
|---|---|---:|---|---|
| Builds and typechecks | | | | |
| Focused tests | | | | |
| Disposable-database E2E | | | | |
| Contract and OpenAPI | | | | |
| Cycles and DI | | | | |
| File size | | | | |
| Dead code | | | | |
| Tenant isolation and RLS | | | | |
| Permission | | | | |
| Cache | | | | |
| Outbox and idempotency | | | | |
| Migration and bootstrap parity | | | | |
| Vulnerability / licence / SBOM | | | | |
| Gate integrity | | | | |

- Gates that exited **2** (inconclusive), and the named prerequisite absent for each:
- Gates **interrupted** or not run, and why:
- Total: `___ passed · ___ failed · ___ inconclusive · ___ not run` out of `___`

### 4.2 Deployed operations evidence — PRD-C192 / PRD-C175

*Production record only.* One row per runbook. Verified by
`pnpm -C backend ops:evidence:check`, which re-hashes every artifact and requires every listed
assertion to pass.

| Runbook | Required assertions | Result | Manifest path | Operator | Observed at (UTC) |
|---|---|---|---|---|---|
| RB-01 cell isolation | `independent-resource-identity`, `cross-cell-credential-boundary` | | | | |
| RB-02 PITR / backup | `pitr-retention`, `restore-rpo` | | | | |
| RB-03 read replica | `physical-replica`, `measured-replica-lag`, `primary-fallback` | | | | |
| RB-04 recovery drill | `cell-recovery-rto-rpo`, `regional-recovery`, `organization-relocation` | | | | |
| RB-05 production load | `production-shaped-load`, `tenant-isolation-under-load`, `headroom-40-percent` | | | | |
| RB-06 live alert delivery | `live-alert-delivery`, `human-acknowledgement`, `release-observability` | | | | |
| RB-07 per-cell cost | `invoice-derived-cell-cost`, `seven-day-cost-trend`, `operator-capacity-approval` | | | | |
| RB-08 cell resource accounts | `separate-resource-accounts`, `per-cell-credentials`, `separate-worker-deployment` | | | | |

- `pnpm -C backend ops:evidence:check` exit code:
- `pnpm -C backend ops:evidence:self-test` exit code:

### 4.3 Compliance and privacy evidence — PRD-C186 / C187 / C188

| Evidence | Command | Exit | Artifact path or hash |
|---|---|---:|---|
| Retention / legal-hold drill | | | |
| Export / portability drill | | | |
| Erasure drill (incl. object, search, vector, cache) | | | |
| Evidence seal verification | | | |

### 4.4 Decision records relied upon — PRD-C182 / C193

| Decision record | Path | Signed date | Approvers |
|---|---|---|---|
| | | | |

## 5. Approvals — PRD-C193 / PRD-C182

PRD-C193 requires **all six** functions. A missing row is a missing approval, not an implied one.
Each approver signs for the scope in §2 and §3 and for the evidence index in §4 as it stands at
the signing date.

| Function | Name | Role / title | Decision | Date (UTC) | Signature or approval reference |
|---|---|---|---|---|---|
| Product | | | | | |
| Security | | | | | |
| Privacy / DPO | | | | | |
| Operations | | | | | |
| Legal | | | | | |
| Finance | | | | | |

Decision values: `approve` / `approve-with-conditions` / `reject` / `abstain-out-of-scope`.
An `abstain` must name why the function has no interest in this release.

**Conditions attached by an approver**

| # | Function | Condition | Owner | Due date | Blocking? |
|---:|---|---|---|---|---|
| | | | | | |

## 6. Accepted residual risks — PRD-C195 / PRD-C161 / PRD-C021

Only risks **accepted** here. A risk that was fixed is not a residual risk, and a risk with no
owner is not accepted — it is ignored. Severity per the rubric in
`C190-C194-MEASUREMENT-DEFINITION.md` §2.4.

| # | Risk | Severity | Class (code / production / compliance) | Why accepted rather than fixed | Accepting function | Owner | Review date | Trigger that reopens it |
|---:|---|---|---|---|---|---|---|---|
| | | | | | | | | |

- P0 residual risks accepted: `___` (any non-zero value must be justified below)
- P1 residual risks accepted: `___`

## 7. Unresolved findings — PRD-C194 / PRD-C160 / PRD-C189

| # | Finding | Severity | Class | Status | Disposition | Owner | Date |
|---:|---|---|---|---|---|---|---|
| | | | | | | | |

- Unresolved **code-level** P0/P1 (PRD-C160): `___`
- Unresolved **production/compliance** P0/P1 (PRD-C194): `___`
- The register was measured by: (command)
- The register is empty because the drills ran and found nothing: `yes` / `no` — **if `no`, the
  count above is not evidence of a clear register.**

## 8. Scope exclusions

- CRM and Inventory excluded (PRD-C157): `confirmed` / `not confirmed` —
- Public landing-page visuals and animations unchanged (PRD-C157): `confirmed` / `not confirmed` —
- Anything else knowingly outside this authority:

## 9. Grant of release authority

Complete **only** when every section above is filled and every approval in §5 is signed.

- Label granted: `code-level 10/10 release candidate` / `production-proven 10/10` / **`none`**
- Effective from (UTC):
- Expires / must be re-taken on:

**Attestation.** I confirm that the commits and environment named above are the ones measured,
that the evidence index states real commands and real exit codes, that no interrupted, skipped or
prerequisite-blocked gate has been counted as passing, that every accepted residual risk carries a
named owner and a review date, and that no drill described here went unrun.

- Release authority:
- Name / title:
- Date (UTC):
- Signature or approval reference:

---

### Authoring note

An agent may complete §1 through §8 and leave §5 and §9 blank. That is the intended division:
every measurable field filled from measurement, every signature left for a person. An agent that
fills a signature field has forged a record, whatever it wrote there.
