# Automation Studio, Workflows And Sequences

## Goal
Build CRM automation better than basic enum rules.

## Automation Components
- Trigger
- Conditions
- Branches
- Wait steps
- Actions
- Exit criteria
- Error handling
- Run logs
- Test mode
- Versioning

## Triggers
Configurable event registry:
- lead.created
- lead.updated
- lead.stage_changed
- lead.score_changed
- lead.assigned
- deal.created
- deal.stage_changed
- deal.won
- deal.lost
- task.overdue
- email.replied
- form.submitted
- quote.sent
- quote.signed
- invoice.paid

## Actions
- assign owner
- update field
- create task
- send notification
- send email
- send WhatsApp
- add/remove tag
- create deal
- create quote
- call webhook
- start sequence
- stop sequence

## Sequences/Cadences
- email sequence
- call task sequence
- WhatsApp follow-up
- wait steps
- stop on reply/meeting/booked/converted

## Acceptance Criteria
- CRM-specific automation enums are replaced by event/action registry.
- Automation builder supports preview and dry run.
- Automation cannot infinite-loop.

