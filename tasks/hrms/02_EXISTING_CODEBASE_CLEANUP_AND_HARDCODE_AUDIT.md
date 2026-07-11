# Existing Codebase Cleanup And Hardcode Audit

## Goal
Before adding features, clean hardcoded HR logic and move it into configurable engines.

## What To Audit
- Leave accrual rules.
- Leave reset/expiry cron.
- Comp-off rules.
- Attendance late/absent/anomaly rules.
- Shift timings.
- Overtime thresholds.
- Probation duration.
- Notice period.
- Offboarding checklist.
- Required documents.
- Email/notification text.
- Approval chains.
- Payroll mappings.
- Holiday/location assumptions.
- Role/permission assumptions.

## Refactor Rule
Hardcoded logic may remain only as seeded default templates. Runtime behavior must read from configuration tables.

## Replace With
- HR policy engine.
- Workflow engine.
- Automation engine.
- Template engine.
- Notification event registry.
- Effective-dated configuration.

## Current Modules To Preserve And Refactor
- Employee directory.
- Attendance.
- Leaves.
- HR config.
- Lifecycle.
- Performance.
- Recruitment handoff.
- Payroll handoff.
- HR helpdesk.
- HR documents.
- HR dashboards.

## Acceptance Criteria
- Services do not contain fixed business policy constants except safe fallback defaults.
- Existing behavior is migrated into default seeded policies.
- Tests prove seeded default policy matches old behavior.
- Admin can change policy without code deployment.

