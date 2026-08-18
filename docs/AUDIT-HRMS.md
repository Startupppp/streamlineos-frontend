# HRMS core audit index

Updated: 2026-08-12

The completed Phase 0 audit is preserved rather than duplicated:

- Full finding tables, priorities and worse-than-expected facts:
  `docs/hrms/hrms-core-phase-0-audit-2026-08-10.md`
- Complete code inventory:
  `docs/hrms/hrms-core-phase-0-code-inventory-2026-08-10.md`
- Database tables and row/size/RLS baseline:
  `docs/hrms/hrms-core-phase-0-db-inventory-2026-08-10.md`
- Column catalogs:
  `docs/hrms/hrms-core-phase-0-column-catalog-a-h-2026-08-11.md` and
  `docs/hrms/hrms-core-phase-0-column-catalog-l-w-2026-08-11.md`
- Index and scan-count baseline:
  `docs/hrms/hrms-core-phase-0-index-inventory-2026-08-10.md`
- Live-data discrepancy and reconciliation gates:
  `docs/hrms/hrms-core-phase-1-live-discrepancy-report-2026-08-10.md`

The audit includes all required categories: schema (`SCH-001..016`), API
(`API-001..018`), security/privacy (`SEC-001..007`, `SEC-030..046`,
`SEC-060..066`), UI (`UI-001..015`), cost (`COST-001..007`, `COST-030..039`,
`COST-060..065`), baseline/tooling (`BASE-001..007`) and dead-code candidates
(`DEAD-001..002`). The route/sidebar/persona matrix and prioritized order are in
the same full audit.

Phase 0 is complete. Product closure is tracked only in `TASKS.md` and
`REFACTOR-STATE.md`; an authored source fix is not considered deployed until its
required clone, migration, tenant and reconciliation evidence passes.
