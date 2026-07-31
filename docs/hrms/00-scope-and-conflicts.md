# 00 — Scope Confirmation & Rule Conflicts

Phase 0 output. Everything below was verified against the repo on 2026-07-31; nothing is assumed.

---

## 1. Stack confirmation (brief vs repo)

| Brief claims | Repo reality | Verdict |
|---|---|---|
| NestJS (API) | `@nestjs/common` / `@nestjs/core` **10.4.15**, `@nestjs/swagger` 11.4.4 (`backend/package.json`) | ✅ (Nest **10**, not 11) |
| Next.js App Router | **16.2.9**, React **19.2.0** (`frontend/package.json`) | ✅ |
| Drizzle ORM + Postgres | `drizzle-orm` **0.45.2**, driver `postgres` **3.4.7** (postgres.js), Neon per CLAUDE.md §1 | ✅ |
| TanStack Query | **5.90.12** | ✅ (v5 semantics: `gcTime`, `placeholderData: keepPreviousData`) |
| shadcn / Tailwind | Radix primitives + `class-variance-authority` + `tailwind-merge` | ✅ |
| Dev URL `http://localhost:1000` | `"dev": "next dev -p 1000"` | ✅ |
| `/users` is the responsive reference page | route exists; pattern being extracted in recon lane F1 | ✅ |
| pnpm | `packageManager: pnpm@10.18.0` | ✅ |
| Validation | **zod 4.1.13** both repos; `class-validator` **not installed** (CLAUDE.md §18 living rule) | ✅ zod only |

**Scale facts measured:** 757 `pgTable` declarations and 399 `pgEnum` declarations under `backend/src/db/schema/`; `modules/hr` alone is 443 `.ts` + 50 spec files; `modules/payroll` 133 + 37; `modules/billing` 42 + 7.

**Verify commands (both repos):**
- Frontend: `pnpm -C frontend type-check` · `pnpm -C frontend lint` · `pnpm -C frontend build` · `pnpm -C frontend test`
- Backend: `pnpm -C backend typecheck` · `pnpm -C backend lint` · `pnpm -C backend build` · `pnpm -C backend test` / `test:e2e`

**CI:** `.github/workflows/backend.yml` and `frontend.yml` exist in the frontend repo only; the backend repo has no `.github/`.

---

## 2. Repository topology (materially different from the brief's assumption)

- `D:\projects\personal\Streamlineos` is the **frontend** git repo. Its `.gitignore` line 1 is `/backend/`.
- `D:\projects\personal\Streamlineos\backend` is a **separate git repo** (`streamlineos-api`).
- **No monorepo**: no `pnpm-workspace.yaml`, no root `package.json`, no `turbo.json`/`nx.json`, no `packages/`.
- Verified: zero imports from the frontend into backend paths or a `@streamlineos/*` scope.
- Both repos are currently on branch `refactoring-hrms`, both working trees clean.

---

## 3. Rule conflicts — flagged per H16 (CLAUDE.md wins, and I must tell you)

| # | Brief rule | Conflicts with | Resolution I am applying | Needs your call? |
|---|---|---|---|---|
| C1 | **H11** "Branch per subsystem… Never `main`" | **CLAUDE.md §0.11** — orchestrator may `commit` only; *never* push/checkout/branch/merge/pull/reset/rebase | CLAUDE.md wins. I will **not** create branches. We are already on `refactoring-hrms` (≠ `main`), so H11's *intent* is met. Commits land on the current branch, one per batch, via explicit pathspec. | No — unless you want a new branch, which **you** would have to create |
| C2 | **H9** ≤600 LOC page/component, ≤300 service | **CLAUDE.md §9** target ≤300, hard-review 500 | Brief itself says the lower cap wins → **500 hard / 300 target for every file**, services included | No |
| C3 | **Schema §23** "One shared contract package for DTOs/zod/enums imported by both apps" | **CLAUDE.md §6** hard frontend↔backend boundary, **and** the verified two-separate-git-repos topology (§2 above) | Cannot be done without restructuring into a monorepo or publishing a package. **Blocked pending your decision.** | ⚠️ **Yes — Q1** |
| C4 | **Schema §21** "Statuses as `text` + CHECK, not `pgEnum`" | Repo reality: **399 `pgEnum`s** already in production schema | A platform-wide enum→text migration is far larger than this engagement and touches every module. **Blocked pending your decision.** | ⚠️ **Yes — Q2** |
| C5 | **Frontend §21** `features/<f>/{components,hooks,api,types,utils}` + `shared/` | **CLAUDE.md §9** `features/<f>/{components,lib,hooks}`; shared UI → `components/`, hooks → `hooks/`, utils → `lib/` | CLAUDE.md wins — I keep the existing structure. Nothing to change. | No |
| C6 | **API §1** "prepared statements on hot paths" | Repo sets `prepare: false` in the Drizzle client (Neon pooling) — being re-verified by recon lane H | If confirmed, prepared statements are **inert** here; hot-path optimisation must come from indexes / projection / N+1 removal instead | No — will report the verified answer |
| C7 | **Workflow** "Phase 4… own commit" + **H10** "tests only at the end" | **CLAUDE.md §0.7** verify before claiming done | Compatible. `typecheck + lint + build` stay green **continuously** (H10 says this too); the **test suites** run in Phase 6. | No |
| C8 | **Billing §5** AI credit ledger design | **CLAUDE.md §16** already specifies a token-metered, integer **milli-credit** ledger with reserve/settle | Reconcile with what exists — do not rebuild. Recon lane E is measuring the gap. | No |
| C9 | **Brief scope** "refactor HRMS + payroll + billing" | **CLAUDE.md §3** "work page by page; never modify pages I haven't named" | Your current-turn instruction outranks it (CLAUDE.md §29.1). Proceeding subsystem-wide, gated by your Phase 3 approval. | No |

---

## 4. Working agreements I am adopting unless you say otherwise

1. **No branch creation.** Work stays on `refactoring-hrms`; each repo committed separately with explicit pathspecs (the backend repo has historically been swept by parallel sessions' `git add -A`).
2. **Subagents run zero git commands** (CLAUDE.md §0.11) and, in Phase 1, are strictly read-only.
3. **Docs are the deliverable of Phases 1–3**; no production code until you approve `03-change-map.md`, and no payroll code until you approve `04-schema-design.md`.
4. **`permissions.constants.ts` / `role-templates.constants.ts` are protected** — no edits without your explicit say-so (standing rule from a prior session).
