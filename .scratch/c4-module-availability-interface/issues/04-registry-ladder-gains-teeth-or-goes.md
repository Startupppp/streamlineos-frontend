# 04 — The module registry describes what actually happens

**What to build:** The registry's universality field either drives behaviour or stops existing. Today it describes a module as universal while something else decides whether it is, so the registry reads as authoritative and is not. A descriptive field nothing reads is worse than no field, because the next person to change availability will change it there and nothing will happen.

Either the single core-module definition from ticket 02 reads the registry — making the registry the source rather than a parallel description — or the field is deleted and the registry stops claiming to answer this.

**Blocked by:** 02 — Everyone agrees which modules are core.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The field either determines whether a module is core, or does not exist.
- [ ] If it is kept: changing it changes behaviour, and a test proves that.
- [ ] If it is deleted: nothing references it, proved by the module-graph tool rather than a text search.
- [ ] Adding a new module requires a registry entry and no other availability code.
- [ ] The modules the constitution names as core still resolve as core either way.
- [ ] The decision and its reasoning are recorded in this ticket.
- [ ] Backend suite green.

## Todo

- [ ] Decide keep-or-delete and record why in this ticket
- [ ] If keeping: wire the core definition to read it, and add a test that flipping the field flips availability
- [ ] If deleting: remove the field and every reference, verified with the module-graph tool and a real build
- [ ] Confirm the constitution's core modules are unaffected
- [ ] Walk through adding a hypothetical new module and confirm it needs only a registry entry
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
