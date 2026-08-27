# 19 — Every module is registered through one versioned manifest

**What to build:** A module declares itself once. Its id, product route, standing ladder, permission namespaces, entitlement, schema owner, data classification, events, cache namespaces, retention, search ACL strategy, SLO and budget, migrations, navigation and public exposure live in one record — and a new module cannot ship until tenant isolation, permission catalog, route classification, navigation visibility, cold migration, restore and removal all pass against it.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the facts a manifest would hold are currently spread across parallel registries, each of which has already produced a defect. Module keys have two vocabularies — a lowercase catalog and `UPPERCASE` `enabled_modules` — and `ModuleGuard` does not translate, so gates threw for non-owners. Permission catalogs are folders on both sides (`backend/src/modules/rbac/permissions/`, `frontend/lib/rbac/permissions/`) and must not drift; the frontend subset is intentional and tested, and is **not** a defect to re-raise. Route classification reached 0 undeclared of 3,518 handlers and navigation-permission coverage is enforced by `sidebar-permission-coverage.test.ts` — those are working checks the manifest should read from, not replace. The PRD is explicit that this is *"a deep manifest [that] replaces parallel registries; it does not become a generic runtime framework."*

## Acceptance criteria

- [ ] One manifest per module, versioned, holding every field the PRD lists — with the module key expressed once, so the two vocabularies can no longer disagree.
- [ ] The existing checks read the manifest instead of their own list: route classification, permission-catalog agreement, navigation coverage, module enablement and entitlement.
- [ ] A module missing a required field fails the build; a manifest field with no consumer is deleted rather than kept for symmetry.
- [ ] Adding a module is a manifest plus its code — there is no second place to register it, and a check proves no second place exists.
- [ ] The gate a new module must pass is executable: tenant isolation, permission catalog, route classification, navigation visibility, cold migration, restore and removal each have a check that fails on a deliberately broken module.
- [ ] The manifest does not acquire runtime behaviour. It is data the checks read, not a framework modules run inside.

## Todo

- [ ] Inventory the parallel registries first and write the list down; the manifest's field set is that list, and inventing fields ahead of it produces the generic framework the PRD forbids.
- [ ] Migrate one module end to end before all of them, and keep the old registries authoritative until it passes.
- [ ] Do not re-raise the frontend permission-key subset — it is a recorded, tested decision.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
