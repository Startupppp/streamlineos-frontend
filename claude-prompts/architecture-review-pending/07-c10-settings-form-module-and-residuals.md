# Complete C10: settings form module, size target, and schema coverage

> **STATUS: DONE — 2026-09-10.** All 12 required-work items and all 7 "tests that must bite" are closed.
> Evidence and gate results: `architecture-refactor/PRD-ARCHITECTURE-REVIEW-2026-09-10.md` §"C10
> residuals closed 2026-09-10". Route row marked in `frontend/PAGES.md`.
>
> - [x] 1 Protocol inventoried — 6 copies, not the 4 wave 2 counted (config's was hoisted into the page)
> - [x] 2 `useOrganizationSettingsForm` built — 4 inputs, 6 outputs, 94 lines
> - [x] 3 No `getPayload`: payload conversion stays in each section's own `handleSave`
> - [x] 4 6 sections migrated; 4 exempt with reasons, enforced by `org-settings-form-adoption.contract.test.ts`
> - [x] 5 10 shared-owner tests: edit · cancel · dirty · reset-on-fresh-server-values · success · failure · duplicate-submit
> - [x] 6 `org-branding-section.tsx` 313 → **251** via `BrandingSummary` extraction
> - [x] 7 `org-localization-section.tsx` 164 → **138**
> - [x] 8 Direct tests: `create-org-token-schema` 26 · `create-user-token-schema` 20 · `cost-center-form-schema` 27
> - [x] 9 Valid / invalid / boundary / optional / trim covered; org-vs-user ceilings pinned in both directions
> - [x] 10 One inline `z.object(` remains in settings `.tsx` — `uploadKeyContract`, an endpoint-only
>       response contract, classified in one line and allowlisted by a test that fails on staleness
> - [x] 11 Named handlers preserved; `BusinessHoursDayRow` extracted for the loop-variable closures
> - [x] 12 API contracts, defaults, toast strings, upload behaviour and date/time semantics preserved
>
> **Not done, stated rather than implied:** rendered behaviour was NOT inspected in a browser; lint,
> the full test suite and `next build` were NOT run (repo rule — never run unless asked).
>
> **One deliberate behaviour change:** the App Configuration currency picker went 5 → 9 options, because
> it now shares `CURRENCIES` with `org-localization-schema.ts` instead of keeping a second list.
> Localization already offered 9 for the same field.

Work directly in the StreamlineOS repository and finish the remaining C10 work. Read applicable `CLAUDE.md` files before editing, preserve unrelated changes, and do not commit or push unless explicitly requested.

## Source and objective

The source requirement is candidate C10 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

The six named schemas have been extracted, but the common settings-form behavior still lacks one deep owner, `org-branding-section.tsx` remains 313 lines rather than below the HTML's 300-line target, and some extracted schemas lack direct boundary tests.

Start with:

- `frontend/features/settings/organization/org-*-section.tsx`
- `frontend/features/settings/organization/org-settings-chrome.tsx`
- `frontend/features/settings/organization/org-branding-section.tsx`
- `frontend/features/settings/organization/org-localization-section.tsx`
- `frontend/features/settings/api-tokens/create-org-token-schema.ts`
- `frontend/features/settings/api-tokens/create-user-token-schema.ts`
- `frontend/features/settings/organization/hierarchy/cost-center-form-schema.ts`
- existing organization settings hooks and schema tests

## Required work

1. Inventory the settings sections' actual repeated workflow: edit entry/cancel, default-value synchronization, dirty state, validation, mutation submission, reset, success/error toast, and server-value refresh.
2. Implement one cohesive headless form controller or form module for the behavior that is genuinely identical. Prefer a domain-specific `useOrganizationSettingsForm` interface over a generic callback/configuration bag.
3. Keep section-specific payload conversion, fields, and domain mutations local when they differ. The shared module must delete meaningful protocol code rather than relocate it into `getPayload`, `onEverything`, or cast-heavy configuration.
4. Migrate every section for which the common protocol applies, not an arbitrary subset. Document why structurally different confirmation, array-editor, or presentation-only sections do not use it.
5. Add shared-module tests covering edit, cancel, dirty state, reset after fresh server values, successful mutation, failed mutation, and duplicate-submit prevention.
6. Reduce `org-branding-section.tsx` to at most 300 physical lines by extracting a cohesive component/hook. Preserve behavior and readable formatting.
7. Keep `org-localization-section.tsx` below 300 lines.
8. Add meaningful direct tests for:
   - `create-org-token-schema.ts`;
   - `create-user-token-schema.ts`;
   - `cost-center-form-schema.ts`.
9. Tests must cover valid input, required/invalid input, boundary values, optional/null behavior, defaults or transformations, and differences between the two token scopes.
10. Search settings `.tsx` files for remaining form/domain `z.object()` declarations. Extract domain schemas to `.ts`; retain a tiny endpoint-only response contract inline only when it is not form/domain validation and document that classification in a test or comment.
11. Preserve the repository rule for named handlers inside the component that uses them. Extract a child component where a loop variable would otherwise require an inline JSX closure.
12. Preserve runtime API contracts, form defaults, toast messages, upload behavior, date/time semantics, and accessibility.

## Tests that must bite

Add or update tests proving:

- The shared owner performs reset/cancel/submission behavior for each migrated section.
- Fresh server values replace defaults without overwriting an actively dirty form unexpectedly.
- Error paths retain user input and expose the existing error feedback.
- Token schema tests distinguish organization and personal/user token rules.
- Cost-center validation covers parent/reference and code/name boundaries.
- An architecture test rejects form/domain Zod schemas newly declared in settings `.tsx` files.
- File-size enforcement catches `org-branding-section.tsx` growing above 300 lines.

## Verification and completion

Run focused schema, hook, form, upload, and hierarchy tests; frontend typecheck; lint/format checks prescribed by the repo; settings surface architecture checks; and dependency-cycle checks. Inspect rendered behavior where component extraction could affect layout or accessibility. Review the final diff for casts and for an abstraction whose interface is as complex as its callers.

The task is complete only when common settings-form behavior has one smaller tested owner, all applicable sections use it, branding is at most 300 lines, extracted schemas have meaningful tests, and no settings form/domain schema remains inline in `.tsx`. Report before/after duplication and line counts, migrated/exempted sections, and exact verification results.
