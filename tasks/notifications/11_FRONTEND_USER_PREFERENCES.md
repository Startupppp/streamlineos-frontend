# Frontend User Preferences

## Goal
Let users control noise without feeling overwhelmed.

## Page Structure
Tabs:
- Overview
- Channels
- Modules
- Events
- Quiet Hours
- Digests
- Devices
- Advanced

## Overview Tab
Simple controls:
- Notify me normally
- Only important notifications
- Digest mode
- Focus mode
- Mute non-critical notifications

Show current active channels:
- In-app
- Email
- Push
- SMS
- WhatsApp
- Slack
- Teams

## Channels Tab
Channel toggles:
- In-app
- Email
- Browser push
- SMS
- WhatsApp
- Slack
- Microsoft Teams
- Webhook if user-owned webhooks are enabled
- Sound

Each channel should show:
- Enabled/disabled
- Verification/connect status
- Last successful delivery
- Problem warning if broken

## Modules Tab
Module-level toggles:
- Chat
- Projects
- CRM
- HR
- Payroll
- Recruitment
- Knowledge
- Sign
- Inventory
- Surveys
- Calendar
- Billing
- Support
- Security
- System

Options per module:
- Immediate
- Digest
- In-app only
- Muted

## Events Tab
Advanced matrix:
- Event name
- Description
- Priority
- Channels
- User override allowed/not allowed

Mandatory events display locked state and explanation.

## Quiet Hours Tab
Controls:
- Enable quiet hours
- Start time
- End time
- Timezone
- Allow high priority bypass
- Allow critical bypass
- Weekend behavior

## Digests Tab
Controls:
- Disabled
- Hourly
- Daily
- Weekly
- Digest delivery channel
- Digest time
- Included modules

## Devices Tab
Shows:
- Browser push subscriptions
- Mobile devices later
- Last active
- Remove device
- Send test push

## Advanced Tab
Controls:
- Per-project overrides
- Per-chat/channel overrides
- Reset to organization defaults
- Export preference settings

## Backend Requirements
- Preferences API returns effective preferences and inherited defaults.
- Mutations save only user overrides.
- Reset endpoint clears overrides.
- Every update is audited.

## Acceptance Criteria
- Normal user can set preferences without opening advanced matrix.
- Power user can configure event/channel matrix.
- Mandatory events cannot be disabled.
- User sees broken channel statuses.
