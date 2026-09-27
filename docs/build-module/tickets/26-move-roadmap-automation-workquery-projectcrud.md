# 26 — Group roadmap, automation, work-query and project CRUD

**What to build:** Four more concepts get their own directories — roadmap (with its prioritisation, publication, signals and delivery), automation (runner, actions, run history), work-query, and project CRUD (query, write, provision, access, scope). Roughly 58 files. Same rationale and same discipline as ticket 25: a maintainer looking for automation reads 14 files in one directory instead of filtering 227 names.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** ready-for-agent

**Executed 2026-09-27 by LANE-Z.**

**Premise corrections:**
- The ticket said "roughly 58 files". Actual count: 57 files (14 roadmap + 14 automation + 8 work-query + 21 project-crud).
- The `dto/roadmap.schemas.ts` and `dto/build-roadmap-response.schemas.ts` files (staying in `core/dto/`) import from the moved roadmap files and required path updates — not counted in the 57.
- The `tickets/` directory had 19 files importing from moved files (project-access, build-automation-runner.service, projects-search.service, projects-work-query.service, projects-work-query-helpers) — these were in fenced territory but required import-path-only updates for compilation.
- `projects.controller.e2e-spec.ts` imports `./projects-query.service` — this is fenced (e2e-spec) and was NOT updated. Required edit: change line 6 from `"./projects-query.service"` to `"./project-crud/projects-query.service"`.

**Directories created:**
- `backend/src/modules/build/core/roadmap/`
- `backend/src/modules/build/core/automation/`
- `backend/src/modules/build/core/work-query/`
- `backend/src/modules/build/core/project-crud/`

- [x] Each of the four concepts lives under its own named directory
- [x] Imports are updated; no file is orphaned
- [x] The import graph stays acyclic, per BE-10
- [x] Every route behaves identically and no logic changed
