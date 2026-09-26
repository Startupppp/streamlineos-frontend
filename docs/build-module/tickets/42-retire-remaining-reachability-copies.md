# 42 — The remaining reachability copies go, and the answers stop disagreeing

**What to build:** A team-only member sees their tickets in every list that claims to show them. Today the project opens for them and their tickets are missing from it, because the canonical helper grants team access and the all-work list and the entity cards do not check that branch. A project manager who holds no membership row gets the opposite split — denied where the others allow. Migrating the six remaining construction sites onto the module from ticket 41 makes every surface answer the same question the same way.

The drift spec that exists purely to assert two copies of the predicate stay identical is deleted — not because it passes, but because there is nothing left for it to compare. That spec is rent being paid on the duplication.

Blast radius is 8 construction sites across 6 files; the 48 downstream callers of the canonical helper do not change, and roughly 12 spec files stub the helper being retired.

**Blocked by:** 41 — One module answers "which projects can this actor reach", and the sharpest caller uses it.

**Status:** ready-for-agent

- [ ] All six remaining copies are expressed through the module and no independent cascade remains
- [ ] A team-only member and a manager-not-member get identical verdicts from the ticket list, the project read, all-work, the scope directory and entity cards
- [ ] The drift spec is deleted and its assertion is covered by the module's own branch matrix
- [ ] The specs that stubbed the retired helper stub the module instead, and still fail when the predicate is wrong
- [ ] The scope directory file drops under 500 lines as a consequence, per BE-09
- [ ] Ticket 18 can now resolve access once per request through a single seam
