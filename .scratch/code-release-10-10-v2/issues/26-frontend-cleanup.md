# 26: Dead-code and dependency-cycle contraction

**What to build:** Dead files, exports and symbols plus compile-time, barrel and NestJS dependency cycles are removed across both repositories with runtime-registration proof.

**Blocked by:** 25 — Type integrity and assertion contraction

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C023** — Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and scripts; require zero unclassified unused files, dependencies, exports and exported types in the in-scope code. CRM/Inventory and generated/vendor artifacts must be reported separately, not silently included or deleted.
- [ ] **PRD-C024** — Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend features, shared packages, barrels and NestJS DI. Replace cycles with correct ownership, dependency inversion or a neutral seam; do not hide them with `forwardRef`, lazy/dynamic imports, re-export indirection, duplicated types or an exception baseline. The cycle gate and a bite-proven self-test must report zero cycles.
- [ ] **PRD-C026** — Remove unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports. An exported symbol is not considered used merely because a barrel exports it.
- [ ] **PRD-C028** — Remove unused files and folders including abandoned routes, controllers, providers, modules, components, hooks, workers, jobs, adapters, tests, fixtures, mocks, scripts, assets and styles after proving that no static, dynamic, reflective, generated, CLI, package-script or side-effect entry point reaches them.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
