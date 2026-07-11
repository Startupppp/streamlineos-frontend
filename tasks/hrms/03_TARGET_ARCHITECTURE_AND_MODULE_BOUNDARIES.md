# Target Architecture And Module Boundaries

## Core Principle
HRMS modules should share engines instead of duplicating rules.

## Shared Engines
- Policy engine
- Workflow engine
- Automation engine
- Template engine
- Notification/event engine
- Audit engine
- Permission/field access engine
- Document engine

## Product Modules
- People directory
- Organization structure
- Time and attendance
- Leave and absence
- Lifecycle: onboarding, probation, transfer, promotion, exit
- Documents and letters
- Assets and access
- Performance and OKRs
- Learning and skills
- Engagement and recognition
- Employee relations and grievances
- Travel, expenses, reimbursements, benefits
- Payroll and compensation
- Recruitment handoff
- HR helpdesk
- Analytics and workforce planning

## Backend Rule
Each module owns its records, but shared engines own rules, approvals, templates, notifications, and audit.

## Frontend Rule
HR UI should expose configuration clearly:
- Simple defaults for small teams.
- Advanced configuration for complex companies.

