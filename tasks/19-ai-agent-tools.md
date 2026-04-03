# Task 19: AI Agent & External Tool Integration (Composio Alternative Analysis)

## Priority: MEDIUM | Effort: 4-5 days | Dependencies: Task 05 (Notifications), Task 06 (Infrastructure) | Status: NOT STARTED

---

## PRD

### Problem Statement
The application needs AI-powered agent capabilities for:
1. **Smart notifications** - AI-generated contextual messages instead of generic templates
2. **External tool integration** - WhatsApp, SMS, Slack, Gmail for customer/team communication
3. **Automated workflows** - Trigger actions based on events (lead SLA breach → auto-escalate)
4. **Multi-channel outreach** - Send messages across platforms from a unified interface

### Goals
- Implement AI agent for smart notification text generation
- Integrate external communication channels (WhatsApp Business, SMS, Slack)
- Build automated workflow engine for event-driven actions
- Create unified messaging interface

### Tool Options Analysis

| Tool | Pros | Cons | Cost | Recommendation |
|------|------|------|------|----------------|
| **Composio** | Pre-built integrations (150+), easy setup | Limited customization, API dependency | $99/mo starter | ✅ Best for quick MVP |
| **n8n** | Self-hosted, visual workflow builder, 400+ integrations | Requires hosting, steeper learning curve | Free self-hosted | ✅ Best for long-term |
| **Trigger.dev** | Serverless, TypeScript-native, built for Next.js | Fewer integrations than n8n | Free tier + usage | Consider for background jobs |
| **Make (Integromat)** | Visual, powerful, enterprise-ready | External dependency, costly at scale | $9-299/mo | Not recommended for SaaS |
| **Direct APIs** | Full control, no dependencies | Development time, maintenance burden | API costs only | For critical paths only |

### Recommended Approach: Hybrid

1. **Composio** for quick external tool integrations (WhatsApp, Gmail, Slack)
2. **Inngest** for background jobs and workflow orchestration (already planned in Task 06)
3. **Vercel AI SDK** for AI text generation (already installed)
4. **Direct API** for critical notifications (Twilio SMS, WhatsApp Business API)

---

## Implementation Steps

### 19.1 Composio Integration

**Install**: `pnpm add composio-core`

**File**: `lib/composio.ts`
```typescript
import { Composio } from "composio-core";

export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!,
});

export async function sendWhatsAppMessage(to: string, message: string) {
  return composio.actions.execute("whatsapp_send_message", {
    to,
    message,
  });
}

export async function sendSlackMessage(channel: string, message: string) {
  return composio.actions.execute("slack_send_message", {
    channel,
    message,
  });
}
```

### 19.2 Direct WhatsApp Business API (Fallback)

**Install**: `pnpm add whatsapp-web.js` or use Meta's Cloud API

**File**: `lib/whatsapp.ts`
```typescript
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

export async function sendWhatsAppTemplate(
  phoneNumber: string,
  templateName: string,
  parameters: Record<string, string>
) {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: Object.entries(parameters).map(([, value]) => ({
                type: "text",
                text: value,
              })),
            },
          ],
        },
      }),
    }
  );
  return response.json();
}
```

### 19.3 Twilio SMS Integration

**Install**: `pnpm add twilio`

**File**: `lib/sms.ts`
```typescript
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}
```

### 19.4 AI-Generated Notification Text

**File**: `lib/ai/notification-generator.ts`
```typescript
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function generateNotificationText(
  eventType: string,
  context: Record<string, unknown>
): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-1.5-flash"),
    prompt: `Generate a concise, professional notification message for event: ${eventType}
Context: ${JSON.stringify(context)}
Keep it under 160 characters for SMS compatibility.
Be specific and actionable.`,
  });
  return text;
}
```

### 19.5 Unified Messaging Service

