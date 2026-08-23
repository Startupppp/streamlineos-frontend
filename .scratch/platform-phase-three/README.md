# Platform phase three — ticket set

Ten tickets across three streams, dated 2026-08-23. Derived from the six architecture reviews in the repository root, each claim re-verified against the tree before ticketing.

These are the candidates the earlier phases left uncovered. Phase two's four streams (access version channel, module registry, list-view seam, entity actions path) are tracked in `.scratch/platform-phase-two/`.

## The streams

| Stream | PRD | Tickets | What it delivers |
|---|---|---|---|
| **E — Route registry** | `2026-08-23-route-registry-prd.md` | 01, 02, 03 | A screen's product is declared once, so the sidebar cannot silently lose a module. |
| **F — Config seam** | `2026-08-23-config-seam-prd.md` | 04, 05, 06, 07 | Misconfiguration fails at boot, and a new direct read fails the build. |
| **G — Person directory** | `2026-08-20-person-directory-seam.md` | 08, 09, 10 | One way to resolve a person, and the payroll entry point that is missing. |

## Progress — 2026-08-23

**Stream E is complete.** Tickets 01, 02 and 03 are done and committed. Full web suite 77 suites / 438 tests green, `tsc --noEmit` 0, `madge --circular` clean across 3,146 files. One criterion is deliberately left unticked on ticket 03: nothing was verified by running the application.

**Stream F: ticket 04 done** and committed to `streamlineos-api` as `be10e8c4`. Tickets 05, 06 and 07 open.

**Stream G: not started.** Its PRD predates this set and already carries the correction described below.

## Three live defects this set found, all in Stream E

Each was reachable in the product, and none was in any earlier ticket.

- **The Workflows group was in no product's sidebar.** It was assembled into the navigation tree and named in no product's heading list, so its nine routes — dashboard, templates, executions, approvals, scheduler, analytics, variables, secrets, access — were reachable only by typing a URL.
- **Global administration was gated on a paid module.** The `Organization` group declared `module: "hrms"`, so an organization without HRMS lost all of `/settings/organization/*`. `OrgHierarchyController` carries no `@RequireModule` and only `settings:*` permissions, so the backend never agreed with that gate. Cost centers are finance's and locations are inventory's; gating them on HR was never right.
- **Build's sidebar heading could not be renamed.** It read "Product Management", the module's pre-rename name, because the heading string was how the group found its product. The naming was also inverted: that group holds delivery work, while the group called "More" held the actual product management.

## Premises corrected before ticketing

Recorded because each would have produced a ticket that built the wrong thing.

- **The permission key grammar is not violated.** A review reported 53 two-segment keys breaking a documented `module:resource:action` grammar. Only `split(":")[0]` is load-bearing anywhere in the codebase — no code reads segment `[1]` or `[2]` structurally — and the domain verbs are documented as intentional where collapsing to `manage` would lose a distinction. There is no validator, which is true and does not matter much. No ticket.
- **`/build/anything` already returns 404.** A review reported a greedy `:projectId` route with `ParseIntPipe` returning 400 for sibling paths. The route uses `ParseResourceIdPipe`, which throws `NotFoundException`, and Nest resolves static segments before parameterized ones. No ticket.
- **The attendance event tables are not a live failure.** Seven attendance tables and two directory tables are declared in Drizzle with no applied migration, and a live service queries two of them — but `prepareCommand` returns `null` unless the organization's write mode is `DUAL` and calls `requireCanonicalRelations` before touching them. It fails safe with a 503, not a 42P01. The declared-vs-applied drift is real; the severity was not.
- **The config secrets fail closed.** The unvalidated webhook and token secrets reject every webhook and mint no tokens when unset. This is availability and diagnosability, not an authorization hole, and ticket 04 says so on its face.
- **The contractor premise was already corrected in Stream G's PRD.** An earlier draft claimed consolidating the person models would remove the ability to pay a non-member. `hr_employments` keys on `hr_people`, not on membership, and `hr_people.user_id` is nullable. The real gap is that payroll has two payee entry points and needs a third.

## Known hazards in this area

- The web `tsconfig.json` **excludes test files**, so a clean `tsc --noEmit` does not prove the tests compile. A required field added to a shared type is invisible there until a test runs.
- A digest test pins the navigation graph. It is doing its job when it fails on an intentional rename — update the digest, do not weaken the test.
- This tree is edited by more than one session at once, and the git index is shared. `git add <paths>` followed by a bare `git commit` takes the **whole index**. The correct form is `git commit -m … -- <paths>`, and the pathspec should name **files, not directories** — a directory pathspec swept in a neighbouring file mid-way through this set.
- A subagent will report the queries a service makes without reading the guards above them. Verify severity yourself before ticketing a live bug.
