# c2 — Calendar source seam

Spec: [`docs/specs/c2-calendar-source-registry.md`](../../docs/specs/c2-calendar-source-registry.md)

**Candidate status:** shipped. The source interface, the registry, per-module registration, per-person availability filtering and failure isolation are all in place, and the calendar imports nobody's tables. What remains is the product promise the registry was built to enable: sources are declared toggleable but a person's choice is not stored.


**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Do not undo:** availability is resolved per person, not per organisation — a person individually denied a module was previously still receiving its events. The comment recording this sits in the registry and is load-bearing.

**All tickets in this program are complete and have been retired.** The verification evidence is in the git history of `.scratch/`; the architecture is recorded in `docs/specs/`.
