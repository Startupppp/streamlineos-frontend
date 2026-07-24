# Milestone 4 — Automation & release readiness

> Spec Milestone 4. Automate only after manual acceptance. Release gate is evidence-based.

| ID | Module | Route / Area | Type | Priority | Status | Est | Role | Acceptance criteria | StreamlineOS |
|----|--------|--------------|------|----------|--------|-----|------|---------------------|--------------|
| QA-M4-001 | Release | `no open P0` | journey | P0 | todo | L | owner | Zero open P0 defects for in-scope modules; evidence linked. | QA-238 |
| QA-M4-002 | Release | `no unapproved P1` | journey | P0 | todo | L | owner | Every open P1 has explicit approval to ship or is fixed. | QA-239 |
| QA-M4-003 | Release | `critical journeys evidence` | journey | P0 | todo | XL | multi | Owner/PM/approver/client/denied first-slice journeys pass with screenshots/HAR. | QA-240 |
| QA-M4-004 | Release | `cross-tenant API suite` | api | P0 | todo | XL | n/a | Automated Org Alpha→Beta denial tests green for projects/tickets/approvals/portal/admin. | QA-241 |
| QA-M4-005 | Release | `build lint types` | api | P0 | todo | M | n/a | Frontend+backend build, lint, and typecheck pass on release candidate. | QA-242 |
| QA-M4-006 | Release | `a11y responsive console` | journey | P1 | todo | L | tester | Audited pages pass keyboard/a11y spot-check, 375/768/1280, clean console. | QA-243 |
| QA-M4-007 | Release | `deferred register` | journey | P1 | todo | M | owner | Every deferred item has owner, priority, rationale, target milestone. | QA-244 |
| QA-M4-008 | Release | `security regression pack` | api | P0 | todo | XL | n/a | Pack: authN fail closed, PermissionGuard deny-by-default sample, MFA/rate-limit smoke from M2, cross-tenant suite green, no secrets in list endpoints — evidence checklist linked. | QA-269 |
| QA-M4-009 | Release | `performance smoke suite` | journey | P1 | todo | L | tester | Smoke: projects list, ticket board, chat open, calendar month with many sources — no multi-second main-thread freeze; note LCP/console; file P1+ if unusable. | QA-270 |
| QA-M4-X-001 | Release | `browser P0 journeys` | automation | P1 | todo | XL | n/a | Highest-value role journeys + destructive confirms automated after manual green. | QA-245 |
| QA-M4-X-002 | Release | `regression prior defects` | automation | P1 | todo | L | n/a | Previously fixed P0/P1 defects have regression coverage. | QA-246 |


**Count:** 11 tickets (11 active · 0 cancelled · 0 deferred) · est **39sp / 56h** · done: 0 · % complete: 0%
