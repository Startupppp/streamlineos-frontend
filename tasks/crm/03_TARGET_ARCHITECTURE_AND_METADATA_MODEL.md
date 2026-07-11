# Target Architecture And Metadata Model

## Core Principle
CRM must be metadata-driven.

## Required Metadata Tables
- crm_pipelines
- crm_pipeline_stages
- crm_lead_statuses
- crm_priorities
- crm_sources
- crm_lost_reasons
- crm_activity_types
- crm_custom_fields
- crm_custom_objects
- crm_validation_rules
- crm_blueprints
- crm_blueprint_transitions
- crm_automation_events
- crm_automation_actions
- crm_stage_requirements
- crm_ui_metadata

## Metadata Scope
Configuration can be scoped by:
- organization
- pipeline
- team
- territory
- product line
- user role

## Metadata Fields
Every configurable option should include:
- key
- label
- description
- color
- icon
- sortOrder
- isActive
- isSystemDefault
- isTerminal
- createdAt
- updatedAt

## Acceptance Criteria
- Frontend renders statuses/stages/sources from metadata API.
- Backend validates record transitions against metadata.
- Seeded metadata matches current hardcoded constants.

