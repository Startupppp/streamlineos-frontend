# HRMS PRD Pack

## Product
World-class HRMS / PeopleOS for StreamlineOS.

## Goal
Rewrite the HRMS product architecture from scratch at the PRD level and refactor the existing codebase into a configurable, automated, template-driven HR platform.

This is not a request to delete working code blindly. The implementation agent must:

- Inspect existing HR modules.
- Preserve useful working behavior.
- Remove or refactor hardcoded rules.
- Replace hardcoded logic with schemas, policies, templates, workflows, automations, and settings.
- Keep organization isolation, permissions, audit, and data privacy strict.

## Existing Codebase Areas
- `streamlineos-backend/src/modules/hr-directory`
- `streamlineos-backend/src/modules/hr-time`
- `streamlineos-backend/src/modules/hr-config`
- `streamlineos-backend/src/modules/hr-lifecycle`
- `streamlineos-backend/src/modules/hr-performance`
- `streamlineos-backend/src/modules/hr-payroll`
- `streamlineos-backend/src/modules/hr-recruitment`
- `streamlineos-backend/src/modules/hr-interviews`
- `streamlineos-backend/src/modules/hr-helpdesk`
- `streamlineos-backend/src/modules/cron`
- `streamlineos-backend/src/modules/settings`
- `streamlineos-frontend/frontend/app/(authenticated)/hr`

## Implementation Order
1. `01_PRODUCT_VISION_AND_BENCHMARKS.md`
2. `02_EXISTING_CODEBASE_CLEANUP_AND_HARDCODE_AUDIT.md`
3. `03_TARGET_ARCHITECTURE_AND_MODULE_BOUNDARIES.md`
4. `04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md`
5. `05_POLICY_ENGINE.md`
6. `06_WORKFLOW_ENGINE_AND_APPROVALS.md`
7. `07_AUTOMATION_ENGINE.md`
8. `08_TEMPLATE_ENGINE.md`
9. `09_EMPLOYEE_MASTER_AND_360_PROFILE.md`
10. `10_ORG_STRUCTURE_DEPARTMENTS_TEAMS_LOCATIONS.md`
11. `11_ATTENDANCE_SHIFTS_ROSTERS_GEOFENCING.md`
12. `12_LEAVE_ABSENCE_COMPOFF_OVERTIME.md`
13. `13_ONBOARDING_PROBATION_AND_CONFIRMATION.md`
14. `14_OFFBOARDING_EXIT_FNF_AND_ALUMNI.md`
15. `15_DOCUMENTS_LETTERS_ESIGN_AND_COMPLIANCE.md`
16. `16_ASSETS_DEVICES_AND_ACCESS_MANAGEMENT.md`
17. `17_PERFORMANCE_GOALS_OKRS_AND_REVIEWS.md`
18. `18_LEARNING_SKILLS_CAREER_AND_SUCCESSION.md`
19. `19_EMPLOYEE_ENGAGEMENT_RECOGNITION_AND_SURVEYS.md`
20. `20_EMPLOYEE_RELATIONS_GRIEVANCE_AND_CASES.md`
21. `21_TRAVEL_EXPENSES_REIMBURSEMENTS_AND_BENEFITS.md`
22. `22_PAYROLL_COMPENSATION_AND_FINANCE_INTEGRATION.md`
23. `23_RECRUITMENT_TO_EMPLOYEE_HANDOFF.md`
24. `24_HR_HELPDESK_SELF_SERVICE_AND_KNOWLEDGE.md`
25. `25_NOTIFICATIONS_CALENDAR_AND_REMINDERS.md`
26. `26_ANALYTICS_REPORTING_AND_WORKFORCE_PLANNING.md`
27. `27_AI_HR_COPILOT_AND_POLICY_QA.md`
28. `28_SECURITY_PRIVACY_AUDIT_AND_PERMISSIONS.md`
29. `29_FRONTEND_UI_UX_REQUIREMENTS.md`
30. `30_BACKEND_API_CONTRACTS.md`
31. `31_TESTING_MIGRATION_ROLLOUT_AND_AGENT_PROMPT.md`
32. `32_CUSTOM_FORMS_OBJECTS_AND_DYNAMIC_FIELDS.md`
33. `33_GLOBAL_LOCALIZATION_AND_LABOR_COMPLIANCE.md`
34. `34_BENEFITS_INSURANCE_LOANS_AND_ADVANCES.md`
35. `35_WORKFORCE_SCHEDULING_FIELD_FORCE_AND_MOBILE.md`
36. `36_HR_IMPORT_EXPORT_DATA_QUALITY_AND_MIGRATION.md`
37. `37_THIRD_PARTY_INTEGRATIONS_AND_WEBHOOKS.md`
38. `38_EMPLOYEE_COMMUNICATIONS_COMMUNITY_AND_EVENTS.md`
39. `39_HEALTH_SAFETY_INCIDENTS_AND_WELLNESS.md`
40. `40_CONTRACTORS_INTERNS_TEMP_STAFF_AND_AGENCIES.md`
41. `41_ADMIN_SETTINGS_NO_CODE_CONFIGURATION.md`
42. `42_DATA_MODEL_INDEX_AND_SCHEMA_CHECKLIST.md`
43. `43_ENTERPRISE_EDGE_CASES_RETENTION_IDENTITY_AND_SIMULATION.md`

## Non-Negotiables
- No hardcoded HR policies in service logic.
- No hardcoded leave accrual, attendance grace period, probation period, approval chain, document requirement, or notification rule.
- Every HR rule must be configurable by organization, location, department, role, employment type, and effective date where needed.
- Attendance, leave, overtime, comp-off, holidays, reimbursements, salary revisions, and employee status must feed payroll through approved, auditable data contracts.
- Payroll must never calculate from raw unapproved HR events. It must consume approved attendance summaries, approved leave balances, approved overtime, approved reimbursements/deductions, effective-dated compensation, and finalized employee master data.
- Every sensitive HR mutation must be audited.
- Salary, bank, tax, disciplinary, grievance, and medical data must have stricter access controls.
- All employee lifecycle transitions must be workflow-driven.
- The system must support employees, contractors, interns, temporary staff, consultants, field workers, remote workers, and alumni.
- HRMS must include no-code custom fields, custom forms, custom objects, import/export, integrations, mobile self-service, global compliance, and admin configuration.
- Enterprise edge cases must be covered: data retention, legal hold, emergency management, identity lifecycle, delegation, payroll simulation, policy simulation, compensation planning, ESOP/equity, and HR data warehouse events.
