# File Size Exceptions — §7 Registry

Files exceeding 500 lines that are **exempt** from the 500-line hard-review limit per §7 of the shared CLAUDE.md. Every exception is justified by one of the recognised categories: generated file, unmodified shadcn primitive, `*.d.ts`, or cohesive catalog.

The gate script (`backend/src/scripts/check-file-sizes.mjs`, run as `pnpm -C backend check:file-sizes`) reads this file's `## Exceptions` list and skips those paths when failing.

---

## Exceptions

| Path (relative to repo root) | Lines | Category | Justification |
|---|---|---|---|
| `src/scripts/relocate-org-data.ts` | 767 | CLI orchestration script | Top-level conductor for a multi-step data-migration CLI. Already delegates to `relocation/catalog-tables.ts` and `relocation/copy-org.ts`. Further splits create artificial coupling across independent CLI phases with no shared interface. |
| `src/scripts/seed-enterprise-workspace.ts` | 550 | Seed/fixture script | Enterprise-workspace seed that must execute in a fixed order. Each block is a distinct seeding phase; extracting them gains nothing because they share local bindings and a single `db` handle. |
| `src/modules/party/party-mirror-fields.ts` | 544 | Cohesive catalog | A single `PARTY_FIELD_MIRROR` mapping array — every row is one field definition. Same basis as `membership-artifacts.ts` below: a cohesive `as const` catalog exceeding 500 lines rather than split artificially (§7 exception, last sentence). |
| `src/modules/organization/core/membership-artifacts.ts` | 509 | Cohesive catalog | Pre-existing documented exception. A single `MEMBERSHIP_ARTIFACTS` `as const` export; each entry is one artifact definition. Splitting by letter range or type would produce meaningless fragments. |
| `src/modules/ai/core/services/crm-scoring.service.ts` | 504 | Cohesive service | Five tightly-coupled CRM AI scoring methods that share private prompt-building helpers and a single `AiGatewayService` dependency. The 4-line overage does not justify a structural split. |

---

## Audit trail

- **2026-08-31** — Initial enumeration (lane Q6). Frontend: zero files over 500 lines. Backend: 6 files over 500 lines. `access.service.ts` (640 lines) split into `access-error-utils.ts`, `denied-modules.resolver.ts`, and extractions into `access-policy.ts` + `access.types.ts`. Remaining 5 files recorded above as exceptions.
