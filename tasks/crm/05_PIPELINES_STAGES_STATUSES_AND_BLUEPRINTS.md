# Pipelines, Stages, Statuses And Blueprints

## Goal
Replace hardcoded lead/deal statuses and stages with configurable pipelines and process rules.

## Pipeline Types
- Lead pipeline
- Deal pipeline
- Renewal pipeline
- Customer success pipeline
- Partner pipeline
- Custom pipeline

## Stage Configuration
Each stage has:
- key
- label
- color
- probability
- stage type: open, won, lost, archived
- required fields
- allowed next stages
- SLA target
- automation hooks
- approval requirement

## Blueprint Rules
Blueprint enforces:
- allowed transitions
- required data before transition
- required activities before transition
- approval before transition
- quote/signature/payment requirement
- automatic tasks after transition

## Acceptance Criteria
- Deal stages are not hardcoded.
- Lead statuses are not hardcoded.
- Stage transition API validates blueprint rules.
- Frontend stage UI renders from backend metadata.

