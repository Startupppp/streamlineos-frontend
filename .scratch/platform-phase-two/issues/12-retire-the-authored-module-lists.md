# 12 — Retire the authored module lists

**What to build:** The contract step. After this ticket the registry is not merely the source the lists derive from — it is the thing code reads, and the old arrays are gone.

Ticket 02 made the lists derived while keeping every existing name and value, so nothing had to change at once. This ticket finishes the move: call sites read the registry or its derived views, and the authored declarations are deleted rather than left sitting beside their replacements where the next person can edit the wrong one.

**Blocked by:** 02 — One registry declares what a module is. 06 — Resolve the `home` ghost. 07 — Case translation into the registry.

**Status:** ready-for-agent
> **Status re-verified 2026-08-23: DONE.** The authored arrays are gone; `MODULE_CATALOG = planGatedModuleIds()`, `ACCESS_MANAGED_MODULES = delegableModuleIds()`.


- [ ] Call sites read the registry or a derived view. No module fact is authored in two places.
- [ ] The previously authored arrays are deleted, not deprecated.
- [ ] Deletion is proven with a module-graph tool and a real build, not by import search. A bare side-effect import is invisible to a from-based scan, and dynamic imports and re-export chains are too.
- [ ] The full invariant set from tickets 02 and 06 still passes — including that every permission key's administering module exists, that billing is in neither view, and that no namespace is administered twice.
- [ ] No stored module key, grant row or enablement row was migrated at any point in this stream.
- [ ] Adding a module is demonstrably one entry: adding a test-only module to the registry produces it in every derived view without any other edit.