**File**: `lib/messaging/unified-messenger.ts`
```typescript
type Channel = "email" | "sms" | "whatsapp" | "slack" | "in_app" | "push";

interface MessagePayload {
  recipient: string;
  channels: Channel[];
  subject?: string;
  body: string;
  context?: Record<string, unknown>;
  useAI?: boolean;
}

export async function sendMessage(payload: MessagePayload) {
  let message = payload.body;
  
  if (payload.useAI) {
    message = await generateNotificationText(payload.subject ?? "notification", payload.context ?? {});
  }

  const results = await Promise.allSettled(
    payload.channels.map(async (channel) => {
      switch (channel) {
        case "email":
          return sendEmail({ to: payload.recipient, subject: payload.subject!, body: message });
        case "sms":
          return sendSMS(payload.recipient, message);
        case "whatsapp":
          return sendWhatsAppMessage(payload.recipient, message);
        case "slack":
          return sendSlackMessage(payload.recipient, message);
        case "in_app":
          return createInAppNotification(payload.recipient, message);
        case "push":
          return sendPushNotification(payload.recipient, message);
      }
    })
  );

  return results;
}
```

### 19.6 Workflow Automation via Inngest

**File**: `lib/inngest/workflows/lead-sla-breach.ts`
```typescript
import { inngest } from "@/lib/inngest/client";
import { sendMessage } from "@/lib/messaging/unified-messenger";

export const leadSlaBreach = inngest.createFunction(
  { id: "lead-sla-breach" },
  { event: "crm/lead.sla.breached" },
  async ({ event, step }) => {
    const { lead, assignedTo, manager } = event.data;

    await step.run("notify-assignee", async () => {
      await sendMessage({
        recipient: assignedTo.phone,
        channels: ["sms", "whatsapp", "in_app"],
        subject: "SLA Breach Alert",
        body: `URGENT: Lead ${lead.name} has breached SLA. Contact immediately.`,
        useAI: true,
        context: { leadName: lead.name, slaDuration: lead.slaHours },
      });
    });

    await step.sleep("wait-15-minutes", "15 minutes");

    await step.run("escalate-to-manager", async () => {
      await sendMessage({
        recipient: manager.email,
        channels: ["email", "slack"],
        subject: "SLA Escalation",
        body: `Lead ${lead.name} SLA breach not resolved. ${assignedTo.name} unresponsive.`,
      });
    });
  }
);
```

---

## Rules to Follow

1. **Channel Preference**: Respect user notification preferences (Task 05)
2. **Rate Limiting**: Max 100 SMS/day, 1000 WhatsApp/day per org
3. **Cost Tracking**: Track messaging costs per channel
4. **Fallback Chain**: If WhatsApp fails → SMS → Email
5. **AI Token Budget**: Max 100 tokens per notification, cache common patterns
6. **Compliance**: WhatsApp requires pre-approved templates for business accounts

---

## Environment Variables

```env
# Composio
COMPOSIO_API_KEY=

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Slack
SLACK_BOT_TOKEN=
SLACK_WEBHOOK_URL=
```

---

## Checklist

- [ ] Evaluate Composio vs direct APIs (make decision)
- [ ] Install chosen packages
- [ ] Create `lib/composio.ts` if using Composio
- [ ] Create `lib/whatsapp.ts` for WhatsApp Business API
- [ ] Create `lib/sms.ts` for Twilio SMS
- [ ] Create `lib/messaging/unified-messenger.ts`
- [ ] Create AI notification text generator
- [ ] Create Inngest workflow for SLA breach
- [ ] Create Inngest workflow for lead follow-up reminders
- [ ] Create Inngest workflow for appraisal reminders
- [ ] Create settings page for channel configuration
- [ ] Add cost tracking for messaging
- [ ] Test WhatsApp message delivery
- [ ] Test SMS delivery
- [ ] Test AI-generated messages
- [ ] `pnpm build` passes

## Acceptance Criteria

1. WhatsApp messages send successfully to configured numbers
2. SMS messages deliver within 30 seconds
3. AI-generated notifications are contextual and actionable
4. SLA breach workflow triggers and escalates correctly
5. Messaging costs tracked per org
6. User preferences respected for channel selection

## Testing Plan

1. **WhatsApp**: Send test message, verify delivery in WhatsApp
2. **SMS**: Send test SMS, verify delivery
3. **AI Text**: Generate notification for lead assignment, verify quality
4. **Workflow**: Trigger SLA breach event, verify escalation flow
5. **Fallback**: Disable WhatsApp, verify SMS fallback works
