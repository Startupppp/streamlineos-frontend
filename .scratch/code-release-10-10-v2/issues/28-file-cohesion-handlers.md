# 28: File cohesion and named handlers

**What to build:** Authored files remain cohesive, justified exceptions fail closed, and non-trivial events use named typed handlers without meaningless wrapper chains.

**Blocked by:** 25 — Backend cleanup and decomposition; 26 — Frontend cleanup and decomposition

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C013** — **Handlers:** complete v2 ticket 28's named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains.
- [ ] **PRD-C038** — Enforce a repository-wide default maximum of 500 physical lines for authored production, frontend, backend, shared-package, worker, script and test files (`.ts`, `.tsx`, `.js` and `.mjs`). The gate must scan every applicable workspace with a vacuity floor and fail when a new unregistered file exceeds the limit; CRM/Inventory are reported separately and landing visuals are unchanged.
- [ ] **PRD-C039** — Treat 300 lines as a review/refactoring target, not a reason for mechanical fragmentation. Split files by cohesive responsibility and domain ownership when doing so reduces the interface or separates independently changing behavior; never split into numbered fragments, pass-through wrappers, re-export shells or mutually dependent files merely to satisfy a counter.
- [ ] **PRD-C040** — Permit a file above 500 lines only for a generated/vendor artifact, declaration, immutable migration, cohesive declarative catalog or an implementation whose documented split alternatives would reduce locality or introduce a cycle. Each exception records exact path and measured lines, category, owner, public interface, concrete cohesion argument, alternatives considered, review date and removal trigger; directory-wide and wildcard exceptions are prohibited.
- [ ] **PRD-C041** — Make the exception registry fail closed: missing/stale paths, line counts, owners, interfaces, reasons or review dates fail; any file that falls to 500 lines or below automatically loses its exception. Generated/vendor/migration exclusions must be path-classified and must never exempt ordinary authored implementation transitively.
- [ ] **PRD-C042** — Review functions, classes, React components, hooks, forms, controllers and workers inside an allowed large file for mixed responsibilities, hidden state, duplicated validation/query logic and excessive public surface. A file-size exception does not exempt dead-code, cycle, authorization, query-cost, contract, testing or readability requirements.
- [ ] **PRD-C043** — Run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories, require zero unexplained violations and prove each extraction preserves behavior, import direction, DI registration, route ownership, caching and authorization.
- [ ] **PRD-C044** — Use named, typed handler functions for non-trivial UI events and form actions instead of embedding business logic, multi-step mutations or long anonymous closures in JSX. Names express the user intent (`handleSubmit`, `handleMemberRemove`, `handleRetrySync`), and handlers delegate validation/state-independent rules to domain-owned functions.
- [ ] **PRD-C045** — Keep NestJS controller handlers, queue/event consumers, cron entry points and server actions thin: validate and authorize at the correct seam, construct the command/query context, invoke one cohesive implementation and map its typed result/error. Do not duplicate business rules, database orchestration or response shaping across handlers.
- [ ] **PRD-C046** — Use named event handlers only; JSX event props must not contain inline arrow/function expressions. Do not create meaningless handler-to-handler chains: the named handler performs event orchestration and delegates reusable rules to explicitly named domain functions. Use `useCallback` only when referential identity affects memoization, subscription or effect correctness, and verify every dependency.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

