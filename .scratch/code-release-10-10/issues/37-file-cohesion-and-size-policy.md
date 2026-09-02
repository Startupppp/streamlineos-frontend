# 37 — File cohesion, size policy and published inventories

**What to build:** The §2.2 close-out. Both hard-500 gates already exist and pass; this proves the policy at the release commit, publishes the inventories, and confirms every split preserved behaviour.

**Blocked by:** 36.

**Status:** ready-for-agent

- [ ] The hard-size gate scans every applicable workspace with a vacuity floor and fails on a new unregistered file over the limit. Excluded modules are reported separately.
- [ ] The exception registry fails closed: missing or stale paths, line counts, owners, interfaces, reasons or review dates fail, and a file that falls to the limit or below automatically loses its exception.
- [ ] Generated, vendor and migration exclusions are path-classified and never exempt ordinary authored implementation transitively.
- [ ] Every registered exception records exact path and measured lines, category, owner, public interface, a concrete cohesion argument, alternatives considered, review date and removal trigger. No directory-wide or wildcard exception exists.
- [ ] Splits are by cohesive responsibility — never numbered fragments, pass-through wrappers, re-export shells or mutually dependent files created to satisfy a counter.
- [ ] Over-300 and over-500 inventories are published for both repositories at the final commit.
- [ ] Each extraction is proven to preserve behaviour, import direction, DI registration, route ownership, caching and authorization.
- [ ] Splitting a file breaks its direct importers and drops it from path-keyed gates; both are re-run rather than assumed.
