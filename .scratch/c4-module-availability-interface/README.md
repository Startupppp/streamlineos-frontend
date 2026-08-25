# c4 — One interface answers "is this module available to this person"

Spec: [`docs/specs/c4-module-availability-interface.md`](../../docs/specs/c4-module-availability-interface.md)

**Candidate status:** the seam shipped; its inputs did not. The availability function is exactly what the review asked for — one ordered, documented assembly returning a discriminated reason. But it takes its facts through an injected resolver, and three of its four callers assemble those facts differently. Two supply an empty plan-locked list, which deletes a branch of the resolution order. Three disagree about which modules are core, which is the branch that bypasses every other check.


**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Ticket 01 is expected to fail on first run.** That is its purpose. Record which cells disagree; that list drives 02 and 03.

**This candidate changes no policy.** That an organisation keeps a paid module through a downgrade is a recorded decision. The point here is locality — making that decision one explicit, testable branch you could change your mind about — not revisiting it. The code change looks like a policy change, which is why this is worth repeating.

**Look for `async () => []`.** It type-checks, reads as intentional, and silently removes a state-machine branch. Two instances sit inside otherwise-complete object literals, which is how they survived a review that named this exact class of defect.

**All tickets in this program are complete and have been retired.** The verification evidence lives in the git history of `.scratch/`; the spec in `docs/specs/` records the architecture.
