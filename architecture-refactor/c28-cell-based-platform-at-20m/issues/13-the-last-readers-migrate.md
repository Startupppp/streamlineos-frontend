# 13 — The remaining readers migrate and the frontend stops shipping employment on the user object

**What to build:** No surface anywhere reads an employment fact from the global account. The API responses that carried department, designation, employee number, manager, joining date or salary on a user payload stop carrying them, and the frontend reads them from the person the organization employs.

Third and last migrate batch: everything outside HR, directory, onboarding, payroll and finance — Build, CRM, chat and mail mentions, search projections, exports, notification templates, seed scripts — plus the frontend contract change.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the frontend carries its own copy of the problem — `designation` in 64 files, `employeeId` in 52, `branchId` in 20. Root `CLAUDE.md` §5 requires client request/response types to mirror the backend schema exactly, so dropping a field from a response without dropping it from the client type strips it into a silent no-op rather than a compile error. `frontend/CLAUDE.md` §5 also forbids rendering a raw id, so a surface that loses a resolved `designation` must gain the resolved value, never the key.

## Acceptance criteria

- [ ] Every remaining backend reader of the legacy `users` employment columns is converted or deleted; the count reaching zero is proved by a module-graph tool and a real `nest build`, never by grep alone.
- [ ] The API responses that carried employment on a user payload no longer do, under a declared version rather than as a silent breaking change.
- [ ] The frontend types are updated in the same change, so a stripped field is a type error rather than an empty column.
- [ ] Exports, search projections and notification templates that included these fields either read the accessor or drop them deliberately, with the drop recorded.
- [ ] Seed and demo scripts populate the canonical tables, so a fresh environment exercises the migrated path rather than the fallback.
- [ ] The accessor's fallback counter reads zero across a full run of the application, which is the evidence that ticket 14 is safe to start.

## Todo

- [ ] Run the accessor's fallback counter *first* and use it to find the readers — it names the live ones, which a text search over 90 files cannot distinguish from the dead ones.
- [ ] Verify by running the app. Typecheck, build and a fully mocked suite have all been green in this program while nothing worked.
- [ ] Do not rewrite a test to accommodate the change — a test failing because the payload lost a field is the signal that a consumer did too.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
