# 27 — Group the remaining Build core concepts

**What to build:** The last of the flat files find their concept homes — releases, webhooks, analytics and reports, members and customers, custom fields and states, activity and changelog, settings, notification context, budget and templates. Roughly 60 files. After this, Build core is a set of named concepts rather than a directory of peers.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** ready-for-agent

- [ ] No concept group remains flat at the top of Build core
- [ ] Imports are updated; no file is orphaned
- [ ] The import graph stays acyclic, per BE-10
- [ ] Every route behaves identically and no logic changed
- [ ] Module naming is consistent with the convention the sibling Build submodules already follow
