# AI Notification Intelligence

## Goal
Use AI to reduce noise, summarize missed work, and improve routing decisions without hiding critical information.

## Features

### Smart Grouping
Group similar notifications:
- 12 comments on same task
- 5 updates in same project
- Multiple CRM follow-ups

Frontend shows one grouped item with expandable details.

### Daily Briefing
AI generates:
- Top urgent items
- Pending approvals
- Missed mentions
- Deadlines today
- Risks/blockers

### Why This Matters
For high-volume users, AI explains:
- Why the notification is important
- What changed
- What action is expected

### Priority Suggestion
AI can suggest priority for events that product modules emit as normal but appear urgent based on content.

### Fatigue Detection
AI can detect:
- User receives too many low-value notifications.
- User never opens certain event types.
- A module is over-notifying.

Suggestions:
- Move this category to digest.
- Mute this project.
- Keep only mentions and assignments.

### Template Suggestions
AI can suggest better template copy for:
- Email subject
- Push body
- SMS length
- WhatsApp template wording

## Backend Requirements
- AI features must not block core notification send path.
- Run summarization async.
- Store AI summary metadata separately.
- Never send sensitive data to AI unless allowed by org settings.
- Log AI usage and failures.

## Frontend Requirements
- Show "Smart summary" in notification center.
- Allow user to dismiss AI suggestion.
- User can apply suggested preference change.
- Admin can disable AI notification intelligence.

## Acceptance Criteria
- Core notifications work if AI is disabled.
- AI summary never replaces raw notification history.
- AI suggestions are opt-in/apply action, not automatic destructive changes.
