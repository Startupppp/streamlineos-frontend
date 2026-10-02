# Webhooks — UI evidence

- Surface URL: https://www.streamlineos.in/build/47/settings/integrations/webhooks
- Discovery: Build sidebar → More tools → Webhooks.
- Context shown: org `PXC-Design-A-20260930`; project scope `PXC-Project-Alpha`.
- Empty/filled state: `No webhooks configured`; copy “Get notified in real-time when tickets, sprints, or members change.” No webhook rows exist.
- Search/filter controls: Search webhooks (placeholder `Search by URL…`), Filter by state (All states, Active, Inactive), Filter by event (All events, Ticket Created, Ticket Updated, Ticket Deleted, Ticket Assigned, Comment Added, Member Added, Member Removed), From date, To date, Compact.
- Primary CTAs: `Add Webhook`, empty-state `Create Webhook`.
- Craft inspected then cancelled: `New Webhook` dialog required Payload URL (placeholder https://example.com/webhook), event checkboxes Ticket Created/Updated/Deleted/Assigned, Comment Added, Member Added/Removed, optional Signing Secret, Cancel, Create Webhook. No external URL entered and no webhook created.
- Result: VERIFIED.
