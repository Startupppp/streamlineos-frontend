# Build Context Capsules

## Rule

An agent reads the applicable repository `CLAUDE.md` files, its completed
assignment contract, the exact source/test files in its packet, and only the
PRD sections named by its capsule. It does not reread the Build PRD corpus.

The coordinator copies the exact acceptance text needed by the packet into the
assignment and names no more than three supporting PRD sections. Target packet
context is under 12,000 tokens excluding repository rules and source code. If
the packet needs more, split the outcome or disclose one additional reference
only when the corresponding branch is reached.

## Capsules

| Packet lane | Required acceptance sections | Source entry points | Skip by default |
|---|---|---|---|
| Route census/seam | `module/01a` relevant route table; `module/01` matching behavior section; `module/01b` matching access row | assigned route files, navigation caller extractor, route-access owner | page anatomy, DB matrices, competitor and release PRDs |
| Form census/leaf | one row from `module/05a`; matching validation/error/dirty section from `module/05` | assigned component, owned schema, hook, backend DTO | unrelated forms and page contracts |
| API census/backend leaf | one resource row from `module/06a`; matching authorization/query/cache rule from `module/06` | assigned controller, service, DTO, direct specs | other controllers, full schema matrix, frontend page catalog |
| Schema census/migration | one row from `module/06b`; matching domain decision from `module/00` when applicable | one schema file, related migrations, journal/integrity test | other schema files and page/UI PRDs |
| Organization page | one row from `module/02c`; relevant filter/action rule from `module/03` or `04`; relevant state rule from `module/08` | exact route, feature owner, hook, direct tests | other page rows and release matrix |
| Workspace/product page | one row from `module/02d`; relevant route/access row | exact route, feature owner, hook, direct tests | project and portal rows not used by the page |
| Project delivery page | one row from `module/02e`; relevant ticket/discovery rule | exact route, feature owner, hook, direct tests | control/settings and unrelated delivery rows |
| Project control/settings page | one row from `module/02f`; relevant validation/workflow rule | exact route, feature owner, hook, direct tests | other settings pages and full release PRD |
| Sidebar navigation | matching section from `sidebar/01`; matching route rows from `module/01a` | assigned nav component/catalog consumer and tests | sidebar history/evidence logs unless investigating regression provenance |
| Sidebar directory | matching section from `sidebar/02`; scope-directory row from `module/06a` | assigned selector component/hook or backend directory resource | other sidebar PRDs and page contracts |
| Sidebar actions/signals | matching section from `sidebar/03`; Agent Pulse/Inbox resource row when used | assigned component/hook/service and tests | unrelated sidebar evidence logs |
| Sidebar lifecycle | matching section from `sidebar/04`; dirty/back rule from `module/01` or `05` | assigned scope switch, guard, fallback, or offline files | broad route/page catalogs |
| Visual leaf | one page row from `module/02c`–`02f`; one applicable-state subsection from `module/08` | exact page/component and shared tokens read-only | competitor, DB, and API matrices |
| External verification | exact acceptance IDs from `module/10` or `sidebar/05`; generated inventory batch | fixed-revision test fixture/journey | implementation history not needed to run the check |

## Historical Evidence

Historical evidence logs are read only when a packet must determine whether a
specific behavior was previously proved, reverted, or left pending. The
coordinator extracts the relevant dated entry into the assignment. Agents do
not scan all historical passes to establish current source behavior.

## Context Escalation

When assigned sources contradict the capsule:

1. stop the conflicting implementation step;
2. report the exact source and acceptance statements;
3. request one named contract decision or shared-seam change; and
4. continue independent work inside the packet when safe.

The agent does not open adjacent PRDs speculatively or redesign the entire
module from a local contradiction.
