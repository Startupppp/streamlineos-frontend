# 25 — Group the ticket concept into its own directory

**What to build:** Everything about a ticket lives in one place. Roughly 65 files concerning tickets — create, read, update, detail, transfer, bulk mutation, workflow, ranking, capacity, comments, checklists, links, relations — currently sit as flat peers among 227 files, so answering "how does ticket ranking work?" means scanning filenames for a prefix.

Move them under a named directory. Structure only; no logic changes.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** ready-for-agent

- [ ] Ticket files live under one named directory
- [ ] Imports are updated; no file is orphaned
- [ ] Nothing outside the group reaches into it except through the shared surface
- [ ] The import graph stays acyclic, per BE-10
- [ ] Every route behaves identically and no logic changed
- [ ] File names stay kebab-case, per BE-08
