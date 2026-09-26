# 26 — Group roadmap, automation, work-query and project CRUD

**What to build:** Four more concepts get their own directories — roadmap (with its prioritisation, publication, signals and delivery), automation (runner, actions, run history), work-query, and project CRUD (query, write, provision, access, scope). Roughly 58 files. Same rationale and same discipline as ticket 25: a maintainer looking for automation reads 14 files in one directory instead of filtering 227 names.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** ready-for-agent

- [ ] Each of the four concepts lives under its own named directory
- [ ] Imports are updated; no file is orphaned
- [ ] The import graph stays acyclic, per BE-10
- [ ] Every route behaves identically and no logic changed
