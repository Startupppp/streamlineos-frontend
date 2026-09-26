# 02 — Delete the pass-through wrappers and dead methods in Build core

**What to build:** Reaching a behaviour in Build core takes one hop, not two. Several modules exist only to forward calls verbatim to a delegate — the tickets aggregate forwards 13 of its 14 methods, the roadmap aggregate 15 of 24 — so a reader hops through a name that transforms nothing. A separate module advertises WIP-limit and workflow-transition methods no production caller uses, while the real enforcement runs through free functions, making one invariant appear to live in two places.

BE-143 already forbids this shape: a function whose entire body forwards the same arguments to another exported function is deleted, not reviewed.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No Build core module survives whose methods only forward arguments to a delegate
- [ ] Callers inject the module that owns the behaviour directly
- [ ] The real logic currently trapped inside the tickets aggregate (the delete path, with its blocker probe and cascade) has its own home
- [ ] The zero-caller methods are gone, and WIP-limit enforcement has exactly one reachable definition
- [ ] Specs that constructed the aggregates now construct the focused module they actually exercise
- [ ] Every existing route behaves identically
