# Templates, Personalization And Localization

## Purpose
Every channel should have clear, branded, personalized messages without hardcoding content inside product modules.

## Backend Requirements
- Store templates per org/channel/locale/version.
- Render templates safely using allowed variables only.
- Validate missing variables before send.
- Support default global templates.
- Support organization overrides.
- Support draft/active/archive lifecycle.
- Audit template changes.
- Support test render and test send.

## Frontend Requirements
Build template management UI:

- Template list
- Filter by channel, module, category, locale, status
- Template editor
- Variable helper
- Preview panel
- Test send modal
- Version history
- Duplicate template
- Restore version
- Activate/archive

## Template Channels

### In-App
Fields:
- title
- short message
- action label
- link

### Email
Fields:
- subject
- preheader
- body
- CTA label
- CTA URL

### Push
Fields:
- title
- short body
- icon optional
- action URL

### SMS
Fields:
- text body only
- max length warning

### WhatsApp
Fields:
- approved template name if provider requires
- body variables
- action buttons if supported

### Slack/Teams
Fields:
- title
- body
- action buttons
- entity link

### Webhook
Fields:
- JSON payload template

## Required Variables
Common variables:
- `user.firstName`
- `actor.name`
- `org.name`
- `event.displayName`
- `entity.title`
- `entity.url`
- `priority`
- `createdAt`

## Example Template
```txt
Title: You were assigned to {{entity.title}}
Message: {{actor.name}} assigned you a {{entity.type}} in {{project.name}}.
Action: Open task
```

## Localization
- Default locale: organization locale.
- Fallback: user locale -> org locale -> `en`.
- Missing translation should not block send; use fallback and log warning.

## Acceptance Criteria
- Templates render identically in preview and send.
- Missing variables return clear validation error.
- Template edits do not affect already-sent notifications.
- All provider-specific limits are shown in UI.
