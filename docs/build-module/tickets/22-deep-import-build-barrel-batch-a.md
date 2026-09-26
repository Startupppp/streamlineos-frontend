# 22 — Deep-import the Build hooks barrel, batch A (page-level modules)

**What to build:** Build page-level modules import the specific hook module rather than the Build hooks barrel, which re-exports 40 modules spanning incidents, QA, forms, client portal, agent tokens and more. 99 Build files name that barrel today; this batch covers the page-level modules, which are the ones whose module graph matters most.

Split across two tickets deliberately: the blast radius is wide enough that one change touching all 99 files would be hard to review and would collide with concurrent work in a shared tree.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every Build page-level module imports hooks by their owning module
- [ ] The barrel itself is untouched and still works for remaining callers
- [ ] No behaviour or rendering changes
- [ ] The remaining callers are recorded so batch B has an exact list
