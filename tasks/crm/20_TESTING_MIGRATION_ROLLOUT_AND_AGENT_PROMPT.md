# Testing, Migration, Rollout And Agent Prompt

## Testing
Test:
- metadata seed migration
- lead validation
- deal validation
- stage transitions
- blueprint rules
- automation runs
- scoring
- assignment
- SLA
- duplicates/merge
- imports
- permissions
- audit
- frontend metadata rendering

## Migration
1. Inventory hardcoded values.
2. Create seeded metadata matching current constants.
3. Add metadata APIs.
4. Migrate backend validation to metadata.
5. Migrate frontend labels/colors to metadata.
6. Add strict validation engine.
7. Add workflow/blueprint/automation studio.

## Agent Prompt
```txt
You are working in the current StreamlineOS branch. Read the entire `crm/` PRD folder in numeric order before coding.

Goal: Refactor CRM into a metadata-driven, strict-validation, automation-first revenue OS. Do not create a duplicate CRM. Extend existing modules.

Important code:
- `streamlineos-backend/src/modules/crm`
- `streamlineos-backend/src/modules/leads`
- `streamlineos-backend/src/modules/deals`
- `streamlineos-backend/src/modules/contacts`
- `streamlineos-frontend/frontend/app/(authenticated)/crm`

Rules:
1. First audit all hardcoded CRM values.
2. Seed default metadata matching current behavior.
3. Replace hardcoded statuses, stages, sources, priorities, labels, colors, and automation enums with configuration.
4. Add strict server-side validation and mirrored frontend validation.
5. Preserve existing APIs unless all call sites are migrated.
6. Add tests for every migration and rule.
7. Commit after each phase and push to the current branch.

Start with an implementation plan mapped to these PRDs, then begin Phase 1.
```

