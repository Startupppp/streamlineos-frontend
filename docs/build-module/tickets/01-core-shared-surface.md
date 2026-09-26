# 01 — Publish the Build core shared surface

**What to build:** A reader (or agent) can answer "what is Build core's public surface?" from the directory itself. Core currently holds 227 files at one level with no published interface, so every sibling submodule reaches in by file path and nothing distinguishes a shared utility from an internal. Declare the surface explicitly and point sibling imports at it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Core exports exactly the symbols legitimately shared across sibling Build submodules, and nothing else
- [ ] Every sibling submodule imports those symbols from the core surface rather than by deep file path
- [ ] Symbols that remain internal are not reachable from outside core
- [ ] No behaviour change: module registration and every route are untouched
