# Channels And Provider Integrations

## Supported Channels
- In-app
- Email
- Web/browser push
- SMS
- WhatsApp
- Slack
- Microsoft Teams
- Webhook

## Backend Provider Abstraction
Create a common provider interface:

```ts
interface NotificationProvider {
  channel: NotificationChannel;
  providerName: string;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
  validateConfig(config: unknown): Promise<ValidationResult>;
  sendTest(input: ProviderTestInput): Promise<ProviderSendResult>;
}
```

## In-App
Backend:
- Always create canonical notification row unless event is external-only.
- Emit real-time event through existing realtime/Ably/WebSocket mechanism.
- Update unread count.

Frontend:
- Notification bell updates live.
- Toast appears for high/critical events.
- Notification center shows item immediately.

## Email
Backend:
- Reuse existing email module and outbox where possible.
- Support SMTP/SendGrid-style provider configuration.
- Track delivery, bounce, failure, and provider ID.
- Support unsubscribe for non-mandatory marketing/system announcements.

Frontend:
- Admin can configure provider.
- Admin can send test email.
- Template preview supports subject and body.

## Push
Backend:
- Reuse existing push/web-push subscription code.
- Store push subscriptions per user/device.
- Handle expired subscriptions.

Frontend:
- Ask browser permission only after user action.
- Preferences page shows device/browser subscription status.
- User can remove devices.

## SMS
Backend:
- Use provider abstraction, likely Twilio first if existing gateway supports it.
- Phone numbers must be verified.
- Track cost.
- Default disabled until user/admin enables.

Frontend:
- User can add/verify phone number.
- Admin can set daily/monthly SMS limits.

## WhatsApp
Backend:
- Support WhatsApp provider through Twilio or Meta WhatsApp Cloud API.
- Require opt-in/consent.
- Use approved templates where provider requires.
- Track delivery and read receipts if available.

Frontend:
- User sees WhatsApp opt-in status.
- Admin sees template approval state.

## Slack
Backend:
- Organization installs Slack integration.
- Users connect Slack identity.
- Send DM or channel message depending event policy.

Frontend:
- Admin provider setup.
- User connect/disconnect Slack.
- Event policy can send project alerts to a Slack channel.

## Microsoft Teams
Backend:
- Organization connects Teams webhook/bot.
- Send adaptive card style payloads where possible.

Frontend:
- Admin setup and test.
- Policy selects team/channel/user target.

## Webhook
Backend:
- Send signed webhook payload.
- Retry with backoff.
- Include timestamp and signature.
- Support endpoint secret rotation.

Frontend:
- Admin can create endpoint, view secret once, rotate secret, test send.

## Provider Setup UI
Admin screens:
- Providers list
- Add provider
- Sandbox mode toggle
- Test send
- Delivery limits
- Failure dashboard
- Disable provider

## Acceptance Criteria
- No external provider sends in local/dev unless sandbox mode is explicit.
- Failed provider sends create failed delivery records.
- Provider credentials are encrypted.
- Admin can test every configured provider.
