# Code-release 10/10 — session plan

42 tickets in `issues/`, grouped into 10 sessions. Sessions 1–8 run concurrently. Session 9 runs after them. Session 10 is the barrier.

Numbering is dependency order: a ticket never depends on a higher number.

## Rules every session obeys

These are not style preferences. Each one has already cost work in this repository.

1. **Stay inside your territory.** The table below assigns exclusive paths. Do not edit a path another session owns — report it to the orchestrator instead.
2. **Stage by explicit pathspec. Never `git add -A`.** All sessions share one working tree. A blanket stage swallows another session's in-progress work into your commit.
3. **Never `git stash`, `reset`, `checkout`, `pull` or `rebase.`** A stash takes every session's uncommitted work, and the loss is silent. Commit is the only git verb available.
4. **`backend/` is a separate git repository.** The root `.gitignore` ignores it. A change spanning both needs two commits.
5. **A red typecheck may not be yours.** Before debugging, check whether the failing path is in your territory.
6. **Report gates honestly.** Not run is not passing. Lint and e2e are only claimed if explicitly requested and actually executed.
7. **Scratch databases only.** Never touch the primary or cell databases. Never print a connection string.
8. **Verify against artifacts, not reports.** A delegated fix can land inert; count what is on disk.

## Sessions

| # | Session | Tickets | Exclusive territory |
|---|---|---|---|
| S1 | Migrations, bootstrap & catalog parity | 01–04 | `backend/migrations/**`, bootstrap/catalog/migration scripts, scratch DBs |
| S2 | Schema & executable-key minimization | 05–08 | `backend/src/db/schema/**` |
| S3 | AI gateway, retrieval & streaming | 09–13 | `backend/src/modules/ai/**`, frontend AI surfaces |
| S4 | Authorization, tenancy & privacy proof | 14–19 | `backend/src/modules/{rbac,gdpr,auth,organization}/**`, security specs |
| S5 | Query cost, route & backend budgets | 20–24 | backend query paths, `contracts/route-budgets.json`, payroll module |
| S6 | Frontend route architecture & Web Vitals | 25–27 | `frontend/app/**`, next config, budget scripts |
| S7 | Frontend data layer, UX & module surfaces | 28–30 | `frontend/{hooks,features,components}/**` |
| S8 | Operability, uploads & published contracts | 31–35 | observability / upload / contract seams, gate self-tests |
| S9 | Repository hygiene, cohesion & type integrity | 36–39 | **both repos** — runs after S1–S8 |
| S10 | Reconciliation & release verification | 40–42 | the PRD + evidence — runs last |

### Why S9 is not parallel

It is a wide refactor: one mechanical class of change whose blast radius is every file. It cannot hold a lane while eight sessions edit the same paths — it would collide with all of them. It runs behind, which is also when its findings are most accurate.

## Kickoff prompt

```
Read D:\projects\personal\Streamlineos\CLAUDE.md, the side-specific CLAUDE.md for
every repo you touch, and .scratch/code-release-10-10/SESSIONS.md.

You are session S<N>. Work tickets <range> from .scratch/code-release-10-10/issues/,
in order. Stay strictly inside your territory as listed in SESSIONS.md.

For each ticket: audit against current source first, then implement, then prove.
Tick a box only when you have run the proof yourself. Commit between tickets,
staging by explicit pathspec only.

The PRD text is stale — verify current state before treating any claim in it as
true, in either direction.
```

## Already closed — do not re-do

Verified against the tree on 2026-09-02. The PRD still lists these as open.

| Item | Evidence |
|---|---|
| `kb-rag.service.ts` over-300 regression | Split into 196 + 209 (`kb-rag-retrieval.service.ts`) |
| Frontend hard-500 gate missing | Exists, wired, self-tested; 4,795 files, 0 exceptions |
| Dead barrel `features/build/inbox/index.ts` | Deleted; dead-code gate at 0 files / 0 exports |
| Notification lifecycle rollback (§10.15) | `297ff3a4c` |
| Calendar provider-drift behaviour undecided | `81dda608` — local state authoritative |
| Chat attachment privacy | `effb25b5` |
| GDPR session revocation on erasure | `ec031d3b` |
| GDPR rectification beyond `users.name` | `ad2eb504` |
| Workflow step DLQ | Migration `0989` |
| Unknown-key policy on request schemas | `.strict()` on 1,652 schemas, 7 documented exceptions |
| `sign/*` and `surveys` page gates | 8 pages gated via `requireModulePermission` |

## Open and unowned by any ticket

- **Chat attachment bucket privacy** needs an operator action in the object-storage console. The backfill script is written and has not been run. No code change substitutes.
- **A leaked database credential** still needs rotating in the provider console. Removing the line does not un-leak git history.
- **`crm-copilot.service.phase2.spec.ts`** carries 21 tests suppressed by six `describe.skip` blocks whose target methods all exist. This is suppressed coverage, not an environment skip — but it is CRM, which this release excludes. Logged, not fixed.
