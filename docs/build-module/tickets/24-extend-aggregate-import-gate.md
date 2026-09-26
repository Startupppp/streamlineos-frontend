# 24 — Extend the aggregate-import gate to cover hooks

**What to build:** The rule that already protects query-key imports also protects hook imports, so the work in tickets 21 to 23 cannot silently regress. A gate exists today enforcing that consumers import a query-key domain module rather than the aggregate; there is no equivalent for hooks, which is why the aggregates accumulated 122 Build callers between them unnoticed.

Note this is an extension of an existing rule, not the enforcement of one already written. FE-18 covers query keys only — do not cite it as though it already forbade the hook aggregates.

**Blocked by:** 21 — Deep-import the cross-module hooks aggregate. 22 — batch A. 23 — batch B.

**Status:** ready-for-agent

- [ ] A gate fails when a Build file imports from either hooks aggregate
- [ ] The gate's self-test proves it resolves files and would actually fire, rather than passing vacuously on zero matches
- [ ] Test-only importers are permitted, explicitly
- [ ] The rule is written down alongside the existing query-key rule
