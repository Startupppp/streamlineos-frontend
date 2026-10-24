# 08: Use exact money, rates, dates and time quantities

**What to build:** Workers receive amounts and time-based pay calculated from validated exact values and explicit business dates.

**Blocked by:** 06 Freeze complete payroll source snapshots

**Status:** ready-for-agent

**Program:** AP-05

**Requirements:** FR-ARCH-013, FR-ARCH-014

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-013-01:** Money parsing rejects junk suffixes, NaN/Infinity, out-of-range values and unsafe totals; money/rates/time have distinct units and wire schemas. Use exact decimal or bounded minor-unit arithmetic with an explicit currency scale.
- [ ] **AC-ARCH-013-02:** Specify tie, negative, percentage, proration, intermediate and final rounding rules through signed fixtures. Include 1.005 versus 100.005 and negative half-paise; do not infer a legal rounding policy from Math.round.
- [ ] **AC-ARCH-013-03:** Line totals reconcile to employee, run, payout, statutory and journal control totals; repeated frozen calculations are identical at scale.
- [ ] **AC-ARCH-013-04:** Record helper counterexamples as helper-level evidence only until caller input reachability and actual payroll impact are reproduced. Preserve working ordinary-case fixtures while adding missing classes.
- [ ] **AC-ARCH-014-01:** Time packages state timezone, local business date, calendar, policy version and quantity units. Preserve event history and correction links rather than overwriting source events.
- [ ] **AC-ARCH-014-02:** Test overnight shifts, DST transitions, leap years, half/hourly leave, holiday/weekend treatment, overlapping events and timezone changes at effective-date boundaries.
- [ ] **AC-ARCH-014-03:** Approved WFH/WFO, leave, overtime and regularization produce traceable pay quantities exactly once; contradictory or incomplete events become exceptions.
- [ ] **AC-ARCH-014-04:** Negative/invalid durations and double-counted leave/absence/half-day quantities fail validation before freeze; source availability failure is distinct from zero hours.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

