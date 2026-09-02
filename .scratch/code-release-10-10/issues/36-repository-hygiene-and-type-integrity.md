# 36 — Repository-wide hygiene, dead code and type integrity

**What to build:** The §2.1 contract across both repositories: remove every unused symbol, file and dependency with dependency proof, and replace unsafe forced typing with validated narrowing. This is a wide refactor whose blast radius is the whole codebase, which is why it runs behind the domain sessions rather than beside them.

**Blocked by:** Sessions 1–8 substantially complete.

**Status:** ready-for-agent

- [ ] Fail-closed dead-code analysis over backend, frontend, shared packages, workers and scripts reports zero unclassified unused files, dependencies, exports and exported types in scope. Excluded modules and generated/vendor artifacts are reported separately, never silently included or deleted.
- [ ] TypeScript and ESLint unused-symbol checks are enabled and enforced. Symbols are removed, not renamed to an underscore or suppressed; a named underscore parameter is allowed only where a framework callback contract requires the position.
- [ ] Unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports are removed. A barrel export does not make a symbol used.
- [ ] Unreachable branches, obsolete shims, commented-out implementation, debug logging and stale scaffolding are removed. A compatibility path is retained only with a named consumer, a removal date and a contract test.
- [ ] Unused runtime and development dependencies, package scripts, environment variables, configuration keys and asset references are removed, with lockfiles, manifests, validation schemas and documentation updated in the same change.
- [ ] No `as any`, double cast, unjustified non-null assertion, suppression directive or broad index signature used to bypass a contract. Narrow with Zod, discriminated unions, exhaustive guards or a tested adapter.
- [ ] Type assertions survive only at a proven external seam, each local, narrow, documented with its invariant, covered by a negative test and listed in a zero-growth exception ledger.
- [ ] Every deletion is proven by dependency graph plus checks for Nest metadata and DI, Next.js file conventions, dynamic imports, raw SQL and table names, migrations, reflection, queues and events, cron registration, package scripts and side-effect imports. Text search alone is never sufficient.
- [ ] Prove with a module-graph tool and confirm with a real build. A typecheck does not catch a missing side-effect import; a bare side-effect import is invisible to import search.
- [ ] Before/after counts are recorded for unused files, exports, dependencies, suppressions and assertions.
- [ ] The cleanup removes no authorization, validation, cache invalidation, outbox or worker registration, observability, accessibility, SEO metadata or error/offline state merely because it is uncommon locally.
