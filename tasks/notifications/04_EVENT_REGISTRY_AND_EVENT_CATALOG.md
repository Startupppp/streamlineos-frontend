# Event Registry And Event Catalog

## Purpose
Every notification must come from a registered event. This prevents random one-off notifications and makes preferences, templates, analytics, and admin controls reliable.

## Backend Requirements
- Create `NotificationEventRegistryService`.
- Seed global default events.
- Allow organization-level overrides.
- Validate event keys before dispatch.
- Resolve audience from event payload or registered audience resolver.
- Return event metadata to routing engine.
- Support disabling non-mandatory events.

## Frontend Requirements
- Admin UI must display event catalog.
- Admin can search by module, category, priority, channel, mandatory status.
- Admin can open event detail and edit allowed settings.
- User preference UI can show friendly event names, not raw keys.

## Event Key Format
Use dotted namespace:

```txt
module.entity.action
```

Examples:
- `project.task.assigned`
- `project.task.due_soon`
- `chat.message.mention`
- `payroll.payslip.ready`
- `security.login.new_device`

## Event Definition Shape
```ts
type NotificationEventDefinition = {
  eventKey: string;
  sourceModule: string;
  category: string;
  displayName: string;
  description: string;
  defaultPriority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  defaultType: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  defaultChannels: NotificationChannel[];
  allowedChannels: NotificationChannel[];
  mandatory: boolean;
  userConfigurable: boolean;
  adminConfigurable: boolean;
  quietHoursBehavior: "respect" | "bypass_if_high" | "always_bypass";
  dedupeWindowSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMax: number;
  templateKey: string;
  audienceResolver: string;
};
```

## Core Categories
- SECURITY
- CHAT
- PROJECTS
- CRM
- HRMS
- PAYROLL
- RECRUITMENT
- KNOWLEDGE
- SIGN
- INVENTORY
- SURVEYS
- CALENDAR
- BILLING
- SUPPORT
- WORKFLOW
- AI
- MARKETING
- SYSTEM

## Mandatory Events
These cannot be fully disabled:

- `security.login.new_device`
- `security.password.changed`
- `security.mfa.disabled`
- `security.role.changed`
- `billing.payment.failed`
- `payroll.payment.failed`
- `sign.document.completed` when user is a signer
- `compliance.policy.updated`

Users may choose channels for some mandatory events, but at least one reliable channel must remain active.

## Acceptance Criteria
- Backend rejects unknown event keys.
- Admin event catalog loads all seed events.
- Event policy changes are audited.
- Mandatory events cannot be disabled through API or UI.
- Existing direct notification creation still works, but new features use event registry.
