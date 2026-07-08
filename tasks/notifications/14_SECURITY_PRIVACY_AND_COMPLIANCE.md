# Security, Privacy And Compliance

## Security Principles
- Notifications must never leak data across organizations.
- External notifications should contain minimum sensitive data.
- Mandatory security notifications cannot be fully disabled.
- Provider secrets must be encrypted.
- Audit everything important.

## Backend Requirements
- Enforce org scoping on every query.
- Enforce permissions on admin APIs.
- Encrypt provider credentials.
- Do not return secrets through API.
- Sanitize template variables.
- Validate webhook URLs.
- Sign outgoing webhooks.
- Protect against duplicate sends.
- Rate limit send/test APIs.

## Privacy Requirements
- Allow users to control non-essential channels.
- Support unsubscribe for marketing/non-critical broadcasts.
- Respect SMS/WhatsApp consent.
- Store consent timestamp and source.
- Hide sensitive data in SMS/push by default.
- Include only safe preview content unless event policy allows more.

## Mandatory Notifications
Mandatory events include:
- New device login
- Password changed
- MFA disabled
- Role/permission changed
- Payment failed
- Payroll payment failed
- Compliance policy update

Rules:
- User cannot disable all channels for mandatory events.
- Admin can choose allowed mandatory channels.
- At minimum, in-app plus one verified external channel should remain where possible.

## Webhook Security
- Use HMAC signature.
- Include timestamp.
- Reject replay if receiver uses timestamp.
- Secret rotation.
- Retry safely.

## Template Safety
- No raw HTML injection.
- Variables escaped by default.
- Admin preview shows final output.
- Disallow provider secrets in templates.

## Acceptance Criteria
- Cross-org access tests pass.
- Secrets are encrypted and never returned.
- Mandatory notifications cannot be muted completely.
- Unsubscribe only affects eligible notification types.
