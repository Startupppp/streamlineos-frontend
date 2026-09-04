# 24: Module ownership and cleanup inventory

**What to build:** Every module, route, file and public interface has a canonical owner and evidence-backed KEEP, REFACTOR or REMOVE verdict before wide cleanup begins.

**Blocked by:** 01 — PRD traceability manifest

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [x] **PRD-C025** — Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position.
- [x] **PRD-C105** — Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [x] **PRD-C106** — Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [x] **PRD-C107** — Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
