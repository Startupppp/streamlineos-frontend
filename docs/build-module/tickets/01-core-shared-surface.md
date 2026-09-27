# 01 — Publish the Build core shared surface

**What to build:** A reader (or agent) can answer "what is Build core's public surface?" from the directory itself. Core currently holds 227 files at one level with no published interface, so every sibling submodule reaches in by file path and nothing distinguishes a shared utility from an internal. Declare the surface explicitly and point sibling imports at it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Architecture constraint (2026-09-27):** This is a backend module interface, not permission to
create another frontend hooks barrel. Export only intentionally shared contracts/helpers, keep
type-only imports type-only, and do not have internal files import their own outward-facing
barrel. A directory move or barrel by itself does not make private symbols inaccessible; ticket
28 must enforce the import boundary. Preserve dependency direction and Nest provider identity.

- [ ] Core exports exactly the symbols legitimately shared across sibling Build submodules, and nothing else
- [ ] Every sibling submodule imports those symbols from the core surface rather than by deep file path
- [ ] Symbols that remain internal are not reachable from outside core
- [ ] No behaviour change: module registration and every route are untouched
- [ ] A focused dependency-cycle/boundary check and module-wiring tests pass after the moves; no internal-to-public-barrel back edge is introduced
