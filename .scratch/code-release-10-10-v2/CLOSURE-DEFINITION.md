# Closure definition — what "all 195 criteria done" can honestly mean

**Written 2026-09-03 as the release owner's decision record.** It reconciles two independent
classifications of the same 195 criteria and settles the completion target before the endgame,
so the target cannot move afterwards (PRD §"Closure and future-review protocol").

## The two classifications disagree on exactly four criteria

| Source | Immediate / CODE | Deferred / blocked |
|---|---:|---:|
| The PRD's own section split (line 614 is the boundary) | 161 | 34 |
| `DEFERRED-CHECKBOX-LEDGER.md`, classified from each criterion's own wording | 159 | 36 |

Four criteria are placed differently. In all four the **ledger is right**, because it reads the
criterion's text rather than its position in the file:

| Criterion | PRD section | Ledger | Why the ledger wins |
|---|---|---|---|
| **PRD-C010** | immediate | DEPLOYED | Its own words: "…and v2 ticket 34's **deployed** private-bucket/backfill evidence before cutover." The ticket-21 code half is closable here; the deployed half is not. |
| **PRD-C016** | immediate | DEPLOYED | "…then v2 ticket 36's **deployed** release-authority record." Same shape: the ticket-31 half is code, the ticket-36 half is not. |
| **PRD-C161** | immediate | HUMAN | "Release authority **records** commit, evidence, accepted code-level residual risks and date." A record is signed by a person; no agent may sign it. |
| **PRD-C188** | deferred | CODE | Retention/legal-hold drills plus a redacted, hashed evidence bundle. All of it runs against a local database. Being in the deferred section does not make it undoable. |

## The consequence, stated plainly

**The PRD's "Immediate code-level final gate" cannot reach 161/161 on a machine with no deployed
environment and no signatories.** Three of its criteria carry a half that is not code. This is not
a shortfall in the work; it is what those three criteria say.

So the achievable target is:

- **159 CODE criteria — closable here, and the definition of code-level 10/10.**
- **26 DEPLOYED criteria** — blocked on a real environment: deployed TLS and edge WAF/CSP, a
  provisioned per-cell cache/queue/object store, a physical replica with measured lag, PITR, load
  at scale, live alert delivery to a real channel.
- **10 HUMAN criteria** — blocked on a named signature: Product, Security, Privacy/DPO,
  Operations, Legal, Finance, and the release-authority record itself.

The PRD already anticipates this split — *"Deferred production/compliance criteria remain 34 open
and are not counted as code-level completion"* — and its closure protocol names PRODUCTION
EVIDENCE as one of the four legitimate later-addition classes. The 36 blocked criteria are that
class. They are dispositioned, not waived: each has an owner and a named blocker in the ledger.

## What is NOT an acceptable way to reach 159/159

Recorded because every one of these was available and rejected during this release:

- Raising a ratchet, ceiling, budget or baseline so a red gate reports green. Several gates in
  this repository say in their own output that doing so is the defect they exist to catch.
- Adding an allowlist or exception entry in place of a fix.
- Narrowing a gate's corpus so it stops seeing the violation. Nine gates had already been caught
  reporting clean over an empty or near-empty corpus; `gate-corpus.mjs` documents each.
- Weakening an assertion, or deleting or skipping a test, to make a suite pass.
- Marking a criterion complete on an unverified auditor claim. Every finding in this release is
  confirmed by a second agent before it is fixed, and every fix is reverted by a third to prove
  its regression test actually fails without it.
- Signing, or authoring as signed, any approval a human did not give. The release-authority
  record's six approval rows are empty and its filename says UNSIGNED.

An exit code of `2` from any gate means INCONCLUSIVE — a named prerequisite is absent — and never
counts as a pass. PRD-C016 says the same thing: "interrupted, skipped and prerequisite-blocked
gates never count as passing."

## Reporting rule for the final summary

Three numbers, never one:

1. **Closed with evidence** — the criterion is met, and the command that proves it is recorded.
2. **Open with a named blocker** — what is missing, who owns it, what would close it.
3. **Refuted** — a finding that turned out not to be real. This number going up is the
   verification working, not the work failing.

A single "195/195" would be false on any reading of this file.
